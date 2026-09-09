import { describe, expect, it } from 'vitest'
import { resolveLoginLandingPath, setPostLoginRedirect } from '../post-login-redirect'

describe('resolveLoginLandingPath', () => {
  it('redirects to force-change-password when must_change_password is true', () => {
    expect(resolveLoginLandingPath(true)).toBe('/force-change-password')
  })

  it('falls back to /apps when no post-login redirect is set', () => {
    setPostLoginRedirect(null)
    expect(resolveLoginLandingPath(false)).toBe('/apps')
  })

  it('uses stored post-login redirect when password change is not required', () => {
    setPostLoginRedirect('/datasets')
    expect(resolveLoginLandingPath()).toBe('/datasets')
  })
})
