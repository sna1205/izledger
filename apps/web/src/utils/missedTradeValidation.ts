export interface MissedTradeValidationInput {
  pair: string
  model: string
  date: string
  tags: string[]
  now_ms?: number
}

const TAG_SANITIZE_PATTERN = /[^a-z0-9:_-]+/g

export function validateMissedTradeIntegrity(input: MissedTradeValidationInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const pair = input.pair.trim().toUpperCase()
  const model = input.model.trim()
  const dateTimestamp = parseMissedTradeDateTime(input.date)
  const reasonTags = normalizeMissedTradeTags(input.tags)
  const now = input.now_ms ?? Date.now()

  if (!pair) {
    errors.pair = 'Pair is required.'
  } else if (pair.length > 30) {
    errors.pair = 'Pair must be 30 characters or fewer.'
  }

  if (!model) {
    errors.model = 'Model is required.'
  } else if (model.length > 120) {
    errors.model = 'Model must be 120 characters or fewer.'
  }

  if (dateTimestamp === null) {
    errors.date = 'Date is required.'
  } else if (dateTimestamp > now + 60_000) {
    errors.date = 'Date cannot be in the future.'
  }

  if (reasonTags.length === 0) {
    errors.tags = 'At least one reason tag is required.'
  }

  return errors
}

export function parseMissedTradeDateTime(value: string): number | null {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function parseMissedTradeTags(value: string): string[] {
  return normalizeMissedTradeTags(value.split(','))
}

export function normalizeMissedTradeTags(values: string[]): string[] {
  const normalized = values
    .map((value) => sanitizeMissedTradeTag(value))
    .filter((value) => value.length > 0)

  return Array.from(new Set(normalized))
}

export function sanitizeMissedTradeTag(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (trimmed === '') return ''

  return trimmed
    .replace(/\s+/g, '-')
    .replace(TAG_SANITIZE_PATTERN, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
