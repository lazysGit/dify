from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from werkzeug.exceptions import Forbidden

from controllers.console.app import wraps as wraps_module
from models.model import AppMode
from services.errors.department import DepartmentPermissionDeniedError


def _make_user(user_id="u1", is_admin_or_owner=False, tenant_id="t1"):
    return SimpleNamespace(
        id=user_id,
        current_tenant_id=tenant_id,
        is_admin_or_owner=is_admin_or_owner,
    )


def _make_app(app_id="app1", tenant_id="t1", department_id="d1", enable_site=True):
    return SimpleNamespace(
        id=app_id,
        tenant_id=tenant_id,
        department_id=department_id,
        name="Test App",
        status="normal",
        mode=AppMode.CHAT.value,
        enable_site=enable_site,
    )


def _patch_db_and_auth(monkeypatch, app_model, user, tenant_id="t1"):
    monkeypatch.setattr(wraps_module, "current_account_with_tenant", lambda: (user, tenant_id))
    monkeypatch.setattr(wraps_module.db, "session", SimpleNamespace(scalar=lambda *_a, **_kw: app_model))


class TestPublishDepartmentPayloadValidation:
    def test_empty_department_ids_valid(self):
        from controllers.console.app.publish_department import UpdatePublishDepartmentsPayload

        payload = UpdatePublishDepartmentsPayload.model_validate({"department_ids": []})
        assert payload.department_ids == []

    def test_missing_department_ids_defaults_empty(self):
        from controllers.console.app.publish_department import UpdatePublishDepartmentsPayload

        payload = UpdatePublishDepartmentsPayload.model_validate({})
        assert payload.department_ids == []

    def test_with_department_ids(self):
        from controllers.console.app.publish_department import UpdatePublishDepartmentsPayload

        payload = UpdatePublishDepartmentsPayload.model_validate({"department_ids": ["d1", "d2"]})
        assert payload.department_ids == ["d1", "d2"]


class TestPublishDepartmentCrossDept403:
    def test_cross_dept_editor_403(self, monkeypatch):
        app_model = _make_app(department_id="d_other")
        user = _make_user(user_id="u2", is_admin_or_owner=False)
        _patch_db_and_auth(monkeypatch, app_model, user)

        from services.department_service import DepartmentService

        with patch.object(
            DepartmentService,
            "assert_department_access",
            side_effect=DepartmentPermissionDeniedError("无权访问该资源"),
        ):

            @wraps_module.get_app_model
            def handler(app_model):
                return "ok"

            with pytest.raises(Forbidden):
                handler(app_id="app1")

    def test_admin_passes_guard(self, monkeypatch):
        app_model = _make_app(department_id="d_other")
        user = _make_user(is_admin_or_owner=True)
        _patch_db_and_auth(monkeypatch, app_model, user)

        from services.department_service import DepartmentService

        with patch.object(DepartmentService, "assert_department_access", return_value=None):

            @wraps_module.get_app_model
            def handler(app_model):
                return app_model.id

            assert handler(app_id="app1") == "app1"


class TestDeleteDepartmentPublishCheck:
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_delete_blocked_by_publish_target(self, mock_db, mock_audit):
        from services.department_service import DepartmentService
        from services.errors.department import DepartmentValidationError

        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = MagicMock()
        dept.id = "d1"
        dept.is_default = False

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()

            if query_calls[0] == 1:
                mock_f.first.return_value = dept
            else:
                is_publish_check = query_calls[0] == 6
                mock_f.count.return_value = 1 if is_publish_check else 0

            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with pytest.raises(DepartmentValidationError, match="请先取消发布"):
            DepartmentService.delete_department(tenant_id="t1", department_id="d1", operator_id="u1")


class TestDeleteAppCascade:
    @patch("services.app_service.remove_app_and_related_data_task")
    @patch("services.app_service.BillingService")
    @patch("services.app_service.EnterpriseService")
    @patch("services.app_service.FeatureService")
    @patch("services.app_service.app_was_deleted")
    @patch("services.app_service.db")
    def test_delete_app_cleans_publish_records(self, mock_db, mock_event, mock_feat, mock_ent, mock_bill, mock_task):
        from services.app_service import AppService

        mock_session = MagicMock()
        mock_db.session = mock_session

        mock_feat.get_system_features.return_value = MagicMock(
            webapp_auth=MagicMock(enabled=False)
        )

        app = _make_app()
        svc = AppService()
        svc.delete_app(app)

        mock_session.execute.assert_called_once()
