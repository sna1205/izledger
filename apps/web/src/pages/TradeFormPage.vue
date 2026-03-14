<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ArrowLeft, Check, DollarSign, TrendingUp } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import GlassPanel from '@/components/layout/GlassPanel.vue'
import BaseInput from '@/components/form/BaseInput.vue'
import BaseSelect from '@/components/form/BaseSelect.vue'
import BaseDateTime from '@/components/form/BaseDateTime.vue'
import InstrumentPairSelect from '@/components/form/InstrumentPairSelect.vue'
import TradeImageUploader from '@/components/trades/TradeImageUploader.vue'
import TradeRulesPanel from '@/components/rules/TradeRulesPanel.vue'
import api from '@/services/api'
import { createTradeEditLock, type TradeEditLockHandle, type TradeEditLockState } from '@/services/editLockService'
import {
  FxRateResolutionError,
  FxToUsdService,
  resolveQuoteToUsdFromTable,
  type FxQuoteToUsdResolution,
} from '@/services/fxToUsdService'
import { livePriceFeedService } from '@/services/priceFeedService'
import { useAccountStore } from '@/stores/accountStore'
import {
  useTradeStore,
  type TradePayload,
} from '@/stores/tradeStore'
import { useTradeRulesStore } from '@/stores/tradeRulesStore'
import { useSyncStatusStore } from '@/stores/syncStatusStore'
import { useUiStore } from '@/stores/uiStore'
import type { ImageContextTag, Instrument, Paginated, SessionEnum, Trade, TradeEmotion, TradeImage, TradeLeg, TradePsychology } from '@/types/trade'
import {
  clearTradeFormDraft,
  readTradeFormDraft,
  writeTradeFormDraft,
  type PersistedTradeDraftPayload,
} from '@/services/tradeDraftPersistence'
import { isOfflineModeEnabled } from '@/services/localFallback'
import { normalizeApiError, type NormalizedError } from '@/utils/apiError'
import {
  createIdleUploadStatus,
  createUploadStatus,
  DEFAULT_ALLOWED_IMAGE_TYPES,
  preparePendingImages,
  removeUploadProgressEntry,
  revokePendingImagePreview,
  type ImageUploadStatus,
} from '@/utils/imageUploadWorkflow'
import { parseTradeDateTime, validateTradeIntegrity } from '@/utils/tradeValidation'
import { asCurrency, asSignedCurrency } from '@/utils/format'
import {
  deriveTradeFollowedRules,
  resolveChecklistWorkflowFailures,
  resolveChecklistWorkflowReadiness,
} from '@/utils/tradeRuleWorkflow'
import { shouldApplyTradeHydration } from '@/utils/tradeEditHydration'

const router = useRouter()
const route = useRoute()
const tradeStore = useTradeStore()
const tradeChecklistStore = useTradeRulesStore()
const accountStore = useAccountStore()
const syncStatusStore = useSyncStatusStore()
const uiStore = useUiStore()
const { accounts } = storeToRefs(accountStore)
const { instruments, strategyModels, setups, killzones, tradeTags, sessionOptions, fxRates } = storeToRefs(tradeStore)
const {
  browserOnline,
  isFallbackMode,
  pendingQueueCount,
  queueSummary,
  syncing,
  lastSyncError,
} = storeToRefs(syncStatusStore)
const {
  checklist: activeChecklist,
  items: checklistItems,
  requiredItems: checklistRequiredItems,
  optionalItems: checklistOptionalItems,
  archivedResponses: checklistArchivedResponses,
  readiness: checklistReadiness,
  serverReadiness: checklistServerReadiness,
  executionSnapshot: checklistExecutionSnapshot,
  loading: checklistLoading,
  saving: checklistSaving,
  resolverContext: checklistResolverContext,
  resolverContextCurrent: checklistResolverContextCurrent,
  submitAttempted: checklistSubmitAttempted,
  isStrict: checklistStrictMode,
  serverReadinessMismatch: checklistServerReadinessMismatch,
  serverReadinessReasons: checklistServerReadinessReasons,
  hasChecklist,
} = storeToRefs(tradeChecklistStore)

const loadingTrade = ref(false)
const submitAttempted = ref(false)
const serverFieldErrors = ref<Record<string, string[]>>({})
const loadedTradeUpdatedAt = ref<string | null>(null)
const staleWriteCheckInProgress = ref(false)
const staleWriteConfirmedFingerprint = ref<string | null>(null)
const emotionOptions: TradeEmotion[] = ['neutral', 'calm', 'confident', 'fearful', 'greedy', 'hesitant', 'revenge']
const directionOptions = [
  { label: 'Buy', value: 'buy' },
  { label: 'Sell', value: 'sell' },
]
const emotionSelectOptions = emotionOptions.map((emotion) => ({
  label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
  value: emotion,
}))
const accountSelectOptions = computed(() =>
  accounts.value.map((account) => ({
    label: account.name,
    value: String(account.id),
    subtitle: `${account.currency} ${asCurrency(Number(account.current_balance))}`,
    badge: account.account_type === 'funded'
      ? 'Phase 1'
      : (account.account_type === 'personal' ? 'live' : 'demo'),
    keywords: [account.broker, account.account_type, account.currency],
  }))
)
const strategyModelOptions = computed(() =>
  strategyModels.value.map((item) => ({
    label: item.name,
    value: String(item.id),
    subtitle: item.description ?? '',
    keywords: [item.slug],
  }))
)
const setupOptions = computed(() =>
  setups.value.map((item) => ({
    label: item.name,
    value: String(item.id),
    subtitle: item.description ?? '',
    keywords: [item.slug],
  }))
)
const killzoneOptions = computed(() =>
  killzones.value.map((item) => ({
    label: item.name,
    value: String(item.id),
    subtitle: item.session_enum,
    keywords: [item.slug, item.session_enum],
  }))
)
const sessionEnumOptions = computed(() =>
  sessionOptions.value.map((item) => ({
    label: item.label,
    value: item.value,
  }))
)
const selectedTagIds = computed(() => new Set(form.tag_ids))
const filteredTagOptions = computed(() => {
  const term = form.tag_search.trim().toLowerCase()
  return tradeTags.value.filter((tag) => {
    if (selectedTagIds.value.has(tag.id)) return false
    if (!term) return true
    return tag.name.toLowerCase().includes(term) || tag.slug.toLowerCase().includes(term)
  })
})

const form = reactive({
  account_id: '',
  instrument_id: '',
  strategy_model_id: '',
  setup_id: '',
  killzone_id: '',
  session_enum: '' as '' | SessionEnum,
  symbol: '',
  direction: 'buy' as 'buy' | 'sell',
  date: '',
  entry_price: 0,
  stop_loss: 0,
  take_profit: 0,
  position_size: 0.01,
  commission: 0,
  swap: 0,
  spread_cost: 0,
  slippage_cost: 0,
  followed_rules: true,
  emotion: 'neutral' as TradeEmotion,
  notes: '',
  tag_ids: [] as number[],
  tag_search: '',
})

const psychology = reactive<{
  pre_emotion: string
  post_emotion: string
  confidence_score: number | null
  stress_score: number | null
  sleep_hours: number | null
  impulse_flag: boolean
  fomo_flag: boolean
  revenge_flag: boolean
  notes: string
}>({
  pre_emotion: '',
  post_emotion: '',
  confidence_score: null,
  stress_score: null,
  sleep_hours: null,
  impulse_flag: false,
  fomo_flag: false,
  revenge_flag: false,
  notes: '',
})

interface ExitLegRow {
  id: string
  price: number
  quantity_lots: number
  executed_at: string
  fees: number
  notes: string
}

interface PrimaryExitRow {
  price: number
  quantity_lots: number
  executed_at: string
  fees: number
  notes: string
}

const primaryExit = reactive<PrimaryExitRow>({
  price: 0,
  quantity_lots: 0,
  executed_at: '',
  fees: 0,
  notes: '',
})

const exitLegs = ref<ExitLegRow[]>([])

interface PendingTradeImage {
  id: string
  file: File
  preview_url: string
  context_tag: ImageContextTag
  timeframe: string
  annotation_notes: string
}

const MAX_IMAGE_COUNT = 5
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_IMAGE_BYTES = 20 * 1024 * 1024

const existingImages = ref<TradeImage[]>([])
const pendingImages = ref<PendingTradeImage[]>([])
const imageUploadStatus = ref<ImageUploadStatus>(createIdleUploadStatus())
const deletingImageIds = ref<number[]>([])
const uploadProgressByPendingId = ref<Record<string, number>>({})
const postSaveQueue = reactive({
  pendingPsychology: false,
  pendingImages: false,
  lastSavedTradeId: null as number | null,
})
const editLockState = ref<TradeEditLockState | null>(null)
const staleWriteWarning = ref<{
  fingerprint: string
  loaded_updated_at: string
  latest_updated_at: string
  diffs: Array<{ field: string; local: string; latest: string }>
} | null>(null)
let editLockHandle: TradeEditLockHandle | null = null
let releaseEditLockSubscription: (() => void) | null = null
let tradeHydrationRequestId = 0
let draftPersistenceTimer: ReturnType<typeof setTimeout> | null = null

const tradeId = computed(() => {
  const value = Number(route.params.id)
  return Number.isInteger(value) && value > 0 ? value : null
})
const isEditMode = computed(() => tradeId.value !== null)
const loadingSmartDefaults = ref(false)
const tradeCompleted = ref(true)
const draftPersistenceEnabled = ref(false)
const draftPersistenceReady = ref(false)
const draftPersistenceState = ref<'disabled' | 'idle' | 'available' | 'saving' | 'saved' | 'restored' | 'error'>('disabled')
const draftPersistenceSavedAt = ref<string | null>(null)
const draftPersistenceError = ref('')
const autoRestoreSkippedDraft = ref(false)
const hasPersistedTradeDraft = ref(false)
const createDraftDefaultFingerprint = ref('')
const pageTitle = computed(() => (isEditMode.value ? 'Edit Execute' : 'New Execute'))
const tradeFormId = 'trade-execution-form'
const closeDateMax = computed(() => maxDateTime(nowLocalDateTime(), form.date || ''))
const uploadingImages = computed(() =>
  imageUploadStatus.value.state === 'validating' || imageUploadStatus.value.state === 'uploading'
)
const totalImageCount = computed(() => existingImages.value.length + pendingImages.value.length)
const totalImageSize = computed(() => {
  const existingTotal = existingImages.value.reduce((sum, image) => sum + Number(image.file_size || 0), 0)
  const pendingTotal = pendingImages.value.reduce((sum, image) => sum + image.file.size, 0)
  return existingTotal + pendingTotal
})
const imageUploadRetryable = computed(() =>
  imageUploadStatus.value.canRetry
  && pendingImages.value.length > 0
  && postSaveQueue.lastSavedTradeId !== null
)
const hasPendingPostSave = computed(() =>
  postSaveQueue.lastSavedTradeId !== null
  && (postSaveQueue.pendingPsychology || postSaveQueue.pendingImages)
)
const selectedInstrument = computed<Instrument | null>(() => {
  const id = Number(form.instrument_id)
  if (!Number.isInteger(id) || id <= 0) return null
  return instruments.value.find((instrument) => instrument.id === id) ?? null
})
const fxResolver = new FxToUsdService(livePriceFeedService)
const quoteTickVersion = ref(0)
let stopTrackingFxSymbols: (() => void) | null = null
let unsubscribeFxListeners: Array<() => void> = []
const liveFxConversion = ref<FxQuoteToUsdResolution | null>(null)
const liveFxLoading = ref(false)
const liveFxAttemptedSymbols = ref<string[]>([])
const liveFxConversionErrorMessage = ref('')
let liveFxResolveRequestId = 0
const isFxPending = computed(() => {
  const instrument = selectedInstrument.value
  return Boolean(
    instrument
    && instrument.quote_currency.toUpperCase() !== 'USD'
    && liveFxLoading.value
  )
})
const liveFxConversionError = computed(() => {
  if (isFxPending.value) return ''
  return liveFxConversionErrorMessage.value
})
const selectedStrategyModel = computed(() => {
  const id = Number(form.strategy_model_id)
  if (!Number.isInteger(id) || id <= 0) return null
  return strategyModels.value.find((item) => item.id === id) ?? null
})
const selectedSetup = computed(() => {
  const id = Number(form.setup_id)
  if (!Number.isInteger(id) || id <= 0) return null
  return setups.value.find((item) => item.id === id) ?? null
})
const instrumentSymbol = computed(() => selectedInstrument.value?.symbol ?? form.symbol.trim().toUpperCase())
let checklistPreviewTimer: ReturnType<typeof setTimeout> | null = null
const selectedChecklistAccountId = computed(() => {
  const id = Number(form.account_id)
  if (!Number.isInteger(id) || id <= 0) return null
  return accounts.value.some((account) => account.id === id) ? id : null
})
const selectedChecklistAccount = computed(() => {
  const id = selectedChecklistAccountId.value
  if (id === null) return null
  return accounts.value.find((account) => account.id === id) ?? null
})
const selectedChecklistStrategyModelId = computed(() => {
  const id = Number(form.strategy_model_id)
  if (!Number.isInteger(id) || id <= 0) return null
  return strategyModels.value.some((item) => item.id === id) ? id : null
})
const selectedChecklistTradeId = computed(() =>
  isEditMode.value && tradeId.value !== null ? tradeId.value : null
)
const isChecklistContextMismatch = computed(() => {
  const context = checklistResolverContext.value
  if (!context) return true
  if (!checklistResolverContextCurrent.value) return true

  return context.requested_account_id !== selectedChecklistAccountId.value
    || context.requested_strategy_model_id !== selectedChecklistStrategyModelId.value
    || context.trade_id !== selectedChecklistTradeId.value
})
const isSaveBlocked = computed(() =>
  isFxPending.value
  || Boolean(liveFxConversionError.value)
)
const isChecklistStrictBlocked = computed(() =>
  checklistStrictMode.value
  && hasChecklist.value
  && !resolvedChecklistReadiness.value.ready
)
const resolvedChecklistReadiness = computed(() =>
  resolveChecklistWorkflowReadiness({
    readiness: checklistReadiness.value,
    serverReadiness: checklistServerReadiness.value,
    executionSnapshot: checklistExecutionSnapshot.value ?? null,
  })
)
const resolvedChecklistFailures = computed(() =>
  resolveChecklistWorkflowFailures({
    readiness: checklistReadiness.value,
    serverReadiness: checklistServerReadiness.value,
    serverReadinessReasons: checklistServerReadinessReasons.value,
    executionSnapshot: checklistExecutionSnapshot.value ?? null,
  })
)
const checklistGateIncomplete = computed(() =>
  hasChecklist.value && !resolvedChecklistReadiness.value.ready
)
const showSoftChecklistNotice = computed(() =>
  hasChecklist.value
  && !checklistStrictMode.value
  && checklistGateIncomplete.value
)
const derivedFollowedRules = computed(() =>
  deriveTradeFollowedRules(
    hasChecklist.value,
    form.followed_rules,
    {
      readiness: checklistReadiness.value,
      serverReadiness: checklistServerReadiness.value,
      serverReadinessReasons: checklistServerReadinessReasons.value,
      executionSnapshot: checklistExecutionSnapshot.value ?? null,
    }
  )
)
const isLockedByOtherTab = computed(() =>
  isEditMode.value
  && editLockState.value?.holder === 'other'
)
const isSubmittingDisabled = computed(() =>
  tradeStore.saving
  || uploadingImages.value
  || staleWriteCheckInProgress.value
  || checklistLoading.value
  || isSaveBlocked.value
  || (isEditMode.value && isLockedByOtherTab.value)
  || isChecklistContextMismatch.value
  || isChecklistStrictBlocked.value
)
const lockHolderLabel = computed(() => {
  const label = editLockState.value?.record?.holder_label?.trim()
  return label || 'another tab'
})
const blockedSummary = computed(() => {
  if (!submitAttempted.value || (!isSaveBlocked.value && !isChecklistContextMismatch.value && !isChecklistStrictBlocked.value)) return ''
  if (isFxPending.value) return 'Fetching FX quote...'
  if (isChecklistContextMismatch.value) return 'Rule context is refreshing for the selected account and strategy.'
  if (isChecklistStrictBlocked.value) {
    const firstReason = resolvedChecklistFailures.value[0]?.reason?.trim()
    return firstReason || 'Strict mode is blocked by checklist readiness.'
  }
  if (liveFxConversionError.value) return liveFxConversionError.value
  return 'Resolve errors before saving this execution.'
})

async function refreshLiveFxConversion() {
  const previousFxMaterialSignature = getFxMaterialSignature(liveFxConversion.value)
  const instrument = selectedInstrument.value
  if (!instrument) {
    liveFxConversion.value = null
    liveFxConversionErrorMessage.value = ''
    liveFxAttemptedSymbols.value = []
    liveFxLoading.value = false
    return
  }

  const quoteCurrency = instrument.quote_currency.toUpperCase()
  if (quoteCurrency === 'USD') {
    liveFxConversion.value = {
      rate: 1,
      symbolUsed: null,
      method: 'identity',
      mode: 'mid',
      ts: null,
      attemptedSymbols: [],
    }
    liveFxConversionErrorMessage.value = ''
    liveFxAttemptedSymbols.value = []
    liveFxLoading.value = false
    return
  }

  const requestId = ++liveFxResolveRequestId
  liveFxLoading.value = true
  liveFxConversionErrorMessage.value = ''
  liveFxAttemptedSymbols.value = []

  try {
    const rate = await fxResolver.getRate(quoteCurrency, 'mid')
    if (requestId !== liveFxResolveRequestId) return
    liveFxConversion.value = rate
    if (getFxMaterialSignature(rate) !== previousFxMaterialSignature) {
      refreshDerivedState()
    }
    liveFxConversionErrorMessage.value = ''
    liveFxAttemptedSymbols.value = []
  } catch (error) {
    if (requestId !== liveFxResolveRequestId) return
    const fallback = resolveQuoteToUsdFromTable(quoteCurrency, fxRates.value)
    if (fallback) {
      liveFxConversion.value = fallback
      if (getFxMaterialSignature(fallback) !== previousFxMaterialSignature) {
        refreshDerivedState()
      }
      liveFxConversionErrorMessage.value = ''
      liveFxAttemptedSymbols.value = []
      return
    }

    liveFxConversion.value = null
    if (error instanceof FxRateResolutionError) {
      liveFxAttemptedSymbols.value = error.attemptedSymbols
      liveFxConversionErrorMessage.value = error.message
    } else {
      liveFxAttemptedSymbols.value = []
      liveFxConversionErrorMessage.value = `Missing live FX quote to convert ${quoteCurrency}->USD`
    }
  } finally {
    if (requestId === liveFxResolveRequestId) {
      liveFxLoading.value = false
    }
  }
}

const validExitLegs = computed(() => {
  const rows: Array<{ price: number; quantity_lots: number; fees: number }> = []
  if (toNumber(primaryExit.price) > 0 && toNumber(primaryExit.quantity_lots) > 0) {
    rows.push({
      price: toNumber(primaryExit.price),
      quantity_lots: toNumber(primaryExit.quantity_lots),
      fees: toNumber(primaryExit.fees),
    })
  }
  for (const leg of exitLegs.value) {
    if (toNumber(leg.price) > 0 && toNumber(leg.quantity_lots) > 0) {
      rows.push({
        price: toNumber(leg.price),
        quantity_lots: toNumber(leg.quantity_lots),
        fees: toNumber(leg.fees),
      })
    }
  }
  return rows
})

const exitLegSummary = computed(() => {
  const rows = validExitLegs.value
  const quantity = rows.reduce((sum, leg) => sum + toNumber(leg.quantity_lots), 0)
  const weighted = rows.reduce((sum, leg) => sum + (toNumber(leg.price) * toNumber(leg.quantity_lots)), 0)
  const weightedPrice = quantity > 0 ? (weighted / quantity) : toNumber(form.entry_price)
  const fees = rows.reduce((sum, leg) => sum + toNumber(leg.fees), 0)

  return {
    quantity,
    weightedPrice,
    fees,
  }
})

function estimateLegPnl(leg: Pick<ExitLegRow, 'price' | 'quantity_lots' | 'fees'>) {
  const instrument = selectedInstrument.value
  const entry = toNumber(form.entry_price)
  const exit = toNumber(leg.price)
  const quantity = toNumber(leg.quantity_lots)
  if (!(entry > 0) || !(exit > 0) || !(quantity > 0)) return 0

  const direction = form.direction === 'buy' ? 1 : -1
  const move = (exit - entry) * direction

  if (!instrument) {
    return move * quantity - toNumber(leg.fees)
  }

  const tickSize = toNumber(instrument.tick_size)
  const tickValue = toNumber(instrument.tick_value)
  const gross = tickSize > 0 && tickValue > 0
    ? (move / tickSize) * tickValue * quantity
    : move * quantity

  return gross - toNumber(leg.fees)
}

function estimateLegPnlLabel(leg: Pick<ExitLegRow, 'price' | 'quantity_lots' | 'fees'>) {
  return asSignedCurrency(estimateLegPnl(leg))
}

function toLocalDateTime(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function nowLocalDateTime() {
  return toLocalDateTime(new Date().toISOString())
}

function maxDateTime(a: string, b: string) {
  return a > b ? a : b
}

function toNumber(value: unknown) {
  return Number(value || 0)
}

function makeExitLeg(partial?: Partial<ExitLegRow>): ExitLegRow {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    price: partial?.price ?? toNumber(form.entry_price),
    quantity_lots: partial?.quantity_lots ?? toNumber(form.position_size),
    executed_at: partial?.executed_at ?? (form.date || nowLocalDateTime()),
    fees: partial?.fees ?? 0,
    notes: partial?.notes ?? '',
  }
}

function resetPrimaryExit(partial?: Partial<PrimaryExitRow>) {
  primaryExit.price = partial?.price ?? toNumber(form.take_profit || form.entry_price)
  primaryExit.quantity_lots = partial?.quantity_lots ?? toNumber(form.position_size)
  primaryExit.executed_at = partial?.executed_at ?? (form.date || nowLocalDateTime())
  primaryExit.fees = partial?.fees ?? 0
  primaryExit.notes = partial?.notes ?? ''
}

function addExitLeg() {
  const alreadyAllocated = toNumber(primaryExit.quantity_lots) + exitLegSummary.value.quantity
  const defaultQty = Math.max(0.0001, toNumber(form.position_size) - alreadyAllocated)
  exitLegs.value = [...exitLegs.value, makeExitLeg({ quantity_lots: defaultQty > 0 ? defaultQty : 0.0001 })]
}

function removeExitLeg(id: string) {
  exitLegs.value = exitLegs.value.filter((leg) => leg.id !== id)
}

function ensureDefaultExitLeg() {
  resetPrimaryExit()
  exitLegs.value = []
}

function addTag(tagId: number) {
  if (selectedTagIds.value.has(tagId)) return
  form.tag_ids = [...form.tag_ids, tagId]
  form.tag_search = ''
}

function removeTag(tagId: number) {
  form.tag_ids = form.tag_ids.filter((value) => value !== tagId)
}

const selectedTags = computed(() =>
  tradeTags.value.filter((tag) => selectedTagIds.value.has(tag.id))
)

function setPsychologyFromPayload(payload?: TradePsychology | null) {
  psychology.pre_emotion = payload?.pre_emotion ?? ''
  psychology.post_emotion = payload?.post_emotion ?? ''
  psychology.confidence_score = payload?.confidence_score === null || payload?.confidence_score === undefined
    ? null
    : Number(payload.confidence_score)
  psychology.stress_score = payload?.stress_score === null || payload?.stress_score === undefined
    ? null
    : Number(payload.stress_score)
  psychology.sleep_hours = payload?.sleep_hours === null || payload?.sleep_hours === undefined
    ? null
    : Number(payload.sleep_hours)
  psychology.impulse_flag = Boolean(payload?.impulse_flag)
  psychology.fomo_flag = Boolean(payload?.fomo_flag)
  psychology.revenge_flag = Boolean(payload?.revenge_flag)
  psychology.notes = payload?.notes ?? ''
}

function resetTradeFormState() {
  form.account_id = ''
  form.instrument_id = ''
  form.strategy_model_id = ''
  form.setup_id = ''
  form.killzone_id = ''
  form.session_enum = ''
  form.symbol = ''
  form.direction = 'buy'
  form.date = nowLocalDateTime()
  form.entry_price = 0
  form.stop_loss = 0
  form.take_profit = 0
  form.position_size = 0.01
  form.commission = 0
  form.swap = 0
  form.spread_cost = 0
  form.slippage_cost = 0
  form.followed_rules = true
  form.emotion = 'neutral'
  form.notes = ''
  form.tag_ids = []
  form.tag_search = ''

  resetPrimaryExit({
    price: 0,
    quantity_lots: 0,
    executed_at: form.date,
    fees: 0,
    notes: '',
  })
  exitLegs.value = []
  setPsychologyFromPayload(null)

  existingImages.value = []
  deletingImageIds.value = []
  submitAttempted.value = false
  serverFieldErrors.value = {}
  loadedTradeUpdatedAt.value = null
  staleWriteCheckInProgress.value = false
  clearStaleWriteWarning()
  clearPendingImages()
  clearPostSaveQueue()
  tradeCompleted.value = true
}

function refreshDraftPersistencePreference() {
  draftPersistenceEnabled.value = !isEditMode.value && isOfflineModeEnabled()
  if (!draftPersistenceEnabled.value) {
    draftPersistenceState.value = 'disabled'
    draftPersistenceError.value = ''
    autoRestoreSkippedDraft.value = false
    hasPersistedTradeDraft.value = false
    draftPersistenceSavedAt.value = null
    createDraftDefaultFingerprint.value = ''
  }
}

function clearDraftPersistenceTimer() {
  if (!draftPersistenceTimer) return
  clearTimeout(draftPersistenceTimer)
  draftPersistenceTimer = null
}

function isQuickTradeQueryActive() {
  return `${route.query.quick ?? ''}` === '1'
}

function buildTradeDraftPayload(): PersistedTradeDraftPayload {
  return {
    version: 1,
    trade_completed: tradeCompleted.value,
    form: {
      account_id: form.account_id,
      instrument_id: form.instrument_id,
      strategy_model_id: form.strategy_model_id,
      setup_id: form.setup_id,
      killzone_id: form.killzone_id,
      session_enum: form.session_enum,
      symbol: form.symbol,
      direction: form.direction,
      date: form.date,
      entry_price: toNumber(form.entry_price),
      stop_loss: toNumber(form.stop_loss),
      take_profit: toNumber(form.take_profit),
      position_size: toNumber(form.position_size),
      commission: toNumber(form.commission),
      swap: toNumber(form.swap),
      spread_cost: toNumber(form.spread_cost),
      slippage_cost: toNumber(form.slippage_cost),
      followed_rules: Boolean(form.followed_rules),
      emotion: form.emotion,
      notes: form.notes,
      tag_ids: form.tag_ids.slice(),
    },
    psychology: {
      pre_emotion: psychology.pre_emotion,
      post_emotion: psychology.post_emotion,
      confidence_score: psychology.confidence_score,
      stress_score: psychology.stress_score,
      sleep_hours: psychology.sleep_hours,
      impulse_flag: psychology.impulse_flag,
      fomo_flag: psychology.fomo_flag,
      revenge_flag: psychology.revenge_flag,
      notes: psychology.notes,
    },
    primary_exit: {
      price: toNumber(primaryExit.price),
      quantity_lots: toNumber(primaryExit.quantity_lots),
      executed_at: primaryExit.executed_at,
      fees: toNumber(primaryExit.fees),
      notes: primaryExit.notes,
    },
    exit_legs: exitLegs.value.map((leg) => ({
      id: leg.id,
      price: toNumber(leg.price),
      quantity_lots: toNumber(leg.quantity_lots),
      executed_at: leg.executed_at,
      fees: toNumber(leg.fees),
      notes: leg.notes,
    })),
    pending_images: pendingImages.value.map((image) => ({
      id: image.id,
      file: image.file,
      context_tag: image.context_tag,
      timeframe: image.timeframe,
      annotation_notes: image.annotation_notes,
    })),
  }
}

function createTradeDraftFingerprint(payload: PersistedTradeDraftPayload) {
  return JSON.stringify({
    ...payload,
    pending_images: payload.pending_images.map((image) => ({
      id: image.id,
      file_name: image.file.name,
      file_size: image.file.size,
      file_type: image.file.type,
      last_modified: image.file.lastModified,
      context_tag: image.context_tag,
      timeframe: image.timeframe,
      annotation_notes: image.annotation_notes,
    })),
  })
}

function applyPersistedTradeDraft(payload: PersistedTradeDraftPayload) {
  tradeCompleted.value = payload.trade_completed
  form.account_id = payload.form.account_id
  form.instrument_id = payload.form.instrument_id
  form.strategy_model_id = payload.form.strategy_model_id
  form.setup_id = payload.form.setup_id
  form.killzone_id = payload.form.killzone_id
  form.session_enum = payload.form.session_enum as '' | SessionEnum
  form.symbol = payload.form.symbol
  form.direction = payload.form.direction
  form.date = payload.form.date
  form.entry_price = payload.form.entry_price
  form.stop_loss = payload.form.stop_loss
  form.take_profit = payload.form.take_profit
  form.position_size = payload.form.position_size
  form.commission = payload.form.commission
  form.swap = payload.form.swap
  form.spread_cost = payload.form.spread_cost
  form.slippage_cost = payload.form.slippage_cost
  form.followed_rules = payload.form.followed_rules
  form.emotion = payload.form.emotion as TradeEmotion
  form.notes = payload.form.notes
  form.tag_ids = payload.form.tag_ids.slice()
  form.tag_search = ''

  psychology.pre_emotion = payload.psychology.pre_emotion
  psychology.post_emotion = payload.psychology.post_emotion
  psychology.confidence_score = payload.psychology.confidence_score
  psychology.stress_score = payload.psychology.stress_score
  psychology.sleep_hours = payload.psychology.sleep_hours
  psychology.impulse_flag = payload.psychology.impulse_flag
  psychology.fomo_flag = payload.psychology.fomo_flag
  psychology.revenge_flag = payload.psychology.revenge_flag
  psychology.notes = payload.psychology.notes

  resetPrimaryExit({
    price: payload.primary_exit.price,
    quantity_lots: payload.primary_exit.quantity_lots,
    executed_at: payload.primary_exit.executed_at,
    fees: payload.primary_exit.fees,
    notes: payload.primary_exit.notes,
  })
  exitLegs.value = payload.exit_legs.map((leg) => makeExitLeg({
    price: leg.price,
    quantity_lots: leg.quantity_lots,
    executed_at: leg.executed_at,
    fees: leg.fees,
    notes: leg.notes,
  }))

  clearPendingImages()
  pendingImages.value = payload.pending_images.map((image) => ({
    id: image.id,
    file: image.file,
    preview_url: URL.createObjectURL(image.file),
    context_tag: image.context_tag as ImageContextTag,
    timeframe: image.timeframe,
    annotation_notes: image.annotation_notes,
  }))
}

function formatDraftSavedAt(value: string | null): string {
  if (!value) return ''
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return value
  return new Date(parsed).toLocaleString()
}

const tradeDraftFingerprint = computed(() => createTradeDraftFingerprint(buildTradeDraftPayload()))
const hasMeaningfulDraftChanges = computed(() =>
  !isEditMode.value
  && createDraftDefaultFingerprint.value !== ''
  && tradeDraftFingerprint.value !== createDraftDefaultFingerprint.value
)
const tradeDraftStatusMessage = computed(() => {
  if (isEditMode.value) return ''
  if (!draftPersistenceEnabled.value) {
    return 'Offline draft persistence is off. Unsaved changes on this page will not survive leaving the route.'
  }
  if (draftPersistenceState.value === 'saving') {
    return 'Saving this draft locally...'
  }
  if (draftPersistenceState.value === 'saved' && draftPersistenceSavedAt.value) {
    return `Draft saved locally at ${formatDraftSavedAt(draftPersistenceSavedAt.value)}.`
  }
  if (draftPersistenceState.value === 'restored' && draftPersistenceSavedAt.value) {
    return `Restored local draft from ${formatDraftSavedAt(draftPersistenceSavedAt.value)}.`
  }
  if (draftPersistenceState.value === 'available' && draftPersistenceSavedAt.value) {
    return `A local draft from ${formatDraftSavedAt(draftPersistenceSavedAt.value)} is available to restore.`
  }
  if (draftPersistenceState.value === 'error') {
    return draftPersistenceError.value || 'Local draft persistence is unavailable right now.'
  }
  if (hasMeaningfulDraftChanges.value) {
    return 'Unsynced local draft changes are in progress.'
  }
  return 'No local draft is currently stored for this form.'
})
const tradeDraftBannerTitle = computed(() => {
  if (browserOnline.value === false) return 'Offline right now'
  if (isFallbackMode.value) return 'Local sync backlog active'
  if (pendingQueueCount.value > 0) return 'Queued drafts waiting to sync'
  return 'Draft persistence'
})
const tradeDraftBannerMessage = computed(() => {
  if (browserOnline.value === false) {
    return 'This device is offline. New executions can be stored locally and synced when connectivity returns.'
  }
  if (isFallbackMode.value) {
    return 'The app is using local draft mode. New saves may remain on this device until the server is reachable again.'
  }
  if (pendingQueueCount.value > 0) {
    return `${queueSummary.value.draft_local} draft, ${queueSummary.value.pending_sync} pending, and ${queueSummary.value.conflict} conflict item(s) are in the sync queue.`
  }
  return 'Offline mode controls whether in-progress drafts on this page persist locally between visits.'
})
const canRestorePersistedDraft = computed(() =>
  !isEditMode.value
  && draftPersistenceEnabled.value
  && autoRestoreSkippedDraft.value
  && hasPersistedTradeDraft.value
)
const showTradeDraftBanner = computed(() =>
  !isEditMode.value
  && (
    !draftPersistenceEnabled.value
    || draftPersistenceState.value !== 'idle'
    || browserOnline.value === false
    || isFallbackMode.value
    || pendingQueueCount.value > 0
    || Boolean(lastSyncError.value)
  )
)

async function maybeRestorePersistedTradeDraft(skipAutoRestore = false) {
  refreshDraftPersistencePreference()
  if (!draftPersistenceEnabled.value) return false

  try {
    const restored = await readTradeFormDraft()
    if (!restored) {
      hasPersistedTradeDraft.value = false
      autoRestoreSkippedDraft.value = false
      if (draftPersistenceState.value !== 'restored') {
        draftPersistenceState.value = 'idle'
      }
      return false
    }

    hasPersistedTradeDraft.value = true
    draftPersistenceSavedAt.value = restored.savedAt
    draftPersistenceError.value = ''

    if (skipAutoRestore) {
      autoRestoreSkippedDraft.value = true
      draftPersistenceState.value = 'available'
      return false
    }

    autoRestoreSkippedDraft.value = false
    applyPersistedTradeDraft(restored.draft)
    draftPersistenceState.value = 'restored'
    return true
  } catch (error) {
    hasPersistedTradeDraft.value = false
    autoRestoreSkippedDraft.value = false
    draftPersistenceState.value = 'error'
    draftPersistenceError.value = normalizeApiError(error).message
    return false
  }
}

async function persistTradeDraftNow() {
  if (isEditMode.value || !draftPersistenceReady.value) return
  refreshDraftPersistencePreference()
  if (!draftPersistenceEnabled.value) return
  if (autoRestoreSkippedDraft.value && hasPersistedTradeDraft.value) return

  const payload = buildTradeDraftPayload()
  const fingerprint = createTradeDraftFingerprint(payload)
  if (fingerprint === createDraftDefaultFingerprint.value) {
    if (hasPersistedTradeDraft.value) {
      await clearTradeFormDraft()
    }
    hasPersistedTradeDraft.value = false
    autoRestoreSkippedDraft.value = false
    draftPersistenceSavedAt.value = null
    draftPersistenceError.value = ''
    draftPersistenceState.value = 'idle'
    return
  }

  draftPersistenceState.value = 'saving'
  draftPersistenceError.value = ''
  try {
    draftPersistenceSavedAt.value = await writeTradeFormDraft(payload)
    hasPersistedTradeDraft.value = true
    autoRestoreSkippedDraft.value = false
    draftPersistenceState.value = 'saved'
  } catch (error) {
    draftPersistenceState.value = 'error'
    draftPersistenceError.value = normalizeApiError(error).message
  }
}

function scheduleTradeDraftPersistence() {
  if (isEditMode.value || !draftPersistenceReady.value) return
  if (autoRestoreSkippedDraft.value && hasPersistedTradeDraft.value) return
  clearDraftPersistenceTimer()
  draftPersistenceTimer = setTimeout(() => {
    void persistTradeDraftNow()
  }, 500)
}

async function clearPersistedTradeDraftState() {
  clearDraftPersistenceTimer()
  await clearTradeFormDraft()
  hasPersistedTradeDraft.value = false
  autoRestoreSkippedDraft.value = false
  draftPersistenceSavedAt.value = null
  draftPersistenceError.value = ''
  draftPersistenceState.value = draftPersistenceEnabled.value ? 'idle' : 'disabled'
}

async function restorePersistedTradeDraftManually() {
  if (!canRestorePersistedDraft.value) return
  const restored = await maybeRestorePersistedTradeDraft(false)
  if (restored) {
    uiStore.toast({
      type: 'success',
      title: 'Local draft restored',
      message: 'The saved in-progress execution draft has been restored on this page.',
    })
  }
}

async function discardPersistedTradeDraft() {
  const confirmed = await uiStore.askConfirmation({
    title: 'Discard local trade draft?',
    message: 'This removes the locally persisted in-progress trade draft and resets this page to fresh defaults.',
    confirmText: 'Discard draft',
    danger: true,
  })
  if (!confirmed) return

  await clearPersistedTradeDraftState()
  await applyCreateDefaultsForCurrentRoute(true)
}

function setFormFromTrade(trade: Trade, legs: TradeLeg[] = [], tradePsychology?: TradePsychology | null) {
  form.account_id = String(trade.account_id || '')
  form.instrument_id = trade.instrument_id ? String(trade.instrument_id) : ''
  form.strategy_model_id = trade.strategy_model_id ? String(trade.strategy_model_id) : ''
  form.setup_id = trade.setup_id ? String(trade.setup_id) : ''
  form.killzone_id = trade.killzone_id ? String(trade.killzone_id) : ''
  form.session_enum = (trade.session_enum ?? '') as '' | SessionEnum
  form.symbol = trade.pair
  form.direction = trade.direction
  form.date = toLocalDateTime(trade.date)
  form.entry_price = Number(trade.entry_price)
  form.stop_loss = Number(trade.stop_loss)
  form.take_profit = Number(trade.take_profit)
  form.position_size = Number(trade.lot_size)
  form.commission = Number(trade.commission ?? 0)
  form.swap = Number(trade.swap ?? 0)
  form.spread_cost = Number(trade.spread_cost ?? 0)
  form.slippage_cost = Number(trade.slippage_cost ?? 0)
  form.followed_rules = Boolean(trade.followed_rules)
  form.emotion = (trade.emotion ?? 'neutral') as TradeEmotion
  form.notes = trade.notes || ''
  form.tag_ids = trade.tags?.map((tag) => Number(tag.id)) ?? (trade.tag_ids ?? [])
  form.tag_search = ''

  const sourceLegs = (legs.length > 0 ? legs : (trade.legs ?? [])).map((leg) => ({
    ...leg,
    price: Number(leg.price),
    quantity_lots: Number(leg.quantity_lots),
    fees: Number(leg.fees ?? 0),
  }))

  const exitRows = sourceLegs
    .filter((leg) => leg.leg_type === 'exit')
    .map((leg) => makeExitLeg({
      price: Number(leg.price),
      quantity_lots: Number(leg.quantity_lots),
      executed_at: leg.executed_at ? toLocalDateTime(leg.executed_at) : form.date,
      fees: Number(leg.fees ?? 0),
      notes: leg.notes ?? '',
    }))

  if (exitRows.length > 0) {
    const [firstExit, ...partials] = exitRows
    resetPrimaryExit({
      price: toNumber(firstExit?.price),
      quantity_lots: toNumber(firstExit?.quantity_lots),
      executed_at: firstExit?.executed_at || form.date,
      fees: toNumber(firstExit?.fees),
      notes: firstExit?.notes ?? '',
    })
    exitLegs.value = partials
  } else {
    resetPrimaryExit({
      price: Number(trade.actual_exit_price ?? trade.entry_price),
      quantity_lots: Number(trade.lot_size),
      executed_at: form.date,
    })
    exitLegs.value = []
  }
  setPsychologyFromPayload(tradePsychology ?? trade.psychology ?? null)

}

function roundLot(value: number) {
  return Math.max(0.0001, Math.round(value * 10_000) / 10_000)
}

function formatPriceField(field: 'entry_price' | 'stop_loss' | 'take_profit') {
  const value = toNumber(form[field])
  if (!(value > 0)) return
  form[field] = Number(value.toFixed(6))
}

function formatLotField(field: 'position_size') {
  const value = roundLot(toNumber(form[field]))
  form[field] = value
}

function onQuickTicketEnter(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  const currentTarget = event.currentTarget as HTMLElement | null
  if (!target || !currentTarget) return
  if (!(target instanceof HTMLInputElement)) return

  const controls = Array.from(
    currentTarget.querySelectorAll<HTMLInputElement>('input:not([disabled]):not([type="hidden"])')
  )
  const index = controls.findIndex((control) => control === target)
  if (index < 0) return

  event.preventDefault()

  const next = controls[index + 1]
  if (!next) {
    target.blur()
    return
  }

  next.focus()
  next.select()
}

async function applySmartDefaultsFromLastTrade() {
  if (isEditMode.value || loadingSmartDefaults.value) return
  loadingSmartDefaults.value = true

  try {
    const { data } = await api.get<Paginated<Trade>>('/trades', {
      params: {
        page: 1,
        per_page: 10,
      },
    })

    const latestTrade = (data.data ?? [])
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

    if (!latestTrade) return

    if (!form.account_id && latestTrade.account_id) {
      form.account_id = String(latestTrade.account_id)
    }
    if (!form.strategy_model_id && latestTrade.strategy_model_id) {
      form.strategy_model_id = String(latestTrade.strategy_model_id)
    }
    if (!form.setup_id && latestTrade.setup_id) {
      form.setup_id = String(latestTrade.setup_id)
    }
    if (!form.killzone_id && latestTrade.killzone_id) {
      form.killzone_id = String(latestTrade.killzone_id)
    }
    if (!form.session_enum && latestTrade.session_enum) {
      form.session_enum = latestTrade.session_enum
    }

    if (toNumber(form.commission) === 0) {
      form.commission = Number(latestTrade.commission ?? 0)
    }
    if (toNumber(form.swap) === 0) {
      form.swap = Number(latestTrade.swap ?? 0)
    }
    if (toNumber(form.spread_cost) === 0) {
      form.spread_cost = Number(latestTrade.spread_cost ?? 0)
    }
    if (toNumber(form.slippage_cost) === 0) {
      form.slippage_cost = Number(latestTrade.slippage_cost ?? 0)
    }

    if (!form.instrument_id && latestTrade.instrument_id) {
      const hasInstrument = instruments.value.some((instrument) => instrument.id === Number(latestTrade.instrument_id))
      if (hasInstrument) {
        form.instrument_id = String(latestTrade.instrument_id)
      } else if (latestTrade.pair) {
        selectInstrumentBySymbol(latestTrade.pair)
      }
    } else if (!form.instrument_id && latestTrade.pair) {
      selectInstrumentBySymbol(latestTrade.pair)
    }
  } catch {
    // Keep deterministic fallback defaults when no previous trade can be fetched.
  } finally {
    loadingSmartDefaults.value = false
  }
}

function applyQuickDefaultsFromQuery() {
  if (isEditMode.value) return
  if (`${route.query.quick ?? ''}` !== '1') return

  const symbol = `${route.query.symbol ?? ''}`.trim().toUpperCase()
  const direction = `${route.query.direction ?? ''}`.trim().toLowerCase()

  if (symbol) {
    form.symbol = symbol
  }
  if (direction === 'buy' || direction === 'sell') {
    form.direction = direction
  }

  if (symbol) {
    selectInstrumentBySymbol(symbol)
  }
}

function selectInstrumentBySymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase()
  if (!normalized) return

  const match = instruments.value.find((instrument) => instrument.symbol.toUpperCase() === normalized)
  if (!match) return

  form.instrument_id = String(match.id)
  form.symbol = match.symbol
}

function findInstrumentById(value: string): Instrument | null {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) return null
  return instruments.value.find((instrument) => instrument.id === id) ?? null
}

const formErrors = computed<Record<string, string>>(() => {
  const errors: Record<string, string> = {}
  const instrument = selectedInstrument.value

  if (!form.account_id) {
    errors.account_id = 'Account is required.'
  } else {
    const accountId = Number(form.account_id)
    const accountExists = Number.isInteger(accountId) && accountId > 0
      && accounts.value.some((account) => account.id === accountId)
    if (!accountExists) {
      errors.account_id = 'Please select a valid account from the list.'
    }
  }

  if (!form.instrument_id) {
    errors.instrument_id = 'Instrument is required.'
  } else if (!findInstrumentById(form.instrument_id)) {
    errors.instrument_id = 'Please select a valid instrument from the list.'
  }
  if (!form.strategy_model_id) {
    errors.strategy_model_id = 'Strategy model is required.'
  } else {
    const strategyModelId = Number(form.strategy_model_id)
    const exists = Number.isInteger(strategyModelId) && strategyModelId > 0
      && strategyModels.value.some((item) => item.id === strategyModelId)
    if (!exists) {
      errors.strategy_model_id = 'Please select a valid strategy model from the list.'
    }
  }
  if (!form.setup_id) {
    errors.setup_id = 'Setup is required.'
  } else {
    const setupId = Number(form.setup_id)
    const exists = Number.isInteger(setupId) && setupId > 0
      && setups.value.some((item) => item.id === setupId)
    if (!exists) {
      errors.setup_id = 'Please select a valid setup from the list.'
    }
  }
  if (!form.killzone_id) {
    errors.killzone_id = 'Killzone is required.'
  } else {
    const killzoneId = Number(form.killzone_id)
    const exists = Number.isInteger(killzoneId) && killzoneId > 0
      && killzones.value.some((item) => item.id === killzoneId)
    if (!exists) {
      errors.killzone_id = 'Please select a valid killzone from the list.'
    }
  }
  if (!form.session_enum) {
    errors.session_enum = 'Session is required.'
  }

  Object.assign(errors, validateTradeIntegrity({
    date: form.date,
    direction: form.direction,
    entry_price: toNumber(form.entry_price),
    stop_loss: toNumber(form.stop_loss),
    take_profit: toNumber(form.take_profit),
    position_size: toNumber(form.position_size),
    commission: toNumber(form.commission),
    spread_cost: toNumber(form.spread_cost),
    slippage_cost: toNumber(form.slippage_cost),
    trade_completed: tradeCompleted.value,
    primary_exit: {
      price: toNumber(primaryExit.price),
      quantity_lots: toNumber(primaryExit.quantity_lots),
      executed_at: primaryExit.executed_at,
    },
    exit_legs: exitLegs.value.map((leg) => ({
      price: toNumber(leg.price),
      quantity_lots: toNumber(leg.quantity_lots),
      executed_at: leg.executed_at,
    })),
    instrument: instrument
      ? {
        min_lot: instrument.min_lot,
        lot_step: instrument.lot_step,
      }
      : null,
  }))

  return errors
})

function fieldError(name: string) {
  if (!submitAttempted.value) return ''
  const localMessage = formErrors.value[name]
  if (localMessage) return localMessage
  return serverFieldErrors.value[name]?.[0] ?? ''
}

async function applyCreateDefaultsForCurrentRoute(skipDraftRestore = false) {
  draftPersistenceReady.value = false
  refreshDraftPersistencePreference()
  resetTradeFormState()
  await applySmartDefaultsFromLastTrade()

  if (!form.account_id && accountSelectOptions.value.length > 0) {
    form.account_id = accountSelectOptions.value[0]?.value ?? ''
  }
  if (!form.instrument_id && instruments.value.length > 0) {
    form.instrument_id = String(instruments.value[0]?.id ?? '')
  }
  if (!form.strategy_model_id && strategyModelOptions.value.length > 0) {
    form.strategy_model_id = strategyModelOptions.value[0]?.value ?? ''
  }
  if (!form.setup_id && setupOptions.value.length > 0) {
    form.setup_id = setupOptions.value[0]?.value ?? ''
  }
  if (!form.killzone_id && killzoneOptions.value.length > 0) {
    form.killzone_id = killzoneOptions.value[0]?.value ?? ''
  }
  if (!form.session_enum && sessionEnumOptions.value.length > 0) {
    form.session_enum = (sessionEnumOptions.value[0]?.value as SessionEnum | undefined) ?? ''
  }

  applyQuickDefaultsFromQuery()
  createDraftDefaultFingerprint.value = createTradeDraftFingerprint(buildTradeDraftPayload())
  if (!skipDraftRestore) {
    await maybeRestorePersistedTradeDraft(isQuickTradeQueryActive())
  }
  if (!form.instrument_id && form.symbol.trim()) {
    selectInstrumentBySymbol(form.symbol)
  }
  if (!primaryExit.executed_at) {
    ensureDefaultExitLeg()
  }
  draftPersistenceReady.value = true
}

function extractErrorMessage(error: unknown): string {
  return normalizeApiError(error).message
}

function isTradeRevisionConflict(error: unknown): boolean {
  return normalizeApiError(error).isConflict
}

function mapServerFieldName(field: string): string {
  const normalized = field.trim()
  if (normalized === 'pair') return 'instrument_id'
  if (normalized === 'lot_size') return 'position_size'
  if (normalized === 'actual_exit_price') return 'exit_price'
  return normalized
}

function applyServerFieldErrors(normalized: NormalizedError): void {
  if (!normalized.isValidation) {
    serverFieldErrors.value = {}
    return
  }

  const next: Record<string, string[]> = {}
  for (const [field, messages] of Object.entries(normalized.fieldErrors)) {
    const mappedField = mapServerFieldName(field)
    const cleanedMessages = messages
      .map((message) => `${message ?? ''}`.trim())
      .filter((message) => message.length > 0)
    if (cleanedMessages.length > 0) {
      next[mappedField] = cleanedMessages
    }
  }

  serverFieldErrors.value = next
}

function buildPayload(): TradePayload {
  if (!tradeCompleted.value) {
    throw new Error('Trade must be marked complete before saving.')
  }

  const closeDate = parseTradeDateTime(form.date)
  if (closeDate === null) {
    throw new Error('Close date is invalid.')
  }
  const accountId = Number(form.account_id)
  if (!Number.isInteger(accountId) || accountId <= 0) {
    throw new Error('Account is required.')
  }
  const selectedAccount = accounts.value.find((account) => account.id === accountId) ?? null
  if (!selectedAccount) {
    throw new Error('Please select a valid account from the list.')
  }

  let instrument = findInstrumentById(form.instrument_id)
  if (!instrument && form.symbol.trim()) {
    const symbolMatch = instruments.value.find((item) => item.symbol.toUpperCase() === form.symbol.trim().toUpperCase())
    if (symbolMatch) {
      form.instrument_id = String(symbolMatch.id)
      form.symbol = symbolMatch.symbol
      instrument = symbolMatch
    }
  }
  if (!instrument) {
    throw new Error('Please select a valid instrument from the list.')
  }
  if (instrument.quote_currency.toUpperCase() !== 'USD') {
    if (liveFxLoading.value) {
      throw new Error('Fetching FX quote...')
    }
    if (liveFxConversion.value === null) {
      throw new Error(liveFxConversionError.value || `Missing live FX quote to convert ${instrument.quote_currency.toUpperCase()}->USD`)
    }
  }
  const strategyModelId = Number(form.strategy_model_id)
  const setupId = Number(form.setup_id)
  const killzoneId = Number(form.killzone_id)
  if (!Number.isInteger(strategyModelId) || strategyModelId <= 0) {
    throw new Error('Strategy model is required.')
  }
  if (!Number.isInteger(setupId) || setupId <= 0) {
    throw new Error('Setup is required.')
  }
  if (!Number.isInteger(killzoneId) || killzoneId <= 0) {
    throw new Error('Killzone is required.')
  }
  if (!form.session_enum) {
    throw new Error('Session is required.')
  }

  const selectedModel = selectedStrategyModel.value
  const selectedSetupValue = selectedSetup.value
  const sessionLabel = sessionEnumOptions.value.find((option) => option.value === form.session_enum)?.label ?? form.session_enum
  const strategyModelLabel = selectedModel?.name ?? 'General'
  const setupLabel = selectedSetupValue?.name ?? 'Setup'

  const entryExecutedAt = new Date(closeDate).toISOString()
  const legs = [
    {
      leg_type: 'entry' as const,
      price: Number(form.entry_price),
      quantity_lots: Number(form.position_size),
      executed_at: entryExecutedAt,
      fees: 0,
      notes: null,
    },
    {
      leg_type: 'exit' as const,
      price: Number(primaryExit.price),
      quantity_lots: Number(primaryExit.quantity_lots),
      executed_at: new Date(parseTradeDateTime(primaryExit.executed_at) ?? closeDate).toISOString(),
      fees: Number(primaryExit.fees || 0),
      notes: primaryExit.notes.trim() ? primaryExit.notes.trim() : null,
    },
    ...exitLegs.value.map((leg) => {
      const executedAt = parseTradeDateTime(leg.executed_at)
      return {
        leg_type: 'exit' as const,
        price: Number(leg.price),
        quantity_lots: Number(leg.quantity_lots),
        executed_at: new Date(executedAt ?? closeDate).toISOString(),
        fees: Number(leg.fees || 0),
        notes: leg.notes.trim() ? leg.notes.trim() : null,
      }
    }),
  ]

  const exitQuantity = legs
    .filter((leg) => leg.leg_type === 'exit')
    .reduce((sum, leg) => sum + leg.quantity_lots, 0)
  if (exitQuantity <= 0) {
    throw new Error('Exit details are required.')
  }

  const weightedExitPrice = exitQuantity > 0
    ? legs
      .filter((leg) => leg.leg_type === 'exit')
      .reduce((sum, leg) => sum + (leg.price * leg.quantity_lots), 0) / exitQuantity
    : Number(form.entry_price)

  return {
    account_id: selectedAccount.id,
    instrument_id: instrument.id,
    strategy_model_id: strategyModelId,
    setup_id: setupId,
    killzone_id: killzoneId,
    session_enum: form.session_enum,
    tag_ids: form.tag_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
    symbol: instrumentSymbol.value,
    direction: form.direction,
    close_date: new Date(closeDate).toISOString(),
    session: sessionLabel,
    strategy_model: `${strategyModelLabel} - ${setupLabel}`,
    entry_price: Number(form.entry_price),
    stop_loss: Number(form.stop_loss),
    take_profit: Number(form.take_profit),
    actual_exit_price: weightedExitPrice,
    position_size: Number(form.position_size),
    commission: Number(form.commission || 0),
    swap: Number(form.swap || 0),
    spread_cost: Number(form.spread_cost || 0),
    slippage_cost: Number(form.slippage_cost || 0),
    legs,
    followed_rules: derivedFollowedRules.value,
    checklist_responses: checklistItems.value.map((item) => ({
      checklist_item_id: item.id,
      value: item.response.value,
    })),
    checklist_evaluation: {
      status: resolvedChecklistReadiness.value.status,
      ready: resolvedChecklistReadiness.value.ready,
      completed_required: resolvedChecklistReadiness.value.completed_required,
      total_required: resolvedChecklistReadiness.value.total_required,
    },
    checklist_incomplete: checklistGateIncomplete.value,
    emotion: form.emotion,
    notes: form.notes.trim() ? form.notes.trim() : null,
  }
}

function getFxMaterialSignature(value: FxQuoteToUsdResolution | null): string {
  if (!value) return 'none'
  // Only fields that materially affect FX conversion are included.
  return `${value.method}|${value.mode}|${value.symbolUsed ?? 'identity'}|${value.rate.toFixed(8)}`
}

function clearChecklistPreviewTimer() {
  if (!checklistPreviewTimer) return
  clearTimeout(checklistPreviewTimer)
  checklistPreviewTimer = null
}

function resolveEstimatedRiskPercent(): number | null {
  const accountBalance = Number(selectedChecklistAccount.value?.current_balance ?? 0)
  if (!(accountBalance > 0)) return null

  const instrument = selectedInstrument.value
  if (!instrument) return null

  const entry = toNumber(form.entry_price)
  const stopLoss = toNumber(form.stop_loss)
  const lotSize = toNumber(form.position_size)
  if (!(entry > 0) || !(stopLoss > 0) || !(lotSize > 0)) return null

  const stopDistance = Math.abs(entry - stopLoss)
  if (!(stopDistance > 0)) return null

  const tickSize = Number(instrument.tick_size ?? 0)
  const tickValue = Number(instrument.tick_value ?? 0)
  const contractSize = Number(instrument.contract_size ?? 0)
  let riskInQuote = 0

  if (tickSize > 0 && tickValue > 0) {
    riskInQuote = (stopDistance / tickSize) * tickValue * lotSize
  } else if (contractSize > 0) {
    riskInQuote = stopDistance * contractSize * lotSize
  } else {
    riskInQuote = stopDistance * lotSize
  }
  if (!(riskInQuote > 0)) return null

  const quoteCurrency = String(instrument.quote_currency ?? '').toUpperCase()
  const accountCurrency = String(selectedChecklistAccount.value?.currency ?? 'USD').toUpperCase()
  let riskInAccountCurrency = riskInQuote
  if (quoteCurrency !== '' && accountCurrency === 'USD' && quoteCurrency !== 'USD') {
    const rate = Number(liveFxConversion.value?.rate ?? 0)
    if (rate > 0) {
      riskInAccountCurrency = riskInQuote * rate
    } else {
      return null
    }
  }

  if (!(riskInAccountCurrency > 0)) return null
  const percent = (riskInAccountCurrency / accountBalance) * 100
  return Number.isFinite(percent) ? Number(percent.toFixed(4)) : null
}

function resolveEstimatedTargetRMultiple(): number | null {
  const entry = toNumber(form.entry_price)
  const stopLoss = toNumber(form.stop_loss)
  const takeProfit = toNumber(form.take_profit)
  const risk = Math.abs(entry - stopLoss)
  if (!(entry > 0) || !(takeProfit > 0) || !(risk > 0)) return null
  const reward = Math.abs(takeProfit - entry)
  const rMultiple = reward / risk
  if (!Number.isFinite(rMultiple) || rMultiple <= 0) return null
  return Number(rMultiple.toFixed(4))
}

function buildChecklistPrecheckMetrics(): Record<string, unknown> {
  const metrics: Record<string, unknown> = {
    risk_percent: 0,
    r_multiple: 1,
    target_r_multiple: 1,
  }
  const riskPercent = resolveEstimatedRiskPercent()
  if (riskPercent !== null) {
    metrics.risk_percent = riskPercent
  }
  const targetRMultiple = resolveEstimatedTargetRMultiple()
  if (targetRMultiple !== null) {
    metrics.r_multiple = targetRMultiple
    metrics.target_r_multiple = targetRMultiple
  }
  return metrics
}

function refreshDerivedState() {
  clearChecklistPreviewTimer()
  if (!hasChecklist.value) return
  if (checklistLoading.value) return
  if (isChecklistContextMismatch.value) return
  if (checklistExecutionSnapshot.value?.frozen) return

  checklistPreviewTimer = setTimeout(() => {
    void tradeChecklistStore.previewServerReadiness(buildChecklistPrecheckMetrics())
  }, 180)
}

function setImageUploadStatus(
  state: ImageUploadStatus['state'],
  message = '',
  details: string[] = [],
  canRetry = false
) {
  imageUploadStatus.value = createUploadStatus(state, message, details, canRetry)
}

function clearPendingImages() {
  for (const image of pendingImages.value) {
    revokePendingImagePreview(image)
  }
  pendingImages.value = []
  uploadProgressByPendingId.value = {}
  if (imageUploadStatus.value.state !== 'uploading') {
    imageUploadStatus.value = createIdleUploadStatus()
  }
}

function detachPendingImage(id: string): PendingTradeImage | null {
  const index = pendingImages.value.findIndex((image) => image.id === id)
  if (index < 0) return null
  const [removed] = pendingImages.value.splice(index, 1)
  if (!removed) return null
  revokePendingImagePreview(removed)
  uploadProgressByPendingId.value = removeUploadProgressEntry(uploadProgressByPendingId.value, removed.id)
  return removed
}

function removePendingImage(id: string) {
  const removed = detachPendingImage(id)
  if (!removed) return

  if (pendingImages.value.length === 0 && imageUploadStatus.value.canRetry) {
    imageUploadStatus.value = createIdleUploadStatus()
  }
}

async function removeExistingImage(imageId: number) {
  if (!isEditMode.value || tradeId.value === null) return
  if (deletingImageIds.value.includes(imageId)) return

  deletingImageIds.value = [...deletingImageIds.value, imageId]
  try {
    await tradeStore.deleteTradeImage(imageId, { tradeId: tradeId.value ?? undefined })
    existingImages.value = existingImages.value.filter((image) => image.id !== imageId)
  } catch (error) {
    uiStore.toast({
      type: 'error',
      title: 'Failed to delete image',
      message: extractErrorMessage(error),
    })
  } finally {
    deletingImageIds.value = deletingImageIds.value.filter((id) => id !== imageId)
  }
}

function reorderPendingImages(payload: { from: number; to: number }) {
  const { from, to } = payload
  if (from < 0 || to < 0 || from >= pendingImages.value.length || to >= pendingImages.value.length) return
  const items = pendingImages.value.slice()
  const [moved] = items.splice(from, 1)
  if (!moved) return
  items.splice(to, 0, moved)
  pendingImages.value = items
}

async function onSelectImageFiles(files: File[]) {
  if (files.length === 0) return

  setImageUploadStatus('validating', 'Validating screenshots...')

  const result = await preparePendingImages(files, {
    entityLabel: 'trade',
    currentCount: totalImageCount.value,
    currentTotalBytes: totalImageSize.value,
    maxFiles: MAX_IMAGE_COUNT,
    maxFileBytes: MAX_IMAGE_SIZE_BYTES,
    maxTotalBytes: MAX_TOTAL_IMAGE_BYTES,
    allowedTypes: DEFAULT_ALLOWED_IMAGE_TYPES,
    buildPendingImage: ({ file, previewUrl }) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      preview_url: previewUrl,
      context_tag: 'entry',
      timeframe: '',
      annotation_notes: '',
    }),
  })

  if (result.accepted.length > 0) {
    pendingImages.value = [...pendingImages.value, ...result.accepted]
  }

  if (result.errors.length > 0) {
    setImageUploadStatus('error', result.errors[0] ?? 'Some screenshots could not be added.', result.errors)
    return
  }

  const count = result.accepted.length
  setImageUploadStatus(
    'success',
    `${count} screenshot${count === 1 ? '' : 's'} ready to upload.`
  )
}

async function uploadPendingImages(tradeId: number) {
  if (pendingImages.value.length === 0) return
  const initialCount = pendingImages.value.length
  let uploadedCount = 0
  setImageUploadStatus(
    'uploading',
    `Uploading ${initialCount} screenshot${initialCount === 1 ? '' : 's'}...`
  )

  try {
    while (pendingImages.value.length > 0) {
      const image = pendingImages.value[0]!
      uploadProgressByPendingId.value = {
        ...uploadProgressByPendingId.value,
        [image.id]: 0,
      }

      const uploaded = await tradeStore.uploadTradeImage(
        tradeId,
        image.file,
        existingImages.value.length,
        {
          context_tag: image.context_tag,
          timeframe: image.timeframe || null,
          annotation_notes: image.annotation_notes || null,
        },
        (progress) => {
          uploadProgressByPendingId.value = {
            ...uploadProgressByPendingId.value,
            [image.id]: progress,
          }
        }
      )

      existingImages.value = [...existingImages.value, uploaded]
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      uploadedCount += 1
      detachPendingImage(image.id)
    }

    setImageUploadStatus(
      'success',
      `Uploaded ${uploadedCount} screenshot${uploadedCount === 1 ? '' : 's'}.`
    )
  } catch (error) {
    const details = uploadedCount > 0
      ? [`${uploadedCount} screenshot${uploadedCount === 1 ? '' : 's'} already uploaded. Retry the remaining files.`]
      : []
    setImageUploadStatus('error', extractErrorMessage(error), details, pendingImages.value.length > 0)
    throw error
  }
}

function buildPsychologyPayload() {
  return {
    pre_emotion: psychology.pre_emotion.trim() || null,
    post_emotion: psychology.post_emotion.trim() || null,
    confidence_score: psychology.confidence_score,
    stress_score: psychology.stress_score,
    sleep_hours: psychology.sleep_hours,
    impulse_flag: psychology.impulse_flag,
    fomo_flag: psychology.fomo_flag,
    revenge_flag: psychology.revenge_flag,
    notes: psychology.notes.trim() ? psychology.notes.trim() : null,
  }
}

function clearPostSaveQueue() {
  postSaveQueue.pendingPsychology = false
  postSaveQueue.pendingImages = false
  postSaveQueue.lastSavedTradeId = null
}

function markPostSaveQueuePending() {
  postSaveQueue.pendingPsychology = true
  postSaveQueue.pendingImages = pendingImages.value.length > 0
}

async function runPostSaveStages(tradeId: number) {
  if (postSaveQueue.pendingPsychology) {
    await tradeStore.upsertTradePsychology(tradeId, buildPsychologyPayload())
    postSaveQueue.pendingPsychology = false
  }

  if (postSaveQueue.pendingImages) {
    if (pendingImages.value.length === 0) {
      postSaveQueue.pendingImages = false
      return
    }

    await uploadPendingImages(tradeId)
    postSaveQueue.pendingImages = false
  }
}

async function refreshLoadedTradeSnapshot(tradeId: number): Promise<string | null> {
  try {
    const latest = await tradeStore.fetchTradeDetails(tradeId)
    return normalizeUpdatedAt(latest.trade.updated_at)
  } catch {
    return null
  }
}

async function retryPostSave() {
  const tradeIdToResume = postSaveQueue.lastSavedTradeId
  if (tradeIdToResume === null || !hasPendingPostSave.value) return

  try {
    await runPostSaveStages(tradeIdToResume)
    clearPostSaveQueue()
    serverFieldErrors.value = {}
    uiStore.toast({
      type: 'success',
      title: 'Post-save sync completed',
      message: 'Psychology and image uploads have been completed.',
    })
    if (isEditMode.value && tradeId.value === tradeIdToResume) {
      loadedTradeUpdatedAt.value = await refreshLoadedTradeSnapshot(tradeIdToResume)
    }
    tradeChecklistStore.clearSubmitAttempted()
    void router.push('/trades')
  } catch (error) {
    const normalized = normalizeApiError(error)
    applyServerFieldErrors(normalized)
    uiStore.toast({
      type: 'info',
      title: 'Trade saved partially',
      message: `Trade #${tradeIdToResume} is already saved. Retry post-save to finish psychology/images.`,
    })
  }
}

function retryImageUploads() {
  void retryPostSave()
}

function setupEditLock() {
  if (!isEditMode.value || tradeId.value === null) {
    editLockState.value = null
    return
  }

  if (releaseEditLockSubscription) {
    releaseEditLockSubscription()
    releaseEditLockSubscription = null
  }
  if (editLockHandle) {
    editLockHandle.stop()
    editLockHandle = null
  }

  editLockHandle = createTradeEditLock(tradeId.value)
  releaseEditLockSubscription = editLockHandle.subscribe((next) => {
    editLockState.value = next
  })
  editLockHandle.start()
}

function teardownEditLock() {
  if (releaseEditLockSubscription) {
    releaseEditLockSubscription()
    releaseEditLockSubscription = null
  }
  if (editLockHandle) {
    editLockHandle.stop()
    editLockHandle = null
  }
  editLockState.value = null
}

function takeOverEditLock() {
  if (!editLockHandle) return
  const approved = typeof window === 'undefined'
    ? true
    : window.confirm('Take over edit lock from the other tab?')
  if (!approved) return

  const acquired = editLockHandle.takeOver()
  if (acquired) {
    uiStore.toast({
      type: 'success',
      title: 'Edit lock acquired',
      message: 'This tab now controls saving for this trade.',
    })
    return
  }

  uiStore.toast({
    type: 'error',
    title: 'Could not take over lock',
    message: 'Try again in a moment.',
  })
}

function normalizeUpdatedAt(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Date.parse(trimmed)
  if (!Number.isFinite(parsed)) return null
  return new Date(parsed).toISOString()
}

function formatUpdatedAtForBanner(value: string): string {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return value
  return new Date(parsed).toLocaleString()
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ')
  return String(value)
}

function pushDiff(
  diffs: Array<{ field: string; local: string; latest: string }>,
  field: string,
  localValue: unknown,
  latestValue: unknown
) {
  const local = stringValue(localValue).trim()
  const latest = stringValue(latestValue).trim()
  if (local === latest) return
  diffs.push({
    field,
    local: local || '-',
    latest: latest || '-',
  })
}

function staleWriteDiffs(payload: TradePayload, latestTrade: Trade): Array<{ field: string; local: string; latest: string }> {
  const diffs: Array<{ field: string; local: string; latest: string }> = []
  pushDiff(diffs, 'Account', payload.account_id, latestTrade.account_id)
  pushDiff(diffs, 'Symbol', payload.symbol.toUpperCase(), latestTrade.pair)
  pushDiff(diffs, 'Direction', payload.direction, latestTrade.direction)
  pushDiff(diffs, 'Entry Price', payload.entry_price, latestTrade.entry_price)
  pushDiff(diffs, 'Stop Loss', payload.stop_loss, latestTrade.stop_loss)
  pushDiff(diffs, 'Take Profit', payload.take_profit, latestTrade.take_profit)
  pushDiff(diffs, 'Exit Price', payload.actual_exit_price, latestTrade.actual_exit_price)
  pushDiff(diffs, 'Position Size', payload.position_size, latestTrade.lot_size)
  pushDiff(diffs, 'Close Date', payload.close_date, latestTrade.date)
  pushDiff(diffs, 'Emotion', payload.emotion, latestTrade.emotion)
  pushDiff(diffs, 'Followed Rules', payload.followed_rules, latestTrade.followed_rules)
  pushDiff(
    diffs,
    'Tags',
    [...(payload.tag_ids ?? [])].sort((a, b) => a - b).join(','),
    [...(latestTrade.tag_ids ?? [])].sort((a, b) => a - b).join(',')
  )
  pushDiff(diffs, 'Notes', payload.notes ?? '', latestTrade.notes ?? '')
  return diffs
}

function clearStaleWriteWarning() {
  staleWriteWarning.value = null
  staleWriteConfirmedFingerprint.value = null
}

async function verifyStaleWriteBeforeSave(payload: TradePayload): Promise<boolean> {
  if (!isEditMode.value || tradeId.value === null) return true
  const baselineUpdatedAt = normalizeUpdatedAt(loadedTradeUpdatedAt.value)
  if (!baselineUpdatedAt) return true

  let latestTrade: Trade | null = null
  const snapshot = tradeStore.trades.find((row) => row.id === tradeId.value) ?? null
  const snapshotUpdatedAt = normalizeUpdatedAt(snapshot?.updated_at)
  if (snapshot && snapshotUpdatedAt && snapshotUpdatedAt !== baselineUpdatedAt) {
    latestTrade = snapshot
  }

  if (!latestTrade) {
    staleWriteCheckInProgress.value = true
    try {
      const latest = await tradeStore.fetchTradeDetails(tradeId.value)
      latestTrade = latest.trade
    } catch {
      staleWriteCheckInProgress.value = false
      return true
    } finally {
      staleWriteCheckInProgress.value = false
    }
  }

  const latestUpdatedAt = normalizeUpdatedAt(latestTrade.updated_at)
  if (!latestUpdatedAt || latestUpdatedAt === baselineUpdatedAt) {
    clearStaleWriteWarning()
    return true
  }

  const fingerprint = `${baselineUpdatedAt}|${latestUpdatedAt}`
  staleWriteWarning.value = {
    fingerprint,
    loaded_updated_at: baselineUpdatedAt,
    latest_updated_at: latestUpdatedAt,
    diffs: staleWriteDiffs(payload, latestTrade),
  }

  if (staleWriteConfirmedFingerprint.value === fingerprint) {
    return true
  }

  uiStore.toast({
    type: 'info',
    title: 'Trade was updated elsewhere',
    message: 'Review differences and confirm overwrite before saving.',
  })
  return false
}

function confirmStaleOverwriteAndSave() {
  if (!staleWriteWarning.value) return
  staleWriteConfirmedFingerprint.value = staleWriteWarning.value.fingerprint
  void submitForm()
}

async function reloadTradeFromLatest() {
  if (!isEditMode.value || tradeId.value === null) return
  const approved = typeof window === 'undefined'
    ? true
    : window.confirm('Reload latest server trade data? Unsaved changes and pending images will be discarded.')
  if (!approved) return

  clearPendingImages()
  clearStaleWriteWarning()
  await hydrateTradeRouteState()
}

function handleGlobalHotkeys(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  if (!(event.ctrlKey || event.metaKey)) return

  if (key === 's') {
    event.preventDefault()
    handleExecuteClick()
  }
}

function runSyncQueueNow() {
  void syncStatusStore.syncQueueNow()
}

async function submitForm() {
  editLockHandle?.refresh()
  if (isEditMode.value && isLockedByOtherTab.value) {
    uiStore.toast({
      type: 'error',
      title: 'Edit locked by another tab',
      message: 'Use "Take over" before saving from this tab.',
    })
    return
  }

  submitAttempted.value = true
  serverFieldErrors.value = {}
  tradeChecklistStore.markSubmitAttempted(true)
  const firstError = Object.values(formErrors.value)[0]
  if (firstError) {
    return
  }

  if (isSaveBlocked.value) {
    return
  }

  if (isChecklistContextMismatch.value) {
    uiStore.toast({
      type: 'info',
      title: 'Rules refreshing',
      message: 'Waiting for rule context to match selected account and strategy.',
    })
    return
  }

  if (isChecklistStrictBlocked.value) {
    uiStore.toast({
      type: 'error',
      title: 'Blocked by strict rules',
      message: checklistReadiness.value.missing_required[0]?.reason
        || 'Checklist is not ready yet.',
    })
    return
  }

  try {
    const payload = buildPayload()
    const staleSafe = await verifyStaleWriteBeforeSave(payload)
    if (!staleSafe) {
      return
    }

    const hadPendingImages = pendingImages.value.length > 0
    let savedTradeId: number
    let savedTradeUpdatedAt: string | null = null
    let savedTradeSyncStatus: string | null = null

    if (isEditMode.value && tradeId.value !== null) {
      const savedTrade = await tradeStore.updateTrade(tradeId.value, payload)
      savedTradeId = savedTrade.id
      savedTradeUpdatedAt = normalizeUpdatedAt(savedTrade.updated_at)
      savedTradeSyncStatus = savedTrade.local_sync_status ?? 'synced'
      postSaveQueue.lastSavedTradeId = savedTradeId
      markPostSaveQueuePending()
    } else {
      if (postSaveQueue.lastSavedTradeId !== null) {
        savedTradeId = postSaveQueue.lastSavedTradeId
      } else {
        const savedTrade = await tradeStore.addTrade(payload)
        savedTradeId = savedTrade.id
        savedTradeUpdatedAt = normalizeUpdatedAt(savedTrade.updated_at)
        savedTradeSyncStatus = savedTrade.local_sync_status ?? 'synced'
        postSaveQueue.lastSavedTradeId = savedTradeId
      }
      markPostSaveQueuePending()
    }

    await runPostSaveStages(savedTradeId)

    if (isEditMode.value) {
      savedTradeUpdatedAt = await refreshLoadedTradeSnapshot(savedTradeId) ?? savedTradeUpdatedAt
    }

    if (savedTradeUpdatedAt !== null) {
      loadedTradeUpdatedAt.value = savedTradeUpdatedAt
    }
    clearPostSaveQueue()
    clearStaleWriteWarning()
    serverFieldErrors.value = {}
    if (!isEditMode.value) {
      await clearPersistedTradeDraftState()
    }

    uiStore.toast({
      type: savedTradeSyncStatus === 'synced' ? 'success' : 'info',
      title: savedTradeSyncStatus === 'synced'
        ? (isEditMode.value ? 'Execution updated' : 'Execution logged')
        : 'Saved as offline draft',
      message: savedTradeSyncStatus === 'synced'
        ? (
          hadPendingImages
            ? `${payload.symbol} saved with images.`
            : `${payload.symbol} has been saved to your execution journal.`
        )
        : `${payload.symbol} is stored locally on this device and will sync when connectivity is stable.`,
    })

    tradeChecklistStore.clearSubmitAttempted()
    void router.push('/trades')
  } catch (error) {
    const normalized = normalizeApiError(error)
    applyServerFieldErrors(normalized)

    if (postSaveQueue.lastSavedTradeId !== null && hasPendingPostSave.value) {
      uiStore.toast({
        type: 'info',
        title: isEditMode.value ? 'Execution updated partially' : 'Trade saved partially',
        message: `Trade #${postSaveQueue.lastSavedTradeId} is saved. Retry post-save to finish psychology/images.`,
      })
      return
    }

    if (isTradeRevisionConflict(error) && isEditMode.value && tradeId.value !== null) {
      clearPendingImages()
      await hydrateTradeRouteState()
      uiStore.toast({
        type: 'info',
        title: 'Trade updated elsewhere',
        message: 'This trade was updated elsewhere. Reloaded latest version.',
      })
      return
    }

    uiStore.toast({
      type: 'error',
      title: 'Failed to save execution',
      message: normalized.message,
    })
  }
}

function handleExecuteClick() {
  if (isSubmittingDisabled.value) return
  if (!isEditMode.value && hasPendingPostSave.value) {
    void retryPostSave()
    return
  }
  void submitForm()
}

async function loadTradeIfNeeded() {
  const requestedTradeId = tradeId.value
  const requestId = ++tradeHydrationRequestId
  refreshDraftPersistencePreference()
  draftPersistenceReady.value = false
  clearDraftPersistenceTimer()

  if (requestedTradeId === null) {
    loadingTrade.value = false
    await applyCreateDefaultsForCurrentRoute()
    return
  }

  tradeCompleted.value = true
  loadingTrade.value = true
  existingImages.value = []
  deletingImageIds.value = []
  clearPostSaveQueue()
  clearStaleWriteWarning()
  serverFieldErrors.value = {}
  try {
    const data = await tradeStore.fetchTradeDetails(requestedTradeId)
    if (!shouldApplyTradeHydration(requestedTradeId, tradeId.value, requestId, tradeHydrationRequestId)) {
      return
    }
    loadedTradeUpdatedAt.value = normalizeUpdatedAt(data.trade.updated_at)
    clearStaleWriteWarning()
    serverFieldErrors.value = {}
    setFormFromTrade(data.trade, data.legs ?? [], data.psychology ?? null)
    clearPostSaveQueue()
    existingImages.value = (data.images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
  } catch {
    if (!shouldApplyTradeHydration(requestedTradeId, tradeId.value, requestId, tradeHydrationRequestId)) {
      return
    }
    uiStore.toast({
      type: 'error',
      title: 'Execution not found',
      message: 'Could not load this execution for editing.',
    })
    void router.push('/trades')
  } finally {
    if (shouldApplyTradeHydration(requestedTradeId, tradeId.value, requestId, tradeHydrationRequestId)) {
      loadingTrade.value = false
    }
  }
}

async function loadChecklistState() {
  tradeChecklistStore.clearSubmitAttempted()
  await tradeChecklistStore.loadForContext(
    selectedChecklistAccountId.value,
    selectedChecklistStrategyModelId.value,
    selectedChecklistTradeId.value
  )
  if (!isEditMode.value) {
    tradeChecklistStore.hydratePassingDefaults()
  }
  refreshDerivedState()
}

async function hydrateTradeRouteState() {
  setupEditLock()
  await loadTradeIfNeeded()
  await loadChecklistState()
  refreshDerivedState()
}

function onChecklistResponseChange(itemId: number, value: unknown) {
  tradeChecklistStore.updateResponse(itemId, value, false)
  refreshDerivedState()
}

function onChecklistEvaluationChange(_: { failedRequiredIds: number[]; firstFailingId: number | null }) {
}

onMounted(async () => {
  window.addEventListener('keydown', handleGlobalHotkeys)
  refreshDraftPersistencePreference()

  try {
    await Promise.all([
      accountStore.fetchAccounts(),
      tradeStore.fetchInstruments(),
      tradeStore.fetchFxRates(),
      tradeStore.fetchDictionaries(),
    ])
  } catch {
    uiStore.toast({
      type: 'error',
      title: 'Failed to load setup data',
      message: 'Please refresh and try again.',
    })
  }

  await hydrateTradeRouteState()
})

watch(
  () => tradeId.value,
  (next, previous) => {
    if (next === previous) return
    void hydrateTradeRouteState()
  }
)

watch(
  () => [form.account_id, form.strategy_model_id],
  ([accountId, strategyModelId], [previousAccountId, previousStrategyModelId]) => {
    if (accountId === previousAccountId && strategyModelId === previousStrategyModelId) return
    void loadChecklistState()
  }
)

watch(
  () => selectedInstrument.value?.quote_currency ?? '',
  (quoteCurrency) => {
    for (const unsubscribe of unsubscribeFxListeners) {
      unsubscribe()
    }
    unsubscribeFxListeners = []
    if (stopTrackingFxSymbols) {
      stopTrackingFxSymbols()
      stopTrackingFxSymbols = null
    }

    const symbols = fxResolver.getTrackedSymbolsForQuoteCurrency(quoteCurrency)
    if (symbols.length === 0) {
      quoteTickVersion.value += 1
      void refreshLiveFxConversion()
      return
    }

    stopTrackingFxSymbols = livePriceFeedService.trackSymbols(symbols)
    unsubscribeFxListeners = symbols.map((symbol) =>
      livePriceFeedService.subscribe(symbol, () => {
        quoteTickVersion.value += 1
      })
    )
    quoteTickVersion.value += 1
    void refreshLiveFxConversion()
    refreshDerivedState()
  },
  { immediate: true }
)

watch(
  () => quoteTickVersion.value,
  () => {
    void refreshLiveFxConversion()
  }
)

watch(
  () => form.instrument_id,
  (value) => {
    const id = Number(value)
    const instrument = instruments.value.find((item) => item.id === id)
    if (instrument) {
      form.symbol = instrument.symbol
      if (toNumber(form.position_size) < toNumber(instrument.min_lot)) {
        form.position_size = toNumber(instrument.min_lot)
      }
    }
    void refreshLiveFxConversion()
    refreshDerivedState()
  }
)

watch(
  () => form.killzone_id,
  (value) => {
    const id = Number(value)
    const match = killzones.value.find((item) => item.id === id)
    if (match?.session_enum) {
      form.session_enum = match.session_enum
    }
    refreshDerivedState()
  }
)

watch(
  () => [
    form.account_id,
    form.strategy_model_id,
    form.setup_id,
    form.killzone_id,
    form.session_enum,
    form.direction,
    form.date,
    form.entry_price,
    form.stop_loss,
    form.take_profit,
    form.position_size,
    form.commission,
    form.swap,
    form.spread_cost,
    form.slippage_cost,
    tradeCompleted.value,
    primaryExit.price,
    primaryExit.quantity_lots,
    primaryExit.executed_at,
    primaryExit.fees,
  ],
  () => {
    refreshDerivedState()
  }
)

watch(
  exitLegs,
  () => {
    refreshDerivedState()
  },
  { deep: true }
)

watch(
  () => form.tag_ids.slice(),
  () => {
    refreshDerivedState()
  }
)

watch(
  () => tradeDraftFingerprint.value,
  () => {
    scheduleTradeDraftPersistence()
  }
)

watch(
  () => browserOnline.value,
  () => {
    refreshDraftPersistencePreference()
  }
)

onBeforeUnmount(() => {
  if (!isEditMode.value && draftPersistenceEnabled.value && hasMeaningfulDraftChanges.value) {
    void persistTradeDraftNow()
  }
  clearDraftPersistenceTimer()
  window.removeEventListener('keydown', handleGlobalHotkeys)
  teardownEditLock()
  clearChecklistPreviewTimer()
  clearPendingImages()
  tradeChecklistStore.resetState()
  for (const unsubscribe of unsubscribeFxListeners) {
    unsubscribe()
  }
  unsubscribeFxListeners = []
  if (stopTrackingFxSymbols) {
    stopTrackingFxSymbols()
    stopTrackingFxSymbols = null
  }
})

</script>

<template>
  <div class="space-y-4 trade-form-minimal execution-long-page" data-testid="trade-form-page">
    <GlassPanel class="form-shell-panel execution-long-shell form-shell-unified">
      <div v-if="loadingTrade" class="space-y-3">
        <div class="skeleton-shimmer h-12 rounded-xl" />
        <div class="skeleton-shimmer h-12 rounded-xl" />
        <div class="skeleton-shimmer h-12 rounded-xl" />
      </div>

      <div v-else class="trade-form-with-checklist">
        <form :id="tradeFormId" class="form-block space-y-4 trade-form-main" @submit.prevent="handleExecuteClick">
        <div class="execution-long-header">
          <div>
            <h2 class="section-title">{{ pageTitle }}</h2>
            <p class="section-note">
              Minimal form for fast execution logging.
            </p>
          </div>
          <button type="button" class="btn btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm" @click="router.push('/trades')">
            <ArrowLeft class="h-4 w-4" />
            Back
          </button>
        </div>

        <div v-if="showTradeDraftBanner" class="panel p-3 text-sm">
          <p class="font-semibold">{{ tradeDraftBannerTitle }}</p>
          <p class="mt-1">{{ tradeDraftBannerMessage }}</p>
          <p class="mt-2 text-[var(--muted)]">{{ tradeDraftStatusMessage }}</p>
          <p v-if="lastSyncError" class="field-error-text mt-2">{{ lastSyncError }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-if="canRestorePersistedDraft"
              type="button"
              class="btn btn-secondary px-3 py-1.5 text-sm"
              @click="restorePersistedTradeDraftManually"
            >
              Restore local draft
            </button>
            <button
              v-if="hasPersistedTradeDraft && draftPersistenceEnabled"
              type="button"
              class="btn btn-ghost px-3 py-1.5 text-sm"
              @click="discardPersistedTradeDraft"
            >
              Discard local draft
            </button>
            <button
              v-if="browserOnline !== false && (isFallbackMode || pendingQueueCount > 0)"
              type="button"
              class="btn btn-ghost px-3 py-1.5 text-sm"
              :disabled="syncing"
              @click="runSyncQueueNow"
            >
              {{ syncing ? 'Syncing queue...' : 'Sync queued drafts' }}
            </button>
          </div>
        </div>

        <p v-if="blockedSummary" class="field-error-text">{{ blockedSummary }}</p>
        <div v-if="isLockedByOtherTab" class="panel p-3 text-sm risk-unverified-banner">
          <p class="font-semibold">Edit lock active in {{ lockHolderLabel }}</p>
          <p class="mt-1">
            Another tab currently owns this trade edit session. Saving is blocked in this tab until you take over.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="btn btn-secondary px-3 py-1.5 text-sm" @click="takeOverEditLock">
              Take over
            </button>
            <button type="button" class="btn btn-ghost px-3 py-1.5 text-sm" @click="void loadTradeIfNeeded()">
              Refresh
            </button>
          </div>
        </div>

        <div v-if="staleWriteWarning" class="panel p-3 text-sm">
          <p class="font-semibold">Stale write warning</p>
          <p class="mt-1">
            This trade changed after you loaded the edit form.
            Loaded: <strong>{{ formatUpdatedAtForBanner(staleWriteWarning.loaded_updated_at) }}</strong> ·
            Latest: <strong>{{ formatUpdatedAtForBanner(staleWriteWarning.latest_updated_at) }}</strong>
          </p>
          <ul v-if="staleWriteWarning.diffs.length > 0" class="mt-2 list-disc pl-5">
            <li v-for="diff in staleWriteWarning.diffs" :key="diff.field">
              {{ diff.field }}: current form <strong>{{ diff.local }}</strong> vs latest <strong>{{ diff.latest }}</strong>
            </li>
          </ul>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="btn btn-secondary px-3 py-1.5 text-sm" @click="confirmStaleOverwriteAndSave">
              Confirm overwrite and save
            </button>
            <button type="button" class="btn btn-ghost px-3 py-1.5 text-sm" @click="void reloadTradeFromLatest()">
              Reload latest
            </button>
          </div>
        </div>

        <section class="trade-form-section execution-long-section">
          <div class="execution-section-heading">
            <TrendingUp class="execution-section-icon h-5 w-5" />
            <p class="section-title">Entry Details</p>
          </div>

          <div class="grid grid-premium md:grid-cols-2 execution-entry-grid" @keydown.enter="onQuickTicketEnter">
            <InstrumentPairSelect
              v-model="form.instrument_id"
              label="Instrument / Pair"
              required
              :instruments="instruments"
              :error="fieldError('instrument_id')"
            />
            <BaseSelect
              v-model="form.account_id"
              label="Accounts"
              required
              searchable
              search-placeholder="Search account..."
              :options="accountSelectOptions"
              :error="fieldError('account_id')"
            />
            <BaseInput
              v-model="form.position_size"
              label="Position Size (Units)"
              type="number"
              required
              min="0.0001"
              step="0.0001"
              :error="fieldError('position_size')"
              @blur="formatLotField('position_size')"
            />
            <BaseSelect v-model="form.direction" label="Trade Type" :options="directionOptions" />
            <BaseDateTime
              v-model="form.date"
              label="Date & Entry Time"
              required
              :max="closeDateMax"
              :error="fieldError('date')"
            />
            <div class="execution-tag-panel">
              <p class="kicker-label">Tags</p>
              <BaseInput
                v-model="form.tag_search"
                class="mt-2 execution-tag-search"
                label="Search Tags"
                placeholder="Type to search tags..."
              />
              <div v-if="filteredTagOptions.length > 0" class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="tag in filteredTagOptions.slice(0, 10)"
                  :key="`tag-option-${tag.id}`"
                  type="button"
                  class="chip-btn"
                  @click="addTag(tag.id)"
                >
                  + {{ tag.name }}
                </button>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <span v-for="tag in selectedTags" :key="`selected-tag-${tag.id}`" class="pill pill-positive inline-flex items-center gap-1">
                  {{ tag.name }}
                  <button type="button" class="btn btn-ghost p-0 text-xs" @click="removeTag(tag.id)">x</button>
                </span>
              </div>
            </div>
            <BaseInput
              v-model="form.entry_price"
              label="Entry Price"
              type="number"
              required
              min="0.000001"
              step="0.000001"
              :error="fieldError('entry_price')"
              @blur="formatPriceField('entry_price')"
            />
            <BaseInput
              v-model="form.stop_loss"
              label="Stop Loss"
              type="number"
              required
              min="0.000001"
              step="0.000001"
              :error="fieldError('stop_loss')"
              @blur="formatPriceField('stop_loss')"
            />
            <BaseInput
              v-model="form.take_profit"
              label="Take Profit"
              type="number"
              required
              min="0.000001"
              step="0.000001"
              :error="fieldError('take_profit')"
              @blur="formatPriceField('take_profit')"
            />
            <BaseSelect
              v-model="form.strategy_model_id"
              label="Strategy"
              required
              searchable
              search-placeholder="Search strategy..."
              :options="strategyModelOptions"
              :error="fieldError('strategy_model_id')"
            />
            <BaseSelect
              v-model="form.setup_id"
              label="Setup"
              required
              searchable
              search-placeholder="Search setup..."
              :options="setupOptions"
              :error="fieldError('setup_id')"
            />
            <BaseSelect
              v-model="form.killzone_id"
              label="Killzone"
              required
              searchable
              search-placeholder="Search killzone..."
              :options="killzoneOptions"
              :error="fieldError('killzone_id')"
            />
            <BaseSelect
              v-model="form.session_enum"
              label="Session"
              required
              :options="sessionEnumOptions"
              :error="fieldError('session_enum')"
            />
          </div>
        </section>

        <TradeRulesPanel
          mode="mobile"
          :checklist="activeChecklist"
          :required-items="checklistRequiredItems"
          :optional-items="checklistOptionalItems"
          :archived-responses="checklistArchivedResponses"
          :readiness="checklistReadiness"
          :server-readiness="checklistServerReadiness"
          :server-readiness-mismatch="checklistServerReadinessMismatch"
          :server-readiness-reasons="checklistServerReadinessReasons"
          :execution-snapshot="checklistExecutionSnapshot"
          :loading="checklistLoading"
          :saving="checklistSaving"
          :submit-attempted="checklistSubmitAttempted || submitAttempted"
          :strict-mode="checklistStrictMode"
          @update-response="onChecklistResponseChange"
          @evaluation-change="onChecklistEvaluationChange"
        />

        <section class="trade-form-section execution-long-section">
          <div class="execution-section-heading">
            <DollarSign class="execution-section-icon h-5 w-5" />
            <p class="section-title">Exit Details</p>
          </div>

          <button
            type="button"
            class="execution-complete-toggle"
            :class="{ 'is-on': tradeCompleted }"
            :aria-pressed="tradeCompleted"
            @click="tradeCompleted = !tradeCompleted"
          >
            <span class="execution-complete-toggle-icon" aria-hidden="true">
              <Check class="h-3.5 w-3.5" />
            </span>
            <span>Trade is completed</span>
          </button>
          <p v-if="fieldError('trade_completed')" class="field-error-text mt-2">{{ fieldError('trade_completed') }}</p>

          <div v-if="tradeCompleted" class="execution-exit-stack">
            <article class="panel execution-partial-card">
              <div class="execution-partial-head">
                <p class="text-sm font-semibold">Main Exit</p>
              </div>
              <div class="grid grid-premium md:grid-cols-2 xl:grid-cols-4">
                <BaseInput
                  v-model="primaryExit.price"
                  label="Exit Price"
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  :error="fieldError('exit_price')"
                />
                <BaseInput
                  v-model="primaryExit.quantity_lots"
                  label="Exit Size"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  :error="fieldError('exit_quantity')"
                />
                <BaseInput
                  v-model="primaryExit.fees"
                  label="Commission Fee"
                  type="number"
                  step="0.01"
                />
                <BaseInput
                  :model-value="estimateLegPnlLabel(primaryExit)"
                  label="P&L"
                  disabled
                />
                <BaseDateTime
                  v-model="primaryExit.executed_at"
                  label="Exit Date & Time"
                  :max="closeDateMax"
                  :show-quick-actions="false"
                  :error="fieldError('exit_time')"
                />
                <BaseInput
                  v-model="primaryExit.notes"
                  class="execution-exit-note"
                  label="Exit Note"
                  multiline
                  :rows="2"
                  placeholder="Optional note..."
                />
              </div>
            </article>

            <div class="execution-exit-actions">
              <p class="kicker-label m-0">Partial Exits (Optional)</p>
              <button type="button" class="btn btn-ghost px-3 py-1.5 text-xs" @click="addExitLeg">
                Add Partial Exit
              </button>
            </div>
            <p v-if="fieldError('legs')" class="field-error-text">{{ fieldError('legs') }}</p>

            <article v-for="(leg, index) in exitLegs" :key="leg.id" class="panel execution-partial-card">
              <div class="execution-partial-head">
                <p class="text-sm font-semibold">Partial Exit #{{ index + 1 }}</p>
                <button
                  type="button"
                  class="btn btn-ghost px-2 py-1 text-xs"
                  @click="removeExitLeg(leg.id)"
                >
                  Remove
                </button>
              </div>
              <div class="grid grid-premium md:grid-cols-2 xl:grid-cols-4">
                <BaseInput
                  v-model="leg.price"
                  label="Exit Price"
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  :error="fieldError(`legs.${index}.price`)"
                />
                <BaseInput
                  v-model="leg.quantity_lots"
                  label="Exit Size"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  :error="fieldError(`legs.${index}.quantity_lots`)"
                />
                <BaseInput
                  v-model="leg.fees"
                  label="Commission Fee"
                  type="number"
                  step="0.01"
                />
                <BaseInput
                  :model-value="estimateLegPnlLabel(leg)"
                  label="P&L"
                  disabled
                />
                <BaseDateTime
                  v-model="leg.executed_at"
                  label="Exit Date & Time"
                  :max="closeDateMax"
                  :show-quick-actions="false"
                  :error="fieldError(`legs.${index}.executed_at`)"
                />
                <BaseInput
                  v-model="leg.notes"
                  class="execution-exit-note"
                  label="Exit Note"
                  multiline
                  :rows="2"
                  placeholder="Optional note..."
                />
              </div>
            </article>

            <div class="execution-exit-summary">
              <p>Total Exit Size: <strong>{{ exitLegSummary.quantity.toFixed(4) }}</strong></p>
              <p>Average Exit Price: <strong>{{ exitLegSummary.weightedPrice.toFixed(6) }}</strong></p>
              <p>Total Exit Fees: <strong>{{ asCurrency(exitLegSummary.fees) }}</strong></p>
            </div>
          </div>
        </section>

        <section class="trade-form-section execution-long-section">
          <p class="trade-section-title">FX Conversion</p>
          <p v-if="isFxPending" class="text-xs muted">Fetching FX quote...</p>
          <p v-if="liveFxConversionError" class="field-error-text">{{ liveFxConversionError }}</p>
          <details v-if="liveFxConversionError && liveFxAttemptedSymbols.length > 0" class="mt-1 text-xs muted">
            <summary>Tried symbols</summary>
            <p class="mt-1">{{ liveFxAttemptedSymbols.join(', ') }}</p>
          </details>
          <div v-if="liveFxConversion && !liveFxConversionError" class="panel p-3 text-sm">
            <div class="grid grid-cols-2 gap-2 text-xs">
              <p>Pair: <strong>{{ selectedInstrument?.quote_currency ?? '-' }}->USD</strong></p>
              <p>Rate: <strong>{{ liveFxConversion.rate.toFixed(6) }}</strong></p>
              <p>
                Source:
                <strong>
                  {{
                    isFxPending
                      ? 'Fetching quote...'
                      : liveFxConversion
                        ? `${selectedInstrument?.quote_currency ?? ''}->USD via ${liveFxConversion.symbolUsed ?? 'identity'} (${liveFxConversion.method}) @ ${liveFxConversion.rate.toFixed(6)} (${liveFxConversion.mode})`
                        : (selectedInstrument?.quote_currency?.toUpperCase() === 'USD' ? 'USD->USD @ 1 (identity)' : '-')
                  }}
                </strong>
              </p>
            </div>
          </div>
        </section>

        <section class="trade-form-section execution-long-section">
          <p class="trade-section-title">Notes</p>
          <BaseInput
            v-model="form.notes"
            label="Execution Notes"
            multiline
            :rows="3"
            placeholder="Context, setup quality, execution notes..."
          />
        </section>

        <TradeImageUploader
          title="Screenshots (Optional)"
          :existing-images="existingImages"
          :pending-images="pendingImages"
          :offline-warning="isFallbackMode"
          :max-files="MAX_IMAGE_COUNT"
          :uploading="uploadingImages"
          :upload-state="imageUploadStatus.state"
          :status-message="imageUploadStatus.message"
          :status-details="imageUploadStatus.details"
          :retryable="imageUploadRetryable"
          retry-label="Retry post-save"
          :upload-progress="uploadProgressByPendingId"
          :deleting-image-ids="deletingImageIds"
          @select-files="onSelectImageFiles"
          @remove-pending="removePendingImage"
          @remove-existing="removeExistingImage"
          @reorder-pending="reorderPendingImages"
          @retry-upload="retryImageUploads"
        />

        <section class="trade-form-section execution-long-section">
          <details class="trade-estimate-details">
            <summary>Advanced</summary>
            <div class="mt-3 space-y-4">
              <div class="grid grid-premium md:grid-cols-2 xl:grid-cols-4">
                <BaseSelect v-model="form.emotion" label="Emotion" :options="emotionSelectOptions" />
                <BaseInput
                  v-model="form.commission"
                  label="Commission"
                  type="number"
                  min="0"
                  step="0.01"
                  :error="fieldError('commission')"
                />
                <BaseInput
                  v-model="form.swap"
                  label="Swap"
                  type="number"
                  step="0.01"
                />
                <BaseInput
                  v-model="form.spread_cost"
                  label="Spread Cost"
                  type="number"
                  min="0"
                  step="0.01"
                  :error="fieldError('spread_cost')"
                />
                <BaseInput
                  v-model="form.slippage_cost"
                  label="Slippage Cost"
                  type="number"
                  min="0"
                  step="0.01"
                  :error="fieldError('slippage_cost')"
                />
                <BaseInput v-model="psychology.pre_emotion" label="Pre Emotion" placeholder="calm / anxious" />
                <BaseInput v-model="psychology.post_emotion" label="Post Emotion" placeholder="confident / tilted" />
                <BaseInput
                  v-model="psychology.confidence_score"
                  label="Confidence (1-10)"
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                />
                <BaseInput
                  v-model="psychology.stress_score"
                  label="Stress (1-10)"
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                />
              </div>
              <BaseInput
                v-model="psychology.notes"
                label="Psychology Notes"
                multiline
                :rows="2"
                placeholder="State trigger, self-talk, discipline notes..."
              />
            </div>
          </details>
        </section>

        <div class="execution-sticky-bar">
          <span
            v-if="hasPendingPostSave && postSaveQueue.lastSavedTradeId !== null"
            class="text-xs text-amber-300"
          >
            Partial saved: Trade #{{ postSaveQueue.lastSavedTradeId }}.
            <span v-if="postSaveQueue.pendingPsychology"> Psychology pending.</span>
            <span v-if="postSaveQueue.pendingImages"> Images pending.</span>
          </span>
          <span v-else-if="!isEditMode" class="text-xs muted">
            {{ tradeDraftStatusMessage }}
          </span>
          <span v-if="showSoftChecklistNotice" class="text-xs muted">
            Soft mode: rules incomplete, execution allowed.
          </span>
          <button type="button" class="btn btn-ghost px-4 py-2 text-sm" @click="router.push('/trades')">Cancel</button>
          <button
            v-if="hasPendingPostSave"
            type="button"
            class="btn btn-ghost px-4 py-2 text-sm"
            :disabled="tradeStore.saving || uploadingImages"
            @click="retryPostSave"
          >
            Retry Post-Save
          </button>
          <button
            type="button"
            class="btn btn-primary px-4 py-2 text-sm"
            :disabled="isSubmittingDisabled"
            :class="{ 'opacity-60': isChecklistStrictBlocked }"
            :title="isChecklistStrictBlocked ? 'Strict mode: blocked until server readiness is Ready.' : ''"
            @click="handleExecuteClick"
          >
            {{
              uploadingImages
                ? 'Uploading images...'
                : tradeStore.saving
                  ? 'Saving...'
                  : isChecklistStrictBlocked
                    ? 'Blocked by Rules'
                    : isEditMode ? 'Update Execute' : 'Save Execute'
            }}
          </button>
        </div>
        </form>

        <TradeRulesPanel
          mode="desktop"
          :checklist="activeChecklist"
          :required-items="checklistRequiredItems"
          :optional-items="checklistOptionalItems"
          :archived-responses="checklistArchivedResponses"
          :readiness="checklistReadiness"
          :server-readiness="checklistServerReadiness"
          :server-readiness-mismatch="checklistServerReadinessMismatch"
          :server-readiness-reasons="checklistServerReadinessReasons"
          :execution-snapshot="checklistExecutionSnapshot"
          :loading="checklistLoading"
          :saving="checklistSaving"
          :submit-attempted="checklistSubmitAttempted || submitAttempted"
          :strict-mode="checklistStrictMode"
          @update-response="onChecklistResponseChange"
          @evaluation-change="onChecklistEvaluationChange"
        />
      </div>
    </GlassPanel>
  </div>
</template>
