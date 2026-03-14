<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Plus, Trash2 } from 'lucide-vue-next'
import GlassPanel from '@/components/layout/GlassPanel.vue'
import BaseInput from '@/components/form/BaseInput.vue'
import BaseDateTime from '@/components/form/BaseDateTime.vue'
import InstrumentPairSelect from '@/components/form/InstrumentPairSelect.vue'
import TradeImageUploader from '@/components/trades/TradeImageUploader.vue'
import { useMissedTradeStore, type MissedTradePayload } from '@/stores/missedTradeStore'
import { useSyncStatusStore } from '@/stores/syncStatusStore'
import { useTradeStore } from '@/stores/tradeStore'
import { useUiStore } from '@/stores/uiStore'
import type { MissedTrade, MissedTradeImage } from '@/types/trade'
import {
  normalizeMissedTradeTags,
  parseMissedTradeDateTime,
  parseMissedTradeTags,
  sanitizeMissedTradeTag,
  validateMissedTradeIntegrity,
} from '@/utils/missedTradeValidation'
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

const route = useRoute()
const router = useRouter()
const missedTradeStore = useMissedTradeStore()
const syncStatusStore = useSyncStatusStore()
const tradeStore = useTradeStore()
const uiStore = useUiStore()
const { instruments } = storeToRefs(tradeStore)
const { isFallbackMode } = storeToRefs(syncStatusStore)

const loadingEntry = ref(false)
const submitAttempted = ref(false)
const serverFieldErrors = ref<Record<string, string[]>>({})
const customTag = ref('')

const reasonTagOptions = [
  'late-entry',
  'fear',
  'hesitation',
  'no-plan',
  'overtrading',
  'news-volatility',
  'session:london',
  'session:new-york',
  'session:asia',
]

const form = reactive({
  pair: '',
  model: '',
  date: '',
  notes: '',
  tags: [] as string[],
})

interface PendingMissedTradeImage {
  id: string
  file: File
  preview_url: string
  context_tag: 'pre_entry' | 'entry' | 'management' | 'exit' | 'post_review'
  timeframe: string
  annotation_notes: string
}

const MAX_IMAGE_COUNT = 5
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_IMAGE_BYTES = 20 * 1024 * 1024

const existingImages = ref<MissedTradeImage[]>([])
const pendingImages = ref<PendingMissedTradeImage[]>([])
const imageUploadStatus = ref<ImageUploadStatus>(createIdleUploadStatus())
const deletingImageIds = ref<number[]>([])
const uploadProgressByPendingId = ref<Record<string, number>>({})
const postSaveQueue = reactive({
  pendingImages: false,
  lastSavedMissedTradeId: null as number | null,
})

const uploadingImages = computed(() =>
  imageUploadStatus.value.state === 'validating' || imageUploadStatus.value.state === 'uploading'
)
const totalImageCount = computed(() => existingImages.value.length + pendingImages.value.length)
const totalImageSize = computed(() => {
  const existingTotal = existingImages.value.reduce((sum, image) => sum + Number(image.file_size || 0), 0)
  const pendingTotal = pendingImages.value.reduce((sum, image) => sum + image.file.size, 0)
  return existingTotal + pendingTotal
})
const hasPendingPostSave = computed(() =>
  postSaveQueue.pendingImages && postSaveQueue.lastSavedMissedTradeId !== null
)
const imageUploadRetryable = computed(() =>
  imageUploadStatus.value.canRetry
  && pendingImages.value.length > 0
  && postSaveQueue.lastSavedMissedTradeId !== null
)

const missedTradeId = computed(() => {
  const value = Number(route.params.id)
  return Number.isInteger(value) && value > 0 ? value : null
})
const isEditMode = computed(() => missedTradeId.value !== null)
const pageTitle = computed(() => (isEditMode.value ? 'Edit Missed Trade' : 'New Missed Trade'))
const missedSetupFormId = 'missed-setup-form'

const formErrors = computed<Record<string, string>>(() => {
  const errors: Record<string, string> = {}
  return {
    ...errors,
    ...validateMissedTradeIntegrity({
      pair: form.pair,
      model: form.model,
      date: form.date,
      tags: form.tags,
    }),
  }
})

const selectedInstrumentId = computed({
  get() {
    const normalizedPair = form.pair.trim().toUpperCase()
    if (!normalizedPair) return ''
    const match = instruments.value.find((instrument) => instrument.symbol === normalizedPair)
    return match ? String(match.id) : ''
  },
  set(value: string) {
    const id = Number(value)
    if (!Number.isInteger(id) || id <= 0) {
      form.pair = ''
      return
    }

    const match = instruments.value.find((instrument) => instrument.id === id)
    form.pair = match?.symbol ?? ''
  },
})

function fieldError(name: string) {
  if (!submitAttempted.value) return ''
  const localMessage = formErrors.value[name]
  if (localMessage) return localMessage
  return serverFieldErrors.value[name]?.[0] ?? ''
}

function toLocalDateTime(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function nowLocalDateTime() {
  return toLocalDateTime(new Date().toISOString())
}

function toggleTag(tag: string) {
  const normalizedTag = sanitizeMissedTradeTag(tag)
  if (!normalizedTag) return

  if (form.tags.includes(normalizedTag)) {
    form.tags = form.tags.filter((item) => item !== normalizedTag)
    return
  }

  form.tags = [...form.tags, normalizedTag]
}

function addCustomTag() {
  const value = sanitizeMissedTradeTag(customTag.value)
  if (!value || form.tags.includes(value)) return

  form.tags = [...form.tags, value]
  customTag.value = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter((item) => item !== tag)
}

function setFormFromMissedTrade(entry: MissedTrade) {
  form.pair = entry.pair
  form.model = entry.model
  form.date = toLocalDateTime(entry.date)
  form.notes = entry.notes ?? ''
  form.tags = parseMissedTradeTags(entry.reason)
  existingImages.value = (entry.images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
}

function applyQuickDefaultsFromQuery() {
  if (isEditMode.value) return
  if (`${route.query.quick ?? ''}` !== '1') return

  const pair = `${route.query.pair ?? ''}`.trim().toUpperCase()
  const model = `${route.query.model ?? ''}`.trim()
  const reason = `${route.query.reason ?? ''}`.trim()

  if (pair) {
    form.pair = pair
  }
  if (model) {
    form.model = model
  }
  if (reason) {
    const parsed = parseMissedTradeTags(reason)
    if (parsed.length > 0) {
      form.tags = Array.from(new Set([...form.tags, ...parsed]))
    }
  }
}

function buildPayload(): MissedTradePayload {
  const dateTimestamp = parseMissedTradeDateTime(form.date)
  if (dateTimestamp === null) {
    throw new Error('Date is invalid.')
  }

  const normalizedTags = normalizeMissedTradeTags(form.tags)
  if (normalizedTags.length === 0) {
    throw new Error('At least one reason tag is required.')
  }

  return {
    pair: form.pair.trim().toUpperCase(),
    model: form.model.trim(),
    date: new Date(dateTimestamp).toISOString(),
    reason: normalizedTags.join(', '),
    notes: form.notes.trim() ? form.notes.trim() : null,
  }
}

function extractErrorMessage(error: unknown): string {
  return normalizeApiError(error).message
}

function mapServerFieldName(field: string): string {
  const normalized = field.trim()
  if (normalized === 'reason') return 'tags'
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

function detachPendingImage(id: string): PendingMissedTradeImage | null {
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

function reorderPendingImages(payload: { from: number; to: number }) {
  const { from, to } = payload
  if (from < 0 || to < 0 || from >= pendingImages.value.length || to >= pendingImages.value.length) return
  const items = pendingImages.value.slice()
  const [moved] = items.splice(from, 1)
  if (!moved) return
  items.splice(to, 0, moved)
  pendingImages.value = items
}

async function removeExistingImage(imageId: number) {
  if (!isEditMode.value || missedTradeId.value === null) return
  if (deletingImageIds.value.includes(imageId)) return

  deletingImageIds.value = [...deletingImageIds.value, imageId]
  try {
    await missedTradeStore.deleteMissedTradeImage(imageId)
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

async function onSelectImageFiles(files: File[]) {
  if (files.length === 0) return

  setImageUploadStatus('validating', 'Validating screenshots...')

  const result = await preparePendingImages(files, {
    entityLabel: 'missed trade',
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

async function uploadPendingImages(missedTradeId: number) {
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

      const uploaded = await missedTradeStore.uploadMissedTradeImage(
        missedTradeId,
        image.file,
        existingImages.value.length,
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

function clearPostSaveQueue() {
  postSaveQueue.pendingImages = false
  postSaveQueue.lastSavedMissedTradeId = null
}

async function retryPostSaveImages() {
  const missedTradeIdToResume = postSaveQueue.lastSavedMissedTradeId
  if (missedTradeIdToResume === null || !postSaveQueue.pendingImages) return

  try {
    await uploadPendingImages(missedTradeIdToResume)
    postSaveQueue.pendingImages = false
    serverFieldErrors.value = {}
    uiStore.toast({
      type: 'success',
      title: 'Image upload completed',
      message: 'Screenshots were attached to this missed setup.',
    })
    clearPostSaveQueue()
    void router.push('/missed-trades')
  } catch {
    uiStore.toast({
      type: 'info',
      title: 'Missed setup saved partially',
      message: `Missed setup #${missedTradeIdToResume} is already saved. Retry image upload to finish attachments.`,
    })
  }
}

async function submit() {
  submitAttempted.value = true
  serverFieldErrors.value = {}
  const firstError = Object.values(formErrors.value)[0]
  if (firstError) {
    uiStore.toast({
      type: 'error',
      title: 'Invalid missed setup input',
      message: firstError,
    })
    return
  }

  try {
    const payload = buildPayload()
    form.tags = parseMissedTradeTags(payload.reason)
    const hadPendingImages = pendingImages.value.length > 0
    let savedEntry: MissedTrade

    const writableMissedTradeId = missedTradeId.value ?? postSaveQueue.lastSavedMissedTradeId
    if (writableMissedTradeId !== null) {
      savedEntry = await missedTradeStore.updateMissedTrade(writableMissedTradeId, payload)
      uiStore.toast({
        type: 'success',
        title: 'Missed setup updated',
      })
    } else {
      savedEntry = await missedTradeStore.createMissedTrade(payload)
      uiStore.toast({
        type: 'success',
        title: 'Missed setup logged',
      })
    }

    postSaveQueue.lastSavedMissedTradeId = savedEntry.id
    postSaveQueue.pendingImages = pendingImages.value.length > 0

    await uploadPendingImages(savedEntry.id)
    postSaveQueue.pendingImages = false

    if (hadPendingImages) {
      uiStore.toast({
        type: 'success',
        title: 'Images uploaded',
        message: 'Screenshots were attached to this missed setup.',
      })
    }

    clearPostSaveQueue()
    void router.push('/missed-trades')
  } catch (error) {
    const normalized = normalizeApiError(error)
    applyServerFieldErrors(normalized)

    if (postSaveQueue.lastSavedMissedTradeId !== null && hasPendingPostSave.value) {
      uiStore.toast({
        type: 'info',
        title: 'Missed setup saved partially',
        message: `Missed setup #${postSaveQueue.lastSavedMissedTradeId} is already saved. Retry image upload to finish attachments.`,
      })
      return
    }

    uiStore.toast({
      type: 'error',
      title: 'Failed to save missed setup',
      message: normalized.message,
    })
  }
}

async function deleteEntry() {
  if (!isEditMode.value || missedTradeId.value === null) return

  const confirmed = await uiStore.askConfirmation({
    title: 'Delete missed setup entry?',
    message: 'This action cannot be undone.',
    confirmText: 'Delete',
    danger: true,
  })
  if (!confirmed) return

  try {
    await missedTradeStore.deleteMissedTrade(missedTradeId.value)
    uiStore.toast({
      type: 'success',
      title: 'Missed setup deleted',
    })
    void router.push('/missed-trades')
  } catch (error) {
    uiStore.toast({
      type: 'error',
      title: 'Delete failed',
      message: extractErrorMessage(error),
    })
  }
}

async function loadEntryIfNeeded() {
  if (!isEditMode.value || missedTradeId.value === null) {
    form.date = nowLocalDateTime()
    return
  }

  loadingEntry.value = true
  try {
    const entry = await missedTradeStore.fetchMissedTrade(missedTradeId.value)
    setFormFromMissedTrade(entry)
    serverFieldErrors.value = {}
    clearPostSaveQueue()
  } catch {
    uiStore.toast({
      type: 'error',
      title: 'Missed setup not found',
      message: 'Could not load this entry for editing.',
    })
    void router.push('/missed-trades')
  } finally {
    loadingEntry.value = false
  }
}

onMounted(async () => {
  try {
    await tradeStore.fetchInstruments()
  } catch {
    uiStore.toast({
      type: 'error',
      title: 'Failed to load instruments',
      message: 'Please refresh and try again.',
    })
  }
  applyQuickDefaultsFromQuery()
  await loadEntryIfNeeded()
})

onBeforeUnmount(() => {
  clearPendingImages()
})
</script>

<template>
  <div class="space-y-4 missed-form-minimal">
    <GlassPanel class="form-command-shell">
      <div class="form-command-bar">
        <div class="form-command-left">
          <h2 class="section-title">{{ pageTitle }}</h2>
          <p class="section-note">Minimal missed-trade log with clear reasons and optional screenshots.</p>
          <div class="form-command-chips">
            <span class="filter-chip-mini">Setup</span>
            <span class="filter-chip-mini">Tags</span>
            <span class="filter-chip-mini">Optional</span>
          </div>
        </div>
        <div class="form-command-right">
          <button type="button" class="btn btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm" @click="router.push('/missed-trades')">
            <ArrowLeft class="h-4 w-4" />
            Back
          </button>
          <button
            type="submit"
            :form="missedSetupFormId"
            class="btn btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            :disabled="missedTradeStore.saving || uploadingImages || loadingEntry"
          >
            <Plus class="h-4 w-4" />
            {{
              uploadingImages
                ? 'Uploading images...'
                : missedTradeStore.saving
                  ? 'Saving...'
                  : isEditMode ? 'Update' : 'Save'
            }}
          </button>
        </div>
      </div>
    </GlassPanel>

    <GlassPanel class="form-shell-panel form-shell-unified">

      <div v-if="loadingEntry" class="space-y-3">
        <div class="skeleton-shimmer h-12 rounded-xl" />
        <div class="skeleton-shimmer h-12 rounded-xl" />
        <div class="skeleton-shimmer h-12 rounded-xl" />
      </div>

      <form v-else :id="missedSetupFormId" class="form-block space-y-4" @submit.prevent="submit">
        <section class="trade-form-section">
          <p class="trade-section-title">Setup Details</p>
          <div class="grid grid-premium md:grid-cols-2 xl:grid-cols-3">
            <InstrumentPairSelect
              v-model="selectedInstrumentId"
              label="Instrument / Pair"
              required
              :instruments="instruments"
              :error="fieldError('pair')"
            />
            <BaseInput v-model="form.model" label="Model" required placeholder="Liquidity Sweep" :error="fieldError('model')" />
            <BaseDateTime v-model="form.date" label="Date" required :max="nowLocalDateTime()" :error="fieldError('date')" />
          </div>
        </section>

        <section class="trade-form-section">
          <p class="trade-section-title">Reason Tags</p>
          <div class="execution-tag-panel p-3">
            <p class="kicker-label">Tags</p>
            <p class="section-note mt-2">
              Add at least one reason tag for behavioral context. Weekend captures are allowed; add a
              <code>session:*</code> tag if timing matters.
            </p>
            <div class="chip-row mt-2">
              <button
                v-for="tag in reasonTagOptions"
                :key="tag"
                type="button"
                class="chip-btn"
                :class="{ active: form.tags.includes(tag) }"
                @click="toggleTag(tag)"
              >
                {{ tag }}
              </button>
            </div>

            <div class="mt-3 flex gap-2">
              <input
                v-model="customTag"
                type="text"
                placeholder="custom tag"
                class="field control-modern mt-0 w-full"
                @keydown.enter.prevent="addCustomTag"
              />
              <button type="button" class="btn btn-ghost px-3 text-xs" @click="addCustomTag">Add</button>
            </div>

            <div v-if="form.tags.length > 0" class="chip-row mt-3">
              <span v-for="tag in form.tags" :key="`selected-${tag}`" class="pill pill-positive inline-flex items-center gap-1">
                {{ tag }}
                <button type="button" class="btn btn-ghost p-0 text-xs" @click="removeTag(tag)">x</button>
              </span>
            </div>
          </div>
          <p v-if="fieldError('tags')" class="field-error-text mt-2">{{ fieldError('tags') }}</p>
        </section>

        <section class="trade-form-section">
          <p class="trade-section-title">Notes</p>
          <BaseInput v-model="form.notes" label="Notes" multiline :rows="4" />
        </section>

        <section class="trade-form-section">
          <details class="trade-estimate-details">
            <summary>Screenshots (Optional)</summary>
            <div class="mt-3">
              <TradeImageUploader
                title="Missed Trade Screenshots"
                upload-hint="Max 5 images - jpg, jpeg, png, webp, bmp - 5MB each - paste with Ctrl+V"
                :existing-images="existingImages"
                :pending-images="pendingImages"
                :offline-warning="isFallbackMode"
                :max-files="MAX_IMAGE_COUNT"
                :uploading="uploadingImages"
                :upload-state="imageUploadStatus.state"
                :status-message="imageUploadStatus.message"
                :status-details="imageUploadStatus.details"
                :retryable="imageUploadRetryable"
                retry-label="Retry image upload"
                :upload-progress="uploadProgressByPendingId"
                :deleting-image-ids="deletingImageIds"
                @select-files="onSelectImageFiles"
                @remove-pending="removePendingImage"
                @remove-existing="removeExistingImage"
                @reorder-pending="reorderPendingImages"
                @retry-upload="retryPostSaveImages"
              />
            </div>
          </details>
        </section>

        <div class="flex items-center justify-end gap-2">
          <span
            v-if="hasPendingPostSave"
            class="mr-auto text-xs text-amber-300"
          >
            Partial saved: Missed setup #{{ postSaveQueue.lastSavedMissedTradeId }}. Images pending.
          </span>
          <button
            v-if="isEditMode"
            type="button"
            class="btn btn-ghost is-danger inline-flex items-center gap-2 px-4 py-2 text-sm"
            @click="deleteEntry"
          >
            <Trash2 class="h-4 w-4" />
            Delete
          </button>
          <button type="button" class="btn btn-ghost px-4 py-2 text-sm" @click="router.push('/missed-trades')">Cancel</button>
          <button
            v-if="hasPendingPostSave"
            type="button"
            class="btn btn-ghost px-4 py-2 text-sm"
            :disabled="missedTradeStore.saving || uploadingImages"
            @click="retryPostSaveImages"
          >
            Retry Image Upload
          </button>
          <button
            type="submit"
            class="btn btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            :disabled="missedTradeStore.saving || uploadingImages"
          >
            <Plus class="h-4 w-4" />
            {{
              uploadingImages
                ? 'Uploading images...'
                : missedTradeStore.saving
                  ? 'Saving...'
                  : isEditMode ? 'Update Trade' : 'Save Trade'
            }}
          </button>
        </div>
      </form>
    </GlassPanel>
  </div>
</template>
