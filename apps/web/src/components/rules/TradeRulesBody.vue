<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronDown, Info } from 'lucide-vue-next'
import type {
  Checklist,
  TradeChecklistExecutionSnapshot,
  TradeChecklistItemWithResponse,
  TradeChecklistReadiness,
  TradeChecklistResponseRecord,
} from '@/types/rules'
import { resolveChecklistLane, type ChecklistLaneKey } from '@/utils/rulesLanes'
import {
  resolveChecklistWorkflowFailures,
  resolveChecklistWorkflowReadiness,
} from '@/utils/tradeRuleWorkflow'

interface RuleLane {
  key: ChecklistLaneKey
  label: string
}

const RULE_LANES: RuleLane[] = [
  { key: 'before', label: 'Before Trading' },
  { key: 'during', label: 'During Trading' },
  { key: 'after', label: 'After Trading' },
]

const props = withDefaults(
  defineProps<{
    checklist: Checklist | null
    requiredItems: TradeChecklistItemWithResponse[]
    optionalItems: TradeChecklistItemWithResponse[]
    archivedResponses: TradeChecklistResponseRecord[]
    readiness: TradeChecklistReadiness
    serverReadiness?: TradeChecklistReadiness
    serverReadinessMismatch?: boolean
    serverReadinessReasons?: Array<{
      checklist_item_id: number
      title: string
      category: string
      reason?: string
    }>
    executionSnapshot?: TradeChecklistExecutionSnapshot | null
    loading?: boolean
    saving?: boolean
    submitAttempted?: boolean
    strictMode?: boolean
    showHeader?: boolean
  }>(),
  {
    loading: false,
    saving: false,
    submitAttempted: false,
    strictMode: false,
    showHeader: true,
    executionSnapshot: null,
    serverReadiness: undefined,
    serverReadinessMismatch: false,
    serverReadinessReasons: () => [],
  }
)

const emit = defineEmits<{
  (event: 'update-response', itemId: number, value: unknown): void
  (event: 'evaluation-change', payload: { failedRequiredIds: number[]; firstFailingId: number | null }): void
}>()

const cardOpen = ref(true)

const allItems = computed(() =>
  [...props.requiredItems, ...props.optionalItems]
    .slice()
    .sort((left, right) => left.order_index - right.order_index || left.id - right.id)
)

const checkedCount = computed(() => allItems.value.filter((item) => item.response.is_completed).length)
const totalCount = computed(() => allItems.value.length)
const resolvedServerReadiness = computed(() =>
  resolveChecklistWorkflowReadiness({
    readiness: props.readiness,
    serverReadiness: props.serverReadiness,
    executionSnapshot: props.executionSnapshot ?? null,
  })
)
const serverStatusLabel = computed(() => resolvedServerReadiness.value.ready ? 'Ready' : 'Not Ready')
const serverBlockingReasons = computed(() =>
  resolveChecklistWorkflowFailures({
    readiness: props.readiness,
    serverReadiness: props.serverReadiness,
    serverReadinessReasons: props.serverReadinessReasons,
    executionSnapshot: props.executionSnapshot ?? null,
  })
)
const tradeRuleOutcomeLabel = computed(() =>
  resolvedServerReadiness.value.ready ? 'This trade will be saved as rules followed.' : 'This trade will be saved with rule breaks.'
)
const failureReasonByItemId = computed(() =>
  serverBlockingReasons.value.reduce((map, row) => {
    map.set(row.checklist_item_id, row.reason ?? 'Rule requirement not met.')
    return map
  }, new Map<number, string>())
)
const snapshotFailedRows = computed(() => {
  const snapshot = props.executionSnapshot
  if (!snapshot || snapshot.failed_rule_ids.length === 0) return []

  return snapshot.failed_rule_ids.map((ruleId, index) => ({
    id: ruleId,
    title: snapshot.failed_rule_titles[index] || `Rule #${ruleId}`,
  }))
})

function laneForItem(item: TradeChecklistItemWithResponse): ChecklistLaneKey {
  return resolveChecklistLane(item)
}

const laneItems = computed<Record<ChecklistLaneKey, TradeChecklistItemWithResponse[]>>(() => {
  const result: Record<ChecklistLaneKey, TradeChecklistItemWithResponse[]> = {
    before: [],
    during: [],
    after: [],
  }

  for (const item of allItems.value) {
    result[laneForItem(item)].push(item)
  }

  return result
})

watch(
  () => [
    allItems.value,
    resolvedServerReadiness.value.ready,
    serverBlockingReasons.value.map((entry) => entry.checklist_item_id).join(','),
  ],
  () => {
    const failedRequiredIds = serverBlockingReasons.value
      .map((row) => row.checklist_item_id)
      .filter((value) => Number.isInteger(value) && value > 0)

    emit('evaluation-change', {
      failedRequiredIds,
      firstFailingId: failedRequiredIds[0] ?? null,
    })
  },
  { immediate: true, deep: true }
)

function dropdownOptions(item: TradeChecklistItemWithResponse): string[] {
  const config = item.config as { options?: unknown }
  if (!Array.isArray(config.options)) return []
  return config.options.map((entry) => String(entry)).filter((entry) => entry.trim().length > 0)
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function clampNumber(value: number, min: number | null, max: number | null): number {
  let next = value
  if (min !== null && next < min) next = min
  if (max !== null && next > max) next = max
  return next
}

function numericStepFor(item: TradeChecklistItemWithResponse): number {
  const config = item.config as { step?: unknown }
  const parsed = toFiniteNumber(config.step)
  if (parsed !== null && parsed > 0) return parsed
  return item.type === 'scale' ? 1 : 0.1
}

function defaultNumericToggleValue(item: TradeChecklistItemWithResponse): number {
  const config = item.config as Record<string, unknown>
  const min = toFiniteNumber(config.min)
  const max = toFiniteNumber(config.max)
  const step = numericStepFor(item)
  const explicitRule = typeof config.rule === 'object' && config.rule !== null
    ? (config.rule as Record<string, unknown>)
    : null

  let comparator = ''
  let threshold: unknown = null
  let thresholdMin: unknown = null
  let thresholdMax: unknown = null

  if (explicitRule) {
    comparator = String(explicitRule.operator ?? '').trim()
    threshold = explicitRule.threshold
  } else {
    comparator = String(config.comparator ?? '').trim()
    threshold = config.threshold
    thresholdMin = config.threshold_min
    thresholdMax = config.threshold_max
  }

  const numericThreshold = toFiniteNumber(threshold)
  const numericThresholdMin = toFiniteNumber(thresholdMin)
  const numericThresholdMax = toFiniteNumber(thresholdMax)

  let candidate: number | null = null
  if (comparator === '>=' || comparator === '<=' || comparator === 'equals' || comparator === '==' || comparator === '=') {
    candidate = numericThreshold
  } else if (comparator === '>') {
    candidate = numericThreshold !== null ? numericThreshold + step : null
  } else if (comparator === '<') {
    candidate = numericThreshold !== null ? numericThreshold - step : null
  } else if (comparator === 'between') {
    if (numericThresholdMin !== null && numericThresholdMax !== null) {
      candidate = (numericThresholdMin + numericThresholdMax) / 2
    } else {
      candidate = numericThresholdMin ?? numericThresholdMax
    }
  }

  if (candidate === null) {
    if (min !== null) {
      candidate = min
    } else if (numericThreshold !== null) {
      candidate = numericThreshold
    } else {
      candidate = item.type === 'scale' ? 1 : step
    }
  }

  return clampNumber(candidate, min, max)
}

function toggleItem(item: TradeChecklistItemWithResponse) {
  if (item.type === 'checkbox') {
    emit('update-response', item.id, !Boolean(item.response.value))
    return
  }

  if (item.type === 'number' || item.type === 'scale') {
    const nextValue = defaultNumericToggleValue(item)
    emit('update-response', item.id, item.response.is_completed ? null : nextValue)
    return
  }

  if (item.type === 'dropdown') {
    const firstOption = dropdownOptions(item)[0] ?? 'done'
    emit('update-response', item.id, item.response.is_completed ? '' : firstOption)
    return
  }

  emit('update-response', item.id, item.response.is_completed ? '' : 'Done')
}

function numericInputValue(item: TradeChecklistItemWithResponse): string {
  const value = toFiniteNumber(item.response.value)
  return value === null ? '' : String(value)
}

function textInputValue(item: TradeChecklistItemWithResponse): string {
  if (item.response.value === null || item.response.value === undefined) return ''
  return String(item.response.value)
}

function setTextValue(item: TradeChecklistItemWithResponse, value: string) {
  emit('update-response', item.id, value)
}

function setNumericValue(item: TradeChecklistItemWithResponse, value: string) {
  emit('update-response', item.id, value.trim() === '' ? null : Number(value))
}

function handleDropdownChange(item: TradeChecklistItemWithResponse, event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  setTextValue(item, target.value)
}

function handleNumberInput(item: TradeChecklistItemWithResponse, event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  setNumericValue(item, target.value)
}

function handleTextInput(item: TradeChecklistItemWithResponse, event: Event) {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement)) return
  setTextValue(item, target.value)
}

function itemMin(item: TradeChecklistItemWithResponse): number | undefined {
  const config = item.config as { min?: unknown }
  const parsed = toFiniteNumber(config.min)
  return parsed === null ? undefined : parsed
}

function itemMax(item: TradeChecklistItemWithResponse): number | undefined {
  const config = item.config as { max?: unknown }
  const parsed = toFiniteNumber(config.max)
  return parsed === null ? undefined : parsed
}

function itemStep(item: TradeChecklistItemWithResponse): number | undefined {
  return numericStepFor(item)
}

function itemAutoMetricLabel(item: TradeChecklistItemWithResponse): string {
  const config = item.config as { auto_metric?: unknown; rule?: unknown }
  const directMetric = typeof config.auto_metric === 'string' ? config.auto_metric.trim() : ''
  if (directMetric) return directMetric

  if (typeof config.rule === 'object' && config.rule !== null) {
    const ruleMetric = typeof (config.rule as { metric_key?: unknown }).metric_key === 'string'
      ? String((config.rule as { metric_key?: unknown }).metric_key).trim()
      : ''
    if (ruleMetric) return ruleMetric
  }

  return ''
}

function rowFailureReason(itemId: number): string {
  return failureReasonByItemId.value.get(itemId) ?? ''
}
</script>

<template>
  <section class="rules-checklist-shell">
    <header v-if="showHeader" class="rules-checklist-title-row">
      <p class="rules-checklist-title">Rules</p>
      <Info class="h-3.5 w-3.5 rules-checklist-info" />
    </header>

    <section class="rules-card">
      <button type="button" class="rules-card-head" @click="cardOpen = !cardOpen">
        <span class="rules-card-head-left">
          <strong>Rules</strong>
          <em>{{ checkedCount }}/{{ totalCount }} checked</em>
        </span>
        <ChevronDown class="h-4 w-4" :class="{ 'rotate-180': cardOpen }" />
      </button>

      <div v-if="loading" class="rules-loading">
        <div class="skeleton-shimmer h-10 rounded-xl" />
        <div class="skeleton-shimmer h-10 rounded-xl" />
      </div>

      <div v-show="cardOpen && !loading && checklist" class="rules-card-body">
        <section class="rules-server-status">
          <p class="rules-server-line">
            <strong>Rules status:</strong>
            <span :class="resolvedServerReadiness.ready ? 'is-ready' : 'is-not-ready'">{{ serverStatusLabel }}</span>
          </p>
          <p class="rules-server-outcome">{{ tradeRuleOutcomeLabel }}</p>
          <div
            v-if="strictMode && !resolvedServerReadiness.ready && serverBlockingReasons.length > 0"
            class="rules-server-blocked"
          >
            <p class="rules-server-blocked-title">Blocking reasons from server</p>
            <p
              v-for="row in serverBlockingReasons"
              :key="`server-blocked-${row.checklist_item_id}`"
              class="rules-server-blocked-row"
            >
              {{ row.title }}: {{ row.reason || 'Rule requirement not met.' }}
            </p>
          </div>
          <div v-if="serverReadinessMismatch && serverBlockingReasons.length > 0" class="rules-server-mismatch">
            <p class="rules-server-mismatch-title">Local edits differ from server evaluation</p>
            <p
              v-for="row in serverBlockingReasons"
              :key="`server-mismatch-${row.checklist_item_id}`"
              class="rules-server-mismatch-row"
            >
              {{ row.title }}: {{ row.reason || 'Rule requirement not met.' }}
            </p>
          </div>
        </section>

        <section
          v-for="lane in RULE_LANES"
          :key="lane.key"
          class="rules-lane"
        >
          <h4 class="rules-lane-label">{{ lane.label }}</h4>
          <p v-if="laneItems[lane.key].length === 0" class="rules-lane-empty">
            No rules in this phase yet.
          </p>

          <article
            v-for="item in laneItems[lane.key]"
            :key="item.id"
            class="rules-item"
            :class="{ checked: item.response.is_completed, 'has-failure': rowFailureReason(item.id) }"
          >
            <div class="rules-item-head">
              <button
                type="button"
                class="rules-item-box"
                :class="{ checked: item.response.is_completed }"
                @click="toggleItem(item)"
              >
                <Check class="h-3.5 w-3.5" />
              </button>

              <div class="rules-item-copy">
                <div class="rules-item-title-row">
                  <span class="rules-item-text">{{ item.title }}</span>
                  <span class="rules-item-badge" :class="item.required ? 'is-required' : 'is-optional'">
                    {{ item.required ? 'Required' : 'Optional' }}
                  </span>
                  <span v-if="itemAutoMetricLabel(item)" class="rules-item-badge is-metric">
                    Auto: {{ itemAutoMetricLabel(item) }}
                  </span>
                </div>
                <p v-if="item.help_text" class="rules-item-help">{{ item.help_text }}</p>
              </div>
            </div>

            <div class="rules-item-control">
              <button
                v-if="item.type === 'checkbox'"
                type="button"
                class="rules-toggle-btn"
                :class="{ checked: item.response.is_completed }"
                @click="toggleItem(item)"
              >
                {{ item.response.is_completed ? 'Followed' : 'Mark Followed' }}
              </button>

              <select
                v-else-if="item.type === 'dropdown'"
                class="rules-select"
                :value="textInputValue(item)"
                @change="handleDropdownChange(item, $event)"
              >
                <option value="">Select an option</option>
                <option v-for="option in dropdownOptions(item)" :key="`${item.id}-${option}`" :value="option">
                  {{ option }}
                </option>
              </select>

              <input
                v-else-if="item.type === 'number' || item.type === 'scale'"
                class="rules-number-input"
                type="number"
                :min="itemMin(item)"
                :max="itemMax(item)"
                :step="itemStep(item)"
                :value="numericInputValue(item)"
                @input="handleNumberInput(item, $event)"
              />

              <textarea
                v-else
                class="rules-textarea"
                rows="2"
                :value="textInputValue(item)"
                @input="handleTextInput(item, $event)"
              />

              <button
                v-if="item.type !== 'checkbox' && item.response.is_completed"
                type="button"
                class="rules-clear-btn"
                @click="toggleItem(item)"
              >
                Clear
              </button>
            </div>

            <p v-if="rowFailureReason(item.id)" class="rules-item-reason">
              {{ rowFailureReason(item.id) }}
            </p>
          </article>
        </section>
      </div>

      <p v-if="saving" class="rules-saving">Saving...</p>
      <div
        v-if="!loading && snapshotFailedRows.length > 0"
        class="rules-snapshot-failures"
      >
        <p class="rules-snapshot-title">Failed At Execution</p>
        <p
          v-for="row in snapshotFailedRows"
          :key="`snapshot-fail-${row.id}`"
          class="rules-snapshot-row"
        >
          {{ row.title }}
        </p>
      </div>
      <p v-if="!loading && !checklist" class="rules-empty">No active rule set configured.</p>
    </section>
  </section>
</template>

<style scoped>
.rules-checklist-shell {
  display: grid;
  gap: 0.45rem;
}

.rules-checklist-title-row {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.rules-checklist-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.rules-checklist-info {
  color: var(--muted);
}

.rules-card {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent 30%);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--panel-soft) 58%, var(--panel) 42%), var(--panel)),
    var(--panel);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.rules-card-head {
  width: 100%;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 68%, transparent 32%);
  background: transparent;
  color: var(--text);
  padding: 0.72rem 0.8rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  text-align: left;
}

.rules-card-head-left {
  display: inline-flex;
  align-items: baseline;
  gap: 0.55rem;
}

.rules-card-head-left strong {
  font-size: 0.96rem;
  font-weight: 700;
}

.rules-card-head-left em {
  font-size: 0.9rem;
  font-style: normal;
  font-weight: 700;
  color: color-mix(in srgb, var(--primary) 80%, var(--text) 20%);
}

.rules-card-body {
  max-height: 420px;
  overflow: auto;
  padding: 0.72rem 0.78rem 0.8rem;
  display: grid;
  gap: 1rem;
}

.rules-loading {
  padding: 0.72rem 0.78rem;
  display: grid;
  gap: 0.5rem;
}

.rules-server-status {
  display: grid;
  gap: 0.28rem;
  padding: 0.45rem 0.5rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent 40%);
  background: color-mix(in srgb, var(--panel-soft) 60%, var(--panel) 40%);
}

.rules-server-line {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.73rem;
}

.rules-server-line .is-ready {
  color: color-mix(in srgb, var(--primary) 72%, var(--text) 28%);
  font-weight: 700;
}

.rules-server-line .is-not-ready {
  color: color-mix(in srgb, var(--danger) 72%, var(--text) 28%);
  font-weight: 700;
}

.rules-server-outcome {
  margin: 0;
  font-size: 0.72rem;
  color: var(--muted);
}

.rules-server-mismatch,
.rules-server-blocked {
  display: grid;
  gap: 0.2rem;
}

.rules-server-blocked-title,
.rules-server-mismatch-title {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--danger) 66%, var(--text) 34%);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rules-server-blocked-row,
.rules-server-mismatch-row {
  margin: 0;
  font-size: 0.7rem;
  color: var(--muted);
}

.rules-lane {
  display: grid;
  gap: 0.38rem;
}

.rules-lane-label {
  margin: 0;
  font-size: 0.73rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.rules-lane-empty {
  margin: 0;
  padding: 0.38rem 0.4rem;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--border) 58%, transparent 42%);
  color: var(--muted);
  font-size: 0.72rem;
}

.rules-item {
  border: 1px solid color-mix(in srgb, var(--border) 68%, transparent 32%);
  border-radius: 10px;
  background: color-mix(in srgb, var(--panel-soft) 68%, var(--panel) 32%);
  color: var(--text);
  padding: 0.58rem 0.62rem;
  display: grid;
  gap: 0.55rem;
}

.rules-item.checked {
  border-color: color-mix(in srgb, var(--primary) 55%, var(--border) 45%);
}

.rules-item.has-failure {
  border-color: color-mix(in srgb, var(--danger) 48%, var(--border) 52%);
}

.rules-item-head {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
}

.rules-item-box {
  width: 1.08rem;
  height: 1.08rem;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, var(--primary) 30%);
  background: color-mix(in srgb, var(--panel-soft) 70%, transparent 30%);
  color: transparent;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
}

.rules-item-box.checked {
  background: color-mix(in srgb, var(--primary) 80%, var(--panel) 20%);
  border-color: color-mix(in srgb, var(--primary) 64%, var(--border) 36%);
  color: var(--panel);
}

.rules-item-copy {
  min-width: 0;
  display: grid;
  gap: 0.24rem;
}

.rules-item-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.36rem;
}

.rules-item-text {
  font-size: 0.83rem;
  line-height: 1.35;
  font-weight: 700;
}

.rules-item-help {
  margin: 0;
  font-size: 0.7rem;
  color: var(--muted);
}

.rules-item-badge {
  border-radius: 999px;
  padding: 0.12rem 0.42rem;
  font-size: 0.64rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rules-item-badge.is-required {
  background: color-mix(in srgb, var(--danger) 14%, transparent 86%);
  color: color-mix(in srgb, var(--danger) 76%, var(--text) 24%);
}

.rules-item-badge.is-optional {
  background: color-mix(in srgb, var(--border) 28%, transparent 72%);
  color: var(--muted);
}

.rules-item-badge.is-metric {
  background: color-mix(in srgb, var(--primary) 14%, transparent 86%);
  color: color-mix(in srgb, var(--primary) 78%, var(--text) 22%);
}

.rules-item-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  padding-left: 1.63rem;
}

.rules-toggle-btn,
.rules-clear-btn {
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent 30%);
  border-radius: 999px;
  background: transparent;
  color: var(--text);
  padding: 0.3rem 0.58rem;
  font-size: 0.7rem;
  font-weight: 700;
}

.rules-toggle-btn.checked {
  background: color-mix(in srgb, var(--primary) 15%, transparent 85%);
  border-color: color-mix(in srgb, var(--primary) 54%, transparent 46%);
}

.rules-select,
.rules-number-input,
.rules-textarea {
  width: 100%;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent 26%);
  background: color-mix(in srgb, var(--panel) 88%, white 12%);
  color: var(--text);
  padding: 0.45rem 0.55rem;
  font-size: 0.74rem;
}

.rules-textarea {
  min-height: 3.2rem;
  resize: vertical;
}

.rules-item-reason {
  margin: 0;
  padding-left: 1.63rem;
  font-size: 0.7rem;
  color: color-mix(in srgb, var(--danger) 68%, var(--text) 32%);
}

.rules-saving,
.rules-empty {
  margin: 0;
  padding: 0.62rem 0.78rem;
  font-size: 0.74rem;
  color: var(--muted);
}

.rules-snapshot-failures {
  margin: 0.25rem 0.78rem 0.7rem;
  padding: 0.45rem 0.55rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent 70%);
  background: color-mix(in srgb, var(--danger) 8%, transparent 92%);
  display: grid;
  gap: 0.2rem;
}

.rules-snapshot-title {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--danger) 84%, var(--text) 16%);
}

.rules-snapshot-row {
  margin: 0;
  font-size: 0.74rem;
  color: var(--text);
}
</style>
