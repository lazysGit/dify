from __future__ import annotations

from unittest.mock import Mock, create_autospec, patch

import pytest

from models import Account, TenantAccountRole
from models.dataset import Dataset, DatasetPermissionEnum
from services.dataset_service import DatasetService
from services.errors.account import NoPermissionError
from services.errors.department import DepartmentPermissionDeniedError


def _make_user(
    user_id: str = "u1",
    tenant_id: str = "t1",
    role: TenantAccountRole = TenantAccountRole.NORMAL,
) -> Mock:
    user = create_autospec(Account, instance=True)
    user.id = user_id
    user.current_tenant_id = tenant_id
    user.current_role = role
    return user


def _make_dataset(
    dataset_id: str = "ds-1",
    tenant_id: str = "t1",
    department_id: str | None = "dept-1",
    permission: DatasetPermissionEnum = DatasetPermissionEnum.ALL_TEAM,
    created_by: str = "u1",
) -> Mock:
    dataset = Mock(spec=Dataset)
    dataset.id = dataset_id
    dataset.tenant_id = tenant_id
    dataset.department_id = department_id
    dataset.permission = permission
    dataset.created_by = created_by
    return dataset


class TestCheckDatasetPermissionDepartmentGuard:
    def test_member_other_dept_raises_no_permission(self) -> None:
        user = _make_user()
        dataset = _make_dataset(department_id="dept-other", created_by="other-user")

        from services.department_service import DepartmentService

        with patch.object(
            DepartmentService,
            "assert_department_access",
            side_effect=DepartmentPermissionDeniedError("无权访问该资源"),
        ):
            with pytest.raises(NoPermissionError):
                DatasetService.check_dataset_permission(dataset, user)

    def test_owner_passes(self) -> None:
        user = _make_user(role=TenantAccountRole.OWNER)
        dataset = _make_dataset(department_id="dept-other", created_by="other-user")

        from services.department_service import DepartmentService

        with patch.object(DepartmentService, "assert_department_access", return_value=None) as mock_check:
            DatasetService.check_dataset_permission(dataset, user)
            mock_check.assert_called_once()

    def test_null_department_id_uses_default(self) -> None:
        user = _make_user()
        dataset = _make_dataset(department_id=None, created_by="u1", permission=DatasetPermissionEnum.ONLY_ME)

        from services.department_service import DepartmentService

        with patch.object(DepartmentService, "assert_department_access", return_value=None) as mock_check:
            DatasetService.check_dataset_permission(dataset, user)
            mock_check.assert_called_once()
            call_args = mock_check.call_args
            assert call_args[0][2] is None

    def test_outside_accessible_dept_raises_no_permission(self) -> None:
        user = _make_user()
        dataset = _make_dataset(department_id="dept-x", created_by="other-user")

        from services.department_service import DepartmentService

        with patch.object(
            DepartmentService,
            "assert_department_access",
            side_effect=DepartmentPermissionDeniedError("无权访问该资源"),
        ):
            with pytest.raises(NoPermissionError):
                DatasetService.check_dataset_permission(dataset, user)

    def test_tenant_mismatch_still_raises_first(self) -> None:
        user = _make_user(tenant_id="t1")
        dataset = _make_dataset(tenant_id="t2")

        from services.department_service import DepartmentService

        with patch.object(DepartmentService, "assert_department_access") as mock_check:
            with pytest.raises(NoPermissionError, match="You do not have permission"):
                DatasetService.check_dataset_permission(dataset, user)
            mock_check.assert_not_called()
