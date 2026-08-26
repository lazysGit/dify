from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from services.app_publish_service import AppPublishService


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

        user = _make_user()
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

        user = _make_user()
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

        user = _make_user()
        AppPublishService.update_published_departments(user, "t1", "app1", ["d1"])

        mock_audit.log.assert_called_once()
        args = mock_audit.log.call_args
        assert args[0][3] == "publish_app_to_departments"

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

        user = _make_user()
        AppPublishService.update_published_departments(user, "t1", "app1", [])

        calls = mock_audit.log.call_args_list
        assert any(c[0][3] == "unpublish_app_from_departments" for c in calls)


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
