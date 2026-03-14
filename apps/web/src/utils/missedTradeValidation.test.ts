import { describe, expect, it } from 'vitest'
import {
  normalizeMissedTradeTags,
  parseMissedTradeTags,
  sanitizeMissedTradeTag,
  validateMissedTradeIntegrity,
} from './missedTradeValidation'

describe('missedTradeValidation', () => {
  it('requires at least one normalized reason tag', () => {
    const errors = validateMissedTradeIntegrity({
      pair: 'EURUSD',
      model: 'Breakout',
      date: '2026-03-12T10:00',
      tags: ['   '],
      now_ms: new Date('2026-03-13T00:00:00Z').getTime(),
    })

    expect(errors.tags).toBe('At least one reason tag is required.')
  })

  it('rejects future dates', () => {
    const errors = validateMissedTradeIntegrity({
      pair: 'EURUSD',
      model: 'Breakout',
      date: '2026-03-14T10:00',
      tags: ['hesitation'],
      now_ms: new Date('2026-03-13T00:00:00Z').getTime(),
    })

    expect(errors.date).toBe('Date cannot be in the future.')
  })

  it('normalizes legacy and freeform tags into stable slugs', () => {
    expect(sanitizeMissedTradeTag('Late Entry')).toBe('late-entry')
    expect(sanitizeMissedTradeTag('session:New York')).toBe('session:new-york')
    expect(parseMissedTradeTags('Late Entry, hesitation, hesitation')).toEqual(['late-entry', 'hesitation'])
  })

  it('deduplicates and trims tags', () => {
    expect(normalizeMissedTradeTags([' hesitation ', 'hesitation', 'session:london'])).toEqual([
      'hesitation',
      'session:london',
    ])
  })
})
