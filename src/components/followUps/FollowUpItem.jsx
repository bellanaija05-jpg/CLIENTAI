import { Link } from 'react-router'
import { formatDateKey } from '../../utils/format.js'

/**
 * A compact follow-up row on the global Follow-Ups page. Shows the
 * title, optional description, clickable lead name (→ Lead Details),
 * due date, and a Mark Complete action. The page owns GROUPING — each
 * item is already placed in the right section, so the item itself never
 * recomputes status (no date logic here).
 */
export default function FollowUpItem({ followUp, onComplete, completingId }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {followUp.title}
          </p>
          {followUp.description && (
            <p className="mt-1 text-sm text-slate-600">{followUp.description}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            <Link
              to={`/leads/${followUp.lead_id}`}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              {followUp.leads?.name ?? 'Lead'}
            </Link>
            {' · Due '}
            {formatDateKey(followUp.due_date)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!followUp.completed && (
            <button
              type="button"
              onClick={() => onComplete(followUp.id)}
              disabled={completingId !== null}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {completingId === followUp.id ? 'Completing…' : 'Mark Complete'}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

