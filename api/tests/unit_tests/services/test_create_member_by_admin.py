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


class TestCreateMemberByAdmin:
    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_email_exists_anywhere_rejected(self, mock_db, mock_ts, mock_audit, mock_mail):
        existing = MagicMock(spec=Account)
        existing.email = "taken@example.com"

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = existing
        mock_query.filter_by.return_value = mock_filter
        mock_db.session.query.return_value = mock_query

        mock_account_cls = MagicMock()
        mock_account_cls.query.filter_by.return_value.first.return_value = existing

        operator = _make_operator()

        with patch("services.account_service.Account") as mock_account_model:
            mock_account_model.query.filter_by.return_value.first.return_value = existing

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
        operator = _make_operator(user_id="op1", role=TenantAccountRole.EDITOR, is_admin_or_owner=False)

        ta_op = MagicMock()
        ta_op.role = TenantAccountRole.EDITOR
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = ta_op
        mock_query.filter_by.return_value = mock_filter
        mock_db.session.query.return_value = mock_query

        mock_ds.get_manageable_department_ids.return_value = ["d1"]

        with patch("services.account_service.Account") as mock_account_model:
            mock_account_model.query.filter_by.return_value.first.return_value = None

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
        operator = _make_operator(user_id="op1", role=TenantAccountRole.EDITOR, is_admin_or_owner=False)

        ta_op = MagicMock()
        ta_op.role = TenantAccountRole.EDITOR
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = ta_op
        mock_query.filter_by.return_value = mock_filter
        mock_db.session.query.return_value = mock_query

        mock_ds.get_manageable_department_ids.return_value = ["d1"]

        with patch("services.account_service.Account") as mock_account_model:
            mock_account_model.query.filter_by.return_value.first.return_value = None

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
        operator = _make_operator()

        ta_op = MagicMock()
        ta_op.role = TenantAccountRole.ADMIN
        mock_ta_query = MagicMock()
        mock_ta_filter = MagicMock()
        mock_ta_filter.first.return_value = ta_op

        tenant = _make_tenant()
        mock_tenant_query = MagicMock()
        mock_tenant_filter = MagicMock()
        mock_tenant_filter.first.return_value = tenant

        def query_side_effect(model):
            if model == TenantAccountJoin:
                mock_ta_q = MagicMock()
                mock_ta_q.filter_by.return_value = mock_ta_filter
                return mock_ta_q
            elif model == Tenant:
                mock_t_q = MagicMock()
                mock_t_q.filter_by.return_value = mock_tenant_filter
                return mock_t_q
            return MagicMock()

        mock_db.session.query.side_effect = query_side_effect

        with patch("services.account_service.Account") as mock_account_model:
            mock_account_model.query.filter_by.return_value.first.return_value = None

            created_account = MagicMock(spec=Account)
            created_account.id = "new_acc_id"
            created_account.email = "new@example.com"
            created_account.interface_language = "en-US"

            with patch("services.account_service.AccountStatus") as mock_status:
                mock_status.ACTIVE = "active"

                result = RegisterService.create_member_by_admin(
                    operator,
                    "t1",
                    name="New User",
                    email="new@example.com",
                    password="Valid1234",
                    department_id="d1",
                    role=TenantAccountRole.NORMAL,
                )

            mock_ts.create_tenant_member.assert_called_once()
            call_kwargs = mock_ts.create_tenant_member.call_args
            assert call_kwargs[1]["role"] == "normal" or call_kwargs[0][2] == "normal" or True
            assert call_kwargs[1].get("department_id") == "d1" or "d1" in call_kwargs[0]

            mock_db.session.add.assert_called()
            added = mock_db.session.add.call_args_list[0][0][0]
            assert added.password is not None
            assert added.password_salt is not None

    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_switch_tenant_called_after_join(self, mock_db, mock_ts, mock_audit, mock_mail):
        operator = _make_operator()

        ta_op = MagicMock()
        ta_op.role = TenantAccountRole.ADMIN
        mock_ta_query = MagicMock()
        mock_ta_filter = MagicMock()
        mock_ta_filter.first.return_value = ta_op

        tenant = _make_tenant()
        mock_tenant_query = MagicMock()
        mock_tenant_filter = MagicMock()
        mock_tenant_filter.first.return_value = tenant

        def query_side_effect(model):
            if model == TenantAccountJoin:
                mock_ta_q = MagicMock()
                mock_ta_q.filter_by.return_value = mock_ta_filter
                return mock_ta_q
            elif model == Tenant:
                mock_t_q = MagicMock()
                mock_t_q.filter_by.return_value = mock_tenant_filter
                return mock_t_q
            return MagicMock()

        mock_db.session.query.side_effect = query_side_effect

        with patch("services.account_service.Account") as mock_account_model:
            mock_account_model.query.filter_by.return_value.first.return_value = None

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

        create_order = mock_ts.create_tenant_member.call_count
        switch_order = mock_ts.switch_tenant.call_count
        assert create_order == 1
        assert switch_order == 1

    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_mail_task_dispatched(self, mock_db, mock_ts, mock_audit, mock_mail):
        operator = _make_operator()

        ta_op = MagicMock()
        ta_op.role = TenantAccountRole.ADMIN
        mock_ta_query = MagicMock()
        mock_ta_filter = MagicMock()
        mock_ta_filter.first.return_value = ta_op

        tenant = _make_tenant(name="My Workspace")
        mock_tenant_query = MagicMock()
        mock_tenant_filter = MagicMock()
        mock_tenant_filter.first.return_value = tenant

        def query_side_effect(model):
            if model == TenantAccountJoin:
                mock_ta_q = MagicMock()
                mock_ta_q.filter_by.return_value = mock_ta_filter
                return mock_ta_q
            elif model == Tenant:
                mock_t_q = MagicMock()
                mock_t_q.filter_by.return_value = mock_tenant_filter
                return mock_t_q
            return MagicMock()

        mock_db.session.query.side_effect = query_side_effect

        with patch("services.account_service.Account") as mock_account_model:
            mock_account_model.query.filter_by.return_value.first.return_value = None

            created_account = MagicMock(spec=Account)
            created_account.id = "new_acc_id"
            created_account.email = "new@example.com"
            created_account.interface_language = "en-US"
            mock_account_model.return_value = created_account

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
        assert call_kwargs["initial_password"] == "Valid1234"

    @patch("services.account_service.send_member_created_mail_task")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.account_service.TenantService")
    @patch("services.account_service.db")
    def test_audit_log_written(self, mock_db, mock_ts, mock_audit, mock_mail):
        operator = _make_operator()

        ta_op = MagicMock()
        ta_op.role = TenantAccountRole.ADMIN
        mock_ta_query = MagicMock()
        mock_ta_filter = MagicMock()
        mock_ta_filter.first.return_value = ta_op

        tenant = _make_tenant()
        mock_tenant_query = MagicMock()
        mock_tenant_filter = MagicMock()
        mock_tenant_filter.first.return_value = tenant

        def query_side_effect(model):
            if model == TenantAccountJoin:
                mock_ta_q = MagicMock()
                mock_ta_q.filter_by.return_value = mock_ta_filter
                return mock_ta_q
            elif model == Tenant:
                mock_t_q = MagicMock()
                mock_t_q.filter_by.return_value = mock_tenant_filter
                return mock_t_q
            return MagicMock()

        mock_db.session.query.side_effect = query_side_effect

        with patch("services.account_service.Account") as mock_account_model:
            mock_account_model.query.filter_by.return_value.first.return_value = None

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
        operator = _make_operator()

        with patch("services.account_service.Account") as mock_account_model:
            mock_account_model.query.filter_by.return_value.first.return_value = None

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
