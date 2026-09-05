import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth.js'
import { useLeads } from '../hooks/useLeads.js'
import { useMyFollowUps } from '../hooks/useMyFollowUps.js'
import { useMyActivityStamps } from '../hooks/useMyActivityStamps.js'
import {
  formatDate,
  formatDateKey,
  formatValue,
  todayDateKey,
} from '../utils/format.js'
import StatusBadge from '../components/leads/StatusBadge.jsx'
import DashboardSummary from '../components/dashboard/DashboardSummary.jsx'
import NeedsAttentionPanel from '../components/dashboard/NeedsAttentionPanel.jsx'
import PipelineByStage from '../components/dashboard/PipelineByStage.jsx'
import PanelError from '../components/dashboard/PanelError.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import {
  buildLastActivityMap,
  computeNeedsAttention,
  computeNextAction,
  computeSalesMetrics,
  EMPTY_FOLLOW_UP_SUMMARY,
  NEEDS_ATTENTION_LIMIT,
  summarizeFollowUpsByLead,
} from '../lib/leadIntelligence.js'

// Shared card shell for the panels below, so they look identical
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
// (Phase 6 Stage 2: title changed from "Needs attention" to avoid a
// duplicate heading with the new intelligence-powered panel above.)
function FollowUpsPanel({ followUps, isLoading, error, onRetry }) {
  const todayKey = todayDateKey()
  const due = (followUps ?? [])
    .filter((followUp) => !followUp.completed && followUp.due_date <= todayKey)
    .slice(0, 5)

  return (
    <Panel title="Follow-ups due" viewAllTo="/follow-ups">
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
 * Dashboard (Phase 6 Stage 2 — sales intelligence).
 *
 * The page owns the THREE data fetches (leads, follow-ups, activity
 * stamps — all RLS-scoped via the existing hooks) and derives all
 * intelligence ONCE via the engine in lib/leadIntelligence.js:
 * computeSalesMetrics() for the summary cards and the stage breakdown,
 * computeNeedsAttention() + computeNextAction() for the Needs Attention
 * panel. No scoring logic lives in this page or its components.
 *
 * The whole dashboard costs exactly three requests. Everything else is
 * derived client-side; all loading/error/empty states follow the existing
 * app patterns and a failure in one panel never breaks another.
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
  const {
    activityStamps,
    isLoading: stampsLoading,
    error: stampsError,
    refresh: refreshStamps,
  } = useMyActivityStamps()

  if (authLoading) return <Spinner fullScreen />

  // --- Derived intelligence (engine-owned, recomputed per render at this
  // data scale — the established no-memoization convention). Never shown
  // mid-load: panels gate on the loading flags before rendering these. ---
  const todayKey = todayDateKey()
  const leadsList = leads ?? []
  const followUpsList = followUps ?? []
  const lastActivityMap = buildLastActivityMap(activityStamps)
  const metrics = computeSalesMetrics(leadsList, followUpsList, todayKey, {
    lastActivityMap,
  })
  const followUpsByLead = summarizeFollowUpsByLead(followUpsList, todayKey)

  // Top attention items, each enriched with the engine's recommended
  // next action for that lead. computeNeedsAttention() returns the FULL
  // ranked list; the panel displays at most NEEDS_ATTENTION_LIMIT.
  const attentionItems = computeNeedsAttention(leadsList, {
    followUps: followUpsList,
    lastActivityMap,
    todayKey,
  })
    .slice(0, NEEDS_ATTENTION_LIMIT)
    .map((item) => ({
      ...item,
      nextAction: computeNextAction(item.lead, {
        lastActivityAt: lastActivityMap.get(item.lead.id) ?? null,
        followUpSummary:
          followUpsByLead.get(item.lead.id) ?? EMPTY_FOLLOW_UP_SUMMARY,
        todayKey,
      }),
    }))

  // Combined attention data state: the panel needs all three sources, so
  // any failure shows one error whose retry re-runs every fetch.
  const attentionIsLoading =
    leadsLoading || followUpsLoading || stampsLoading
  const attentionError = leadsError ?? followUpsError ?? stampsError
  const retryAttentionData = () => {
    refreshLeads()
    refreshFollowUps()
    refreshStamps()
  }

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

      {/* Today's Sales Focus is the Dashboard's primary actionable section.
          It reuses the SAME computed attention items (computeNeedsAttention +
          computeNextAction) already derived above; the panel only renders them
          with action-aware navigation to the correct existing workflow. */}
      <NeedsAttentionPanel
        items={attentionItems}
        hasLeads={leadsList.length > 0}
        isLoading={attentionIsLoading}
        error={attentionError}
        onRetry={retryAttentionData}
      />

      <section className="mt-8" aria-label="Sales summary">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Sales summary
        </h2>
        <div className="mt-4">
          <DashboardSummary
            metrics={metrics}
            leadsLoading={leadsLoading}
            leadsError={leadsError}
            onRetryLeads={refreshLeads}
            followUpsLoading={followUpsLoading}
            followUpsError={followUpsError}
            onRetryFollowUps={refreshFollowUps}
            stampsLoading={stampsLoading}
            stampsError={stampsError}
            onRetryStamps={refreshStamps}
          />
        </div>
      </section>

      {/* Stage breakdown is leads-derived only: show its own error when
          the leads fetch failed, and the real breakdown once loaded
          (honest zero rows are fine — "0 leads in a stage" is true). */}
      {!leadsLoading && leadsError && (
        <section
          aria-label="Pipeline by stage"
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-800">
            Pipeline by stage
          </h2>
          <div className="mt-4">
            <PanelError
              message="Couldn&rsquo;t load your pipeline stages."
              onRetry={refreshLeads}
            />
          </div>
        </section>
      )}
      {!leadsLoading && !leadsError && (
        <PipelineByStage stages={metrics.pipelineByStage} />
      )}

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
