# Task 12 Report: Dataset List Isolation, Ownership on Create, Exact Filter, Transfer API

## Status
DONE

## Commits
(pending commit)

## Test Summary
22 new tests pass; 135 existing dataset-related tests pass with no regressions.

## Changes

### Service Layer (`api/services/dataset_service.py`)
- `get_datasets`: added `department_id` parameter; I7 overlay order - department coalesce filter applied AFTER only_me/partial filter using `DepartmentService.resource_department_filter(Dataset, ...)`; exact `department_id` filter applied separately
- `create_empty_dataset`: added `department_id` parameter; uses `DepartmentService.resolve_department_id_for_creation` for ownership assignment
- `transfer_dataset_department`: new static method that updates `dataset.department_id`, commits, and logs via `DepartmentAuditLog`

### Controller Layer (`api/controllers/console/datasets/datasets.py`)
- `ConsoleDatasetListQuery`: added `department_id` field
- `DatasetTransferDepartmentPayload`: new Pydantic model for transfer API
- `DatasetListApi.get`: passes `department_id` to service; batch-fetches department names (G4) and adds `department_name` to each dataset in response (avoids N+1)
- `DatasetTransferDepartmentApi`: new PUT endpoint at `/datasets/<uuid:dataset_id>/transfer-department`; goes through `check_dataset_permission` (Task 7 guard with department check); permission matrix mirrors Task 11

### Tests
- `api/tests/unit_tests/services/test_dataset_service_department.py`: 10 tests covering coalesce filtering, admin bypass, exact filter, NULL department visibility, dataset_operator intersection, I7 overlay order, creation ownership, and transfer logging
- `api/tests/unit_tests/controllers/console/datasets/test_dataset_transfer_api.py`: 12 tests covering payload validation, transfer logic, guard integration, list query passthrough, and department_name serialization

## Concerns
None.
