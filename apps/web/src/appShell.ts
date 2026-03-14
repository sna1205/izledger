import { routeRequiresAuth, routeUsesAuthLayout, type AuthRouteRecord } from '@/router/authNavigation'
import type { AuthStatus } from '@/stores/authStore'

export type AppShellLayout = 'loading' | 'auth' | 'workspace'

interface ResolveAppShellLayoutInput {
  routerReady: boolean
  authStatus: AuthStatus
  matched: AuthRouteRecord[]
}

export function resolveAppShellLayout({
  routerReady,
  authStatus,
  matched,
}: ResolveAppShellLayoutInput): AppShellLayout {
  if (!routerReady || authStatus === 'unknown' || authStatus === 'checking') {
    return 'loading'
  }

  if (routeRequiresAuth({ matched })) {
    return authStatus === 'authenticated' ? 'workspace' : 'loading'
  }

  return routeUsesAuthLayout({ matched }) ? 'auth' : 'workspace'
}
