import { formatValue } from '../../utils/format.js'

// Bar fill per stage — mirrors StatusBadge's hue per status. The bar is
// decorative (aria-hidden): the count next to it is the accessible data.
const BAR_COLORS = {
  NEW: 'bg-slate-400',
  CONTACTED: 'bg-blue-500',
  QUALIFIED: 'bg-violet-500',
  PROPOSAL: 'bg-amber-500',
  WON: 'bg-emerald-500',
  LOST: 'bg-red-400',
}

/**
 * Dashboard "Pipeline by stage" section (Phase 6 Stage 2).
 *
 * Pure presentation over computeSalesMetrics().pipelineByStage — counts
 * and values are engine-derived, labels come from the canonical
 * STATUS_LABELS via the engine. The bar length is relative to the
 * largest stage count; plain Tailwind divs, no chart library.
 */
export default function PipelineByStage({ stages }) {
  const maxCount = Math.max(...stages.map((stage) => stage.count), 0)

  return (
    <section
      aria-label="Pipeline by stage"
      className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-slate-800">
        Pipeline by stage
      </h2>

      <ul className="mt-4 space-y-3">
        {stages.map((stage) => {
          const percent =
            maxCount > 0 ? Math.round((stage.count / maxCount) * 100) : 0
          return (
            <li key={stage.status} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-slate-600">
                {stage.label}
              </span>
              <div
                className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100"
                aria-hidden="true"
              >
                <div
                  className={`h-full rounded-full ${BAR_COLORS[stage.status] ?? 'bg-slate-400'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">
                {stage.count}
              </span>
              <span className="hidden w-20 shrink-0 text-right text-xs tabular-nums text-slate-400 sm:block">
                {formatValue(stage.value)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}