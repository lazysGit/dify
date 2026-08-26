# Task 15 Report: Department Detail with Member and Move Management

## Status
DONE

## Commits
- 3e0053e77b

## Test Summary
15 tests passed (1 test file)

## Files Created
1. `web/app/components/header/account-setting/department-page/department-detail/index.tsx` - Main department detail page with back button, title+edit, 3 count cards, member list, sub-department list, G3 empty state
2. `web/app/components/header/account-setting/department-page/department-detail/member-row.tsx` - Member row with role/admin badge, move out, set/unset admin buttons
3. `web/app/components/header/account-setting/department-page/department-detail/sub-department-list.tsx` - Sub-department list component
4. `web/app/components/header/account-setting/department-page/move-member-modal/index.tsx` - Move member modal with G1 created-resources display, target department select
5. `web/app/components/header/account-setting/department-page/move-department-modal/index.tsx` - Move department modal with tree select for new parent
6. `web/__tests__/department/department-detail.test.tsx` - Test file with 15 tests

## i18n Keys Added
Added 27 new department-related i18n keys to `web/i18n/en-US/common.json`

## Test Coverage
- Member row renders name and email
- Admin badge for department admin
- Move out button visibility matrix (admin, dept admin, self, normal)
- Set/unset admin button visibility
- Disabled set admin for non-eligible roles (owner)
- MoveMemberModal renders created resources detail list (G1)
- MoveDepartmentModal filters self and descendants
- DepartmentDetail empty state dual perspective (G3): admin CTA vs normal message

## Verification
- pnpm type-check: PASS
- pnpm lint: PASS (0 errors)
- pnpm test -- department-detail: 15/15 PASS
