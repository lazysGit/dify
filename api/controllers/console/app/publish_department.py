from flask import request
from flask_restx import Resource
from pydantic import BaseModel, Field
from werkzeug.exceptions import BadRequest

from controllers.console import console_ns
from controllers.console.app.wraps import get_app_model
from controllers.console.wraps import (
    account_initialization_required,
    edit_permission_required,
    setup_required,
)
from extensions.ext_database import db
from libs.login import current_account_with_tenant, login_required
from models.department import Department
from services.app_publish_service import AppPublishService
from services.department_service import DepartmentService

DEFAULT_REF_TEMPLATE_SWAGGER_2_0 = "#/definitions/{model}"


class UpdatePublishDepartmentsPayload(BaseModel):
    department_ids: list[str] = Field(default_factory=list)


console_ns.schema_model(
    UpdatePublishDepartmentsPayload.__name__,
    UpdatePublishDepartmentsPayload.model_json_schema(ref_template=DEFAULT_REF_TEMPLATE_SWAGGER_2_0),
)


@console_ns.route("/apps/<uuid:app_id>/publish-departments")
class AppPublishDepartmentsApi(Resource):
    @console_ns.doc("get_published_departments")
    @console_ns.doc(description="Get departments this app is published to")
    @get_app_model
    @setup_required
    @login_required
    @account_initialization_required
    def get(self, app_model):
        result = AppPublishService.get_published_departments(app_model.id)
        return {"departments": result}, 200

    @console_ns.doc("update_published_departments")
    @console_ns.doc(description="Update departments this app is published to")
    @console_ns.expect(console_ns.models[UpdatePublishDepartmentsPayload.__name__])
    @get_app_model
    @setup_required
    @login_required
    @account_initialization_required
    @edit_permission_required
    def put(self, app_model):
        payload = UpdatePublishDepartmentsPayload.model_validate(request.get_json(force=True) or {})
        user, tenant_id = current_account_with_tenant()
        operator_ip = request.remote_addr

        try:
            result = AppPublishService.update_published_departments(
                user=user,
                tenant_id=tenant_id,
                app_id=app_model.id,
                department_ids=payload.department_ids,
                operator_ip=operator_ip,
            )
        except ValueError as e:
            raise BadRequest(str(e))

        return {"departments": result}, 200


@console_ns.route("/apps/<uuid:app_id>/publishable-departments")
class AppPublishableDepartmentsApi(Resource):
    """List departments the current user may publish this app to.

    Drives the publish dialog's role-based restriction: ``publish_scope`` maps
    the ``DepartmentService.get_accessible_department_ids`` semantics (None ->
    admin/unrestricted "all"; [dept, *descendants] -> department admin;
    [dept] / [] -> own department only) and department names are rendered as
    ancestor chains ("技术部 > 前端组") resolved from ``Department.path``.
    """

    @console_ns.doc("get_publishable_departments")
    @console_ns.doc(description="List departments the current user can publish to, with scope info")
    @get_app_model
    @setup_required
    @login_required
    @account_initialization_required
    @edit_permission_required
    def get(self, app_model):
        user, tenant_id = current_account_with_tenant()
        accessible = DepartmentService.get_accessible_department_ids(user, tenant_id)
        own_dept_id = DepartmentService.get_user_department_id(user.id, tenant_id)

        # Single tenant-wide lookup: departments are a small config table and the
        # extra rows are needed to resolve ancestor names for path chains anyway.
        all_depts = db.session.query(Department).filter(Department.tenant_id == tenant_id).all()
        dept_map = {dept.id: dept for dept in all_depts}

        if accessible is None:
            publish_scope = "all"
            can_publish_cross_department = True
            target_depts = all_depts
        else:
            target_depts = [dept_map[dept_id] for dept_id in accessible if dept_id in dept_map]
            if len(accessible) > 1:
                publish_scope = "department_and_subdepartments"
                can_publish_cross_department = True
            else:
                publish_scope = "own_department_only"
                can_publish_cross_department = False

        def display_name(dept: Department) -> str:
            segment_ids = [segment for segment in dept.path.split("/") if segment]
            names = [dept_map[segment_id].name for segment_id in segment_ids if segment_id in dept_map]
            return " > ".join(names) if names else dept.name

        return {
            "departments": [
                {"id": dept.id, "name": display_name(dept), "is_own_department": dept.id == own_dept_id}
                for dept in target_depts
            ],
            "publish_scope": publish_scope,
            "can_publish_cross_department": can_publish_cross_department,
        }, 200
