from unittest.mock import MagicMock, patch

import pytest
from werkzeug.exceptions import HTTPException

from controllers.console.workspace.department import (
    DepartmentAdminApi,
    DepartmentApi,
    DepartmentListApi,
    DepartmentMemberApi,
    DepartmentOperationLogApi,
)
from services.errors.department import (
    DepartmentNotFoundError,
    DepartmentPermissionDeniedError,
    DepartmentValidationError,
)


def unwrap(func):
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    return func


class TestDepartmentListApi:
    def test_get_success(self, app):
        api = DepartmentListApi()
        method = unwrap(api.get)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        depts = [{"id": "d1", "name": "Default", "parent_id": None}]

        with (
            app.test_request_context("/"),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.get_departments_with_counts",
                return_value=depts,
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.build_tree",
                return_value=depts,
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.get_manageable_department_ids",
                return_value=["d1"],
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.is_department_admin",
                return_value=True,
            ),
        ):
            result = method(api)

        assert "departments" in result
        assert "tree" in result
        assert "manageable_department_ids" in result
        assert "is_department_admin" in result
        assert result["is_department_admin"] is True

    def test_post_create_success(self, app):
        api = DepartmentListApi()
        method = unwrap(api.post)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        dept = MagicMock()
        dept.id = "d2"
        dept.name = "Engineering"
        dept.parent_id = None
        dept.level = 1
        dept.path = "/t1/d2"
        dept.description = None
        dept.is_default = False

        payload = {"name": "Engineering"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.create_department",
                return_value=dept,
            ),
        ):
            result, status = method(api)

        assert status == 201
        assert result["id"] == "d2"
        assert result["name"] == "Engineering"

    def test_post_non_admin_403(self, app):
        api = DepartmentListApi()
        method = unwrap(api.post)

        user = MagicMock(id="u1", is_admin_or_owner=False)
        payload = {"name": "Engineering"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api)
            assert exc_info.value.code == 403

    def test_post_duplicate_name_400(self, app):
        api = DepartmentListApi()
        method = unwrap(api.post)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        payload = {"name": "Engineering"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.create_department",
                side_effect=DepartmentValidationError("同级下已存在同名部门"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api)
            assert exc_info.value.code == 400


class TestDepartmentApi:
    def test_put_success(self, app):
        api = DepartmentApi()
        method = unwrap(api.put)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        dept = MagicMock()
        dept.id = "d1"
        dept.name = "Updated"
        dept.parent_id = None
        dept.level = 1
        dept.path = "/t1/d1"
        dept.description = "new desc"
        dept.is_default = False

        payload = {"name": "Updated", "description": "new desc"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.update_department",
                return_value=dept,
            ),
        ):
            result = method(api, "d1")

        assert result["name"] == "Updated"

    def test_put_non_admin_403(self, app):
        api = DepartmentApi()
        method = unwrap(api.put)

        user = MagicMock(id="u1", is_admin_or_owner=False)
        payload = {"name": "Updated"}

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

    def test_delete_default_department_400(self, app):
        api = DepartmentApi()
        method = unwrap(api.delete)

        user = MagicMock(id="u1", is_admin_or_owner=True)

        with (
            app.test_request_context("/"),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.delete_department",
                side_effect=DepartmentValidationError("默认部门不能删除"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api, "d1")
            assert exc_info.value.code == 400


class TestDepartmentMemberApi:
    def test_get_own_dept_member_200(self, app):
        api = DepartmentMemberApi()
        method = unwrap(api.get)

        user = MagicMock(id="u1", is_admin_or_owner=False)
        members = [{"account_id": "u1", "name": "User", "email": "u@test.com"}]

        with (
            app.test_request_context("/"),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.assert_department_access",
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.get_department_members",
                return_value=members,
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.get_manageable_department_ids",
                return_value=["d1"],
            ),
        ):
            result = method(api, "d1")

        assert "members" in result
        assert "can_set_admin" in result

    def test_get_other_dept_member_403(self, app):
        api = DepartmentMemberApi()
        method = unwrap(api.get)

        user = MagicMock(id="u1", is_admin_or_owner=False)

        with (
            app.test_request_context("/"),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.assert_department_access",
                side_effect=DepartmentPermissionDeniedError("无权访问该资源"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api, "d2")
            assert exc_info.value.code == 403

    def test_put_owner_pass(self, app):
        api = DepartmentMemberApi()
        method = unwrap(api.put)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        payload = {"member_id": "u2", "department_id": "d2"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.get_accessible_department_ids",
                return_value=None,
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.is_department_admin",
                return_value=False,
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.move_member",
            ),
        ):
            result = method(api, "d1")

        assert result["result"] == "success"

    def test_put_in_scope_dept_admin_pass(self, app):
        api = DepartmentMemberApi()
        method = unwrap(api.put)

        user = MagicMock(id="u1", is_admin_or_owner=False)
        payload = {"member_id": "u2", "department_id": "d1"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.get_accessible_department_ids",
                return_value=["d1"],
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.is_department_admin",
                return_value=True,
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.get_user_department_id",
                return_value="d1",
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.move_member",
            ),
        ):
            result = method(api, "d1")

        assert result["result"] == "success"

    def test_put_out_of_scope_403(self, app):
        api = DepartmentMemberApi()
        method = unwrap(api.put)

        user = MagicMock(id="u1", is_admin_or_owner=False)
        payload = {"member_id": "u2", "department_id": "d2"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.get_accessible_department_ids",
                return_value=["d1"],
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.is_department_admin",
                return_value=True,
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api, "d1")
            assert exc_info.value.code == 403

    def test_put_dept_admin_self_move_400(self, app):
        api = DepartmentMemberApi()
        method = unwrap(api.put)

        user = MagicMock(id="u1", is_admin_or_owner=False)
        payload = {"member_id": "u1", "department_id": "d1"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.get_accessible_department_ids",
                return_value=["d1"],
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.is_department_admin",
                return_value=True,
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.get_user_department_id",
                return_value="d1",
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api, "d1")
            assert exc_info.value.code == 400


class TestDepartmentAdminApi:
    def test_post_success(self, app):
        api = DepartmentAdminApi()
        method = unwrap(api.post)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        payload = {"member_id": "u2"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.set_department_admin",
            ),
        ):
            result = method(api, "d1")

        assert result["result"] == "success"

    def test_delete_success(self, app):
        api = DepartmentAdminApi()
        method = unwrap(api.delete)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        payload = {"member_id": "u2"}

        with (
            app.test_request_context("/", json=payload),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentService.remove_department_admin",
            ),
        ):
            result = method(api, "d1")

        assert result["result"] == "success"

    def test_post_non_owner_403(self, app):
        api = DepartmentAdminApi()
        method = unwrap(api.post)

        user = MagicMock(id="u1", is_admin_or_owner=False)
        payload = {"member_id": "u2"}

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


class TestDepartmentOperationLogApi:
    def test_get_success(self, app):
        api = DepartmentOperationLogApi()
        method = unwrap(api.get)

        user = MagicMock(id="u1", is_admin_or_owner=True)
        log = MagicMock(
            id="log1",
            action="create_department",
            content={"department_id": "d1"},
            created_at=None,
            created_ip="127.0.0.1",
        )

        with (
            app.test_request_context("/?limit=10"),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
            patch(
                "controllers.console.workspace.department.DepartmentAuditLog.query",
                return_value=[log],
            ),
        ):
            result = method(api, "d1")

        assert "logs" in result
        assert len(result["logs"]) == 1
        assert result["logs"][0]["action"] == "create_department"

    def test_get_non_admin_403(self, app):
        api = DepartmentOperationLogApi()
        method = unwrap(api.get)

        user = MagicMock(id="u1", is_admin_or_owner=False)

        with (
            app.test_request_context("/"),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api, "d1")
            assert exc_info.value.code == 403

    def test_get_limit_over_100_400(self, app):
        api = DepartmentOperationLogApi()
        method = unwrap(api.get)

        user = MagicMock(id="u1", is_admin_or_owner=True)

        with (
            app.test_request_context("/?limit=200"),
            patch(
                "controllers.console.workspace.department.current_account_with_tenant",
                return_value=(user, "t1"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                method(api, "d1")
            assert exc_info.value.code == 400


class TestCreateTenantHook:
    def test_create_tenant_hook_idempotent(self, app):
        from services.account_service import TenantService

        with (
            app.test_request_context("/"),
            patch("services.account_service.FeatureService") as fs_mock,
            patch("services.account_service.db") as db_mock,
            patch("services.account_service.TenantPluginAutoUpgradeStrategy"),
            patch("services.account_service.generate_key_pair"),
            patch("services.credit_pool_service.CreditPoolService.create_default_pool"),
            patch("services.department_service.DepartmentService.create_default_department") as create_dept_mock,
        ):
            fs_mock.get_system_features.return_value.is_allow_create_workspace = True
            tenant_mock = MagicMock()
            tenant_mock.id = "t1"
            db_mock.session.add = MagicMock()
            db_mock.session.commit = MagicMock()

            with patch("services.account_service.Tenant", return_value=tenant_mock):
                TenantService.create_tenant(name="Test")

            create_dept_mock.assert_called_once_with("t1", "t1")


class TestCreateTenantMemberHook:
    def test_no_default_dept_lazy_create(self, app):
        from services.account_service import TenantService

        tenant = MagicMock(id="t1")
        account = MagicMock(id="u1")

        with (
            app.test_request_context("/"),
            patch("services.account_service.db") as db_mock,
            patch("services.account_service.dify_config") as config_mock,
            patch("services.account_service.BillingService"),
            patch("services.department_service.DepartmentService.get_default_department") as get_dept_mock,
            patch("services.department_service.DepartmentService.create_default_department") as create_dept_mock,
        ):
            config_mock.BILLING_ENABLED = False
            db_mock.session.query.return_value.filter_by.return_value.first.return_value = None
            db_mock.session.add = MagicMock()
            db_mock.session.commit = MagicMock()

            get_dept_mock.side_effect = DepartmentNotFoundError("Default department not found")
            default_dept = MagicMock()
            default_dept.id = "default_d1"
            create_dept_mock.return_value = default_dept

            with patch("services.account_service.TenantAccountJoin") as join_cls:
                join_mock = MagicMock()
                join_cls.return_value = join_mock

                TenantService.create_tenant_member(tenant, account, role="normal")

            create_dept_mock.assert_called_once_with("t1", "u1")

    def test_explicit_department_id_priority(self, app):
        from services.account_service import TenantService

        tenant = MagicMock(id="t1")
        account = MagicMock(id="u1")

        with (
            app.test_request_context("/"),
            patch("services.account_service.db") as db_mock,
            patch("services.account_service.dify_config") as config_mock,
            patch("services.account_service.BillingService"),
            patch("services.department_service.DepartmentService.get_default_department") as get_dept_mock,
            patch("services.department_service.DepartmentService.create_default_department") as create_dept_mock,
        ):
            config_mock.BILLING_ENABLED = False
            db_mock.session.query.return_value.filter_by.return_value.first.return_value = None
            db_mock.session.add = MagicMock()
            db_mock.session.commit = MagicMock()

            existing_dept = MagicMock()
            existing_dept.id = "explicit_d1"
            get_dept_mock.return_value = existing_dept

            with patch("services.account_service.TenantAccountJoin") as join_cls:
                join_mock = MagicMock()
                join_cls.return_value = join_mock

                TenantService.create_tenant_member(tenant, account, role="normal", department_id="explicit_d1")

            create_dept_mock.assert_not_called()
