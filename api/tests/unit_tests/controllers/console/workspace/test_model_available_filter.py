"""Unit tests for whitelist filtering at the model-types endpoint (single chokepoint)."""

from unittest.mock import MagicMock, patch

from controllers.console.workspace.models import ModelProviderAvailableModelApi

ALL_MODELS = [
    {"provider": "openai", "models": [{"model": "gpt-4"}, {"model": "gpt-4o"}]},
    {"provider": "anthropic", "models": [{"model": "claude-3"}]},
]
WHITELISTED = [{"provider": "openai", "models": [{"model": "gpt-4"}]}]


def unwrap(func):
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    return func


class TestModelProviderAvailableModelApi:
    def test_admin_gets_all_models(self, app):
        api = ModelProviderAvailableModelApi()
        method = unwrap(api.get)
        user = MagicMock(is_admin_or_owner=True, id="u1")

        with (
            app.test_request_context("/"),
            patch("controllers.console.workspace.models.current_account_with_tenant", return_value=(user, "t1")),
            patch("controllers.console.workspace.models.ModelPermissionService") as mock_svc,
        ):
            mock_svc.get_filtered_models.return_value = ALL_MODELS

            result = method(api, "llm")

        assert result["data"] == ALL_MODELS
        mock_svc.get_filtered_models.assert_called_once_with(
            account_id="u1", tenant_id="t1", model_type="llm", user=user
        )

    def test_normal_user_with_whitelist_gets_filtered_models(self, app):
        api = ModelProviderAvailableModelApi()
        method = unwrap(api.get)
        user = MagicMock(is_admin_or_owner=False, id="u2")

        with (
            app.test_request_context("/"),
            patch("controllers.console.workspace.models.current_account_with_tenant", return_value=(user, "t1")),
            patch("controllers.console.workspace.models.ModelPermissionService") as mock_svc,
        ):
            mock_svc.get_filtered_models.return_value = WHITELISTED

            result = method(api, "llm")

        assert result["data"] == WHITELISTED
        assert result["data"][0]["models"] == [{"model": "gpt-4"}]

    def test_normal_user_without_whitelist_gets_all_models(self, app):
        api = ModelProviderAvailableModelApi()
        method = unwrap(api.get)
        user = MagicMock(is_admin_or_owner=False, id="u2")

        with (
            app.test_request_context("/"),
            patch("controllers.console.workspace.models.current_account_with_tenant", return_value=(user, "t1")),
            patch("controllers.console.workspace.models.ModelPermissionService") as mock_svc,
        ):
            mock_svc.get_filtered_models.return_value = ALL_MODELS

            result = method(api, "llm")

        assert result["data"] == ALL_MODELS
        assert len(result["data"]) == 2

    def test_model_type_is_passed_through_untouched(self, app):
        api = ModelProviderAvailableModelApi()
        method = unwrap(api.get)
        user = MagicMock(is_admin_or_owner=False, id="u2")

        with (
            app.test_request_context("/"),
            patch("controllers.console.workspace.models.current_account_with_tenant", return_value=(user, "t1")),
            patch("controllers.console.workspace.models.ModelPermissionService") as mock_svc,
        ):
            mock_svc.get_filtered_models.return_value = [
                {"provider": "openai", "models": [{"model": "text-embedding-3-small"}]}
            ]

            result = method(api, "text-embedding")

        assert result["data"][0]["models"] == [{"model": "text-embedding-3-small"}]
        assert mock_svc.get_filtered_models.call_args.kwargs["model_type"] == "text-embedding"
