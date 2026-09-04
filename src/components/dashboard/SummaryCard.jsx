import { Link } from 'react-router'

/**
 * A single dashboard summary card. `value` is the derived statistic;
 * `to` optionally makes the whole card a navigation link (Leads,
 * Pipeline, etc.). The card never calls Supabase itself — it displays
 * whatever the parent computed.
 */
export default function SummaryCard({ label, value, to = null }) {
  const content = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
        {value}
      </p>
    </>
  )

  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

  if (to) {
    return (
      <Link to={to} className={`${cardClass} block transition hover:border-brand-200 hover:shadow`}>
        {content}
      </Link>
    )
  }
  return <div className={cardClass}>{content}</div>
}