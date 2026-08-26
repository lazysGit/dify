# Task 13 Report: oRPC Contracts and Query Hooks

## Status
DONE

## Commits
10b7d50ce4

## Test Summary
52 tests pass (15 routes x 3 assertions + 1 count + 2 router registration + 4 queryKey stability).

## Changes

### Contract (`web/contract/console/departments.ts`)
- 15 route contracts using `type<...>()` pattern (project convention, not zod)
- Types: `Department`, `DepartmentTreeNode`, `DepartmentListResponse`, `DepartmentMember`, `DepartmentMembersResponse`, `CreatedResourcesResponse`, `OperationLog`, `OperationLogsResponse`
- Exported `departmentRouterContract` grouping all 15 routes

### Router (`web/contract/router.ts`)
- Added `departments: departmentRouterContract` to `consoleRouterContract`

### Service Hooks (`web/service/use-departments.ts`)
- Query hooks: `useDepartmentList`, `useDepartmentMembers`, `useMemberCreatedResources`, `useMemberOperationLogs`, `useDepartmentOperationLogs`
- Mutation hooks: `useCreateDepartmentMutation`, `useUpdateDepartmentMutation`, `useDeleteDepartmentMutation`, `useMoveDepartmentMutation`, `useMoveMemberMutation`, `useSetAdminMutation`, `useUnsetAdminMutation`, `useCreateMemberMutation`, `useTransferAppMutation`, `useTransferDatasetMutation`
- Invalidation helper: `useInvalidateDepartmentList`
- All mutations bind cache invalidation in service layer per project convention

### Tests (`web/__tests__/service/use-departments.test.tsx`)
- Parameterized route tests: 15 routes x 3 assertions (method, path, input schema presence)
- Router registration: verifies `departments` key and all 15 sub-routes
- queryKey stability: structural equality, input differentiation, namespace key

## Concerns
None.
