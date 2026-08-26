"""Unit tests for department gate enforcement in PassportResource.get."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from flask import Flask
from werkzeug.exceptions import Forbidden, NotFound, Unauthorized

from controllers.web.passport import PassportResource, _resolve_console_account


@pytest.fixture
def app() -> Flask:
    flask_app = Flask(__name__)
    flask_app.config["TESTING"] = True
    return flask_app


class TestResolveConsoleAccount:
    @patch("controllers.web.passport.extract_access_token", return_value=None)
    @patch("controllers.web.passport.db")
    def test_no_token_returns_none(self, mock_db: MagicMock, mock_extract: MagicMock) -> None:
        result = _resolve_console_account(MagicMock())
        assert result is None

    @patch("controllers.web.passport.extract_access_token", return_value="bad-token")
    @patch("controllers.web.passport.PassportService")
    @patch("controllers.web.passport.db")
    def test_invalid_token_returns_none(
        self, mock_db: MagicMock, mock_passport_cls: MagicMock, mock_extract: MagicMock
    ) -> None:
        mock_passport_cls.return_value.verify.side_effect = Unauthorized("Invalid.")
        result = _resolve_console_account(MagicMock())
        assert result is None

    @patch("controllers.web.passport.extract_access_token", return_value="valid-token")
    @patch("controllers.web.passport.PassportService")
    @patch("controllers.web.passport.db")
    def test_no_account_id_returns_none(
        self, mock_db: MagicMock, mock_passport_cls: MagicMock, mock_extract: MagicMock
    ) -> None:
        mock_passport_cls.return_value.verify.return_value = {"sub": "other"}
        result = _resolve_console_account(MagicMock())
        assert result is None

    @patch("controllers.web.passport.extract_access_token", return_value="valid-token")
    @patch("controllers.web.passport.PassportService")
    @patch("controllers.web.passport.db")
    def test_valid_returns_account(
        self, mock_db: MagicMock, mock_passport_cls: MagicMock, mock_extract: MagicMock
    ) -> None:
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        account = SimpleNamespace(id="acc-1")
        mock_db.session.scalar.return_value = account
        result = _resolve_console_account(MagicMock())
        assert result.id == "acc-1"


class TestPassportDepartmentGate:
    @patch("controllers.web.passport.extract_access_token", return_value=None)
    @patch("controllers.web.passport.FeatureService.get_system_features")
    def test_flag_on_no_login_state_returns_401(
        self, mock_features: MagicMock, mock_extract: MagicMock, app: Flask
    ) -> None:
        mock_features.return_value = SimpleNamespace(
            department_access_control=True,
            webapp_auth=SimpleNamespace(enabled=False),
        )
        with app.test_request_context("/passport", headers={"X-App-Code": "code1"}):
            with pytest.raises(Unauthorized, match="Console login state"):
                PassportResource().get()

    @patch("controllers.web.passport.AppPublishService.can_access", return_value=False)
    @patch("controllers.web.passport.db")
    @patch("controllers.web.passport.extract_access_token", return_value="valid-token")
    @patch("controllers.web.passport.PassportService")
    @patch("controllers.web.passport.FeatureService.get_system_features")
    def test_flag_on_can_access_false_returns_403(
        self,
        mock_features: MagicMock,
        mock_passport_cls: MagicMock,
        mock_extract: MagicMock,
        mock_db: MagicMock,
        mock_can_access: MagicMock,
        app: Flask,
    ) -> None:
        mock_features.return_value = SimpleNamespace(
            department_access_control=True,
            webapp_auth=SimpleNamespace(enabled=False),
        )
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        account = SimpleNamespace(id="acc-1")
        site = SimpleNamespace(app_id="app-1")
        app_model = SimpleNamespace(id="app-1", status="normal", enable_site=True, tenant_id="t1")
        mock_db.session.scalar.side_effect = [account, site, app_model]
        with app.test_request_context("/passport", headers={"X-App-Code": "code1"}):
            with pytest.raises(Forbidden, match="permission"):
                PassportResource().get()

    @patch("controllers.web.passport.PassportService")
    @patch("controllers.web.passport.AppPublishService.can_access", return_value=True)
    @patch("controllers.web.passport.db")
    @patch("controllers.web.passport.extract_access_token", return_value="valid-token")
    @patch("controllers.web.passport.FeatureService.get_system_features")
    def test_flag_on_pass_issues_non_anonymous_token(
        self,
        mock_features: MagicMock,
        mock_extract: MagicMock,
        mock_db: MagicMock,
        mock_can_access: MagicMock,
        mock_passport_cls: MagicMock,
        app: Flask,
    ) -> None:
        mock_features.return_value = SimpleNamespace(
            department_access_control=True,
            webapp_auth=SimpleNamespace(enabled=False),
        )
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        account = SimpleNamespace(id="acc-1")
        site = SimpleNamespace(app_id="app-1")
        app_model = SimpleNamespace(id="app-1", status="normal", enable_site=True, tenant_id="t1")
        mock_db.session.scalar.side_effect = [account, site, app_model, None]
        mock_passport_cls.return_value.issue.return_value = "issued-token"

        with app.test_request_context("/passport", headers={"X-App-Code": "code1"}):
            response = PassportResource().get()

        assert response.get_json()["access_token"] == "issued-token"
        issued_end_user = mock_db.session.add.call_args[0][0]
        assert issued_end_user.is_anonymous is False
        assert issued_end_user.session_id == "console:acc-1"

        issued_payload = mock_passport_cls.return_value.issue.call_args[0][0]
        assert issued_payload["end_user_id"] == issued_end_user.id

    @patch("controllers.web.passport.PassportService")
    @patch("controllers.web.passport.AppPublishService.can_access", return_value=True)
    @patch("controllers.web.passport.db")
    @patch("controllers.web.passport.extract_access_token", return_value="valid-token")
    @patch("controllers.web.passport.FeatureService.get_system_features")
    def test_flag_on_reuses_existing_end_user(
        self,
        mock_features: MagicMock,
        mock_extract: MagicMock,
        mock_db: MagicMock,
        mock_can_access: MagicMock,
        mock_passport_cls: MagicMock,
        app: Flask,
    ) -> None:
        mock_features.return_value = SimpleNamespace(
            department_access_control=True,
            webapp_auth=SimpleNamespace(enabled=False),
        )
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        account = SimpleNamespace(id="acc-1")
        site = SimpleNamespace(app_id="app-1")
        app_model = SimpleNamespace(id="app-1", status="normal", enable_site=True, tenant_id="t1")
        existing_user = SimpleNamespace(id="eu-existing", is_anonymous=False, session_id="console:acc-1")
        mock_db.session.scalar.side_effect = [account, site, app_model, existing_user]
        mock_passport_cls.return_value.issue.return_value = "reused-token"

        with app.test_request_context("/passport", headers={"X-App-Code": "code1"}):
            response = PassportResource().get()

        assert response.get_json()["access_token"] == "reused-token"
        mock_db.session.add.assert_not_called()

    @patch("controllers.web.passport.db")
    @patch("controllers.web.passport.extract_access_token", return_value="valid-token")
    @patch("controllers.web.passport.PassportService")
    @patch("controllers.web.passport.FeatureService.get_system_features")
    def test_flag_on_site_not_found_returns_404(
        self,
        mock_features: MagicMock,
        mock_passport_cls: MagicMock,
        mock_extract: MagicMock,
        mock_db: MagicMock,
        app: Flask,
    ) -> None:
        mock_features.return_value = SimpleNamespace(
            department_access_control=True,
            webapp_auth=SimpleNamespace(enabled=False),
        )
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        account = SimpleNamespace(id="acc-1")
        mock_db.session.scalar.side_effect = [account, None]
        with app.test_request_context("/passport", headers={"X-App-Code": "code1"}):
            with pytest.raises(NotFound):
                PassportResource().get()
