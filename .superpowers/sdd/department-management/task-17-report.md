# Task 17 Report: App/Dataset List Page Department Filter and Transfer

## Status
DONE

## Summary
Implemented department filter tabs, ownership selectors, and transfer modals for both apps and datasets list pages.

## Changes

### New Files
- `web/app/components/apps/department-filter-tabs.tsx` - Reusable tab component for filtering by department (supports both app and dataset counts)
- `web/app/components/apps/transfer-department-modal/index.tsx` - Modal for transferring app/dataset ownership to another department
- `web/__tests__/department/department-filter-tabs.test.tsx` - Tests for filter tabs
- `web/__tests__/department/app-card-transfer-menu.test.tsx` - Tests for app card transfer menu and G4 breadcrumb
- `web/__tests__/department/create-app-department-select.test.tsx` - Tests for create-app-modal department select
- `web/__tests__/department/list-hooks-department-param.test.tsx` - Tests for service hooks department_id passthrough

### Modified Files
- `web/types/app.ts` - Added `department_id` and `department_name` to App type
- `web/models/datasets.ts` - Added `department_id` and `department_name` to DataSet type; added `department_id` to FetchDatasetsParams and DatasetListRequest
- `web/service/use-apps.ts` - Added `department_id` to AppListParams and normalizeAppListParams
- `web/service/knowledge/use-dataset.ts` - Added `department_id` to normalizeDatasetsParams and useDatasetList
- `web/app/components/apps/hooks/use-apps-query-state.ts` - Added `departmentId` to URL query state
- `web/app/components/apps/list.tsx` - Mounted DepartmentFilterTabs, passed department_id to query
- `web/app/components/apps/app-card.tsx` - Added "Transfer department" menu item (manager-only), G4 department breadcrumb
- `web/app/components/explore/create-app-modal/index.tsx` - Added department select for managers, auto-assign hint for normal members
- `web/app/components/datasets/list/index.tsx` - Mounted DepartmentFilterTabs for datasets
- `web/app/components/datasets/list/datasets.tsx` - Accept and pass departmentId
- `web/app/components/datasets/list/dataset-card/index.tsx` - Added transfer department modal
- `web/app/components/datasets/list/dataset-card/operations.tsx` - Added "Transfer department" menu item
- `web/app/components/datasets/list/dataset-card/components/operations-popover.tsx` - Pass through transfer props
- `web/app/components/datasets/list/dataset-card/components/dataset-card-header.tsx` - G4 department breadcrumb
- `web/i18n/en-US/app.json` - Added department-related i18n keys
- `web/i18n/zh-Hans/app.json` - Added department-related i18n keys (Chinese)
- Existing test files updated for new Operations/OperationsPopover props

## Verification
- `pnpm type-check`: PASS
- `pnpm lint`: 54 errors (down from 55 baseline - pre-existing errors only)
- `pnpm test -- __tests__/department/`: 70/70 PASS (11 test files)

## Test Coverage
- Tab renders counts, click changes query state
- Transfer modal target dept range (excludes current department)
- Card renders department breadcrumb (G4)
- Card "Transfer department" entry permission visibility (isCurrentWorkspaceManager gate)
- Create-app-modal department Select admin shows/normal shows auto-assignment prompt
- use-apps/use-dataset pass through department_id param
