import type { App } from '@/types/app'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AppCard from '@/app/components/apps/app-card'
import { AccessMode } from '@/models/access-control'
import { AppModeEnum } from '@/types/app'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('use-context-selector', () => ({
  useContext: () => ({ notify: vi.fn() }),
  createContext: () => ({
    Provider: ({ children }: { children: unknown }) => children,
    Consumer: ({ children }: { children: unknown }) => children,
  }),
}))

vi.mock('@/context/global-public-context', () => ({
  useGlobalPublicStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      systemFeatures: { webapp_auth: { enabled: false }, branding: { enabled: false } },
    }
    return selector ? selector(state) : state
  },
}))

const mockAppContext = {
  isCurrentWorkspaceEditor: true,
  isCurrentWorkspaceManager: true,
}

vi.mock('@/context/app-context', () => ({
  useAppContext: () => mockAppContext,
}))

vi.mock('@/context/provider-context', () => ({
  useProviderContext: () => ({
    onPlanInfoChanged: vi.fn(),
  }),
}))

vi.mock('@/service/use-apps', () => ({
  useDeleteAppMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/service/access-control', () => ({
  useGetUserCanAccessApp: () => ({ data: { result: true }, isLoading: false }),
}))

vi.mock('@/service/explore', () => ({
  fetchInstalledAppList: vi.fn(),
}))

vi.mock('@/service/apps', () => ({
  copyApp: vi.fn(),
  exportAppConfig: vi.fn(),
  updateAppInfo: vi.fn(),
}))

vi.mock('@/service/workflow', () => ({
  fetchWorkflowDraft: vi.fn(),
}))

vi.mock('@/hooks/use-async-window-open', () => ({
  useAsyncWindowOpen: () => vi.fn(),
}))

const mockApp: App = {
  id: 'app-1',
  name: 'Test App',
  description: 'Test description',
  author_name: 'Test Author',
  icon_type: 'emoji',
  icon: '🤖',
  icon_background: '#FFF4ED',
  icon_url: null,
  use_icon_as_answer_icon: false,
  mode: AppModeEnum.CHAT,
  enable_site: true,
  enable_api: true,
  api_rpm: 60,
  api_rph: 3600,
  is_demo: false,
  model_config: {} as App['model_config'],
  app_model_config: {} as App['app_model_config'],
  created_at: 1000000,
  updated_at: 1000000,
  site: {} as App['site'],
  api_base_url: '',
  tags: [],
  access_mode: AccessMode.PUBLIC,
  department_id: 'dept-1',
  department_name: 'Engineering',
}

describe('AppCard Transfer Department Menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppContext.isCurrentWorkspaceEditor = true
    mockAppContext.isCurrentWorkspaceManager = true
  })

  it('should render department breadcrumb when department_name exists', () => {
    render(<AppCard app={mockApp} />)

    expect(screen.getByText('Engineering')).toBeTruthy()
  })

  it('should not render department breadcrumb when department_name is null', () => {
    const appWithoutDept = { ...mockApp, department_id: null, department_name: null }
    render(<AppCard app={appWithoutDept} />)

    expect(screen.queryByText('Engineering')).toBeNull()
  })

  it('should show transfer department option for managers', async () => {
    const user = userEvent.setup()
    mockAppContext.isCurrentWorkspaceManager = true
    mockAppContext.isCurrentWorkspaceEditor = true

    render(<AppCard app={mockApp} />)

    const moreButton = screen.getByRole('button', { name: /more/i })
    await user.click(moreButton)

    expect(screen.getByText('transferDepartmentAction')).toBeTruthy()
  })

  it('should not show transfer department option for non-managers', async () => {
    const user = userEvent.setup()
    mockAppContext.isCurrentWorkspaceManager = false
    mockAppContext.isCurrentWorkspaceEditor = true

    render(<AppCard app={mockApp} />)

    const moreButton = screen.getByRole('button', { name: /more/i })
    await user.click(moreButton)

    expect(screen.queryByText('transferDepartmentAction')).toBeNull()
  })
})
