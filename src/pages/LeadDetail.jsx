import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import ActivityTimeline from '../components/leads/ActivityTimeline.jsx'
import FollowUpList from '../components/leads/FollowUpList.jsx'
import LeadNotes from '../components/leads/LeadNotes.jsx'
import LeadQuickActions from '../components/leads/LeadQuickActions.jsx'
import AiFollowUpGenerator from '../components/leads/AiFollowUpGenerator.jsx'
import StatusBadge from '../components/leads/StatusBadge.jsx'
import LeadInsights from '../components/leads/LeadInsights.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useLead } from '../hooks/useLead.js'
import { useLeadActivities } from '../hooks/useLeadActivities.js'
import { useLeadFollowUps } from '../hooks/useLeadFollowUps.js'
import {
  computeLeadInsights,
} from '../lib/leadIntelligence.js'
import {
  emailHref,
  formatDate,
  formatValue,
  telHref,
  todayDateKey,
} from '../utils/format.js'

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
 * Lead details page (Phase 4) with contact actions and Quick Actions
 * (Stages 11–12).
 *
 * Reuses getLead()/useLead() exactly like the edit page: RLS decides
 * whether the id from the URL is visible, and a foreign/missing lead is
 * indistinguishable "not found". The primary Notes field can be edited
 * inline; all other lead editing stays on the existing edit page, while
 * Activities and Follow-Ups remain separate self-contained sections.
 * Email and phone, when present, are plain mailto:/tel: links, and the
 * header hosts a compact Quick Actions row that opens those same
 * existing forms rather than duplicating them.
 */
export default function LeadDetail() {
  const { leadId } = useParams()
  const { lead, isLoading, error, notFound, refresh } = useLead(leadId)
  // Phase 6 Stage 3 — Activity Timeline and Follow-Up List already load
  // this lead's activities + follow-ups via these two hooks. Lifting
  // them to the page means the page can derive the lead's intelligence
  // ONCE from data the existing sections ALREADY fetched — the
  // LeadInsights section therefore adds ZERO extra Supabase requests.
  const { activities, isLoading: activitiesLoading } = useLeadActivities(
    leadId,
  )
  const { followUps, isLoading: followUpsLoading } = useLeadFollowUps(leadId)

  // Quick Actions → existing inline forms. Each section keeps owning its
  // own form; the page only scrolls to it, moves focus there (so screen
  // readers announce the context), and bumps a signal counter that tells
  // the section to open its existing form. Nothing is saved on click.
  const [activitySignal, setActivitySignal] = useState(0)
  const [followUpSignal, setFollowUpSignal] = useState(0)
  const activitiesRef = useRef(null)
  const followUpsRef = useRef(null)
  const aiRef = useRef(null)

  function openActivitiesForm() {
    activitiesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activitiesRef.current?.focus({ preventScroll: true })
    setActivitySignal((signal) => signal + 1)
  }

  function openFollowUpsForm() {
    followUpsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    followUpsRef.current?.focus({ preventScroll: true })
    setFollowUpSignal((signal) => signal + 1)
  }

  // Phase 6 Stage 3 — the AI Follow-Up Generator already lives on this
  // page (Phase 5). This just scrolls to it + moves focus there, so the
  // engine's "generate-ai" next action can reach the existing generator
  // without duplicating it.
  function openAiGenerator() {
    aiRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    aiRef.current?.focus({ preventScroll: true })
  }

  // Phase 6 Stage 3 — derive the ONE intelligence object for this lead
  // from data this page already has (lead + activities + follow-ups).
  // The engine is the single source of truth: same inputs → same shape.
  // Gated on the activities + follow-ups finishing so the section never
  // flashes "never contacted" while the timeline is still loading.
  const insights =
    lead !== null && lead !== undefined && !activitiesLoading && !followUpsLoading
      ? computeLeadInsights(lead, {
          lastActivityAt: lastActivityAtFor(activities),
          followUps: followUps ?? [],
          todayKey: todayDateKey(),
        })
      : null

  // Latest activity timestamp for this lead's insights. Activities arrive
  // newest-first from the data layer; daysSinceTimestamp + timestampToDateKey
  // do the date-key math (activity timestamps, NOT updated_at — the engine
  // never treats updated_at as activity).
  function lastActivityAtFor(activityList) {
    if (!Array.isArray(activityList) || activityList.length === 0) return null
    return activityList[0]?.created_at ?? null
  }

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
            <LeadQuickActions
              leadId={lead.id}
              email={lead.email}
              phone={lead.phone}
              onAddActivity={openActivitiesForm}
              onAddFollowUp={openFollowUpsForm}
            />
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Contact information
              </h2>
              <dl className="mt-4 space-y-3">
                <Field label="Email">
                  {lead.email ? (
                    <a
                      href={emailHref(lead.email)}
                      className="font-medium text-brand-600 underline-offset-2 hover:text-brand-700 hover:underline"
                    >
                      {lead.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </Field>
                <Field label="Phone">
                  {lead.phone ? (
                    <a
                      href={telHref(lead.phone)}
                      className="font-medium text-brand-600 underline-offset-2 hover:text-brand-700 hover:underline"
                    >
                      {lead.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </Field>
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

          <LeadNotes
            key={lead.id}
            leadId={lead.id}
            notes={lead.notes}
            onSaved={refresh}
          />

          {/* Phase 6 Stage 3 — Lead Intelligence sits right after the
              notes so the "why + what next" explains the lead before the
              raw Activities/Follow-Ups/AI sections. It renders only once
              the lead's activities + follow-ups (and thus the derived
              insights) have loaded; otherwise a compact neutral loading
              hint. */}
          {insights !== null && (
            <LeadInsights
              key={lead.id}
              insights={insights}
              onGoToFollowUps={openFollowUpsForm}
              onGoToAi={openAiGenerator}
              onGoToAddActivity={openActivitiesForm}
              onGoToAddFollowUp={openFollowUpsForm}
            />
          )}
          {insights === null &&
            (activitiesLoading || followUpsLoading) && (
              <section
                aria-label="Lead intelligence"
                className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Lead Intelligence
                </h2>
                <p className="mt-4 text-sm text-slate-400">
                  Analysing this lead…
                </p>
              </section>
            )}

          <section
            ref={aiRef}
            tabIndex={-1}
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <AiFollowUpGenerator leadId={lead.id} />
          </section>

          <section
            ref={activitiesRef}
            tabIndex={-1}
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Activities
            </h2>
            <div className="mt-4">
              <ActivityTimeline leadId={lead.id} openSignal={activitySignal} />
            </div>
          </section>

          <section
            ref={followUpsRef}
            tabIndex={-1}
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Follow-Ups
            </h2>
            <div className="mt-4">
              <FollowUpList leadId={lead.id} openSignal={followUpSignal} />
            </div>
          </section>

        </>
      )}
    </main>
  )
}
