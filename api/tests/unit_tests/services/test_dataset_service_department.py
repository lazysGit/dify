from __future__ import annotations

from unittest.mock import MagicMock, Mock, create_autospec, patch

import pytest

from models import Account, TenantAccountRole
from models.dataset import Dataset, DatasetPermissionEnum
from services.dataset_service import DatasetService
from services.errors.department import DepartmentValidationError


def _make_user(
    user_id: str = "u1",
    tenant_id: str = "t1",
    role: TenantAccountRole = TenantAccountRole.NORMAL,
    is_admin_or_owner: bool = False,
) -> Mock:
    user = create_autospec(Account, instance=True)
    user.id = user_id
    user.current_tenant_id = tenant_id
    user.current_role = role
    user.is_admin_or_owner = is_admin_or_owner
    return user


def _make_dataset(
    dataset_id: str = "ds-1",
    tenant_id: str = "t1",
    department_id: str | None = "dept-1",
    permission: DatasetPermissionEnum = DatasetPermissionEnum.ALL_TEAM,
    created_by: str = "u1",
    name: str = "Test Dataset",
) -> Mock:
    dataset = Mock(spec=Dataset)
    dataset.id = dataset_id
    dataset.tenant_id = tenant_id
    dataset.department_id = department_id
    dataset.permission = permission
    dataset.created_by = created_by
    dataset.name = name
    dataset.updated_by = None
    return dataset


class TestGetDatasetsDepartmentFiltering:
    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_coalesce_filter_applied_for_non_admin(self, mock_db, mock_dept_service):
        from sqlalchemy import func

        mock_dept_service.get_accessible_department_ids.return_value = ["d1", "d2"]
        default_dept = MagicMock()
        default_dept.id = "default_d"
        mock_dept_service.get_default_department.return_value = default_dept

        def real_filter(model, tenant_id, accessible):
            return func.coalesce(model.department_id, "default_d").in_(accessible)

        mock_dept_service.resource_department_filter.side_effect = real_filter

        mock_pagination = MagicMock()
        mock_pagination.items = []
        mock_pagination.total = 0
        mock_db.paginate.return_value = mock_pagination
        mock_db.session.query.return_value.filter_by.return_value.all.return_value = []

        user = _make_user(is_admin_or_owner=False)
        DatasetService.get_datasets(1, 20, "t1", user)

        mock_dept_service.get_accessible_department_ids.assert_called_once_with(user, "t1")
        mock_dept_service.resource_department_filter.assert_called_once()
        call_args = mock_dept_service.resource_department_filter.call_args
        assert call_args[0][0] is Dataset
        assert call_args[0][1] == "t1"
        assert call_args[0][2] == ["d1", "d2"]

    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_admin_no_department_filter(self, mock_db, mock_dept_service):
        mock_dept_service.get_accessible_department_ids.return_value = None

        mock_pagination = MagicMock()
        mock_pagination.items = []
        mock_pagination.total = 0
        mock_db.paginate.return_value = mock_pagination
        mock_db.session.query.return_value.filter_by.return_value.all.return_value = []

        user = _make_user(is_admin_or_owner=True)
        DatasetService.get_datasets(1, 20, "t1", user)

        mock_dept_service.get_accessible_department_ids.assert_called_once_with(user, "t1")
        mock_dept_service.resource_department_filter.assert_not_called()

    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_department_id_exact_filter(self, mock_db, mock_dept_service):
        mock_dept_service.get_accessible_department_ids.return_value = None

        mock_pagination = MagicMock()
        mock_pagination.items = []
        mock_pagination.total = 0
        mock_db.paginate.return_value = mock_pagination
        mock_db.session.query.return_value.filter_by.return_value.all.return_value = []

        user = _make_user(is_admin_or_owner=True)
        DatasetService.get_datasets(1, 20, "t1", user, department_id="d_specific")

        call_args = mock_db.paginate.call_args
        stmt = call_args[1]["select"] if "select" in call_args[1] else call_args[0][0]
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        assert "d_specific" in compiled

    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_null_department_visible_to_default_dept_members(self, mock_db, mock_dept_service):
        from sqlalchemy import func

        mock_dept_service.get_accessible_department_ids.return_value = ["d1"]
        default_dept = MagicMock()
        default_dept.id = "d1"
        mock_dept_service.get_default_department.return_value = default_dept

        def capture_filter(model, tenant_id, accessible):
            return func.coalesce(model.department_id, "d1").in_(accessible)

        mock_dept_service.resource_department_filter.side_effect = capture_filter

        mock_pagination = MagicMock()
        mock_pagination.items = []
        mock_pagination.total = 0
        mock_db.paginate.return_value = mock_pagination
        mock_db.session.query.return_value.filter_by.return_value.all.return_value = []

        user = _make_user(is_admin_or_owner=False)
        DatasetService.get_datasets(1, 20, "t1", user)

        call_args = mock_db.paginate.call_args
        stmt = call_args[1]["select"] if "select" in call_args[1] else call_args[0][0]
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        assert "coalesce" in compiled.lower() or "COALESCE" in compiled

    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_dataset_operator_filtered_by_permission_and_department(self, mock_db, mock_dept_service):
        from sqlalchemy import func

        mock_dept_service.get_accessible_department_ids.return_value = ["d1"]
        default_dept = MagicMock()
        default_dept.id = "d1"
        mock_dept_service.get_default_department.return_value = default_dept

        def real_filter(model, tenant_id, accessible):
            return func.coalesce(model.department_id, "d1").in_(accessible)

        mock_dept_service.resource_department_filter.side_effect = real_filter

        mock_perm = MagicMock()
        mock_perm.dataset_id = "ds-1"
        mock_db.session.query.return_value.filter_by.return_value.all.return_value = [mock_perm]

        mock_pagination = MagicMock()
        mock_pagination.items = []
        mock_pagination.total = 0
        mock_db.paginate.return_value = mock_pagination

        user = _make_user(role=TenantAccountRole.DATASET_OPERATOR)
        DatasetService.get_datasets(1, 20, "t1", user)

        mock_dept_service.resource_department_filter.assert_called_once()

    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_department_filter_after_permission_filter(self, mock_db, mock_dept_service):
        from sqlalchemy import func

        mock_dept_service.get_accessible_department_ids.return_value = ["d1"]
        default_dept = MagicMock()
        default_dept.id = "d1"
        mock_dept_service.get_default_department.return_value = default_dept

        def real_filter(model, tenant_id, accessible):
            return func.coalesce(model.department_id, "d1").in_(accessible)

        mock_dept_service.resource_department_filter.side_effect = real_filter

        mock_db.session.query.return_value.filter_by.return_value.all.return_value = []

        mock_pagination = MagicMock()
        mock_pagination.items = []
        mock_pagination.total = 0
        mock_db.paginate.return_value = mock_pagination

        user = _make_user(is_admin_or_owner=False)
        DatasetService.get_datasets(1, 20, "t1", user)

        call_args = mock_db.paginate.call_args
        stmt = call_args[1]["select"] if "select" in call_args[1] else call_args[0][0]
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        assert "coalesce" in compiled.lower() or "COALESCE" in compiled


class TestCreateDatasetDepartmentOwnership:
    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_create_sets_department_id(self, mock_db, mock_dept_service):
        mock_dept_service.resolve_department_id_for_creation.return_value = "resolved_dept"
        mock_db.session.query.return_value.filter_by.return_value.first.return_value = None

        user = _make_user()
        DatasetService.create_empty_dataset(
            tenant_id="t1",
            name="New Dataset",
            description="desc",
            indexing_technique=None,
            account=user,
        )

        mock_dept_service.resolve_department_id_for_creation.assert_called_once_with(user, "t1", None)

    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_create_with_explicit_department_id(self, mock_db, mock_dept_service):
        mock_dept_service.resolve_department_id_for_creation.return_value = "explicit_dept"
        mock_db.session.query.return_value.filter_by.return_value.first.return_value = None

        user = _make_user()
        DatasetService.create_empty_dataset(
            tenant_id="t1",
            name="New Dataset",
            description="desc",
            indexing_technique=None,
            account=user,
            department_id="explicit_dept",
        )

        mock_dept_service.resolve_department_id_for_creation.assert_called_once_with(user, "t1", "explicit_dept")

    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_create_department_permission_denied(self, mock_db, mock_dept_service):
        mock_dept_service.resolve_department_id_for_creation.side_effect = DepartmentValidationError("无权访问该部门")
        mock_db.session.query.return_value.filter_by.return_value.first.return_value = None

        user = _make_user()
        with pytest.raises(DepartmentValidationError):
            DatasetService.create_empty_dataset(
                tenant_id="t1",
                name="New Dataset",
                description="desc",
                indexing_technique=None,
                account=user,
                department_id="forbidden_dept",
            )


class TestTransferDatasetDepartment:
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.dataset_service.db")
    def test_transfer_updates_department_and_logs(self, mock_db, mock_audit_log):
        dataset = _make_dataset(department_id="d1")
        user = _make_user(user_id="u1")

        DatasetService.transfer_dataset_department(dataset, "d2", user, "t1")

        assert dataset.department_id == "d2"
        assert dataset.updated_by == "u1"
        mock_db.session.commit.assert_called_once()
        mock_audit_log.log.assert_called_once()
        log_args = mock_audit_log.log.call_args[0]
        assert log_args[0] == "t1"
        assert log_args[3] == "transfer_dataset"
        assert log_args[4]["dataset_id"] == "ds-1"
        assert log_args[4]["target_department_id"] == "d2"
