import type { DepartmentListResponse } from '@/contract/console/departments'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DepartmentFilterTabs from '@/app/components/apps/department-filter-tabs'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockDepartments: DepartmentListResponse = {
  departments: [
    { id: 'dept-1', name: 'Engineering', parent_id: null, path: '/dept-1', level: 0, is_default: false, member_count: 5, app_count: 3, dataset_count: 2 },
    { id: 'dept-2', name: 'Marketing', parent_id: null, path: '/dept-2', level: 0, is_default: false, member_count: 3, app_count: 1, dataset_count: 4 },
  ],
  tree: [],
  manageable_department_ids: ['dept-1', 'dept-2'],
  is_department_admin: false,
}

vi.mock('@/service/use-departments', () => ({
  useDepartmentList: () => ({
    data: mockDepartments,
  }),
}))

describe('DepartmentFilterTabs', () => {
  it('should render All tab with total count', () => {
    const onDepartmentChange = vi.fn()
    render(<DepartmentFilterTabs selectedDepartmentId={undefined} onDepartmentChange={onDepartmentChange} />)

    expect(screen.getByText(/department\.filter\.all/)).toBeTruthy()
    expect(screen.getByText('(4)')).toBeTruthy()
  })

  it('should render department tabs with individual counts', () => {
    const onDepartmentChange = vi.fn()
    render(<DepartmentFilterTabs selectedDepartmentId={undefined} onDepartmentChange={onDepartmentChange} />)

    expect(screen.getByText('Engineering')).toBeTruthy()
    expect(screen.getByText('(3)')).toBeTruthy()
    expect(screen.getByText('Marketing')).toBeTruthy()
    expect(screen.getByText('(1)')).toBeTruthy()
  })

  it('should call onDepartmentChange when clicking a department tab', async () => {
    const user = userEvent.setup()
    const onDepartmentChange = vi.fn()
    render(<DepartmentFilterTabs selectedDepartmentId={undefined} onDepartmentChange={onDepartmentChange} />)

    await user.click(screen.getByText('Engineering'))
    expect(onDepartmentChange).toHaveBeenCalledWith('dept-1')
  })

  it('should call onDepartmentChange with undefined when clicking All', async () => {
    const user = userEvent.setup()
    const onDepartmentChange = vi.fn()
    render(<DepartmentFilterTabs selectedDepartmentId="dept-1" onDepartmentChange={onDepartmentChange} />)

    await user.click(screen.getByText(/department\.filter\.all/))
    expect(onDepartmentChange).toHaveBeenCalledWith(undefined)
  })

  it('should use dataset_count when resourceType is dataset', () => {
    const onDepartmentChange = vi.fn()
    render(<DepartmentFilterTabs resourceType="dataset" selectedDepartmentId={undefined} onDepartmentChange={onDepartmentChange} />)

    expect(screen.getByText('(6)')).toBeTruthy()
  })
})
