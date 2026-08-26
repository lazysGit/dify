import logging
from typing import Any

from flask import request
from flask_restx import Resource, fields, marshal_with
from pydantic import BaseModel, Field
from sqlalchemy import and_, exists, select
from werkzeug.exceptions import BadRequest, Forbidden, NotFound

from configs import dify_config
from controllers.common.schema import get_or_create_model
from controllers.console import console_ns
from controllers.console.explore.wraps import InstalledAppResource
from controllers.console.wraps import account_initialization_required, cloud_edition_billing_resource_check
from extensions.ext_database import db
from fields.installed_app_fields import app_fields, installed_app_fields, installed_app_list_fields
from libs.datetime_utils import naive_utc_now
from libs.login import current_account_with_tenant, login_required
from models import App, InstalledApp, RecommendedApp
from models.department import AppPublishedDepartment
from services.account_service import TenantService
from services.department_service import DepartmentService
from services.enterprise.enterprise_service import EnterpriseService
from services.feature_service import FeatureService


class InstalledAppCreatePayload(BaseModel):
    app_id: str


class InstalledAppUpdatePayload(BaseModel):
    is_pinned: bool | None = None


class InstalledAppsListQuery(BaseModel):
    app_id: str | None = Field(default=None, description="App ID to filter by")


logger = logging.getLogger(__name__)


app_model = get_or_create_model("InstalledAppInfo", app_fields)

installed_app_fields_copy = installed_app_fields.copy()
installed_app_fields_copy["app"] = fields.Nested(app_model)
installed_app_model = get_or_create_model("InstalledApp", installed_app_fields_copy)

installed_app_list_fields_copy = installed_app_list_fields.copy()
installed_app_list_fields_copy["installed_apps"] = fields.List(fields.Nested(installed_app_model))
installed_app_list_model = get_or_create_model("InstalledAppList", installed_app_list_fields_copy)


@console_ns.route("/installed-apps")
class InstalledAppsListApi(Resource):
    @login_required
    @account_initialization_required
    @marshal_with(installed_app_list_model)
    def get(self):
        query = InstalledAppsListQuery.model_validate(request.args.to_dict())
        current_user, current_tenant_id = current_account_with_tenant()

        if query.app_id:
            installed_apps = db.session.scalars(
                select(InstalledApp).where(
                    and_(InstalledApp.tenant_id == current_tenant_id, InstalledApp.app_id == query.app_id)
                )
            ).all()
        else:
            installed_apps = db.session.scalars(
                select(InstalledApp).where(InstalledApp.tenant_id == current_tenant_id)
            ).all()

        if current_user.current_tenant is None:
            raise ValueError("current_user.current_tenant must not be None")
        current_user.role = TenantService.get_user_role(current_user, current_user.current_tenant)
        installed_app_list: list[dict[str, Any]] = [
            {
                "id": installed_app.id,
                "app": installed_app.app,
                "app_owner_tenant_id": installed_app.app_owner_tenant_id,
                "is_pinned": installed_app.is_pinned,
                "last_used_at": installed_app.last_used_at,
                "editable": current_user.role in {"owner", "admin"},
                "uninstallable": current_tenant_id == installed_app.app_owner_tenant_id,
            }
            for installed_app in installed_apps
            if installed_app.app is not None
        ]

        # filter out apps that user doesn't have access to
        if FeatureService.get_system_features().webapp_auth.enabled:
            user_id = current_user.id
            app_ids = [installed_app["app"].id for installed_app in installed_app_list]
            webapp_settings = EnterpriseService.WebAppAuth.batch_get_app_access_mode_by_id(app_ids)

            # Pre-filter out apps without setting or with sso_verified
            filtered_installed_apps = []

            for installed_app in installed_app_list:
                app_id = installed_app["app"].id
                webapp_setting = webapp_settings.get(app_id)
                if not webapp_setting or webapp_setting.access_mode == "sso_verified":
                    continue
                filtered_installed_apps.append(installed_app)

            # Batch permission check
            app_ids = [installed_app["app"].id for installed_app in filtered_installed_apps]
            permissions = EnterpriseService.WebAppAuth.batch_is_user_allowed_to_access_webapps(
                user_id=user_id,
                app_ids=app_ids,
            )

            # Keep only allowed apps
            res = []
            for installed_app in filtered_installed_apps:
                app_id = installed_app["app"].id
                if permissions.get(app_id):
                    res.append(installed_app)

            installed_app_list = res
            logger.debug("installed_app_list: %s, user_id: %s", installed_app_list, user_id)

        if dify_config.DEPARTMENT_ACCESS_CONTROL_ENABLED:
            accessible = DepartmentService.get_accessible_department_ids(current_user, current_tenant_id)
            if accessible is not None:
                if not accessible:
                    installed_app_list = []
                else:
                    visible_app_ids = set(
                        db.session.execute(
                            select(AppPublishedDepartment.app_id).where(
                                AppPublishedDepartment.department_id.in_(accessible)
                            )
                        )
                        .scalars()
                        .all()
                    )
                    installed_app_list = [item for item in installed_app_list if item["app"].id in visible_app_ids]

        installed_app_list.sort(
            key=lambda app: (
                -app["is_pinned"],
                app["last_used_at"] is None,
                -app["last_used_at"].timestamp() if app["last_used_at"] is not None else 0,
            )
        )

        return {"installed_apps": installed_app_list}

    @login_required
    @account_initialization_required
    @cloud_edition_billing_resource_check("apps")
    def post(self):
        payload = InstalledAppCreatePayload.model_validate(console_ns.payload or {})

        current_user, current_tenant_id = current_account_with_tenant()

        app = db.session.get(App, payload.app_id)

        if app is None:
            raise NotFound("App entity not found")

        if dify_config.DEPARTMENT_ACCESS_CONTROL_ENABLED:
            accessible = DepartmentService.get_accessible_department_ids(current_user, current_tenant_id)
            if accessible is not None:
                if not accessible:
                    raise Forbidden("You can't install this app")
                published_to_accessible = db.session.scalar(
                    select(
                        exists().where(
                            and_(
                                AppPublishedDepartment.app_id == payload.app_id,
                                AppPublishedDepartment.department_id.in_(accessible),
                            )
                        )
                    )
                )
                if not published_to_accessible:
                    raise Forbidden("You can't install this app")
        else:
            recommended_app = db.session.scalar(
                select(RecommendedApp).where(RecommendedApp.app_id == payload.app_id).limit(1)
            )
            if recommended_app is None:
                raise NotFound("Recommended app not found")

            if not app.is_public:
                raise Forbidden("You can't install a non-public app")

        installed_app = db.session.scalar(
            select(InstalledApp)
            .where(and_(InstalledApp.app_id == payload.app_id, InstalledApp.tenant_id == current_tenant_id))
            .limit(1)
        )

        if installed_app is None:
            if not dify_config.DEPARTMENT_ACCESS_CONTROL_ENABLED:
                recommended_app = db.session.scalar(
                    select(RecommendedApp).where(RecommendedApp.app_id == payload.app_id).limit(1)
                )
                if recommended_app is not None:
                    recommended_app.install_count += 1

            new_installed_app = InstalledApp(
                app_id=payload.app_id,
                tenant_id=current_tenant_id,
                app_owner_tenant_id=app.tenant_id,
                is_pinned=False,
                last_used_at=naive_utc_now(),
            )
            db.session.add(new_installed_app)
            db.session.commit()

        return {"message": "App installed successfully"}


@console_ns.route("/installed-apps/<uuid:installed_app_id>")
class InstalledAppApi(InstalledAppResource):
    """
    update and delete an installed app
    use InstalledAppResource to apply default decorators and get installed_app
    """

    def delete(self, installed_app):
        _, current_tenant_id = current_account_with_tenant()
        if installed_app.app_owner_tenant_id == current_tenant_id:
            raise BadRequest("You can't uninstall an app owned by the current tenant")

        db.session.delete(installed_app)
        db.session.commit()

        return {"result": "success", "message": "App uninstalled successfully"}, 204

    def patch(self, installed_app):
        payload = InstalledAppUpdatePayload.model_validate(console_ns.payload or {})

        commit_args = False
        if payload.is_pinned is not None:
            installed_app.is_pinned = payload.is_pinned
            commit_args = True

        if commit_args:
            db.session.commit()

        return {"result": "success", "message": "App info updated successfully"}
