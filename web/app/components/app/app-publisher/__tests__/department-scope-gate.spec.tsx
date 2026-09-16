import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPublishWithScope = vi.hoisted(() => vi.fn())
const mockUseKeyPress = vi.hoisted(() => vi.fn())
const mockAppDetail = vi.hoisted(() => ({
  id: 'app-1',
  name: 'Test App',
  mode: 'chat',
  site: { app_base_url: 'http://localhost', access_token: 'token' },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ahooks')>()
  return {
    ...actual,
    useKeyPress: (...args: unknown[]) => mockUseKeyPress(...args),
  }
})

vi.mock('@/app/components/app/store', () => ({
  useStore: (selector: (state: { appDetail: typeof mockAppDetail, setAppDetail: () => void }) => unknown) =>
    selector({ appDetail: mockAppDetail, setAppDetail: vi.fn() }),
}))

vi.mock('@/context/global-public-context', () => ({
  useGlobalPublicStore: (selector: (state: { systemFeatures: { webapp_auth: { enabled: boolean } } }) => unknown) =>
    selector({ systemFeatures: { webapp_auth: { enabled: false } } }),
}))

vi.mock('@/app/components/app/overview/use-publish-department-gate', () => ({
  usePublishDepartmentGate: () => ({
    publishWithScope: mockPublishWithScope,
    modal: <div>scope-modal</div> as ReactNode,
    needsScope: true,
    isScopeLoading: false,
    ensureScope: vi.fn(),
  }),
}))

vi.mock('@/service/access-control', () => ({
  useGetUserCanAccessApp: () => ({ data: { result: true }, isLoading: false, refetch: vi.fn() }),
  useAppWhiteListSubjects: () => ({ data: undefined, isLoading: false }),
}))

vi.mock('@/service/explore', () => ({
  fetchInstalledAppList: vi.fn(),
}))

vi.mock('@/service/apps', () => ({
  fetchAppDetailDirect: vi.fn(),
}))

vi.mock('@/hooks/use-async-window-open', () => ({
  useAsyncWindowOpen: () => vi.fn(),
}))

vi.mock('@/hooks/use-format-time-from-now', () => ({
  useFormatTimeFromNow: () => ({ formatTimeFromNow: () => 'now' }),
}))

vi.mock('@/app/components/base/amplitude', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('@/app/components/base/portal-to-follow-elem', () => ({
  PortalToFollowElem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PortalToFollowElemTrigger: ({ children, onClick }: { children: ReactNode, onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
  PortalToFollowElemContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/app/components/app/overview/embedded', () => ({
  default: () => null,
}))

vi.mock('@/app/components/app/app-access-control', () => ({
  default: () => null,
}))

vi.mock('@/app/components/tools/workflow-tool/configure-button', () => ({
  default: () => null,
}))

vi.mock('@/app/components/billing/upgrade-btn', () => ({
  default: () => null,
}))

vi.mock('../suggested-action', () => ({
  default: () => null,
}))

vi.mock('../../workflow/shortcuts-name', () => ({
  default: () => null,
}))

describe('AppPublisher department scope gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPublishWithScope.mockImplementation(async (fn: () => Promise<void>) => {
      await fn()
      return true
    })
  })

  it('should route publish through the department scope gate', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const { default: AppPublisher } = await import('../index')
    render(<AppPublisher onPublish={onPublish} publishedAt={0} />)

    fireEvent.click(screen.getByText('common.publishUpdate'))

    await waitFor(() => {
      expect(mockPublishWithScope).toHaveBeenCalled()
    })
    expect(onPublish).toHaveBeenCalled()
    expect(screen.getByText('scope-modal')).toBeInTheDocument()
  })

  it('should not call onPublish when the scope gate is cancelled', async () => {
    mockPublishWithScope.mockResolvedValue(false)
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const { default: AppPublisher } = await import('../index')
    render(<AppPublisher onPublish={onPublish} publishedAt={0} />)

    fireEvent.click(screen.getByText('common.publishUpdate'))

    await waitFor(() => {
      expect(mockPublishWithScope).toHaveBeenCalled()
    })
    expect(onPublish).not.toHaveBeenCalled()
  })

  it('should route the publish shortcut through the department scope gate', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const { default: AppPublisher } = await import('../index')
    render(<AppPublisher onPublish={onPublish} publishedAt={0} />)

    const shortcutHandler = mockUseKeyPress.mock.calls[0]?.[1] as (e: { preventDefault: () => void }) => void
    shortcutHandler({ preventDefault: vi.fn() })

    await waitFor(() => {
      expect(mockPublishWithScope).toHaveBeenCalled()
    })
    expect(onPublish).toHaveBeenCalled()
  })
})
