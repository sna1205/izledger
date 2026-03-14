import { describe, expect, it } from 'vitest'
import { shouldApplyTradeHydration } from '@/utils/tradeEditHydration'

describe('tradeEditHydration', () => {
  it('applies hydration only for the latest matching trade request', () => {
    expect(shouldApplyTradeHydration(12, 12, 3, 3)).toBe(true)
    expect(shouldApplyTradeHydration(12, 15, 3, 3)).toBe(false)
    expect(shouldApplyTradeHydration(12, 12, 2, 3)).toBe(false)
    expect(shouldApplyTradeHydration(null, null, 4, 4)).toBe(true)
  })
})
