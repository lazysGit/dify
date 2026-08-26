import type { DepartmentListResponse } from '@/contract/console/departments'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CreateMemberModal from '@/app/components/header/account-setting/members-page/create-member-modal'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockDepartments: DepartmentListResponse = {
  departments: [
    { id: 'dept-1', name: 'Engineering', parent_id: null, path: '/dept-1', level: 0, is_default: false, member_count: 5, app_count: 3, dataset_count: 2 },
    { id: 'dept-2', name: 'Marketing', parent_id: null, path: '/dept-2', level: 0, is_default: false, member_count: 3, app_count: 1, dataset_count: 1 },
    { id: 'dept-3', name: 'Sales', parent_id: null, path: '/dept-3', level: 0, is_default: false, member_count: 2, app_count: 0, dataset_count: 0 },
  ],
  tree: [],
  manageable_department_ids: ['dept-1', 'dept-2'],
  is_department_admin: false,
}

const mockMutateAsync = vi.fn()

vi.mock('@/service/use-departments', () => ({
  useDepartmentList: () => ({
    data: mockDepartments,
  }),
  useCreateMemberMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

const mockAppContext = {
  isCurrentWorkspaceOwner: true,
  isCurrentWorkspaceManager: true,
}

vi.mock('@/context/app-context', () => ({
  useAppContext: () => mockAppContext,
}))

vi.mock('@/context/provider-context', () => ({
  useProviderContext: () => ({
    datasetOperatorEnabled: true,
  }),
}))

describe('CreateMemberModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppContext.isCurrentWorkspaceOwner = true
    mockAppContext.isCurrentWorkspaceManager = true
    mockDepartments.is_department_admin = false
    mockDepartments.manageable_department_ids = ['dept-1', 'dept-2']
  })

  it('should render all form fields', () => {
    render(<CreateMemberModal onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(screen.getByText('members.createMemberTitle')).toBeInTheDocument()
    expect(screen.getByText('members.name')).toBeInTheDocument()
    expect(screen.getByText('members.email')).toBeInTheDocument()
    expect(screen.getByText('members.initialPassword')).toBeInTheDocument()
    expect(screen.getByText('members.department')).toBeInTheDocument()
  })

  it('should show set as department admin checkbox for owner/admin', () => {
    render(<CreateMemberModal onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(screen.getByText('members.setAsDepartmentAdmin')).toBeInTheDocument()
  })

  it('should hide set as department admin checkbox for department admin', () => {
    mockAppContext.isCurrentWorkspaceOwner = false
    mockAppContext.isCurrentWorkspaceManager = false
    mockDepartments.is_department_admin = true
    render(<CreateMemberModal onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(screen.queryByText('members.setAsDepartmentAdmin')).not.toBeInTheDocument()
  })

  it('should not render invite entry', () => {
    render(<CreateMemberModal onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(screen.queryByText('members.inviteTeamMember')).not.toBeInTheDocument()
    expect(screen.queryByText('members.sendInvite')).not.toBeInTheDocument()
  })

  it('should call mutateAsync with correct payload on submit', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValueOnce({})
    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(<CreateMemberModal onClose={onClose} onSuccess={onSuccess} />)

    await user.type(screen.getByPlaceholderText('members.namePlaceholder'), 'John Doe')
    await user.type(screen.getByPlaceholderText('members.emailPlaceholder'), 'john@example.com')
    await user.type(screen.getByPlaceholderText('members.initialPasswordPlaceholder'), 'pass123')

    const deptTrigger = screen.getAllByRole('combobox')[0]
    await user.click(deptTrigger)
    const deptOption = await screen.findByText('Engineering')
    await user.click(deptOption)

    const createBtn = screen.getByRole('button', { name: /operation\.create/i })
    await user.click(createBtn)

    expect(mockMutateAsync).toHaveBeenCalledWith({
      body: {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'pass123',
        department_id: 'dept-1',
        role: 'normal',
        is_department_admin: false,
      },
    })
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
