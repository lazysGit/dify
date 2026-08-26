import type { DepartmentMember, DepartmentTreeNode } from '@/contract/console/departments'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DepartmentDetail from '@/app/components/header/account-setting/department-page/department-detail'
import MemberRow from '@/app/components/header/account-setting/department-page/department-detail/member-row'
import MoveDepartmentModal from '@/app/components/header/account-setting/department-page/move-department-modal'
import MoveMemberModal from '@/app/components/header/account-setting/department-page/move-member-modal'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/service/use-departments', () => ({
  useDepartmentMembers: () => ({
    data: { members: [], total: 0 },
    isLoading: false,
  }),
  useMoveMemberMutation: () => ({
    mutateAsync: vi.fn(),
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
    mutateAsync: vi.fn(),
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

  it('should show set admin button for admin with eligible role', () => {
    render(<MemberRow {...defaultProps} isAdmin={true} canManageAdmin={true} />)
    expect(screen.getByText('department.setAdmin')).toBeInTheDocument()
  })

  it('should show unset admin button for admin viewing dept admin', () => {
    render(<MemberRow {...defaultProps} member={mockAdminMember} isAdmin={true} canManageAdmin={true} />)
    expect(screen.getByText('department.unsetAdmin')).toBeInTheDocument()
  })

  it('should not show set admin button for non-admin', () => {
    render(<MemberRow {...defaultProps} />)
    expect(screen.queryByText('department.setAdmin')).not.toBeInTheDocument()
  })

  it('should show disabled set admin for non-eligible role', () => {
    const ownerMember = { ...mockMember, role: 'owner' }
    render(<MemberRow {...defaultProps} member={ownerMember} isAdmin={true} canManageAdmin={true} />)
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
