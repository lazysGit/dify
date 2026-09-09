import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateUserProfile } from '@/service/common'
import ForceChangePasswordPage from '../page'

const mockReplace = vi.fn()
const mockPush = vi.fn()
const mockLogout = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}))

vi.mock('@/service/common', () => ({
  updateUserProfile: vi.fn(),
}))

vi.mock('@/service/use-common', () => ({
  useLogout: () => ({
    mutateAsync: mockLogout,
  }),
}))

describe('ForceChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render required fields without a cancel button', () => {
    render(<ForceChangePasswordPage />)

    expect(screen.getByText('mustChangePasswordTitle')).toBeInTheDocument()
    expect(screen.getByText('mustChangePasswordDesc')).toBeInTheDocument()
    expect(screen.getByText('account.currentPassword')).toBeInTheDocument()
    expect(screen.getByText('account.newPassword')).toBeInTheDocument()
    expect(screen.getByText('account.confirmPassword')).toBeInTheDocument()
    expect(screen.getByText('changePasswordBtn')).toBeInTheDocument()
    expect(screen.getByText('userProfile.logout')).toBeInTheDocument()
    expect(screen.queryByText('operation.cancel')).not.toBeInTheDocument()
  })

  it('should submit the new password and go to apps', async () => {
    const user = userEvent.setup()
    vi.mocked(updateUserProfile).mockResolvedValueOnce({ result: 'success' })

    render(<ForceChangePasswordPage />)

    const passwordInputs = document.querySelectorAll('input')
    await user.type(passwordInputs[0], 'Dify1234')
    await user.type(passwordInputs[1], 'NewPass123')
    await user.type(passwordInputs[2], 'NewPass123')

    await user.click(screen.getByText('changePasswordBtn'))

    expect(updateUserProfile).toHaveBeenCalledWith({
      url: 'account/password',
      body: {
        password: 'Dify1234',
        new_password: 'NewPass123',
        repeat_new_password: 'NewPass123',
      },
    })
    expect(mockReplace).toHaveBeenCalledWith('/apps')
  })

  it('should allow logout without changing password', async () => {
    const user = userEvent.setup()
    mockLogout.mockResolvedValueOnce({})

    render(<ForceChangePasswordPage />)
    await user.click(screen.getByText('userProfile.logout'))

    expect(mockLogout).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/signin')
  })
})
