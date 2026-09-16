import type { Department, DepartmentListResponse, DepartmentTreeNode } from '@/contract/console/departments'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TransferDepartmentModal from '../index'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

const fullDepartments: Department[] = [engineering, frontend, marketing]
const fullTree: DepartmentTreeNode[] = [
  { ...engineering, children: [{ ...frontend, children: [] }] },
  { ...marketing, children: [] },
]

const mockDepartments: DepartmentListResponse = {
  departments: [...fullDepartments],
  tree: fullTree,
  manageable_department_ids: ['dept-1', 'dept-1-1', 'dept-2'],
  is_department_admin: false,
}

const mockTransferApp = vi.fn()
const mockTransferDataset = vi.fn()

vi.mock('@/service/use-departments', () => ({
  useDepartmentList: () => ({
    data: mockDepartments,
  }),
  useTransferAppMutation: () => ({
    mutateAsync: mockTransferApp,
    isPending: false,
  }),
  useTransferDatasetMutation: () => ({
    mutateAsync: mockTransferDataset,
    isPending: false,
  }),
}))

describe('TransferDepartmentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransferApp.mockResolvedValue({})
    mockTransferDataset.mockResolvedValue({})
    mockDepartments.departments = [...fullDepartments]
    mockDepartments.tree = fullTree
  })

  afterEach(() => {
    mockDepartments.departments = [...fullDepartments]
    mockDepartments.tree = fullTree
  })

  it('should render an inline department tree instead of a flat radio list', () => {
    render(
      <TransferDepartmentModal
        show
        resourceId="app-1"
        resourceType="app"
        currentDepartmentId="dept-1"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    expect(screen.getByText('transferDepartment.title')).toBeInTheDocument()
    expect(screen.getByTestId('transfer-department-tree')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByTestId('department-tree-item-dept-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('department-tree-item-dept-1-1')).toHaveTextContent('Frontend')
    expect(screen.getByTestId('department-tree-item-dept-2')).toHaveTextContent('Marketing')
  })

  it('should keep remaining parent-child nesting when the current department is a sibling', () => {
    render(
      <TransferDepartmentModal
        show
        resourceId="app-1"
        resourceType="app"
        currentDepartmentId="dept-2"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('department-tree-item-dept-2')).not.toBeInTheDocument()
    expect(screen.getByTestId('department-tree-item-dept-1')).toHaveTextContent('Engineering')
    expect(screen.getByTestId('department-tree-item-dept-1-1')).toHaveTextContent('Frontend')
    expect(screen.getByTestId('department-tree-item-dept-1-1').style.paddingLeft).toBe('24px')
  })

  it('should transfer an app to the selected nested department', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    render(
      <TransferDepartmentModal
        show
        resourceId="app-1"
        resourceType="app"
        currentDepartmentId="dept-1"
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    )

    await user.click(screen.getByTestId('department-tree-item-dept-1-1'))
    await user.click(screen.getByRole('button', { name: /operation\.confirm/i }))

    expect(mockTransferApp).toHaveBeenCalledWith({
      params: { id: 'app-1' },
      body: { department_id: 'dept-1-1' },
    })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('should transfer a dataset with the same inline tree', async () => {
    const user = userEvent.setup()
    render(
      <TransferDepartmentModal
        show
        resourceId="ds-1"
        resourceType="dataset"
        currentDepartmentId="dept-1"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    await user.click(screen.getByTestId('department-tree-item-dept-2'))
    await user.click(screen.getByRole('button', { name: /operation\.confirm/i }))

    expect(mockTransferDataset).toHaveBeenCalledWith({
      params: { id: 'ds-1' },
      body: { department_id: 'dept-2' },
    })
  })

  it('should show empty state when no other departments are available', () => {
    mockDepartments.departments = [engineering]
    mockDepartments.tree = [{ ...engineering, children: [] }]

    render(
      <TransferDepartmentModal
        show
        resourceId="app-1"
        resourceType="app"
        currentDepartmentId="dept-1"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    expect(screen.getByText('transferDepartment.noAvailableDepartments')).toBeInTheDocument()
    expect(screen.queryByTestId('transfer-department-tree')).not.toBeInTheDocument()
  })
})
