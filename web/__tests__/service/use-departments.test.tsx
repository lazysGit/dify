import {
  departmentCreateContract,
  departmentCreatedResourcesContract,
  departmentCreateMemberContract,
  departmentDepartmentOperationLogsContract,
  departmentListContract,
  departmentMembersContract,
  departmentMoveContract,
  departmentMoveMemberContract,
  departmentOperationLogsContract,
  departmentRemoveContract,
  departmentRouterContract,
  departmentSetAdminContract,
  departmentTransferAppContract,
  departmentTransferDatasetContract,
  departmentUnsetAdminContract,
  departmentUpdateContract,
} from '@/contract/console/departments'
import { consoleRouterContract } from '@/contract/router'
import { consoleQuery } from '@/service/client'

type RouteSpec = {
  name: string
  contract: unknown
  expectedMethod: string
  expectedPath: string
  expectsInput: boolean
}

const ORPC_KEY = '~orpc' as const

function getRouteMeta(contract: unknown) {
  const orpc = (contract as Record<string, unknown>)[ORPC_KEY] as { route: { method: string, path: string }, inputSchema: unknown } | undefined
  return orpc
}

const routeSpecs: RouteSpec[] = [
  { name: 'list', contract: departmentListContract, expectedMethod: 'GET', expectedPath: '/workspaces/current/departments', expectsInput: false },
  { name: 'create', contract: departmentCreateContract, expectedMethod: 'POST', expectedPath: '/workspaces/current/departments', expectsInput: true },
  { name: 'update', contract: departmentUpdateContract, expectedMethod: 'PUT', expectedPath: '/departments/{id}', expectsInput: true },
  { name: 'remove', contract: departmentRemoveContract, expectedMethod: 'DELETE', expectedPath: '/departments/{id}', expectsInput: true },
  { name: 'move', contract: departmentMoveContract, expectedMethod: 'PUT', expectedPath: '/departments/{id}/move', expectsInput: true },
  { name: 'members', contract: departmentMembersContract, expectedMethod: 'GET', expectedPath: '/departments/{id}/members', expectsInput: true },
  { name: 'moveMember', contract: departmentMoveMemberContract, expectedMethod: 'PUT', expectedPath: '/departments/{id}/members', expectsInput: true },
  { name: 'setAdmin', contract: departmentSetAdminContract, expectedMethod: 'POST', expectedPath: '/departments/{id}/admins', expectsInput: true },
  { name: 'unsetAdmin', contract: departmentUnsetAdminContract, expectedMethod: 'DELETE', expectedPath: '/departments/{id}/admins', expectsInput: true },
  { name: 'createMember', contract: departmentCreateMemberContract, expectedMethod: 'POST', expectedPath: '/workspaces/current/members', expectsInput: true },
  { name: 'transferApp', contract: departmentTransferAppContract, expectedMethod: 'PUT', expectedPath: '/apps/{id}/transfer-department', expectsInput: true },
  { name: 'transferDataset', contract: departmentTransferDatasetContract, expectedMethod: 'PUT', expectedPath: '/datasets/{id}/transfer-department', expectsInput: true },
  { name: 'createdResources', contract: departmentCreatedResourcesContract, expectedMethod: 'GET', expectedPath: '/workspaces/current/members/{id}/created-resources', expectsInput: true },
  { name: 'operationLogs', contract: departmentOperationLogsContract, expectedMethod: 'GET', expectedPath: '/workspaces/current/members/{id}/operation-logs', expectsInput: true },
  { name: 'departmentOperationLogs', contract: departmentDepartmentOperationLogsContract, expectedMethod: 'GET', expectedPath: '/departments/{id}/operation-logs', expectsInput: true },
]

describe('department contracts', () => {
  describe.each(routeSpecs)('$name route', ({ contract, expectedMethod, expectedPath, expectsInput }) => {
    const meta = getRouteMeta(contract)

    it(`should use ${expectedMethod} method`, () => {
      expect(meta?.route.method).toBe(expectedMethod)
    })

    it(`should have path ${expectedPath}`, () => {
      expect(meta?.route.path).toBe(expectedPath)
    })

    it(expectsInput ? 'should have input schema' : 'should not have input schema', () => {
      const hasInput = meta?.inputSchema !== undefined
      expect(hasInput).toBe(expectsInput)
    })
  })

  it('should have exactly 15 routes in departmentRouterContract', () => {
    expect(Object.keys(departmentRouterContract)).toHaveLength(15)
  })
})

describe('router registration', () => {
  it('should register departments in consoleRouterContract', () => {
    expect(consoleRouterContract).toHaveProperty('departments')
  })

  it('should expose all 15 department routes via consoleRouterContract.departments', () => {
    const dept = consoleRouterContract.departments
    const expectedKeys = [
      'list',
      'create',
      'update',
      'remove',
      'move',
      'members',
      'moveMember',
      'setAdmin',
      'unsetAdmin',
      'createMember',
      'transferApp',
      'transferDataset',
      'createdResources',
      'operationLogs',
      'departmentOperationLogs',
    ]
    for (const key of expectedKeys)
      expect(dept).toHaveProperty(key)
  })
})

describe('queryKey stability', () => {
  it('list queryKey should be stable across calls', () => {
    const key1 = consoleQuery.departments.list.key()
    const key2 = consoleQuery.departments.list.key()
    expect(key1).toStrictEqual(key2)
  })

  it('members queryKey should be stable for same input', () => {
    const key1 = consoleQuery.departments.members.key({ input: { params: { id: 'dept-1' } } })
    const key2 = consoleQuery.departments.members.key({ input: { params: { id: 'dept-1' } } })
    expect(key1).toStrictEqual(key2)
  })

  it('members queryKey should differ for different input', () => {
    const key1 = consoleQuery.departments.members.key({ input: { params: { id: 'dept-1' } } })
    const key2 = consoleQuery.departments.members.key({ input: { params: { id: 'dept-2' } } })
    expect(key1).not.toEqual(key2)
  })

  it('namespace key should cover all department routes', () => {
    const nsKey = consoleQuery.departments.key()
    expect(nsKey).toBeDefined()
    expect(Array.isArray(nsKey)).toBe(true)
  })
})
