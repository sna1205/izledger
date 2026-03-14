import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isAxiosError } from 'axios'
import api from '@/services/api'
import { setSyncQueueUserScope } from '@/services/offlineSyncQueue'
import {
  initializeLocalFallbackPersistence,
  migrateLegacyLocalFallbackKeys,
  purgeLocalFallbackPersistenceForUser,
} from '@/services/localFallback'
import { getScope, purgeScopedStorageForUser, setScopeAccountId, setScopeUserId } from '@/services/storageScope'

interface AuthUser {
  id: number
  name: string
  email: string
}

interface AuthResponse {
  user: AuthUser
}

interface AuthConfigResponse {
  allow_self_register?: boolean
}

interface LogoutAllResponse {
  message: string
  revoked_sessions: number
  revoked_tokens: number
  supports_session_revocation: boolean
  session_driver: string
}

export type AuthStatus = 'unknown' | 'checking' | 'authenticated' | 'unauthenticated'
type AuthBootstrapState = 'idle' | 'loading' | 'ready' | 'error'
type AuthAction = 'idle' | 'login' | 'register' | 'logout' | 'logout_all'

let unauthorizedListenerBound = false

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const status = ref<AuthStatus>('unknown')
  const bootstrapState = ref<AuthBootstrapState>('idle')
  const bootstrapError = ref<string | null>(null)
  const sessionCheckedAt = ref<string | null>(null)
  const action = ref<AuthAction>('idle')
  const allowSelfRegister = ref(true)
  const initialized = computed(() => bootstrapState.value === 'ready' || bootstrapState.value === 'error')
  const loading = computed(() => status.value === 'checking' || action.value !== 'idle')

  const isAuthenticated = computed(() => status.value === 'authenticated')
  let initPromise: Promise<void> | null = null
  let initializeRunId = 0

  async function clearSession() {
    await resetSessionState({ nextStatus: 'unauthenticated', purgeScopedData: true })
    bootstrapError.value = null
    bootstrapState.value = 'ready'
    sessionCheckedAt.value = new Date().toISOString()
  }

  async function setUserScope(nextUser: AuthUser | null) {
    const userId = nextUser?.id ?? null
    setSyncQueueUserScope(userId)
    setScopeUserId(userId)
    setScopeAccountId(null)
    migrateLegacyLocalFallbackKeys()
    await initializeLocalFallbackPersistence()
  }

  async function initialize(force = false) {
    if ((bootstrapState.value === 'ready' || bootstrapState.value === 'error') && !force) {
      return
    }
    if (initPromise && !force) {
      return initPromise
    }
    if (!unauthorizedListenerBound && typeof window !== 'undefined') {
      window.addEventListener('auth:unauthorized', () => {
        void clearSession()
      })
      unauthorizedListenerBound = true
    }

    const runId = ++initializeRunId
    initPromise = (async () => {
      bootstrapState.value = 'loading'
      bootstrapError.value = null
      status.value = 'checking'
      const [configResult, sessionResult] = await Promise.allSettled([
        fetchAuthConfig(),
        fetchSessionUser(),
      ])

      if (runId !== initializeRunId) {
        return
      }

      if (configResult.status === 'rejected') {
        allowSelfRegister.value = true
      }

      if (sessionResult.status === 'fulfilled') {
        await applyAuthenticatedUser(sessionResult.value, runId)
        return
      }

      const failure = classifyBootstrapFailure(sessionResult.reason)
      if (failure.kind === 'unauthenticated') {
        await clearSession()
        return
      }

      await resetSessionState({ nextStatus: 'unknown', purgeScopedData: false })
      bootstrapError.value = failure.message
      bootstrapState.value = 'error'
      sessionCheckedAt.value = new Date().toISOString()
    })().finally(() => {
      initPromise = null
    })

    return initPromise
  }

  async function fetchMe() {
    const data = await fetchSessionUser()
    await applyAuthenticatedUser(data)
    return data
  }

  async function fetchAuthConfig() {
    try {
      const { data } = await api.get<AuthConfigResponse>('/auth/config')
      allowSelfRegister.value = Boolean(data?.allow_self_register)
    } catch {
      allowSelfRegister.value = true
    }

    return allowSelfRegister.value
  }

  async function login(email: string, password: string) {
    action.value = 'login'
    try {
      await api.post<AuthResponse>('/auth/login', { email, password })
      return await fetchMe()
    } finally {
      action.value = 'idle'
    }
  }

  async function register(name: string, email: string, password: string, passwordConfirmation: string) {
    if (!allowSelfRegister.value) {
      throw new Error('Self-registration is disabled.')
    }

    action.value = 'register'
    try {
      await api.post<AuthResponse>('/auth/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      return await fetchMe()
    } finally {
      action.value = 'idle'
    }
  }

  async function logout() {
    action.value = 'logout'
    try {
      await api.post('/auth/logout')
    } catch {
      // Session state is cleared locally regardless of API response.
    } finally {
      await clearSession()
      action.value = 'idle'
    }
  }

  async function logoutAll() {
    action.value = 'logout_all'
    try {
      const { data } = await api.post<LogoutAllResponse>('/auth/logout-all')
      return data
    } finally {
      action.value = 'idle'
    }
  }

  return {
    user,
    status,
    bootstrapState,
    bootstrapError,
    sessionCheckedAt,
    action,
    initialized,
    loading,
    allowSelfRegister,
    isAuthenticated,
    initialize,
    fetchAuthConfig,
    fetchMe,
    login,
    register,
    logout,
    logoutAll,
    clearSession,
  }

  async function fetchSessionUser(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>('/auth/me')
    return normalizeAuthUser(data)
  }

  async function applyAuthenticatedUser(nextUser: AuthUser, runId?: number) {
    if (typeof runId === 'number' && runId !== initializeRunId) {
      return nextUser
    }

    user.value = nextUser
    await setUserScope(nextUser)
    status.value = 'authenticated'
    bootstrapError.value = null
    bootstrapState.value = 'ready'
    sessionCheckedAt.value = new Date().toISOString()
    return nextUser
  }

  async function resetSessionState(options: {
    nextStatus: Extract<AuthStatus, 'unknown' | 'unauthenticated'>
    purgeScopedData: boolean
  }) {
    const previousUserId = user.value?.id ?? getScope().userId

    user.value = null
    status.value = options.nextStatus
    setSyncQueueUserScope(null)

    if (options.purgeScopedData) {
      purgeScopedStorageForUser(previousUserId)
      await purgeLocalFallbackPersistenceForUser(previousUserId)
    }

    setScopeUserId(null)
    setScopeAccountId(null)
    migrateLegacyLocalFallbackKeys()
  }
})

function normalizeAuthUser(payload: unknown): AuthUser {
  const source = (payload && typeof payload === 'object' ? payload : null) as Record<string, unknown> | null
  const id = Number(source?.id)
  const name = typeof source?.name === 'string' ? source.name.trim() : ''
  const email = typeof source?.email === 'string' ? source.email.trim().toLowerCase() : ''

  if (!Number.isInteger(id) || id <= 0 || name === '' || email === '') {
    throw new Error('Invalid authenticated user payload.')
  }

  return {
    id,
    name,
    email,
  }
}

function classifyBootstrapFailure(error: unknown): {
  kind: 'unauthenticated' | 'retryable'
  message: string
} {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0
    if (status === 401 || status === 419) {
      return {
        kind: 'unauthenticated',
        message: 'Your session is no longer valid.',
      }
    }

    if (!error.response) {
      return {
        kind: 'retryable',
        message: error.code === 'ECONNABORTED'
          ? 'Session check timed out. Please retry.'
          : 'Unable to reach the API to verify your session. Check connectivity and try again.',
      }
    }

    const payload = error.response.data
    if (typeof payload === 'string' && /<(!doctype|html)/i.test(payload.trim())) {
      return {
        kind: 'retryable',
        message: 'Session check returned HTML instead of JSON. Verify API routing and upstream configuration.',
      }
    }
  }

  return {
    kind: 'retryable',
    message: 'Unable to verify your session right now. Please retry.',
  }
}
