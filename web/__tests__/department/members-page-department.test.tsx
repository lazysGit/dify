import type { AppContextValue } from '@/context/app-context'
import type { Department, DepartmentListResponse, DepartmentTreeNode } from '@/contract/console/departments'
import type { Member } from '@/models/common'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockProviderContextValue } from '@/__mocks__/provider-context'
import MembersPage from '@/app/components/header/account-setting/members-page/index'
import { useAppContext } from '@/context/app-context'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { useProviderContext } from '@/context/provider-context'
import { useFormatTimeFromNow } from '@/hooks/use-format-time-from-now'
import { useMembers } from '@/service/use-common'
import { useDepartmentList } from '@/service/use-departments'

vi.mock('@/context/app-context')
vi.mock('@/context/global-public-context')
vi.mock('@/context/provider-context')
vi.mock('@/hooks/use-format-time-from-now')
vi.mock('@/service/use-common')
vi.mock('@/service/use-departments')

vi.mock('@/app/components/header/account-setting/members-page/edit-workspace-modal', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => (
    <div>
      <div>Edit Workspace Modal</div>
      <button onClick={onCancel}>Close Edit Workspace</button>
    </div>
  ),
}))
vi.mock('@/app/components/header/account-setting/members-page/operation', () => ({
  default: () => <div>Member Operation</div>,
}))
vi.mock('@/app/components/header/account-setting/members-page/operation/transfer-ownership', () => ({
  default: ({ onOperate }: { onOperate: () => void }) => <button onClick={onOperate}>Transfer ownership</button>,
}))
vi.mock('@/app/components/header/account-setting/members-page/transfer-ownership-modal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div>
      <div>Transfer Ownership Modal</div>
      <button onClick={onClose}>Close Transfer Modal</button>
    </div>
  ),
}))
vi.mock('@/app/components/header/account-setting/members-page/create-member-modal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div>
      <div>Create Member Modal</div>
      <button onClick={onClose}>Close Create Member</button>
    </div>
  ),
}))
vi.mock('@/app/components/billing/upgrade-btn', () => ({
  default: () => <div>Upgrade Button</div>,
}))

function dept(partial: Pick<Department, 'id' | 'name' | 'parent_id' | 'path' | 'level'>): Department {
  return {
    is_default: false,
    member_count: 1,
    app_count: 0,
    dataset_count: 0,
    ...partial,
  }
}

const engineering = dept({ id: 'dept-1', name: 'Engineering', parent_id: null, path: '/dept-1', level: 0 })
const backend = dept({ id: 'dept-1-1', name: 'Backend', parent_id: 'dept-1', path: '/dept-1/dept-1-1', level: 1 })
const marketing = dept({ id: 'dept-2', name: 'Marketing', parent_id: null, path: '/dept-2', level: 0 })

const nestedTree: DepartmentTreeNode[] = [
  { ...engineering, children: [{ ...backend, children: [] }] },
  { ...marketing, children: [] },
]

function createDeptListData(overrides?: Partial<DepartmentListResponse>): DepartmentListResponse {
  return {
    departments: [engineering, backend, marketing],
    tree: nestedTree,
    manageable_department_ids: ['dept-1', 'dept-1-1', 'dept-2'],
    is_department_admin: false,
    ...overrides,
  }
}

function member(partial: Pick<Member, 'id' | 'name' | 'email' | 'role' | 'department_id'>): Member {
  return {
    avatar: '',
    avatar_url: '',
    last_active_at: '1731000000',
    last_login_at: '1731000000',
    created_at: '1731000000',
    status: 'active',
    ...partial,
  }
}

const mockAccounts: Member[] = [
  member({ id: '1', name: 'Owner User', email: 'owner@example.com', role: 'owner', department_id: 'dept-1' }),
  member({ id: '2', name: 'Normal User', email: 'normal@example.com', role: 'normal', department_id: 'dept-2' }),
  member({ id: '3', name: 'Backend User', email: 'backend@example.com', role: 'normal', department_id: 'dept-1-1' }),
]

describe('MembersPage - Department Features', () => {
  const mockRefetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAppContext).mockReturnValue({
      userProfile: { email: 'owner@example.com' },
      currentWorkspace: { name: 'Test Workspace', role: 'owner' } as never,
      isCurrentWorkspaceOwner: true,
      isCurrentWorkspaceManager: true,
    } as unknown as AppContextValue)

    vi.mocked(useMembers).mockReturnValue({
      data: { accounts: mockAccounts },
      refetch: mockRefetch,
    } as never)

    vi.mocked(useDepartmentList).mockReturnValue({
      data: createDeptListData(),
    } as never)

    vi.mocked(useGlobalPublicStore).mockImplementation(selector => selector({
      systemFeatures: { is_email_setup: true },
    } as never))

    vi.mocked(useProviderContext).mockReturnValue(createMockProviderContextValue({
      enableBilling: false,
      isAllowTransferWorkspace: true,
    }))

    vi.mocked(useFormatTimeFromNow).mockReturnValue({
      formatTimeFromNow: vi.fn(() => 'just now'),
    })
  })

  it('should render department filter trigger', () => {
    render(<MembersPage />)
    expect(screen.getByTestId('department-filter')).toBeInTheDocument()
  })

  it('should render create member button for owner/admin', () => {
    render(<MembersPage />)
    const btn = screen.getByRole('button', { name: /members\.createMember/i })
    expect(btn).toBeInTheDocument()
  })

  it('should not render create member button for normal member', () => {
    vi.mocked(useAppContext).mockReturnValue({
      userProfile: { email: 'normal@example.com' },
      currentWorkspace: { name: 'Test Workspace', role: 'normal' } as never,
      isCurrentWorkspaceOwner: false,
      isCurrentWorkspaceManager: false,
    } as unknown as AppContextValue)
    vi.mocked(useDepartmentList).mockReturnValue({
      data: createDeptListData({ is_department_admin: false }),
    } as never)

    render(<MembersPage />)
    expect(screen.queryByRole('button', { name: /members\.createMember/i })).not.toBeInTheDocument()
  })

  it('should show create member button for department admin', () => {
    vi.mocked(useAppContext).mockReturnValue({
      userProfile: { email: 'normal@example.com' },
      currentWorkspace: { name: 'Test Workspace', role: 'normal' } as never,
      isCurrentWorkspaceOwner: false,
      isCurrentWorkspaceManager: false,
    } as unknown as AppContextValue)
    vi.mocked(useDepartmentList).mockReturnValue({
      data: createDeptListData({ is_department_admin: true }),
    } as never)

    render(<MembersPage />)
    const btn = screen.getByRole('button', { name: /members\.createMember/i })
    expect(btn).toBeInTheDocument()
  })

  it('should render department breadcrumb for list items', () => {
    render(<MembersPage />)
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
  })

  it('should not render invite button', () => {
    render(<MembersPage />)
    expect(screen.queryByRole('button', { name: /members\.invite$/i })).not.toBeInTheDocument()
  })

  it('should only show manageable departments in the tree', async () => {
    const user = userEvent.setup()
    vi.mocked(useDepartmentList).mockReturnValue({
      data: createDeptListData({ manageable_department_ids: ['dept-1'] }),
    } as never)

    render(<MembersPage />)
    await user.click(screen.getByTestId('department-filter'))

    expect(screen.getByTestId('department-tree-item-dept-1')).toBeInTheDocument()
    expect(screen.queryByTestId('department-tree-item-dept-2')).not.toBeInTheDocument()
  })

  it('should show department name instead of id after filter selection', async () => {
    const user = userEvent.setup()
    render(<MembersPage />)

    const trigger = screen.getByTestId('department-filter')
    await user.click(trigger)
    await user.click(screen.getByTestId('department-tree-item-dept-1'))

    expect(trigger).toHaveTextContent('Engineering')
    expect(trigger).not.toHaveTextContent('dept-1')
  })

  it('should filter members by name', async () => {
    const user = userEvent.setup()
    render(<MembersPage />)

    await user.type(
      within(screen.getByTestId('member-search')).getByRole('textbox'),
      'Owner',
    )

    expect(screen.getByText('Owner User')).toBeInTheDocument()
    expect(screen.queryByText('Normal User')).not.toBeInTheDocument()
    expect(screen.queryByText('Backend User')).not.toBeInTheDocument()
  })

  it('should filter members by email', async () => {
    const user = userEvent.setup()
    render(<MembersPage />)

    await user.type(
      within(screen.getByTestId('member-search')).getByRole('textbox'),
      'backend@',
    )

    expect(screen.getByText('Backend User')).toBeInTheDocument()
    expect(screen.queryByText('Owner User')).not.toBeInTheDocument()
    expect(screen.queryByText('Normal User')).not.toBeInTheDocument()
  })

  it('should show empty state when search matches nobody', async () => {
    const user = userEvent.setup()
    render(<MembersPage />)

    await user.type(
      within(screen.getByTestId('member-search')).getByRole('textbox'),
      'xyz-no-match',
    )

    expect(screen.getByText(/members\.noMatchingMembers/i)).toBeInTheDocument()
    expect(screen.queryByText('Owner User')).not.toBeInTheDocument()
  })

  it('should show parent and child departments in the tree', async () => {
    const user = userEvent.setup()
    render(<MembersPage />)

    await user.click(screen.getByTestId('department-filter'))

    expect(screen.getByTestId('department-tree-item-dept-1')).toBeInTheDocument()
    expect(screen.getByTestId('department-tree-item-dept-1-1')).toBeInTheDocument()
    expect(screen.getByTestId('department-tree-item-dept-2')).toBeInTheDocument()
  })

  it('should include descendant members when a parent department is selected', async () => {
    const user = userEvent.setup()
    render(<MembersPage />)

    await user.click(screen.getByTestId('department-filter'))
    await user.click(screen.getByTestId('department-tree-item-dept-1'))

    expect(screen.getByText('Owner User')).toBeInTheDocument()
    expect(screen.getByText('Backend User')).toBeInTheDocument()
    expect(screen.queryByText('Normal User')).not.toBeInTheDocument()
  })

  it('should not change selection when expand arrow is clicked', async () => {
    const user = userEvent.setup()
    render(<MembersPage />)

    await user.click(screen.getByTestId('department-filter'))
    const collapseButtons = screen.getAllByRole('button', { name: /department\.collapse/i })
    await user.click(collapseButtons[0])

    expect(screen.getByTestId('department-filter')).toHaveTextContent(/members\.allDepartments/i)
    expect(screen.queryByTestId('department-tree-item-dept-1-1')).not.toBeInTheDocument()
    expect(screen.getByText('Owner User')).toBeInTheDocument()
    expect(screen.getByText('Backend User')).toBeInTheDocument()
    expect(screen.getByText('Normal User')).toBeInTheDocument()
  })

  it('should restore all members when All Departments is selected', async () => {
    const user = userEvent.setup()
    render(<MembersPage />)

    await user.click(screen.getByTestId('department-filter'))
    await user.click(screen.getByTestId('department-tree-item-dept-2'))
    expect(screen.queryByText('Owner User')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('department-filter'))
    await user.click(screen.getByTestId('department-tree-item-all'))

    expect(screen.getByText('Owner User')).toBeInTheDocument()
    expect(screen.getByText('Normal User')).toBeInTheDocument()
    expect(screen.getByText('Backend User')).toBeInTheDocument()
  })

  it('should apply department and keyword filters together', async () => {
    const user = userEvent.setup()
    render(<MembersPage />)

    await user.click(screen.getByTestId('department-filter'))
    await user.click(screen.getByTestId('department-tree-item-dept-1'))
    await user.type(
      within(screen.getByTestId('member-search')).getByRole('textbox'),
      'Backend',
    )

    expect(screen.getByText('Backend User')).toBeInTheDocument()
    expect(screen.queryByText('Owner User')).not.toBeInTheDocument()
    expect(screen.queryByText('Normal User')).not.toBeInTheDocument()
  })
})
