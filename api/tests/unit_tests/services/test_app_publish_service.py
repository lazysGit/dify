from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from services.app_publish_service import AppPublishService
from services.errors.department import DepartmentPermissionDeniedError


def _make_user(user_id="u1", is_admin_or_owner=False):
    user = SimpleNamespace(id=user_id, is_admin_or_owner=is_admin_or_owner)
    return user


def _make_app(app_id="app1", tenant_id="t1", enable_site=True):
    return SimpleNamespace(id=app_id, tenant_id=tenant_id, enable_site=enable_site)


class TestGetPublishedDepartments:
    @patch("services.app_publish_service.db")
    def test_returns_list_of_dicts(self, mock_db):
        mock_session = MagicMock()
        mock_db.session = mock_session

        row1 = SimpleNamespace(id="d1", name="Engineering", path="/t1/d1")
        row2 = SimpleNamespace(id="d2", name="Sales", path="/t1/d2")

        mock_execute = MagicMock()
        mock_execute.all.return_value = [row1, row2]
        mock_session.execute.return_value = mock_execute

        result = AppPublishService.get_published_departments("app1")
        assert result == [
            {"id": "d1", "name": "Engineering", "path": "/t1/d1"},
            {"id": "d2", "name": "Sales", "path": "/t1/d2"},
        ]

    @patch("services.app_publish_service.db")
    def test_returns_empty_when_no_published(self, mock_db):
        mock_session = MagicMock()
        mock_db.session = mock_session

        mock_execute = MagicMock()
        mock_execute.all.return_value = []
        mock_session.execute.return_value = mock_execute

        result = AppPublishService.get_published_departments("app1")
        assert result == []


class TestUpdatePublishedDepartments:
    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.db")
    def test_enable_site_false_raises(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_session.scalar.return_value = _make_app(enable_site=False)

        user = _make_user()
        with pytest.raises(ValueError, match="App site is not enabled"):
            AppPublishService.update_published_departments(user, "t1", "app1", ["d1"])

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.db")
    def test_full_replace_diff(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_session.scalar.return_value = _make_app(enable_site=True)

        existing_row = MagicMock()
        existing_row.__iter__ = lambda self: iter(["d1"])
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = ["d1"]
        mock_existing_query = MagicMock()
        mock_existing_query.scalars.return_value = mock_scalars

        mock_session.execute.return_value = mock_existing_query

        user = _make_user(is_admin_or_owner=True)
        result = AppPublishService.update_published_departments(user, "t1", "app1", ["d2", "d3"])

        added = list(mock_session.add.call_args_list)
        assert len(added) == 2

        mock_session.execute.assert_called()
        mock_session.commit.assert_called_once()

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.db")
    def test_duplicate_department_dedup(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_session.scalar.return_value = _make_app(enable_site=True)

        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_existing_query = MagicMock()
        mock_existing_query.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_existing_query

        user = _make_user(is_admin_or_owner=True)
        AppPublishService.update_published_departments(user, "t1", "app1", ["d1", "d1", "d1"])

        added = list(mock_session.add.call_args_list)
        assert len(added) == 1

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.db")
    def test_audit_log_written_on_add(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_session.scalar.return_value = _make_app(enable_site=True)

        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_existing_query = MagicMock()
        mock_existing_query.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_existing_query

        user = _make_user(is_admin_or_owner=True)
        AppPublishService.update_published_departments(user, "t1", "app1", ["d1"])

        mock_audit.log.assert_called()
        actions = [c[0][3] for c in mock_audit.log.call_args_list]
        assert "publish_app_to_departments" in actions

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.db")
    def test_audit_log_written_on_remove(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_session.scalar.return_value = _make_app(enable_site=True)

        mock_scalars = MagicMock()
        mock_scalars.all.return_value = ["d1"]
        mock_existing_query = MagicMock()
        mock_existing_query.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_existing_query

        user = _make_user(is_admin_or_owner=True)
        AppPublishService.update_published_departments(user, "t1", "app1", [])

        calls = mock_audit.log.call_args_list
        assert any(c[0][3] == "unpublish_app_from_departments" for c in calls)


class TestPublishPermissionMatrix:
    """Permission matrix for update_published_departments (plan Task 7)."""

    def _mock_env(self, mock_db, mock_dept_svc, *, user_dept="d_own", descendants=None, is_dept_admin=False):
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_session.scalar.return_value = _make_app(enable_site=True)

        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_existing_query = MagicMock()
        mock_existing_query.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_existing_query

        mock_dept_svc.get_user_department_id.return_value = user_dept
        mock_dept_svc.is_department_admin.return_value = is_dept_admin
        mock_dept_svc.get_descendant_ids.return_value = descendants if descendants is not None else []
        return mock_session

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_owner_can_publish_to_any_department(self, mock_db, mock_dept_svc, mock_audit):
        self._mock_env(mock_db, mock_dept_svc)
        user = _make_user(user_id="owner1", is_admin_or_owner=True)

        result = AppPublishService.update_published_departments(user, "t1", "app1", ["d_any"])

        assert isinstance(result, list)

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_admin_can_publish_to_any_department(self, mock_db, mock_dept_svc, mock_audit):
        self._mock_env(mock_db, mock_dept_svc)
        user = _make_user(user_id="admin1", is_admin_or_owner=True)

        result = AppPublishService.update_published_departments(user, "t1", "app1", ["d_any"])

        assert isinstance(result, list)

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_dept_admin_can_publish_to_own_department(self, mock_db, mock_dept_svc, mock_audit):
        self._mock_env(mock_db, mock_dept_svc, user_dept="d_own", is_dept_admin=True)
        user = _make_user(user_id="deptadmin1")

        result = AppPublishService.update_published_departments(user, "t1", "app1", ["d_own"])

        assert isinstance(result, list)

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_dept_admin_can_publish_to_subdepartment(self, mock_db, mock_dept_svc, mock_audit):
        self._mock_env(mock_db, mock_dept_svc, user_dept="d_own", descendants=["d_sub"], is_dept_admin=True)
        user = _make_user(user_id="deptadmin1")

        result = AppPublishService.update_published_departments(user, "t1", "app1", ["d_sub"])

        assert isinstance(result, list)

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_dept_admin_cannot_publish_outside_scope(self, mock_db, mock_dept_svc, mock_audit):
        self._mock_env(mock_db, mock_dept_svc, user_dept="d_own", descendants=["d_sub"], is_dept_admin=True)
        user = _make_user(user_id="deptadmin1")

        with pytest.raises(DepartmentPermissionDeniedError):
            AppPublishService.update_published_departments(user, "t1", "app1", ["d_outside"])

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_editor_can_publish_to_own_department_only(self, mock_db, mock_dept_svc, mock_audit):
        self._mock_env(mock_db, mock_dept_svc, user_dept="d_own")
        user = _make_user(user_id="editor1")

        result = AppPublishService.update_published_departments(user, "t1", "app1", ["d_own"])

        assert isinstance(result, list)

        with pytest.raises(DepartmentPermissionDeniedError):
            AppPublishService.update_published_departments(user, "t1", "app1", ["d_other"])

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_normal_can_publish_to_own_department_only(self, mock_db, mock_dept_svc, mock_audit):
        self._mock_env(mock_db, mock_dept_svc, user_dept="d_own")
        user = _make_user(user_id="normal1")

        result = AppPublishService.update_published_departments(user, "t1", "app1", ["d_own"])

        assert isinstance(result, list)

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_dataset_operator_can_publish_to_own_department_only(self, mock_db, mock_dept_svc, mock_audit):
        self._mock_env(mock_db, mock_dept_svc, user_dept="d_own")
        user = _make_user(user_id="dsop1")

        result = AppPublishService.update_published_departments(user, "t1", "app1", ["d_own"])

        assert isinstance(result, list)

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_cross_department_publish_raises_403(self, mock_db, mock_dept_svc, mock_audit):
        self._mock_env(mock_db, mock_dept_svc, user_dept="d_own")
        user = _make_user(user_id="normal1")

        with pytest.raises(DepartmentPermissionDeniedError):
            AppPublishService.update_published_departments(user, "t1", "app1", ["d_other"])

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_audit_log_records_correct_action_type(self, mock_db, mock_dept_svc, mock_audit):
        self._mock_env(mock_db, mock_dept_svc, user_dept="d_own")
        admin = _make_user(user_id="admin1", is_admin_or_owner=True)
        AppPublishService.update_published_departments(admin, "t1", "app1", ["d_any"])
        actions = [c[0][3] for c in mock_audit.log.call_args_list]
        assert "publish_cross_department" in actions

        mock_audit.log.reset_mock()
        normal = _make_user(user_id="normal1")
        AppPublishService.update_published_departments(normal, "t1", "app1", ["d_own"])
        actions = [c[0][3] for c in mock_audit.log.call_args_list]
        assert "publish_to_own_department" in actions
        assert "publish_cross_department" not in actions

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_success_audit_is_recorded_after_commit(self, mock_db, mock_dept_svc, mock_audit):
        """Regression: success audit must come after the data commit.

        DepartmentAuditLog.log commits its own row, so recording the audit
        before the publish commit would leave a "success" entry behind even
        when the commit fails.
        """
        self._mock_env(mock_db, mock_dept_svc, user_dept="d_own")
        admin = _make_user(user_id="admin1", is_admin_or_owner=True)

        # 记录两类调用的真实先后顺序
        order: list[str] = []
        mock_db.session.commit.side_effect = lambda: order.append("commit")
        mock_audit.log.side_effect = lambda *args, **kwargs: order.append("audit")

        AppPublishService.update_published_departments(admin, "t1", "app1", ["d_any"])

        assert "commit" in order, "data commit missing"
        success_calls = [
            i for i, c in enumerate(mock_audit.log.call_args_list) if c[0][3] == "publish_cross_department"
        ]
        assert success_calls, "success audit missing"
        # 最后一次 data commit 必须先于成功审计
        assert order.index("commit") < order.index("audit")

    @patch("services.app_publish_service.DepartmentAuditLog")
    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_audit_log_records_permission_denied(self, mock_db, mock_dept_svc, mock_audit):
        self._mock_env(mock_db, mock_dept_svc, user_dept="d_own")
        user = _make_user(user_id="normal1")

        with pytest.raises(DepartmentPermissionDeniedError):
            AppPublishService.update_published_departments(user, "t1", "app1", ["d_other"])

        denied_calls = [c for c in mock_audit.log.call_args_list if c[0][3] == "publish_permission_denied"]
        assert len(denied_calls) == 1
        content = denied_calls[0][0][4]
        assert content["app_id"] == "app1"
        assert content["target_department_id"] == "d_other"
        assert content["user_id"] == "normal1"


class TestCanAccess:
    @patch("services.app_publish_service.db")
    def test_admin_always_true(self, mock_db):
        user = _make_user(is_admin_or_owner=True)
        assert AppPublishService.can_access(user, "t1", "app1") is True

    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_published_to_own_dept_true(self, mock_db, mock_dept_svc):
        user = _make_user(is_admin_or_owner=False)
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_session.scalar.return_value = _make_app()
        mock_dept_svc.get_accessible_department_ids.return_value = ["d1"]

        mock_scalars = MagicMock()
        mock_scalars.all.return_value = ["d1"]
        mock_query = MagicMock()
        mock_query.scalars.return_value = mock_scalars
        mock_db.session.execute.return_value = mock_query

        assert AppPublishService.can_access(user, "t1", "app1") is True

    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_not_published_false(self, mock_db, mock_dept_svc):
        user = _make_user(is_admin_or_owner=False)
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_session.scalar.return_value = _make_app()
        mock_dept_svc.get_accessible_department_ids.return_value = ["d1"]

        mock_scalars = MagicMock()
        mock_scalars.all.return_value = ["d2"]
        mock_query = MagicMock()
        mock_query.scalars.return_value = mock_scalars
        mock_db.session.execute.return_value = mock_query

        assert AppPublishService.can_access(user, "t1", "app1") is False

    @patch("services.app_publish_service.DepartmentService")
    @patch("services.app_publish_service.db")
    def test_after_cancel_publish_false(self, mock_db, mock_dept_svc):
        user = _make_user(is_admin_or_owner=False)
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_session.scalar.return_value = _make_app()
        mock_dept_svc.get_accessible_department_ids.return_value = ["d1"]

        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_query = MagicMock()
        mock_query.scalars.return_value = mock_scalars
        mock_db.session.execute.return_value = mock_query

        assert AppPublishService.can_access(user, "t1", "app1") is False
