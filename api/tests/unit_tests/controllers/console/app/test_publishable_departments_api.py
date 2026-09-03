"""Unit tests for the publishable-departments list API (plan Task 8)."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from werkzeug.exceptions import Forbidden

from controllers.console.app.publish_department import AppPublishableDepartmentsApi


def _make_dept(dept_id, name, path):
    return SimpleNamespace(id=dept_id, name=name, path=path)


DEPARTMENTS = [
    _make_dept("d1", "技术部", "/t1/d1"),
    _make_dept("d1_sub", "前端组", "/t1/d1/d1_sub"),
    _make_dept("d2", "销售部", "/t1/d2"),
]


def unwrap(func):
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    return func


class TestAppPublishableDepartmentsApi:
    def _invoke(self, app, user, accessible, own_dept_id="d1"):
        api = AppPublishableDepartmentsApi()
        method = unwrap(api.get)
        app_model = SimpleNamespace(id="app1", tenant_id="t1")

        with (
            app.test_request_context("/"),
            patch(
                "controllers.console.app.publish_department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch("controllers.console.app.publish_department.DepartmentService") as mock_dept_svc,
            patch("controllers.console.app.publish_department.db") as mock_db,
        ):
            mock_dept_svc.get_accessible_department_ids.return_value = accessible
            mock_dept_svc.get_user_department_id.return_value = own_dept_id

            mock_query = MagicMock()
            mock_filter = MagicMock()
            mock_filter.all.return_value = DEPARTMENTS
            mock_query.filter.return_value = mock_filter
            mock_db.session.query.return_value = mock_query

            return method(api, app_model)

    def test_get_success_structure_for_dept_admin(self, app):
        user = SimpleNamespace(id="u_da", is_admin_or_owner=False)

        result, status = self._invoke(app, user, accessible=["d1", "d1_sub"])

        assert status == 200
        assert result["publish_scope"] == "department_and_subdepartments"
        assert result["can_publish_cross_department"] is True
        assert result["departments"] == [
            {"id": "d1", "name": "技术部", "is_own_department": True},
            {"id": "d1_sub", "name": "技术部 > 前端组", "is_own_department": False},
        ]

    def test_owner_gets_all_departments_with_all_scope(self, app):
        user = SimpleNamespace(id="u_owner", is_admin_or_owner=True)

        result, _ = self._invoke(app, user, accessible=None)

        assert result["publish_scope"] == "all"
        assert result["can_publish_cross_department"] is True
        assert [d["id"] for d in result["departments"]] == ["d1", "d1_sub", "d2"]

    def test_normal_user_gets_own_department_only(self, app):
        user = SimpleNamespace(id="u_normal", is_admin_or_owner=False)

        result, _ = self._invoke(app, user, accessible=["d1"])

        assert result["publish_scope"] == "own_department_only"
        assert result["can_publish_cross_department"] is False
        assert result["departments"] == [{"id": "d1", "name": "技术部", "is_own_department": True}]

    def test_user_without_department_gets_empty_list(self, app):
        user = SimpleNamespace(id="u_orphan", is_admin_or_owner=False)

        result, _ = self._invoke(app, user, accessible=[], own_dept_id=None)

        assert result["publish_scope"] == "own_department_only"
        assert result["can_publish_cross_department"] is False
        assert result["departments"] == []

    def test_missing_edit_permission_raises_403(self, app):
        from flask import g

        from controllers.console.wraps import edit_permission_required
        from models.account import Account

        @edit_permission_required
        def stub():
            return "ok"

        account = MagicMock(spec=Account)
        account.has_edit_permission = False

        with app.test_request_context("/"):
            # Bypass the login proxy: _get_user() returns g._login_user directly.
            g._login_user = account
            with pytest.raises(Forbidden):
                stub()
