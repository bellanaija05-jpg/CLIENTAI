import { Link } from 'react-router'
import PriorityBadge from '../leads/PriorityBadge.jsx'
import { formatValue } from '../../utils/format.js'
import Spinner from '../ui/Spinner.jsx'
import PanelError from './PanelError.jsx'
import { STATUS_LABELS } from '../../lib/schemas.js'
import { ACTION_LABELS, ACTION_ROUTES } from './actionRoutes.js'

// One lead row inside the Daily Sales Focus panel. PURE presentation —
// the ranking, priority, reason, and next action were all computed by
// the intelligence engine (computeNeedsAttention + computeNextAction)
// in the page; this component only renders them and hands the user off
// to the correct existing workflow.
function AttentionItem({ item }) {
  const lead = item.lead
  const value = Number(lead.value ?? 0)
  const action = item.nextAction
  const kind = action?.kind

  // The primary action: action-aware when the engine gave us a known
  // kind, otherwise "View Lead" (safe fallback for 'none' and any
  // unexpected kind — the reason text still explains the situation).
  const actionRoute =
    kind && ACTION_ROUTES[kind] ? ACTION_ROUTES[kind](lead.id) : `/leads/${lead.id}`
  const actionLabel =
    kind && ACTION_LABELS[kind] ? ACTION_LABELS[kind] : 'View Lead'

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={item.priority} />
            <Link
              to={`/leads/${lead.id}`}
              className="truncate text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline"
            >
              {lead.name}
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {STATUS_LABELS[lead.status] ?? lead.status}
            {value > 0 && <> · {formatValue(value)}</>}
          </p>
          <p className="mt-1.5 text-sm font-medium text-slate-800">
            {action?.label ?? ''}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {item.detail ? `${item.reason} — ${item.detail}` : item.reason}
          </p>
        </div>

        <Link
          to={actionRoute}
          className="shrink-0 self-center text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          {actionLabel} →
        </Link>
      </div>
    </li>
  )
}

/**
 * Dashboard "Needs attention" panel (Phase 6 Stage 2).
 *
 * Pure presentation over the intelligence engine's output: the page
 * derives the ranked items with computeNeedsAttention() (capped with
 * NEEDS_ATTENTION_LIMIT) and enriches each with computeNextAction()'s
 * recommendation — no scoring logic lives here.
 *
 * States: loading (spinner) → error + retry → no leads at all →
 * "all caught up" positive empty state → ranked, actionable items.
 */
export default function NeedsAttentionPanel({
  items,
  hasLeads,
  isLoading,
  error,
  onRetry,
}) {
  return (
    <section
      aria-label="Today's sales focus"
      className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Today&rsquo;s Sales Focus
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Here are the leads that deserve your attention today.
          </p>
        </div>
        <Link
          to="/leads"
          className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          View all →
        </Link>
      </div>

      <div className="mt-4">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

        {!isLoading && error && (
          <PanelError message="Couldn&rsquo;t load today&rsquo;s sales focus." onRetry={onRetry} />
        )}

        {!isLoading && !error && !hasLeads && (
          <p className="py-6 text-center text-sm text-slate-400">
            No leads yet.{' '}
            <Link
              to="/leads/new"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Create your first lead
            </Link>
            .
          </p>
        )}

        {!isLoading && !error && hasLeads && items.length === 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-sm font-medium text-emerald-800">
              All caught up — no leads need immediate attention today.
            </p>
          </div>
        )}

        {!isLoading && !error && hasLeads && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((item) => (
              <AttentionItem key={item.lead.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}