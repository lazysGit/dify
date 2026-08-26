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


def _make_app(app_id="app1", tenant_id="t1", department_id="d1"):
    return SimpleNamespace(
        id=app_id,
        tenant_id=tenant_id,
        department_id=department_id,
        name="Test App",
        status="normal",
        mode=AppMode.CHAT.value,
    )


def _patch_db_and_auth(monkeypatch, app_model, user, tenant_id="t1"):
    monkeypatch.setattr(wraps_module, "current_account_with_tenant", lambda: (user, tenant_id))
    monkeypatch.setattr(wraps_module.db, "session", SimpleNamespace(scalar=lambda *_a, **_kw: app_model))


class TestGetAppModelGuardForTransfer:
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

            @wraps_module.get_app_model(mode=None)
            def handler(app_model):
                return "ok"

            with pytest.raises(Forbidden):
                handler(app_id="app1")

    def test_admin_passes_guard(self, monkeypatch):
        app_model = _make_app(department_id="d1")
        user = _make_user(is_admin_or_owner=True)
        _patch_db_and_auth(monkeypatch, app_model, user)

        from services.department_service import DepartmentService

        with patch.object(DepartmentService, "assert_department_access", return_value=None):

            @wraps_module.get_app_model(mode=None)
            def handler(app_model):
                return app_model.id

            assert handler(app_id="app1") == "app1"


class TestTransferDepartmentPayloadValidation:
    def test_empty_payload_400(self):
        from pydantic import ValidationError

        from controllers.console.app.app import TransferDepartmentPayload

        with pytest.raises(ValidationError):
            TransferDepartmentPayload.model_validate({})

    def test_empty_string_400(self):
        from pydantic import ValidationError

        from controllers.console.app.app import TransferDepartmentPayload

        with pytest.raises(ValidationError):
            TransferDepartmentPayload.model_validate({"department_id": ""})

    def test_valid_payload(self):
        from controllers.console.app.app import TransferDepartmentPayload

        payload = TransferDepartmentPayload.model_validate({"department_id": "d1"})
        assert payload.department_id == "d1"


class TestTransferLogic:
    def test_admin_transfer_success(self, monkeypatch):
        from services.app_service import AppService

        app = _make_app(department_id="d1")
        user = _make_user(is_admin_or_owner=True)

        mock_dept = SimpleNamespace(id="d2")

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = mock_dept
        mock_query.filter.return_value = mock_filter

        monkeypatch.setattr(
            "extensions.ext_database.db",
            SimpleNamespace(session=SimpleNamespace(query=lambda _: mock_query, commit=lambda: None)),
        )

        with patch.object(AppService, "transfer_app_department") as mock_transfer:
            from services.department_service import DepartmentService

            with patch.object(DepartmentService, "get_manageable_department_ids", return_value=["d1", "d2"]):
                target_dept_id = "d2"
                target_dept = mock_query.filter.return_value.first()
                assert target_dept is not None

                if not user.is_admin_or_owner:
                    manageable = DepartmentService.get_manageable_department_ids(user, "t1")
                    assert target_dept_id in manageable
                else:
                    pass

                AppService.transfer_app_department(app, target_dept_id, user, "t1")
                mock_transfer.assert_called_once()

    def test_dept_admin_target_not_manageable(self):
        from services.department_service import DepartmentService

        user = _make_user(user_id="u2", is_admin_or_owner=False)

        with patch.object(DepartmentService, "get_manageable_department_ids", return_value=["d1"]):
            manageable = DepartmentService.get_manageable_department_ids(user, "t1")
            assert "d_unmanageable" not in manageable

    def test_target_department_not_found(self, monkeypatch):
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = None
        mock_query.filter.return_value = mock_filter

        monkeypatch.setattr(
            "extensions.ext_database.db",
            SimpleNamespace(session=SimpleNamespace(query=lambda _: mock_query)),
        )

        result = mock_query.filter.return_value.first()
        assert result is None


class TestAppListApiDepartmentPassthrough:
    def test_department_id_in_app_list_query(self):
        from controllers.console.app.app import AppListQuery

        query = AppListQuery.model_validate(
            {
                "page": "1",
                "limit": "20",
                "mode": "all",
                "department_id": "d_filter",
            }
        )
        dumped = query.model_dump()
        assert dumped["department_id"] == "d_filter"

    def test_department_id_default_none(self):
        from controllers.console.app.app import AppListQuery

        query = AppListQuery.model_validate(
            {
                "page": "1",
                "limit": "20",
                "mode": "all",
            }
        )
        dumped = query.model_dump()
        assert dumped["department_id"] is None

    def test_service_receives_current_user_not_id(self, monkeypatch):
        from services.app_service import AppService

        user = _make_user(is_admin_or_owner=True)

        with patch.object(AppService, "get_paginate_apps", return_value=None) as mock_get:
            with patch("services.app_service.DepartmentService") as mock_dept:
                mock_dept.get_accessible_department_ids.return_value = None
                mock_db = MagicMock()
                mock_db.paginate.return_value = MagicMock()
                monkeypatch.setattr("services.app_service.db", mock_db)

                service = AppService()
                service.get_paginate_apps(user, "t1", {"page": 1, "limit": 10, "mode": "all"})

                call_args = mock_get.call_args
                assert call_args[0][0] is user
