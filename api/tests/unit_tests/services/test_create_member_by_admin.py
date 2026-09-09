from unittest.mock import MagicMock, patch

import pytest

from models.account import Account, Tenant, TenantAccountJoin, TenantAccountRole
from services.account_service import RegisterService
from services.errors.account import AccountEmailAlreadyInUseError, NoPermissionError


def _make_operator(user_id="op1", role=TenantAccountRole.ADMIN, is_admin_or_owner=True):
    op = MagicMock(spec=Account)
    op.id = user_id
    op.name = "Operator"
    op.email = "operator@example.com"
    op.interface_language = "en-US"
    op.role = role
    op.is_admin_or_owner = is_admin_or_owner
    return op


def _make_tenant(tenant_id="t1", name="Test Workspace"):
    t = MagicMock(spec=Tenant)
    t.id = tenant_id
    t.name = name
    return t


def _mock_db_queries(
    mock_db,
    *,
    account_exists=None,
    ta_join_role=TenantAccountRole.ADMIN,
    tenant_name="Test Workspace",
):
    """Model-keyed db.session.query mocks matching create_member_by_admin's real queries:
    Account (email check), TenantAccountJoin (_operator_is_tenant_admin), Tenant (fetch)."""
    ta_op = MagicMock()
    ta_op.role = ta_join_role
    tenant = _make_tenant(name=tenant_name)

    def side_effect(model):
        q = MagicMock()
        if model is Account:
            q.filter_by.return_value.first.return_value = account_exists
        elif model is TenantAccountJoin:
            q.filter_by.return_value.first.return_value = ta_op
        elif model is Tenant:
            q.filter_by.return_value.first.return_value = tenant
        else:
            q.filter_by.return_value.first.return_value = None
        return q

    mock_db.session.query.side_effect = side_effect
    return tenant


MAIL_DECORATORS = [
    patch("services.account_service.send_member_created_mail_task"),
]


class TestCreateMemberByAdmin:
    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_email_exists_anywhere_rejected(self, mock_db, mock_ts, mock_audit, mock_mail):
        existing = MagicMock(spec=Account)
        existing.email = "taken@example.com"
        _mock_db_queries(mock_db, account_exists=existing)

        operator = _make_operator()

        with pytest.raises(AccountEmailAlreadyInUseError):
            RegisterService.create_member_by_admin(
                operator,
                "t1",
                name="New",
                email="taken@example.com",
                password="Valid1234",
                department_id="d1",
                role=TenantAccountRole.NORMAL,
            )

    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.DepartmentService")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_dept_admin_cannot_create_admin_role(self, mock_db, mock_ts, mock_ds, mock_audit, mock_mail):
        _mock_db_queries(mock_db, ta_join_role=TenantAccountRole.EDITOR)
        mock_ds.get_manageable_department_ids.return_value = ["d1"]

        operator = _make_operator(user_id="op1", role=TenantAccountRole.EDITOR, is_admin_or_owner=False)

        with pytest.raises(NoPermissionError):
            RegisterService.create_member_by_admin(
                operator,
                "t1",
                name="New",
                email="new@example.com",
                password="Valid1234",
                department_id="d1",
                role=TenantAccountRole.ADMIN,
            )

    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.DepartmentService")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_dept_admin_scope_check(self, mock_db, mock_ts, mock_ds, mock_audit, mock_mail):
        _mock_db_queries(mock_db, ta_join_role=TenantAccountRole.EDITOR)
        mock_ds.get_manageable_department_ids.return_value = ["d1"]

        operator = _make_operator(user_id="op1", role=TenantAccountRole.EDITOR, is_admin_or_owner=False)

        with pytest.raises(NoPermissionError):
            RegisterService.create_member_by_admin(
                operator,
                "t1",
                name="New",
                email="new@example.com",
                password="Valid1234",
                department_id="d_out_of_scope",
                role=TenantAccountRole.NORMAL,
            )

    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_password_hashed_and_join_created(self, mock_db, mock_ts, mock_audit, mock_mail):
        _mock_db_queries(mock_db)
        operator = _make_operator()

        result = RegisterService.create_member_by_admin(
            operator,
            "t1",
            name="New User",
            email="new@example.com",
            password="Valid1234",
            department_id="d1",
            role=TenantAccountRole.NORMAL,
        )

        assert result.email == "new@example.com"
        assert result.password is not None
        assert result.password_salt is not None

        mock_ts.create_tenant_member.assert_called_once()
        call_kwargs = mock_ts.create_tenant_member.call_args[1]
        assert call_kwargs["department_id"] == "d1"
        assert call_kwargs["role"] in ("normal", TenantAccountRole.NORMAL)

        mock_db.session.add.assert_called_once_with(result)

    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_switch_tenant_called_after_join(self, mock_db, mock_ts, mock_audit, mock_mail):
        _mock_db_queries(mock_db)
        operator = _make_operator()

        RegisterService.create_member_by_admin(
            operator,
            "t1",
            name="New User",
            email="new@example.com",
            password="Valid1234",
            department_id="d1",
            role=TenantAccountRole.NORMAL,
        )

        mock_ts.create_tenant_member.assert_called_once()
        mock_ts.switch_tenant.assert_called_once()
        switch_args = mock_ts.switch_tenant.call_args
        assert switch_args[0][1] == "t1" or switch_args[1].get("tenant_id") == "t1"

    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_mail_task_dispatched(self, mock_db, mock_ts, mock_audit, mock_mail):
        _mock_db_queries(mock_db, tenant_name="My Workspace")
        operator = _make_operator()

        RegisterService.create_member_by_admin(
            operator,
            "t1",
            name="New User",
            email="new@example.com",
            password="Valid1234",
            department_id="d1",
            role=TenantAccountRole.NORMAL,
        )

        mock_mail.delay.assert_called_once()
        call_kwargs = mock_mail.delay.call_args[1]
        assert call_kwargs["to"] == "new@example.com"
        assert call_kwargs["workspace_name"] == "My Workspace"
        assert call_kwargs["member_name"] == "New User"
        # R10: initial password travels via task kwargs only for the email body; never logged by service
        assert call_kwargs["initial_password"] == "Valid1234"

    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_audit_log_written(self, mock_db, mock_ts, mock_audit, mock_mail):
        _mock_db_queries(mock_db)
        operator = _make_operator()

        RegisterService.create_member_by_admin(
            operator,
            "t1",
            name="New User",
            email="new@example.com",
            password="Valid1234",
            department_id="d1",
            role=TenantAccountRole.NORMAL,
        )

        mock_audit.log.assert_called_once()
        audit_kwargs = mock_audit.log.call_args[1]
        assert audit_kwargs["tenant_id"] == "t1"
        assert audit_kwargs["operator_id"] == "op1"
        assert audit_kwargs["action"] == "create_member"
        assert audit_kwargs["content"]["member_email"] == "new@example.com"
        assert audit_kwargs["content"]["role"] == "normal"
        assert audit_kwargs["content"]["department_id"] == "d1"

    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_weak_password_rejected(self, mock_db, mock_ts, mock_audit, mock_mail):
        _mock_db_queries(mock_db)
        operator = _make_operator()

        with pytest.raises(ValueError, match="Password must contain"):
            RegisterService.create_member_by_admin(
                operator,
                "t1",
                name="New",
                email="new@example.com",
                password="weak",
                department_id="d1",
                role=TenantAccountRole.NORMAL,
            )

    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_empty_password_falls_back_to_default(self, mock_db, mock_ts, mock_audit, mock_mail):
        _mock_db_queries(mock_db)
        operator = _make_operator()

        with patch("services.account_service.dify_config.DEFAULT_MEMBER_PASSWORD", "Dify1234"):
            RegisterService.create_member_by_admin(
                operator,
                "t1",
                name="New User",
                email="new@example.com",
                password="",
                department_id="d1",
                role=TenantAccountRole.NORMAL,
            )

        mock_mail.delay.assert_called_once()
        assert mock_mail.delay.call_args.kwargs["initial_password"] == "Dify1234"
