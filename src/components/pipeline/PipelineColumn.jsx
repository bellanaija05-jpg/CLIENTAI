import { formatValue } from '../../utils/format.js'
import LeadCard from './LeadCard.jsx'

/**
 * One pipeline stage column. The count and deal-value total are DERIVED
 * from the leads passed in (never hard-coded). Shows a subtle "No leads"
 * empty state rather than an error when the stage is empty.
 */
export default function PipelineColumn({ label, leads }) {
  const total = leads.reduce((sum, lead) => sum + Number(lead.value ?? 0), 0)

  return (
    <section className="w-64 shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-800">
          {label}{' '}
          <span className="text-xs text-slate-400">({leads.length})</span>
        </h2>
        <p className="text-xs tabular-nums text-slate-500">
          {formatValue(total)}
        </p>
      </header>
      {leads.length === 0 ? (
        <p className="px-3 py-8 text-center text-xs text-slate-400">
          No leads
        </p>
      ) : (
        <ul className="space-y-2 px-2 py-2">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </ul>
      )}
    </section>
  )
}