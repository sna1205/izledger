import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/authStore'

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  default: {
    get: getMock,
    post: postMock,
  },
}))

vi.mock('@/services/localFallback', () => ({
  initializeLocalFallbackPersistence: vi.fn().mockResolvedValue(undefined),
  migrateLegacyLocalFallbackKeys: vi.fn(),
  purgeLocalFallbackPersistenceForUser: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/storageScope', () => ({
  getScope: vi.fn(() => ({ userId: null, accountId: null })),
  purgeScopedStorageForUser: vi.fn(),
  setScopeAccountId: vi.fn(),
  setScopeUserId: vi.fn(),
}))

vi.mock('@/services/offlineSyncQueue', () => ({
  setSyncQueueUserScope: vi.fn(),
}))

describe('authStore initialize bootstrap', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getMock.mockReset()
    postMock.mockReset()
  })

  it('restores a valid session on startup', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/auth/config') {
        return { data: { allow_self_register: true } }
      }

      if (url === '/auth/me') {
        return {
          data: {
            id: 42,
            name: 'Trader Jane',
            email: 'jane@example.com',
          },
        }
      }

      throw new Error(`Unexpected GET ${url}`)
    })

    const authStore = useAuthStore()
    await authStore.initialize()

    expect(authStore.status).toBe('authenticated')
    expect(authStore.bootstrapState).toBe('ready')
    expect(authStore.bootstrapError).toBeNull()
    expect(authStore.user?.email).toBe('jane@example.com')
  })

  it('marks the session unauthenticated when the server returns 401', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/auth/config') {
        return { data: { allow_self_register: true } }
      }

      if (url === '/auth/me') {
        const error = new Error('Unauthorized') as Error & {
          isAxiosError: boolean
          response: { status: number; data: Record<string, unknown> }
        }
        error.isAxiosError = true
        error.response = {
          status: 401,
          data: { message: 'Unauthenticated.' },
        }
        throw error
      }

      throw new Error(`Unexpected GET ${url}`)
    })

    const authStore = useAuthStore()
    await authStore.initialize()

    expect(authStore.status).toBe('unauthenticated')
    expect(authStore.bootstrapState).toBe('ready')
    expect(authStore.bootstrapError).toBeNull()
    expect(authStore.user).toBeNull()
  })

  it('surfaces retryable bootstrap failures without pretending the user is logged out', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/auth/config') {
        return { data: { allow_self_register: true } }
      }

      if (url === '/auth/me') {
        const error = new Error('Network Error') as Error & {
          isAxiosError: boolean
          code: string
          response?: undefined
        }
        error.isAxiosError = true
        error.code = 'ERR_NETWORK'
        throw error
      }

      throw new Error(`Unexpected GET ${url}`)
    })

    const authStore = useAuthStore()
    await authStore.initialize()

    expect(authStore.status).toBe('unknown')
    expect(authStore.bootstrapState).toBe('error')
    expect(authStore.bootstrapError).toBe('Unable to reach the API to verify your session. Check connectivity and try again.')
    expect(authStore.user).toBeNull()
  })
})
