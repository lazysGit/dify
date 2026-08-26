import type { AppContextValue } from '@/context/app-context'
import type { DepartmentListResponse } from '@/contract/console/departments'
import type { Member } from '@/models/common'
import { render, screen } from '@testing-library/react'
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

const mockDeptListData: DepartmentListResponse = {
  departments: [
    { id: 'dept-1', name: 'Engineering', parent_id: null, path: '/dept-1', level: 0, is_default: false, member_count: 5, app_count: 3, dataset_count: 2 },
    { id: 'dept-2', name: 'Marketing', parent_id: null, path: '/dept-2', level: 0, is_default: false, member_count: 3, app_count: 1, dataset_count: 1 },
  ],
  tree: [],
  manageable_department_ids: ['dept-1', 'dept-2'],
  is_department_admin: false,
}

describe('MembersPage - Department Features', () => {
  const mockRefetch = vi.fn()

  const mockAccounts: Member[] = [
    {
      id: '1',
      name: 'Owner User',
      email: 'owner@example.com',
      avatar: '',
      avatar_url: '',
      role: 'owner',
      last_active_at: '1731000000',
      last_login_at: '1731000000',
      created_at: '1731000000',
      status: 'active',
      department_id: 'dept-1',
    },
    {
      id: '2',
      name: 'Normal User',
      email: 'normal@example.com',
      avatar: '',
      avatar_url: '',
      role: 'normal',
      last_active_at: '1731000000',
      last_login_at: '1731000000',
      created_at: '1731000000',
      status: 'active',
      department_id: 'dept-2',
    },
  ]

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
      data: mockDeptListData,
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

  it('should render department filter select', () => {
    render(<MembersPage />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
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
    mockDeptListData.is_department_admin = false

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
    mockDeptListData.is_department_admin = true

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

  it('should use manageable_department_ids for filter options', () => {
    mockDeptListData.manageable_department_ids = ['dept-1']
    render(<MembersPage />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
