import { STATUS_LABELS } from '../../lib/schemas.js'

// Color mapping for the six lead statuses (mirrors the DB enum in
// migration 0002). A defensive fallback covers any value the map
// doesn't know about — the status column is NOT NULL, but belt and
// braces costs one line.
const STYLES = {
  NEW: 'border-slate-200 bg-slate-100 text-slate-700',
  CONTACTED: 'border-blue-200 bg-blue-50 text-blue-700',
  QUALIFIED: 'border-violet-200 bg-violet-50 text-violet-700',
  PROPOSAL: 'border-amber-200 bg-amber-50 text-amber-700',
  WON: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  LOST: 'border-red-200 bg-red-50 text-red-700',
}

/**
 * Small colored pill for a lead status. Pure presentation. Used on the
 * Lead Details header and the Leads table.
 *
 * Launch polish: renders the canonical human-readable label (via
 * STATUS_LABELS — schemas.js's designated single source of status
 * naming, already used by the Pipeline column headers), not the raw
 * enum value — so the UI reads "New", not "NEW". The enum value stays
 * the fallback for any unknown status.
 */
export default function StatusBadge({ status }) {
  const styles =
    STYLES[status] ?? 'border-slate-200 bg-slate-100 text-slate-700'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
