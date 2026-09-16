import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AuthenticatedLayout from '@/app/(shareLayout)/components/authenticated-layout'
import { isChatbotPath, isEmbedPassport, shouldSkipWebSsoRedirect } from '@/app/(shareLayout)/components/embed-access'
import Splash from '@/app/(shareLayout)/components/splash'

const mockSetWebAppPassport = vi.fn()
const mockGetWebAppPassport = vi.fn()
const mockClearWebAppPassport = vi.fn()
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
  getWebAppPassport: (...args: unknown[]) => mockGetWebAppPassport(...args),
  clearWebAppPassport: (...args: unknown[]) => mockClearWebAppPassport(...args),
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

const unsignedJwt = (payload: Record<string, unknown>) => {
  const encode = (value: object) => {
    const json = JSON.stringify(value)
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }
  return `${encode({ alg: 'none' })}.${encode(payload)}.sig`
}

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

describe('isEmbedPassport', () => {
  it('returns true when jwt payload channel is embed', () => {
    expect(isEmbedPassport(unsignedJwt({ channel: 'embed' }))).toBe(true)
  })

  it('returns false for non-embed or invalid tokens', () => {
    expect(isEmbedPassport(unsignedJwt({ channel: 'web' }))).toBe(false)
    expect(isEmbedPassport(unsignedJwt({ app_code: 'code1' }))).toBe(false)
    expect(isEmbedPassport('')).toBe(false)
    expect(isEmbedPassport('not-a-jwt')).toBe(false)
  })
})

describe('shouldSkipWebSsoRedirect', () => {
  it('skips only on chatbot path when department ACL is on', () => {
    expect(shouldSkipWebSsoRedirect('/chatbot/code1', true)).toBe(true)
    expect(shouldSkipWebSsoRedirect('/chatbot/code1', false)).toBe(false)
    expect(shouldSkipWebSsoRedirect('/chat/code1', true)).toBe(false)
    expect(shouldSkipWebSsoRedirect('/chat/code1', false)).toBe(false)
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
    mockGetWebAppPassport.mockReturnValue('')
    mockWebAppLoginStatus.mockResolvedValue({ userLoggedIn: true, appLoggedIn: true })
    mockFetchAccessToken.mockResolvedValue({ access_token: 'console-passport' })
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

  it('does not treat a stored embed jwt as app login on /chat when ACL is on', async () => {
    const embedJwt = unsignedJwt({ channel: 'embed', app_code: 'code1' })
    mockPathname = '/chat/code1'
    mockGetWebAppPassport.mockReturnValue(embedJwt)
    mockWebAppLoginStatus.mockResolvedValue({ userLoggedIn: true, appLoggedIn: true })

    render(
      <Splash>
        <div data-testid="child">Chat Content</div>
      </Splash>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('chat-access-guard')).toBeTruthy()
    })
    expect(mockClearWebAppPassport).toHaveBeenCalledWith('code1')
    expect(mockWebAppLoginStatus).toHaveBeenCalled()
    expect(mockFetchAccessToken).toHaveBeenCalled()
    expect(mockSetWebAppPassport).toHaveBeenCalledWith('code1', 'console-passport')
    expect(mockSetWebAppPassport).not.toHaveBeenCalledWith('code1', embedJwt)
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
    mockDepartmentAccessEnabled = true
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

  it('keeps generic error copy on /chatbot when ACL is off', () => {
    mockDepartmentAccessEnabled = false
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
