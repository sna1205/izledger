import { describe, expect, it } from 'vitest'
import { normalizeApiError } from '@/utils/apiError'

describe('api_error_normalizer_handles_422_and_409_consistently', () => {
  it('normalizes legacy 422 validation shape', () => {
    const normalized = normalizeApiError({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          message: 'Validation failed.',
          errors: {
            account_id: ['Account is required.'],
          },
          failed_required_rule_ids: [12, 34],
        },
      },
    })

    expect(normalized.status).toBe(422)
    expect(normalized.isValidation).toBe(true)
    expect(normalized.message).toBe('Account is required.')
    expect(normalized.fieldErrors.account_id?.[0]).toBe('Account is required.')
    expect(normalized.failingRuleIds).toEqual([12, 34])
  })

  it('prefers field-level message when validation message is generic', () => {
    const normalized = normalizeApiError({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          error: {
            status: 422,
            code: 'validation_failed',
            message: 'Validation failed.',
            details: [
              {
                field: 'email',
                message: 'Invalid email or password.',
              },
            ],
          },
          message: 'Validation failed.',
        },
      },
    })

    expect(normalized.status).toBe(422)
    expect(normalized.message).toBe('Invalid email or password.')
    expect(normalized.fieldErrors.email?.[0]).toBe('Invalid email or password.')
  })

  it('normalizes v2 409 conflict shape', () => {
    const normalized = normalizeApiError({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            version: '2026-03-02',
            status: 409,
            code: 'trade_revision_conflict',
            message: 'Trade update conflict.',
            details: [
              {
                field: 'revision',
                message: 'Trade revision no longer matches latest server state.',
              },
            ],
            meta: {
              current: {
                revision: 9,
              },
            },
          },
        },
      },
    })

    expect(normalized.status).toBe(409)
    expect(normalized.isConflict).toBe(true)
    expect(normalized.code).toBe('trade_revision_conflict')
    expect(normalized.details[0]?.field).toBe('revision')
  })
})
