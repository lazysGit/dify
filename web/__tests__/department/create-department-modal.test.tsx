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
        children: [],
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

  it('should filter out default department from parent options', () => {
    render(<CreateDepartmentModal tree={mockTree} onClose={vi.fn()} />)

    const selectTrigger = screen.getByRole('combobox')
    expect(selectTrigger).toBeInTheDocument()
  })

  it('should show parent department name instead of id after selection', async () => {
    const user = userEvent.setup()
    render(<CreateDepartmentModal tree={mockTree} onClose={vi.fn()} />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    await user.click(await screen.findByText('Engineering'))

    expect(trigger).toHaveTextContent('Engineering')
    expect(trigger).not.toHaveTextContent('dept-1')
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
