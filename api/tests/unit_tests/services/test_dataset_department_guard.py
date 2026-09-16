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

    def test_department_admin_cannot_access_only_me_created_by_others(self) -> None:
        user = _make_user(role=TenantAccountRole.EDITOR)
        dataset = _make_dataset(permission=DatasetPermissionEnum.ONLY_ME, created_by="other-user")

        from services.department_service import DepartmentService

        with (
            patch.object(DepartmentService, "is_department_admin", return_value=True),
            patch.object(DepartmentService, "assert_department_access", return_value=None) as mock_check,
        ):
            with pytest.raises(NoPermissionError, match="You do not have permission"):
                DatasetService.check_dataset_permission(dataset, user)
            mock_check.assert_not_called()


class TestCheckDatasetPermissionAllDepartment:
    def test_same_department_member_allowed(self) -> None:
        user = _make_user(role=TenantAccountRole.EDITOR)
        dataset = _make_dataset(
            permission=DatasetPermissionEnum.ALL_DEPARTMENT,
            department_id="d-rd",
            created_by="other-user",
        )
        from services.department_service import DepartmentService

        with (
            patch.object(DatasetService, "user_in_dataset_department", return_value=True),
            patch.object(DepartmentService, "assert_department_access", return_value=None),
        ):
            DatasetService.check_dataset_permission(dataset, user)

    def test_other_department_denied_before_acl(self) -> None:
        user = _make_user(role=TenantAccountRole.EDITOR)
        dataset = _make_dataset(
            permission=DatasetPermissionEnum.ALL_DEPARTMENT,
            department_id="d-fe",
            created_by="u1",
        )
        from services.department_service import DepartmentService

        with (
            patch.object(DatasetService, "user_in_dataset_department", return_value=False),
            patch.object(DepartmentService, "assert_department_access", return_value=None) as mock_acl,
        ):
            with pytest.raises(NoPermissionError, match="You do not have permission"):
                DatasetService.check_dataset_permission(dataset, user)
            mock_acl.assert_not_called()

    def test_parent_department_admin_denied(self) -> None:
        user = _make_user(role=TenantAccountRole.EDITOR)
        dataset = _make_dataset(
            permission=DatasetPermissionEnum.ALL_DEPARTMENT,
            department_id="d-fe",
            created_by="other-user",
        )
        from services.department_service import DepartmentService

        with (
            patch.object(DepartmentService, "is_department_admin", return_value=True),
            patch.object(DatasetService, "user_in_dataset_department", return_value=False),
            patch.object(DepartmentService, "assert_department_access", return_value=None) as mock_acl,
        ):
            with pytest.raises(NoPermissionError):
                DatasetService.check_dataset_permission(dataset, user)
            mock_acl.assert_not_called()

    def test_creator_transferred_out_denied_via_live_membership(self) -> None:
        user = _make_user(role=TenantAccountRole.EDITOR)
        dataset = _make_dataset(
            permission=DatasetPermissionEnum.ALL_DEPARTMENT,
            department_id="d-rd",
            created_by="u1",
        )
        from services.department_service import DepartmentService

        default_dept = Mock()
        default_dept.id = "d-default"
        with (
            patch.object(DepartmentService, "get_user_department_id", return_value="d-fe"),
            patch.object(DepartmentService, "get_default_department", return_value=default_dept),
            patch.object(DepartmentService, "assert_department_access", return_value=None) as mock_acl,
        ):
            with pytest.raises(NoPermissionError, match="You do not have permission"):
                DatasetService.check_dataset_permission(dataset, user)
            mock_acl.assert_not_called()

    def test_privileged_skips_department_sharing(self) -> None:
        user = _make_user(role=TenantAccountRole.ADMIN)
        dataset = _make_dataset(
            permission=DatasetPermissionEnum.ALL_DEPARTMENT,
            department_id="d-fe",
            created_by="other-user",
        )
        from services.department_service import DepartmentService

        with (
            patch.object(DatasetService, "user_in_dataset_department") as mock_same,
            patch.object(DepartmentService, "assert_department_access", return_value=None),
        ):
            DatasetService.check_dataset_permission(dataset, user)
            mock_same.assert_not_called()


class TestCheckDatasetOperatorPermissionAllDepartment:
    def test_operator_same_department_allowed(self) -> None:
        user = _make_user(role=TenantAccountRole.DATASET_OPERATOR)
        dataset = _make_dataset(permission=DatasetPermissionEnum.ALL_DEPARTMENT, department_id="d-rd")
        with patch.object(DatasetService, "user_in_dataset_department", return_value=True):
            DatasetService.check_dataset_operator_permission(user=user, dataset=dataset)

    def test_operator_other_department_denied(self) -> None:
        user = _make_user(role=TenantAccountRole.DATASET_OPERATOR)
        dataset = _make_dataset(permission=DatasetPermissionEnum.ALL_DEPARTMENT, department_id="d-fe")
        with patch.object(DatasetService, "user_in_dataset_department", return_value=False):
            with pytest.raises(NoPermissionError):
                DatasetService.check_dataset_operator_permission(user=user, dataset=dataset)
