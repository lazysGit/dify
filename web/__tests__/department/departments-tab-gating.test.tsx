import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ACCOUNT_SETTING_TAB } from '@/app/components/header/account-setting/constants'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/context/provider-context', () => ({
  useProviderContext: () => ({
    enableBilling: false,
    enableReplaceWebAppLogo: false,
  }),
}))

vi.mock('@/hooks/use-breakpoints', () => ({
  __esModule: true,
  default: () => 'desktop',
  MediaType: { mobile: 'mobile', desktop: 'desktop' },
}))

vi.mock('@/service/use-departments', () => ({
  useDepartmentList: () => ({
    data: { is_department_admin: false },
    isError: false,
    isLoading: false,
  }),
}))

vi.mock('@/app/components/base/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/app/components/billing/billing-page', () => ({ default: () => null }))
vi.mock('@/app/components/custom/custom-page', () => ({ default: () => null }))
vi.mock('@/app/components/header/account-setting/members-page', () => ({ default: () => null }))
vi.mock('@/app/components/header/account-setting/model-provider-page', () => ({ default: () => null }))
vi.mock('@/app/components/header/account-setting/model-provider-page/atoms', () => ({ useResetModelProviderListExpanded: () => vi.fn() }))
vi.mock('@/app/components/header/account-setting/api-based-extension-page', () => ({ default: () => null }))
vi.mock('@/app/components/header/account-setting/data-source-page-new', () => ({ default: () => null }))
vi.mock('@/app/components/header/account-setting/language-page', () => ({ default: () => null }))
vi.mock('@/app/components/header/account-setting/department-page', () => ({ default: () => <div data-testid="department-page" /> }))
vi.mock('@/app/components/header/account-setting/menu-dialog', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('@/app/components/base/search-input', () => ({ default: () => null }))
vi.mock('@/app/components/base/button', () => ({ default: ({ children, ...props }: { children: React.ReactNode }) => <button {...props}>{children}</button> }))

describe('Departments Tab Gating', () => {
  it('should show departments tab for workspace admin', async () => {
    vi.resetModules()
    vi.doMock('@/context/app-context', () => ({
      useAppContext: () => ({
        isCurrentWorkspaceManager: true,
        isCurrentWorkspaceDatasetOperator: false,
      }),
    }))
    vi.doMock('@/service/use-departments', () => ({
      useDepartmentList: () => ({
        data: { is_department_admin: false },
        isError: false,
        isLoading: false,
      }),
    }))

    const { default: AccountSetting } = await import('@/app/components/header/account-setting/index')

    render(
      <AccountSetting
        onCancelAction={vi.fn()}
        activeTab={ACCOUNT_SETTING_TAB.MEMBERS}
        onTabChangeAction={vi.fn()}
      />,
    )

    expect(screen.getByText('settings.departments')).toBeInTheDocument()
  })

  it('should place departments tab above members with organization-chart icon', async () => {
    vi.resetModules()
    vi.doMock('@/context/app-context', () => ({
      useAppContext: () => ({
        isCurrentWorkspaceManager: true,
        isCurrentWorkspaceDatasetOperator: false,
      }),
    }))
    vi.doMock('@/service/use-departments', () => ({
      useDepartmentList: () => ({
        data: { is_department_admin: false },
        isError: false,
        isLoading: false,
      }),
    }))

    const { default: AccountSetting } = await import('@/app/components/header/account-setting/index')

    render(
      <AccountSetting
        onCancelAction={vi.fn()}
        activeTab={ACCOUNT_SETTING_TAB.MEMBERS}
        onTabChangeAction={vi.fn()}
      />,
    )

    const departments = screen.getByRole('button', { name: 'settings.departments' })
    const members = screen.getByRole('button', { name: 'settings.members' })

    expect(departments.compareDocumentPosition(members) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(departments.querySelector('.i-ri-organization-chart')).toBeInTheDocument()
    expect(departments.querySelector('.i-ri-org-chart-line')).not.toBeInTheDocument()
  })

  it('should show departments tab for department admin', async () => {
    vi.resetModules()
    vi.doMock('@/context/app-context', () => ({
      useAppContext: () => ({
        isCurrentWorkspaceManager: false,
        isCurrentWorkspaceDatasetOperator: false,
      }),
    }))
    vi.doMock('@/service/use-departments', () => ({
      useDepartmentList: () => ({
        data: { is_department_admin: true },
        isError: false,
        isLoading: false,
      }),
    }))

    const { default: AccountSetting } = await import('@/app/components/header/account-setting/index')

    render(
      <AccountSetting
        onCancelAction={vi.fn()}
        activeTab={ACCOUNT_SETTING_TAB.MEMBERS}
        onTabChangeAction={vi.fn()}
      />,
    )

    expect(screen.getByText('settings.departments')).toBeInTheDocument()
  })

  it('should hide departments tab for normal member', async () => {
    vi.resetModules()
    vi.doMock('@/context/app-context', () => ({
      useAppContext: () => ({
        isCurrentWorkspaceManager: false,
        isCurrentWorkspaceDatasetOperator: false,
      }),
    }))
    vi.doMock('@/service/use-departments', () => ({
      useDepartmentList: () => ({
        data: { is_department_admin: false },
        isError: false,
        isLoading: false,
      }),
    }))

    const { default: AccountSetting } = await import('@/app/components/header/account-setting/index')

    render(
      <AccountSetting
        onCancelAction={vi.fn()}
        activeTab={ACCOUNT_SETTING_TAB.MEMBERS}
        onTabChangeAction={vi.fn()}
      />,
    )

    expect(screen.queryByText('settings.departments')).not.toBeInTheDocument()
  })

  it('should hide departments tab for dataset operator', async () => {
    vi.resetModules()
    vi.doMock('@/context/app-context', () => ({
      useAppContext: () => ({
        isCurrentWorkspaceManager: false,
        isCurrentWorkspaceDatasetOperator: true,
      }),
    }))
    vi.doMock('@/service/use-departments', () => ({
      useDepartmentList: () => ({
        data: { is_department_admin: true },
        isError: false,
        isLoading: false,
      }),
    }))

    const { default: AccountSetting } = await import('@/app/components/header/account-setting/index')

    render(
      <AccountSetting
        onCancelAction={vi.fn()}
        activeTab={ACCOUNT_SETTING_TAB.MEMBERS}
        onTabChangeAction={vi.fn()}
      />,
    )

    expect(screen.queryByText('settings.departments')).not.toBeInTheDocument()
  })
})
