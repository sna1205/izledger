export type DashboardRouteTab = 'overview' | 'chart' | 'calendar'
export type DashboardRouteMode = 'live' | 'prop'
export type DashboardRouteRangePreset = '30d' | 'custom'

export interface DashboardRouteState {
  mode: DashboardRouteMode
  tab: DashboardRouteTab
  rangePreset: DashboardRouteRangePreset
  customDateFrom: string
  customDateTo: string
  accountId: number | null
  includeDraftsUnverified: boolean
}

export type DashboardRouteQuery = Record<string, unknown>

export const DASHBOARD_ROUTE_QUERY_KEYS = [
  'mode',
  'tab',
  'range',
  'date_from',
  'date_to',
  'account_id',
  'include_drafts_unverified',
] as const

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parseDashboardQuery(query: DashboardRouteQuery): DashboardRouteState {
  const mode = normalizeMode(readQueryValue(query.mode))
  const tab = normalizeTab(readQueryValue(query.tab))
  const rangePreset = normalizeRangePreset(readQueryValue(query.range))
  const parsedAccountId = parsePositiveInteger(readQueryValue(query.account_id))
  const includeDraftsUnverified = parseBooleanFlag(readQueryValue(query.include_drafts_unverified))

  let customDateFrom = ''
  let customDateTo = ''

  if (rangePreset === 'custom') {
    customDateFrom = normalizeIsoDate(readQueryValue(query.date_from))
    customDateTo = normalizeIsoDate(readQueryValue(query.date_to))

    if (customDateFrom && customDateTo && customDateFrom > customDateTo) {
      const nextFrom = customDateTo
      customDateTo = customDateFrom
      customDateFrom = nextFrom
    }
  }

  return {
    mode,
    tab,
    rangePreset,
    customDateFrom,
    customDateTo,
    accountId: parsedAccountId,
    includeDraftsUnverified,
  }
}

export function buildDashboardQuery(state: DashboardRouteState): Record<string, string> {
  const query: Record<string, string> = {}

  if (state.mode === 'prop') {
    query.mode = 'prop'
  }

  if (state.tab !== 'overview') {
    query.tab = state.tab
  }

  if (state.rangePreset === 'custom') {
    query.range = 'custom'
    if (state.customDateFrom) {
      query.date_from = state.customDateFrom
    }
    if (state.customDateTo) {
      query.date_to = state.customDateTo
    }
  }

  if (state.accountId !== null) {
    query.account_id = String(state.accountId)
  }

  if (state.includeDraftsUnverified) {
    query.include_drafts_unverified = '1'
  }

  return query
}

export function dashboardRouteStatesEqual(
  left: DashboardRouteState,
  right: DashboardRouteState
): boolean {
  return left.mode === right.mode
    && left.tab === right.tab
    && left.rangePreset === right.rangePreset
    && left.customDateFrom === right.customDateFrom
    && left.customDateTo === right.customDateTo
    && left.accountId === right.accountId
    && left.includeDraftsUnverified === right.includeDraftsUnverified
}

function readQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0] ?? '').trim() : ''
  }

  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

function normalizeMode(value: string): DashboardRouteMode {
  return value === 'prop' ? 'prop' : 'live'
}

function normalizeTab(value: string): DashboardRouteTab {
  if (value === 'chart' || value === 'calendar') {
    return value
  }

  return 'overview'
}

function normalizeRangePreset(value: string): DashboardRouteRangePreset {
  return value === 'custom' ? 'custom' : '30d'
}

function normalizeIsoDate(value: string): string {
  return ISO_DATE_PATTERN.test(value) ? value : ''
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

function parseBooleanFlag(value: string): boolean {
  return value === '1' || value.toLowerCase() === 'true'
}
