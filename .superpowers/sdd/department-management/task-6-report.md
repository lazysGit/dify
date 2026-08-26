# Task 6 Report: Move Department

## Status
DONE

## Commits
- `0b1b09fa32` feat(department): move department with path/level cascade

## Test summary
14 passed (9 service + 5 controller), 45 existing department tests still pass.

## Changes
- `api/services/department_service.py`: added `move_department` static method with cycle check, depth check, default-department guard, and single-transaction path/level cascade via `func.replace`.
- `api/controllers/console/workspace/department.py`: added `DepartmentMovePayload` Pydantic model and `DepartmentMoveApi` resource at `PUT /departments/<uuid:department_id>/move`, owner/admin only.
- `api/tests/unit_tests/services/test_department_move.py`: 9 service-level tests.
- `api/tests/unit_tests/controllers/console/workspace/test_department_move_api.py`: 5 controller-level tests.

## Concerns
None.
