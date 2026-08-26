# Task 11 Report: App List Filtering + Creation Ownership + Transfer API

## Status: DONE

## Commits
- (pending commit)

## Test Summary
- 9 service tests + 11 controller tests + 53 DSL regression tests = 73 passed, 0 failed
- Full regression: 772 app-related service tests passed, 203 controller tests passed

## Changes

### Service Layer
- `api/services/app_service.py`: `get_paginate_apps` signature changed from `(user_id, tenant_id, args)` to `(user: Account, tenant_id, args)`. Added coalesce-based department filtering via `DepartmentService.resource_department_filter`. Added `department_id` exact filter. Added `transfer_app_department` static method with audit logging. `create_app` now calls `resolve_department_id_for_creation`.
- `api/services/app_dsl_service.py`: `_create_or_update_app` sets `department_id` via `resolve_department_id_for_creation` on new app creation.
- `api/services/workflow/workflow_converter.py`: `convert_to_workflow` sets `department_id` via `resolve_department_id_for_creation`, inheriting source app's department.

### Controller Layer
- `api/controllers/console/app/app.py`:
  - `AppListQuery` gained `department_id` field
  - `CreateAppPayload` gained `department_id` field
  - `AppPartial` gained `department_id` and `department_name` fields (G4)
  - `AppListApi.get()` passes `current_user` (not `current_user.id`) and batch-resolves department names
  - New `AppTransferDepartmentApi` PUT `/apps/<uuid:app_id>/transfer-department` with `@get_app_model` guard + `@edit_permission_required`
  - `AppCopyApi` sets `department_id` on copied app after re-query

### Caller Sync
- `api/tests/test_containers_integration_tests/services/test_app_service.py`: Updated all 10 `get_paginate_apps` calls from `account.id` to `account`

### Tests Created
- `api/tests/unit_tests/services/test_app_service_department.py` (9 tests)
- `api/tests/unit_tests/controllers/console/app/test_app_transfer_api.py` (11 tests)
- Updated `api/tests/unit_tests/services/test_app_dsl_service.py` (1 monkeypatch added)

## Concerns
- None
