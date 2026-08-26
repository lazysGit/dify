import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ChatAccessGuard from '@/app/(shareLayout)/components/chat-access-guard'

const mockReplace = vi.fn()
let mockDepartmentAccessEnabled = false

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}))

vi.mock('@/context/global-public-context', () => ({
  useGlobalPublicStore: (selector: (state: { systemFeatures: { department_access_control: { enabled: boolean } } }) => unknown) => {
    return selector({ systemFeatures: { department_access_control: { enabled: mockDepartmentAccessEnabled } } })
  },
}))

vi.mock('@/app/components/base/loading', () => ({
  default: () => <div data-testid="loading">Loading</div>,
}))

describe('ChatAccessGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDepartmentAccessEnabled = false
    globalThis.fetch = vi.fn()
  })

  it('renders children directly when flag is off', async () => {
    mockDepartmentAccessEnabled = false
    render(
      <ChatAccessGuard appCode="code1">
        <div data-testid="child">Chat Content</div>
      </ChatAccessGuard>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('child')).toBeTruthy()
    })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('redirects to signin on 401 response', async () => {
    mockDepartmentAccessEnabled = true
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 401,
      ok: false,
    })

    render(
      <ChatAccessGuard appCode="code1">
        <div data-testid="child">Chat Content</div>
      </ChatAccessGuard>,
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/signin?redirect='))
    })
  })

  it('renders denied page on 403 response', async () => {
    mockDepartmentAccessEnabled = true
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 403,
      ok: false,
    })

    render(
      <ChatAccessGuard appCode="code1">
        <div data-testid="child">Chat Content</div>
      </ChatAccessGuard>,
    )

    await waitFor(() => {
      expect(screen.getByText('common.accessDenied')).toBeTruthy()
    })
    expect(screen.getByText('common.returnToConsole')).toBeTruthy()
  })

  it('renders children on 200 with access=true', async () => {
    mockDepartmentAccessEnabled = true
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve({
        access: true,
        app_info: {
          app_id: 'app-1',
          name: 'Test App',
          icon_type: 'emoji',
          icon: 'robot',
          icon_background: '#FF0000',
          description: 'Test',
          mode: 'chat',
        },
      }),
    })

    render(
      <ChatAccessGuard appCode="code1">
        <div data-testid="child">Chat Content</div>
      </ChatAccessGuard>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('child')).toBeTruthy()
    })
  })

  it('renders denied on 200 with access=false and code=access_denied', async () => {
    mockDepartmentAccessEnabled = true
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve({
        access: false,
        code: 'access_denied',
        message: 'No permission',
      }),
    })

    render(
      <ChatAccessGuard appCode="code1">
        <div data-testid="child">Chat Content</div>
      </ChatAccessGuard>,
    )

    await waitFor(() => {
      expect(screen.getByText('common.accessDenied')).toBeTruthy()
    })
  })

  it('renders not_found on 200 with access=false and code=not_found', async () => {
    mockDepartmentAccessEnabled = true
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve({
        access: false,
        code: 'not_found',
      }),
    })

    render(
      <ChatAccessGuard appCode="code1">
        <div data-testid="child">Chat Content</div>
      </ChatAccessGuard>,
    )

    await waitFor(() => {
      expect(screen.getByText('common.appNotFound')).toBeTruthy()
    })
  })

  it('uses credentials include in fetch request', async () => {
    mockDepartmentAccessEnabled = true
    const mockFetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ access: true, app_info: {} }),
    })
    globalThis.fetch = mockFetch

    render(
      <ChatAccessGuard appCode="code1">
        <div data-testid="child">Chat Content</div>
      </ChatAccessGuard>,
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat-access/verify?app_code=code1'),
        expect.objectContaining({ credentials: 'include' }),
      )
    })
  })
})
