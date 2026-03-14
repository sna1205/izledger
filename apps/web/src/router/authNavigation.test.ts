import { describe, expect, it } from 'vitest'
import { resolveAuthNavigation } from './authNavigation'

describe('resolveAuthNavigation', () => {
  it('redirects guests away from protected routes and preserves the intended destination', () => {
    const result = resolveAuthNavigation(
      {
        matched: [{ meta: { requiresAuth: true } }],
        query: {},
        fullPath: '/trades?includeDrafts=1',
      },
      {
        authStatus: 'unauthenticated',
        allowSelfRegister: true,
      }
    )

    expect(result).toEqual({
      path: '/auth/login',
      query: { redirect: '/trades?includeDrafts=1' },
    })
  })

  it('sends authenticated users away from guest-only pages', () => {
    const result = resolveAuthNavigation(
      {
        matched: [{ meta: { guestOnly: true } }],
        query: { redirect: '/settings' },
        fullPath: '/auth/login?redirect=%2Fsettings',
      },
      {
        authStatus: 'authenticated',
        allowSelfRegister: true,
      }
    )

    expect(result).toBe('/settings')
  })

  it('blocks registration when self registration is disabled', () => {
    const result = resolveAuthNavigation(
      {
        matched: [{ meta: { requiresSelfRegister: true, guestOnly: true } }],
        query: {},
        fullPath: '/auth/register',
      },
      {
        authStatus: 'unauthenticated',
        allowSelfRegister: false,
      }
    )

    expect(result).toEqual({ name: 'auth-login' })
  })

  it('allows authenticated access to protected routes', () => {
    const result = resolveAuthNavigation(
      {
        matched: [{ meta: { requiresAuth: true } }],
        query: {},
        fullPath: '/dashboard',
      },
      {
        authStatus: 'authenticated',
        allowSelfRegister: true,
      }
    )

    expect(result).toBe(true)
  })

  it('does not redirect protected routes while auth status is unresolved', () => {
    const result = resolveAuthNavigation(
      {
        matched: [{ meta: { requiresAuth: true } }],
        query: {},
        fullPath: '/dashboard',
      },
      {
        authStatus: 'unknown',
        allowSelfRegister: true,
      }
    )

    expect(result).toBe(true)
  })
})
