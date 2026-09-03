import {
  memberModelWhitelistContract,
  modelPermissionsRouterContract,
  myModelSettingsContract,
  setMemberModelWhitelistContract,
} from '@/contract/console/model_permissions'
import { consoleRouterContract } from '@/contract/router'
import { consoleQuery } from '@/service/client'
import {
  useInvalidateModelWhitelist,
  useMemberModelWhitelist,
  useMyModelSettings,
  useSetMemberWhitelistMutation,
} from '@/service/use-model-permissions'

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
  { name: 'getMemberWhitelist', contract: memberModelWhitelistContract, expectedMethod: 'GET', expectedPath: '/workspaces/current/members/{account_id}/model-whitelist', expectsInput: true },
  { name: 'setMemberWhitelist', contract: setMemberModelWhitelistContract, expectedMethod: 'PUT', expectedPath: '/workspaces/current/members/{account_id}/model-whitelist', expectsInput: true },
  { name: 'getMyModelSettings', contract: myModelSettingsContract, expectedMethod: 'GET', expectedPath: '/account/model-settings', expectsInput: false },
]

describe('model permission contracts', () => {
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

  it('should have exactly 3 routes in modelPermissionsRouterContract', () => {
    expect(Object.keys(modelPermissionsRouterContract)).toHaveLength(3)
  })
})

describe('router registration', () => {
  it('should register modelPermissions in consoleRouterContract', () => {
    expect(consoleRouterContract).toHaveProperty('modelPermissions')
  })

  it('should expose all model permission routes via consoleRouterContract.modelPermissions', () => {
    const permissions = consoleRouterContract.modelPermissions
    expect(permissions).toHaveProperty('getMemberWhitelist')
    expect(permissions).toHaveProperty('setMemberWhitelist')
    expect(permissions).toHaveProperty('getMyModelSettings')
  })
})

describe('queryKey stability', () => {
  it('member whitelist queryKey should be stable for same input', () => {
    const key1 = consoleQuery.modelPermissions.getMemberWhitelist.key({ input: { params: { account_id: 'u-1' } } })
    const key2 = consoleQuery.modelPermissions.getMemberWhitelist.key({ input: { params: { account_id: 'u-1' } } })
    expect(key1).toStrictEqual(key2)
  })

  it('member whitelist queryKey should differ for different input', () => {
    const key1 = consoleQuery.modelPermissions.getMemberWhitelist.key({ input: { params: { account_id: 'u-1' } } })
    const key2 = consoleQuery.modelPermissions.getMemberWhitelist.key({ input: { params: { account_id: 'u-2' } } })
    expect(key1).not.toEqual(key2)
  })

  it('my model settings queryKey should be stable across calls', () => {
    const key1 = consoleQuery.modelPermissions.getMyModelSettings.key()
    const key2 = consoleQuery.modelPermissions.getMyModelSettings.key()
    expect(key1).toStrictEqual(key2)
  })
})

describe('service hooks', () => {
  it('should export all model permission hooks', () => {
    expect(typeof useMemberModelWhitelist).toBe('function')
    expect(typeof useSetMemberWhitelistMutation).toBe('function')
    expect(typeof useMyModelSettings).toBe('function')
    expect(typeof useInvalidateModelWhitelist).toBe('function')
  })
})
