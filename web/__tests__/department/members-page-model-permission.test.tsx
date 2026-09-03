import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockMutateAsync = vi.fn().mockResolvedValue({})
const mockUseMemberModelWhitelist = vi.fn()
const mockUseAppContext = vi.fn()

vi.mock('@/service/use-model-permissions', () => ({
  useMemberModelWhitelist: (accountId: string) => mockUseMemberModelWhitelist(accountId),
  useSetMemberWhitelistMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}))

vi.mock('@/service/use-common', () => ({
  useMembers: () => ({
    data: {
      accounts: [
        {
          id: 'a1',
          name: 'Alice',
          email: 'alice@example.com',
          avatar_url: null,
          status: 'active',
          role: 'normal',
          department_id: '',
          last_active_at: 1700000000,
          created_at: 1700000000,
        },
      ],
    },
    refetch: vi.fn(),
  }),
}))

vi.mock('@/service/use-departments', () => ({
  useDepartmentList: () => ({
    data: { departments: [], tree: [], manageable_department_ids: [], is_department_admin: false },
    isLoading: false,
  }),
}))

vi.mock('@/context/app-context', () => ({
  useAppContext: () => mockUseAppContext(),
}))

vi.mock('@/context/provider-context', () => ({
  useProviderContext: () => ({
    plan: { type: 'professional', total: { teamMembers: 100 } },
    enableBilling: false,
    isAllowTransferWorkspace: false,
  }),
}))

vi.mock('@/context/i18n', () => ({
  useLocale: () => 'en-US',
}))

vi.mock('@/hooks/use-format-time-from-now', () => ({
  useFormatTimeFromNow: () => ({ formatTimeFromNow: () => 'just now' }),
}))

vi.mock('@/app/components/base/avatar', () => ({
  Avatar: () => <div data-testid="avatar" />,
}))

vi.mock('@/app/components/base/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <div />,
}))

vi.mock('@/app/components/base/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ render }: { render: React.ReactNode }) => <>{render}</>,
}))

vi.mock('@/app/components/billing/upgrade-btn', () => ({
  default: () => null,
}))

vi.mock('@/app/components/base/button', () => ({
  default: ({ children, loading, ...props }: { children: React.ReactNode, loading?: boolean } & Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/app/components/header/account-setting/members-page/operation', () => ({
  default: () => <div data-testid="operation" />,
}))

vi.mock('@/app/components/header/account-setting/members-page/operation/transfer-ownership', () => ({
  default: () => null,
}))

vi.mock('@/app/components/header/account-setting/members-page/create-member-modal', () => ({
  default: () => null,
}))

vi.mock('@/app/components/header/account-setting/members-page/edit-workspace-modal', () => ({
  default: () => null,
}))

vi.mock('@/app/components/header/account-setting/members-page/transfer-ownership-modal', () => ({
  default: () => null,
}))

const allModels = [
  { provider: 'openai', model: 'gpt-4', model_type: 'llm', label: 'GPT-4' },
  { provider: 'openai', model: 'text-embedding-3-small', model_type: 'text-embedding', label: 'text-embedding-3-small' },
  { provider: 'anthropic', model: 'claude-3', model_type: 'llm', label: 'Claude 3' },
]

describe('MembersPage model permission', () => {
  beforeEach(() => {
    vi.resetModules()
    mockMutateAsync.mockReset()
    mockMutateAsync.mockResolvedValue({})
    mockUseMemberModelWhitelist.mockReset()
    mockUseMemberModelWhitelist.mockReturnValue({
      data: { is_restricted: false, whitelist: [], all_system_models: allModels },
      isLoading: false,
    })
  })

  const renderPage = async (permissions: { isOwner: boolean, isManager: boolean }) => {
    mockUseAppContext.mockReturnValue({
      userProfile: { id: 'u0', name: 'boss', email: 'boss@example.com', avatar_url: null },
      currentWorkspace: { name: 'ws', role: 'owner' },
      isCurrentWorkspaceOwner: permissions.isOwner,
      isCurrentWorkspaceManager: permissions.isManager,
    })
    const { default: MembersPage } = await import('@/app/components/header/account-setting/members-page')
    return render(<MembersPage />)
  }

  it('should show model permission button for manager', async () => {
    await renderPage({ isOwner: false, isManager: true })
    expect(screen.getAllByText('members.model_permission').length).toBeGreaterThanOrEqual(1)
  })

  it('should hide model permission button for normal member', async () => {
    await renderPage({ isOwner: false, isManager: false })
    expect(screen.queryByText('members.model_permission')).not.toBeInTheDocument()
  })

  it('should open modal and check only whitelisted models', async () => {
    mockUseMemberModelWhitelist.mockReturnValue({
      data: {
        is_restricted: true,
        whitelist: [{ provider_name: 'openai', model_name: 'gpt-4', model_type: 'llm' }],
        all_system_models: allModels,
      },
      isLoading: false,
    })
    const { container } = await renderPage({ isOwner: true, isManager: true })

    fireEvent.click(screen.getAllByRole('button', { name: 'members.model_permission' })[0])

    expect(screen.getByText('model_whitelist.title')).toBeInTheDocument()
    expect(screen.getByTestId('checkbox-openai:llm:gpt-4')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('checkbox-anthropic:llm:claude-3')).toHaveAttribute('aria-checked', 'false')
    expect(container).toBeDefined()
  })

  it('should call mutateAsync with selected models on save', async () => {
    await renderPage({ isOwner: true, isManager: true })

    fireEvent.click(screen.getAllByRole('button', { name: 'members.model_permission' })[0])
    fireEvent.click(screen.getByText('operation.save'))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        params: { account_id: 'a1' },
        body: {
          models: allModels.map(m => ({ provider: m.provider, model: m.model, model_type: m.model_type })),
        },
      })
    })
  })

  it('should save empty models when select-all unchecked', async () => {
    await renderPage({ isOwner: true, isManager: true })

    fireEvent.click(screen.getAllByRole('button', { name: 'members.model_permission' })[0])
    fireEvent.click(screen.getByTestId('checkbox-model-whitelist-all'))
    fireEvent.click(screen.getByText('operation.save'))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        params: { account_id: 'a1' },
        body: { models: [] },
      })
    })
  })
})
