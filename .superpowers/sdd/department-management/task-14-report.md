# Task 14 Report: Settings Dialog DEPARTMENTS Tab + Department Tree

## Status: DONE

## Commits
- (pending commit)

## Test Summary
26 tests passed across 4 test files (department-tree, tab-gating, create-department-modal, department-page-empty-states)

## Files Modified/Created

### Modified:
- `web/app/components/header/account-setting/constants.ts` - Added `DEPARTMENTS = 'departments'`
- `web/app/components/header/account-setting/index.tsx` - Added DEPARTMENTS tab with I9 gating logic
- `web/i18n/en-US/common.json` - Added `settings.departments` and `department.*` keys
- `web/i18n/zh-Hans/common.json` - Added `settings.departments` and `department.*` keys

### Created:
- `web/app/components/header/account-setting/department-page/index.tsx` - Container with search, tree, create button, empty states (G3)
- `web/app/components/header/account-setting/department-page/department-tree/index.tsx` - Tree container
- `web/app/components/header/account-setting/department-page/department-tree/tree-item.tsx` - Recursive tree item with expand/collapse, counts, manage/delete buttons, AlertDialog delete confirmation
- `web/app/components/header/account-setting/department-page/create-department-modal/index.tsx` - Create modal with name/parent/description fields
- `web/__tests__/department/department-tree.test.tsx` - Tree rendering tests
- `web/__tests__/department/departments-tab-gating.test.tsx` - Tab gating tests (admin/dept admin/normal/operator)
- `web/__tests__/department/create-department-modal.test.tsx` - Create modal tests
- `web/__tests__/department/department-page-empty-states.test.tsx` - Empty state tests

## Implementation Details

### I9 Tab Gating:
- Checks `isCurrentWorkspaceManager` first (admin/owner see directly)
- Then checks `useDepartmentList().is_department_admin` (from API response)
- API failure fallback: admin still visible, dept admin shows "Load failed, please refresh"
- Dataset operator never sees the tab

### G3 Empty States:
- No departments, admin view: "+ Create first department" CTA button
- No departments, dept admin view: "Please contact tenant admin to create department"

### Tree Component:
- Recursive `TreeItem` with expand/collapse
- Each node shows: name, member/app/dataset counts
- [Manage] button on all nodes
- [Delete] button only for admin, disabled for is_default nodes
- Delete confirmation via `AlertDialog` with proper message

### Create Modal:
- Name (required, with validation)
- Parent department (tree Select, filtered to exclude is_default)
- Description (optional)
- Uses `useCreateDepartmentMutation` for API call

## Verification
- `pnpm type-check`: PASS
- `pnpm lint`: PASS (0 errors)
- `pnpm test -- __tests__/department/`: 26/26 PASS
