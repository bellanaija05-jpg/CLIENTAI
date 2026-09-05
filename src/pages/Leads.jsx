import { useState } from 'react'
import { Link } from 'react-router'
import { useLeads } from '../hooks/useLeads.js'
import { useMyActivityStamps } from '../hooks/useMyActivityStamps.js'
import { useMyFollowUps } from '../hooks/useMyFollowUps.js'
import { deleteLead } from '../data/leads.js'
import { LEAD_STATUSES } from '../lib/schemas.js'
import {
  EMPTY_FOLLOW_UP_SUMMARY,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  buildLastActivityMap,
  computeLeadPriority,
  priorityRank,
  summarizeFollowUpsByLead,
} from '../lib/leadIntelligence.js'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Pagination from '../components/ui/Pagination.jsx'
import StatusBadge from '../components/leads/StatusBadge.jsx'
import PriorityBadge from '../components/leads/PriorityBadge.jsx'
import { formatDate, formatValue, todayDateKey } from '../utils/format.js'

// Sentinel for the status filter's "All statuses" option.
const ALL_STATUSES = 'ALL'

// Sentinel for the priority filter's "All priorities" option.
const ALL_PRIORITIES = 'ALL'

// Leads per page for client-side pagination (Stage 8).
const PAGE_SIZE = 10

// Sort options (Stage 9). Values are stable identifiers; labels are
// the human-readable text shown in the toolbar select. The status
// option reuses the canonical LEAD_STATUSES order below. The priority
// option reuses the engine's priorityRank() — HIGH → MEDIUM → LOW,
// with leads that have no priority (closed) sorted last.
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'value_desc', label: 'Deal value highest' },
  { value: 'value_asc', label: 'Deal value lowest' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority (high first)' },
]

// Name sorting is explicitly case-insensitive. The final ID comparison used
// by each sort below guarantees deterministic output even when both the
// requested primary key and its human-friendly secondary keys are equal.
const NAME_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base' })
const compareNames = (a, b) => NAME_COLLATOR.compare(a.name, b.name)
const compareIds = (a, b) => a.id.localeCompare(b.id)

/**
 * Leads list (Stages 1–5): list, create/edit/delete entries, plus
 * client-side search and status filtering (Stage 5).
 *
 * Data states come from useLeads(): loading, error, empty, list.
 * Search + status are LOCAL UI state applied as a derived filter over
 * the already-authorized leads — RLS decided what is in `leads`; the
 * filter only decides what is visible. No extra Supabase requests.
 */
export default function Leads() {
  const { leads, isLoading, error, refresh } = useLeads()
  // Phase 6 Stage 4 — priority needs the SAME whole-user datasets the
  // dashboard already uses: activity stamps (last activity per lead) and
  // follow-ups (overdue / due-soon signals). Reused as-is — no new
  // fetching system. The page derives the priority map ONCE below, then
  // uses it for display, filtering, and sorting.
  const { activityStamps } = useMyActivityStamps()
  const { followUps } = useMyFollowUps()

  // Delete flow (Stage 4). The dialog holds the lead OBJECT (so it can
  // name the lead); deletion happens only after explicit confirmation.
  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Search + status + priority filters (Stages 5/4) — local UI state,
  // never sent to Supabase. The status select mirrors the DB enum via
  // LEAD_STATUSES; the priority select reuses the engine's priorities.
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES)
  const [priorityFilter, setPriorityFilter] = useState(ALL_PRIORITIES)

  // Client-side pagination (Stage 8). Page resets to 1 whenever the
  // filters or the sort change; derived values below guarantee the page
  // stays in range.
  const [page, setPage] = useState(1)

  // Client-side sort (Stage 9). One local value; the sorted list is
  // DERIVED between filtering and pagination. Changing it never hits
  // Supabase and resets the page.
  const [sortOption, setSortOption] = useState('newest')

  // Phase 6 Stage 4 — ONE intelligence pass over ALL leads. leadPriorityById
  // maps lead id → its priority so display, filtering, and sorting ALL
  // read the same derived values (no per-row recomputation, no duplicated
  // scoring in JSX). computeLeadPriority() is the source of truth: WON/LOST
  // get null (no priority) here, exactly like the dashboard and Lead
  // Details. While the auxiliary datasets are still loading, the map stays
  // empty rather than showing WRONG priorities ("never contacted").
  const intelligenceReady = activityStamps !== null && followUps !== null
  const todayKey = todayDateKey()
  const lastActivityMap = buildLastActivityMap(activityStamps)
  const followUpsByLead = summarizeFollowUpsByLead(followUps, todayKey)
  const leadPriorityById = new Map()
  if (intelligenceReady) {
    for (const lead of leads ?? []) {
      leadPriorityById.set(
        lead.id,
        computeLeadPriority(lead, {
          lastActivityAt: lastActivityMap.get(lead.id) ?? null,
          followUpSummary:
            followUpsByLead.get(lead.id) ?? EMPTY_FOLLOW_UP_SUMMARY,
          todayKey,
        }).priority,
      )
    }
  }

  // DERIVED during render (no memoization at this data scale): the
  // original leads array is never mutated. Search matches name,
  // company, and email — case-insensitive, trimmed, partial. Optional
  // chaining guards the nullable company/email columns. Priority
  // filtering narrows the SAME list (it never replaces search/status).
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const visibleLeads = (leads ?? []).filter((lead) => {
    if (statusFilter !== ALL_STATUSES && lead.status !== statusFilter) {
      return false
    }
    if (
      priorityFilter !== ALL_PRIORITIES &&
      leadPriorityById.get(lead.id) !== priorityFilter
    ) {
      return false
    }
    if (normalizedQuery === '') return true
    return (
      lead.name?.toLowerCase().includes(normalizedQuery) ||
      lead.company?.toLowerCase().includes(normalizedQuery) ||
      lead.email?.toLowerCase().includes(normalizedQuery)
    )
  })
  const hasActiveFilters =
    normalizedQuery !== '' ||
    statusFilter !== ALL_STATUSES ||
    priorityFilter !== ALL_PRIORITIES

  // SORT (Stage 9) — step 3 of filter → sort → paginate. Always sorts a
  // COPY (never mutates leads/visibleLeads), and every option has a
  // deterministic secondary key for stable, non-random ordering.
  const sortedLeads = [...visibleLeads].sort((a, b) => {
    switch (sortOption) {
      case 'oldest':
        return (
          a.created_at.localeCompare(b.created_at) ||
          compareNames(a, b) ||
          compareIds(a, b)
        )
      case 'name_asc':
        return (
          compareNames(a, b) ||
          a.created_at.localeCompare(b.created_at) ||
          compareIds(a, b)
        )
      case 'name_desc':
        return (
          compareNames(b, a) ||
          a.created_at.localeCompare(b.created_at) ||
          compareIds(a, b)
        )
      case 'value_asc':
        return (
          Number(a.value ?? 0) - Number(b.value ?? 0) ||
          compareNames(a, b) ||
          compareIds(a, b)
        )
      case 'value_desc':
        return (
          Number(b.value ?? 0) - Number(a.value ?? 0) ||
          compareNames(a, b) ||
          compareIds(a, b)
        )
      case 'status':
        return (
          LEAD_STATUSES.indexOf(a.status) - LEAD_STATUSES.indexOf(b.status) ||
          compareNames(a, b) ||
          compareIds(a, b)
        )
      case 'priority':
        // Engine's priorityRank: HIGH(0) → MEDIUM(1) → LOW(2). Leads
        // without a priority (WON/LOST → null) rank at the end (3), so
        // closed leads never sort above open ones and never fake HIGH.
        return (
          priorityRank(leadPriorityById.get(a.id)) -
            priorityRank(leadPriorityById.get(b.id)) ||
          compareNames(a, b) ||
          compareIds(a, b)
        )
      case 'newest':
      default:
        return (
          b.created_at.localeCompare(a.created_at) ||
          compareNames(a, b) ||
          compareIds(a, b)
        )
    }
  })

  // Pagination over the SORTED filtered result (never the raw dataset,
  // and never before sorting). Derived + clamped: the current page can
  // never go out of range (deleting the last item on the last page
  // drops to the prior page automatically). totalPages is at least 1.
  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginatedLeads = sortedLeads.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  // The toolbar is only meaningful once real leads exist.
  const showToolbar = !isLoading && !error && leads !== null && leads.length > 0

  function clearFilters() {
    setSearchQuery('')
    setStatusFilter(ALL_STATUSES)
    setPriorityFilter(ALL_PRIORITIES)
    setPage(1)
  }

  function handleSortChange(event) {
    setSortOption(event.target.value)
    setPage(1)
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteLead(pendingDelete.id)
      // Success: close the dialog, then refetch the list from Supabase
      // (real data, no local patching). The user stays on /leads.
      setPendingDelete(null)
      await refresh()
    } catch (err) {
      // Failure: the dialog STAYS OPEN with the server's message and
      // the lead stays in the list — nothing is falsely "deleted".
      setDeleteError(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

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

      {showToolbar && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search name, company, or email…"
            aria-label="Search leads"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            aria-label="Filter by status"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-48"
          >
            <option value={ALL_STATUSES}>All statuses</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(event.target.value)
              setPage(1)
            }}
            aria-label="Filter by priority"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-44"
          >
            <option value={ALL_PRIORITIES}>All priorities</option>
            {PRIORITY_ORDER.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
          <label className="flex w-full items-center gap-2 text-sm text-slate-600 sm:w-auto">
            <span className="shrink-0">Sort:</span>
            <select
              value={sortOption}
              onChange={handleSortChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-48"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

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

      {/* Leads exist, but the active search/status/priority filters match
          none. Deliberately DIFFERENT from "No leads yet": the user HAS
          leads — they are just hidden by the current filters. */}
      {!isLoading &&
        !error &&
        leads !== null &&
        leads.length > 0 &&
        visibleLeads.length === 0 && (
          <div className="mt-10">
            <EmptyState
              icon="🔍"
              title="No leads match your filters"
              description="Leads exist, but none match the current search, status, and priority. Try different words or clear the filters."
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Clear filters
                </button>
              }
            />
          </div>
        )}

      {!isLoading && !error && leads !== null && visibleLeads.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link
                      to={`/leads/${lead.id}`}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {lead.name}
                    </Link>
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
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-3">
                    {/* Closed leads (priority null) render an empty cell —
                        PriorityBadge already returns nothing for them, and
                        the engine's null IS the correct "no priority". */}
                    <PriorityBadge priority={leadPriorityById.get(lead.id)} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                    {formatValue(lead.value)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(lead.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        to={`/leads/${lead.id}/edit`}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null)
                          setPendingDelete(lead)
                        }}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Client-side pagination over the filtered result. Shown whenever
          there are matches, and actually rendered by Pagination only when
          more than one page exists. */}
      {!isLoading && !error && visibleLeads.length > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPrevious={() => setPage(safePage - 1)}
            onNext={() => setPage(safePage + 1)}
            totalItems={visibleLeads.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Delete “${pendingDelete.name}”?` : ''}
        description="This permanently removes the lead along with its activities and follow-ups. This cannot be undone."
        error={deleteError}
        confirmLabel="Delete lead"
        isBusy={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setPendingDelete(null)
          setDeleteError(null)
        }}
      />
    </main>
  )
}
