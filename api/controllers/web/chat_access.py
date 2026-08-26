import logging

from flask import request
from flask_restx import Resource
from sqlalchemy import select
from werkzeug.exceptions import NotFound, Unauthorized

from controllers.web import web_ns
from extensions.ext_database import db
from libs.passport import PassportService
from libs.token import extract_access_token
from models.account import Account
from models.model import App, Site
from services.app_publish_service import AppPublishService
from services.feature_service import FeatureService

logger = logging.getLogger(__name__)


@web_ns.route("/chat-access/verify")
class ChatAccessVerifyResource(Resource):
    @web_ns.doc("verify_chat_access")
    @web_ns.doc(description="Verify console user access to a chat app via department publishing")
    @web_ns.doc(
        responses={
            200: "Access verification result",
            401: "Unauthorized - missing or invalid console login state",
            403: "Access denied - user department not published to",
            404: "Not found or feature disabled",
        }
    )
    def get(self):
        system_features = FeatureService.get_system_features()
        if not system_features.department_access_control:
            raise NotFound()

        app_code = request.args.get("app_code")
        if not app_code:
            raise NotFound()

        access_token = extract_access_token(request)
        if not access_token:
            raise Unauthorized("Console login state is required.")

        try:
            payload = PassportService().verify(access_token)
        except Unauthorized:
            raise Unauthorized("Invalid console login state.")

        account_id = payload.get("account_id")
        if not account_id:
            raise Unauthorized("Console login state is required.")

        account = db.session.scalar(select(Account).where(Account.id == account_id))
        if not account:
            raise Unauthorized("Console login state is required.")

        site = db.session.scalar(select(Site).where(Site.code == app_code, Site.status == "normal"))
        if not site:
            return {"access": False, "code": "not_found"}, 200

        app_model = db.session.scalar(select(App).where(App.id == site.app_id))
        if not app_model or app_model.status != "normal" or not app_model.enable_site:
            return {"access": False, "code": "not_found"}, 200

        if not AppPublishService.can_access(account, app_model.tenant_id, app_model.id):
            return {
                "access": False,
                "code": "access_denied",
                "message": "You do not have permission to access this app.",
            }, 200

        app_info = {
            "app_id": app_model.id,
            "name": app_model.name,
            "icon_type": app_model.icon_type,
            "icon": app_model.icon,
            "icon_background": app_model.icon_background,
            "description": app_model.description or "",
            "mode": app_model.mode,
        }
        return {"access": True, "app_info": app_info}, 200
