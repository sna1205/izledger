import { describe, expect, it } from 'vitest'
import {
  buildTradeQualityQuery,
  isTradeQualityQueryCanonical,
  resolveTradeQualityRoutePreference,
  resolveTradeQualitySearchPreference,
  TRADE_QUALITY_QUERY_KEY,
} from '@/utils/tradeQualityRoute'

describe('tradeQualityRoute', () => {
  it('falls back to persisted preference when query is absent', () => {
    expect(resolveTradeQualityRoutePreference({}, true)).toBe(true)
    expect(resolveTradeQualityRoutePreference({}, false)).toBe(false)
  })

  it('uses explicit query values over persisted preference', () => {
    expect(resolveTradeQualityRoutePreference({ [TRADE_QUALITY_QUERY_KEY]: '1' }, false)).toBe(true)
    expect(resolveTradeQualityRoutePreference({ [TRADE_QUALITY_QUERY_KEY]: 'true' }, false)).toBe(true)
    expect(resolveTradeQualityRoutePreference({ [TRADE_QUALITY_QUERY_KEY]: '0' }, true)).toBe(false)
    expect(resolveTradeQualityRoutePreference({ [TRADE_QUALITY_QUERY_KEY]: 'false' }, true)).toBe(false)
    expect(resolveTradeQualitySearchPreference('?include_drafts_unverified=1', false)).toBe(true)
    expect(resolveTradeQualitySearchPreference('?include_drafts_unverified=false', true)).toBe(false)
  })

  it('sanitizes invalid query values back to verified-only mode', () => {
    expect(resolveTradeQualityRoutePreference({ [TRADE_QUALITY_QUERY_KEY]: 'drafts' }, true)).toBe(false)
    expect(resolveTradeQualityRoutePreference({ [TRADE_QUALITY_QUERY_KEY]: 'drafts' }, false)).toBe(false)
  })

  it('builds canonical route queries without dropping unrelated params', () => {
    expect(buildTradeQualityQuery({ focus: 'needs_review' }, true)).toEqual({
      focus: 'needs_review',
      [TRADE_QUALITY_QUERY_KEY]: '1',
    })

    expect(
      buildTradeQualityQuery(
        {
          focus: 'needs_review',
          [TRADE_QUALITY_QUERY_KEY]: '1',
        },
        false
      )
    ).toEqual({
      focus: 'needs_review',
    })
  })

  it('detects canonical and non-canonical query states', () => {
    expect(isTradeQualityQueryCanonical({}, false)).toBe(true)
    expect(isTradeQualityQueryCanonical({ [TRADE_QUALITY_QUERY_KEY]: '1' }, true)).toBe(true)
    expect(isTradeQualityQueryCanonical({ [TRADE_QUALITY_QUERY_KEY]: 'true' }, true)).toBe(false)
    expect(isTradeQualityQueryCanonical({ [TRADE_QUALITY_QUERY_KEY]: '0' }, false)).toBe(false)
  })
})
