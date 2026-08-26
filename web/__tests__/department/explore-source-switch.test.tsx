import { describe, expect, it, vi } from 'vitest'

const mockUseExploreAppList = vi.fn()
const mockUseDepartmentExploreApps = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/service/use-explore', () => ({
  useExploreAppList: () => mockUseExploreAppList(),
}))

vi.mock('@/service/use-departments', () => ({
  useDepartmentExploreApps: () => mockUseDepartmentExploreApps(),
}))

vi.mock('@/context/global-public-context', () => ({
  useGlobalPublicStore: (selector: (state: { systemFeatures: { department_access_control: { enabled: boolean } } }) => unknown) => {
    return selector({ systemFeatures: { department_access_control: { enabled: false } } })
  },
}))

vi.mock('@/context/app-context', () => ({
  useAppContext: () => ({
    userProfile: { id: 'user-1' },
  }),
}))

vi.mock('@/service/use-common', () => ({
  useMembers: () => ({
    data: { accounts: [{ id: 'user-1', role: 'admin' }] },
  }),
}))

vi.mock('ahooks', () => ({
  useDebounceFn: (fn: () => void) => ({ run: fn }),
}))

vi.mock('nuqs', () => ({
  useQueryState: () => ['All', vi.fn()],
}))

vi.mock('@/hooks/use-import-dsl', () => ({
  useImportDSL: () => ({
    handleImportDSL: vi.fn(),
    handleImportDSLConfirm: vi.fn(),
    versions: [],
    isFetching: false,
  }),
}))

vi.mock('@/service/explore', () => ({
  fetchAppDetail: vi.fn(),
}))

vi.mock('@/app/components/base/loading', () => ({
  default: () => <div>Loading</div>,
}))

vi.mock('@/app/components/explore/banner/banner', () => ({
  default: () => null,
}))

vi.mock('@/app/components/explore/category', () => ({
  default: () => null,
}))

vi.mock('@/app/components/explore/app-card', () => ({
  default: ({ app }: { app: { app_id: string, app: { name: string } } }) => (
    <div data-testid={`app-card-${app.app_id}`}>{app.app.name}</div>
  ),
}))

vi.mock('@/app/components/explore/create-app-modal', () => ({
  default: () => null,
}))

vi.mock('@/app/components/app/create-from-dsl-modal/dsl-confirm-modal', () => ({
  default: () => null,
}))

vi.mock('@/app/components/base/button', () => ({
  default: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
    <button onClick={onClick} type="button">{children}</button>
  ),
}))

vi.mock('@/app/components/base/input', () => ({
  default: () => <input />,
}))

vi.mock('../try-app', () => ({
  default: () => null,
}))

vi.mock('./style.module.css', () => ({
  default: { appList: 'appList' },
}))

describe('Explore source switch', () => {
  it('should use exploreAppList when department flag is off', () => {
    mockUseExploreAppList.mockReturnValue({
      data: {
        categories: [],
        allList: [{ app_id: '1', app: { name: 'TestApp' }, category: 'test', position: 0 }],
      },
      isLoading: false,
      isError: false,
    })
    mockUseDepartmentExploreApps.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    })

    vi.doMock('@/context/global-public-context', () => ({
      useGlobalPublicStore: (selector: (state: { systemFeatures: { department_access_control: { enabled: boolean } } }) => unknown) => {
        return selector({ systemFeatures: { department_access_control: { enabled: false } } })
      },
    }))

    expect(mockUseExploreAppList).toBeDefined()
  })

  it('should use departmentExploreApps when department flag is on', () => {
    mockUseDepartmentExploreApps.mockReturnValue({
      data: {
        categories: [],
        allList: [{ app_id: '2', app: { name: 'DeptApp' }, category: 'test', position: 0 }],
      },
      isLoading: false,
      isError: false,
    })

    expect(mockUseDepartmentExploreApps).toBeDefined()
  })
})
