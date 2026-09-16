import type { Department, DepartmentListResponse, DepartmentTreeNode } from '@/contract/console/departments'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DepartmentFilterTabs from '@/app/components/apps/department-filter-tabs'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

function dept(partial: Pick<Department, 'id' | 'name' | 'parent_id' | 'path' | 'level' | 'app_count' | 'dataset_count'>): Department {
  return {
    is_default: false,
    member_count: 1,
    ...partial,
  }
}

const engineering = dept({
  id: 'dept-1',
  name: 'Engineering',
  parent_id: null,
  path: '/dept-1',
  level: 0,
  app_count: 3,
  dataset_count: 2,
})
const frontend = dept({
  id: 'dept-1-1',
  name: 'Frontend',
  parent_id: 'dept-1',
  path: '/dept-1/dept-1-1',
  level: 1,
  app_count: 2,
  dataset_count: 1,
})
const marketing = dept({
  id: 'dept-2',
  name: 'Marketing',
  parent_id: null,
  path: '/dept-2',
  level: 0,
  app_count: 1,
  dataset_count: 4,
})

const mockDepartments: DepartmentListResponse = {
  departments: [engineering, frontend, marketing],
  tree: [
    { ...engineering, children: [{ ...frontend, children: [] }] },
    { ...marketing, children: [] },
  ] satisfies DepartmentTreeNode[],
  manageable_department_ids: ['dept-1', 'dept-1-1', 'dept-2'],
  is_department_admin: false,
}

vi.mock('@/service/use-departments', () => ({
  useDepartmentList: () => ({
    data: mockDepartments,
  }),
}))

describe('DepartmentFilterTabs', () => {
  afterEach(() => {
    mockDepartments.manageable_department_ids = ['dept-1', 'dept-1-1', 'dept-2']
  })
  it('should render a closed select with All departments and total app count', () => {
    const onDepartmentChange = vi.fn()
    render(<DepartmentFilterTabs selectedDepartmentId={undefined} onDepartmentChange={onDepartmentChange} />)

    expect(screen.getByTestId('department-filter-select')).toHaveTextContent(/department\.filter\.allDepartments/)
    expect(screen.getByTestId('department-filter-select')).toHaveTextContent('(6)')
    expect(screen.queryByTestId('department-tree-item-dept-1')).not.toBeInTheDocument()
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
  })

  it('should keep department names collapsed until the select is opened', async () => {
    const user = userEvent.setup()
    const onDepartmentChange = vi.fn()
    render(<DepartmentFilterTabs selectedDepartmentId={undefined} onDepartmentChange={onDepartmentChange} />)

    await user.click(screen.getByTestId('department-filter-select'))

    expect(screen.getByTestId('department-tree-item-dept-1')).toHaveTextContent('Engineering')
    expect(screen.getByTestId('department-tree-item-dept-1')).toHaveTextContent('(3)')
    expect(screen.getByTestId('department-tree-item-dept-1-1')).toHaveTextContent('Frontend')
    expect(screen.getByTestId('department-tree-item-dept-1-1')).toHaveTextContent('(2)')
    expect(screen.getByTestId('department-tree-item-dept-2')).toHaveTextContent('Marketing')
    expect(screen.getByTestId('department-tree-item-dept-2')).toHaveTextContent('(1)')
  })

  it('should call onDepartmentChange when selecting a nested department', async () => {
    const user = userEvent.setup()
    const onDepartmentChange = vi.fn()
    render(<DepartmentFilterTabs selectedDepartmentId={undefined} onDepartmentChange={onDepartmentChange} />)

    await user.click(screen.getByTestId('department-filter-select'))
    await user.click(screen.getByTestId('department-tree-item-dept-1-1'))

    expect(onDepartmentChange).toHaveBeenCalledWith('dept-1-1')
  })

  it('should call onDepartmentChange with undefined when selecting All', async () => {
    const user = userEvent.setup()
    const onDepartmentChange = vi.fn()
    render(<DepartmentFilterTabs selectedDepartmentId="dept-1" onDepartmentChange={onDepartmentChange} />)

    expect(screen.getByTestId('department-filter-select')).toHaveTextContent('Engineering')
    expect(screen.getByTestId('department-filter-select')).toHaveTextContent('(3)')

    await user.click(screen.getByTestId('department-filter-select'))
    await user.click(screen.getByTestId('department-tree-item-all'))

    expect(onDepartmentChange).toHaveBeenCalledWith(undefined)
  })

  it('should use dataset_count when resourceType is dataset', async () => {
    const user = userEvent.setup()
    const onDepartmentChange = vi.fn()
    render(<DepartmentFilterTabs resourceType="dataset" selectedDepartmentId={undefined} onDepartmentChange={onDepartmentChange} />)

    expect(screen.getByTestId('department-filter-select')).toHaveTextContent('(7)')

    await user.click(screen.getByTestId('department-filter-select'))

    expect(screen.getByTestId('department-tree-item-dept-1')).toHaveTextContent('(2)')
    expect(screen.getByTestId('department-tree-item-dept-2')).toHaveTextContent('(4)')
  })

  it('should count and list only manageable departments', async () => {
    const user = userEvent.setup()
    mockDepartments.manageable_department_ids = ['dept-1', 'dept-1-1']
    const onDepartmentChange = vi.fn()
    render(<DepartmentFilterTabs selectedDepartmentId={undefined} onDepartmentChange={onDepartmentChange} />)

    expect(screen.getByTestId('department-filter-select')).toHaveTextContent('(5)')

    await user.click(screen.getByTestId('department-filter-select'))

    expect(screen.getByTestId('department-tree-item-dept-1')).toBeInTheDocument()
    expect(screen.getByTestId('department-tree-item-dept-1-1')).toBeInTheDocument()
    expect(screen.queryByTestId('department-tree-item-dept-2')).not.toBeInTheDocument()
  })
})
