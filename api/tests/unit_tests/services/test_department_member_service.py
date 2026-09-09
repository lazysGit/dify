from unittest.mock import MagicMock, patch

import pytest

from models.account import Account, TenantAccountJoin, TenantAccountRole
from models.department import Department
from services.department_service import DepartmentService
from services.errors.department import (
    DepartmentNotFoundError,
    DepartmentPermissionDeniedError,
    DepartmentValidationError,
)


def _make_join(
    account_id="u1", tenant_id="t1", department_id="d1", role=TenantAccountRole.EDITOR, is_department_admin=False
):
    join = MagicMock(spec=TenantAccountJoin)
    join.account_id = account_id
    join.tenant_id = tenant_id
    join.department_id = department_id
    join.role = role
    join.is_department_admin = is_department_admin
    return join


def _make_account(account_id="u1", name="Test User", email="test@example.com", is_admin_or_owner=False):
    account = MagicMock(spec=Account)
    account.id = account_id
    account.name = name
    account.email = email
    account.is_admin_or_owner = is_admin_or_owner
    return account


def _make_dept(dept_id="d1", tenant_id="t1", name="Engineering"):
    dept = MagicMock(spec=Department)
    dept.id = dept_id
    dept.tenant_id = tenant_id
    dept.name = name
    return dept


class TestSetAdminRequiresMembership:
    @patch("services.department_service.db")
    def test_set_admin_requires_membership(self, mock_db):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept()
        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if query_calls[0] == 1:
                mock_f.first.return_value = dept
            else:
                mock_f.first.return_value = None
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with pytest.raises(DepartmentNotFoundError, match="Member not found in tenant"):
            DepartmentService.set_department_admin(
                tenant_id="t1", department_id="d1", member_account_id="u_nonexist", operator_id="op1"
            )


class TestSetAdminAllowsNormalRole:
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_set_admin_allows_normal_role(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept()
        join = _make_join(account_id="u1", department_id="d1", role=TenantAccountRole.NORMAL)

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if query_calls[0] == 1:
                mock_f.first.return_value = dept
            else:
                mock_f.first.return_value = join
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        DepartmentService.set_department_admin(
            tenant_id="t1", department_id="d1", member_account_id="u1", operator_id="op1"
        )

        assert join.is_department_admin is True
        mock_session.commit.assert_called()


class TestSetAdminRejectsDatasetOperatorRole:
    @patch("services.department_service.db")
    def test_set_admin_rejects_dataset_operator_role(self, mock_db):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept()
        join = _make_join(account_id="u1", department_id="d1", role=TenantAccountRole.DATASET_OPERATOR)

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if query_calls[0] == 1:
                mock_f.first.return_value = dept
            else:
                mock_f.first.return_value = join
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with pytest.raises(DepartmentValidationError, match="Only owner, admin, editor, or normal"):
            DepartmentService.set_department_admin(
                tenant_id="t1", department_id="d1", member_account_id="u1", operator_id="op1"
            )


class TestSetAdminRejectsMismatchedDepartment:
    @patch("services.department_service.db")
    def test_set_admin_rejects_mismatched_department(self, mock_db):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d2")
        join = _make_join(account_id="u1", department_id="d1", role=TenantAccountRole.EDITOR)

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if query_calls[0] == 1:
                mock_f.first.return_value = dept
            else:
                mock_f.first.return_value = join
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with pytest.raises(DepartmentValidationError, match="Member does not belong to this department"):
            DepartmentService.set_department_admin(
                tenant_id="t1", department_id="d2", member_account_id="u1", operator_id="op1"
            )


class TestMoveMemberByDeptAdminWithinScope:
    @patch("services.department_service.DepartmentService.revoke_department_admin_and_notify")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.DepartmentService.get_accessible_department_ids")
    @patch("services.department_service.db")
    def test_move_member_by_dept_admin_within_scope(self, mock_db, mock_accessible, mock_audit, mock_revoke):
        mock_session = MagicMock()
        mock_db.session = mock_session

        operator = _make_account(account_id="op1", is_admin_or_owner=False)
        target_dept = _make_dept(dept_id="d2")
        member_join = _make_join(account_id="u2", department_id="d1", is_department_admin=False)

        mock_accessible.return_value = ["d1", "d2"]

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if query_calls[0] == 1:
                mock_f.first.return_value = target_dept
            else:
                mock_f.with_for_update.return_value = mock_f
                mock_f.first.return_value = member_join
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with patch("services.department_service.DepartmentService.is_department_admin", return_value=True):
            DepartmentService.move_member(
                operator=operator,
                tenant_id="t1",
                member_account_id="u2",
                target_department_id="d2",
                operator_ip="1.2.3.4",
            )

        assert member_join.department_id == "d2"
        mock_session.commit.assert_called_once()
        mock_revoke.assert_not_called()


class TestMoveMemberCannotMoveSelf:
    @patch("services.department_service.DepartmentService.is_department_admin", return_value=True)
    @patch("services.department_service.DepartmentService.get_accessible_department_ids")
    @patch("services.department_service.db")
    def test_move_member_cannot_move_self(self, mock_db, mock_accessible, mock_is_admin):
        mock_session = MagicMock()
        mock_db.session = mock_session

        operator = _make_account(account_id="op1", is_admin_or_owner=False)
        target_dept = _make_dept(dept_id="d2")
        member_join = _make_join(account_id="op1", department_id="d1", is_department_admin=True)

        mock_accessible.return_value = ["d1", "d2"]

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if query_calls[0] == 1:
                mock_f.first.return_value = target_dept
            else:
                mock_f.with_for_update.return_value = mock_f
                mock_f.first.return_value = member_join
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with pytest.raises(DepartmentPermissionDeniedError, match="Department admin cannot move themselves"):
            DepartmentService.move_member(
                operator=operator,
                tenant_id="t1",
                member_account_id="op1",
                target_department_id="d2",
            )


class TestMoveMemberOutOfScopeDenied:
    @patch("services.department_service.DepartmentService.get_accessible_department_ids")
    @patch("services.department_service.db")
    def test_move_member_out_of_scope_denied(self, mock_db, mock_accessible):
        mock_session = MagicMock()
        mock_db.session = mock_session

        operator = _make_account(account_id="op1", is_admin_or_owner=False)
        target_dept = _make_dept(dept_id="d3")
        member_join = _make_join(account_id="u2", department_id="d1")

        mock_accessible.return_value = ["d1", "d2"]

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if query_calls[0] == 1:
                mock_f.first.return_value = target_dept
            else:
                mock_f.with_for_update.return_value = mock_f
                mock_f.first.return_value = member_join
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with pytest.raises(DepartmentPermissionDeniedError, match="No permission to move member to target department"):
            DepartmentService.move_member(
                operator=operator,
                tenant_id="t1",
                member_account_id="u2",
                target_department_id="d3",
            )


class TestMoveMemberRevokesAdminFlagAndNotifies:
    @patch("services.department_service.DepartmentService.revoke_department_admin_and_notify")
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.DepartmentService.get_accessible_department_ids")
    @patch("services.department_service.db")
    def test_move_member_revokes_admin_flag_and_notifies(self, mock_db, mock_accessible, mock_audit, mock_revoke):
        mock_session = MagicMock()
        mock_db.session = mock_session

        operator = _make_account(account_id="admin1", is_admin_or_owner=True)
        target_dept = _make_dept(dept_id="d2")
        member_join = _make_join(account_id="u2", department_id="d1", is_department_admin=True)

        mock_accessible.return_value = None

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if query_calls[0] == 1:
                mock_f.first.return_value = target_dept
            else:
                mock_f.with_for_update.return_value = mock_f
                mock_f.first.return_value = member_join
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        DepartmentService.move_member(
            operator=operator,
            tenant_id="t1",
            member_account_id="u2",
            target_department_id="d2",
            operator_ip="1.2.3.4",
        )

        assert member_join.is_department_admin is False
        assert member_join.department_id == "d2"
        mock_revoke.assert_called_once_with(
            tenant_id="t1",
            account_id="u2",
            reason="member_moved",
        )


class TestRevokeNotifySkipsWhenMailNotInited:
    @patch("services.department_service.mail")
    @patch("services.department_service.db")
    def test_revoke_notify_skips_when_mail_not_inited(self, mock_db, mock_mail):
        mock_mail.is_inited.return_value = False

        DepartmentService.revoke_department_admin_and_notify(
            tenant_id="t1",
            account_id="u1",
            reason="member_moved",
        )

        mock_db.session.query.assert_not_called()


class TestRevokeNotifySendsEmail:
    @patch("libs.email_i18n.get_email_i18n_service")
    @patch("services.department_service.mail")
    @patch("services.department_service.db")
    def test_revoke_notify_sends_email_to_admins(self, mock_db, mock_mail, mock_get_email_svc):
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_mail.is_inited.return_value = True

        admin_join = _make_join(account_id="admin1", role=TenantAccountRole.ADMIN)
        owner_join = _make_join(account_id="owner1", role=TenantAccountRole.OWNER)

        admin_account = _make_account(account_id="admin1", email="admin@example.com")
        owner_account = _make_account(account_id="owner1", email="owner@example.com")

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if query_calls[0] == 1:
                mock_f.all.return_value = [admin_join, owner_join]
            elif query_calls[0] == 2:
                mock_f.first.return_value = admin_account
            else:
                mock_f.first.return_value = owner_account
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        mock_email_svc = MagicMock()
        mock_get_email_svc.return_value = mock_email_svc

        DepartmentService.revoke_department_admin_and_notify(
            tenant_id="t1",
            account_id="u1",
            reason="member_moved",
        )

        mock_email_svc.send_raw_email.assert_called_once()
        call_kwargs = mock_email_svc.send_raw_email.call_args
        assert set(call_kwargs.kwargs["to"]) == {"admin@example.com", "owner@example.com"}


class TestAuditLogsWritten:
    @patch("services.department_service.DepartmentService.revoke_department_admin_and_notify")
    @patch("services.department_service.db")
    def test_audit_logs_written(self, mock_db, mock_revoke):
        mock_session = MagicMock()
        mock_db.session = mock_session

        operator = _make_account(account_id="admin1", is_admin_or_owner=True)
        target_dept = _make_dept(dept_id="d2")
        member_join = _make_join(account_id="u2", department_id="d1", is_department_admin=False)

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if query_calls[0] == 1:
                mock_f.first.return_value = target_dept
            else:
                mock_f.with_for_update.return_value = mock_f
                mock_f.first.return_value = member_join
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with patch("services.department_service.DepartmentService.get_accessible_department_ids", return_value=None):
            DepartmentService.move_member(
                operator=operator,
                tenant_id="t1",
                member_account_id="u2",
                target_department_id="d2",
                operator_ip="1.2.3.4",
            )

        added_objects = [c[0][0] for c in mock_session.add.call_args_list]
        audit_logs = [obj for obj in added_objects if hasattr(obj, "action") and obj.action == "move_member"]
        assert len(audit_logs) == 1
        assert audit_logs[0].content["member_id"] == "u2"
        assert audit_logs[0].content["target_department_id"] == "d2"
