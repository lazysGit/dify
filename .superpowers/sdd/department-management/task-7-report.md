# Task 7 Report: Single-Resource Access Guard

## Status
DONE

## Commits
(pending)

## Test summary
526 passed, 0 failed (11 new guard tests + 515 regression tests)

## Changes

### Modified
- `api/controllers/console/app/wraps.py`: Added `DepartmentService.assert_department_access` call in `get_app_model` after model load; in `get_app_model_with_trial` only checks when `app.tenant_id == current_tenant_id` (R4 trial exception). Raises `Forbidden` on denial.
- `api/services/dataset_service.py`: Added `DepartmentService.assert_department_access` call at end of `check_dataset_permission`. Catches `DepartmentPermissionDeniedError` and re-raises as `NoPermissionError` to match existing controller error handling pattern.
- `api/tests/unit_tests/controllers/console/app/test_wraps.py`: Added `department_id` to app model mocks and mocked `DepartmentService.assert_department_access` to prevent regression.
- `api/tests/unit_tests/controllers/console/app/test_workflow_human_input_debug_api.py`: Added `department_id` to `_make_app` and mocked `DepartmentService.assert_department_access` in `_patch_console_guards`.

### Created
- `api/tests/unit_tests/controllers/console/app/test_department_access_guard.py`: 6 tests covering app-side guard (member other dept -> 403, owner pass, NULL dept, outside dept -> 403, cross-tenant trial skip, same-tenant trial check).
- `api/tests/unit_tests/services/test_dataset_department_guard.py`: 5 tests covering dataset-side guard (member other dept -> NoPermission, owner pass, NULL dept, outside dept -> NoPermission, tenant mismatch raises first).

## Concerns
None.
