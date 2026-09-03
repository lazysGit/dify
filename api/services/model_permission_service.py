"""Model permission service: per-member model whitelist management and filtering.

Semantics (see docs plan 2026-09-03 model-permissions-and-publish-gate):
- No ``account_model_whitelist`` rows for an account means "unrestricted":
  every system model of the tenant is usable (backward compatible default).
- Rows present mean "restricted": only whitelisted (provider, model, model_type)
  triples pass. Owners/admins are never restricted, regardless of rows.
- The catalogue of system models comes from ``ModelProviderService.get_models_by_model_type``
  per model type; there is deliberately no repository layer for the small config
  table (``DepartmentService`` precedent).

Audit trail: whitelist writes land in ``OperationLog`` via ``DepartmentAuditLog.log``
with actions ``set_model_whitelist`` / ``remove_model_whitelist``.

Consumers: workspace member-whitelist admin APIs, the read-only "my models"
API, and the single filtering chokepoint ``workspaces/current/models/model-types``
controller (all frontend model selectors funnel through that endpoint).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from dify_graph.model_runtime.entities.common_entities import I18nObject
from extensions.ext_database import db
from models.model_permission import AccountModelWhitelist
from services.department_service import DepartmentAuditLog
from services.entities.model_provider_entities import ProviderWithModelsResponse
from services.errors.model_permission import InvalidModelError
from services.model_provider_service import ModelProviderService

if TYPE_CHECKING:
    from models.account import Account

MODEL_TYPES: tuple[str, ...] = ("llm", "text-embedding", "rerank", "speech2text", "tts")


def _label_text(label: I18nObject) -> str:
    return label.en_US or ""


class ModelPermissionService:
    @staticmethod
    def get_whitelist(account_id: str) -> list[dict[str, str]]:
        """Return the raw whitelist triples for an account; empty list = unrestricted."""
        rows = db.session.query(AccountModelWhitelist).filter(AccountModelWhitelist.account_id == account_id).all()
        return [
            {"provider_name": row.provider_name, "model_name": row.model_name, "model_type": row.model_type}
            for row in rows
        ]

    @staticmethod
    def is_restricted(account_id: str) -> bool:
        """True iff at least one whitelist row exists for the account (EXISTS probe)."""
        return (
            db.session.query(AccountModelWhitelist.id).filter(AccountModelWhitelist.account_id == account_id).first()
        ) is not None

    @staticmethod
    def set_whitelist(
        tenant_id: str,
        account_id: str,
        models: list[dict[str, str]],
        created_by: str,
        operator_ip: str | None = None,
    ) -> dict[str, Any]:
        """Replace the whitelist wholesale.

        ``models`` entries carry ``provider_name`` / ``model_name`` / ``model_type``.
        An empty list clears all rows (account returns to unrestricted). Every
        requested model must exist in the tenant's system catalogue, otherwise
        ``InvalidModelError`` is raised and nothing is written.

        :return: ``{"is_restricted": bool, "whitelist_count": int}``
        """
        if models:
            valid_keys = {
                (entry["provider"], entry["model"], entry["model_type"])
                for entry in ModelPermissionService.get_all_system_models(tenant_id)
            }
            for model in models:
                key = (model["provider_name"], model["model_name"], model["model_type"])
                if key not in valid_keys:
                    raise InvalidModelError(f"Model {model['model_name']} is not available in this workspace")

        db.session.query(AccountModelWhitelist).filter(AccountModelWhitelist.account_id == account_id).delete()
        for model in models:
            db.session.add(
                AccountModelWhitelist(
                    tenant_id=tenant_id,
                    account_id=account_id,
                    provider_name=model["provider_name"],
                    model_name=model["model_name"],
                    model_type=model["model_type"],
                    created_by=created_by,
                )
            )
        db.session.commit()

        action = "set_model_whitelist" if models else "remove_model_whitelist"
        DepartmentAuditLog.log(
            tenant_id, created_by, operator_ip, action, {"account_id": account_id, "count": len(models)}
        )
        return {"is_restricted": bool(models), "whitelist_count": len(models)}

    @staticmethod
    def get_all_system_models(tenant_id: str) -> list[dict[str, str]]:
        """Flatten the tenant catalogue across all MODEL_TYPES into admin-facing dicts."""
        service = ModelProviderService()
        flattened: list[dict[str, str]] = []
        for model_type in MODEL_TYPES:
            for provider_response in service.get_models_by_model_type(tenant_id, model_type):
                for model in provider_response.models:
                    flattened.append(
                        {
                            "provider": provider_response.provider,
                            "model": model.model,
                            "model_type": str(model.model_type),
                            "label": _label_text(model.label),
                        }
                    )
        return flattened

    @staticmethod
    def get_filtered_models(
        account_id: str, tenant_id: str, model_type: str, user: Account
    ) -> list[ProviderWithModelsResponse]:
        """Whitelist-aware variant of ``get_models_by_model_type``.

        Response shape is identical to the underlying service so the frontend
        model-type endpoint can swap implementations without client changes:
        admins/owners and unrestricted accounts get the untouched result, while
        restricted accounts get each provider's ``models`` pruned to whitelist
        hits (providers with zero hits are dropped entirely).
        """
        provider_responses = ModelProviderService().get_models_by_model_type(tenant_id, model_type)
        if user.is_admin_or_owner or not ModelPermissionService.is_restricted(account_id):
            return provider_responses

        allowed = {
            (entry["provider_name"], entry["model_name"], entry["model_type"])
            for entry in ModelPermissionService.get_whitelist(account_id)
        }
        filtered: list[ProviderWithModelsResponse] = []
        for response in provider_responses:
            kept_models = [
                model for model in response.models if (response.provider, model.model, str(model.model_type)) in allowed
            ]
            if kept_models:
                filtered.append(response.model_copy(update={"models": kept_models}))
        return filtered

    @staticmethod
    def get_available_models_flat(account_id: str, tenant_id: str, user: Account) -> tuple[list[dict[str, str]], bool]:
        """Flat catalogue for the read-only "my available models" page.

        :return: ``(models, is_restricted)`` — filtered according to the same
            admin/whitelist rules as :meth:`get_filtered_models`.
        """
        all_models = ModelPermissionService.get_all_system_models(tenant_id)
        if user.is_admin_or_owner or not ModelPermissionService.is_restricted(account_id):
            return all_models, False

        allowed = {
            (entry["provider_name"], entry["model_name"], entry["model_type"])
            for entry in ModelPermissionService.get_whitelist(account_id)
        }
        filtered = [
            model for model in all_models if (model["provider"], model["model"], model["model_type"]) in allowed
        ]
        return filtered, True
