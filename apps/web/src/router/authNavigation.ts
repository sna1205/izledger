export interface AuthRouteRecord {
  meta?: Record<string, unknown>
}

export interface AuthRouteSnapshot {
  matched: AuthRouteRecord[]
  query?: Record<string, unknown>
  fullPath: string
}

export interface AuthNavigationSnapshot {
  authStatus: 'unknown' | 'checking' | 'authenticated' | 'unauthenticated'
  allowSelfRegister: boolean
}

export type AuthNavigationResult =
  | true
  | string
  | {
      name?: string
      path?: string
      query?: Record<string, string>
    }

export function routeRequiresAuth(route: Pick<AuthRouteSnapshot, 'matched'>): boolean {
  return hasMetaFlag(route.matched, 'requiresAuth')
}

export function routeUsesAuthLayout(route: Pick<AuthRouteSnapshot, 'matched'>): boolean {
  return route.matched.some((record) => record.meta?.layout === 'auth')
}

export function resolveAuthNavigation(
  route: AuthRouteSnapshot,
  auth: AuthNavigationSnapshot
): AuthNavigationResult {
  const isGuestOnly = hasMetaFlag(route.matched, 'guestOnly')
  const requiresSelfRegister = hasMetaFlag(route.matched, 'requiresSelfRegister')

  if (requiresSelfRegister && !auth.allowSelfRegister) {
    return { name: 'auth-login' }
  }

  if (isGuestOnly && auth.authStatus === 'authenticated') {
    const redirectTarget = typeof route.query?.redirect === 'string' && route.query.redirect !== ''
      ? route.query.redirect
      : '/dashboard'
    return redirectTarget
  }

  if (routeRequiresAuth(route) && auth.authStatus === 'unauthenticated') {
    return {
      path: '/auth/login',
      query: { redirect: route.fullPath },
    }
  }

  return true
}

function hasMetaFlag(matched: AuthRouteRecord[], flag: string): boolean {
  return matched.some((record) => record.meta?.[flag] === true)
}
