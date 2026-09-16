import type { ReactNode } from 'react'
import type { SiteInfo } from '@/models/share'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import copy from 'copy-to-clipboard'
import * as React from 'react'

import { act } from 'react'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import Embedded from './index'

const {
  mockDepartmentAccessControl,
  mockEmbedToken,
  mockResetEmbedToken,
  embedTokenQueryKey,
} = vi.hoisted(() => ({
  mockDepartmentAccessControl: { value: false },
  mockEmbedToken: vi.fn(),
  mockResetEmbedToken: vi.fn(),
  embedTokenQueryKey: (options?: { input?: unknown }) =>
    ['console', 'apps', 'embedToken', options?.input],
}))

vi.mock('./style.module.css', () => ({
  default: {
    option: 'option',
    active: 'active',
    iframeIcon: 'iframeIcon',
    scriptsIcon: 'scriptsIcon',
    chromePluginIcon: 'chromePluginIcon',
    pluginInstallIcon: 'pluginInstallIcon',
  },
}))
const mockThemeBuilder = {
  buildTheme: vi.fn(),
  theme: {
    primaryColor: '#123456',
  },
}
const mockUseAppContext = vi.fn(() => ({
  langGeniusVersionInfo: {
    current_env: 'PRODUCTION',
    current_version: '',
    latest_version: '',
    release_date: '',
    release_notes: '',
    version: '',
    can_auto_update: false,
  },
}))

vi.mock('copy-to-clipboard', () => ({
  default: vi.fn(),
}))
vi.mock('@/app/components/base/chat/embedded-chatbot/theme/theme-context', () => ({
  useThemeContext: () => mockThemeBuilder,
}))
vi.mock('@/context/app-context', () => ({
  useAppContext: () => mockUseAppContext(),
}))
vi.mock('@/context/global-public-context', () => ({
  useGlobalPublicStore: (selector: (s: { systemFeatures: { department_access_control: boolean } }) => unknown) =>
    selector({
      systemFeatures: {
        department_access_control: mockDepartmentAccessControl.value,
      },
    }),
}))
vi.mock('@/service/client', () => ({
  consoleQuery: {
    apps: {
      embedToken: {
        queryOptions: (options?: Record<string, unknown>) => ({
          queryKey: embedTokenQueryKey({ input: (options as { input?: unknown } | undefined)?.input }),
          queryFn: (...args: unknown[]) => mockEmbedToken(...args),
          ...options,
        }),
        key: () => ['console', 'apps', 'embedToken'],
        queryKey: embedTokenQueryKey,
      },
      resetEmbedToken: {
        mutationOptions: (options?: Record<string, unknown>) => ({
          mutationKey: ['console', 'apps', 'resetEmbedToken'],
          mutationFn: (...args: unknown[]) => mockResetEmbedToken(...args),
          ...options,
        }),
      },
    },
  },
}))
const mockWindowOpen = vi.spyOn(window, 'open').mockImplementation(() => null)
const mockedCopy = vi.mocked(copy)

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  return Wrapper
}

const siteInfo: SiteInfo = {
  title: 'test site',
  chat_color_theme: '#000000',
  chat_color_theme_inverted: false,
}

const baseProps = {
  isShow: true,
  siteInfo,
  onClose: vi.fn(),
  appBaseUrl: 'https://app.example.com',
  accessToken: 'token',
  className: 'custom-modal',
}

const getCopyButton = () => {
  const buttons = screen.getAllByRole('button')
  const actionButton = buttons.find(button => button.className.includes('action-btn'))
  expect(actionButton).toBeDefined()
  return actionButton!
}

describe('Embedded', () => {
  afterEach(() => {
    vi.clearAllMocks()
    mockWindowOpen.mockClear()
    mockDepartmentAccessControl.value = false
    mockEmbedToken.mockReset()
    mockResetEmbedToken.mockReset()
  })

  afterAll(() => {
    mockWindowOpen.mockRestore()
  })

  it('builds theme and copies iframe snippet', async () => {
    await act(async () => {
      render(<Embedded {...baseProps} />, { wrapper: createWrapper() })
    })

    const actionButton = getCopyButton()
    const innerDiv = actionButton.querySelector('div')
    act(() => {
      fireEvent.click(innerDiv ?? actionButton)
    })

    expect(mockThemeBuilder.buildTheme).toHaveBeenCalledWith(siteInfo.chat_color_theme, siteInfo.chat_color_theme_inverted)
    expect(mockedCopy).toHaveBeenCalledWith(expect.stringContaining('/chatbot/token'))
  })

  it('should copy iframe without embed_token when department ACL is off', async () => {
    mockDepartmentAccessControl.value = false

    await act(async () => {
      render(<Embedded {...baseProps} appId="app-1" />, { wrapper: createWrapper() })
    })

    const actionButton = getCopyButton()
    const innerDiv = actionButton.querySelector('div')
    act(() => {
      fireEvent.click(innerDiv ?? actionButton)
    })

    expect(mockedCopy).toHaveBeenCalledTimes(1)
    const copied = mockedCopy.mock.calls[0][0] as string
    expect(copied).toContain('/chatbot/token')
    expect(copied).not.toContain('embed_token')
  })

  it('should copy iframe with embed_token when department ACL is on', async () => {
    mockDepartmentAccessControl.value = true
    mockEmbedToken.mockResolvedValue({
      embed_token: 'jwt-emb',
      chatbot_path: '/chatbot/token?embed_token=jwt-emb',
    })

    await act(async () => {
      render(<Embedded {...baseProps} appId="app-1" />, { wrapper: createWrapper() })
    })

    await waitFor(() => {
      expect(document.body.textContent).toContain('embed_token=jwt-emb')
    })

    const actionButton = getCopyButton()
    const innerDiv = actionButton.querySelector('div')
    act(() => {
      fireEvent.click(innerDiv ?? actionButton)
    })

    expect(mockedCopy).toHaveBeenCalledWith(expect.stringContaining('embed_token=jwt-emb'))
  })

  it('should copy iframe without embed_token when ACL is on and GET fails', async () => {
    mockDepartmentAccessControl.value = true
    mockEmbedToken.mockRejectedValue(new Error('embed token unavailable'))

    await act(async () => {
      render(<Embedded {...baseProps} appId="app-1" />, { wrapper: createWrapper() })
    })

    await waitFor(() => {
      expect(mockEmbedToken).toHaveBeenCalled()
    })

    const actionButton = getCopyButton()
    const innerDiv = actionButton.querySelector('div')
    act(() => {
      fireEvent.click(innerDiv ?? actionButton)
    })

    expect(mockedCopy).toHaveBeenCalledTimes(1)
    const copied = mockedCopy.mock.calls[0][0] as string
    expect(copied).toContain('/chatbot/token')
    expect(copied).not.toContain('embed_token')
  })

  it('should use the new embed token from reset POST after confirm succeeds', async () => {
    mockDepartmentAccessControl.value = true
    mockEmbedToken.mockResolvedValue({
      embed_token: 'jwt-old',
      chatbot_path: '/chatbot/token?embed_token=jwt-old',
    })
    mockResetEmbedToken.mockResolvedValue({
      embed_token: 'jwt-new',
      chatbot_path: '/chatbot/token?embed_token=jwt-new',
    })

    await act(async () => {
      render(<Embedded {...baseProps} appId="app-1" />, { wrapper: createWrapper() })
    })

    await waitFor(() => {
      expect(document.body.textContent).toContain('embed_token=jwt-old')
    })

    fireEvent.click(screen.getByRole('button', { name: 'appOverview.overview.appInfo.embedded.reset' }))
    fireEvent.click(await screen.findByRole('button', { name: 'common.operation.confirm' }))

    await waitFor(() => {
      expect(document.body.textContent).toContain('embed_token=jwt-new')
    })
    expect(document.body.textContent).not.toContain('embed_token=jwt-old')

    const actionButton = getCopyButton()
    const innerDiv = actionButton.querySelector('div')
    act(() => {
      fireEvent.click(innerDiv ?? actionButton)
    })

    expect(mockedCopy).toHaveBeenCalledWith(expect.stringContaining('embed_token=jwt-new'))
    expect(mockedCopy).not.toHaveBeenCalledWith(expect.stringContaining('embed_token=jwt-old'))
  })

  it('opens chrome plugin store link when chrome option selected', async () => {
    await act(async () => {
      render(<Embedded {...baseProps} />, { wrapper: createWrapper() })
    })

    const optionButtons = document.body.querySelectorAll('[class*="option"]')
    expect(optionButtons.length).toBeGreaterThanOrEqual(3)
    act(() => {
      fireEvent.click(optionButtons[2])
    })

    const [chromeText] = screen.getAllByText('appOverview.overview.appInfo.embedded.chromePlugin')
    act(() => {
      fireEvent.click(chromeText)
    })

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://chrome.google.com/webstore/detail/dify-chatbot/ceehdapohffmjmkdcifjofadiaoeggaf',
      '_blank',
      'noopener,noreferrer',
    )
  })
})
