import type { DepartmentListResponse } from '@/contract/console/departments'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CreateAppModal from '@/app/components/explore/create-app-modal'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('ahooks', () => ({
  useDebounceFn: (fn: (...args: unknown[]) => unknown) => ({ run: fn }),
  useKeyPress: () => {},
  useHover: () => false,
}))

const mockDepartments: DepartmentListResponse = {
  departments: [
    { id: 'dept-1', name: 'Engineering', parent_id: null, path: '/dept-1', level: 0, is_default: false, member_count: 5, app_count: 3, dataset_count: 2 },
    { id: 'dept-2', name: 'Marketing', parent_id: null, path: '/dept-2', level: 0, is_default: false, member_count: 3, app_count: 1, dataset_count: 1 },
  ],
  tree: [],
  manageable_department_ids: ['dept-1', 'dept-2'],
  is_department_admin: false,
}

vi.mock('@/service/use-departments', () => ({
  useDepartmentList: () => ({
    data: mockDepartments,
  }),
}))

const mockAppContext = {
  isCurrentWorkspaceManager: true,
}

vi.mock('@/context/app-context', () => ({
  useAppContext: () => mockAppContext,
}))

vi.mock('@/context/provider-context', () => ({
  useProviderContext: () => ({
    plan: { usage: { buildApps: 0 }, total: { buildApps: 10 } },
    enableBilling: false,
  }),
}))

vi.mock('@/app/components/base/app-icon-picker', () => ({
  default: () => null,
}))

const defaultProps = {
  show: true,
  appName: 'Test App',
  appDescription: '',
  appIconType: 'emoji' as const,
  appIcon: '🤖',
  appIconBackground: '#FFF4ED',
  appIconUrl: null,
  onConfirm: vi.fn(),
  onHide: vi.fn(),
}

describe('CreateAppModal Department Select', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppContext.isCurrentWorkspaceManager = true
  })

  it('should show department select for managers', () => {
    render(<CreateAppModal {...defaultProps} />)

    expect(screen.getByText('newApp.captionDepartment')).toBeTruthy()
    const select = screen.getByRole('combobox')
    expect(select).toBeTruthy()
  })

  it('should show auto-assign hint for non-managers', () => {
    mockAppContext.isCurrentWorkspaceManager = false
    render(<CreateAppModal {...defaultProps} />)

    expect(screen.getByText('newApp.departmentAutoAssignHint')).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('should not show department section in edit mode', () => {
    render(<CreateAppModal {...defaultProps} isEditModal />)

    expect(screen.queryByText('newApp.captionDepartment')).toBeNull()
  })

  it('should list departments in select options', () => {
    render(<CreateAppModal {...defaultProps} />)

    expect(screen.getByText('Engineering')).toBeTruthy()
    expect(screen.getByText('Marketing')).toBeTruthy()
  })
})
