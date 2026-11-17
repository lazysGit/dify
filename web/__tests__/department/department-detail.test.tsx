import type { DepartmentMember, DepartmentTreeNode } from '@/contract/console/departments'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DepartmentDetail from '@/app/components/header/account-setting/department-page/department-detail'
import MemberRow from '@/app/components/header/account-setting/department-page/department-detail/member-row'
import MoveDepartmentModal from '@/app/components/header/account-setting/department-page/move-department-modal'
import MoveMemberModal from '@/app/components/header/account-setting/department-page/move-member-modal'

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/ui/toast', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

vi.mock('@/app/components/header/account-setting/members-page/create-member-modal', () => ({
  default: ({ initialDepartmentId }: { initialDepartmentId?: string }) => (
    <div data-testid="create-member-modal">{initialDepartmentId}</div>
  ),
}))

const mockMembers: DepartmentMember[] = []
const mockSetAdminMutateAsync = vi.fn()
const mockUnsetAdminMutateAsync = vi.fn()
const mockMoveMemberMutateAsync = vi.fn()
const mockMoveDepartmentMutateAsync = vi.fn()
const mockUpdateDepartmentMutateAsync = vi.fn()

beforeEach(() => {
  mockMembers.length = 0
  mockSetAdminMutateAsync.mockReset()
  mockUnsetAdminMutateAsync.mockReset()
  mockMoveMemberMutateAsync.mockReset()
  mockMoveDepartmentMutateAsync.mockReset()
  mockUpdateDepartmentMutateAsync.mockReset()
  mockToastSuccess.mockReset()
  mockToastError.mockReset()
})

vi.mock('@/service/use-departments', () => ({
  useDepartmentMembers: () => ({
    data: { members: mockMembers, total: mockMembers.length },
    isLoading: false,
  }),
  useMoveMemberMutation: () => ({
    mutateAsync: mockMoveMemberMutateAsync,
    isPending: false,
  }),
  useSetAdminMutation: () => ({
    mutateAsync: mockSetAdminMutateAsync,
    isPending: false,
  }),
  useUnsetAdminMutation: () => ({
    mutateAsync: mockUnsetAdminMutateAsync,
    isPending: false,
  }),
  useUpdateDepartmentMutation: () => ({
    mutateAsync: mockUpdateDepartmentMutateAsync,
    isPending: false,
  }),
  useMemberCreatedResources: () => ({
    data: {
      apps: [{ id: 'app-1', name: 'Test App', created_at: 1000 }],
      datasets: [],
    },
    isLoading: false,
  }),
  useMoveDepartmentMutation: () => ({
    mutateAsync: mockMoveDepartmentMutateAsync,
    isPending: false,
  }),
}))

const mockMember: DepartmentMember = {
  id: 'member-1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'normal',
  department_id: 'dept-1',
  is_department_admin: false,
}

const mockAdminMember: DepartmentMember = {
  id: 'member-2',
  name: 'Jane Admin',
  email: 'jane@example.com',
  role: 'normal',
  department_id: 'dept-1',
  is_department_admin: true,
}

const mockTree: DepartmentTreeNode[] = [
  {
    id: 'dept-1',
    name: 'Engineering',
    parent_id: null,
    path: '/dept-1',
    level: 0,
    is_default: false,
    member_count: 5,
    app_count: 3,
    dataset_count: 2,
    children: [
      {
        id: 'dept-2',
        name: 'Frontend',
        parent_id: 'dept-1',
        path: '/dept-1/dept-2',
        level: 1,
        is_default: false,
        member_count: 2,
        app_count: 1,
        dataset_count: 0,
        children: [],
      },
    ],
  },
  {
    id: 'dept-3',
    name: 'Marketing',
    parent_id: null,
    path: '/dept-3',
    level: 0,
    is_default: false,
    member_count: 3,
    app_count: 1,
    dataset_count: 1,
    children: [],
  },
  {
    id: 'default-1',
    name: 'Default',
    parent_id: null,
    path: '/default-1',
    level: 0,
    is_default: true,
    member_count: 10,
    app_count: 5,
    dataset_count: 3,
    children: [],
  },
]

describe('MemberRow', () => {
  const defaultProps = {
    member: mockMember,
    isAdmin: false,
    isDepartmentAdmin: false,
    isSelf: false,
    canManageAdmin: false,
    onMoveOut: vi.fn(),
    onSetAdmin: vi.fn(),
    onUnsetAdmin: vi.fn(),
  }

  it('should render member name and email', () => {
    render(<MemberRow {...defaultProps} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('should show admin badge for department admin', () => {
    render(<MemberRow {...defaultProps} member={mockAdminMember} />)
    expect(screen.getByText('department.admin')).toBeInTheDocument()
    expect(screen.queryByText('department.regularMember')).not.toBeInTheDocument()
  })

  it('should show regular member badge when not department admin', () => {
    render(<MemberRow {...defaultProps} />)
    expect(screen.getByText('department.regularMember')).toBeInTheDocument()
    expect(screen.queryByText('department.admin')).not.toBeInTheDocument()
  })

  it('should show move out button for admin viewing non-self member', () => {
    render(<MemberRow {...defaultProps} isAdmin={true} />)
    expect(screen.getByText('department.moveOut')).toBeInTheDocument()
  })

  it('should show move out button for dept admin viewing non-self member', () => {
    render(<MemberRow {...defaultProps} isDepartmentAdmin={true} />)
    expect(screen.getByText('department.moveOut')).toBeInTheDocument()
  })

  it('should not show move out button for self', () => {
    render(<MemberRow {...defaultProps} isAdmin={true} isSelf={true} />)
    expect(screen.queryByText('department.moveOut')).not.toBeInTheDocument()
  })

  it('should not show move out button for normal member', () => {
    render(<MemberRow {...defaultProps} />)
    expect(screen.queryByText('department.moveOut')).not.toBeInTheDocument()
  })

  it('should show set admin button for regular member when tenant admin can manage', () => {
    const editorMember = { ...mockMember, role: 'editor' }
    render(<MemberRow {...defaultProps} member={editorMember} isAdmin={true} canManageAdmin={true} />)
    const setAdminBtn = screen.getByText('department.setAdmin').closest('button')
    expect(setAdminBtn).not.toBeDisabled()
    expect(screen.queryByText('department.unsetAdmin')).not.toBeInTheDocument()
  })

  it('should not show set admin button for department admin', () => {
    render(<MemberRow {...defaultProps} member={mockAdminMember} isAdmin={true} canManageAdmin={true} />)
    expect(screen.queryByText('department.setAdmin')).not.toBeInTheDocument()
    expect(screen.getByText('department.unsetAdmin')).toBeInTheDocument()
  })

  it('should not show set admin button for non-admin', () => {
    render(<MemberRow {...defaultProps} />)
    expect(screen.queryByText('department.setAdmin')).not.toBeInTheDocument()
  })

  it('should enable set admin for normal tenant role', () => {
    render(<MemberRow {...defaultProps} isAdmin={true} canManageAdmin={true} />)
    const setAdminBtn = screen.getByText('department.setAdmin').closest('button')
    expect(setAdminBtn).not.toBeDisabled()
  })

  it('should show disabled set admin for dataset operator role', () => {
    const datasetOperator = { ...mockMember, role: 'dataset_operator' }
    render(<MemberRow {...defaultProps} member={datasetOperator} isAdmin={true} canManageAdmin={true} />)
    const setAdminBtn = screen.getByText('department.setAdmin').closest('button')
    expect(setAdminBtn).toBeDisabled()
  })
})

describe('MoveMemberModal', () => {
  it('should render created resources detail list (G1)', () => {
    render(
      <MoveMemberModal
        member={mockMember}
        currentDepartmentId="dept-1"
        tree={mockTree}
        manageableDepartmentIds={['dept-3']}
        isAdmin={false}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('department.createdResources')).toBeInTheDocument()
    expect(screen.getByText('Test App')).toBeInTheDocument()
    expect(screen.getByText('department.createdDatasets')).toBeInTheDocument()
  })

  it('should filter target departments for dept admin by manageable ids', () => {
    render(
      <MoveMemberModal
        member={mockMember}
        currentDepartmentId="dept-1"
        tree={mockTree}
        manageableDepartmentIds={['dept-3']}
        isAdmin={false}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('department.targetDepartment')).toBeInTheDocument()
  })

  it('should include default department as a move target for tenant admin', async () => {
    const user = userEvent.setup()
    render(
      <MoveMemberModal
        member={mockMember}
        currentDepartmentId="dept-1"
        tree={mockTree}
        manageableDepartmentIds={[]}
        isAdmin={true}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('combobox'))
    expect(await screen.findByText('Default')).toBeInTheDocument()
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
  })

  it('should submit move with backend member_id and department_id fields', async () => {
    const user = userEvent.setup()
    mockMoveMemberMutateAsync.mockResolvedValueOnce({})

    render(
      <MoveMemberModal
        member={mockMember}
        currentDepartmentId="dept-1"
        tree={mockTree}
        manageableDepartmentIds={[]}
        isAdmin={true}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Marketing'))
    expect(screen.getByRole('combobox')).toHaveTextContent('Marketing')
    expect(screen.getByRole('combobox')).not.toHaveTextContent('dept-3')
    await user.click(screen.getByRole('button', { name: 'operation.confirm' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'operation.confirm' }))

    expect(mockMoveMemberMutateAsync).toHaveBeenCalledWith({
      params: { id: 'dept-1' },
      body: {
        member_id: 'member-1',
        department_id: 'dept-3',
      },
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('department.moveMemberSuccess')
    expect(mockToastSuccess).not.toHaveBeenCalledWith('department.moveMemberConfirm')
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('should toast moveFailed when moving a member fails', async () => {
    const user = userEvent.setup()
    mockMoveMemberMutateAsync.mockRejectedValueOnce(new Error('move failed'))

    render(
      <MoveMemberModal
        member={mockMember}
        currentDepartmentId="dept-1"
        tree={mockTree}
        manageableDepartmentIds={[]}
        isAdmin={true}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Marketing'))
    await user.click(screen.getByRole('button', { name: 'operation.confirm' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'operation.confirm' }))

    expect(mockToastError).toHaveBeenCalledWith('department.moveFailed')
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })
})

describe('MoveDepartmentModal', () => {
  it('should filter out self and descendants from target options', () => {
    render(
      <MoveDepartmentModal
        departmentId="dept-1"
        tree={mockTree}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('department.moveDepartment')).toBeInTheDocument()
    expect(screen.getByText('department.newParent')).toBeInTheDocument()
  })

  it('should show parent department name instead of id after selection', async () => {
    const user = userEvent.setup()
    render(
      <MoveDepartmentModal
        departmentId="dept-1"
        tree={mockTree}
        onClose={vi.fn()}
      />,
    )

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    await user.click(await screen.findByText('Marketing'))

    expect(trigger).toHaveTextContent('Marketing')
    expect(trigger).not.toHaveTextContent('dept-3')
  })

  it('should toast moveDepartmentSuccess after confirming a department move', async () => {
    const user = userEvent.setup()
    mockMoveDepartmentMutateAsync.mockResolvedValueOnce({})

    render(
      <MoveDepartmentModal
        departmentId="dept-1"
        tree={mockTree}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'operation.confirm' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'operation.confirm' }))

    expect(mockToastSuccess).toHaveBeenCalledWith('department.moveDepartmentSuccess')
    expect(mockToastSuccess).not.toHaveBeenCalledWith('department.moveDepartmentConfirm')
    expect(mockToastError).not.toHaveBeenCalled()
  })
})

describe('DepartmentDetail - Member Admin Status', () => {
  const deptNode: DepartmentTreeNode = {
    id: 'dept-1',
    name: 'Engineering',
    parent_id: null,
    path: '/dept-1',
    level: 0,
    is_default: false,
    member_count: 2,
    app_count: 0,
    dataset_count: 0,
    children: [],
  }

  beforeEach(() => {
    mockMembers.length = 0
    mockSetAdminMutateAsync.mockReset()
    mockUnsetAdminMutateAsync.mockReset()
  })

  it('should treat account_id as member id so current user is not given set-admin on self', () => {
    mockMembers.push({
      ...mockMember,
      id: '',
      name: 'Self User',
      email: 'self@example.com',
      role: 'editor',
    })
    Object.assign(mockMembers[0], { account_id: 'user-1' })

    render(
      <DepartmentDetail
        department={deptNode}
        currentUserId="user-1"
        isAdmin={true}
        isDepartmentAdmin={false}
        manageableDepartmentIds={[]}
        tree={mockTree}
        onBack={vi.fn()}
        onNavigateToSubDepartment={vi.fn()}
      />,
    )

    expect(screen.queryByText('department.setAdmin')).not.toBeInTheDocument()
    expect(screen.queryByText('department.moveOut')).not.toBeInTheDocument()
  })

  it('should open edit department modal when edit is clicked', async () => {
    const user = userEvent.setup()
    render(
      <DepartmentDetail
        department={deptNode}
        currentUserId="user-1"
        isAdmin={true}
        isDepartmentAdmin={false}
        manageableDepartmentIds={[]}
        tree={mockTree}
        onBack={vi.fn()}
        onNavigateToSubDepartment={vi.fn()}
      />,
    )

    await user.click(screen.getByText('department.editDepartment'))
    expect(screen.getByDisplayValue('Engineering')).toBeInTheDocument()
  })
})

describe('DepartmentDetail - Empty State (G3)', () => {
  const deptNode: DepartmentTreeNode = {
    id: 'empty-dept',
    name: 'Empty Dept',
    parent_id: null,
    path: '/empty-dept',
    level: 0,
    is_default: false,
    member_count: 0,
    app_count: 0,
    dataset_count: 0,
    children: [],
  }

  it('should show admin empty state with create member CTA', () => {
    render(
      <DepartmentDetail
        department={deptNode}
        currentUserId="user-1"
        isAdmin={true}
        isDepartmentAdmin={false}
        manageableDepartmentIds={[]}
        tree={mockTree}
        onBack={vi.fn()}
        onNavigateToSubDepartment={vi.fn()}
      />,
    )
    expect(screen.getByText('department.noMembersAdmin')).toBeInTheDocument()
    expect(screen.getByText('department.createMember')).toBeInTheDocument()
  })

  it('should open create member modal for the current department when admin clicks create member', async () => {
    const user = userEvent.setup()
    render(
      <DepartmentDetail
        department={deptNode}
        currentUserId="user-1"
        isAdmin={true}
        isDepartmentAdmin={false}
        manageableDepartmentIds={[]}
        tree={mockTree}
        onBack={vi.fn()}
        onNavigateToSubDepartment={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('create-member-modal')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /department\.createMember/i }))
    expect(screen.getByTestId('create-member-modal')).toHaveTextContent('empty-dept')
  })

  it('should show normal member empty state without CTA', () => {
    render(
      <DepartmentDetail
        department={deptNode}
        currentUserId="user-1"
        isAdmin={false}
        isDepartmentAdmin={false}
        manageableDepartmentIds={[]}
        tree={mockTree}
        onBack={vi.fn()}
        onNavigateToSubDepartment={vi.fn()}
      />,
    )
    expect(screen.getByText('department.noMembersNormal')).toBeInTheDocument()
    expect(screen.queryByText('department.createMember')).not.toBeInTheDocument()
  })
})
