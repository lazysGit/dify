import { beforeEach, describe, expect, it, vi } from 'vitest'
import { base } from './fetch'

vi.mock('@/app/components/base/ui/toast', () => ({
  toast: {
    add: vi.fn(),
    error: vi.fn(),
  },
}))

describe('base', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Error responses', () => {
    it('should keep the response body readable when a 401 response is rejected', async () => {
      // Arrange
      const unauthorizedResponse = new Response(
        JSON.stringify({
          code: 'unauthorized',
          message: 'Unauthorized',
          status: 401,
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(unauthorizedResponse)

      // Act
      let caughtError: unknown
      try {
        await base('/login')
      }
      catch (error) {
        caughtError = error
      }

      // Assert
      expect(caughtError).toBeInstanceOf(Response)
      await expect((caughtError as Response).json()).resolves.toEqual({
        code: 'unauthorized',
        message: 'Unauthorized',
        status: 401,
      })
    })

    it('should redirect to force-change-password when the error code requires it', async () => {
      const originalLocation = globalThis.location
      const locationStub = {
        origin: 'http://localhost',
        pathname: '/apps',
        href: 'http://localhost/apps',
      }
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: locationStub,
      })

      const mustChangeResponse = new Response(
        JSON.stringify({
          code: 'must_change_password',
          message: 'Please change your password first.',
          status: 400,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mustChangeResponse)

      try {
        await base('/account/profile')
      }
      catch {
        // expected
      }

      expect(locationStub.href).toBe('http://localhost/force-change-password')
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: originalLocation,
      })
    })
  })
})
