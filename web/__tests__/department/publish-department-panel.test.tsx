import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PublishDepartmentPanel from '@/app/components/app/overview/publish-department-panel'

const mockMutateAsync = vi.fn()
const mockUseAppContext = vi.hoisted(() => vi.fn(() => ({
  isCurrentWorkspaceManager: true,
  isCurrentWorkspaceEditor: true,
})))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/service/use-departments', () => ({
  useDepartmentList: () => ({
    data: {
      departments: [],
      tree: [
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
          children: [],
        },
      ],
      manageable_department_ids: ['dept-1'],
      is_department_admin: false,
    },
    isLoading: false,
  }),
  usePublishDepartments: () => ({
    data: {
      departments: [
        { id: 'dept-1', name: 'Engineering' },
      ],
    },
    isLoading: false,
  }),
  usePublishableDepartments: () => ({
    data: {
      departments: [
        { id: 'dept-1', name: 'Engineering', is_own_department: false },
      ],
      publish_scope: 'all',
      can_publish_cross_department: true,
    },
    isLoading: false,
  }),
  useUpdatePublishDepartmentsMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

vi.mock('@/context/app-context', () => ({
  useAppContext: () => mockUseAppContext(),
}))

vi.mock('@/app/components/base/loading', () => ({
  default: () => <div data-testid="loading">Loading</div>,
}))

describe('PublishDepartmentPanel', () => {
  beforeEach(() => {
    mockUseAppContext.mockReturnValue({
      isCurrentWorkspaceManager: true,
      isCurrentWorkspaceEditor: true,
    })
  })

  it('should show published department names', () => {
    render(<PublishDepartmentPanel appId="app-1" />)
    expect(screen.getByText('Engineering')).toBeInTheDocument()
  })

  it('should show edit button for manager role as a secondary button', () => {
    render(<PublishDepartmentPanel appId="app-1" />)
    const editButton = screen.getByRole('button', { name: 'department.publishEditButton' })
    expect(editButton).toBeInTheDocument()
    expect(editButton.className).toContain('btn-secondary')
  })

  it('should show edit button for workspace editor who is not manager', () => {
    mockUseAppContext.mockReturnValue({
      isCurrentWorkspaceManager: false,
      isCurrentWorkspaceEditor: true,
    })
    render(<PublishDepartmentPanel appId="app-1" />)
    expect(screen.getByRole('button', { name: 'department.publishEditButton' })).toBeInTheDocument()
  })

  it('should hide edit button for non-editor', () => {
    mockUseAppContext.mockReturnValue({
      isCurrentWorkspaceManager: false,
      isCurrentWorkspaceEditor: false,
    })
    render(<PublishDepartmentPanel appId="app-1" />)
    expect(screen.queryByRole('button', { name: 'department.publishEditButton' })).not.toBeInTheDocument()
  })

  it('should show empty message when no departments published', () => {
    vi.doMock('@/service/use-departments', async () => {
      const actual = await vi.importActual<typeof import('@/service/use-departments')>('@/service/use-departments')
      return {
        ...actual,
        usePublishDepartments: () => ({
          data: { departments: [] },
          isLoading: false,
        }),
      }
    })
  })

  it('should open modal on edit button click', () => {
    render(<PublishDepartmentPanel appId="app-1" />)
    fireEvent.click(screen.getByText('department.publishEditButton'))
    expect(screen.getByText('department.publishModalTitle')).toBeInTheDocument()
  })

  it('should call save with selected department ids', async () => {
    mockMutateAsync.mockResolvedValueOnce({})
    render(<PublishDepartmentPanel appId="app-1" />)
    fireEvent.click(screen.getByText('department.publishEditButton'))

    const saveButton = screen.getByText('operation.save')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        params: { id: 'app-1' },
        body: { department_ids: expect.any(Array) },
      })
    })
  })
})
