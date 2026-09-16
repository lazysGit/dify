import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AuthenticatedLayout from '@/app/(shareLayout)/components/authenticated-layout'
import { isChatbotPath } from '@/app/(shareLayout)/components/embed-access'
import Splash from '@/app/(shareLayout)/components/splash'

const mockSetWebAppPassport = vi.fn()
const mockWebAppLoginStatus = vi.fn()
const mockFetchAccessToken = vi.fn()
const mockUpdateAppInfo = vi.fn()
const mockUpdateAppParams = vi.fn()
const mockUpdateWebAppMeta = vi.fn()
const mockUpdateUserCanAccessApp = vi.fn()

let mockPathname = '/chatbot/code1'
let mockSearchParams = new URLSearchParams()
let mockDepartmentAccessEnabled = true
let mockShareCode: string | null = 'code1'
let mockAppInfoError: Error | null = null
let mockAppParamsError: Error | null = null

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@/context/global-public-context', () => ({
  useGlobalPublicStore: (selector: (state: { systemFeatures: { department_access_control: boolean } }) => unknown) => {
    return selector({ systemFeatures: { department_access_control: mockDepartmentAccessEnabled } })
  },
}))

vi.mock('@/context/web-app-context', () => ({
  useWebAppStore: (selector: (state: {
    shareCode: string | null
    webAppAccessMode: string | null
    embeddedUserId: string | null
    updateAppInfo: typeof mockUpdateAppInfo
    updateAppParams: typeof mockUpdateAppParams
    updateWebAppMeta: typeof mockUpdateWebAppMeta
    updateUserCanAccessApp: typeof mockUpdateUserCanAccessApp
  }) => unknown) => {
    return selector({
      shareCode: mockShareCode,
      webAppAccessMode: null,
      embeddedUserId: null,
      updateAppInfo: mockUpdateAppInfo,
      updateAppParams: mockUpdateAppParams,
      updateWebAppMeta: mockUpdateWebAppMeta,
      updateUserCanAccessApp: mockUpdateUserCanAccessApp,
    })
  },
}))

vi.mock('@/service/webapp-auth', () => ({
  setWebAppAccessToken: vi.fn(),
  setWebAppPassport: (...args: unknown[]) => mockSetWebAppPassport(...args),
  webAppLoginStatus: (...args: unknown[]) => mockWebAppLoginStatus(...args),
  webAppLogout: vi.fn(),
}))

vi.mock('@/service/share', () => ({
  fetchAccessToken: (...args: unknown[]) => mockFetchAccessToken(...args),
}))

vi.mock('@/app/(shareLayout)/components/chat-access-guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chat-access-guard">{children}</div>
  ),
}))

vi.mock('@/app/components/base/loading', () => ({
  default: () => <div data-testid="loading">Loading</div>,
}))

vi.mock('@/service/use-share', () => ({
  useGetWebAppInfo: () => ({
    isFetching: false,
    data: null,
    error: mockAppInfoError,
  }),
  useGetWebAppParams: () => ({
    isFetching: false,
    data: null,
    error: mockAppParamsError,
  }),
  useGetWebAppMeta: () => ({
    isFetching: false,
    data: {},
    error: null,
  }),
}))

vi.mock('@/service/access-control', () => ({
  useGetUserCanAccessApp: () => ({
    data: { result: true },
    error: null,
  }),
}))

describe('isChatbotPath', () => {
  it('returns true when pathname starts with /chatbot', () => {
    expect(isChatbotPath('/chatbot')).toBe(true)
    expect(isChatbotPath('/chatbot/code1')).toBe(true)
  })

  it('returns false for /chat and other paths', () => {
    expect(isChatbotPath('/chat/code1')).toBe(false)
    expect(isChatbotPath('/webapp-signin')).toBe(false)
  })
})

describe('Splash embed token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname = '/chatbot/code1'
    mockSearchParams = new URLSearchParams()
    mockDepartmentAccessEnabled = true
    mockShareCode = 'code1'
    mockAppInfoError = null
    mockAppParamsError = null
    mockWebAppLoginStatus.mockResolvedValue({ userLoggedIn: true, appLoggedIn: true })
  })

  it('writes embed passport before children first render on chatbot path when ACL is on', () => {
    mockSearchParams = new URLSearchParams('embed_token=jwt')
    let passportCallsOnChildFirstRender: unknown[][] | undefined

    const Child = () => {
      if (passportCallsOnChildFirstRender === undefined)
        passportCallsOnChildFirstRender = [...mockSetWebAppPassport.mock.calls]
      return <div data-testid="child">Chat Content</div>
    }

    render(
      <Splash>
        <Child />
      </Splash>,
    )

    expect(screen.getByTestId('child')).toBeTruthy()
    expect(passportCallsOnChildFirstRender).toEqual([['code1', 'jwt']])
    expect(screen.queryByTestId('chat-access-guard')).toBeNull()
    expect(mockWebAppLoginStatus).not.toHaveBeenCalled()
    expect(mockFetchAccessToken).not.toHaveBeenCalled()
  })

  it('keeps loading when embed_token is present but shareCode is not ready', () => {
    mockShareCode = null
    mockSearchParams = new URLSearchParams('embed_token=jwt')

    render(
      <Splash>
        <div data-testid="child">Chat Content</div>
      </Splash>,
    )

    expect(screen.getByTestId('loading')).toBeTruthy()
    expect(screen.queryByTestId('child')).toBeNull()
    expect(mockSetWebAppPassport).not.toHaveBeenCalled()
  })

  it('shows embed invalid copy without guard when ACL is on and chatbot path has no token', async () => {
    render(
      <Splash>
        <div data-testid="child">Chat Content</div>
      </Splash>,
    )

    await waitFor(() => {
      expect(screen.getByText('common.embedLinkInvalid')).toBeTruthy()
    })
    expect(screen.queryByTestId('chat-access-guard')).toBeNull()
    expect(mockWebAppLoginStatus).not.toHaveBeenCalled()
    expect(mockSetWebAppPassport).not.toHaveBeenCalled()
  })

  it('keeps ChatAccessGuard on /chat even when embed_token is present', async () => {
    mockPathname = '/chat/code1'
    mockSearchParams = new URLSearchParams('embed_token=jwt')

    render(
      <Splash>
        <div data-testid="child">Chat Content</div>
      </Splash>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('chat-access-guard')).toBeTruthy()
    })
    expect(mockSetWebAppPassport).not.toHaveBeenCalledWith('code1', 'jwt')
  })

  it('does not show invalid page or force passport write on chatbot path when ACL is off', async () => {
    mockDepartmentAccessEnabled = false
    mockSearchParams = new URLSearchParams('embed_token=jwt')

    render(
      <Splash>
        <div data-testid="child">Chat Content</div>
      </Splash>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('child')).toBeTruthy()
    })
    expect(screen.queryByText('common.embedLinkInvalid')).toBeNull()
    expect(screen.queryByTestId('chat-access-guard')).toBeNull()
    expect(mockSetWebAppPassport).not.toHaveBeenCalledWith('code1', 'jwt')
    expect(mockWebAppLoginStatus).toHaveBeenCalled()
  })
})

describe('AuthenticatedLayout embed invalid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname = '/chatbot/code1'
    mockSearchParams = new URLSearchParams()
    mockShareCode = 'code1'
    mockAppInfoError = null
    mockAppParamsError = null
  })

  it('shows embed invalid copy on chatbot path when app info fails', () => {
    mockAppInfoError = new Error('generic unknown reason')

    render(
      <AuthenticatedLayout>
        <div data-testid="child">Chat Content</div>
      </AuthenticatedLayout>,
    )

    expect(screen.getByText('common.embedLinkInvalid')).toBeTruthy()
    expect(screen.queryByText('generic unknown reason')).toBeNull()
  })

  it('shows embed invalid copy on chatbot path when app params fail', () => {
    mockAppParamsError = new Error('params unknown reason')

    render(
      <AuthenticatedLayout>
        <div data-testid="child">Chat Content</div>
      </AuthenticatedLayout>,
    )

    expect(screen.getByText('common.embedLinkInvalid')).toBeTruthy()
    expect(screen.queryByText('params unknown reason')).toBeNull()
  })

  it('keeps generic error copy on /chat when app info fails', () => {
    mockPathname = '/chat/code1'
    mockAppInfoError = new Error('generic unknown reason')

    render(
      <AuthenticatedLayout>
        <div data-testid="child">Chat Content</div>
      </AuthenticatedLayout>,
    )

    expect(screen.getByText('generic unknown reason')).toBeTruthy()
    expect(screen.queryByText('common.embedLinkInvalid')).toBeNull()
  })
})
