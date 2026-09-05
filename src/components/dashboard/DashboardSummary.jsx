import { formatValue } from '../../utils/format.js'
import Spinner from '../ui/Spinner.jsx'
import SummaryCard from './SummaryCard.jsx'
import PanelError from './PanelError.jsx'

/**
 * The Dashboard "Sales summary" section (Phase 4 Stage 6; Phase 6 Stage 2
 * now renders the intelligence engine's metrics).
 *
 * PRESENTATIONAL: the page (Dashboard) owns the three data fetches
 * (leads, follow-ups, activity stamps — all RLS-scoped via existing
 * hooks) and derives `metrics` ONCE via computeSalesMetrics(); this
 * component only lays the numbers out as cards. No scoring, no requests.
 *
 * Error isolation: a leads failure replaces the six lead-derived cards
 * with error+retry while the High-Priority and Follow-Ups Due cards
 * still render their own data (and vice versa) — the three data sources
 * never destroy each other.
 */
export default function DashboardSummary({
  metrics,
  leadsLoading,
  leadsError,
  onRetryLeads,
  followUpsLoading,
  followUpsError,
  onRetryFollowUps,
  stampsLoading,
  stampsError,
  onRetryStamps,
}) {
  // Never show misleading zeros while any source is still loading (the
  // activity stamps feed the High-Priority count, so they count too).
  if (leadsLoading || followUpsLoading || stampsLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  // "Follow-Ups Due" keeps its established meaning: incomplete follow-ups
  // due today OR overdue (the Follow-ups page's first two buckets).
  const dueFollowUps = metrics.overdueFollowUps + metrics.dueTodayFollowUps

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {leadsError ? (
        <div className="col-span-full">
          <PanelError
            message="Couldn&rsquo;t load your lead statistics."
            onRetry={onRetryLeads}
          />
        </div>
      ) : (
        <>
          <SummaryCard label="Total Leads" value={metrics.totalLeads} to="/leads" />
          <SummaryCard label="Open Leads" value={metrics.openLeads} to="/leads" />
          <SummaryCard label="Won Deals" value={metrics.wonLeads} to="/pipeline" />
          <SummaryCard label="Lost Deals" value={metrics.lostLeads} to="/pipeline" />
          <SummaryCard
            label="Pipeline Value"
            value={formatValue(metrics.pipelineValue)}
            to="/pipeline"
          />
          <SummaryCard
            label="Won Value"
            value={formatValue(metrics.wonRevenue)}
            to="/pipeline"
          />
        </>
      )}

      {stampsError ? (
        <div>
          <PanelError
            message="Couldn&rsquo;t load lead priorities."
            onRetry={onRetryStamps}
          />
        </div>
      ) : (
        <SummaryCard
          label="High-Priority Leads"
          value={metrics.highPriorityLeads}
          to="/leads"
        />
      )}

      {followUpsError ? (
        <div>
          <PanelError
            message="Couldn&rsquo;t load follow-up stats."
            onRetry={onRetryFollowUps}
          />
        </div>
      ) : (
        <SummaryCard label="Follow-Ups Due" value={dueFollowUps} to="/follow-ups" />
      )}
    </div>
  )
}