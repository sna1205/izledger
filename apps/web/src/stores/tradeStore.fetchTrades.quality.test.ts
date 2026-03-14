import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTradeStore } from '@/stores/tradeStore'
import { scopedKey, setScope } from '@/services/storageScope'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  shouldUseLocalFallback: vi.fn(() => false),
  markServerHealthy: vi.fn(),
  markLocalFallback: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  default: {
    get: mocks.get,
  },
}))

vi.mock('@/services/localFallback', () => ({
  createLocalTrade: vi.fn(),
  deleteLocalTrade: vi.fn(),
  deleteLocalTradeImage: vi.fn(),
  fetchLocalTradeDetails: vi.fn(),
  queryLocalTrades: vi.fn(() => ({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  })),
  setLocalTradeSyncStatus: vi.fn(),
  shouldUseLocalFallback: mocks.shouldUseLocalFallback,
  upsertLocalTradeSnapshot: vi.fn(),
  updateLocalTrade: vi.fn(),
  uploadLocalTradeImage: vi.fn(),
}))

vi.mock('@/services/offlineSyncQueue', () => ({
  enqueueSyncCreate: vi.fn(),
  enqueueSyncDelete: vi.fn(),
  enqueueSyncUpdate: vi.fn(),
}))

vi.mock('@/stores/syncStatusStore', () => ({
  useSyncStatusStore: () => ({
    markServerHealthy: mocks.markServerHealthy,
    markLocalFallback: mocks.markLocalFallback,
    refreshQueueState: vi.fn(),
  }),
}))

vi.mock('@/stores/analyticsStore', () => ({
  useAnalyticsStore: () => ({
    fetchAnalytics: vi.fn(),
  }),
}))

vi.mock('@/stores/accountStore', () => ({
  useAccountStore: () => ({
    fetchAccounts: vi.fn(),
  }),
}))

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) ?? null) : null
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value))
  }
}

function installMemoryStorage() {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: new MemoryStorage(),
    configurable: true,
  })
}

describe('tradeStore.fetchTrades quality sync', () => {
  beforeEach(() => {
    installMemoryStorage()
    setActivePinia(createPinia())
    setScope({ userId: null, accountId: null })
    mocks.get.mockReset()
    mocks.shouldUseLocalFallback.mockReset()
    mocks.shouldUseLocalFallback.mockReturnValue(false)
    mocks.markServerHealthy.mockReset()
    mocks.markLocalFallback.mockReset()
    mocks.get.mockResolvedValue({
      data: {
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
      },
    })
  })

  it('uses the live toggle state instead of rereading stale storage during fetch', async () => {
    const store = useTradeStore()
    store.setIncludeDraftsUnverified(true)

    localStorage.setItem(scopedKey('trade-preferences', 'include_drafts_unverified'), '0')

    await store.fetchTrades(1)

    expect(store.includeDraftsUnverified).toBe(true)
    expect(mocks.get).toHaveBeenCalledWith(
      '/trades',
      expect.objectContaining({
        params: expect.objectContaining({
          include_drafts_unverified: 1,
          local_sync_status: undefined,
          risk_validation_status: undefined,
        }),
      })
    )
  })
})
