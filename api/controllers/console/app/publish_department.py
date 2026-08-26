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
from libs.login import current_account_with_tenant, login_required
from services.app_publish_service import AppPublishService

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
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model
    def get(self, app_model):
        result = AppPublishService.get_published_departments(app_model.id)
        return {"departments": result}, 200

    @console_ns.doc("update_published_departments")
    @console_ns.doc(description="Update departments this app is published to")
    @console_ns.expect(console_ns.models[UpdatePublishDepartmentsPayload.__name__])
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model
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
