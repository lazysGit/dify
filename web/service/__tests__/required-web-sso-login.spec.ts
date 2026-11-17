import { afterEach, describe, expect, it } from 'vitest'

import { setDepartmentAccessControlEnabled, shouldSkipWebSsoRedirect } from '@/app/(shareLayout)/components/embed-access'
import { requiredWebSSOLogin } from '@/service/base'

const stubLocation = (pathname: string, search = '') => {
  const origin = 'http://localhost:3000'
  const locationStub = {
    origin,
    pathname,
    search,
    href: `${origin}${pathname}${search}`,
  }
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: locationStub,
  })
  return locationStub
}

describe('shouldSkipWebSsoRedirect', () => {
  it('skips only when pathname is chatbot and department ACL is on', () => {
    expect(shouldSkipWebSsoRedirect('/chatbot/code1', true)).toBe(true)
    expect(shouldSkipWebSsoRedirect('/chatbot/code1', false)).toBe(false)
    expect(shouldSkipWebSsoRedirect('/chat/code1', true)).toBe(false)
  })
})

describe('requiredWebSSOLogin', () => {
  const originalLocation = globalThis.location

  afterEach(() => {
    setDepartmentAccessControlEnabled(false)
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('returns without assigning location.href on /chatbot when ACL is on', () => {
    setDepartmentAccessControlEnabled(true)
    const locationStub = stubLocation('/chatbot/code1', '?embed_token=jwt')

    requiredWebSSOLogin()

    expect(locationStub.href).toBe('http://localhost:3000/chatbot/code1?embed_token=jwt')
  })

  it('redirects to webapp-signin on /chatbot when ACL is off', () => {
    setDepartmentAccessControlEnabled(false)
    const locationStub = stubLocation('/chatbot/code1', '?embed_token=jwt')

    requiredWebSSOLogin()

    expect(locationStub.href).toContain('/webapp-signin')
    expect(locationStub.href).toContain('redirect_url=')
  })

  it('redirects to webapp-signin on a non-chatbot path', () => {
    setDepartmentAccessControlEnabled(true)
    const locationStub = stubLocation('/chat/code1', '?foo=1')

    requiredWebSSOLogin()

    expect(locationStub.href).toContain('/webapp-signin')
    expect(locationStub.href).toContain('redirect_url=')
  })

  it('does not redirect when already on /webapp-signin', () => {
    const locationStub = stubLocation('/webapp-signin')

    requiredWebSSOLogin()

    expect(locationStub.href).toBe('http://localhost:3000/webapp-signin')
  })
})
