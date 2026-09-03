"""Read-only model settings API for the logged-in account.

Returns the flat catalogue of models the caller may use plus an
``is_restricted`` flag so the frontend can render the "my available models"
page without any admin privileges. Filtering rules live entirely in
``ModelPermissionService.get_available_models_flat``.
"""

from flask_restx import Resource

from controllers.console import console_ns
from controllers.console.wraps import account_initialization_required, setup_required
from libs.login import current_account_with_tenant, login_required
from services.model_permission_service import ModelPermissionService


@console_ns.route("/account/model-settings")
class AccountModelSettingsApi(Resource):
    """List the models available to the current user (read-only)."""

    @setup_required
    @login_required
    @account_initialization_required
    def get(self):
        user, tenant_id = current_account_with_tenant()
        available_models, is_restricted = ModelPermissionService.get_available_models_flat(user.id, tenant_id, user)
        return {"available_models": available_models, "is_restricted": is_restricted}, 200
