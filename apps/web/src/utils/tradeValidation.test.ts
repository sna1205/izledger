import { describe, expect, it } from 'vitest'
import { validateTradeIntegrity } from './tradeValidation'

const baseInput = {
  date: '2026-03-12T10:00',
  direction: 'buy' as const,
  entry_price: 1.1,
  stop_loss: 1.099,
  take_profit: 1.102,
  position_size: 0.1,
  commission: 0,
  spread_cost: 0,
  slippage_cost: 0,
  trade_completed: true,
  primary_exit: {
    price: 1.101,
    quantity_lots: 0.1,
    executed_at: '2026-03-12T10:15',
  },
  exit_legs: [],
  instrument: {
    min_lot: '0.01',
    lot_step: '0.01',
  },
  now_ms: new Date('2026-03-13T00:00:00Z').getTime(),
}

describe('validateTradeIntegrity', () => {
  it('rejects impossible buy price ordering', () => {
    const errors = validateTradeIntegrity({
      ...baseInput,
      stop_loss: 1.101,
    })

    expect(errors.stop_loss).toBe('For buy trades, stop loss must be below entry.')
  })

  it('rejects future close dates', () => {
    const errors = validateTradeIntegrity({
      ...baseInput,
      date: '2026-03-14T10:00',
    })

    expect(errors.date).toBe('Close date cannot be in the future.')
  })

  it('rejects non-positive position sizes', () => {
    const errors = validateTradeIntegrity({
      ...baseInput,
      position_size: 0,
    })

    expect(errors.position_size).toBe('Position size must be greater than 0.')
  })

  it('rejects lot sizes that do not align to the instrument step', () => {
    const errors = validateTradeIntegrity({
      ...baseInput,
      position_size: 0.015,
    })

    expect(errors.position_size).toBe('Lot size must align to step 0.01.')
  })

  it('rejects partial exit times in the future', () => {
    const errors = validateTradeIntegrity({
      ...baseInput,
      exit_legs: [
        {
          price: 1.1015,
          quantity_lots: 0.01,
          executed_at: '2026-03-14T10:00',
        },
      ],
    })

    expect(errors['legs.0.executed_at']).toBe('Partial exit 1 time cannot be in the future.')
  })
})
