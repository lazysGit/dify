"""Unit tests for the read-only "my available models" API."""

from unittest.mock import MagicMock, patch

from controllers.console.account.model_settings import AccountModelSettingsApi

ALL_MODELS = [
    {"provider": "openai", "model": "gpt-4", "model_type": "llm", "label": "GPT-4"},
    {"provider": "openai", "model": "gpt-4o", "model_type": "llm", "label": "GPT-4o"},
]


def unwrap(func):
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    return func


class TestAccountModelSettingsApi:
    def test_get_success_structure(self, app):
        api = AccountModelSettingsApi()
        method = unwrap(api.get)
        user = MagicMock(is_admin_or_owner=True, id="u1")

        with (
            app.test_request_context("/"),
            patch("controllers.console.account.model_settings.current_account_with_tenant", return_value=(user, "t1")),
            patch("controllers.console.account.model_settings.ModelPermissionService") as mock_svc,
        ):
            mock_svc.get_available_models_flat.return_value = (ALL_MODELS, False)

            result, status = method(api)

        assert status == 200
        assert result == {"available_models": ALL_MODELS, "is_restricted": False}
        mock_svc.get_available_models_flat.assert_called_once_with("u1", "t1", user)

    def test_get_admin_sees_all_and_not_restricted(self, app):
        api = AccountModelSettingsApi()
        method = unwrap(api.get)
        user = MagicMock(is_admin_or_owner=True, id="u1")

        with (
            app.test_request_context("/"),
            patch("controllers.console.account.model_settings.current_account_with_tenant", return_value=(user, "t1")),
            patch("controllers.console.account.model_settings.ModelPermissionService") as mock_svc,
        ):
            mock_svc.get_available_models_flat.return_value = (ALL_MODELS, False)

            result, _ = method(api)

        assert result["is_restricted"] is False
        assert len(result["available_models"]) == 2

    def test_get_normal_user_with_whitelist_is_restricted(self, app):
        api = AccountModelSettingsApi()
        method = unwrap(api.get)
        user = MagicMock(is_admin_or_owner=False, id="u2")

        with (
            app.test_request_context("/"),
            patch("controllers.console.account.model_settings.current_account_with_tenant", return_value=(user, "t1")),
            patch("controllers.console.account.model_settings.ModelPermissionService") as mock_svc,
        ):
            mock_svc.get_available_models_flat.return_value = (ALL_MODELS[:1], True)

            result, _ = method(api)

        assert result["is_restricted"] is True
        assert result["available_models"] == [ALL_MODELS[0]]

    def test_get_normal_user_without_whitelist_not_restricted(self, app):
        api = AccountModelSettingsApi()
        method = unwrap(api.get)
        user = MagicMock(is_admin_or_owner=False, id="u2")

        with (
            app.test_request_context("/"),
            patch("controllers.console.account.model_settings.current_account_with_tenant", return_value=(user, "t1")),
            patch("controllers.console.account.model_settings.ModelPermissionService") as mock_svc,
        ):
            mock_svc.get_available_models_flat.return_value = (ALL_MODELS, False)

            result, _ = method(api)

        assert result["is_restricted"] is False
        assert len(result["available_models"]) == 2
