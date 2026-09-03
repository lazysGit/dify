import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockUseMyModelSettings = vi.fn()

vi.mock('@/service/use-model-permissions', () => ({
  useMyModelSettings: () => mockUseMyModelSettings(),
}))

describe('ModelSettingsPage', () => {
  beforeEach(() => {
    vi.resetModules()
    mockUseMyModelSettings.mockReset()
  })

  it('should show unrestricted message when not restricted', async () => {
    mockUseMyModelSettings.mockReturnValue({
      data: { available_models: [], is_restricted: false },
      isLoading: false,
    })

    const { default: ModelSettingsPage } = await import('@/app/components/header/account-setting/model-settings-page')
    render(<ModelSettingsPage />)

    expect(screen.getByText('my_available_models.unrestricted')).toBeInTheDocument()
    expect(screen.queryByText('my_available_models.restricted_hint')).not.toBeInTheDocument()
  })

  it('should show restricted hint and group models by provider', async () => {
    mockUseMyModelSettings.mockReturnValue({
      data: {
        available_models: [
          { provider: 'openai', model: 'gpt-4', model_type: 'llm', label: 'GPT-4' },
          { provider: 'openai', model: 'text-embedding-3-small', model_type: 'text-embedding', label: 'text-embedding-3-small' },
          { provider: 'anthropic', model: 'claude-3', model_type: 'llm', label: 'Claude 3' },
        ],
        is_restricted: true,
      },
      isLoading: false,
    })

    const { default: ModelSettingsPage } = await import('@/app/components/header/account-setting/model-settings-page')
    render(<ModelSettingsPage />)

    expect(screen.getByText('my_available_models.restricted_hint')).toBeInTheDocument()
    // 组标题与列表项共用模型 label，文本至少出现两次
    expect(screen.getAllByText('Claude 3').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('text-embedding-3-small').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('my_available_models.unrestricted')).not.toBeInTheDocument()
    // 提供商分组标题：openai 组与 anthropic 组各自独立渲染（GPT-4 同时作为组标题与列表项出现）
    expect(screen.getAllByText('GPT-4').length).toBeGreaterThanOrEqual(2)
  })

  it('should show empty message when restricted but no models allowed', async () => {
    mockUseMyModelSettings.mockReturnValue({
      data: { available_models: [], is_restricted: true },
      isLoading: false,
    })

    const { default: ModelSettingsPage } = await import('@/app/components/header/account-setting/model-settings-page')
    render(<ModelSettingsPage />)

    expect(screen.getByText('my_available_models.restricted_hint')).toBeInTheDocument()
    expect(screen.getByText('my_available_models.no_models')).toBeInTheDocument()
  })

  it('should show loading spinner while loading', async () => {
    mockUseMyModelSettings.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    const { default: ModelSettingsPage } = await import('@/app/components/header/account-setting/model-settings-page')
    const { container } = render(<ModelSettingsPage />)

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })
})
