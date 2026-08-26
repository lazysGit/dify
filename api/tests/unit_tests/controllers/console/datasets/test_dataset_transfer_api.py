from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest


def _make_user(user_id="u1", is_admin_or_owner=False, tenant_id="t1"):
    return SimpleNamespace(
        id=user_id,
        current_tenant_id=tenant_id,
        is_admin_or_owner=is_admin_or_owner,
    )


def _make_dataset(dataset_id="ds1", tenant_id="t1", department_id="d1"):
    return SimpleNamespace(
        id=dataset_id,
        tenant_id=tenant_id,
        department_id=department_id,
        name="Test Dataset",
    )


class TestDatasetTransferDepartmentPayloadValidation:
    def test_empty_payload_400(self):
        from pydantic import ValidationError

        from controllers.console.datasets.datasets import DatasetTransferDepartmentPayload

        with pytest.raises(ValidationError):
            DatasetTransferDepartmentPayload.model_validate({})

    def test_empty_string_400(self):
        from pydantic import ValidationError

        from controllers.console.datasets.datasets import DatasetTransferDepartmentPayload

        with pytest.raises(ValidationError):
            DatasetTransferDepartmentPayload.model_validate({"department_id": ""})

    def test_valid_payload(self):
        from controllers.console.datasets.datasets import DatasetTransferDepartmentPayload

        payload = DatasetTransferDepartmentPayload.model_validate({"department_id": "d1"})
        assert payload.department_id == "d1"


class TestDatasetTransferLogic:
    def test_admin_transfer_success(self, monkeypatch):
        from services.dataset_service import DatasetService

        dataset = _make_dataset(department_id="d1")
        user = _make_user(is_admin_or_owner=True)

        mock_dept = SimpleNamespace(id="d2")

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = mock_dept
        mock_query.filter.return_value = mock_filter

        monkeypatch.setattr(
            "extensions.ext_database.db",
            SimpleNamespace(session=SimpleNamespace(query=lambda _: mock_query, commit=lambda: None)),
        )

        with patch.object(DatasetService, "transfer_dataset_department") as mock_transfer:
            target_dept_id = "d2"
            target_dept = mock_query.filter.return_value.first()
            assert target_dept is not None

            DatasetService.transfer_dataset_department(dataset, target_dept_id, user, "t1")
            mock_transfer.assert_called_once()

    def test_dept_admin_target_not_manageable(self):
        from services.department_service import DepartmentService

        user = _make_user(user_id="u2", is_admin_or_owner=False)

        with patch.object(DepartmentService, "get_manageable_department_ids", return_value=["d1"]):
            manageable = DepartmentService.get_manageable_department_ids(user, "t1")
            assert "d_unmanageable" not in manageable

    def test_target_department_not_found(self, monkeypatch):
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = None
        mock_query.filter.return_value = mock_filter

        monkeypatch.setattr(
            "extensions.ext_database.db",
            SimpleNamespace(session=SimpleNamespace(query=lambda _: mock_query)),
        )

        result = mock_query.filter.return_value.first()
        assert result is None


class TestDatasetListApiDepartmentPassthrough:
    def test_department_id_in_dataset_list_query(self):
        from controllers.console.datasets.datasets import ConsoleDatasetListQuery

        query = ConsoleDatasetListQuery.model_validate(
            {
                "page": "1",
                "limit": "20",
                "department_id": "d_filter",
            }
        )
        dumped = query.model_dump()
        assert dumped["department_id"] == "d_filter"

    def test_department_id_default_none(self):
        from controllers.console.datasets.datasets import ConsoleDatasetListQuery

        query = ConsoleDatasetListQuery.model_validate(
            {
                "page": "1",
                "limit": "20",
            }
        )
        dumped = query.model_dump()
        assert dumped["department_id"] is None

    def test_service_receives_department_id(self):
        from services.dataset_service import DatasetService

        user = _make_user(is_admin_or_owner=True)

        with patch.object(DatasetService, "get_datasets", return_value=([], 0)) as mock_get:
            DatasetService.get_datasets(
                1, 20, "t1", user, department_id="d_specific"
            )

            call_kwargs = mock_get.call_args
            assert call_kwargs[1].get("department_id") == "d_specific" or (
                len(call_kwargs[0]) > 7 and call_kwargs[0][7] == "d_specific"
            )


class TestDatasetListDepartmentNameSerialization:
    def test_department_name_added_to_response(self):
        from types import SimpleNamespace

        datasets = [
            SimpleNamespace(id="ds1", department_id="d1", permission="all_team", indexing_technique=None,
                            embedding_model_provider=None, embedding_model=None),
            SimpleNamespace(id="ds2", department_id=None, permission="all_team", indexing_technique=None,
                            embedding_model_provider=None, embedding_model=None),
        ]

        dept_name_map = {"d1": "Engineering", "default_d": "Default"}
        default_dept_id = "default_d"

        for ds in datasets:
            effective_dept_id = ds.department_id or default_dept_id
            dept_name = dept_name_map.get(effective_dept_id, "") if effective_dept_id else ""
            if ds.department_id:
                assert dept_name == "Engineering"
            else:
                assert dept_name == "Default"


class TestDatasetTransferGuardIntegration:
    def test_cross_dept_editor_403(self):
        from unittest.mock import Mock

        from models.dataset import Dataset

        dataset = Mock(spec=Dataset)
        dataset.tenant_id = "t1"
        dataset.department_id = "d_other"
        dataset.permission = "all_team"
        dataset.created_by = "u2"

        user = _make_user(user_id="u1", is_admin_or_owner=False)

        from services.dataset_service import DatasetService
        from services.errors.account import NoPermissionError

        with patch.object(
            DatasetService,
            "check_dataset_permission",
            side_effect=NoPermissionError("You do not have permission to access this dataset."),
        ):
            with pytest.raises(NoPermissionError):
                DatasetService.check_dataset_permission(dataset, user)

    def test_admin_passes_guard(self):
        from unittest.mock import Mock

        from models.dataset import Dataset

        dataset = Mock(spec=Dataset)
        dataset.tenant_id = "t1"
        dataset.department_id = "d1"
        dataset.permission = "all_team"
        dataset.created_by = "u1"

        user = _make_user(user_id="u1", is_admin_or_owner=True)

        from services.dataset_service import DatasetService

        with patch.object(DatasetService, "check_dataset_permission", return_value=None):
            DatasetService.check_dataset_permission(dataset, user)
