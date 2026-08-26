# Task 16 Report: Members Page Refactor

## Status
DONE

## Summary
Refactored the members page to support department filtering, manual member creation, and removed legacy invite UI.

## Changes Made

### Deleted Files
- `web/app/components/header/account-setting/members-page/invite-modal/` (directory)
- `web/app/components/header/account-setting/members-page/invite-button.tsx`
- `web/app/components/header/account-setting/members-page/invited-modal/` (directory)

### Created Files
- `web/app/components/header/account-setting/members-page/create-member-modal/index.tsx`
  - Form fields: name, email, initial password, department Select, tenant role Select
  - Department Select filtered by `manageable_department_ids`
  - Role Select: dept admin sees only editor/normal/dataset_operator; owner/admin sees all roles
  - "Set as department admin" checkbox visible only for owner/admin
- `web/__tests__/department/create-member-modal.test.tsx`
- `web/__tests__/department/members-page-department.test.tsx`

### Modified Files
- `web/app/components/header/account-setting/members-page/index.tsx`
  - Removed invite-related imports/state/modals
  - Added department filter Select using `manageable_department_ids`
  - Added "Create member" button (visible for owner/admin or `is_department_admin`)
  - List items show department breadcrumb (department name after email)
  - Passes `isDepartmentAdmin` to Operation component
- `web/app/components/header/account-setting/members-page/operation/index.tsx`
  - Added `isDepartmentAdmin` prop
  - Dept admin role list excludes 'admin' role
  - Role is readonly (no dropdown) when dept admin views an admin member
- `web/models/common.ts`
  - Added optional `department_id` field to `Member` type
- `web/i18n/en-US/common.json` and `web/i18n/zh-Hans/common.json`
  - Added keys: `members.allDepartments`, `members.createFailed`, `members.createMember`, `members.createMemberTitle`, `members.createSuccess`, `members.department`, `members.initialPassword`, `members.initialPasswordPlaceholder`, `members.namePlaceholder`, `members.selectDepartment`, `members.setAsDepartmentAdmin`
- `web/app/components/header/account-setting/members-page/__tests__/index.spec.tsx`
  - Updated to mock `useDepartmentList` and `create-member-modal`

### V11 Note
The `isInviteLink` reference mentioned in the task spec does not exist in the current codebase (`normal-form.tsx` and `mail-and-password-auth.tsx`). No cleanup needed.

## Test Results
- 14 test files passed, 117 tests passed
- New tests: create-member-modal (5 tests), members-page-department (7 tests)
- Existing members-page tests updated and passing (17 tests)

## Verification
- `pnpm type-check`: PASS
- `pnpm lint:fix`: PASS (0 errors)
- `pnpm test -- --run __tests__/department/ app/components/header/account-setting/members-page/`: PASS (117/117)

## Commits
(to be created)
