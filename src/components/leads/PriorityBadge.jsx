import { PRIORITY_LABELS } from '../../lib/leadIntelligence.js'

// Color mapping for the three priority tiers. Like StatusBadge, a value
// missing from the map renders nothing at all — for a priority that
// means closed leads (priority === null) and any unexpected value.
const STYLES = {
  HIGH: 'border-red-200 bg-red-50 text-red-700',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
  LOW: 'border-slate-200 bg-slate-100 text-slate-500',
}

/**
 * Small colored pill for a lead priority (Phase 6 Stage 1).
 * Pure presentation; mirrors StatusBadge's visual language.
 *
 * Accessibility: never color alone — the visible word (High/Medium/Low)
 * IS the distinction, so screen readers and colorblind users both get it.
 * Closed leads (priority null) render nothing, matching how the
 * intelligence engine treats them.
 */
export default function PriorityBadge({ priority }) {
  const styles = STYLES[priority]
  if (!styles) return null

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  )
}