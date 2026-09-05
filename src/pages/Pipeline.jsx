import { Link } from 'react-router'
import { useLeads } from '../hooks/useLeads.js'
import { LEAD_STATUSES, STATUS_LABELS } from '../lib/schemas.js'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PipelineColumn from '../components/pipeline/PipelineColumn.jsx'

/**
 * Sales Pipeline (Phase 4 Stage 5) — a view over the SAME lead data as
 * the Leads page. Loads the user's authorized leads ONCE via useLeads()
 * (one request; RLS decides which rows arrive) and groups them
 * client-side by status. Read-only: status changes stay in the edit
 * flow; this board has no write actions.
 *
 * States: loading → error+retry → page-level empty (no leads at all) →
 * six columns. Column count/totals are derived, never hard-coded.
 */
export default function Pipeline() {
  const { leads, isLoading, error, refresh } = useLeads()

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link
        to="/dashboard"
        className="text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        ← Dashboard
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-bold text-slate-900">Sales Pipeline</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track your leads through every stage of the sales process.
        </p>
      </div>

      {isLoading && (
        <div className="mt-16 flex justify-center">
          <Spinner />
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">
            Couldn&rsquo;t load your pipeline.
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
            icon="🗂️"
            title="No leads in your pipeline yet."
            description="Create your first lead to start filling out your sales pipeline."
            action={
              <Link
                to="/leads/new"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Create Lead
              </Link>
            }
          />
        </div>
      )}

      {!isLoading && !error && leads !== null && leads.length > 0 && (
        <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((status) => (
            <PipelineColumn
              key={status}
              label={STATUS_LABELS[status]}
              leads={leads.filter((lead) => lead.status === status)}
            />
          ))}
        </div>
      )}
    </main>
  )
}