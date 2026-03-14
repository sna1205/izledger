import { deleteScopedRecord, getScopedRecord, putScopedRecord, scopedRecordId } from '@/services/scopedIndexedDb'
import { getScope } from '@/services/storageScope'

const TRADE_DRAFT_NAMESPACE = 'local-fallback'
const TRADE_DRAFT_KEY = 'trade_form_draft_v1'
const TRADE_DRAFT_VERSION = 1
const TRADE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface PersistedTradeDraftPendingImage {
  id: string
  file: File
  context_tag: string
  timeframe: string
  annotation_notes: string
}

export interface PersistedTradeDraftPayload {
  version: number
  trade_completed: boolean
  form: {
    account_id: string
    instrument_id: string
    strategy_model_id: string
    setup_id: string
    killzone_id: string
    session_enum: string
    symbol: string
    direction: 'buy' | 'sell'
    date: string
    entry_price: number
    stop_loss: number
    take_profit: number
    position_size: number
    commission: number
    swap: number
    spread_cost: number
    slippage_cost: number
    followed_rules: boolean
    emotion: string
    notes: string
    tag_ids: number[]
  }
  psychology: {
    pre_emotion: string
    post_emotion: string
    confidence_score: number | null
    stress_score: number | null
    sleep_hours: number | null
    impulse_flag: boolean
    fomo_flag: boolean
    revenge_flag: boolean
    notes: string
  }
  primary_exit: {
    price: number
    quantity_lots: number
    executed_at: string
    fees: number
    notes: string
  }
  exit_legs: Array<{
    id: string
    price: number
    quantity_lots: number
    executed_at: string
    fees: number
    notes: string
  }>
  pending_images: PersistedTradeDraftPendingImage[]
}

export interface PersistedTradeDraftRecord {
  savedAt: string
  expiresAt: string | null
  draft: PersistedTradeDraftPayload
}

export async function readTradeFormDraft(): Promise<PersistedTradeDraftRecord | null> {
  const scope = getScope()
  const record = await getScopedRecord<unknown>(scope, TRADE_DRAFT_NAMESPACE, TRADE_DRAFT_KEY)
  if (!record) {
    return null
  }

  if (record.expire_at) {
    const expiresAt = Date.parse(record.expire_at)
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      await deleteScopedRecord(scope, TRADE_DRAFT_NAMESPACE, TRADE_DRAFT_KEY)
      return null
    }
  }

  const payload = normalizeTradeDraftPayload(record.payload)
  if (!payload) {
    await deleteScopedRecord(scope, TRADE_DRAFT_NAMESPACE, TRADE_DRAFT_KEY)
    return null
  }

  return {
    savedAt: record.updated_at,
    expiresAt: record.expire_at,
    draft: payload,
  }
}

export async function writeTradeFormDraft(draft: PersistedTradeDraftPayload): Promise<string> {
  const scope = getScope()
  const payload = normalizeTradeDraftPayload(draft)
  if (!payload) {
    throw new Error('Trade draft payload is invalid.')
  }

  const now = new Date().toISOString()
  await putScopedRecord({
    id: scopedRecordId(scope, TRADE_DRAFT_NAMESPACE, TRADE_DRAFT_KEY),
    namespace: TRADE_DRAFT_NAMESPACE,
    key: TRADE_DRAFT_KEY,
    user_id: scope.userId,
    account_id: scope.accountId,
    created_at: now,
    updated_at: now,
    expire_at: new Date(Date.now() + TRADE_DRAFT_TTL_MS).toISOString(),
    lru_at: now,
    payload,
  })

  return now
}

export async function clearTradeFormDraft(): Promise<void> {
  await deleteScopedRecord(getScope(), TRADE_DRAFT_NAMESPACE, TRADE_DRAFT_KEY)
}

function normalizeTradeDraftPayload(value: unknown): PersistedTradeDraftPayload | null {
  if (!isRecord(value)) return null

  const form = isRecord(value.form) ? value.form : null
  const psychology = isRecord(value.psychology) ? value.psychology : null
  const primaryExit = isRecord(value.primary_exit) ? value.primary_exit : null
  if (!form || !psychology || !primaryExit) {
    return null
  }

  const pendingImages = Array.isArray(value.pending_images)
    ? value.pending_images
      .map(normalizePendingImage)
      .filter((image): image is PersistedTradeDraftPendingImage => image !== null)
    : []

  const exitLegs = Array.isArray(value.exit_legs)
    ? value.exit_legs
      .map((row) => normalizeExitLeg(row))
      .filter((row): row is PersistedTradeDraftPayload['exit_legs'][number] => row !== null)
    : []

  const direction = String(form.direction ?? '').trim().toLowerCase()

  return {
    version: normalizePositiveInt(value.version) ?? TRADE_DRAFT_VERSION,
    trade_completed: Boolean(value.trade_completed ?? true),
    form: {
      account_id: asString(form.account_id),
      instrument_id: asString(form.instrument_id),
      strategy_model_id: asString(form.strategy_model_id),
      setup_id: asString(form.setup_id),
      killzone_id: asString(form.killzone_id),
      session_enum: asString(form.session_enum),
      symbol: asString(form.symbol),
      direction: direction === 'sell' ? 'sell' : 'buy',
      date: asString(form.date),
      entry_price: asNumber(form.entry_price),
      stop_loss: asNumber(form.stop_loss),
      take_profit: asNumber(form.take_profit),
      position_size: asNumber(form.position_size, 0.01),
      commission: asNumber(form.commission),
      swap: asNumber(form.swap),
      spread_cost: asNumber(form.spread_cost),
      slippage_cost: asNumber(form.slippage_cost),
      followed_rules: Boolean(form.followed_rules ?? true),
      emotion: asString(form.emotion, 'neutral'),
      notes: asString(form.notes),
      tag_ids: Array.isArray(form.tag_ids)
        ? form.tag_ids
          .map((tagId) => normalizePositiveInt(tagId))
          .filter((tagId): tagId is number => tagId !== null)
        : [],
    },
    psychology: {
      pre_emotion: asString(psychology.pre_emotion),
      post_emotion: asString(psychology.post_emotion),
      confidence_score: asNullableNumber(psychology.confidence_score),
      stress_score: asNullableNumber(psychology.stress_score),
      sleep_hours: asNullableNumber(psychology.sleep_hours),
      impulse_flag: Boolean(psychology.impulse_flag),
      fomo_flag: Boolean(psychology.fomo_flag),
      revenge_flag: Boolean(psychology.revenge_flag),
      notes: asString(psychology.notes),
    },
    primary_exit: {
      price: asNumber(primaryExit.price),
      quantity_lots: asNumber(primaryExit.quantity_lots),
      executed_at: asString(primaryExit.executed_at),
      fees: asNumber(primaryExit.fees),
      notes: asString(primaryExit.notes),
    },
    exit_legs: exitLegs,
    pending_images: pendingImages,
  }
}

function normalizePendingImage(value: unknown): PersistedTradeDraftPendingImage | null {
  if (!isRecord(value)) return null
  const file = value.file
  if (!(file instanceof File)) return null

  return {
    id: asString(value.id),
    file,
    context_tag: asString(value.context_tag, 'entry'),
    timeframe: asString(value.timeframe),
    annotation_notes: asString(value.annotation_notes),
  }
}

function normalizeExitLeg(
  value: unknown
): PersistedTradeDraftPayload['exit_legs'][number] | null {
  if (!isRecord(value)) return null

  return {
    id: asString(value.id),
    price: asNumber(value.price),
    quantity_lots: asNumber(value.quantity_lots),
    executed_at: asString(value.executed_at),
    fees: asNumber(value.fees),
    notes: asString(value.notes),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return fallback
  return String(value)
}

function asNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function normalizePositiveInt(value: unknown): number | null {
  const numeric = Number(value)
  if (!Number.isInteger(numeric) || numeric <= 0) return null
  return numeric
}
