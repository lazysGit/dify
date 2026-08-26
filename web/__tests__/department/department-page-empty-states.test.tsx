import type { DepartmentListResponse } from '@/contract/console/departments'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/search-input', () => ({
  default: () => <input data-testid="search-input" />,
}))

vi.mock('@/app/components/base/button', () => ({
  default: ({ children, ...props }: { children: React.ReactNode, variant?: string }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/app/components/header/account-setting/department-page/department-tree', () => ({
  default: ({ tree }: { tree: unknown[] }) => (
    <div data-testid="dept-tree">
      {tree.length}
      {' nodes'}
    </div>
  ),
}))

vi.mock('@/app/components/header/account-setting/department-page/create-department-modal', () => ({
  default: () => <div data-testid="create-modal" />,
}))

const mockDeptData: DepartmentListResponse = {
  departments: [],
  tree: [],
  manageable_department_ids: [],
  is_department_admin: false,
}

const mockDeptDataWithTree: DepartmentListResponse = {
  departments: [{ id: '1', name: 'Test', parent_id: null, path: '/1', level: 0, is_default: false, member_count: 0, app_count: 0, dataset_count: 0 }],
  tree: [{ id: '1', name: 'Test', parent_id: null, path: '/1', level: 0, is_default: false, member_count: 0, app_count: 0, dataset_count: 0, children: [] }],
  manageable_department_ids: ['1'],
  is_department_admin: false,
}

const mockUseDepartmentList = vi.fn()

vi.mock('@/service/use-departments', () => ({
  useDepartmentList: () => mockUseDepartmentList(),
}))

describe('DepartmentPage Empty States', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should show CTA for admin when no departments', async () => {
    mockUseDepartmentList.mockReturnValue({
      data: mockDeptData,
      isLoading: false,
      isError: false,
    })

    const { default: DepartmentPage } = await import('@/app/components/header/account-setting/department-page')
    render(<DepartmentPage isAdmin={true} isDepartmentAdmin={false} apiFailed={false} />)

    expect(screen.getByText('department.emptyAdmin')).toBeInTheDocument()
    expect(screen.getByText('department.createFirst')).toBeInTheDocument()
  })

  it('should show contact message for dept admin when no departments', async () => {
    mockUseDepartmentList.mockReturnValue({
      data: mockDeptData,
      isLoading: false,
      isError: false,
    })

    const { default: DepartmentPage } = await import('@/app/components/header/account-setting/department-page')
    render(<DepartmentPage isAdmin={false} isDepartmentAdmin={true} apiFailed={false} />)

    expect(screen.getByText('department.emptyDeptAdmin')).toBeInTheDocument()
    expect(screen.queryByText('department.createFirst')).not.toBeInTheDocument()
  })

  it('should show loading spinner when loading', async () => {
    mockUseDepartmentList.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    })

    const { default: DepartmentPage } = await import('@/app/components/header/account-setting/department-page')
    const { container } = render(<DepartmentPage isAdmin={true} isDepartmentAdmin={false} apiFailed={false} />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should show error message when API failed for dept admin', async () => {
    mockUseDepartmentList.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })

    const { default: DepartmentPage } = await import('@/app/components/header/account-setting/department-page')
    render(<DepartmentPage isAdmin={false} isDepartmentAdmin={true} apiFailed={true} />)
    expect(screen.getByText('department.loadFailed')).toBeInTheDocument()
  })

  it('should render tree when data exists', async () => {
    mockUseDepartmentList.mockReturnValue({
      data: mockDeptDataWithTree,
      isLoading: false,
      isError: false,
    })

    const { default: DepartmentPage } = await import('@/app/components/header/account-setting/department-page')
    render(<DepartmentPage isAdmin={true} isDepartmentAdmin={false} apiFailed={false} />)
    expect(screen.getByTestId('dept-tree')).toBeInTheDocument()
  })

  it('should not show create button for non-admin', async () => {
    mockUseDepartmentList.mockReturnValue({
      data: mockDeptDataWithTree,
      isLoading: false,
      isError: false,
    })

    const { default: DepartmentPage } = await import('@/app/components/header/account-setting/department-page')
    render(<DepartmentPage isAdmin={false} isDepartmentAdmin={true} apiFailed={false} />)
    expect(screen.queryByText('department.create')).not.toBeInTheDocument()
  })

  it('should show create button for admin', async () => {
    mockUseDepartmentList.mockReturnValue({
      data: mockDeptDataWithTree,
      isLoading: false,
      isError: false,
    })

    const { default: DepartmentPage } = await import('@/app/components/header/account-setting/department-page')
    render(<DepartmentPage isAdmin={true} isDepartmentAdmin={false} apiFailed={false} />)
    expect(screen.getByText('department.create')).toBeInTheDocument()
  })
})
