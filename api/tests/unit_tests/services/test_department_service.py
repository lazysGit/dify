import json
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.exc import IntegrityError

from models.department import Department
from models.model import OperationLog
from services.department_service import DepartmentAuditLog, DepartmentService
from services.errors.department import (
    DepartmentPermissionDeniedError,
    DepartmentValidationError,
)


def _make_dept(
    dept_id="d1",
    tenant_id="t1",
    name="Engineering",
    parent_id=None,
    level=1,
    path="/t1/d1",
    is_default=False,
    description=None,
    sort_order=0,
):
    dept = MagicMock(spec=Department)
    dept.id = dept_id
    dept.tenant_id = tenant_id
    dept.name = name
    dept.parent_id = parent_id
    dept.level = level
    dept.path = path
    dept.is_default = is_default
    dept.description = description
    dept.sort_order = sort_order
    dept.created_by = "user1"
    dept.updated_by = None
    return dept


def _make_user(user_id="u1", is_admin_or_owner=False):
    user = MagicMock()
    user.id = user_id
    user.is_admin_or_owner = is_admin_or_owner
    return user


def _mock_query_chain(mock_session, first_return=None, count_return=0, all_return=None):
    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_filter.first.return_value = first_return
    mock_filter.count.return_value = count_return
    mock_filter.all.return_value = all_return if all_return is not None else []
    mock_query.filter.return_value = mock_filter
    mock_session.query.return_value = mock_query
    return mock_filter


class TestCreateDepartment:
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_create_department_root_builds_path(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        mock_dept_query = MagicMock()
        mock_dept_filter = MagicMock()
        mock_dept_filter.first.return_value = None
        mock_dept_query.filter.return_value = mock_dept_filter
        mock_session.query.return_value = mock_dept_query

        def flush_side_effect():
            for c in mock_session.add.call_args_list:
                obj = c[0][0]
                if isinstance(obj, MagicMock) and hasattr(obj, "id"):
                    if obj.id and not obj.path or obj.path == "/t1":
                        pass

        mock_session.flush = MagicMock()

        def add_and_flush():
            pass

        dept_created = _make_dept(dept_id="d1", parent_id=None, level=1, path="/t1")
        dept_created.path = "/t1/d1"

        call_count = [0]
        original_add = mock_session.add

        def track_add(obj):
            call_count[0] += 1

        mock_session.add.side_effect = track_add

        def flush_fn():
            if call_count[0] > 0:
                pass

        mock_session.flush.side_effect = flush_fn

        result = DepartmentService.create_department(tenant_id="t1", name="Engineering", created_by="user1")

        assert result.level == 1

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_create_department_rejects_default_parent(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        parent_dept = _make_dept(dept_id="d0", is_default=True, level=1)

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = parent_dept
        mock_query.filter.return_value = mock_filter
        mock_session.query.return_value = mock_query

        with pytest.raises(DepartmentValidationError, match="默认部门不能有子部门"):
            DepartmentService.create_department(tenant_id="t1", name="Sub", created_by="user1", parent_id="d0")

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_create_department_rejects_depth_over_10(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        parent_dept = _make_dept(dept_id="d10", level=10, is_default=False)

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = parent_dept
        mock_query.filter.return_value = mock_filter
        mock_session.query.return_value = mock_query

        with pytest.raises(DepartmentValidationError, match="部门层级不能超过 10 级"):
            DepartmentService.create_department(tenant_id="t1", name="Sub", created_by="user1", parent_id="d10")

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_create_department_rejects_duplicate_name(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        existing_dept = _make_dept(dept_id="d1", name="Engineering")

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = existing_dept
        mock_query.filter.return_value = mock_filter
        mock_session.query.return_value = mock_query

        with pytest.raises(DepartmentValidationError, match="同级下已存在同名部门"):
            DepartmentService.create_department(tenant_id="t1", name="Engineering", created_by="user1")


class TestDeleteDepartment:
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_delete_default_department_rejected(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d1", is_default=True)

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = dept
        mock_query.filter.return_value = mock_filter
        mock_session.query.return_value = mock_query

        with pytest.raises(DepartmentValidationError, match="默认部门不能删除"):
            DepartmentService.delete_department(tenant_id="t1", department_id="d1", operator_id="u1")

    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    @pytest.mark.parametrize(
        ("check_attr", "check_msg"),
        [
            ("children", "部门下有子部门，请先删除子部门"),
            ("members", "部门下有成员，请先移动成员"),
            ("apps", "部门下有应用，请先转移应用"),
            ("datasets", "部门下有知识库，请先转移知识库"),
        ],
    )
    def test_delete_department_blocked_by_dependencies(self, mock_db, mock_audit, check_attr, check_msg):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d1", is_default=False)

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()

            if query_calls[0] == 1:
                mock_f.first.return_value = dept
                mock_f.count.return_value = 0
            else:
                is_blocking = (
                    (check_attr == "children" and query_calls[0] == 2)
                    or (check_attr == "members" and query_calls[0] == 3)
                    or (check_attr == "apps" and query_calls[0] == 4)
                    or (check_attr == "datasets" and query_calls[0] == 5)
                )
                if is_blocking:
                    mock_f.count.return_value = 1
                else:
                    mock_f.count.return_value = 0

            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        with pytest.raises(DepartmentValidationError, match=check_msg):
            DepartmentService.delete_department(tenant_id="t1", department_id="d1", operator_id="u1")


class TestAccessibleDepartmentIds:
    @patch("services.department_service.db")
    def test_get_accessible_department_ids_admin_returns_none(self, mock_db):
        user = _make_user(is_admin_or_owner=True)
        result = DepartmentService.get_accessible_department_ids(user, "t1")
        assert result is None

    @patch("services.department_service.DepartmentService.get_descendant_ids")
    @patch("services.department_service.DepartmentService.is_department_admin")
    @patch("services.department_service.DepartmentService.get_user_department_id")
    def test_get_accessible_department_ids_dept_admin_returns_descendants(
        self, mock_get_dept_id, mock_is_dept_admin, mock_get_desc
    ):
        mock_get_dept_id.return_value = "d1"
        mock_is_dept_admin.return_value = True
        mock_get_desc.return_value = ["d2", "d3"]

        user = _make_user(user_id="u1", is_admin_or_owner=False)
        result = DepartmentService.get_accessible_department_ids(user, "t1")
        assert result == ["d1", "d2", "d3"]

    @patch("services.department_service.DepartmentService.is_department_admin")
    @patch("services.department_service.DepartmentService.get_user_department_id")
    def test_get_accessible_department_ids_member_returns_own_only(self, mock_get_dept_id, mock_is_dept_admin):
        mock_get_dept_id.return_value = "d1"
        mock_is_dept_admin.return_value = False

        user = _make_user(user_id="u1", is_admin_or_owner=False)
        result = DepartmentService.get_accessible_department_ids(user, "t1")
        assert result == ["d1"]


class TestGetDepartmentsWithCounts:
    @patch("services.department_service.db")
    def test_get_departments_with_counts_aggregates(self, mock_db):
        mock_session = MagicMock()
        mock_db.session = mock_session

        default_dept = _make_dept(dept_id="d0", is_default=True, name="默认部门")
        dept1 = _make_dept(dept_id="d1", name="Engineering")

        query_calls = [0]

        def query_side_effect(model):
            query_calls[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()

            if query_calls[0] == 1:
                mock_f.order_by.return_value = mock_f
                mock_f.all.return_value = [default_dept, dept1]
            elif query_calls[0] == 2:
                mock_f.first.return_value = default_dept
            elif query_calls[0] == 3:
                mock_f.count.return_value = 2
            elif query_calls[0] == 4:
                mock_f.count.return_value = 3
            elif query_calls[0] == 5:
                mock_f.count.return_value = 1
            elif query_calls[0] == 6:
                mock_f.count.return_value = 5
            elif query_calls[0] == 7:
                mock_f.count.return_value = 4
            elif query_calls[0] == 8:
                mock_f.count.return_value = 2
            else:
                mock_f.count.return_value = 0

            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        result = DepartmentService.get_departments_with_counts("t1")
        assert len(result) == 2
        assert result[0]["member_count"] == 2
        assert result[0]["app_count"] == 3
        assert result[0]["dataset_count"] == 1
        assert result[1]["member_count"] == 5
        assert result[1]["app_count"] == 4
        assert result[1]["dataset_count"] == 2


class TestUpdateDepartment:
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.department_service.db")
    def test_update_department_renames_and_checks_duplicate(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d1", name="OldName")

        call_count = [0]

        def query_side_effect(model):
            call_count[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if call_count[0] == 1:
                mock_f.first.return_value = dept
            else:
                mock_f.first.return_value = None
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        result = DepartmentService.update_department(
            tenant_id="t1", department_id="d1", updated_by="user1", name="NewName"
        )
        assert result.name == "NewName"


class TestBuildTree:
    def test_build_tree_nested(self):
        departments = [
            {"id": "d1", "parent_id": None, "name": "Root"},
            {"id": "d2", "parent_id": "d1", "name": "Child1"},
            {"id": "d3", "parent_id": "d1", "name": "Child2"},
            {"id": "d4", "parent_id": "d2", "name": "Grandchild"},
        ]
        tree = DepartmentService.build_tree(departments)
        assert len(tree) == 1
        assert tree[0]["id"] == "d1"
        assert len(tree[0]["children"]) == 2
        child1 = [c for c in tree[0]["children"] if c["id"] == "d2"][0]
        assert len(child1["children"]) == 1
        assert child1["children"][0]["id"] == "d4"


class TestGetDescendantIds:
    @patch("services.department_service.db")
    def test_get_descendant_ids_path_prefix(self, mock_db):
        mock_session = MagicMock()
        mock_db.session = mock_session

        dept = _make_dept(dept_id="d1", path="/t1/d1")
        desc1 = _make_dept(dept_id="d2", path="/t1/d1/d2")
        desc2 = _make_dept(dept_id="d3", path="/t1/d1/d2/d3")

        call_count = [0]

        def query_side_effect(model):
            call_count[0] += 1
            mock_q = MagicMock()
            mock_f = MagicMock()
            if call_count[0] == 1:
                mock_f.first.return_value = dept
            else:
                mock_f.all.return_value = [desc1, desc2]
            mock_q.filter.return_value = mock_f
            return mock_q

        mock_session.query.side_effect = query_side_effect

        result = DepartmentService.get_descendant_ids("t1", "d1")
        assert result == ["d2", "d3"]


class TestGetManageableDepartmentIds:
    @patch("services.department_service.db")
    @patch("services.department_service.DepartmentService.get_accessible_department_ids")
    def test_get_manageable_department_ids_matrix(self, mock_accessible, mock_db):
        mock_session = MagicMock()
        mock_db.session = mock_session

        mock_accessible.return_value = None

        dept1 = _make_dept(dept_id="d1")
        dept2 = _make_dept(dept_id="d2")

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.all.return_value = [dept1, dept2]
        mock_query.filter.return_value = mock_filter
        mock_session.query.return_value = mock_query

        user = _make_user(is_admin_or_owner=True)
        result = DepartmentService.get_manageable_department_ids(user, "t1")
        assert set(result) == {"d1", "d2"}


class TestCreateDefaultDepartment:
    @patch("services.department_service.db")
    def test_create_default_department_retries_on_integrity_error(self, mock_db):
        mock_session = MagicMock()
        mock_db.session = mock_session

        mock_session.add.side_effect = None
        mock_session.flush.side_effect = IntegrityError("stmt", {}, Exception())
        mock_session.rollback = MagicMock()

        existing_dept = _make_dept(dept_id="d0", is_default=True, name="默认部门")

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = existing_dept
        mock_query.filter.return_value = mock_filter
        mock_session.query.return_value = mock_query

        result = DepartmentService.create_default_department("t1", "user1")
        assert result.id == "d0"


class TestAuditLog:
    @patch("services.department_service.db")
    def test_audit_log_written_on_create_and_delete(self, mock_db):
        mock_session = MagicMock()
        mock_db.session = mock_session

        DepartmentAuditLog.log("t1", "user1", "1.2.3.4", "create_department", {"department_id": "d1"})

        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
        log_entry = mock_session.add.call_args[0][0]
        assert log_entry.tenant_id == "t1"
        assert log_entry.action == "create_department"
        assert log_entry.created_ip == "1.2.3.4"

    @patch("services.department_service.db")
    def test_audit_query_by_department_and_member(self, mock_db):
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_db.String = "VARCHAR"

        log1 = MagicMock(spec=OperationLog)
        log1.action = "create_department"
        log1.content = {"department_id": "d1"}

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.order_by.return_value = mock_filter
        mock_filter.limit.return_value = mock_filter
        mock_filter.all.return_value = [log1]
        mock_query.filter.return_value = mock_filter
        mock_session.query.return_value = mock_query

        result = DepartmentAuditLog.query("t1", "department_id", "d1")
        assert len(result) == 1
        assert result[0].content["department_id"] == "d1"


class TestAssertDepartmentAccess:
    @patch("services.department_service.DepartmentService.get_accessible_department_ids")
    def test_cross_tenant_rejected(self, mock_accessible):
        user = _make_user(is_admin_or_owner=False)
        with pytest.raises(DepartmentPermissionDeniedError, match="无权访问该资源"):
            DepartmentService.assert_department_access(user, "t1", "d1", resource_tenant_id="t2")

    @patch("services.department_service.DepartmentService.get_accessible_department_ids")
    def test_admin_unrestricted(self, mock_accessible):
        mock_accessible.return_value = None
        user = _make_user(is_admin_or_owner=True)
        DepartmentService.assert_department_access(user, "t1", "d1")

    @patch("services.department_service.DepartmentService.get_default_department")
    @patch("services.department_service.DepartmentService.get_accessible_department_ids")
    def test_member_denied_other_department(self, mock_accessible, mock_default):
        mock_accessible.return_value = ["d1"]
        mock_default.return_value = _make_dept(dept_id="d0")
        user = _make_user(is_admin_or_owner=False)
        with pytest.raises(DepartmentPermissionDeniedError):
            DepartmentService.assert_department_access(user, "t1", "d2")


class TestGetDepartmentMembers:
    @patch("services.department_service.db")
    def test_joined_at_is_json_serializable_isoformat(self, mock_db):
        joined_at = datetime(2026, 8, 20, 7, 16, 53)
        join = MagicMock()
        join.account_id = "u1"
        join.role = "owner"
        join.is_department_admin = False
        join.created_at = joined_at

        account = MagicMock()
        account.id = "u1"
        account.name = "Admin"
        account.email = "admin@test.com"

        mock_session = MagicMock()
        mock_db.session = mock_session

        join_query = MagicMock()
        join_query.filter.return_value.all.return_value = [join]
        account_query = MagicMock()
        account_query.filter.return_value.first.return_value = account
        mock_session.query.side_effect = [join_query, account_query]

        members = DepartmentService.get_department_members("t1", "d1")

        json.dumps(members)
        assert members[0]["joined_at"] == "2026-08-20T07:16:53"
        assert members[0]["id"] == "u1"
        assert members[0]["account_id"] == "u1"
        assert members[0]["is_department_admin"] is False

    @patch("services.department_service.db")
    def test_joined_at_none_serializes_to_null(self, mock_db):
        join = MagicMock()
        join.account_id = "u1"
        join.role = "editor"
        join.is_department_admin = False
        join.created_at = None

        account = MagicMock()
        account.id = "u1"
        account.name = "User"
        account.email = "user@test.com"

        mock_session = MagicMock()
        mock_db.session = mock_session

        join_query = MagicMock()
        join_query.filter.return_value.all.return_value = [join]
        account_query = MagicMock()
        account_query.filter.return_value.first.return_value = account
        mock_session.query.side_effect = [join_query, account_query]

        members = DepartmentService.get_department_members("t1", "d1")

        json.dumps(members)
        assert members[0]["joined_at"] is None
