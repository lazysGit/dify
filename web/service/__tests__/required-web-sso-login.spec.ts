import { afterEach, describe, expect, it } from 'vitest'

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

describe('requiredWebSSOLogin', () => {
  const originalLocation = globalThis.location

  afterEach(() => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('returns without assigning location.href when pathname starts with /chatbot', () => {
    const locationStub = stubLocation('/chatbot/code1', '?embed_token=jwt')

    requiredWebSSOLogin()

    expect(locationStub.href).toBe('http://localhost:3000/chatbot/code1?embed_token=jwt')
  })

  it('redirects to webapp-signin on a non-chatbot path', () => {
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
