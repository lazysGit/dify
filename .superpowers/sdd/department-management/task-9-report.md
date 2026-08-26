# Task 9 Report: Admin Manual Member Creation

## Status
DONE

## Commits
(pending)

## Test Summary
11/11 tests passed (8 service + 3 mail task)

## Files Modified/Created
- Modified: `api/services/errors/account.py` - Added `AccountEmailAlreadyInUseError`
- Modified: `api/services/account_service.py` - Added `RegisterService.create_member_by_admin` and `_operator_is_tenant_admin`
- Created: `api/tasks/mail_member_created_task.py` - Celery task for welcome email
- Created: `api/tests/unit_tests/services/test_create_member_by_admin.py` - 8 tests
- Created: `api/tests/unit_tests/tasks/test_mail_member_created_task.py` - 3 tests

## Implementation Notes
- Email uniqueness check: queries `Account.query.filter_by(email=email)` globally (any tenant, including PENDING)
- Password validation: uses `valid_password` (>=8 chars with letters and numbers) - intentional deviation R9
- Department admin restrictions: non-admin operators can only assign editor/normal/dataset_operator roles, and department_id must be in their manageable scope
- `TenantService.switch_tenant` called after `create_tenant_member` to set `current=True` (R5)
- Audit log via `DepartmentAuditLog.log` with action `create_member`
- Mail task: `send_member_created_mail_task` on queue="mail", guards with `mail.is_inited()`, uses `send_raw_email`
- R10: plaintext password only passed to mail task kwargs for email content; not logged

## Concerns
None
