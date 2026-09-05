import PriorityBadge from './PriorityBadge.jsx'
import { PRIORITY_LABELS } from '../../lib/leadIntelligence.js'

// One "influencing signal" row inside the Lead Intelligence section.
// Each item is the engine's own plain-language reason string (from
// computeLeadInsights().reasons) — no facts are invented here.
function SignalItem({ label }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
      <span
        className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
        aria-hidden="true"
      />
      <span className="min-w-0 text-sm text-slate-700">{label}</span>
    </li>
  )
}

/**
 * Lead Intelligence — the Phase 6 Stage 3 section on Lead Details.
 *
 * EXPLICITLY PRESENTATIONAL. It never fetches, never calculates scoring,
 * and never calls the intelligence engine itself: the page computes the
 * insights once via computeLeadInsights() (the engine's own aggregator
 * of computeLeadPriority() + computeNextAction()) and passes the result
 * down as `insights`. This component only lays it out, so the engine
 * stays the single source of truth for every rule and reason.
 *
 * The action affordances only re-use mechanics the page already owns:
 *   view-follow-ups   → onGoToFollowUps (scroll/focus the existing
 *                       Follow-Ups section + open its inline form)
 *   generate-ai       → onGoToAi (scroll/focus the existing Phase 5 AI
 *                       Follow-Up Generator — never duplicated here)
 *   add-activity      → onGoToAddActivity (open the Activity form)
 *   add-follow-up     → onGoToAddFollowUp (open the Follow-Up form)
 * Any other / missing kind renders NO button — the label + description
 * are still shown as plain text, so nothing is ever invented.
 *
 * Closed leads (WON/LOST): the engine resolves them FIRST with
 * priority null / nextAction { kind: 'none' }, and the section respects
 * that exactly — no active-selling recommendation is ever shown.
 */
export default function LeadInsights({
  insights,
  onGoToFollowUps = null,
  onGoToAi = null,
  onGoToAddActivity = null,
  onGoToAddFollowUp = null,
}) {
  const { priority, nextAction, reasons, isClosed } = insights

  // What title does this lead visually carry? A closed lead has no
  // priority badge at all, so give the title an honest neutral one.
  const title =
    isClosed && nextAction.kind === 'none'
      ? 'This lead is closed'
      : `Priority: ${PRIORITY_LABELS[priority]}`

  // The recommended action for an open lead: label + description. Closed
  // leads (kind 'none' from the engine) are intentionally skipped.
  const showAction = !isClosed || nextAction.kind !== 'none'
  let actionButton = null
  if (showAction) {
    if (nextAction.kind === 'view-follow-ups' && onGoToFollowUps) {
      actionButton = (
        <button
          type="button"
          onClick={onGoToFollowUps}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {nextAction.label}
        </button>
      )
    } else if (nextAction.kind === 'generate-ai' && onGoToAi) {
      actionButton = (
        <button
          type="button"
          onClick={onGoToAi}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {nextAction.label}
        </button>
      )
    } else if (nextAction.kind === 'add-activity' && onGoToAddActivity) {
      actionButton = (
        <button
          type="button"
          onClick={onGoToAddActivity}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {nextAction.label}
        </button>
      )
    } else if (nextAction.kind === 'add-follow-up' && onGoToAddFollowUp) {
      actionButton = (
        <button
          type="button"
          onClick={onGoToAddFollowUp}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {nextAction.label}
        </button>
      )
    }
  }

  return (
    <section
      aria-label="Lead intelligence"
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Lead Intelligence
      </h2>

      {/* 1. Priority — the shared PriorityBadge, or a neutral title for
          closed leads. Priority is ALSO shown as text in the title, so
          meaning never relies on color alone. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {priority ? <PriorityBadge priority={priority} /> : null}
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>

      {/* 2. Why this lead matters — plain-language, engine-produced. */}
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-800">
          {reasons.length > 0
            ? reasons.join(' · ')
            : 'No active signals — this lead is in a neutral state.'}
        </p>
        {!isClosed && nextAction.kind !== 'none' && (
          <p className="mt-2 text-sm text-slate-500">
            {nextAction.description}
          </p>
        )}
      </div>

      {/* 3. Recommended next action — label + description + one affordance. */}
      {showAction && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {actionButton}
        </div>
      )}

      {/* 4. Which signals are influencing the recommendation. Only what
          the engine actually returned — nothing computed here. */}
      {reasons.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Influencing signals">
          {reasons.map((reason) => (
            <SignalItem key={reason} label={reason} />
          ))}
        </ul>
      )}
    </section>
  )
}