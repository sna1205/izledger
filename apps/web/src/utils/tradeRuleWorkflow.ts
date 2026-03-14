import type {
  TradeChecklistExecutionSnapshot,
  TradeChecklistReadiness,
  TradeChecklistResponsePayload,
} from '@/types/rules'

export interface TradeChecklistWorkflowFailure {
  checklist_item_id: number
  title: string
  category: string
  reason?: string
}

interface ResolveChecklistWorkflowOptions {
  readiness: TradeChecklistReadiness
  serverReadiness?: TradeChecklistReadiness
  serverReadinessReasons?: TradeChecklistResponsePayload['failing_rules']
  executionSnapshot?: TradeChecklistExecutionSnapshot | null
}

function normalizeWorkflowFailures(
  rows: Array<{
    checklist_item_id: number
    title: string
    category: string
    reason?: string
  }>
): TradeChecklistWorkflowFailure[] {
  return rows.map((row) => ({
    checklist_item_id: Number(row.checklist_item_id),
    title: `${row.title ?? ''}`.trim() || `Rule #${row.checklist_item_id}`,
    category: `${row.category ?? ''}`.trim() || 'Checklist',
    reason: typeof row.reason === 'string' && row.reason.trim() !== '' ? row.reason.trim() : undefined,
  }))
}

export function resolveChecklistWorkflowReadiness(options: ResolveChecklistWorkflowOptions): TradeChecklistReadiness {
  if (options.executionSnapshot?.frozen) {
    const failedRuleIds = Array.isArray(options.executionSnapshot.failed_rule_ids)
      ? options.executionSnapshot.failed_rule_ids.filter((value) => Number.isInteger(value) && value > 0)
      : []

    return {
      status: failedRuleIds.length > 0 ? 'not_ready' : 'ready',
      completed_required: failedRuleIds.length > 0 ? 0 : options.readiness.total_required,
      total_required: options.readiness.total_required,
      missing_required: failedRuleIds.map((ruleId, index) => ({
        checklist_item_id: ruleId,
        title: options.executionSnapshot?.failed_rule_titles[index] || `Rule #${ruleId}`,
        category: 'Checklist',
        reason: 'Rule failed in the saved execution snapshot.',
      })),
      ready: failedRuleIds.length === 0,
    }
  }

  return options.serverReadiness ?? options.readiness
}

export function resolveChecklistWorkflowFailures(options: ResolveChecklistWorkflowOptions): TradeChecklistWorkflowFailure[] {
  if (options.executionSnapshot?.frozen && options.executionSnapshot.failed_rule_ids.length > 0) {
    return options.executionSnapshot.failed_rule_ids.map((ruleId, index) => ({
      checklist_item_id: Number(ruleId),
      title: options.executionSnapshot?.failed_rule_titles[index] || `Rule #${ruleId}`,
      category: 'Checklist',
      reason: 'Rule failed in the saved execution snapshot.',
    }))
  }

  if (Array.isArray(options.serverReadinessReasons) && options.serverReadinessReasons.length > 0) {
    return normalizeWorkflowFailures(options.serverReadinessReasons)
  }

  const effectiveReadiness = resolveChecklistWorkflowReadiness(options)
  return normalizeWorkflowFailures(effectiveReadiness.missing_required)
}

export function deriveTradeFollowedRules(
  hasChecklist: boolean,
  fallbackFollowedRules: boolean,
  options: ResolveChecklistWorkflowOptions
): boolean {
  if (!hasChecklist) {
    return fallbackFollowedRules
  }

  return resolveChecklistWorkflowReadiness(options).ready
}
