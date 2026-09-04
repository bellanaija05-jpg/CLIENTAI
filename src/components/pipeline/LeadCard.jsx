import { Link } from 'react-router'
import { formatValue } from '../../utils/format.js'

/**
 * A compact lead card inside a pipeline column. Shows the essentials
 * and links to the existing Lead Details page — full detail is NOT
 * duplicated here. Value is numeric in the DB (default 0), so the
 * fallback only guards a conceptually impossible null.
 */
export default function LeadCard({ lead }) {
  return (
    <li className="rounded-lg border border-slate-200 p-2.5">
      <Link
        to={`/leads/${lead.id}`}
        className="block break-words text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline"
      >
        {lead.name}
      </Link>
      {lead.company && (
        <p className="text-xs text-slate-500">{lead.company}</p>
      )}
      {lead.email && (
        <p className="break-all text-xs text-slate-500">{lead.email}</p>
      )}
      <p className="text-xs font-medium tabular-nums text-slate-700">
        {formatValue(lead.value)}
      </p>
    </li>
  )
}