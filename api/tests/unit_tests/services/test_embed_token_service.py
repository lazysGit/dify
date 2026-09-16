from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from werkzeug.exceptions import NotFound

from services.embed_token_service import EmbedTokenService


def _app(*, enable_site: bool = True, status: str = "normal") -> SimpleNamespace:
    return SimpleNamespace(id="app-1", tenant_id="t1", enable_site=enable_site, status=status)


def _site(*, code: str = "code1", embed_jti: str | None = None, status: str = "normal") -> SimpleNamespace:
    return SimpleNamespace(code=code, embed_jti=embed_jti, status=status, app_id="app-1")


@patch("services.embed_token_service.FeatureService.get_system_features")
def test_flag_off_raises_not_found(mock_features: MagicMock) -> None:
    mock_features.return_value = SimpleNamespace(department_access_control=False)
    with pytest.raises(NotFound):
        EmbedTokenService.ensure_token(_app(), _site())


@patch("services.embed_token_service.FeatureService.get_system_features")
def test_site_disabled_raises_not_found(mock_features: MagicMock) -> None:
    mock_features.return_value = SimpleNamespace(department_access_control=True)
    with pytest.raises(NotFound):
        EmbedTokenService.ensure_token(_app(enable_site=False), _site())


@patch("services.embed_token_service.PassportService")
@patch("services.embed_token_service.db")
@patch("services.embed_token_service.FeatureService.get_system_features")
def test_first_ensure_writes_jti_and_anonymous_end_user(
    mock_features: MagicMock, mock_db: MagicMock, mock_passport_cls: MagicMock
) -> None:
    mock_features.return_value = SimpleNamespace(department_access_control=True)
    mock_db.session.scalar.return_value = None
    mock_passport_cls.return_value.issue.return_value = "jwt-1"
    site = _site()
    result = EmbedTokenService.ensure_token(_app(), site)
    assert result["embed_token"] == "jwt-1"
    assert result["chatbot_path"].startswith("/chatbot/code1?embed_token=")
    assert site.embed_jti
    payload = mock_passport_cls.return_value.issue.call_args[0][0]
    assert payload["channel"] == "embed"
    assert payload["jti"] == site.embed_jti
    assert payload["app_code"] == "code1"
    end_user = mock_db.session.add.call_args[0][0]
    # EndUser.is_anonymous is a Flask-Login property that always returns False;
    # the stored anonymous flag is _is_anonymous.
    assert end_user._is_anonymous is True
    assert end_user.session_id == "embed:app-1"


@patch("services.embed_token_service.PassportService")
@patch("services.embed_token_service.db")
@patch("services.embed_token_service.FeatureService.get_system_features")
def test_second_ensure_same_jwt(mock_features: MagicMock, mock_db: MagicMock, mock_passport_cls: MagicMock) -> None:
    mock_features.return_value = SimpleNamespace(department_access_control=True)
    site = _site(embed_jti="jti-fixed")
    existing = SimpleNamespace(id="eu-embed", is_anonymous=True, session_id="embed:app-1")
    mock_db.session.scalar.return_value = existing
    mock_passport_cls.return_value.issue.return_value = "jwt-same"
    first = EmbedTokenService.ensure_token(_app(), site)
    second = EmbedTokenService.ensure_token(_app(), site)
    assert first["embed_token"] == second["embed_token"]
    assert site.embed_jti == "jti-fixed"
    mock_db.session.add.assert_not_called()


@patch("services.embed_token_service.PassportService")
@patch("services.embed_token_service.db")
@patch("services.embed_token_service.FeatureService.get_system_features")
def test_reset_rotates_jti(mock_features: MagicMock, mock_db: MagicMock, mock_passport_cls: MagicMock) -> None:
    mock_features.return_value = SimpleNamespace(department_access_control=True)
    site = _site(embed_jti="old-jti")
    mock_db.session.scalar.return_value = SimpleNamespace(id="eu-embed")
    mock_passport_cls.return_value.issue.return_value = "jwt-new"
    EmbedTokenService.reset_token(_app(), site)
    assert site.embed_jti != "old-jti"
