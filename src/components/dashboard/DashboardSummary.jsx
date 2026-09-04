import { useLeads } from '../../hooks/useLeads.js'
import { useIncompleteFollowUps } from '../../hooks/useIncompleteFollowUps.js'
import { formatValue, todayDateKey } from '../../utils/format.js'
import Spinner from '../ui/Spinner.jsx'
import SummaryCard from './SummaryCard.jsx'

/**
 * The Dashboard "Sales summary" section (Phase 4 Stage 6).
 *
 * Real data only: loads the user's authorized leads ONCE (useLeads) and
 * their incomplete follow-ups ONCE (useIncompleteFollowUps). All six
 * numbers are DERIVED client-side from those arrays — no hard-coding,
 * no per-status requests, no mutation of the source arrays.
 *
 * Error isolation: a leads failure shows an error+retry in the lead
 * cards region while the Follow-Ups Due card still renders its own
 * data (and vice versa). The two data sources never destroy each other.
 */
export default function DashboardSummary() {
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
  } = useIncompleteFollowUps()

  // Never show misleading zeros while either source is still loading.
  if (leadsLoading || followUpsLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  // Derive the lead statistics. Open = not WON and not LOST.
  const list = leads ?? []
  let total = 0
  let open = 0
  let won = 0
  let lost = 0
  let pipelineValue = 0
  for (const lead of list) {
    total += 1
    if (lead.status === 'WON') {
      won += 1
    } else if (lead.status === 'LOST') {
      lost += 1
    } else {
      open += 1
      pipelineValue += Number(lead.value ?? 0)
    }
  }

  // Follow-Ups Due: incomplete (the hook only fetches those) with
  // due_date <= today. Date-key string comparison — timezone-safe.
  const dueCount = (followUps ?? []).filter(
    (followUp) => followUp.due_date <= todayDateKey(),
  ).length

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {leadsError ? (
        <div className="col-span-full rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-800">
            Couldn&rsquo;t load your lead statistics.
          </p>
          <p className="mt-1 text-sm text-red-600">{leadsError}</p>
          <button
            type="button"
            onClick={refreshLeads}
            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <SummaryCard label="Total Leads" value={total} to="/leads" />
          <SummaryCard label="Open Leads" value={open} to="/leads" />
          <SummaryCard label="Won Leads" value={won} to="/pipeline" />
          <SummaryCard label="Lost Leads" value={lost} to="/pipeline" />
          <SummaryCard
            label="Pipeline Value"
            value={formatValue(pipelineValue)}
            to="/leads"
          />
        </>
      )}

      {followUpsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-800">
            Couldn&rsquo;t load follow-up stats.
          </p>
          <p className="mt-1 text-sm text-red-600">{followUpsError}</p>
          <button
            type="button"
            onClick={refreshFollowUps}
            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      ) : (
        <SummaryCard label="Follow-Ups Due" value={dueCount} />
      )}
    </div>
  )
}