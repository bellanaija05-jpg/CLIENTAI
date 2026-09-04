import { Link } from 'react-router'
import { useLeads } from '../hooks/useLeads.js'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { formatDate, formatValue } from '../utils/format.js'

/**
 * Leads list — Stage 1 of Phase 3.
 *
 * Deliberately read-only: create (Stage 2), edit (Stage 3), delete
 * (Stage 4), and search/filter (Stage 5) are added one at a time.
 * All four UI states come from useLeads(): loading, error, empty, list.
 */
export default function Leads() {
  const { leads, isLoading, error, refresh } = useLeads()

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link
        to="/dashboard"
        className="text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        ← Dashboard
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Everyone you are tracking, newest first.
          </p>
        </div>
        <Link
          to="/leads/new"
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          + Create Lead
        </Link>
      </div>

      {isLoading && (
        <div className="mt-16 flex justify-center">
          <Spinner />
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">
            Couldn&rsquo;t load your leads.
          </p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && leads !== null && leads.length === 0 && (
        <div className="mt-10">
          <EmptyState
            icon="🌱"
            title="No leads yet"
            description="Your pipeline is empty. Click the Create Lead button above to add your first lead — only your account will ever see it."
          />
        </div>
      )}

      {!isLoading && !error && leads !== null && leads.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {lead.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.company || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.phone || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{lead.status}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                    {formatValue(lead.value)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(lead.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/leads/${lead.id}/edit`}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
