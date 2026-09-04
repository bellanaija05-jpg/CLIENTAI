import { Link, useParams } from 'react-router'
import StatusBadge from '../components/leads/StatusBadge.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useLead } from '../hooks/useLead.js'
import { formatDate, formatValue } from '../utils/format.js'

// One labelled row inside an information card. A tiny local helper —
// not exported, so it stays private to this page.
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
      <dt className="w-32 shrink-0 text-sm font-medium text-slate-500">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  )
}

/**
 * Lead details page (Phase 4 Stage 1) — VIEW ONLY.
 *
 * Reuses getLead()/useLead() exactly like the edit page: RLS decides
 * whether the id from the URL is visible, and a foreign/missing lead is
 * indistinguishable "not found". Editing navigates to the existing edit
 * page; no form, no delete, no activities here (later stages).
 */
export default function LeadDetail() {
  const { leadId } = useParams()
  const { lead, isLoading, error, notFound, refresh } = useLead(leadId)

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        to="/leads"
        className="text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        ← Back to Leads
      </Link>

      {isLoading && (
        <div className="mt-16 flex justify-center">
          <Spinner />
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">
            Couldn&rsquo;t load this lead.
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

      {!isLoading && !error && notFound && (
        <div className="mt-10">
          <EmptyState
            icon="🔍"
            title="Lead not found"
            description="This lead doesn't exist — or it belongs to a different account. Either way, it can't be viewed from here."
          />
        </div>
      )}

      {!isLoading && !error && lead && (
        <>
          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {lead.name}
                </h1>
                <StatusBadge status={lead.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {lead.company || 'No company'}
              </p>
            </div>
            <Link
              to={`/leads/${lead.id}/edit`}
              className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Edit Lead
            </Link>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Contact information
              </h2>
              <dl className="mt-4 space-y-3">
                <Field label="Email">{lead.email || '—'}</Field>
                <Field label="Phone">{lead.phone || '—'}</Field>
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Business information
              </h2>
              <dl className="mt-4 space-y-3">
                <Field label="Company">{lead.company || '—'}</Field>
                <Field label="Source">{lead.source || '—'}</Field>
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Deal information
              </h2>
              <dl className="mt-4 space-y-3">
                <Field label="Deal value">{formatValue(lead.value)}</Field>
                <Field label="Status">
                  <StatusBadge status={lead.status} />
                </Field>
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Metadata
              </h2>
              <dl className="mt-4 space-y-3">
                <Field label="Created">{formatDate(lead.created_at)}</Field>
                <Field label="Updated">{formatDate(lead.updated_at)}</Field>
                <Field label="Lead ID">
                  <span className="break-all font-mono text-xs">{lead.id}</span>
                </Field>
              </dl>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Notes
            </h2>
            {lead.notes ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                {lead.notes}
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No notes yet.</p>
            )}
          </section>

        </>
      )}
    </main>
  )
}
