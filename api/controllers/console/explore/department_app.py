import logging
from typing import Any

from flask_restx import Resource, fields, marshal_with
from sqlalchemy import and_, case, func, select

from controllers.common.schema import get_or_create_model
from controllers.console import console_ns
from controllers.console.wraps import account_initialization_required
from extensions.ext_database import db
from libs.helper import AppIconUrlField
from libs.login import current_account_with_tenant, login_required
from models import App, InstalledApp
from models.department import AppPublishedDepartment
from models.enums import AppStatus
from services.department_service import DepartmentService

logger = logging.getLogger(__name__)

department_app_fields = {
    "id": fields.String,
    "name": fields.String,
    "mode": fields.String,
    "icon": fields.String,
    "icon_type": fields.String,
    "icon_url": AppIconUrlField,
    "icon_background": fields.String,
    "description": fields.String,
    "is_installed": fields.Boolean,
    "is_pinned": fields.Boolean,
}

department_app_list_model = get_or_create_model(
    "DepartmentAppList",
    {"department_apps": fields.List(fields.Nested(get_or_create_model("DepartmentAppItem", department_app_fields)))},
)


@console_ns.route("/explore/department-apps")
class DepartmentAppListApi(Resource):
    @login_required
    @account_initialization_required
    @marshal_with(department_app_list_model)
    def get(self):
        current_user, current_tenant_id = current_account_with_tenant()

        accessible = DepartmentService.get_accessible_department_ids(current_user, current_tenant_id)

        if accessible is not None and not accessible:
            return {"department_apps": []}

        published_app_subq = select(AppPublishedDepartment.app_id).distinct()
        if accessible is not None:
            published_app_subq = published_app_subq.where(AppPublishedDepartment.department_id.in_(accessible))

        installed_subq = (
            select(
                InstalledApp.app_id.label("app_id"),
                InstalledApp.is_pinned.label("is_pinned"),
            )
            .where(InstalledApp.tenant_id == current_tenant_id)
            .subquery()
        )

        latest_publish = (
            select(
                AppPublishedDepartment.app_id,
                func.max(AppPublishedDepartment.created_at).label("published_at"),
            )
            .group_by(AppPublishedDepartment.app_id)
            .subquery()
        )

        stmt = (
            select(
                App.id,
                App.name,
                App.mode,
                App.icon,
                App.icon_type,
                App.icon_background,
                App.description,
                case((installed_subq.c.app_id.is_not(None), True), else_=False).label("is_installed"),
                case((installed_subq.c.is_pinned.is_(True), True), else_=False).label("is_pinned"),
                latest_publish.c.published_at,
            )
            .outerjoin(installed_subq, installed_subq.c.app_id == App.id)
            .outerjoin(latest_publish, latest_publish.c.app_id == App.id)
            .where(
                and_(
                    App.id.in_(published_app_subq),
                    App.status == AppStatus.NORMAL,
                    App.enable_site.is_(True),
                )
            )
            .order_by(
                case((installed_subq.c.is_pinned.is_(True), 0), else_=1),
                latest_publish.c.published_at.desc().nullslast(),
            )
        )

        rows = db.session.execute(stmt).all()

        result: list[dict[str, Any]] = [
            {
                "id": str(row.id),
                "name": row.name,
                "mode": row.mode.value if hasattr(row.mode, "value") else str(row.mode),
                "icon": row.icon,
                "icon_type": (
                    row.icon_type.value
                    if row.icon_type and hasattr(row.icon_type, "value")
                    else (str(row.icon_type) if row.icon_type else None)
                ),
                "icon_background": row.icon_background,
                "description": row.description or "",
                "is_installed": row.is_installed,
                "is_pinned": row.is_pinned,
            }
            for row in rows
        ]

        return {"department_apps": result}
