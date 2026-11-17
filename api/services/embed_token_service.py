"""Issue and rotate anonymous embed JWTs for department-ACL chatbot iframes.

Revocation is embed_jti rotation on Site; the JWT has no exp. Callers must
already hold a Site row. Returns 404 when the department ACL flag is off or
the app/site is not a live Web App.
"""

from __future__ import annotations

import uuid
from typing import TypedDict

from sqlalchemy import select
from werkzeug.exceptions import NotFound

from extensions.ext_database import db
from libs.passport import PassportService
from models.model import App, EndUser, Site
from services.feature_service import FeatureService

_EMBED_CHANNEL = "embed"
_WEB_API_PASSPORT_SUB = "Web API Passport"


class EmbedTokenResult(TypedDict):
    embed_token: str
    chatbot_path: str


class EmbedTokenPayload(TypedDict):
    iss: str
    sub: str
    app_id: str
    app_code: str
    end_user_id: str
    channel: str
    jti: str


class EmbedTokenService:
    """Ensure or rotate the anonymous embed token bound to a site."""

    @classmethod
    def ensure_token(cls, app_model: App, site: Site) -> EmbedTokenResult:
        """Return the current embed JWT, creating embed_jti and EndUser on first call."""
        return cls._issue(app_model, site, rotate=False)

    @classmethod
    def reset_token(cls, app_model: App, site: Site) -> EmbedTokenResult:
        """Write a new embed_jti and return a JWT that invalidates previous copies."""
        return cls._issue(app_model, site, rotate=True)

    @classmethod
    def _issue(cls, app_model: App, site: Site, *, rotate: bool) -> EmbedTokenResult:
        cls._assert_eligible(app_model, site)
        embed_jti = str(uuid.uuid4()) if rotate or not site.embed_jti else site.embed_jti
        site.embed_jti = embed_jti

        end_user = cls._get_or_create_embed_end_user(app_model)
        payload: EmbedTokenPayload = {
            "iss": app_model.id,
            "sub": _WEB_API_PASSPORT_SUB,
            "app_id": app_model.id,
            "app_code": site.code,
            "end_user_id": end_user.id,
            "channel": _EMBED_CHANNEL,
            "jti": embed_jti,
        }
        jwt = PassportService().issue(payload)
        db.session.commit()
        return {
            "embed_token": jwt,
            "chatbot_path": f"/chatbot/{site.code}?embed_token={jwt}",
        }

    @staticmethod
    def _assert_eligible(app_model: App, site: Site) -> None:
        features = FeatureService.get_system_features()
        if (
            not features.department_access_control
            or not app_model.enable_site
            or app_model.status != "normal"
            or site.status != "normal"
        ):
            raise NotFound()

    @staticmethod
    def _get_or_create_embed_end_user(app_model: App) -> EndUser:
        session_id = f"embed:{app_model.id}"
        end_user = db.session.scalar(
            select(EndUser).where(
                EndUser.tenant_id == app_model.tenant_id,
                EndUser.app_id == app_model.id,
                EndUser.session_id == session_id,
            )
        )
        if end_user:
            return end_user

        end_user = EndUser(
            tenant_id=app_model.tenant_id,
            app_id=app_model.id,
            type="browser",
            is_anonymous=True,
            session_id=session_id,
        )
        db.session.add(end_user)
        db.session.flush()
        return end_user
