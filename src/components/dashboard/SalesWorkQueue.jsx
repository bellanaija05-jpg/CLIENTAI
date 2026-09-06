import { Link } from 'react-router'
import PriorityBadge from '../leads/PriorityBadge.jsx'
import { formatDateKey, formatValue } from '../../utils/format.js'
import Spinner from '../ui/Spinner.jsx'
import PanelError from './PanelError.jsx'
import { STATUS_LABELS } from '../../lib/schemas.js'
import {
  ACTION_LABELS,
  ACTION_ROUTES,
  ACTION_BUTTON_CLASSES,
} from './actionRoutes.js'

// ---------------------------------------------------------------------------
// Today's Sales Work (Phase 8 Stage 2)
//
// The Dashboard's daily work QUEUE, complementing the "Today's Sales
// Focus" panel above it:
//
//   Focus → "Who deserves my attention?"   (ranked leads + reasons)
//   Work  → "What work do I complete?"     (pending tasks, one action each)
//
// It shows the user's ACTUAL pending sales tasks, derived from data the
// Dashboard already fetched — no requests and no scoring happen here:
//
//   1. Follow-ups          — overdue first, then due today. The page
//      bucketed them with the engine's bucketPendingFollowUps(); completed
//      rows can never reach this panel, and due state is due_date only.
//   2. Sales opportunities — the engine's ranked, actionable attention
//      leads (computeNeedsAttention + computeNextAction), minus leads whose
//      pending follow-up task is already shown above, so a lead's work is
//      represented once.
//
// Counts come from computeSalesMetrics(), so the capped lists below never
// hide the real total. Closed (WON/LOST) leads never appear — the engine's
// attention list excludes them.
// ---------------------------------------------------------------------------

// Chip tones for the workload summary row. Zero counts stay neutral so
// the eye goes straight to whatever actually has work behind it.
const CHIP_TONES = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-500',
  red: 'border-red-200 bg-red-50 text-red-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
}

function CountChip({ label, value, tone = 'neutral' }) {
  return (
    <li
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${CHIP_TONES[tone]}`}
    >
      {label}
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  )
}

// Small uppercase group label, matching the dashboard's "Sales summary"
// heading style.
function GroupLabel({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </h3>
  )
}

// One pending follow-up task. Presentation only: title, lead, value, due
// state (from the page's due_date math — never recomputed here), and a
// handoff to the lead's EXISTING follow-up section. No duplicate editor
// lives on the Dashboard.
function FollowUpTaskRow({ task }) {
  const isOverdue = task.daysOverdue > 0

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {task.title}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          <Link
            to={`/leads/${task.lead_id}`}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            {task.leadName}
          </Link>
          {Number(task.leadValue ?? 0) > 0 && (
            <> · {formatValue(task.leadValue)}</>
          )}
          {' · '}
          <span
            className={
              isOverdue ? 'font-medium text-red-600' : 'font-medium text-amber-600'
            }
          >
            {isOverdue
              ? `Overdue by ${task.daysOverdue} ${
                  task.daysOverdue === 1 ? 'day' : 'days'
                }`
              : 'Due today'}
          </span>
        </p>
      </div>

      {/* DO IT (Stage 5) — an obvious primary button into the lead's
          EXISTING Follow-Ups section (same ?section= route as before). */}
      <Link
        to={`/leads/${task.lead_id}?section=follow-ups`}
        aria-label={`View follow-up for ${task.leadName}`}
        className={`${ACTION_BUTTON_CLASSES} self-start sm:self-center`}
      >
        View Follow-Up
      </Link>
    </li>
  )
}

// One actionable opportunity lead. Same navigation model as the Focus
// panel: the engine's next-action kind maps to the existing Lead Details
// section that owns the workflow (follow-ups, AI generator, activities).
// Stage 5: the row also shows the engine's own recommended step, and the
// handoff is an obvious primary button rather than a plain text link.
function OpportunityRow({ item }) {
  const lead = item.lead
  const kind = item.nextAction?.kind
  const actionRoute =
    kind && ACTION_ROUTES[kind] ? ACTION_ROUTES[kind](lead.id) : `/leads/${lead.id}`
  const actionLabel =
    kind && ACTION_LABELS[kind] ? ACTION_LABELS[kind] : 'View Lead'

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={item.priority} />
          <Link
            to={`/leads/${lead.id}`}
            className="truncate text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline"
          >
            {lead.name}
          </Link>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {STATUS_LABELS[lead.status] ?? lead.status}
          {Number(lead.value ?? 0) > 0 && <> · {formatValue(lead.value)}</>}
        </p>
        {/* WHAT NEXT — the engine's own recommended step, unchanged. */}
        {item.nextAction?.label && (
          <p className="mt-1 text-sm font-medium text-slate-800">
            Recommended: {item.nextAction.label}
          </p>
        )}
      </div>

      {/* DO IT — the obvious primary action into the existing workflow. */}
      <Link
        to={actionRoute}
        aria-label={`${actionLabel} for ${lead.name}`}
        className={`${ACTION_BUTTON_CLASSES} self-start sm:self-center`}
      >
        {actionLabel}
      </Link>
    </li>
  )
}

/**
 * Dashboard "Today's Sales Work" panel (Phase 8 Stage 2).
 *
 * PRESENTATIONAL: the page buckets pending follow-ups via the engine
 * (bucketPendingFollowUps), reuses the attention list already computed
 * for the Focus panel, and passes truthful counts from
 * computeSalesMetrics(). States: loading (spinner) → error + retry →
 * combined "all caught up" positive empty state → the work queue.
 */
export default function SalesWorkQueue({
  followUpTasks,
  nextUpcoming,
  opportunityItems,
  counts,
  isLoading,
  error,
  onRetry,
}) {
  const hasFollowUpWork = followUpTasks.length > 0
  const hasOpportunityWork = opportunityItems.length > 0
  const hasWork = hasFollowUpWork || hasOpportunityWork

  return (
    <section
      aria-label="Today's sales work"
      className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Today&rsquo;s Sales Work
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            The sales tasks waiting for you today.
          </p>
        </div>
        <Link
          to="/follow-ups"
          className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          View all →
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {!isLoading && error && (
        <PanelError
          message="Couldn&rsquo;t load today&rsquo;s sales work."
          onRetry={onRetry}
        />
      )}

      {!isLoading && !error && (
        <>
          {/* Workload at a glance — engine-derived counts. */}
          <ul className="mt-4 flex flex-wrap gap-2">
            <CountChip
              label="Overdue"
              value={counts.overdue}
              tone={counts.overdue > 0 ? 'red' : 'neutral'}
            />
            <CountChip
              label="Due today"
              value={counts.dueToday}
              tone={counts.dueToday > 0 ? 'amber' : 'neutral'}
            />
            <CountChip
              label="High priority"
              value={counts.highPriority}
              tone={counts.highPriority > 0 ? 'violet' : 'neutral'}
            />
          </ul>

          {!hasWork ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-sm font-medium text-emerald-800">
                You&rsquo;re all caught up.
              </p>
              {nextUpcoming && (
                <p className="mt-1 text-xs text-emerald-700">
                  Next follow-up: {nextUpcoming.title} — due{' '}
                  {formatDateKey(nextUpcoming.due_date)}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <div>
                <GroupLabel>Follow-ups</GroupLabel>
                {hasFollowUpWork ? (
                  <ul className="mt-2 space-y-2">
                    {followUpTasks.map((task) => (
                      <FollowUpTaskRow key={task.id} task={task} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">
                    No follow-ups due today.
                  </p>
                )}
              </div>

              <div>
                <GroupLabel>Sales opportunities</GroupLabel>
                {hasOpportunityWork ? (
                  <ul className="mt-2 space-y-2">
                    {opportunityItems.map((item) => (
                      <OpportunityRow key={item.lead.id} item={item} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">
                    No high-priority sales work right now.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

