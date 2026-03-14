import { describe, expect, it } from 'vitest'
import {
  deriveTradeFollowedRules,
  resolveChecklistWorkflowFailures,
  resolveChecklistWorkflowReadiness,
} from '@/utils/tradeRuleWorkflow'
import type {
  TradeChecklistExecutionSnapshot,
  TradeChecklistReadiness,
  TradeChecklistResponsePayload,
} from '@/types/rules'

function readiness(ready: boolean): TradeChecklistReadiness {
  return {
    status: ready ? 'ready' : 'not_ready',
    completed_required: ready ? 2 : 1,
    total_required: 2,
    missing_required: ready
      ? []
      : [{
        checklist_item_id: 9,
        title: 'Risk cap confirmation',
        category: 'Risk',
        reason: 'Risk cap not acknowledged.',
      }],
    ready,
  }
}

function frozenSnapshot(failedRuleIds: number[] = [12]): TradeChecklistExecutionSnapshot {
  return {
    frozen: true,
    legacy_unfrozen: false,
    executed_checklist_id: 44,
    executed_checklist_version: 3,
    executed_enforcement_mode: 'strict',
    failed_rule_ids: failedRuleIds,
    failed_rule_titles: failedRuleIds.map((id) => `Rule #${id}`),
    check_evaluated_at: '2026-03-10T00:00:00Z',
  }
}

describe('tradeRuleWorkflow', () => {
  it('prefers server readiness over local readiness when available', () => {
    const resolved = resolveChecklistWorkflowReadiness({
      readiness: readiness(true),
      serverReadiness: readiness(false),
    })

    expect(resolved.ready).toBe(false)
    expect(resolved.missing_required[0]?.checklist_item_id).toBe(9)
  })

  it('prefers frozen execution snapshot failures over live readiness', () => {
    const resolved = resolveChecklistWorkflowReadiness({
      readiness: readiness(true),
      serverReadiness: readiness(true),
      executionSnapshot: frozenSnapshot([21]),
    })

    expect(resolved.ready).toBe(false)
    expect(resolved.missing_required[0]?.checklist_item_id).toBe(21)
  })

  it('uses explicit server failure reasons when provided', () => {
    const reasons: TradeChecklistResponsePayload['failing_rules'] = [{
      checklist_item_id: 33,
      title: 'Risk percent',
      category: 'Risk',
      reason: 'Risk exceeds configured cap.',
    }]

    const failures = resolveChecklistWorkflowFailures({
      readiness: readiness(true),
      serverReadiness: readiness(false),
      serverReadinessReasons: reasons,
    })

    expect(failures).toEqual([{
      checklist_item_id: 33,
      title: 'Risk percent',
      category: 'Risk',
      reason: 'Risk exceeds configured cap.',
    }])
  })

  it('derives followed_rules from checklist readiness when a checklist exists', () => {
    expect(deriveTradeFollowedRules(true, true, {
      readiness: readiness(true),
      serverReadiness: readiness(false),
    })).toBe(false)

    expect(deriveTradeFollowedRules(true, false, {
      readiness: readiness(true),
      serverReadiness: readiness(true),
    })).toBe(true)
  })

  it('falls back to provided followed_rules when no checklist exists', () => {
    expect(deriveTradeFollowedRules(false, true, {
      readiness: readiness(false),
    })).toBe(true)
  })
})
