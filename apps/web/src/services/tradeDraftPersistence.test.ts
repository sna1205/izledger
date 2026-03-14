import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearTradeFormDraft,
  readTradeFormDraft,
  writeTradeFormDraft,
  type PersistedTradeDraftPayload,
} from '@/services/tradeDraftPersistence'
import { __resetScopedIndexedDbForTests } from '@/services/scopedIndexedDb'
import { setScope } from '@/services/storageScope'

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

function makeDraftPayload(): PersistedTradeDraftPayload {
  return {
    version: 1,
    trade_completed: true,
    form: {
      account_id: '2',
      instrument_id: '7',
      strategy_model_id: '11',
      setup_id: '13',
      killzone_id: '17',
      session_enum: 'london',
      symbol: 'EURUSD',
      direction: 'buy',
      date: '2026-03-13T10:30',
      entry_price: 1.1,
      stop_loss: 1.095,
      take_profit: 1.11,
      position_size: 0.25,
      commission: 4.5,
      swap: 0,
      spread_cost: 1.25,
      slippage_cost: 0.5,
      followed_rules: true,
      emotion: 'calm',
      notes: 'Waiting for London continuation.',
      tag_ids: [3, 5],
    },
    psychology: {
      pre_emotion: 'focused',
      post_emotion: '',
      confidence_score: 8,
      stress_score: 3,
      sleep_hours: 7.5,
      impulse_flag: false,
      fomo_flag: false,
      revenge_flag: false,
      notes: 'Disciplined session.',
    },
    primary_exit: {
      price: 1.108,
      quantity_lots: 0.25,
      executed_at: '2026-03-13T11:00',
      fees: 0,
      notes: 'Manual exit',
    },
    exit_legs: [],
    pending_images: [
      {
        id: 'pending-1',
        file: new File(['chart'], 'chart.png', { type: 'image/png', lastModified: 123 }),
        context_tag: 'entry',
        timeframe: 'M5',
        annotation_notes: 'Entry markup',
      },
    ],
  }
}

describe('tradeDraftPersistence', () => {
  beforeEach(async () => {
    installMemoryStorage()
    setScope({ userId: 91, accountId: null })
    await __resetScopedIndexedDbForTests()
  })

  it('persists and restores a scoped trade draft including pending files', async () => {
    const payload = makeDraftPayload()

    const savedAt = await writeTradeFormDraft(payload)
    const restored = await readTradeFormDraft()

    expect(restored).not.toBeNull()
    expect(restored?.savedAt).toBe(savedAt)
    expect(restored?.draft.form.symbol).toBe('EURUSD')
    expect(restored?.draft.pending_images).toHaveLength(1)
    expect(restored?.draft.pending_images[0]?.file.name).toBe('chart.png')
    expect(restored?.draft.pending_images[0]?.annotation_notes).toBe('Entry markup')
  })

  it('clears the persisted trade draft cleanly', async () => {
    await writeTradeFormDraft(makeDraftPayload())

    await clearTradeFormDraft()

    await expect(readTradeFormDraft()).resolves.toBeNull()
  })
})
