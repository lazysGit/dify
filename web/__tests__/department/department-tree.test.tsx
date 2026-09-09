import type { DepartmentTreeNode } from '@/contract/console/departments'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DepartmentTree from '@/app/components/header/account-setting/department-page/department-tree'
import TreeItem from '@/app/components/header/account-setting/department-page/department-tree/tree-item'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const { mockMutateAsync } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/service/use-departments', () => ({
  useDeleteDepartmentMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

vi.mock('@/app/components/base/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockTree: DepartmentTreeNode[] = [
  {
    id: 'root-1',
    name: 'Root Department',
    parent_id: null,
    path: '/root-1',
    level: 0,
    is_default: false,
    member_count: 5,
    app_count: 3,
    dataset_count: 2,
    children: [
      {
        id: 'child-1',
        name: 'Child Department',
        parent_id: 'root-1',
        path: '/root-1/child-1',
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
]

describe('DepartmentTree', () => {
  it('should render all tree nodes', () => {
    render(<DepartmentTree tree={mockTree} isAdmin={false} />)

    expect(screen.getByText('Root Department')).toBeInTheDocument()
    expect(screen.getByText('Child Department')).toBeInTheDocument()
    expect(screen.getByText('Default Department')).toBeInTheDocument()
  })

  it('should render counts for each node', () => {
    render(<DepartmentTree tree={mockTree} isAdmin={false} />)

    const rootItem = screen.getByText('Root Department').closest('[role="treeitem"]')
    expect(rootItem).toHaveTextContent('5')
    expect(rootItem).toHaveTextContent('3')
    expect(rootItem).toHaveTextContent('2')
  })

  it('should return null for empty tree', () => {
    const { container } = render(<DepartmentTree tree={[]} isAdmin={false} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('TreeItem', () => {
  beforeEach(() => {
    mockMutateAsync.mockClear()
  })
  it('should render node name and counts', () => {
    render(
      <TreeItem
        node={mockTree[0]}
        depth={0}
        isAdmin={false}
      />,
    )

    expect(screen.getByText('Root Department')).toBeInTheDocument()
  })

  it('should show default badge for is_default node', () => {
    render(
      <TreeItem
        node={mockTree[1]}
        depth={0}
        isAdmin={false}
      />,
    )

    const badge = screen.getByText('department.default')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-state-accent-solid')
    expect(badge).toHaveClass('text-text-primary-on-surface')
    expect(badge).not.toHaveClass('text-text-accent')
    expect(badge.parentElement).not.toHaveClass('truncate')
  })

  it('should disable delete button for is_default node when admin', () => {
    render(
      <TreeItem
        node={mockTree[1]}
        depth={0}
        isAdmin={true}
      />,
    )

    const deleteButtons = screen.getAllByText('department.delete')
    const deleteButton = deleteButtons[0].closest('button')
    expect(deleteButton).toBeDisabled()
  })

  it('should not show delete button for non-admin', () => {
    render(
      <TreeItem
        node={mockTree[0]}
        depth={0}
        isAdmin={false}
      />,
    )

    expect(screen.queryByText('department.delete')).not.toBeInTheDocument()
  })

  it('should show delete button for admin on non-default node', () => {
    render(
      <TreeItem
        node={mockTree[0]}
        depth={0}
        isAdmin={true}
      />,
    )

    expect(screen.getAllByText('department.delete').length).toBeGreaterThan(0)
  })

  it('should show manage button', () => {
    render(
      <TreeItem
        node={mockTree[0]}
        depth={0}
        isAdmin={false}
      />,
    )

    expect(screen.getAllByText('department.manage').length).toBeGreaterThan(0)
  })

  it('should notify parent after a successful delete so parent does not delete again', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(
      <TreeItem
        node={mockTree[0].children[0]}
        depth={0}
        isAdmin={true}
        onDelete={onDelete}
      />,
    )

    await user.click(screen.getByText('department.delete'))
    await user.click(screen.getByText('operation.confirm'))

    expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('child-1')
  })
})
