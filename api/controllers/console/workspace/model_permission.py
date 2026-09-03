"""Admin API for per-member model whitelists under the current workspace.

Both endpoints are owner/admin only; the target member id comes from the URL.
PUT performs a wholesale replace via ``ModelPermissionService.set_whitelist``
(empty ``models`` array clears the restriction). Invalid model references are
rejected with 400, insufficient privileges with 403.
"""

from flask import request
from flask_restx import Resource
from pydantic import BaseModel, ConfigDict

from controllers.console import console_ns
from controllers.console.wraps import account_initialization_required, setup_required
from libs.login import current_account_with_tenant, login_required
from services.errors.model_permission import InvalidModelError
from services.model_permission_service import ModelPermissionService


class ModelEntry(BaseModel):
    provider: str
    model: str
    model_type: str


class ModelWhitelistPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    models: list[ModelEntry]


@console_ns.route("/workspaces/current/members/<uuid:account_id>/model-whitelist")
class MemberModelWhitelistApi(Resource):
    """Inspect or replace the model whitelist of a workspace member."""

    @setup_required
    @login_required
    @account_initialization_required
    def get(self, account_id):
        user, tenant_id = current_account_with_tenant()
        if not user.is_admin_or_owner:
            console_ns.abort(403, description="Only admin or owner can view model whitelist")

        account_key = str(account_id)
        return {
            "is_restricted": ModelPermissionService.is_restricted(account_key),
            "whitelist": ModelPermissionService.get_whitelist(account_key),
            "all_system_models": ModelPermissionService.get_all_system_models(tenant_id),
        }, 200

    @setup_required
    @login_required
    @account_initialization_required
    def put(self, account_id):
        user, tenant_id = current_account_with_tenant()
        if not user.is_admin_or_owner:
            console_ns.abort(403, description="Only admin or owner can set model whitelist")

        payload = console_ns.payload or {}
        args = ModelWhitelistPayload.model_validate(payload)

        try:
            result = ModelPermissionService.set_whitelist(
                tenant_id=tenant_id,
                account_id=str(account_id),
                models=[
                    {"provider_name": entry.provider, "model_name": entry.model, "model_type": entry.model_type}
                    for entry in args.models
                ],
                created_by=user.id,
                operator_ip=request.remote_addr,
            )
        except InvalidModelError as e:
            console_ns.abort(400, description=str(e))

        return {"result": "success", **result}, 200
