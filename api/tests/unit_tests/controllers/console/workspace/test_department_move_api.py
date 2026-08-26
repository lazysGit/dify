from unittest.mock import MagicMock, patch

import pytest
from werkzeug.exceptions import HTTPException

from controllers.console.workspace.department import DepartmentMoveApi
from services.errors.department import DepartmentNotFoundError, DepartmentValidationError


def unwrap(func):
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    return func


class TestDepartmentMoveApi:
    def test_move_endpoint_200_admin(self, app):
        api = DepartmentMoveApi()
        method = unwrap(api.put)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        payload = {"parent_id": "d2"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.move_department",
            ),
        ):
            result = method(api, "d1")

        assert result["result"] == "success"

    def test_move_endpoint_403_non_admin(self, app):
        api = DepartmentMoveApi()
        method = unwrap(api.put)

        user = MagicMock(id="u1", is_admin_or_owner=False)
        payload = {"parent_id": "d2"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api, "d1")
            assert exc_info.value.code == 403

    def test_move_endpoint_400_payload(self, app):
        api = DepartmentMoveApi()
        method = unwrap(api.put)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        payload = {"parent_id": "d2"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.move_department",
                side_effect=DepartmentValidationError("不能将部门移动到其子孙部门下"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api, "d1")
            assert exc_info.value.code == 400

    def test_move_endpoint_404_not_found(self, app):
        api = DepartmentMoveApi()
        method = unwrap(api.put)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        payload = {"parent_id": "d2"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.move_department",
                side_effect=DepartmentNotFoundError("Department not found"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api, "d_nonexist")
            assert exc_info.value.code == 404

    def test_move_endpoint_null_parent(self, app):
        api = DepartmentMoveApi()
        method = unwrap(api.put)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        payload = {"parent_id": None}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.move_department",
            ) as mock_move,
        ):
            result = method(api, "d1")

        assert result["result"] == "success"
        mock_move.assert_called_once()
        call_kwargs = mock_move.call_args[1]
        assert call_kwargs["new_parent_id"] is None
