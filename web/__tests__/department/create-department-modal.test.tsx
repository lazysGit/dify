import type { DepartmentTreeNode } from '@/contract/console/departments'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CreateDepartmentModal from '@/app/components/header/account-setting/department-page/create-department-modal'

const mockMutateAsync = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/service/use-departments', () => ({
  useCreateDepartmentMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

const mockTree: DepartmentTreeNode[] = [
  {
    id: 'default-1',
    name: 'Default Department',
    parent_id: null,
    path: '/default-1',
    level: 0,
    is_default: true,
    member_count: 10,
    app_count: 5,
    dataset_count: 3,
    children: [],
  },
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
        children: [
          {
            id: 'dept-3',
            name: 'Design System',
            parent_id: 'dept-2',
            path: '/dept-1/dept-2/dept-3',
            level: 2,
            is_default: false,
            member_count: 1,
            app_count: 0,
            dataset_count: 0,
            children: [],
          },
        ],
      },
    ],
  },
]

describe('CreateDepartmentModal', () => {
  it('should render modal with title', () => {
    render(<CreateDepartmentModal tree={mockTree} onClose={vi.fn()} />)
    expect(screen.getByText('department.createTitle')).toBeInTheDocument()
  })

  it('should show name required error on empty submit', async () => {
    render(<CreateDepartmentModal tree={mockTree} onClose={vi.fn()} />)

    const createButton = screen.getByText('operation.create')
    fireEvent.click(createButton)

    expect(screen.getByText('department.nameRequired')).toBeInTheDocument()
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('should call mutation with correct payload on valid submit', async () => {
    mockMutateAsync.mockResolvedValueOnce({})
    render(<CreateDepartmentModal tree={mockTree} onClose={vi.fn()} />)

    const nameInput = screen.getByPlaceholderText('department.namePlaceholder')
    fireEvent.change(nameInput, { target: { value: 'New Department' } })

    const createButton = screen.getByText('operation.create')
    fireEvent.click(createButton)

    expect(mockMutateAsync).toHaveBeenCalledWith({
      body: {
        name: 'New Department',
        parent_id: null,
        description: undefined,
      },
    })
  })

  it('should filter out default department from parent options', async () => {
    const user = userEvent.setup()
    render(<CreateDepartmentModal tree={mockTree} onClose={vi.fn()} />)

    await user.click(screen.getByTestId('parent-department-select'))
    expect(screen.queryByText('Default Department')).not.toBeInTheDocument()
  })

  it('should show parent department name instead of id after selection', async () => {
    const user = userEvent.setup()
    render(<CreateDepartmentModal tree={mockTree} onClose={vi.fn()} />)

    const trigger = screen.getByTestId('parent-department-select')
    await user.click(trigger)
    await user.click(await screen.findByText('Engineering'))

    expect(trigger).toHaveTextContent('Engineering')
    expect(trigger).not.toHaveTextContent('dept-1')
  })

  it('should list nested departments in the parent tree, not only top-level nodes', async () => {
    const user = userEvent.setup()
    render(<CreateDepartmentModal tree={mockTree} onClose={vi.fn()} />)

    await user.click(screen.getByTestId('parent-department-select'))

    expect(screen.getByRole('tree')).toBeInTheDocument()
    expect(screen.getByTestId('department-tree-item-dept-1')).toBeInTheDocument()
    expect(screen.getByTestId('department-tree-item-dept-2')).toBeInTheDocument()
    expect(screen.getByTestId('department-tree-item-dept-3')).toBeInTheDocument()
    expect(screen.queryByText('Default Department')).not.toBeInTheDocument()
  })

  it('should submit a third-level department as parent_id', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValueOnce({})
    render(<CreateDepartmentModal tree={mockTree} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('department.namePlaceholder'), {
      target: { value: 'Leaf Team' },
    })
    await user.click(screen.getByTestId('parent-department-select'))
    await user.click(screen.getByTestId('department-tree-item-dept-3'))
    fireEvent.click(screen.getByText('operation.create'))

    expect(mockMutateAsync).toHaveBeenCalledWith({
      body: {
        name: 'Leaf Team',
        parent_id: 'dept-3',
        description: undefined,
      },
    })
  })

  it('should call onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    render(<CreateDepartmentModal tree={mockTree} onClose={onClose} />)

    fireEvent.click(screen.getByText('operation.cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should clear name error when user types', () => {
    render(<CreateDepartmentModal tree={mockTree} onClose={vi.fn()} />)

    const createButton = screen.getByText('operation.create')
    fireEvent.click(createButton)
    expect(screen.getByText('department.nameRequired')).toBeInTheDocument()

    const nameInput = screen.getByPlaceholderText('department.namePlaceholder')
    fireEvent.change(nameInput, { target: { value: 'A' } })
    expect(screen.queryByText('department.nameRequired')).not.toBeInTheDocument()
  })
})
