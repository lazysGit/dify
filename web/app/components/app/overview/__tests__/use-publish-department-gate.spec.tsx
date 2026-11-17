import type { ReactNode } from 'react'
import { act, render, renderHook, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMutateAsync = vi.hoisted(() => vi.fn())
const mockUpdateAppSiteStatus = vi.hoisted(() => vi.fn())
const mockSetAppDetail = vi.hoisted(() => vi.fn())
const mockPublishState = vi.hoisted(() => ({
  departments: [] as { id: string, name: string }[],
  isLoading: false,
}))
const mockDeptState = vi.hoisted(() => ({
  tree: [] as { id: string, name: string }[],
  isLoading: false,
}))
const mockFeatures = vi.hoisted(() => ({
  department_access_control: true,
}))
const mockAppDetail = vi.hoisted(() => ({
  current: {
    id: 'app-1',
    enable_site: false,
    name: 'Test App',
  } as { id: string, enable_site: boolean, name: string } | undefined,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/context/global-public-context', () => ({
  useGlobalPublicStore: (selector: (state: { systemFeatures: { department_access_control: boolean } }) => unknown) =>
    selector({ systemFeatures: { department_access_control: mockFeatures.department_access_control } }),
}))

vi.mock('@/app/components/app/store', () => ({
  useStore: (selector: (state: {
    appDetail?: { id: string, enable_site: boolean, name: string }
    setAppDetail: (detail: unknown) => void
  }) => unknown) => selector({
    appDetail: mockAppDetail.current,
    setAppDetail: mockSetAppDetail,
  }),
}))

vi.mock('@/service/apps', () => ({
  updateAppSiteStatus: (...args: unknown[]) => mockUpdateAppSiteStatus(...args),
}))

vi.mock('@/service/use-departments', () => ({
  usePublishDepartments: () => ({
    data: { departments: mockPublishState.departments },
    isLoading: mockPublishState.isLoading,
  }),
  useDepartmentList: () => ({
    data: { tree: mockDeptState.tree },
    isLoading: mockDeptState.isLoading,
  }),
  useUpdatePublishDepartmentsMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

vi.mock('../publish-department-modal', () => ({
  default: ({
    open,
    onOpenChange,
    onSave,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (ids: string[]) => Promise<void>
  }) => {
    if (!open)
      return null
    return (
      <div>
        <button type="button" onClick={() => { void onSave([]) }}>save-empty</button>
        <button type="button" onClick={() => { void onSave(['dept-1']) }}>save-dept</button>
        <button type="button" onClick={() => onOpenChange(false)}>cancel-scope</button>
      </div>
    )
  },
}))

describe('usePublishDepartmentGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFeatures.department_access_control = true
    mockPublishState.departments = []
    mockPublishState.isLoading = false
    mockDeptState.isLoading = false
    mockAppDetail.current = { id: 'app-1', enable_site: false, name: 'Test App' }
    mockMutateAsync.mockResolvedValue({})
    mockUpdateAppSiteStatus.mockResolvedValue({ enable_site: true })
  })

  it('should skip the modal when department access control is off', async () => {
    mockFeatures.department_access_control = false
    const { usePublishDepartmentGate } = await import('../use-publish-department-gate')
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePublishDepartmentGate('app-1'))

    expect(result.current.needsScope).toBe(false)
    await act(async () => {
      await result.current.publishWithScope(onPublish)
    })
    expect(onPublish).toHaveBeenCalledTimes(1)
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('should skip the modal when departments are already published', async () => {
    mockPublishState.departments = [{ id: 'dept-1', name: 'R&D' }]
    const { usePublishDepartmentGate } = await import('../use-publish-department-gate')
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePublishDepartmentGate('app-1'))

    expect(result.current.needsScope).toBe(false)
    await act(async () => {
      await result.current.publishWithScope(onPublish)
    })
    expect(onPublish).toHaveBeenCalledTimes(1)
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('should open the modal and not publish when scope is empty', async () => {
    const { usePublishDepartmentGate } = await import('../use-publish-department-gate')
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePublishDepartmentGate('app-1'))

    expect(result.current.needsScope).toBe(true)
    let publishPromise: Promise<unknown> = Promise.resolve()
    act(() => {
      publishPromise = result.current.publishWithScope(onPublish)
    })
    render(result.current.modal as ReactNode)

    expect(onPublish).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'save-empty' })).toBeInTheDocument()

    act(() => {
      screen.getByRole('button', { name: 'cancel-scope' }).click()
    })
    await act(async () => {
      await publishPromise
    })
    expect(onPublish).not.toHaveBeenCalled()
  })

  it('should publish for personal use without writing departments when saving empty selection', async () => {
    const { usePublishDepartmentGate } = await import('../use-publish-department-gate')
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePublishDepartmentGate('app-1'))

    let publishPromise: Promise<unknown> = Promise.resolve()
    act(() => {
      publishPromise = result.current.publishWithScope(onPublish)
    })
    const { rerender } = render(result.current.modal as ReactNode)
    rerender(result.current.modal as ReactNode)

    await act(async () => {
      screen.getByRole('button', { name: 'save-empty' }).click()
      await publishPromise
    })

    expect(mockUpdateAppSiteStatus).not.toHaveBeenCalled()
    expect(mockMutateAsync).not.toHaveBeenCalled()
    expect(onPublish).toHaveBeenCalledTimes(1)
  })

  it('should enable site then save departments before publishing when a department is selected', async () => {
    const { usePublishDepartmentGate } = await import('../use-publish-department-gate')
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePublishDepartmentGate('app-1'))

    let publishPromise: Promise<unknown> = Promise.resolve()
    act(() => {
      publishPromise = result.current.publishWithScope(onPublish)
    })
    const { rerender } = render(result.current.modal as ReactNode)
    rerender(result.current.modal as ReactNode)

    await act(async () => {
      screen.getByRole('button', { name: 'save-dept' }).click()
      await publishPromise
    })

    expect(mockUpdateAppSiteStatus).toHaveBeenCalledWith({
      url: '/apps/app-1/site-enable',
      body: { enable_site: true },
    })
    expect(mockMutateAsync).toHaveBeenCalledWith({
      params: { id: 'app-1' },
      body: { department_ids: ['dept-1'] },
    })
    expect(onPublish).toHaveBeenCalledTimes(1)
  })

  it('should not enable site when it is already on and a department is selected', async () => {
    mockAppDetail.current = { id: 'app-1', enable_site: true, name: 'Test App' }
    const { usePublishDepartmentGate } = await import('../use-publish-department-gate')
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePublishDepartmentGate('app-1'))

    let publishPromise: Promise<unknown> = Promise.resolve()
    act(() => {
      publishPromise = result.current.publishWithScope(onPublish)
    })
    const { rerender } = render(result.current.modal as ReactNode)
    rerender(result.current.modal as ReactNode)

    await act(async () => {
      screen.getByRole('button', { name: 'save-dept' }).click()
      await publishPromise
    })

    expect(mockUpdateAppSiteStatus).not.toHaveBeenCalled()
    expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    expect(onPublish).toHaveBeenCalledTimes(1)
  })

  it('should not publish while scope queries are loading', async () => {
    mockPublishState.isLoading = true
    const { usePublishDepartmentGate } = await import('../use-publish-department-gate')
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePublishDepartmentGate('app-1'))

    expect(result.current.isScopeLoading).toBe(true)
    await act(async () => {
      await result.current.publishWithScope(onPublish)
    })
    expect(onPublish).not.toHaveBeenCalled()
  })
})
