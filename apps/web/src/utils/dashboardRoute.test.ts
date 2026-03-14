import { describe, expect, it } from 'vitest'
import {
  buildDashboardQuery,
  dashboardRouteStatesEqual,
  parseDashboardQuery,
  type DashboardRouteState,
} from '@/utils/dashboardRoute'

describe('dashboardRoute', () => {
  it('parses canonical dashboard query state', () => {
    expect(parseDashboardQuery({
      mode: 'prop',
      tab: 'chart',
      range: 'custom',
      date_from: '2026-02-01',
      date_to: '2026-02-15',
      account_id: '42',
      include_drafts_unverified: '1',
    })).toEqual<DashboardRouteState>({
      mode: 'prop',
      tab: 'chart',
      rangePreset: 'custom',
      customDateFrom: '2026-02-01',
      customDateTo: '2026-02-15',
      accountId: 42,
      includeDraftsUnverified: true,
    })
  })

  it('sanitizes invalid query state to safe defaults', () => {
    expect(parseDashboardQuery({
      mode: 'demo',
      tab: 'heatmap',
      range: 'year',
      date_from: 'bad-date',
      date_to: '2026/02/01',
      account_id: '0',
      include_drafts_unverified: 'drafts',
    })).toEqual<DashboardRouteState>({
      mode: 'live',
      tab: 'overview',
      rangePreset: '30d',
      customDateFrom: '',
      customDateTo: '',
      accountId: null,
      includeDraftsUnverified: false,
    })
  })

  it('sorts reversed custom ranges', () => {
    expect(parseDashboardQuery({
      range: 'custom',
      date_from: '2026-03-10',
      date_to: '2026-03-01',
    })).toEqual<DashboardRouteState>({
      mode: 'live',
      tab: 'overview',
      rangePreset: 'custom',
      customDateFrom: '2026-03-01',
      customDateTo: '2026-03-10',
      accountId: null,
      includeDraftsUnverified: false,
    })
  })

  it('builds minimal canonical query params', () => {
    expect(buildDashboardQuery({
      mode: 'prop',
      tab: 'calendar',
      rangePreset: 'custom',
      customDateFrom: '2026-03-01',
      customDateTo: '2026-03-10',
      accountId: 7,
      includeDraftsUnverified: true,
    })).toEqual({
      mode: 'prop',
      tab: 'calendar',
      range: 'custom',
      date_from: '2026-03-01',
      date_to: '2026-03-10',
      account_id: '7',
      include_drafts_unverified: '1',
    })
  })

  it('compares route states structurally', () => {
    const left = parseDashboardQuery({
      mode: 'prop',
      tab: 'overview',
      range: 'custom',
      date_from: '2026-03-01',
      date_to: '2026-03-10',
      account_id: '9',
    })
    const right = parseDashboardQuery({
      mode: 'prop',
      range: 'custom',
      date_from: '2026-03-01',
      date_to: '2026-03-10',
      account_id: '9',
    })

    expect(dashboardRouteStatesEqual(left, right)).toBe(true)
    expect(dashboardRouteStatesEqual(left, {
      ...right,
      tab: 'chart',
    })).toBe(false)
  })
})
