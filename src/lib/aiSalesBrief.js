import { STATUS_LABELS } from './schemas.js'
import { PRIORITY_LABELS } from './leadIntelligence.js'

/**
 * AI Sales Brief context builder (Phase 8 Stage 4).
 *
 * PURE helper whose ONLY job is to reshape facts the Dashboard has
 * ALREADY computed (computeSalesMetrics, computeNeedsAttention,
 * computeNextAction, bucketPendingFollowUps) into the compact,
 * AI-safe context object sent to the generate-sales-brief Edge
 * Function.
 *
 * Hard boundaries:
 *   - No network calls, no React, no Supabase, no API keys.
 *   - No scoring logic and no duplicated priority rules — priority,
 *     ranking, reasons, and next actions arrive here already computed
 *     by the intelligence engine. This module only renames/trims them.
 *   - Only fields the AI genuinely needs. No auth data, no ids, no
 *     notes, no emails — the brief describes the DAY, not the records.
 */

// Sanity caps for the context payload. The Dashboard already slices its
// lists (NEEDS_ATTENTION_LIMIT / WORK_QUEUE_*_LIMIT); these are defensive
// ceilings so the payload can never grow unbounded if those change.
const MAX_ATTENTION_ITEMS = 10
const MAX_WORK_TASKS = 10

/**
 * Build the structured brief context from the Dashboard's derived data.
 *
 * Inputs are exactly the values Dashboard.jsx already derives:
 *   todayKey       — "YYYY-MM-DD" the brief is for.
 *   metrics        — computeSalesMetrics() result.
 *   attentionItems — computeNeedsAttention() items (already capped by
 *                    NEEDS_ATTENTION_LIMIT), each enriched with
 *                    computeNextAction() as `nextAction`.
 *   followUpTasks  — the page's pending follow-up task list (overdue +
 *                    due today, already capped by WORK_QUEUE_FOLLOW_UP_LIMIT).
 */
export function buildSalesBriefContext({
  todayKey,
  metrics,
  attentionItems,
  followUpTasks,
}) {
  return {
    generatedFor: todayKey,
    salesMetrics: {
      totalLeads: metrics.totalLeads,
      openLeads: metrics.openLeads,
      pipelineValue: metrics.pipelineValue,
      wonRevenue: metrics.wonRevenue,
      highPriorityLeads: metrics.highPriorityLeads,
      overdueFollowUps: metrics.overdueFollowUps,
      dueTodayFollowUps: metrics.dueTodayFollowUps,
    },
    attentionItems: (attentionItems ?? [])
      .slice(0, MAX_ATTENTION_ITEMS)
      .map((item) => ({
        name: item.lead.name,
        status: STATUS_LABELS[item.lead.status] ?? item.lead.status,
        value: Number(item.lead.value ?? 0),
        priority: PRIORITY_LABELS[item.priority] ?? item.priority,
        reason: item.detail ? `${item.reason} — ${item.detail}` : item.reason,
        recommendedAction: item.nextAction?.label ?? null,
      })),
    workQueue: {
      overdueFollowUps: metrics.overdueFollowUps,
      dueTodayFollowUps: metrics.dueTodayFollowUps,
      tasks: (followUpTasks ?? []).slice(0, MAX_WORK_TASKS).map((task) => ({
        title: task.title,
        leadName: task.leadName,
        dueDate: task.due_date,
        daysOverdue: task.daysOverdue,
      })),
    },
  }
}

/**
 * Deterministic empty-state check: is there anything genuinely worth
 * briefing? Used by the UI so an "all caught up" day never spends an AI
 * request. Deliberately the same signals the Dashboard panels already
 * show — no new thresholds, no second scoring system.
 */
export function hasMeaningfulSalesSignals({ attentionItems, metrics }) {
  return (
    (attentionItems?.length ?? 0) > 0 ||
    metrics.overdueFollowUps > 0 ||
    metrics.dueTodayFollowUps > 0
  )
}
