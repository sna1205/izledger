import { type Page, type Route } from '@playwright/test'

type AuthMeResponse = {
  status: number
  body?: unknown
}

type MockThemeMode = 'light' | 'dark' | 'forest' | 'dawn'
type ChecklistScope = 'global' | 'account' | 'strategy'
type ChecklistMode = 'soft' | 'strict'

interface MockUser {
  id: number
  name: string
  email: string
}

interface MockAccount {
  id: number
  user_id: number | null
  name: string
  broker: string
  account_type: 'personal' | 'funded' | 'demo'
  starting_balance: string
  current_balance: string
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface MockInstrument {
  id: number
  symbol: string
  asset_class: string
  base_currency: string
  quote_currency: string
  contract_size: string
  tick_size: string
  tick_value: string
  pip_size: string
  min_lot: string
  lot_step: string
  is_active: boolean
}

interface MockTrade {
  id: number
  revision: number
  account_id: number
  instrument_id: number | null
  strategy_model_id?: number | null
  setup_id?: number | null
  killzone_id?: number | null
  session_enum?: string | null
  pair: string
  direction: 'buy' | 'sell'
  entry_price: string
  stop_loss: string
  take_profit: string
  actual_exit_price: string | null
  lot_size: string
  risk_per_unit: string | null
  reward_per_unit: string | null
  monetary_risk: string | null
  monetary_reward: string | null
  commission?: string | null
  swap?: string | null
  spread_cost?: string | null
  slippage_cost?: string | null
  fx_rate_quote_to_usd?: string | null
  fx_symbol_used?: string | null
  fx_rate_timestamp?: string | null
  profit_loss: string
  rr: string
  r_multiple: string | null
  risk_percent: string | null
  account_balance_before_trade: string | null
  account_balance_after_trade: string | null
  followed_rules: boolean
  checklist_incomplete?: boolean
  executed_checklist_id?: number | null
  executed_checklist_version?: number | null
  executed_enforcement_mode?: 'strict' | 'soft' | 'off' | null
  failed_rule_ids?: number[] | null
  failed_rule_titles?: string[] | null
  check_evaluated_at?: string | null
  emotion: string
  session: string
  model: string
  date: string
  notes: string | null
  tag_ids?: number[]
  images?: unknown[]
  images_count?: number
  created_at: string
  updated_at: string
  deleted_at?: string | null
  local_sync_status?: 'draft_local' | 'pending_sync' | 'synced' | 'conflict'
  risk_validation_status?: 'verified' | 'unverified'
}

interface MockMissedTrade {
  id: number
  pair: string
  model: string
  reason: string
  date: string
  notes: string | null
  images?: unknown[]
  images_count?: number
  created_at: string
  updated_at: string
}

interface MockChecklist {
  id: number
  user_id?: number | null
  account_id?: number | null
  strategy_model_id?: number | null
  name: string
  revision?: number
  scope: ChecklistScope
  enforcement_mode: ChecklistMode
  is_active: boolean
  created_at: string
  updated_at: string
  active_items_count?: number
}

interface MockChecklistItem {
  id: number
  checklist_id: number
  order_index: number
  title: string
  type: 'checkbox' | 'dropdown' | 'number' | 'text' | 'scale'
  required: boolean
  category: string
  help_text?: string | null
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

interface MockReport {
  id: number
  name: string
  scope: 'trades' | 'dashboard'
  filters_json: Record<string, unknown>
  columns_json: string[] | null
  is_default: boolean
  created_at: string
  updated_at: string
}

interface MockState {
  authenticated: boolean
  authUser: MockUser
  authMeResponses: AuthMeResponse[]
  authMeIndex: number
  preferences: {
    user_id: number
    theme_mode: MockThemeMode
    profile_timezone: string
    profile_locale: string
    updated_at: string
  }
  accounts: MockAccount[]
  instruments: MockInstrument[]
  fxRates: Array<{ id: number; from_currency: string; to_currency: string; rate: string; rate_updated_at: string }>
  strategyModels: Array<{ id: number; name: string; slug: string; description: string | null; is_active: boolean }>
  setups: Array<{ id: number; name: string; slug: string; description: string | null; is_active: boolean }>
  killzones: Array<{ id: number; name: string; slug: string; session_enum: string; description: string | null; is_active: boolean }>
  tradeTags: Array<{ id: number; name: string; slug: string; description: string | null; is_active: boolean }>
  sessionOptions: Array<{ value: string; label: string }>
  trades: MockTrade[]
  missedTrades: MockMissedTrade[]
  checklists: MockChecklist[]
  checklistItemsByChecklistId: Record<number, MockChecklistItem[]>
  reports: MockReport[]
  requestLog: {
    tradeCreates: Array<Record<string, unknown>>
    tradeUpdates: Array<Record<string, unknown>>
    missedTradeCreates: Array<Record<string, unknown>>
    ruleResponseWrites: Array<Record<string, unknown>>
  }
}

interface MockAppOptions {
  authenticated?: boolean
  authMeResponses?: AuthMeResponse[]
  preferences?: Partial<MockState['preferences']>
  accounts?: MockAccount[]
  instruments?: MockInstrument[]
  fxRates?: MockState['fxRates']
  trades?: MockTrade[]
  missedTrades?: MockMissedTrade[]
  checklists?: MockChecklist[]
  checklistItemsByChecklistId?: Record<number, MockChecklistItem[]>
  reports?: MockReport[]
}

const ISO_NOW = '2026-03-10T09:30:00.000Z'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function paginate<T>(rows: T[], pageRaw: string | null, perPageRaw: string | null) {
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1)
  const perPage = Math.max(1, Number.parseInt(perPageRaw ?? '15', 10) || 15)
  const start = (page - 1) * perPage
  const data = rows.slice(start, start + perPage)
  return {
    current_page: page,
    data,
    last_page: Math.max(1, Math.ceil(rows.length / perPage)),
    per_page: perPage,
    total: rows.length,
  }
}

function defaultAccounts(): MockAccount[] {
  return [
    {
      id: 1,
      user_id: 99,
      name: 'USD Primary',
      broker: 'Apex',
      account_type: 'personal',
      starting_balance: '10000.00',
      current_balance: '10250.00',
      currency: 'USD',
      is_active: true,
      created_at: ISO_NOW,
      updated_at: ISO_NOW,
    },
    {
      id: 2,
      user_id: 99,
      name: 'EUR Prop',
      broker: 'FundingPips',
      account_type: 'funded',
      starting_balance: '25000.00',
      current_balance: '25200.00',
      currency: 'EUR',
      is_active: true,
      created_at: ISO_NOW,
      updated_at: ISO_NOW,
    },
  ]
}

function defaultInstruments(): MockInstrument[] {
  return [
    {
      id: 1,
      symbol: 'EURUSD',
      asset_class: 'forex',
      base_currency: 'EUR',
      quote_currency: 'USD',
      contract_size: '100000',
      tick_size: '0.00001',
      tick_value: '1',
      pip_size: '0.0001',
      min_lot: '0.01',
      lot_step: '0.01',
      is_active: true,
    },
    {
      id: 2,
      symbol: 'EURJPY',
      asset_class: 'forex',
      base_currency: 'EUR',
      quote_currency: 'JPY',
      contract_size: '100000',
      tick_size: '0.001',
      tick_value: '100',
      pip_size: '0.01',
      min_lot: '0.01',
      lot_step: '0.01',
      is_active: true,
    },
    {
      id: 3,
      symbol: 'GBPUSD',
      asset_class: 'forex',
      base_currency: 'GBP',
      quote_currency: 'USD',
      contract_size: '100000',
      tick_size: '0.00001',
      tick_value: '1',
      pip_size: '0.0001',
      min_lot: '0.01',
      lot_step: '0.01',
      is_active: true,
    },
  ]
}

function defaultTrades(): MockTrade[] {
  return [
    {
      id: 201,
      revision: 3,
      account_id: 1,
      instrument_id: 1,
      strategy_model_id: 1,
      setup_id: 1,
      killzone_id: 1,
      session_enum: 'london',
      pair: 'EURUSD',
      direction: 'buy',
      entry_price: '1.1000',
      stop_loss: '1.0990',
      take_profit: '1.1020',
      actual_exit_price: '1.1015',
      lot_size: '0.10',
      risk_per_unit: '0.0010',
      reward_per_unit: '0.0020',
      monetary_risk: '10.00',
      monetary_reward: '20.00',
      commission: '0',
      swap: '0',
      spread_cost: '0',
      slippage_cost: '0',
      fx_rate_quote_to_usd: '1',
      fx_symbol_used: 'EURUSD',
      fx_rate_timestamp: ISO_NOW,
      profit_loss: '15.00',
      rr: '2.0',
      r_multiple: '1.50',
      risk_percent: '0.10',
      account_balance_before_trade: '10000.00',
      account_balance_after_trade: '10015.00',
      followed_rules: true,
      checklist_incomplete: false,
      executed_checklist_id: null,
      executed_checklist_version: null,
      executed_enforcement_mode: null,
      failed_rule_ids: [],
      failed_rule_titles: [],
      check_evaluated_at: ISO_NOW,
      emotion: 'calm',
      session: 'London',
      model: 'Breakout',
      date: '2026-03-09T09:30:00.000Z',
      notes: 'Seed trade for edit and defaults.',
      tag_ids: [],
      images: [],
      images_count: 0,
      created_at: '2026-03-09T09:40:00.000Z',
      updated_at: '2026-03-09T09:40:00.000Z',
      deleted_at: null,
      local_sync_status: 'synced',
      risk_validation_status: 'verified',
    },
    {
      id: 202,
      revision: 1,
      account_id: 2,
      instrument_id: 3,
      strategy_model_id: 2,
      setup_id: 2,
      killzone_id: 2,
      session_enum: 'new_york',
      pair: 'GBPUSD',
      direction: 'sell',
      entry_price: '1.2600',
      stop_loss: '1.2620',
      take_profit: '1.2550',
      actual_exit_price: '1.2610',
      lot_size: '0.12',
      risk_per_unit: '0.0020',
      reward_per_unit: '0.0050',
      monetary_risk: '24.00',
      monetary_reward: '60.00',
      commission: '0',
      swap: '0',
      spread_cost: '0',
      slippage_cost: '0',
      fx_rate_quote_to_usd: '1',
      fx_symbol_used: 'GBPUSD',
      fx_rate_timestamp: ISO_NOW,
      profit_loss: '-8.00',
      rr: '2.5',
      r_multiple: '-0.33',
      risk_percent: '0.10',
      account_balance_before_trade: '25200.00',
      account_balance_after_trade: '25192.00',
      followed_rules: false,
      checklist_incomplete: true,
      executed_checklist_id: null,
      executed_checklist_version: null,
      executed_enforcement_mode: null,
      failed_rule_ids: [],
      failed_rule_titles: [],
      check_evaluated_at: ISO_NOW,
      emotion: 'hesitant',
      session: 'New York',
      model: 'Liquidity Sweep',
      date: '2026-03-08T13:00:00.000Z',
      notes: 'Draft/unverified prop trade.',
      tag_ids: [],
      images: [],
      images_count: 0,
      created_at: '2026-03-08T13:05:00.000Z',
      updated_at: '2026-03-08T13:05:00.000Z',
      deleted_at: null,
      local_sync_status: 'draft_local',
      risk_validation_status: 'unverified',
    },
  ]
}

function defaultDashboardSummary() {
  return {
    overview: {
      total_trades: 8,
      win_rate: 62.5,
      total_profit: 480,
      total_loss: 210,
      profit_factor: 2.29,
      return_on_equity_pct: 2.7,
      expectancy: 0.42,
      average_r: 0.68,
      recovery_factor: 1.8,
    },
    daily: [
      { date: '2026-03-08', close_date: '2026-03-08', total_trades: 2, profit_loss: 40, average_r: 0.5, win_rate: 50 },
      { date: '2026-03-09', close_date: '2026-03-09', total_trades: 2, profit_loss: 70, average_r: 0.8, win_rate: 100 },
    ],
    performance_profile: {
      win_rate: 62.5,
      avg_rr: 1.8,
      profit_factor: 2.29,
      consistency_score: 74,
      recovery_factor: 1.8,
      sharpe_ratio: 1.4,
    },
    equity: {
      equity_points: [10000, 10040, 10110, 10270],
      cumulative_profit: [0, 40, 110, 270],
      equity_timestamps: ['2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09'],
    },
    drawdown: {
      max_drawdown: 120,
      max_drawdown_percent: 1.2,
      current_drawdown: 20,
      current_drawdown_percent: 0.2,
      peak_balance: 10270,
      current_equity: 10250,
    },
    streaks: {
      longest_win_streak: 3,
      longest_loss_streak: 2,
      current_win_streak: 1,
      current_loss_streak: 0,
      current_streak: { type: 'win', length: 1 },
    },
    metrics: {
      total_trades: 8,
      wins: 5,
      losses: 3,
      breakeven: 0,
      win_rate: 62.5,
      loss_rate: 37.5,
      average_win: 96,
      average_loss: 70,
      total_winning_amount: 480,
      total_losing_amount: 210,
      net_profit: 270,
      profit_factor: 2.29,
      expectancy: 33.75,
      expectancy_money: 33.75,
      expectancy_r: 0.42,
      payoff_ratio: 1.37,
      recovery_factor: 1.8,
      average_r: 0.68,
      avg_r: 0.68,
      avg_r_realized: 0.65,
      avg_rr_planned: 1.8,
      sharpe_ratio: 1.4,
    },
    behavioral: {
      discipline_comparison: {
        followed_rules: { total_trades: 5, expectancy: 0.8 },
        broke_rules: { total_trades: 3, expectancy: -0.2 },
        insight: {
          when_follow_rules: 'Best trades cluster around patient execution.',
          when_break_rules: 'Losses spike when entries are rushed.',
        },
      },
      emotion_analytics: {
        breakdown: [
          { emotion: 'calm', total_trades: 4, pnl: 180 },
          { emotion: 'hesitant', total_trades: 2, pnl: -30 },
        ],
        most_costly_emotion: 'hesitant',
        most_profitable_mindset: 'calm',
      },
      psychology_correlations: {
        confidence_buckets: [],
        stress_buckets: [],
        flags: {},
      },
    },
    rankings: {
      sessions: [],
      killzones: [],
      setups: [],
      strategy_models: [],
      symbols: [],
    },
    monthly_heatmap: {
      months: [],
      max_abs_daily_pnl: 120,
    },
    risk_status: {
      risk_percent_warning: false,
      loss_streak_caution: false,
      drawdown_banner: false,
      revenge_behavior_flag: false,
      latest_risk_percent: 0.75,
      max_risk_percent: 1,
      current_loss_streak: 0,
      current_drawdown_percent: 0.2,
      revenge_after_loss_events: [],
      warnings: [],
    },
    reporting_currency: 'USD',
    fx_normalized: false,
  }
}

function defaultState(options: MockAppOptions = {}): MockState {
  const authUser: MockUser = {
    id: 99,
    name: 'QA Trader',
    email: 'qa@example.com',
  }

  return {
    authenticated: options.authenticated ?? true,
    authUser,
    authMeResponses: options.authMeResponses ? clone(options.authMeResponses) : [{
      status: options.authenticated === false ? 401 : 200,
      body: options.authenticated === false ? { message: 'Unauthenticated.' } : authUser,
    }],
    authMeIndex: 0,
    preferences: {
      user_id: 99,
      theme_mode: 'dark',
      profile_timezone: 'UTC',
      profile_locale: 'en-US',
      updated_at: ISO_NOW,
      ...(options.preferences ?? {}),
    },
    accounts: clone(options.accounts ?? defaultAccounts()),
    instruments: clone(options.instruments ?? defaultInstruments()),
    fxRates: clone(options.fxRates ?? [
      { id: 1, from_currency: 'JPY', to_currency: 'USD', rate: '0.006667', rate_updated_at: ISO_NOW },
      { id: 2, from_currency: 'USD', to_currency: 'EUR', rate: '0.920000', rate_updated_at: ISO_NOW },
      { id: 3, from_currency: 'EUR', to_currency: 'USD', rate: '1.086957', rate_updated_at: ISO_NOW },
    ]),
    strategyModels: [
      { id: 1, name: 'Breakout', slug: 'breakout', description: null, is_active: true },
      { id: 2, name: 'Liquidity Sweep', slug: 'liquidity-sweep', description: null, is_active: true },
    ],
    setups: [
      { id: 1, name: 'Opening Range Breakout', slug: 'orb', description: null, is_active: true },
      { id: 2, name: 'Sweep Reversal', slug: 'sweep-reversal', description: null, is_active: true },
    ],
    killzones: [
      { id: 1, name: 'London Open', slug: 'london-open', session_enum: 'london', description: null, is_active: true },
      { id: 2, name: 'New York Open', slug: 'new-york-open', session_enum: 'new_york', description: null, is_active: true },
    ],
    tradeTags: [],
    sessionOptions: [
      { value: 'asia', label: 'Asia' },
      { value: 'london', label: 'London' },
      { value: 'new_york', label: 'New York' },
      { value: 'overlap', label: 'London/NY Overlap' },
      { value: 'off_session', label: 'Off Session' },
    ],
    trades: clone(options.trades ?? defaultTrades()),
    missedTrades: clone(options.missedTrades ?? [
      {
        id: 301,
        pair: 'EURUSD',
        model: 'Liquidity Sweep',
        reason: 'hesitation',
        date: '2026-03-07T08:00:00.000Z',
        notes: 'Seed missed trade',
        images: [],
        images_count: 0,
        created_at: '2026-03-07T08:05:00.000Z',
        updated_at: '2026-03-07T08:05:00.000Z',
      },
    ]),
    checklists: clone(options.checklists ?? []),
    checklistItemsByChecklistId: clone(options.checklistItemsByChecklistId ?? {}),
    reports: clone(options.reports ?? []),
    requestLog: {
      tradeCreates: [],
      tradeUpdates: [],
      missedTradeCreates: [],
      ruleResponseWrites: [],
    },
  }
}

function nextAuthMeResponse(state: MockState): AuthMeResponse {
  const index = Math.min(state.authMeIndex, state.authMeResponses.length - 1)
  const response = state.authMeResponses[index] ?? { status: state.authenticated ? 200 : 401, body: state.authUser }
  state.authMeIndex += 1
  return response
}

function buildQuoteMap(state: MockState, symbolsRaw: string | null): Record<string, { bid: number; ask: number; mid: number; ts: number }> {
  const symbols = String(symbolsRaw ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value) => value.length >= 6)
  const quotes: Record<string, { bid: number; ask: number; mid: number; ts: number }> = {}

  for (const symbol of symbols) {
    const base = symbol.slice(0, 3)
    const quote = symbol.slice(3, 6)
    const direct = state.fxRates.find((row) => row.from_currency.toUpperCase() === base && row.to_currency.toUpperCase() === quote)
    const inverse = state.fxRates.find((row) => row.from_currency.toUpperCase() === quote && row.to_currency.toUpperCase() === base)
    const directRate = direct ? Number(direct.rate) : null
    const inverseRate = inverse ? Number(inverse.rate) : null

    let mid: number | null = null
    if (typeof directRate === 'number' && Number.isFinite(directRate) && directRate > 0) {
      mid = directRate
    } else if (typeof inverseRate === 'number' && Number.isFinite(inverseRate) && inverseRate > 0) {
      mid = 1 / inverseRate
    }

    if (mid === null) {
      continue
    }

    quotes[symbol] = {
      bid: Number((mid * 0.99995).toFixed(6)),
      ask: Number((mid * 1.00005).toFixed(6)),
      mid: Number(mid.toFixed(6)),
      ts: Date.parse(ISO_NOW),
    }
  }

  return quotes
}

async function fulfillJson(route: Route, data: unknown, status = 200, headers: Record<string, string> = {}) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers,
    body: JSON.stringify(data),
  })
}

function parseBody(request: { postData(): string | null }): Record<string, unknown> {
  const raw = request.postData()
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

function tradeMatchesQuery(trade: MockTrade, url: URL): boolean {
  const accountId = Number.parseInt(url.searchParams.get('account_id') ?? '0', 10)
  if (Number.isInteger(accountId) && accountId > 0 && trade.account_id !== accountId) {
    return false
  }

  const localSyncStatus = (url.searchParams.get('local_sync_status') ?? '').trim()
  if (localSyncStatus && trade.local_sync_status !== localSyncStatus) {
    return false
  }

  const riskStatus = (url.searchParams.get('risk_validation_status') ?? '').trim()
  if (riskStatus && trade.risk_validation_status !== riskStatus) {
    return false
  }

  const includeDrafts = url.searchParams.get('include_drafts_unverified')
  if (includeDrafts !== '1') {
    if ((trade.local_sync_status ?? 'synced') !== 'synced') return false
    if ((trade.risk_validation_status ?? 'verified') !== 'verified') return false
  }

  const dateFrom = url.searchParams.get('date_from')
  const dateTo = url.searchParams.get('date_to')
  const tradeTime = new Date(trade.date).getTime()
  if (dateFrom) {
    const fromTime = new Date(`${dateFrom}T00:00:00.000Z`).getTime()
    if (tradeTime < fromTime) return false
  }
  if (dateTo) {
    const toTime = new Date(`${dateTo}T23:59:59.999Z`).getTime()
    if (tradeTime > toTime) return false
  }

  return true
}

function buildTradeDetails(trade: MockTrade) {
  return {
    trade,
    legs: [
      {
        id: trade.id * 10,
        trade_id: trade.id,
        leg_type: 'exit',
        price: trade.actual_exit_price ?? trade.entry_price,
        quantity_lots: trade.lot_size,
        executed_at: trade.date,
        fees: '0',
        notes: null,
        created_at: trade.created_at,
        updated_at: trade.updated_at,
      },
    ],
    psychology: {
      trade_id: trade.id,
      pre_emotion: 'calm',
      post_emotion: 'calm',
      confidence_score: 8,
      stress_score: 2,
      sleep_hours: '7',
      impulse_flag: false,
      fomo_flag: false,
      revenge_flag: false,
      notes: null,
    },
    images: [],
  }
}

function findActiveChecklist(
  state: MockState,
  accountIdRaw: string | null,
  strategyModelIdRaw: string | null
): MockChecklist | null {
  const accountId = Number.parseInt(accountIdRaw ?? '0', 10)
  const strategyModelId = Number.parseInt(strategyModelIdRaw ?? '0', 10)

  const byStrategy = state.checklists.find((checklist) =>
    checklist.is_active
    && checklist.scope === 'strategy'
    && Number(checklist.strategy_model_id) === strategyModelId
  )
  if (byStrategy) return byStrategy

  const byAccount = state.checklists.find((checklist) =>
    checklist.is_active
    && checklist.scope === 'account'
    && Number(checklist.account_id) === accountId
  )
  if (byAccount) return byAccount

  return state.checklists.find((checklist) => checklist.is_active && checklist.scope === 'global') ?? null
}

function normalizeChecklistResponseValue(item: MockChecklistItem, value: unknown) {
  if (item.type === 'checkbox') return Boolean(value)
  if (item.type === 'number' || item.type === 'scale') {
    if (value === null || value === undefined || value === '') return null
    return Number(value)
  }
  if (value === null || value === undefined) return ''
  return String(value)
}

function isChecklistResponseComplete(item: MockChecklistItem, value: unknown): boolean {
  if (item.type === 'checkbox') return Boolean(value)
  if (item.type === 'number' || item.type === 'scale') return typeof value === 'number' && Number.isFinite(value)
  return String(value ?? '').trim().length > 0
}

function buildChecklistPayload(
  state: MockState,
  checklist: MockChecklist | null,
  responseRows: Array<{ checklist_item_id: number; value: unknown }> = [],
  context: { accountId: number | null; strategyModelId: number | null; tradeId: number | null } = {
    accountId: null,
    strategyModelId: null,
    tradeId: null,
  }
) {
  if (!checklist) {
    return {
      responses: {
        checklist: null,
        items: [],
        archived_responses: [],
      },
      readiness: {
        status: 'ready',
        completed_required: 0,
        total_required: 0,
        missing_required: [],
        ready: true,
      },
      failing_rules: [],
      context: {
        requested_account_id: context.accountId,
        requested_strategy_model_id: context.strategyModelId,
        resolved_scope: null,
        resolved_checklist_id: null,
        resolved_account_id: null,
        resolved_strategy_model_id: null,
        trade_id: context.tradeId,
      },
      execution_snapshot: null,
    }
  }

  const responseById = new Map(responseRows.map((row) => [row.checklist_item_id, row.value]))
  const items = (state.checklistItemsByChecklistId[checklist.id] ?? [])
    .slice()
    .sort((left, right) => left.order_index - right.order_index || left.id - right.id)
    .map((item) => {
      const normalizedValue = normalizeChecklistResponseValue(item, responseById.get(item.id))
      const isCompleted = isChecklistResponseComplete(item, normalizedValue)
      return {
        ...item,
        response: {
          checklist_item_id: item.id,
          value: normalizedValue,
          is_completed: isCompleted,
          completed_at: isCompleted ? ISO_NOW : null,
          archived: false,
          reason: null,
        },
      }
    })

  const requiredItems = items.filter((item) => item.required && item.is_active)
  const completedRequired = requiredItems.filter((item) => item.response.is_completed).length
  const missingRequired = requiredItems
    .filter((item) => !item.response.is_completed)
    .map((item) => ({
      checklist_item_id: item.id,
      title: item.title,
      category: item.category,
      reason: 'Rule requirement not met.',
    }))
  const ready = missingRequired.length === 0

  return {
    responses: {
      checklist: {
        ...checklist,
        active_items_count: items.filter((item) => item.is_active).length,
      },
      items,
      archived_responses: [],
    },
    readiness: {
      status: ready ? 'ready' : completedRequired === 0 ? 'not_ready' : 'almost',
      completed_required: completedRequired,
      total_required: requiredItems.length,
      missing_required: missingRequired,
      ready,
    },
    failing_rules: missingRequired,
    context: {
      requested_account_id: context.accountId,
      requested_strategy_model_id: context.strategyModelId,
      resolved_scope: checklist.scope,
      resolved_checklist_id: checklist.id,
      resolved_account_id: checklist.account_id ?? null,
      resolved_strategy_model_id: checklist.strategy_model_id ?? null,
      trade_id: context.tradeId,
    },
    execution_snapshot: null,
  }
}

function makeTradeFromPayload(state: MockState, payload: Record<string, unknown>, tradeId: number): MockTrade {
  const accountId = Number(payload.account_id ?? 1)
  const instrumentId = Number(payload.instrument_id ?? 1)
  const account = state.accounts.find((entry) => entry.id === accountId) ?? state.accounts[0]
  const instrument = state.instruments.find((entry) => entry.id === instrumentId) ?? state.instruments[0]
  const lotSize = Number(payload.position_size ?? 0.1).toFixed(2)
  const entry = Number(payload.entry_price ?? 1.1).toFixed(4)
  const stop = Number(payload.stop_loss ?? 1.099).toFixed(4)
  const take = Number(payload.take_profit ?? 1.102).toFixed(4)
  const actualExit = Number(payload.actual_exit_price ?? take).toFixed(4)
  const checklistResponses = Array.isArray(payload.checklist_responses)
    ? payload.checklist_responses as Array<{ checklist_item_id: number }>
    : []
  const failedRuleIds = Boolean(payload.followed_rules) ? [] : checklistResponses.map((row) => row.checklist_item_id)
  const failedRuleTitles = failedRuleIds
    .map((id) => Object.values(state.checklistItemsByChecklistId).flat().find((item) => item.id === id)?.title ?? `Rule #${id}`)

  return {
    id: tradeId,
    revision: 1,
    account_id: account?.id ?? 1,
    instrument_id: instrument?.id ?? 1,
    strategy_model_id: Number(payload.strategy_model_id ?? 1),
    setup_id: Number(payload.setup_id ?? 1),
    killzone_id: Number(payload.killzone_id ?? 1),
    session_enum: String(payload.session_enum ?? 'london'),
    pair: String(payload.symbol ?? instrument?.symbol ?? 'EURUSD'),
    direction: (payload.direction === 'sell' ? 'sell' : 'buy'),
    entry_price: entry,
    stop_loss: stop,
    take_profit: take,
    actual_exit_price: actualExit,
    lot_size: lotSize,
    risk_per_unit: '0.0010',
    reward_per_unit: '0.0020',
    monetary_risk: '10.00',
    monetary_reward: '20.00',
    commission: '0',
    swap: '0',
    spread_cost: '0',
    slippage_cost: '0',
    fx_rate_quote_to_usd: '1',
    fx_symbol_used: payload.fx_symbol_used ? String(payload.fx_symbol_used) : null,
    fx_rate_timestamp: payload.fx_rate_timestamp ? String(payload.fx_rate_timestamp) : null,
    profit_loss: '0.00',
    rr: '2.0',
    r_multiple: '0.00',
    risk_percent: '0.10',
    account_balance_before_trade: account?.current_balance ?? '10000.00',
    account_balance_after_trade: account?.current_balance ?? '10000.00',
    followed_rules: Boolean(payload.followed_rules),
    checklist_incomplete: Boolean(payload.checklist_incomplete),
    executed_checklist_id: null,
    executed_checklist_version: null,
    executed_enforcement_mode: null,
    failed_rule_ids: failedRuleIds,
    failed_rule_titles: failedRuleTitles,
    check_evaluated_at: ISO_NOW,
    emotion: String(payload.emotion ?? 'calm'),
    session: String(payload.session ?? 'London'),
    model: 'Breakout',
    date: String(payload.close_date ?? ISO_NOW),
    notes: typeof payload.notes === 'string' ? payload.notes : null,
    tag_ids: Array.isArray(payload.tag_ids) ? payload.tag_ids.filter((value): value is number => typeof value === 'number') : [],
    images: [],
    images_count: 0,
    created_at: ISO_NOW,
    updated_at: ISO_NOW,
    deleted_at: null,
    local_sync_status: 'synced',
    risk_validation_status: 'verified',
  }
}

function updateChecklistCount(state: MockState, checklistId: number): void {
  const checklist = state.checklists.find((entry) => entry.id === checklistId)
  if (!checklist) return
  checklist.active_items_count = (state.checklistItemsByChecklistId[checklistId] ?? []).filter((item) => item.is_active).length
  checklist.updated_at = ISO_NOW
}

export async function installMockApp(page: Page, options: MockAppOptions = {}) {
  const state = defaultState(options)

  await page.route('**/sanctum/csrf-cookie', async (route) => {
    await route.fulfill({ status: 204, body: '' })
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const method = request.method().toUpperCase()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '') || '/'

    if (method === 'GET' && path === '/auth/config') {
      await fulfillJson(route, { allow_self_register: true })
      return
    }

    if (method === 'GET' && path === '/auth/me') {
      const response = nextAuthMeResponse(state)
      await fulfillJson(route, response.body ?? (response.status === 200 ? state.authUser : { message: 'Unauthenticated.' }), response.status)
      return
    }

    if (method === 'POST' && path === '/auth/login') {
      state.authenticated = true
      state.authMeResponses = [{ status: 200, body: state.authUser }]
      state.authMeIndex = 0
      await fulfillJson(route, { user: state.authUser })
      return
    }

    if (method === 'POST' && path === '/auth/register') {
      state.authenticated = true
      state.authMeResponses = [{ status: 200, body: state.authUser }]
      state.authMeIndex = 0
      await fulfillJson(route, { user: state.authUser })
      return
    }

    if (method === 'POST' && path === '/auth/logout') {
      state.authenticated = false
      state.authMeResponses = [{ status: 401, body: { message: 'Unauthenticated.' } }]
      state.authMeIndex = 0
      await fulfillJson(route, { ok: true })
      return
    }

    if (method === 'GET' && path === '/user/preferences') {
      await fulfillJson(route, state.preferences)
      return
    }

    if (method === 'PUT' && path === '/user/preferences') {
      const body = parseBody(request)
      state.preferences = {
        ...state.preferences,
        ...body,
        updated_at: ISO_NOW,
      }
      await fulfillJson(route, state.preferences)
      return
    }

    if (method === 'GET' && path === '/accounts') {
      await fulfillJson(route, state.accounts)
      return
    }

    if (method === 'GET' && /^\/accounts\/\d+\/challenge-status$/.test(path)) {
      const accountId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      const account = state.accounts.find((entry) => entry.id === accountId)
      await fulfillJson(route, account?.account_type === 'funded'
        ? { account_id: accountId, phase: 'Phase 1', risk_state: 'healthy', evaluated_at: ISO_NOW }
        : null)
      return
    }

    if (method === 'GET' && path === '/instruments') {
      await fulfillJson(route, state.instruments)
      return
    }

    if (method === 'GET' && path === '/fx-rates') {
      await fulfillJson(route, state.fxRates)
      return
    }

    if (method === 'GET' && path === '/price-feed/quotes') {
      await fulfillJson(route, {
        quotes: buildQuoteMap(state, url.searchParams.get('symbols')),
      })
      return
    }

    if (method === 'GET' && path === '/dictionaries/strategy-models') {
      await fulfillJson(route, state.strategyModels)
      return
    }

    if (method === 'GET' && path === '/dictionaries/setups') {
      await fulfillJson(route, state.setups)
      return
    }

    if (method === 'GET' && path === '/dictionaries/killzones') {
      await fulfillJson(route, state.killzones)
      return
    }

    if (method === 'GET' && path === '/dictionaries/trade-tags') {
      await fulfillJson(route, state.tradeTags)
      return
    }

    if (method === 'GET' && path === '/dictionaries/sessions') {
      await fulfillJson(route, state.sessionOptions)
      return
    }

    if (method === 'GET' && path === '/analytics/dashboard-summary') {
      await fulfillJson(route, defaultDashboardSummary())
      return
    }

    if (method === 'GET' && path === '/reports') {
      const scope = url.searchParams.get('scope')
      const rows = scope ? state.reports.filter((report) => report.scope === scope) : state.reports
      await fulfillJson(route, rows)
      return
    }

    if (method === 'POST' && path === '/reports') {
      const body = parseBody(request)
      const report: MockReport = {
        id: state.reports.length + 1,
        name: String(body.name ?? 'Saved View'),
        scope: (body.scope === 'dashboard' ? 'dashboard' : 'trades'),
        filters_json: (body.filters_json && typeof body.filters_json === 'object' ? body.filters_json : {}) as Record<string, unknown>,
        columns_json: Array.isArray(body.columns_json) ? body.columns_json.map(String) : null,
        is_default: Boolean(body.is_default),
        created_at: ISO_NOW,
        updated_at: ISO_NOW,
      }
      state.reports.unshift(report)
      await fulfillJson(route, report, 201)
      return
    }

    if (method === 'GET' && path === '/trades') {
      const rows = state.trades
        .filter((trade) => tradeMatchesQuery(trade, url))
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      await fulfillJson(route, paginate(rows, url.searchParams.get('page'), url.searchParams.get('per_page')))
      return
    }

    if (method === 'POST' && path === '/trades') {
      const body = parseBody(request)
      state.requestLog.tradeCreates.push(clone(body))
      const nextId = Math.max(0, ...state.trades.map((trade) => trade.id)) + 1
      const trade = makeTradeFromPayload(state, body, nextId)
      state.trades.unshift(trade)
      await fulfillJson(route, trade, 201, { etag: `"1:${nextId}"` })
      return
    }

    if (method === 'PUT' && /^\/trades\/\d+$/.test(path)) {
      const tradeId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      const body = parseBody(request)
      state.requestLog.tradeUpdates.push(clone(body))
      const existing = state.trades.find((entry) => entry.id === tradeId)
      const updated = makeTradeFromPayload(state, { ...existing, ...body }, tradeId)
      updated.revision = (existing?.revision ?? 1) + 1
      const index = state.trades.findIndex((entry) => entry.id === tradeId)
      if (index >= 0) {
        state.trades[index] = updated
      } else {
        state.trades.unshift(updated)
      }
      await fulfillJson(route, updated, 200, { etag: `"${updated.revision}:${tradeId}"` })
      return
    }

    if (method === 'GET' && /^\/trades\/\d+$/.test(path)) {
      const tradeId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      const trade = state.trades.find((entry) => entry.id === tradeId)
      await fulfillJson(route, trade ? buildTradeDetails(trade) : { message: 'Not found' }, trade ? 200 : 404, trade ? { etag: `"${trade.revision}:${tradeId}"` } : {})
      return
    }

    if (method === 'PUT' && /^\/trades\/\d+\/rule-responses$/.test(path)) {
      const body = parseBody(request)
      state.requestLog.ruleResponseWrites.push(clone(body))
      const tradeId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      const checklist = findActiveChecklist(
        state,
        body.account_id === null || body.account_id === undefined ? null : String(body.account_id),
        body.strategy_model_id === null || body.strategy_model_id === undefined ? null : String(body.strategy_model_id)
      )
      const payload = buildChecklistPayload(
        state,
        checklist,
        Array.isArray(body.responses) ? body.responses as Array<{ checklist_item_id: number; value: unknown }> : [],
        {
          accountId: typeof body.account_id === 'number' ? body.account_id : null,
          strategyModelId: typeof body.strategy_model_id === 'number' ? body.strategy_model_id : null,
          tradeId,
        }
      )
      await fulfillJson(route, payload, 200, { etag: '"2:rule-responses"' })
      return
    }

    if (method === 'GET' && path === '/missed-trades') {
      const rows = state.missedTrades
        .slice()
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      await fulfillJson(route, paginate(rows, url.searchParams.get('page'), url.searchParams.get('per_page')))
      return
    }

    if (method === 'POST' && path === '/missed-trades') {
      const body = parseBody(request)
      state.requestLog.missedTradeCreates.push(clone(body))
      const nextId = Math.max(0, ...state.missedTrades.map((entry) => entry.id)) + 1
      const record: MockMissedTrade = {
        id: nextId,
        pair: String(body.pair ?? 'EURUSD'),
        model: String(body.model ?? 'Liquidity Sweep'),
        reason: String(body.reason ?? ''),
        date: String(body.date ?? ISO_NOW),
        notes: typeof body.notes === 'string' ? body.notes : null,
        images: [],
        images_count: 0,
        created_at: ISO_NOW,
        updated_at: ISO_NOW,
      }
      state.missedTrades.unshift(record)
      await fulfillJson(route, record, 201)
      return
    }

    if (method === 'PUT' && /^\/missed-trades\/\d+$/.test(path)) {
      const entryId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      const body = parseBody(request)
      const existing = state.missedTrades.find((entry) => entry.id === entryId)
      const updated: MockMissedTrade = {
        ...(existing ?? {
          id: entryId,
          pair: 'EURUSD',
          model: 'Liquidity Sweep',
          reason: '',
          date: ISO_NOW,
          notes: null,
          images: [],
          images_count: 0,
          created_at: ISO_NOW,
          updated_at: ISO_NOW,
        }),
        ...body,
        updated_at: ISO_NOW,
      }
      const index = state.missedTrades.findIndex((entry) => entry.id === entryId)
      if (index >= 0) {
        state.missedTrades[index] = updated
      } else {
        state.missedTrades.unshift(updated)
      }
      await fulfillJson(route, updated)
      return
    }

    if (method === 'GET' && /^\/missed-trades\/\d+$/.test(path)) {
      const entryId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      const entry = state.missedTrades.find((row) => row.id === entryId)
      await fulfillJson(route, entry ?? { message: 'Not found' }, entry ? 200 : 404)
      return
    }

    if (method === 'GET' && path === '/checklists') {
      const scope = url.searchParams.get('scope')
      const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
      const rows = state.checklists
        .filter((row) => (scope ? row.scope === scope : true))
        .filter((row) => (search ? row.name.toLowerCase().includes(search) : true))
        .map((row) => ({ ...row, active_items_count: (state.checklistItemsByChecklistId[row.id] ?? []).filter((item) => item.is_active).length }))
      await fulfillJson(route, rows)
      return
    }

    if (method === 'POST' && path === '/checklists') {
      const body = parseBody(request)
      const nextId = Math.max(0, ...state.checklists.map((entry) => entry.id)) + 1
      const checklist: MockChecklist = {
        id: nextId,
        user_id: 99,
        account_id: typeof body.account_id === 'number' ? body.account_id : null,
        strategy_model_id: typeof body.strategy_model_id === 'number' ? body.strategy_model_id : null,
        name: String(body.name ?? 'Rule Set'),
        revision: 1,
        scope: body.scope === 'account' || body.scope === 'strategy' ? body.scope : 'global',
        enforcement_mode: body.enforcement_mode === 'strict' ? 'strict' : 'soft',
        is_active: body.is_active !== false,
        created_at: ISO_NOW,
        updated_at: ISO_NOW,
        active_items_count: 0,
      }
      state.checklists.unshift(checklist)
      state.checklistItemsByChecklistId[checklist.id] = []
      await fulfillJson(route, checklist, 201)
      return
    }

    if (method === 'POST' && /^\/checklists\/\d+\/duplicate$/.test(path)) {
      const checklistId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      const source = state.checklists.find((entry) => entry.id === checklistId)
      if (!source) {
        await fulfillJson(route, { message: 'Not found' }, 404)
        return
      }
      const nextId = Math.max(0, ...state.checklists.map((entry) => entry.id)) + 1
      const duplicated: MockChecklist = {
        ...clone(source),
        id: nextId,
        name: `${source.name} Copy`,
        created_at: ISO_NOW,
        updated_at: ISO_NOW,
      }
      state.checklists.unshift(duplicated)
      const sourceItems = clone(state.checklistItemsByChecklistId[source.id] ?? [])
      state.checklistItemsByChecklistId[duplicated.id] = sourceItems.map((item, index) => ({
        ...item,
        id: nextId * 100 + index + 1,
        checklist_id: duplicated.id,
        created_at: ISO_NOW,
        updated_at: ISO_NOW,
      }))
      updateChecklistCount(state, duplicated.id)
      await fulfillJson(route, duplicated, 201)
      return
    }

    if (method === 'PUT' && /^\/checklists\/\d+$/.test(path)) {
      const checklistId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      const body = parseBody(request)
      const checklist = state.checklists.find((entry) => entry.id === checklistId)
      if (!checklist) {
        await fulfillJson(route, { message: 'Not found' }, 404)
        return
      }
      Object.assign(checklist, body, { updated_at: ISO_NOW })
      updateChecklistCount(state, checklistId)
      await fulfillJson(route, checklist)
      return
    }

    if (method === 'DELETE' && /^\/checklists\/\d+$/.test(path)) {
      const checklistId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      state.checklists = state.checklists.filter((entry) => entry.id !== checklistId)
      delete state.checklistItemsByChecklistId[checklistId]
      await route.fulfill({ status: 204, body: '' })
      return
    }

    if (method === 'GET' && /^\/checklists\/\d+\/items$/.test(path)) {
      const checklistId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      await fulfillJson(route, state.checklistItemsByChecklistId[checklistId] ?? [])
      return
    }

    if (method === 'POST' && /^\/checklists\/\d+\/items$/.test(path)) {
      const checklistId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      const body = parseBody(request)
      const nextId = Math.max(
        0,
        ...Object.values(state.checklistItemsByChecklistId).flat().map((entry) => entry.id)
      ) + 1
      const current = state.checklistItemsByChecklistId[checklistId] ?? []
      const item: MockChecklistItem = {
        id: nextId,
        checklist_id: checklistId,
        order_index: current.length,
        title: String(body.title ?? 'Rule'),
        type: body.type === 'dropdown' || body.type === 'number' || body.type === 'text' || body.type === 'scale'
          ? body.type
          : 'checkbox',
        required: body.required !== false,
        category: String(body.category ?? 'Risk & Compliance'),
        help_text: typeof body.help_text === 'string' ? body.help_text : null,
        config: (body.config && typeof body.config === 'object' ? body.config : {}) as Record<string, unknown>,
        is_active: body.is_active !== false,
        created_at: ISO_NOW,
        updated_at: ISO_NOW,
      }
      state.checklistItemsByChecklistId[checklistId] = [...current, item]
      updateChecklistCount(state, checklistId)
      await fulfillJson(route, item, 201)
      return
    }

    if (method === 'PUT' && /^\/checklist-items\/\d+$/.test(path)) {
      const itemId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      const body = parseBody(request)
      const allItems = Object.values(state.checklistItemsByChecklistId).flat()
      const item = allItems.find((entry) => entry.id === itemId)
      if (!item) {
        await fulfillJson(route, { message: 'Not found' }, 404)
        return
      }
      Object.assign(item, body, { updated_at: ISO_NOW })
      updateChecklistCount(state, item.checklist_id)
      await fulfillJson(route, item)
      return
    }

    if (method === 'DELETE' && /^\/checklist-items\/\d+$/.test(path)) {
      const itemId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      for (const checklistId of Object.keys(state.checklistItemsByChecklistId)) {
        const numericChecklistId = Number.parseInt(checklistId, 10)
        state.checklistItemsByChecklistId[numericChecklistId] = (state.checklistItemsByChecklistId[numericChecklistId] ?? [])
          .filter((entry) => entry.id !== itemId)
        updateChecklistCount(state, numericChecklistId)
      }
      await route.fulfill({ status: 204, body: '' })
      return
    }

    if (method === 'PUT' && /^\/checklists\/\d+\/items\/reorder$/.test(path)) {
      const checklistId = Number.parseInt(path.split('/')[2] ?? '0', 10)
      const body = parseBody(request)
      const orderedIds = Array.isArray(body.item_ids) ? body.item_ids.map((value) => Number(value)) : []
      const current = state.checklistItemsByChecklistId[checklistId] ?? []
      const byId = new Map(current.map((entry) => [entry.id, entry]))
      state.checklistItemsByChecklistId[checklistId] = orderedIds
        .map((id, index) => {
          const item = byId.get(id)
          if (!item) return null
          return {
            ...item,
            order_index: index,
            updated_at: ISO_NOW,
          }
        })
        .filter((entry): entry is MockChecklistItem => Boolean(entry))
      await fulfillJson(route, { items: state.checklistItemsByChecklistId[checklistId] })
      return
    }

    if (method === 'GET' && path === '/trade-rules/resolve') {
      const checklist = findActiveChecklist(
        state,
        url.searchParams.get('account_id'),
        url.searchParams.get('strategy_model_id')
      )
      const payload = buildChecklistPayload(
        state,
        checklist,
        [],
        {
          accountId: Number.parseInt(url.searchParams.get('account_id') ?? '0', 10) || null,
          strategyModelId: Number.parseInt(url.searchParams.get('strategy_model_id') ?? '0', 10) || null,
          tradeId: Number.parseInt(url.searchParams.get('trade_id') ?? '0', 10) || null,
        }
      )
      await fulfillJson(route, payload)
      return
    }

    if (method === 'POST' && path === '/trade-rules/preview') {
      const body = parseBody(request)
      const checklist = findActiveChecklist(
        state,
        body.account_id === null || body.account_id === undefined ? null : String(body.account_id),
        body.strategy_model_id === null || body.strategy_model_id === undefined ? null : String(body.strategy_model_id)
      )
      const payload = buildChecklistPayload(
        state,
        checklist,
        Array.isArray(body.responses) ? body.responses as Array<{ checklist_item_id: number; value: unknown }> : [],
        {
          accountId: typeof body.account_id === 'number' ? body.account_id : null,
          strategyModelId: typeof body.strategy_model_id === 'number' ? body.strategy_model_id : null,
          tradeId: typeof body.trade_id === 'number' ? body.trade_id : null,
        }
      )
      await fulfillJson(route, payload)
      return
    }

    await fulfillJson(route, { message: `Unhandled mock route: ${method} ${path}` }, 404)
  })

  return state
}
