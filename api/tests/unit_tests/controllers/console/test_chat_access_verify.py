"""Unit tests for controllers.web.chat_access — chat access verification endpoint."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from flask import Flask
from werkzeug.exceptions import NotFound, Unauthorized

from controllers.web.chat_access import ChatAccessVerifyResource


@pytest.fixture
def app() -> Flask:
    flask_app = Flask(__name__)
    flask_app.config["TESTING"] = True
    return flask_app


class TestChatAccessVerify:
    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_flag_off_returns_404(self, mock_features: MagicMock, app: Flask) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=False)
        with app.test_request_context("/api/chat-access/verify?app_code=code1"):
            with pytest.raises(NotFound):
                ChatAccessVerifyResource().get()

    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_missing_app_code_returns_404(self, mock_features: MagicMock, app: Flask) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=True)
        with app.test_request_context("/api/chat-access/verify"):
            with pytest.raises(NotFound):
                ChatAccessVerifyResource().get()

    @patch("controllers.web.chat_access.extract_access_token", return_value=None)
    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_no_access_token_returns_401(
        self, mock_features: MagicMock, mock_extract: MagicMock, app: Flask
    ) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=True)
        with app.test_request_context("/api/chat-access/verify?app_code=code1"):
            with pytest.raises(Unauthorized, match="Console login state"):
                ChatAccessVerifyResource().get()

    @patch("controllers.web.chat_access.extract_access_token", return_value="bad-token")
    @patch("controllers.web.chat_access.PassportService")
    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_invalid_token_returns_401(
        self, mock_features: MagicMock, mock_passport_cls: MagicMock, mock_extract: MagicMock, app: Flask
    ) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=True)
        mock_passport_cls.return_value.verify.side_effect = Unauthorized("Invalid token.")
        with app.test_request_context("/api/chat-access/verify?app_code=code1"):
            with pytest.raises(Unauthorized, match="Invalid console login"):
                ChatAccessVerifyResource().get()

    @patch("controllers.web.chat_access.extract_access_token", return_value="valid-token")
    @patch("controllers.web.chat_access.PassportService")
    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_no_account_id_in_payload_returns_401(
        self, mock_features: MagicMock, mock_passport_cls: MagicMock, mock_extract: MagicMock, app: Flask
    ) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=True)
        mock_passport_cls.return_value.verify.return_value = {"sub": "other"}
        with app.test_request_context("/api/chat-access/verify?app_code=code1"):
            with pytest.raises(Unauthorized, match="Console login state"):
                ChatAccessVerifyResource().get()

    @patch("controllers.web.chat_access.db")
    @patch("controllers.web.chat_access.extract_access_token", return_value="valid-token")
    @patch("controllers.web.chat_access.PassportService")
    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_account_not_found_returns_401(
        self,
        mock_features: MagicMock,
        mock_passport_cls: MagicMock,
        mock_extract: MagicMock,
        mock_db: MagicMock,
        app: Flask,
    ) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=True)
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        mock_db.session.scalar.return_value = None
        with app.test_request_context("/api/chat-access/verify?app_code=code1"):
            with pytest.raises(Unauthorized, match="Console login state"):
                ChatAccessVerifyResource().get()

    @patch("controllers.web.chat_access.db")
    @patch("controllers.web.chat_access.extract_access_token", return_value="valid-token")
    @patch("controllers.web.chat_access.PassportService")
    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_site_not_found_returns_not_found_code(
        self,
        mock_features: MagicMock,
        mock_passport_cls: MagicMock,
        mock_extract: MagicMock,
        mock_db: MagicMock,
        app: Flask,
    ) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=True)
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        account = SimpleNamespace(id="acc-1")
        mock_db.session.scalar.side_effect = [account, None]
        with app.test_request_context("/api/chat-access/verify?app_code=code1"):
            result, status = ChatAccessVerifyResource().get()
        assert status == 200
        assert result == {"access": False, "code": "not_found"}

    @patch("controllers.web.chat_access.AppPublishService.can_access", return_value=False)
    @patch("controllers.web.chat_access.db")
    @patch("controllers.web.chat_access.extract_access_token", return_value="valid-token")
    @patch("controllers.web.chat_access.PassportService")
    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_access_denied_returns_403_code(
        self,
        mock_features: MagicMock,
        mock_passport_cls: MagicMock,
        mock_extract: MagicMock,
        mock_db: MagicMock,
        mock_can_access: MagicMock,
        app: Flask,
    ) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=True)
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        account = SimpleNamespace(id="acc-1")
        site = SimpleNamespace(app_id="app-1")
        app_model = SimpleNamespace(id="app-1", status="normal", enable_site=True, tenant_id="t1")
        mock_db.session.scalar.side_effect = [account, site, app_model]
        with app.test_request_context("/api/chat-access/verify?app_code=code1"):
            result, status = ChatAccessVerifyResource().get()
        assert status == 200
        assert result["access"] is False
        assert result["code"] == "access_denied"

    @patch("controllers.web.chat_access.AppPublishService.can_access", return_value=True)
    @patch("controllers.web.chat_access.db")
    @patch("controllers.web.chat_access.extract_access_token", return_value="valid-token")
    @patch("controllers.web.chat_access.PassportService")
    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_admin_pass_returns_app_info(
        self,
        mock_features: MagicMock,
        mock_passport_cls: MagicMock,
        mock_extract: MagicMock,
        mock_db: MagicMock,
        mock_can_access: MagicMock,
        app: Flask,
    ) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=True)
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        account = SimpleNamespace(id="acc-1")
        site = SimpleNamespace(app_id="app-1")
        app_model = SimpleNamespace(
            id="app-1",
            status="normal",
            enable_site=True,
            tenant_id="t1",
            name="TestApp",
            icon_type="emoji",
            icon="robot",
            icon_background="#FF0000",
            description="A test app",
            mode="chat",
        )
        mock_db.session.scalar.side_effect = [account, site, app_model]
        with app.test_request_context("/api/chat-access/verify?app_code=code1"):
            result, status = ChatAccessVerifyResource().get()
        assert status == 200
        assert result["access"] is True
        assert result["app_info"]["app_id"] == "app-1"
        assert result["app_info"]["name"] == "TestApp"
        assert result["app_info"]["mode"] == "chat"

    @patch("controllers.web.chat_access.extract_access_token", return_value="cookie-token")
    @patch("controllers.web.chat_access.PassportService")
    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_extract_access_token_from_cookie(
        self, mock_features: MagicMock, mock_passport_cls: MagicMock, mock_extract: MagicMock, app: Flask
    ) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=True)
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        mock_db = MagicMock()
        mock_db.session.scalar.side_effect = [SimpleNamespace(id="acc-1"), None]
        with (
            patch("controllers.web.chat_access.db", mock_db),
            app.test_request_context("/api/chat-access/verify?app_code=code1"),
        ):
            result, status = ChatAccessVerifyResource().get()
        mock_extract.assert_called_once()
        assert result == {"access": False, "code": "not_found"}

    @patch("controllers.web.chat_access.extract_access_token", return_value="bearer-token")
    @patch("controllers.web.chat_access.PassportService")
    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_extract_access_token_from_bearer(
        self, mock_features: MagicMock, mock_passport_cls: MagicMock, mock_extract: MagicMock, app: Flask
    ) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=True)
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        mock_db = MagicMock()
        mock_db.session.scalar.side_effect = [SimpleNamespace(id="acc-1"), None]
        with (
            patch("controllers.web.chat_access.db", mock_db),
            app.test_request_context(
                "/api/chat-access/verify?app_code=code1",
                headers={"Authorization": "Bearer bearer-token"},
            ),
        ):
            result, status = ChatAccessVerifyResource().get()
        mock_extract.assert_called_once()
        assert result == {"access": False, "code": "not_found"}

    @patch("controllers.web.chat_access.db")
    @patch("controllers.web.chat_access.extract_access_token", return_value="valid-token")
    @patch("controllers.web.chat_access.PassportService")
    @patch("controllers.web.chat_access.FeatureService.get_system_features")
    def test_disabled_app_returns_not_found_code(
        self,
        mock_features: MagicMock,
        mock_passport_cls: MagicMock,
        mock_extract: MagicMock,
        mock_db: MagicMock,
        app: Flask,
    ) -> None:
        mock_features.return_value = SimpleNamespace(department_access_control=True)
        mock_passport_cls.return_value.verify.return_value = {"account_id": "acc-1"}
        account = SimpleNamespace(id="acc-1")
        site = SimpleNamespace(app_id="app-1")
        disabled_app = SimpleNamespace(id="app-1", status="normal", enable_site=False)
        mock_db.session.scalar.side_effect = [account, site, disabled_app]
        with app.test_request_context("/api/chat-access/verify?app_code=code1"):
            result, status = ChatAccessVerifyResource().get()
        assert status == 200
        assert result == {"access": False, "code": "not_found"}
