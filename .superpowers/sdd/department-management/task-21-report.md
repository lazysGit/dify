# Task 21 Report: Explore Frontend Switch + Publish Management UI

## Status: DONE

## Commits
- 773801b1b5

## Test Summary
- 14 department test files, 129 tests all passing
- 2 new test files: publish-department-panel.test.tsx (5 tests), explore-source-switch.test.tsx (2 tests)
- type-check: pass
- lint: no new errors in modified files

## Changes Made

### Contracts
- `web/contract/console/explore.ts`: Added `exploreDepartmentAppsContract` (GET `/explore/department-apps`)
- `web/contract/console/departments.ts`: Added `departmentPublishAppsContract` (GET) and `departmentUpdatePublishAppsContract` (PUT `/apps/{id}/publish-departments`)
- `web/contract/router.ts`: Added `departmentApps` to explore router
- `web/types/feature.ts`: Added `department_access_control.enabled` to SystemFeatures

### Service Layer
- `web/service/use-departments.ts`: Added `useDepartmentExploreApps()`, `usePublishDepartments()`, `useUpdatePublishDepartmentsMutation()`

### Components
- `web/app/components/explore/app-list/index.tsx`: Flag-based data source switch (department-apps vs explore-apps)
- `web/app/components/app/overview/publish-department-panel/index.tsx`: New panel showing publish status with edit button (hidden for normal/dataset_operator)
- `web/app/components/app/overview/publish-department-modal/index.tsx`: Department tree checkbox multi-select modal
- `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/overview/card-view.tsx`: Mount PublishDepartmentPanel when flag enabled

### i18n
- en-US/common.json: 7 new department.publish* keys
- zh-Hans/common.json: 7 new department.publish* keys

### Tests Fixed
- `web/__tests__/service/use-departments.test.tsx`: Updated route count from 15 to 17
- `web/app/components/base/chat/embedded-chatbot/header/__tests__/index.spec.tsx`: Added department_access_control to SystemFeatures mock

## Concerns
- None
