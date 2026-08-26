import { type } from '@orpc/contract'
import { base } from '../base'

export type Department = {
  id: string
  name: string
  parent_id: string | null
  path: string
  level: number
  is_default: boolean
  member_count: number
  app_count: number
  dataset_count: number
}

export type DepartmentTreeNode = Department & {
  children: DepartmentTreeNode[]
}

export type DepartmentListResponse = {
  departments: Department[]
  tree: DepartmentTreeNode[]
  manageable_department_ids: string[]
  is_department_admin: boolean
}

export type DepartmentMember = {
  id: string
  name: string
  email: string
  role: string
  department_id: string
  is_department_admin: boolean
  avatar?: string
}

export type DepartmentMembersResponse = {
  members: DepartmentMember[]
  total: number
}

export type CreatedResourcesResponse = {
  apps: Array<{ id: string, name: string, created_at: number }>
  datasets: Array<{ id: string, name: string, created_at: number }>
}

export type OperationLog = {
  id: string
  action: string
  target_type: string
  target_id: string
  target_name: string
  operator_id: string
  operator_name: string
  created_at: number
  detail?: Record<string, unknown>
}

export type OperationLogsResponse = {
  logs: OperationLog[]
  total: number
}

export const departmentListContract = base
  .route({
    path: '/workspaces/current/departments',
    method: 'GET',
  })
  .output(type<DepartmentListResponse>())

export const departmentCreateContract = base
  .route({
    path: '/workspaces/current/departments',
    method: 'POST',
  })
  .input(type<{
    body: {
      name: string
      parent_id?: string | null
      description?: string
    }
  }>())
  .output(type<Department>())

export const departmentUpdateContract = base
  .route({
    path: '/departments/{id}',
    method: 'PUT',
  })
  .input(type<{
    params: { id: string }
    body: {
      name?: string
      description?: string
    }
  }>())
  .output(type<unknown>())

export const departmentRemoveContract = base
  .route({
    path: '/departments/{id}',
    method: 'DELETE',
  })
  .input(type<{
    params: { id: string }
  }>())
  .output(type<unknown>())

export const departmentMoveContract = base
  .route({
    path: '/departments/{id}/move',
    method: 'PUT',
  })
  .input(type<{
    params: { id: string }
    body: {
      parent_id: string | null
    }
  }>())
  .output(type<unknown>())

export const departmentMembersContract = base
  .route({
    path: '/departments/{id}/members',
    method: 'GET',
  })
  .input(type<{
    params: { id: string }
  }>())
  .output(type<DepartmentMembersResponse>())

export const departmentMoveMemberContract = base
  .route({
    path: '/departments/{id}/members',
    method: 'PUT',
  })
  .input(type<{
    params: { id: string }
    body: {
      account_ids: string[]
      target_department_id: string
    }
  }>())
  .output(type<unknown>())

export const departmentSetAdminContract = base
  .route({
    path: '/departments/{id}/admins',
    method: 'POST',
  })
  .input(type<{
    params: { id: string }
    body: {
      account_id: string
    }
  }>())
  .output(type<unknown>())

export const departmentUnsetAdminContract = base
  .route({
    path: '/departments/{id}/admins',
    method: 'DELETE',
  })
  .input(type<{
    params: { id: string }
    body: {
      account_id: string
    }
  }>())
  .output(type<unknown>())

export const departmentCreateMemberContract = base
  .route({
    path: '/workspaces/current/members',
    method: 'POST',
  })
  .input(type<{
    body: {
      name: string
      email: string
      password: string
      department_id: string
      role: string
      is_department_admin?: boolean
    }
  }>())
  .output(type<unknown>())

export const departmentTransferAppContract = base
  .route({
    path: '/apps/{id}/transfer-department',
    method: 'PUT',
  })
  .input(type<{
    params: { id: string }
    body: {
      department_id: string
    }
  }>())
  .output(type<unknown>())

export const departmentTransferDatasetContract = base
  .route({
    path: '/datasets/{id}/transfer-department',
    method: 'PUT',
  })
  .input(type<{
    params: { id: string }
    body: {
      department_id: string
    }
  }>())
  .output(type<unknown>())

export const departmentCreatedResourcesContract = base
  .route({
    path: '/workspaces/current/members/{id}/created-resources',
    method: 'GET',
  })
  .input(type<{
    params: { id: string }
  }>())
  .output(type<CreatedResourcesResponse>())

export const departmentOperationLogsContract = base
  .route({
    path: '/workspaces/current/members/{id}/operation-logs',
    method: 'GET',
  })
  .input(type<{
    params: { id: string }
  }>())
  .output(type<OperationLogsResponse>())

export const departmentDepartmentOperationLogsContract = base
  .route({
    path: '/departments/{id}/operation-logs',
    method: 'GET',
  })
  .input(type<{
    params: { id: string }
  }>())
  .output(type<OperationLogsResponse>())

export type PublishDepartment = {
  id: string
  name: string
}

export type PublishDepartmentsResponse = {
  departments: PublishDepartment[]
}

export const departmentPublishAppsContract = base
  .route({
    path: '/apps/{id}/publish-departments',
    method: 'GET',
  })
  .input(type<{
    params: { id: string }
  }>())
  .output(type<PublishDepartmentsResponse>())

export const departmentUpdatePublishAppsContract = base
  .route({
    path: '/apps/{id}/publish-departments',
    method: 'PUT',
  })
  .input(type<{
    params: { id: string }
    body: {
      department_ids: string[]
    }
  }>())
  .output(type<unknown>())

export const departmentRouterContract = {
  list: departmentListContract,
  create: departmentCreateContract,
  update: departmentUpdateContract,
  remove: departmentRemoveContract,
  move: departmentMoveContract,
  members: departmentMembersContract,
  moveMember: departmentMoveMemberContract,
  setAdmin: departmentSetAdminContract,
  unsetAdmin: departmentUnsetAdminContract,
  createMember: departmentCreateMemberContract,
  transferApp: departmentTransferAppContract,
  transferDataset: departmentTransferDatasetContract,
  createdResources: departmentCreatedResourcesContract,
  operationLogs: departmentOperationLogsContract,
  departmentOperationLogs: departmentDepartmentOperationLogsContract,
  publishApps: departmentPublishAppsContract,
  updatePublishApps: departmentUpdatePublishAppsContract,
}
