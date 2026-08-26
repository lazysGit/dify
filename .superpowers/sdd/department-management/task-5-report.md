# Task 5 Report: Default Department Hooks + CRUD Controllers

## Status
DONE

## Commits
- feat(department): department CRUD APIs and default department on tenant/member creation

## Test Summary
84 passed (22 new department API tests + 62 existing account service tests), 0 failed

## Changes

### Files Modified
1. `api/services/account_service.py`
   - Added `DepartmentService.create_default_department` hook at end of `TenantService.create_tenant` (uses `tenant.id` as `created_by` since no account param available)
   - Modified `create_tenant_member` to accept `department_id: str | None = None`; lazy-creates default department if not passed; applies to both new and reused join branches

2. `api/services/department_service.py`
   - Added `get_department_members` - returns member list with admin status
   - Added `move_member_to_department` - moves member and resets admin flag
   - Added `set_department_admin` - assigns member to dept and sets admin flag
   - Added `remove_department_admin` - clears admin flag

3. `api/controllers/console/__init__.py`
   - Added `department` to workspace imports

4. `api/tests/unit_tests/services/test_account_service.py`
   - Updated `test_create_owner_tenant_if_not_exist_new_user` to mock DepartmentService calls
   - Updated `test_create_tenant_member_success` to mock default department and verify `department_id` assignment

### Files Created
1. `api/controllers/console/workspace/department.py`
   - `DepartmentListApi` (GET/POST) - list with tree/counts/manageable_ids/is_department_admin; create (admin/owner only)
   - `DepartmentApi` (PUT/DELETE) - update/delete (admin/owner only)
   - `DepartmentMemberApi` (GET/PUT) - list members with access control; move member with permission matrix (owner/in-scope dept admin/out-of-scope 403/self-move 400)
   - `DepartmentAdminApi` (POST/DELETE) - set/remove admin (owner only)
   - `DepartmentOperationLogApi` (GET) - audit log query with limit 1-100 validation (admin/owner only)

2. `api/tests/unit_tests/controllers/console/workspace/test_department_api.py`
   - 22 tests covering all endpoints, permission matrices, and edge cases

## Concerns
- `create_tenant` uses `tenant.id` as `created_by` for default department since the method has no `account` parameter. This is a metadata field only and doesn't affect functionality.
