import { LEAD_STATUSES, STATUS_LABELS } from './schemas.js'

/**
 * Lead intelligence engine (Phase 6 Stage 1).
 *
 * The SINGLE home for every priority, needs-attention, next-action, and
 * sales-metric rule. Pages and components consume these functions — they
 * must never re-implement the rules locally (no duplicated business
 * logic across components).
 *
 * Design contract:
 *   - PURE and DETERMINISTIC. No React, no fetching, no clock: the
 *     current date always arrives as a `todayKey` ("YYYY-MM-DD", the
 *     existing date-key convention from utils/format.js) and every other
 *     input is plain data. Same inputs → same output, always.
 *   - WON and LOST are CLOSED states and are handled FIRST, before any
 *     open-lead rule ever runs. Closed leads get no priority, never
 *     appear in Needs Attention, and never produce a next action.
 *   - Every score/threshold is a named constant below. Never inline a
 *     number in a rule.
 *   - `leads.updated_at` is NEVER used as a last-activity signal (lead
 *     edits pollute it, and activity creation does not touch the lead
 *     row). Last activity always comes from activities.created_at via
 *     buildLastActivityMap().
 *   - Follow-up due dates are `date` columns handled as date KEYS with
 *     plain string comparison — exactly like FollowUps.jsx and
 *     DashboardSummary.jsx. No Date parsing, no timezone drift.
 */

// --- Public constants ------------------------------------------------------

export const PRIORITIES = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
}

// Canonical severity order — highest first. Used for ranking/sorting
// (priorityRank) and by the Leads list "Priority (high first)" sort.
export const PRIORITY_ORDER = ['HIGH', 'MEDIUM', 'LOW']

// Human-readable priority names (PriorityBadge and insights UI).
export const PRIORITY_LABELS = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

// A deal at or above this value counts as "high value".
export const HIGH_VALUE_THRESHOLD = 10000

// Staleness boundaries, EXPLICITLY defined:
//   "no activity for N days" = the last activity happened N or more full
//   calendar days before today (idleDays >= N, where an activity earlier
//   TODAY counts as 0 days idle). Boundaries are inclusive:
//     idle 0–6   → fresh
//     idle 7–13  → semi-stale (SEMI_STALE_AFTER_DAYS)
//     idle 14+   → stale (STALE_AFTER_DAYS)
export const SEMI_STALE_AFTER_DAYS = 7
export const STALE_AFTER_DAYS = 14

// A PROPOSAL-stage lead with no activity for this many days is treated
// as "proposal gone quiet" (next-action rule + Needs Attention rule 4).
export const PROPOSAL_STALE_AFTER_DAYS = 5

// An open follow-up due today or within this many days counts as
// "due soon" for scoring. Due TODAY qualifies (0 days until due).
export const FOLLOW_UP_SOON_DAYS = 2

// Score tiers: the summed signal points decide the priority tier
// (never the lead status alone — the status only contributes signals).
export const HIGH_PRIORITY_MIN_SCORE = 40
export const MEDIUM_PRIORITY_MIN_SCORE = 20

// Needs Attention panel capacity. computeNeedsAttention() deliberately
// returns the FULL ranked list; the UI slices with this constant so the
// count stays truthful (a capped count would understate the work).
export const NEEDS_ATTENTION_LIMIT = 5

// Points per scoring signal. Order below mirrors the rule table in the
// Phase 6 plan (strongest first).
const SIGNAL_POINTS = {
  OVERDUE_FOLLOW_UP: 40, // you promised to do something and did not
  PROPOSAL_STAGE: 25, // a decision is pending — where deals are won/lost
  STALE: 20, // conversation has gone cold (14+ days)
  NEVER_CONTACTED: 15, // nobody has ever recorded an activity
  HIGH_VALUE: 15, // bigger opportunity, bigger cost of dropping it
  SEMI_STALE: 10, // starting to cool (7–13 days)
  FOLLOW_UP_DUE_SOON: 10, // something scheduled is coming up
  NEW_STAGE: 5, // fresh lead, needs a first touch soon
}

// Plain-language explanation per signal — this is exactly what the Lead
// Insights UI renders as "why this priority", so keep them business-safe.
const SIGNAL_REASONS = {
  OVERDUE_FOLLOW_UP: 'Follow-up is overdue',
  PROPOSAL_STAGE: 'Proposal stage — awaiting a decision',
  STALE: `No activity in ${STALE_AFTER_DAYS}+ days`,
  SEMI_STALE: `No activity in ${SEMI_STALE_AFTER_DAYS}+ days`,
  NEVER_CONTACTED: 'Never contacted',
  HIGH_VALUE: 'High-value deal',
  FOLLOW_UP_DUE_SOON: `Follow-up due within ${FOLLOW_UP_SOON_DAYS} days`,
  NEW_STAGE: 'New lead',
}

// Open pipeline stages, in sales order (WON/LOST are closed states).
export const OPEN_LEAD_STATUSES = LEAD_STATUSES.filter(
  (status) => status !== 'WON' && status !== 'LOST',
)

// --- Small status / ranking helpers ---------------------------------------

export function isClosedStatus(status) {
  return status === 'WON' || status === 'LOST'
}

export function isOpenStatus(status) {
  return !isClosedStatus(status)
}

// Sort index for a priority (lower = more urgent). Unknown values sort
// last, after LOW — deterministic even for unexpected input.
export function priorityRank(priority) {
  const index = PRIORITY_ORDER.indexOf(priority)
  return index === -1 ? PRIORITY_ORDER.length : index
}

// --- Date-key helpers (pure — the engine never reads the clock) -----------
//
// Same convention as utils/format.js: a date KEY is "YYYY-MM-DD" and keys
// compare correctly with plain string < / >. These helpers extend the
// convention to TIMESTAMPS (activities.created_at) without ever building
// a timezone-ambiguous Date for the date-only math.

// ISO timestamp → local date key ("YYYY-MM-DD"), or null when the value
// is absent/unparseable. NOTE: null must NOT become a Date — JS would
// silently turn it into the epoch (1970-01-01) and fake a huge idleness.
export function timestampToDateKey(value) {
  if (value === null || value === undefined || value === '') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Full calendar days FROM `fromKey` TO `toKey` (negative when toKey is
// earlier). Parsed via Date.UTC so daylight-saving shifts can never make
// a "1 day" difference come out as 0 or 2.
export function daysBetweenDateKeys(fromKey, toKey) {
  const [fromY, fromM, fromD] = fromKey.split('-').map(Number)
  const [toY, toM, toD] = toKey.split('-').map(Number)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(
    (Date.UTC(toY, toM - 1, toD) - Date.UTC(fromY, fromM - 1, fromD)) /
      msPerDay,
  )
}

// Calendar days of idleness for an activity timestamp, relative to the
// given today key. Null when there is no timestamp (never contacted) or
// the value is unparseable. Clamped at 0 so a future-dated timestamp
// (clock skew) can never produce negative idleness.
export function daysSinceTimestamp(timestamp, todayKey) {
  const key = timestampToDateKey(timestamp)
  if (key === null) return null
  return Math.max(0, daysBetweenDateKeys(key, todayKey))
}

// --- Follow-up analysis -----------------------------------------------------

// Shape returned for a lead with no follow-ups. Treat as read-only —
// callers may share this one object instead of allocating per lead.
export const EMPTY_FOLLOW_UP_SUMMARY = {
  open: [],
  overdueCount: 0,
  hasOverdue: false,
  overdueSince: null, // earliest overdue due date key
  hasDueToday: false,
  nextDueDate: null, // earliest open due date strictly AFTER today
}

// Analyze ONE lead's follow-ups against the given today key.
// "Overdue" reuses the established convention (due_date < todayKey as a
// string comparison) from FollowUps.jsx and DashboardSummary.jsx.
export function summarizeFollowUps(followUps, todayKey) {
  const open = (followUps ?? []).filter((row) => !row.completed)
  const overdue = open.filter((row) => row.due_date < todayKey)
  const dueToday = open.filter((row) => row.due_date === todayKey)
  const upcoming = open
    .filter((row) => row.due_date > todayKey)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  return {
    open,
    overdueCount: overdue.length,
    hasOverdue: overdue.length > 0,
    overdueSince:
      overdue.length > 0
        ? overdue.reduce(
            (earliest, row) =>
              row.due_date < earliest ? row.due_date : earliest,
            overdue[0].due_date,
          )
        : null,
    hasDueToday: dueToday.length > 0,
    nextDueDate: upcoming.length > 0 ? upcoming[0].due_date : null,
  }
}

// Analyze EVERY lead's follow-ups at once, keyed by lead_id — one pass
// over the single listMyFollowUps() result instead of per-lead requests.
// Values are the same shape summarizeFollowUps() returns.
export function summarizeFollowUpsByLead(followUps, todayKey) {
  const grouped = new Map()
  for (const row of followUps ?? []) {
    const existing = grouped.get(row.lead_id)
    if (existing) {
      existing.push(row)
    } else {
      grouped.set(row.lead_id, [row])
    }
  }
  for (const [leadId, rows] of grouped) {
    grouped.set(leadId, summarizeFollowUps(rows, todayKey))
  }
  return grouped
}

// --- Last-activity index ----------------------------------------------------

// Build Map<lead_id, latest activity created_at> from the lightweight
// rows returned by listMyActivityStamps(). ISO timestamps compare
// correctly as plain strings, so "max" is a string comparison — no Date
// parsing needed. Leads with no activities are simply absent from the
// map (callers treat "absent" as "never contacted").
export function buildLastActivityMap(activityStamps) {
  const map = new Map()
  for (const row of activityStamps ?? []) {
    const current = map.get(row.lead_id)
    if (current === undefined || row.created_at > current) {
      map.set(row.lead_id, row.created_at)
    }
  }
  return map
}

// --- Priority ---------------------------------------------------------------

/**
 * Score one lead and derive its priority tier + the reasons for it.
 *
 * context:
 *   lastActivityAt  — ISO timestamp of the lead's most recent activity,
 *                     or null when it has none (NEVER "updated_at").
 *   followUpSummary — summarizeFollowUps() output for this lead
 *                     (defaults to the empty summary).
 *   todayKey        — "YYYY-MM-DD" for "now".
 *
 * Returns:
 *   {
 *     priority: 'HIGH' | 'MEDIUM' | 'LOW' | null,  // null when closed
 *     score,             // summed signal points
 *     reasons,           // plain-language strings, strongest signal first
 *     daysSinceActivity, // integer days, or null = never contacted
 *     isClosed,          // true for WON/LOST — handled BEFORE any open rule
 *   }
 */
export function computeLeadPriority(
  lead,
  { lastActivityAt = null, followUpSummary = EMPTY_FOLLOW_UP_SUMMARY, todayKey },
) {
  // Closed states are resolved before any open-lead rule.
  if (isClosedStatus(lead.status)) {
    return {
      priority: null,
      score: 0,
      reasons: [],
      daysSinceActivity: null,
      isClosed: true,
    }
  }

  const signals = []

  if (followUpSummary.hasOverdue) {
    signals.push('OVERDUE_FOLLOW_UP')
  }
  if (lead.status === 'PROPOSAL') {
    signals.push('PROPOSAL_STAGE')
  }
  if (lead.status === 'NEW') {
    signals.push('NEW_STAGE')
  }
  if (Number(lead.value ?? 0) >= HIGH_VALUE_THRESHOLD) {
    signals.push('HIGH_VALUE')
  }

  const daysSinceActivity = daysSinceTimestamp(lastActivityAt, todayKey)
  if (daysSinceActivity === null) {
    signals.push('NEVER_CONTACTED')
  } else if (daysSinceActivity >= STALE_AFTER_DAYS) {
    signals.push('STALE')
  } else if (daysSinceActivity >= SEMI_STALE_AFTER_DAYS) {
    signals.push('SEMI_STALE')
  }

  // "Due soon" is skipped when an overdue follow-up already fired — one
  // follow-up situation per lead, and overdue is the stronger signal.
  // Due today (0 days out) or within FOLLOW_UP_SOON_DAYS counts.
  if (!followUpSummary.hasOverdue) {
    const nextDueKey = followUpSummary.hasDueToday
      ? todayKey
      : followUpSummary.nextDueDate
    if (nextDueKey !== null) {
      const daysUntilDue = daysBetweenDateKeys(todayKey, nextDueKey)
      if (daysUntilDue >= 0 && daysUntilDue <= FOLLOW_UP_SOON_DAYS) {
        signals.push('FOLLOW_UP_DUE_SOON')
      }
    }
  }

  const score = signals.reduce((sum, key) => sum + SIGNAL_POINTS[key], 0)
  const priority =
    score >= HIGH_PRIORITY_MIN_SCORE
      ? PRIORITIES.HIGH
      : score >= MEDIUM_PRIORITY_MIN_SCORE
        ? PRIORITIES.MEDIUM
        : PRIORITIES.LOW

  return {
    priority,
    score,
    reasons: signals.map((key) => SIGNAL_REASONS[key]),
    daysSinceActivity,
    isClosed: false,
  }
}

// --- Next action ------------------------------------------------------------

/**
 * Deterministic recommended next action for one lead. FIRST matching
 * rule wins; each result maps to something the existing UI can already
 * do (quick actions, inline forms, the Phase 5 AI generator), so no new
 * write paths are introduced.
 *
 * `kind` tells the UI which handler to wire up:
 *   'none'            → nothing to do (informational only)
 *   'view-follow-ups' → scroll to the Follow-Ups section
 *   'generate-ai'     → open the AI Follow-Up Generator (aiIntent set)
 *   'add-activity'    → open the Add Activity form
 *   'add-follow-up'   → open the Add Follow-Up form
 */
export function computeNextAction(
  lead,
  { lastActivityAt = null, followUpSummary = EMPTY_FOLLOW_UP_SUMMARY, todayKey },
) {
  // Closed first — a won/lost lead never gets an open-lead action.
  if (lead.status === 'WON') {
    return {
      key: 'NO_ACTION_WON',
      kind: 'none',
      label: 'No action needed',
      description: 'Deal won — nothing left to chase here.',
    }
  }
  if (lead.status === 'LOST') {
    return {
      key: 'NO_ACTION_LOST',
      kind: 'none',
      label: 'No action needed',
      description: 'This lead is closed.',
    }
  }

  const daysSinceActivity = daysSinceTimestamp(lastActivityAt, todayKey)

  if (followUpSummary.hasOverdue) {
    return {
      key: 'COMPLETE_OVERDUE_FOLLOW_UP',
      kind: 'view-follow-ups',
      label: 'Complete the overdue follow-up',
      description: 'A follow-up for this lead is past its due date.',
    }
  }
  // A follow-up is PENDING and due TODAY: one already exists, so the
  // next action must not tell the user to schedule another one. Same
  // navigation model as the overdue action (the lead's Follow-Ups
  // section) — no new route.
  if (followUpSummary.hasDueToday) {
    return {
      key: 'COMPLETE_TODAYS_FOLLOW_UP',
      kind: 'view-follow-ups',
      label: "Complete today's follow-up",
      description: 'A follow-up for this lead is due today.',
    }
  }
  if (
    lead.status === 'PROPOSAL' &&
    (daysSinceActivity === null ||
      daysSinceActivity >= PROPOSAL_STALE_AFTER_DAYS)
  ) {
    return {
      key: 'FOLLOW_UP_PROPOSAL',
      kind: 'generate-ai',
      aiIntent: 'FOLLOW_UP_PROPOSAL', // must match AI_INTENTS / the 0003 enum
      label: 'Follow up on the proposal',
      description: 'The proposal has gone quiet — check the decision timeline.',
    }
  }
  if (daysSinceActivity === null) {
    return {
      key: 'MAKE_FIRST_CONTACT',
      kind: 'add-activity',
      label: 'Make first contact',
      description: 'No activity has been recorded for this lead yet.',
    }
  }
  if (daysSinceActivity >= STALE_AFTER_DAYS) {
    return {
      key: 'RE_ENGAGE',
      kind: 'generate-ai',
      aiIntent: 'FOLLOW_UP_NO_RESPONSE', // must match AI_INTENTS / the 0003 enum
      label: 'Re-engage this lead',
      description: `It has been ${daysSinceActivity} days since the last activity.`,
    }
  }
  // High-value semi-stale (idle 7–13 days — the stale threshold above
  // has already returned, so "semi-stale" is exactly what remains here):
  // the Needs Attention reason "High-value deal going stale" covers this
  // window, so the recommended action must stay consistent with that
  // reason instead of falling through to "Schedule a follow-up". Uses
  // the existing generate-ai convention with the generator's default
  // (general) intent.
  if (
    Number(lead.value ?? 0) >= HIGH_VALUE_THRESHOLD &&
    daysSinceActivity >= SEMI_STALE_AFTER_DAYS
  ) {
    return {
      key: 'GENERATE_FOLLOW_UP_HIGH_VALUE',
      kind: 'generate-ai',
      aiIntent: 'FOLLOW_UP_GENERAL', // must match AI_INTENTS / the 0003 enum
      label: 'Generate follow-up',
      description:
        'High-value deal — re-engage while the conversation is still warm.',
    }
  }
  if (followUpSummary.nextDueDate === null) {
    return {
      key: 'SCHEDULE_FOLLOW_UP',
      kind: 'add-follow-up',
      label: 'Schedule a follow-up',
      description: 'No upcoming follow-up is scheduled for this lead.',
    }
  }
  return {
    key: 'NO_ACTION_ON_TRACK',
    kind: 'none',
    label: 'No action needed — you are on track',
    description: 'Activity is recent and the next follow-up is scheduled.',
  }
}

// --- Lead insights (Stage 3 convenience wrapper) ----------------------------

/**
 * Everything the Lead Insights section needs for ONE lead, computed from
 * data Lead Details already loads (lead + its activities + its
 * follow-ups) — zero extra requests. `followUps` is this lead's own
 * follow-up rows (as returned by listLeadFollowUps).
 */
export function computeLeadInsights(
  lead,
  { lastActivityAt = null, followUps = [], todayKey },
) {
  const followUpSummary = summarizeFollowUps(followUps, todayKey)
  const priority = computeLeadPriority(lead, {
    lastActivityAt,
    followUpSummary,
    todayKey,
  })
  const nextAction = computeNextAction(lead, {
    lastActivityAt,
    followUpSummary,
    todayKey,
  })

  return {
    priority: priority.priority,
    score: priority.score,
    reasons: priority.reasons,
    isClosed: priority.isClosed,
    daysSinceActivity: priority.daysSinceActivity,
    lastActivityAt,
    openFollowUps: followUpSummary.open.length,
    overdueFollowUps: followUpSummary.overdueCount,
    nextFollowUpDueDate: followUpSummary.nextDueDate,
    nextAction,
  }
}

// --- Needs Attention ----------------------------------------------------------

/**
 * Which open leads need action today, ranked most-urgent first.
 *
 * context:
 *   followUps       — ALL of the user's follow-ups (one listMyFollowUps()
 *                     result; grouped internally by lead).
 *   lastActivityMap — buildLastActivityMap() output (absent = never
 *                     contacted).
 *   todayKey        — "YYYY-MM-DD" for "now".
 *
 * Rules (an open lead matches at most ONE — the first that applies):
 *   1. Overdue follow-up                          → View Lead
 *   2. Follow-up due today                        → View Lead
 *   3. High-value deal AND idle ≥ 7 days          → Generate Follow-Up
 *   4. PROPOSAL stage AND idle ≥ 5 days (or none) → Generate Follow-Up
 *   5. Never contacted (lead ≥ 2 days old)        → Add Activity
 *   6. No activity in 14+ days                    → Add Follow-Up
 *
 * Ranking: rule rank (severity) → priority score desc → deal value desc
 * → lead id (deterministic tie-break). The FULL ranked list is returned;
 * the UI slices with NEEDS_ATTENTION_LIMIT so counts stay truthful.
 *
 * Each item: { lead, rank, reason, detail, priority, score, action } —
 * action = { kind, label, aiIntent? } where kind is 'view-lead' |
 * 'generate-follow-up' | 'add-activity' | 'add-follow-up'.
 */
export function computeNeedsAttention(
  leads,
  { followUps = [], lastActivityMap = null, todayKey },
) {
  const followUpsByLead = summarizeFollowUpsByLead(followUps, todayKey)
  const items = []

  for (const lead of leads ?? []) {
    // Closed leads never need attention (handled before any open rule).
    if (isClosedStatus(lead.status)) continue

    const followUpSummary =
      followUpsByLead.get(lead.id) ?? EMPTY_FOLLOW_UP_SUMMARY
    const lastActivityAt = lastActivityMap?.get(lead.id) ?? null
    const daysIdle = daysSinceTimestamp(lastActivityAt, todayKey)

    const { score, priority } = computeLeadPriority(lead, {
      lastActivityAt,
      followUpSummary,
      todayKey,
    })

    let match = null
    if (followUpSummary.hasOverdue) {
      match = {
        rank: 1,
        reason: 'Overdue follow-up',
        detail: `Due ${followUpSummary.overdueSince}`,
        action: { kind: 'view-lead', label: 'View Lead' },
      }
    } else if (followUpSummary.hasDueToday) {
      match = {
        rank: 2,
        reason: 'Follow-up due today',
        detail: null,
        action: { kind: 'view-lead', label: 'View Lead' },
      }
    } else if (
      Number(lead.value ?? 0) >= HIGH_VALUE_THRESHOLD &&
      daysIdle !== null &&
      daysIdle >= SEMI_STALE_AFTER_DAYS
    ) {
      match = {
        rank: 3,
        reason: 'High-value deal going stale',
        detail: `No activity in ${daysIdle} days`,
        action: {
          kind: 'generate-follow-up',
          label: 'Generate Follow-Up',
          aiIntent: null, // generator's default (general) intent
        },
      }
    } else if (
      lead.status === 'PROPOSAL' &&
      (daysIdle === null || daysIdle >= PROPOSAL_STALE_AFTER_DAYS)
    ) {
      match = {
        rank: 4,
        reason: 'Proposal sent — no recent activity',
        detail: null,
        action: {
          kind: 'generate-follow-up',
          label: 'Generate Follow-Up',
          aiIntent: 'FOLLOW_UP_PROPOSAL', // must match AI_INTENTS / 0003 enum
        },
      }
    } else if (
      daysIdle === null &&
      daysSinceTimestamp(lead.created_at, todayKey) >= 2
    ) {
      match = {
        rank: 5,
        reason: 'Never contacted',
        detail: null,
        action: { kind: 'add-activity', label: 'Add Activity' },
      }
    } else if (daysIdle !== null && daysIdle >= STALE_AFTER_DAYS) {
      match = {
        rank: 6,
        reason: `No activity in ${daysIdle} days`,
        detail: null,
        action: { kind: 'add-follow-up', label: 'Add Follow-Up' },
      }
    }

    if (match !== null) {
      items.push({ lead, priority, score, ...match })
    }
  }

  return items.sort(
    (a, b) =>
      a.rank - b.rank ||
      b.score - a.score ||
      Number(b.lead.value ?? 0) - Number(a.lead.value ?? 0) ||
      a.lead.id.localeCompare(b.lead.id),
  )
}

// --- Sales metrics ------------------------------------------------------------

/**
 * Dashboard sales metrics derived from the SAME arrays the dashboard
 * already loads (leads + all follow-ups [+ activity stamps]). No vanity
 * metrics, no extra requests.
 *
 * context (optional):
 *   lastActivityMap — buildLastActivityMap() output. Used ONLY for the
 *     highPriorityLeads count (via computeLeadPriority). When omitted,
 *     every open lead is treated as never-contacted for that count, so
 *     always pass it when stamps are loaded. All other metrics are
 *     unaffected.
 *
 * Notes:
 *   - pipelineValue / openLeads cover open leads only (WON/LOST excluded).
 *   - wonRevenue is the sum of WON leads' deal value.
 *   - conversionRate is integer percent won / (won + lost), or null when
 *     nothing has closed yet (never a fake 0%).
 *   - highPriorityLeads is the count of OPEN leads whose
 *     computeLeadPriority() tier is HIGH (closed leads never count).
 *   - The Needs Attention count is NOT included here on purpose: it comes
 *     from computeNeedsAttention(...).length so both always agree.
 *   - pipelineByStage covers ALL SIX stages in sales order (WON/LOST
 *     included so the dashboard can show the full funnel; their value is
 *     the won/lost deal value).
 */
export function computeSalesMetrics(
  leads,
  followUps,
  todayKey,
  { lastActivityMap = null } = {},
) {
  let totalLeads = 0
  let openLeads = 0
  let wonLeads = 0
  let lostLeads = 0
  let pipelineValue = 0
  let wonRevenue = 0

  const stages = new Map(
    LEAD_STATUSES.map((status) => [status, { count: 0, value: 0 }]),
  )

  for (const lead of leads ?? []) {
    totalLeads += 1
    const value = Number(lead.value ?? 0)

    // Closed states resolved first (WON/LOST never enter open metrics).
    if (lead.status === 'WON') {
      wonLeads += 1
      wonRevenue += value
      continue
    }
    if (lead.status === 'LOST') {
      lostLeads += 1
      continue
    }

    openLeads += 1
    pipelineValue += value
    const stage = stages.get(lead.status)
    if (stage) {
      stage.count += 1
      stage.value += value
    }
  }

  const closedLeads = wonLeads + lostLeads
  const conversionRate =
    closedLeads === 0 ? null : Math.round((wonLeads / closedLeads) * 100)

  // High-priority count uses the ONE priority rule (computeLeadPriority)
  // with the same per-lead context the engine uses everywhere else — no
  // local approximation of the scoring.
  const followUpsByLead = summarizeFollowUpsByLead(followUps, todayKey)
  let highPriorityLeads = 0
  for (const lead of leads ?? []) {
    if (isClosedStatus(lead.status)) continue
    const { priority } = computeLeadPriority(lead, {
      lastActivityAt: lastActivityMap?.get(lead.id) ?? null,
      followUpSummary: followUpsByLead.get(lead.id) ?? EMPTY_FOLLOW_UP_SUMMARY,
      todayKey,
    })
    if (priority === PRIORITIES.HIGH) highPriorityLeads += 1
  }

  let overdueFollowUps = 0
  let dueTodayFollowUps = 0
  for (const row of followUps ?? []) {
    if (row.completed) continue
    if (row.due_date < todayKey) {
      overdueFollowUps += 1
    } else if (row.due_date === todayKey) {
      dueTodayFollowUps += 1
    }
  }

  return {
    totalLeads,
    openLeads,
    wonLeads,
    lostLeads,
    pipelineValue,
    wonRevenue,
    conversionRate,
    highPriorityLeads,
    overdueFollowUps,
    dueTodayFollowUps,
    pipelineByStage: LEAD_STATUSES.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: stages.get(status).count,
      value: stages.get(status).value,
    })),
  }
}