import type { LocationQuery, LocationQueryRaw, LocationQueryValue } from 'vue-router'

export const TRADE_QUALITY_QUERY_KEY = 'include_drafts_unverified'

function firstQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null
  }

  return typeof value === 'string' ? value : null
}

export function resolveTradeQualityRoutePreference(
  query: LocationQuery,
  fallbackIncludeDraftsUnverified: boolean
): boolean {
  const rawValue = firstQueryValue(query[TRADE_QUALITY_QUERY_KEY])
  return resolveTradeQualityRawValue(rawValue, fallbackIncludeDraftsUnverified)
}

export function resolveTradeQualitySearchPreference(
  search: string,
  fallbackIncludeDraftsUnverified: boolean
): boolean {
  const params = new URLSearchParams(search)
  return resolveTradeQualityRawValue(params.get(TRADE_QUALITY_QUERY_KEY), fallbackIncludeDraftsUnverified)
}

function resolveTradeQualityRawValue(
  rawValue: string | null,
  fallbackIncludeDraftsUnverified: boolean
): boolean {
  if (rawValue === null) {
    return fallbackIncludeDraftsUnverified
  }

  const normalized = rawValue.trim().toLowerCase()
  if (normalized === '1' || normalized === 'true') {
    return true
  }

  if (normalized === '0' || normalized === 'false' || normalized === '') {
    return false
  }

  return false
}

export function buildTradeQualityQuery(query: LocationQuery, includeDraftsUnverified: boolean): LocationQueryRaw {
  const nextQuery: LocationQueryRaw = { ...query }

  if (includeDraftsUnverified) {
    nextQuery[TRADE_QUALITY_QUERY_KEY] = '1'
  } else {
    delete nextQuery[TRADE_QUALITY_QUERY_KEY]
  }

  return nextQuery
}

export function isTradeQualityQueryCanonical(
  query: LocationQuery,
  includeDraftsUnverified: boolean
): boolean {
  const rawValue = firstQueryValue(query[TRADE_QUALITY_QUERY_KEY])

  if (includeDraftsUnverified) {
    return rawValue === '1'
  }

  return rawValue === null
}
