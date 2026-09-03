import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/app/components/base/button', () => ({
  default: ({ children, loading, ...props }: { children: React.ReactNode, loading?: boolean } & Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
}))

const mockUsePublishableDepartments = vi.fn()

vi.mock('@/service/use-departments', () => ({
  usePublishableDepartments: (appId: string) => mockUsePublishableDepartments(appId),
}))

const tree = [
  {
    id: 'd1',
    name: 'Tech',
    parent_id: null,
    path: '/d1',
    level: 0,
    is_default: false,
    member_count: 0,
    app_count: 0,
    dataset_count: 0,
    children: [],
  },
  {
    id: 'd2',
    name: 'Marketing',
    parent_id: null,
    path: '/d2',
    level: 0,
    is_default: false,
    member_count: 0,
    app_count: 0,
    dataset_count: 0,
    children: [],
  },
]

const renderModal = async () => {
  const { default: PublishDepartmentModal } = await import('@/app/components/app/overview/publish-department-modal')
  return render(
    <PublishDepartmentModal
      open={true}
      onOpenChange={() => {}}
      appId="app-1"
      tree={tree}
      selectedIds={[]}
      onSave={vi.fn().mockResolvedValue(undefined)}
      isSaving={false}
    />,
  )
}

describe('publishableDepartments contract', () => {
  const ORPC_KEY = '~orpc' as const

  it('should use GET /apps/{id}/publishable-departments', async () => {
    const { departmentRouterContract } = await import('@/contract/console/departments')
    const meta = (departmentRouterContract.publishableDepartments as unknown as Record<string, unknown>)[ORPC_KEY] as {
      route: { method: string, path: string }
    }
    expect(meta.route.method).toBe('GET')
    expect(meta.route.path).toBe('/apps/{id}/publishable-departments')
  })
})

describe('PublishDepartmentModal role restriction', () => {
  beforeEach(() => {
    vi.resetModules()
    mockUsePublishableDepartments.mockReset()
  })

  it('should disable other departments and show hint for normal user', async () => {
    mockUsePublishableDepartments.mockReturnValue({
      data: {
        departments: [{ id: 'd1', name: 'Tech', is_own_department: true }],
        publish_scope: 'own_department_only',
        can_publish_cross_department: false,
      },
      isLoading: false,
    })
    await renderModal()

    expect(screen.getByRole('checkbox', { name: 'Tech' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: 'Marketing' })).toBeDisabled()
    expect(screen.getByText('publish.own_department_only_hint')).toBeInTheDocument()
  })

  it('should allow all departments for tenant admin', async () => {
    mockUsePublishableDepartments.mockReturnValue({
      data: {
        departments: [
          { id: 'd1', name: 'Tech', is_own_department: true },
          { id: 'd2', name: 'Marketing', is_own_department: false },
        ],
        publish_scope: 'all',
        can_publish_cross_department: true,
      },
      isLoading: false,
    })
    await renderModal()

    expect(screen.getByRole('checkbox', { name: 'Tech' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: 'Marketing' })).toBeEnabled()
    expect(screen.queryByText('publish.own_department_only_hint')).not.toBeInTheDocument()
  })

  it('should disable out-of-scope departments for department admin without hint', async () => {
    mockUsePublishableDepartments.mockReturnValue({
      data: {
        departments: [{ id: 'd1', name: 'Tech', is_own_department: true }],
        publish_scope: 'department_and_subdepartments',
        can_publish_cross_department: true,
      },
      isLoading: false,
    })
    await renderModal()

    expect(screen.getByRole('checkbox', { name: 'Tech' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: 'Marketing' })).toBeDisabled()
    expect(screen.queryByText('publish.own_department_only_hint')).not.toBeInTheDocument()
  })

  it('should not restrict while publishable data is loading', async () => {
    mockUsePublishableDepartments.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    await renderModal()

    expect(screen.getByRole('checkbox', { name: 'Marketing' })).toBeEnabled()
  })
})
