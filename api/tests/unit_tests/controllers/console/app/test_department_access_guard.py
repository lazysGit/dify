from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import pytest
from werkzeug.exceptions import Forbidden

from controllers.console.app import wraps as wraps_module
from models.model import AppMode
from services.errors.department import DepartmentPermissionDeniedError


def _make_user(tenant_id: str = "t1", is_admin_or_owner: bool = False) -> SimpleNamespace:
    return SimpleNamespace(
        id="u1",
        current_tenant_id=tenant_id,
        is_admin_or_owner=is_admin_or_owner,
    )


def _make_app(
    app_id: str = "app-1",
    tenant_id: str = "t1",
    department_id: str | None = "dept-1",
) -> SimpleNamespace:
    return SimpleNamespace(
        id=app_id,
        mode=AppMode.CHAT.value,
        status="normal",
        tenant_id=tenant_id,
        department_id=department_id,
    )


def _patch_db_and_auth(monkeypatch: pytest.MonkeyPatch, app_model, user, tenant_id: str = "t1"):
    monkeypatch.setattr(wraps_module, "current_account_with_tenant", lambda: (user, tenant_id))
    monkeypatch.setattr(wraps_module.db, "session", SimpleNamespace(scalar=lambda *_a, **_kw: app_model))


class TestGetAppModelDepartmentGuard:
    def test_member_other_dept_forbidden(self, monkeypatch: pytest.MonkeyPatch) -> None:
        app_model = _make_app(department_id="dept-other")
        user = _make_user(is_admin_or_owner=False)
        _patch_db_and_auth(monkeypatch, app_model, user)

        from services.department_service import DepartmentService

        with patch.object(
            DepartmentService,
            "assert_department_access",
            side_effect=DepartmentPermissionDeniedError("无权访问该资源"),
        ):

            @wraps_module.get_app_model
            def handler(app_model):
                return app_model.id

            with pytest.raises(Forbidden):
                handler(app_id="app-1")

    def test_owner_passes(self, monkeypatch: pytest.MonkeyPatch) -> None:
        app_model = _make_app(department_id="dept-other")
        user = _make_user(is_admin_or_owner=True)
        _patch_db_and_auth(monkeypatch, app_model, user)

        from services.department_service import DepartmentService

        with patch.object(DepartmentService, "assert_department_access", return_value=None) as mock_check:

            @wraps_module.get_app_model
            def handler(app_model):
                return app_model.id

            assert handler(app_id="app-1") == "app-1"
            mock_check.assert_called_once()

    def test_null_department_id_uses_default(self, monkeypatch: pytest.MonkeyPatch) -> None:
        app_model = _make_app(department_id=None)
        user = _make_user(is_admin_or_owner=False)
        _patch_db_and_auth(monkeypatch, app_model, user)

        from services.department_service import DepartmentService

        with patch.object(DepartmentService, "assert_department_access", return_value=None) as mock_check:

            @wraps_module.get_app_model
            def handler(app_model):
                return app_model.id

            assert handler(app_id="app-1") == "app-1"
            mock_check.assert_called_once()
            call_args = mock_check.call_args
            assert call_args[0][2] is None

    def test_outside_accessible_dept_forbidden(self, monkeypatch: pytest.MonkeyPatch) -> None:
        app_model = _make_app(department_id="dept-x")
        user = _make_user(is_admin_or_owner=False)
        _patch_db_and_auth(monkeypatch, app_model, user)

        from services.department_service import DepartmentService

        with patch.object(
            DepartmentService,
            "assert_department_access",
            side_effect=DepartmentPermissionDeniedError("无权访问该资源"),
        ):

            @wraps_module.get_app_model
            def handler(app_model):
                return app_model.id

            with pytest.raises(Forbidden):
                handler(app_id="app-1")


class TestGetAppModelWithTrialDepartmentGuard:
    def test_cross_tenant_trial_skips_check(self, monkeypatch: pytest.MonkeyPatch) -> None:
        app_model = _make_app(tenant_id="t-trial", department_id="dept-trial")
        user = _make_user(tenant_id="t1", is_admin_or_owner=False)
        _patch_db_and_auth(monkeypatch, app_model, user, tenant_id="t1")

        from services.department_service import DepartmentService

        with patch.object(DepartmentService, "assert_department_access") as mock_check:

            @wraps_module.get_app_model_with_trial
            def handler(app_model):
                return app_model.id

            assert handler(app_id="app-1") == "app-1"
            mock_check.assert_not_called()

    def test_same_tenant_trial_still_checked(self, monkeypatch: pytest.MonkeyPatch) -> None:
        app_model = _make_app(tenant_id="t1", department_id="dept-other")
        user = _make_user(tenant_id="t1", is_admin_or_owner=False)
        _patch_db_and_auth(monkeypatch, app_model, user, tenant_id="t1")

        from services.department_service import DepartmentService

        with patch.object(
            DepartmentService,
            "assert_department_access",
            side_effect=DepartmentPermissionDeniedError("无权访问该资源"),
        ):

            @wraps_module.get_app_model_with_trial
            def handler(app_model):
                return app_model.id

            with pytest.raises(Forbidden):
                handler(app_id="app-1")
