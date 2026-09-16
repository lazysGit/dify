import type { Department, DepartmentListResponse, DepartmentTreeNode } from '@/contract/console/departments'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CreateMemberModal from '@/app/components/header/account-setting/members-page/create-member-modal'
import { encryptPassword } from '@/utils/encryption'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { password?: string }) => (
      options?.password ? `${key} ${options.password}` : key
    ),
  }),
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
const frontend = dept({ id: 'dept-1-1', name: 'Frontend', parent_id: 'dept-1', path: '/dept-1/dept-1-1', level: 1 })
const marketing = dept({ id: 'dept-2', name: 'Marketing', parent_id: null, path: '/dept-2', level: 0 })
const sales = dept({ id: 'dept-3', name: 'Sales', parent_id: null, path: '/dept-3', level: 0 })

const mockDepartments: DepartmentListResponse = {
  departments: [engineering, frontend, marketing, sales],
  tree: [
    { ...engineering, children: [{ ...frontend, children: [] }] },
    { ...marketing, children: [] },
    { ...sales, children: [] },
  ] satisfies DepartmentTreeNode[],
  manageable_department_ids: ['dept-1', 'dept-1-1', 'dept-2'],
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
  useInitialMemberPassword: () => ({
    data: { password: 'Dify1234' },
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
    mockDepartments.manageable_department_ids = ['dept-1', 'dept-1-1', 'dept-2']
  })

  it('should render all form fields', () => {
    render(<CreateMemberModal onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(screen.getByText('members.createMemberTitle')).toBeInTheDocument()
    expect(screen.getByText('members.name')).toBeInTheDocument()
    expect(screen.getByText('members.email')).toBeInTheDocument()
    expect(screen.getByText('members.initialPassword')).toBeInTheDocument()
    expect(screen.getByText(/members.initialPasswordHint/)).toBeInTheDocument()
    expect(screen.getByText('members.department')).toBeInTheDocument()
  })

  it('should prefill department when initialDepartmentId is provided', async () => {
    render(
      <CreateMemberModal
        initialDepartmentId="dept-1"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )
    expect(screen.getByTestId('create-member-department-select')).toHaveTextContent('Engineering')
  })

  it('should keep nested departments collapsed until the tree select is opened', () => {
    render(<CreateMemberModal onClose={vi.fn()} onSuccess={vi.fn()} />)

    expect(screen.getByTestId('create-member-department-select')).toHaveTextContent('members.selectDepartment')
    expect(screen.queryByTestId('department-tree-item-dept-1')).not.toBeInTheDocument()
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
  })

  it('should show nested departments as a tree and hide unmanageable ones', async () => {
    const user = userEvent.setup()
    render(<CreateMemberModal onClose={vi.fn()} onSuccess={vi.fn()} />)

    await user.click(screen.getByTestId('create-member-department-select'))

    expect(screen.getByTestId('department-tree-item-dept-1')).toHaveTextContent('Engineering')
    expect(screen.getByTestId('department-tree-item-dept-1-1')).toHaveTextContent('Frontend')
    expect(screen.getByTestId('department-tree-item-dept-2')).toHaveTextContent('Marketing')
    expect(screen.queryByTestId('department-tree-item-dept-3')).not.toBeInTheDocument()
    expect(screen.queryByText('Sales')).not.toBeInTheDocument()
    expect(screen.queryByTestId('department-tree-item-all')).not.toBeInTheDocument()
  })

  it('should prefill initial password from system config', async () => {
    render(<CreateMemberModal onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(await screen.findByDisplayValue('Dify1234')).toBeInTheDocument()
  })

  it('should display the default password in the hint under the input', async () => {
    render(<CreateMemberModal onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(await screen.findByText('members.initialPasswordHint Dify1234')).toBeInTheDocument()
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

  it('should show department name and role label instead of raw ids after selection', async () => {
    const user = userEvent.setup()
    render(<CreateMemberModal onClose={vi.fn()} onSuccess={vi.fn()} />)

    const deptTrigger = screen.getByTestId('create-member-department-select')
    const roleTrigger = screen.getByRole('combobox')
    expect(roleTrigger).toHaveTextContent('members.normal')
    expect(roleTrigger).not.toHaveTextContent('dataset_operator')

    await user.click(deptTrigger)
    await user.click(screen.getByTestId('department-tree-item-dept-1'))

    expect(deptTrigger).toHaveTextContent('Engineering')
    expect(deptTrigger).not.toHaveTextContent('dept-1')
  })

  it('should call mutateAsync with correct payload on submit', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValueOnce({})
    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(<CreateMemberModal onClose={onClose} onSuccess={onSuccess} />)

    await user.type(screen.getByPlaceholderText('members.namePlaceholder'), 'John Doe')
    await user.type(screen.getByPlaceholderText('members.emailPlaceholder'), 'john@example.com')
    const passwordInput = screen.getByPlaceholderText('members.initialPasswordPlaceholder')
    await user.clear(passwordInput)
    await user.type(passwordInput, 'pass123')

    await user.click(screen.getByTestId('create-member-department-select'))
    await user.click(screen.getByTestId('department-tree-item-dept-1-1'))

    const createBtn = screen.getByRole('button', { name: /operation\.create/i })
    await user.click(createBtn)

    expect(mockMutateAsync).toHaveBeenCalledWith({
      body: {
        name: 'John Doe',
        email: 'john@example.com',
        password: encryptPassword('pass123'),
        department_id: 'dept-1-1',
        role: 'normal',
        is_department_admin: false,
      },
    })
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('should submit the prefilled default password when it is not edited', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValueOnce({})
    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(<CreateMemberModal onClose={onClose} onSuccess={onSuccess} />)

    await user.type(screen.getByPlaceholderText('members.namePlaceholder'), 'Jane Doe')
    await user.type(screen.getByPlaceholderText('members.emailPlaceholder'), 'jane@example.com')

    await user.click(screen.getByTestId('create-member-department-select'))
    await user.click(screen.getByTestId('department-tree-item-dept-1'))

    await user.click(screen.getByRole('button', { name: /operation\.create/i }))

    expect(mockMutateAsync).toHaveBeenCalledWith({
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: encryptPassword('Dify1234'),
        department_id: 'dept-1',
        role: 'normal',
        is_department_admin: false,
      },
    })
  })
})
