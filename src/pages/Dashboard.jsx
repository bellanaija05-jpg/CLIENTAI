import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth.js'
import { useLeads } from '../hooks/useLeads.js'
import { useMyFollowUps } from '../hooks/useMyFollowUps.js'
import {
  formatDate,
  formatDateKey,
  formatValue,
  todayDateKey,
} from '../utils/format.js'
import StatusBadge from '../components/leads/StatusBadge.jsx'
import DashboardSummary from '../components/dashboard/DashboardSummary.jsx'
import Spinner from '../components/ui/Spinner.jsx'

// Shared card shell for the two panels below, so they look identical
// (title + "View all" link + body). Pure layout — no data logic.
function Panel({ title, viewAllTo, children }) {
  return (
    <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <Link
          to={viewAllTo}
          className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          View all →
        </Link>
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  )
}

// Shared panel error state (retry re-runs the page-level hook).
function PanelError({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
      <p className="text-sm font-medium text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  )
}

// The five most recently created leads. listMyLeads() already returns
// newest-first, so "recent" is just the head of the array — no extra
// Supabase request, no re-sorting.
function RecentLeadsPanel({ leads, isLoading, error, onRetry }) {
  return (
    <Panel title="Recent leads" viewAllTo="/leads">
      {isLoading && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {!isLoading && error && (
        <PanelError message="Couldn&rsquo;t load recent leads." onRetry={onRetry} />
      )}

      {!isLoading && !error && (leads ?? []).length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">
          No leads yet.{' '}
          <Link
            to="/leads/new"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Create your first lead
          </Link>
          .
        </p>
      )}

      {!isLoading && !error && (leads ?? []).length > 0 && (
        <ul className="divide-y divide-slate-100">
          {leads.slice(0, 5).map((lead) => (
            <li
              key={lead.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <Link
                  to={`/leads/${lead.id}`}
                  className="block truncate text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                >
                  {lead.name}
                </Link>
                <p className="text-xs text-slate-400">
                  Added {formatDate(lead.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusBadge status={lead.status} />
                <span className="text-sm tabular-nums text-slate-700">
                  {formatValue(lead.value)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

// Overdue + due-today follow-ups, earliest due first. Derived from the
// same useMyFollowUps fetch as the summary card — no extra request.
function FollowUpsPanel({ followUps, isLoading, error, onRetry }) {
  const todayKey = todayDateKey()
  const due = (followUps ?? [])
    .filter((followUp) => !followUp.completed && followUp.due_date <= todayKey)
    .slice(0, 5)

  return (
    <Panel title="Needs attention" viewAllTo="/follow-ups">
      {isLoading && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {!isLoading && error && (
        <PanelError
          message="Couldn&rsquo;t load your follow-ups."
          onRetry={onRetry}
        />
      )}

      {!isLoading && !error && due.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">
          Nothing due right now. Overdue and due-today follow-ups will appear
          here.
        </p>
      )}

      {!isLoading && !error && due.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {due.map((followUp) => (
            <li key={followUp.id} className="py-2.5 first:pt-0 last:pb-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {followUp.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                <Link
                  to={`/leads/${followUp.lead_id}`}
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  {followUp.leads?.name ?? 'Lead'}
                </Link>
                {' · '}
                {followUp.due_date < todayKey
                  ? `Overdue — due ${formatDateKey(followUp.due_date)}`
                  : 'Due today'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/**
 * Dashboard (Phase 4 close-out — replaces the Phase 1 stub).
 *
 * The page owns the TWO data fetches (leads + follow-ups, both RLS-
 * scoped via the existing hooks) and shares them with the summary, so
 * the whole dashboard costs exactly two requests. Everything else is
 * derived client-side. All loading/error/empty states follow the
 * existing app patterns; a failure in one panel never breaks another.
 */
export default function Dashboard() {
  const { profile, isLoading: authLoading } = useAuth()
  const {
    leads,
    isLoading: leadsLoading,
    error: leadsError,
    refresh: refreshLeads,
  } = useLeads()
  const {
    followUps,
    isLoading: followUpsLoading,
    error: followUpsError,
    refresh: refreshFollowUps,
  } = useMyFollowUps()

  if (authLoading) return <Spinner fullScreen />

  const firstName = profile?.full_name?.trim().split(/\s+/)[0]

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          {firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {profile?.business_name
            ? `${profile.business_name} — here is where your CRM stands today.`
            : 'Here is where your CRM stands today.'}
        </p>
      </header>

      <section className="mt-8" aria-label="Sales summary">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Sales summary
        </h2>
        <div className="mt-4">
          <DashboardSummary
            leads={leads}
            leadsLoading={leadsLoading}
            leadsError={leadsError}
            onRetryLeads={refreshLeads}
            followUps={followUps}
            followUpsLoading={followUpsLoading}
            followUpsError={followUpsError}
            onRetryFollowUps={refreshFollowUps}
          />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <RecentLeadsPanel
          leads={leads}
          isLoading={leadsLoading}
          error={leadsError}
          onRetry={refreshLeads}
        />
        <FollowUpsPanel
          followUps={followUps}
          isLoading={followUpsLoading}
          error={followUpsError}
          onRetry={refreshFollowUps}
        />
      </div>

      {profile === null && (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Profile row not loaded — if this stays empty, check that migration
          0001_create_profiles.sql has been applied.
        </p>
      )}
    </main>
  )
}
