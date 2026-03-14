import { describe, expect, it } from 'vitest'
import { resolveAppShellLayout } from './appShell'

describe('resolveAppShellLayout', () => {
  it('keeps the app behind a loading gate until router state is ready', () => {
    expect(
      resolveAppShellLayout({
        routerReady: false,
        authStatus: 'authenticated',
        matched: [{ meta: { requiresAuth: true } }],
      })
    ).toBe('loading')
  })

  it('keeps protected routes hidden for guests until the redirect completes', () => {
    expect(
      resolveAppShellLayout({
        routerReady: true,
        authStatus: 'unauthenticated',
        matched: [{ meta: { requiresAuth: true } }],
      })
    ).toBe('loading')
  })

  it('renders public auth pages after auth is resolved', () => {
    expect(
      resolveAppShellLayout({
        routerReady: true,
        authStatus: 'unauthenticated',
        matched: [{ meta: { layout: 'auth', public: true } }],
      })
    ).toBe('auth')
  })

  it('renders the workspace shell only for authenticated protected routes', () => {
    expect(
      resolveAppShellLayout({
        routerReady: true,
        authStatus: 'authenticated',
        matched: [{ meta: { requiresAuth: true } }],
      })
    ).toBe('workspace')
  })
})
