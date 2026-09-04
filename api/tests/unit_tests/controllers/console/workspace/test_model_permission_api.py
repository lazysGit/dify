"""Unit tests for the admin member model-whitelist API (GET/PUT)."""

from unittest.mock import MagicMock, patch

import pytest
from werkzeug.exceptions import HTTPException

from controllers.console.workspace.model_permission import MemberModelWhitelistApi
from services.errors.model_permission import InvalidModelError

TARGET_UUID = "00000000-0000-0000-0000-000000000002"


def unwrap(func):
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    return func


def _admin_user():
    return MagicMock(is_admin_or_owner=True, id="u1")


class TestMemberModelWhitelistApi:
    def test_get_success_structure(self, app):
        api = MemberModelWhitelistApi()
        method = unwrap(api.get)
        user = _admin_user()
        whitelist = [{"provider_name": "openai", "model_name": "gpt-4", "model_type": "llm"}]
        all_models = [{"provider": "openai", "model": "gpt-4", "model_type": "llm", "label": "GPT-4"}]

        with (
            app.test_request_context("/"),
            patch(
                "controllers.console.workspace.model_permission.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch("controllers.console.workspace.model_permission.ModelPermissionService") as mock_svc,
        ):
            mock_db = MagicMock()
            mock_db.session.query.return_value.filter.return_value.first.return_value = MagicMock()
            with patch("controllers.console.workspace.model_permission.db", mock_db):
                mock_svc.get_whitelist.return_value = whitelist
                mock_svc.get_all_system_models.return_value = all_models
                mock_svc.is_restricted.return_value = True

                result, status = method(api, TARGET_UUID)

        assert status == 200
        assert result == {"is_restricted": True, "whitelist": whitelist, "all_system_models": all_models}

    def test_get_returns_404_for_non_member_account(self, app):
        """Cross-tenant IDOR guard: admin must not read whitelists of non-members."""
        api = MemberModelWhitelistApi()
        method = unwrap(api.get)
        user = _admin_user()

        with (
            app.test_request_context("/"),
            patch(
                "controllers.console.workspace.model_permission.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch("controllers.console.workspace.model_permission.db") as mock_db,
        ):
            mock_db.session.query.return_value.filter_by.return_value.first.return_value = None

            with pytest.raises(HTTPException) as exc_info:
                method(api, TARGET_UUID)

        assert exc_info.value.code == 404

    def test_get_forbidden_for_non_admin(self, app):
        api = MemberModelWhitelistApi()
        method = unwrap(api.get)
        user = MagicMock(is_admin_or_owner=False, id="u2")

        with (
            app.test_request_context("/"),
            patch(
                "controllers.console.workspace.model_permission.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api, TARGET_UUID)

        assert exc_info.value.code == 403

    def test_put_success_maps_payload_and_returns_result(self, app):
        api = MemberModelWhitelistApi()
        method = unwrap(api.put)
        user = _admin_user()
        payload = {"models": [{"provider": "openai", "model": "gpt-4", "model_type": "llm"}]}

        with (
            app.test_request_context("/", method="PUT", json=payload, environ_base={"REMOTE_ADDR": "127.0.0.1"}),
            patch(
                "controllers.console.workspace.model_permission.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch("controllers.console.workspace.model_permission.ModelPermissionService") as mock_svc,
        ):
            mock_svc.set_whitelist.return_value = {"is_restricted": True, "whitelist_count": 1}
            mock_db = MagicMock()
            mock_db.session.query.return_value.filter.return_value.first.return_value = MagicMock()

            with patch("controllers.console.workspace.model_permission.db", mock_db):
                result, status = method(api, TARGET_UUID)

        assert status == 200
        assert result == {"result": "success", "is_restricted": True, "whitelist_count": 1}
        mock_svc.set_whitelist.assert_called_once_with(
            tenant_id="t1",
            account_id=TARGET_UUID,
            models=[{"provider_name": "openai", "model_name": "gpt-4", "model_type": "llm"}],
            created_by="u1",
            operator_ip="127.0.0.1",
        )

    def test_put_forbidden_for_non_admin(self, app):
        api = MemberModelWhitelistApi()
        method = unwrap(api.put)
        user = MagicMock(is_admin_or_owner=False, id="u2")
        payload = {"models": [{"provider": "openai", "model": "gpt-4", "model_type": "llm"}]}

        with (
            app.test_request_context("/", method="PUT", json=payload),
            patch(
                "controllers.console.workspace.model_permission.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api, TARGET_UUID)

        assert exc_info.value.code == 403

    def test_put_invalid_model_returns_400(self, app):
        api = MemberModelWhitelistApi()
        method = unwrap(api.put)
        user = _admin_user()
        payload = {"models": [{"provider": "openai", "model": "claude-3", "model_type": "llm"}]}

        with (
            app.test_request_context("/", method="PUT", json=payload),
            patch(
                "controllers.console.workspace.model_permission.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch("controllers.console.workspace.model_permission.ModelPermissionService") as mock_svc,
            patch("controllers.console.workspace.model_permission.db") as mock_db,
        ):
            mock_db.session.query.return_value.filter.return_value.first.return_value = MagicMock()
            mock_svc.set_whitelist.side_effect = InvalidModelError("Model claude-3 is not available in this workspace")

            with pytest.raises(HTTPException) as exc_info:
                method(api, TARGET_UUID)

        assert exc_info.value.code == 400
