from __future__ import annotations

import inspect
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from werkzeug.exceptions import NotFound

from controllers.console.app import site as site_module


def _unwrap(func):
    bound_self = getattr(func, "__self__", None)
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    if bound_self is not None:
        return func.__get__(bound_self, bound_self.__class__)
    return func


def _app_model() -> SimpleNamespace:
    return SimpleNamespace(id="app-1")


def _token_dict() -> dict[str, str]:
    return {
        "embed_token": "jwt-1",
        "chatbot_path": "/chatbot/code1?embed_token=jwt-1",
    }


class TestAppSiteEmbedToken:
    @patch("controllers.console.app.site.EmbedTokenService")
    @patch("controllers.console.app.site.db.session.scalar")
    def test_get_returns_ensure_token_dict(self, mock_scalar: MagicMock, mock_service: MagicMock, app) -> None:
        site = SimpleNamespace(code="code1")
        mock_scalar.return_value = site
        mock_service.ensure_token.return_value = _token_dict()
        api = site_module.AppSiteEmbedToken()
        method = _unwrap(api.get)
        app_model = _app_model()

        with app.test_request_context("/console/api/apps/app-1/site/embed-token"):
            result = method(app_model=app_model)

        assert result == _token_dict()
        mock_service.ensure_token.assert_called_once_with(app_model, site)
        mock_service.reset_token.assert_not_called()

    @patch("controllers.console.app.site.EmbedTokenService")
    @patch("controllers.console.app.site.db.session.scalar")
    def test_get_missing_site_raises_not_found(self, mock_scalar: MagicMock, mock_service: MagicMock, app) -> None:
        mock_scalar.return_value = None
        api = site_module.AppSiteEmbedToken()
        method = _unwrap(api.get)

        with app.test_request_context("/console/api/apps/app-1/site/embed-token"):
            with pytest.raises(NotFound):
                method(app_model=_app_model())

        mock_service.ensure_token.assert_not_called()


class TestAppSiteEmbedTokenReset:
    @patch("controllers.console.app.site.EmbedTokenService")
    @patch("controllers.console.app.site.db.session.scalar")
    def test_post_returns_reset_token_dict_without_mutating_site_code(
        self, mock_scalar: MagicMock, mock_service: MagicMock, app
    ) -> None:
        site = SimpleNamespace(code="code1")
        mock_scalar.return_value = site
        mock_service.reset_token.return_value = _token_dict()
        api = site_module.AppSiteEmbedTokenReset()
        method = _unwrap(api.post)
        app_model = _app_model()

        with app.test_request_context("/console/api/apps/app-1/site/embed-token/reset", method="POST"):
            result = method(app_model=app_model)

        assert result == _token_dict()
        mock_service.reset_token.assert_called_once_with(app_model, site)
        mock_service.ensure_token.assert_not_called()
        assert site.code == "code1"

    @patch("controllers.console.app.site.EmbedTokenService")
    @patch("controllers.console.app.site.db.session.scalar")
    def test_post_missing_site_raises_not_found(self, mock_scalar: MagicMock, mock_service: MagicMock, app) -> None:
        mock_scalar.return_value = None
        api = site_module.AppSiteEmbedTokenReset()
        method = _unwrap(api.post)

        with app.test_request_context("/console/api/apps/app-1/site/embed-token/reset", method="POST"):
            with pytest.raises(NotFound):
                method(app_model=_app_model())

        mock_service.reset_token.assert_not_called()

    def test_reset_uses_edit_permission_not_admin_or_owner(self) -> None:
        source = inspect.getsource(site_module.AppSiteEmbedTokenReset)
        assert "@edit_permission_required" in source
        assert "@is_admin_or_owner_required" not in source
        assert "@marshal_with(app_site_model)" not in source
        for name in (
            "setup_required",
            "login_required",
            "edit_permission_required",
            "account_initialization_required",
            "get_app_model",
        ):
            assert name in source
