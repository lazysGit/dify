# Task 4 Report: DepartmentService Core

## Status
DONE

## Commits
- d3ff6645bf feat(department): add DepartmentService with tree CRUD, scope helpers and audit

## Test Summary
23 passed, 0 failed in ~29s

## Files Created/Modified
- Created: `api/services/errors/department.py` (13 lines)
- Modified: `api/services/errors/__init__.py` (added department export)
- Created: `api/services/department_service.py` (381 lines)
- Created: `api/tests/unit_tests/services/test_department_service.py` (485 lines)

## Implementation Notes
- All methods are `@staticmethod` following AccountService pattern
- `DepartmentAuditLog` class handles audit log write/query via OperationLog model
- `DepartmentService` implements full tree CRUD with I8 extensible check list pattern for delete
- `get_accessible_department_ids` returns None for admin/owner (unlimited), list for others
- `assert_department_access` includes I1 cross-tenant protection via `resource_tenant_id` param
- `resource_department_filter` uses `func.coalesce` to handle NULL department_id consistently
- `create_default_department` handles IntegrityError with retry-on-existing pattern (R6)
- `get_departments_with_counts` uses coalesce for app/dataset counts matching list filter semantics
- All queries include `tenant_id` filter for tenant isolation

## Concerns
None
