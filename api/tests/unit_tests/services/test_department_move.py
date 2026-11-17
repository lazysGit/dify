from unittest.mock import MagicMock, patch

import pytest

from models.department import Department
from services.department_service import DepartmentService
from services.errors.department import DepartmentNotFoundError, DepartmentValidationError


def _make_dept(
    dept_id="d1",
    tenant_id="t1",
    name="Engineering",
    parent_id=None,
    level=1,
    path="/t1/d1",
    is_default=False,
):
    dept = MagicMock(spec=Department)
    dept.id = dept_id
    dept.tenant_id = tenant_id
    dept.name = name
    dept.parent_id = parent_id
    dept.level = level
    dept.path = path
    dept.is_default = is_default
    return dept


class TestMoveDepartment:
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_move_to_root(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d1", parent_id="d2", level=2, path="/t1/d2/d1")

        call_count = [0]

        def query_side_effect(model):
            call_count[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if call_count[0] == 1:
                mock_f.first.return_value = dept
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect
        mock_session.execute = MagicMock()

        DepartmentService.move_department(
            tenant_id="t1",
            department_id="d1",
            new_parent_id=None,
            operator_id="user1",
        )

        assert mock_session.execute.call_count == 2
        mock_session.commit.assert_called_once()
        mock_audit.log.assert_called_once()
        log_args = mock_audit.log.call_args[0]
        assert log_args[3] == "move_department"
        assert log_args[4]["new_path"] == "/t1/d1"

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_move_subtree_updates_path_and_level(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d1", parent_id=None, level=1, path="/t1/d1")
        new_parent = _make_dept(dept_id="d2", parent_id=None, level=1, path="/t1/d2")

        call_count = [0]

        def query_side_effect(model):
            call_count[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if call_count[0] == 1:
                mock_f.first.return_value = dept
            elif call_count[0] == 2:
                mock_f.first.return_value = new_parent
            elif call_count[0] == 3:
                mock_f.scalar.return_value = 2
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect
        mock_session.execute = MagicMock()

        DepartmentService.move_department(
            tenant_id="t1",
            department_id="d1",
            new_parent_id="d2",
            operator_id="user1",
        )

        assert mock_session.execute.call_count == 2
        mock_session.commit.assert_called_once()

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_move_rejects_cycle(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d1", level=1, path="/t1/d1")
        descendant = _make_dept(dept_id="d3", level=3, path="/t1/d1/d2/d3")

        call_count = [0]

        def query_side_effect(model):
            call_count[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if call_count[0] == 1:
                mock_f.first.return_value = dept
            elif call_count[0] == 2:
                mock_f.first.return_value = descendant
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with pytest.raises(DepartmentValidationError, match="子孙"):
            DepartmentService.move_department(
                tenant_id="t1",
                department_id="d1",
                new_parent_id="d3",
                operator_id="user1",
            )

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_move_rejects_depth_exceeded(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d1", level=1, path="/t1/d1")
        new_parent = _make_dept(dept_id="d9", level=9, path="/t1/d9", is_default=False)

        call_count = [0]

        def query_side_effect(model):
            call_count[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if call_count[0] == 1:
                mock_f.first.return_value = dept
            elif call_count[0] == 2:
                mock_f.first.return_value = new_parent
            elif call_count[0] == 3:
                mock_f.scalar.return_value = 3
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with pytest.raises(DepartmentValidationError, match="10"):
            DepartmentService.move_department(
                tenant_id="t1",
                department_id="d1",
                new_parent_id="d9",
                operator_id="user1",
            )

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_move_rejects_default_department(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d0", is_default=True, level=1, path="/t1/d0")

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = dept
        mock_query.filter.return_value = mock_filter
        mock_session.query.return_value = mock_query

        with pytest.raises(DepartmentValidationError, match="默认部门不能移动"):
            DepartmentService.move_department(
                tenant_id="t1",
                department_id="d0",
                new_parent_id=None,
                operator_id="user1",
            )

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_move_into_default_department_rejected(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d1", level=1, path="/t1/d1")
        default_dept = _make_dept(dept_id="d0", is_default=True, level=1, path="/t1/d0")

        call_count = [0]

        def query_side_effect(model):
            call_count[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if call_count[0] == 1:
                mock_f.first.return_value = dept
            elif call_count[0] == 2:
                mock_f.first.return_value = default_dept
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with pytest.raises(DepartmentValidationError, match="默认部门不能有子部门"):
            DepartmentService.move_department(
                tenant_id="t1",
                department_id="d1",
                new_parent_id="d0",
                operator_id="user1",
            )

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_audit_log_written(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d1", parent_id=None, level=1, path="/t1/d1")

        call_count = [0]

        def query_side_effect(model):
            call_count[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if call_count[0] == 1:
                mock_f.first.return_value = dept
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect
        mock_session.execute = MagicMock()

        DepartmentService.move_department(
            tenant_id="t1",
            department_id="d1",
            new_parent_id=None,
            operator_id="user1",
            operator_ip="1.2.3.4",
        )

        mock_audit.log.assert_called_once_with(
            "t1",
            "user1",
            "1.2.3.4",
            "move_department",
            {"department_id": "d1", "old_path": "/t1/d1", "new_path": "/t1/d1"},
        )

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_move_not_found(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = None
        mock_query.filter.return_value = mock_filter
        mock_session.query.return_value = mock_query

        with pytest.raises(DepartmentNotFoundError):
            DepartmentService.move_department(
                tenant_id="t1",
                department_id="d_nonexist",
                new_parent_id=None,
                operator_id="user1",
            )

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_move_self_rejected(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d1", level=1, path="/t1/d1")

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = dept
        mock_query.filter.return_value = mock_filter
        mock_session.query.return_value = mock_query

        with pytest.raises(DepartmentValidationError, match="自身"):
            DepartmentService.move_department(
                tenant_id="t1",
                department_id="d1",
                new_parent_id="d1",
                operator_id="user1",
            )
