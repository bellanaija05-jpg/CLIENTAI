import { useState } from 'react'
import {
  completeFollowUp,
  createFollowUp,
} from '../../data/followUps.js'
import { useLeadFollowUps } from '../../hooks/useLeadFollowUps.js'
import { formatDateKey, todayDateKey } from '../../utils/format.js'
import FollowUpForm from './FollowUpForm.jsx'
import Spinner from '../ui/Spinner.jsx'

// Status treatment per follow-up. COMPLETED: always completed=true.
// Otherwise the due-date key decides Upcoming (>= today) vs Overdue
// (< today). Native string comparison — no timezone pitfalls.
const STATUS_STYLES = {
  UPCOMING: 'border-sky-200 bg-sky-50 text-sky-700',
  OVERDUE: 'border-red-200 bg-red-50 text-red-700',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}
const STATUS_LABELS = {
  UPCOMING: 'Upcoming',
  OVERDUE: 'Overdue',
  COMPLETED: 'Completed',
}

function statusOf(followUp) {
  if (followUp.completed) return 'COMPLETED'
  if (followUp.due_date < todayDateKey()) return 'OVERDUE'
  return 'UPCOMING'
}

/**
 * The Follow-Ups section for one lead (Phase 4 Stage 4).
 * Self-contained (owns its own server state), so a failure here can
 * never break Lead Details, Notes, or Activities above it.
 *
 * Reads via useLeadFollowUps; hosts the inline Add Follow-Up form;
 * marks incomplete items complete. No automatic activities are created
 * for follow-ups in this stage.
 */
export default function FollowUpList({ leadId, openSignal = 0 }) {
  const { followUps, isLoading, error, refresh } = useLeadFollowUps(leadId)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState(null)
  const [completingId, setCompletingId] = useState(null)
  const [completeError, setCompleteError] = useState(null)

  // Quick Actions (Stage 12) can ask this section to open its existing
  // inline form. Rather than an effect, we adjust state during render
  // when the signal changes — the pattern React recommends for reacting
  // to prop changes without cascading renders. The signal is a counter,
  // so a repeated click still triggers the adjustment; opening while
  // already open is a harmless no-op. Nothing is ever created here —
  // only the existing FollowUpForm opens.
  const [lastSignal, setLastSignal] = useState(openSignal)
  if (openSignal !== lastSignal) {
    setLastSignal(openSignal)
    setFormError(null)
    setShowForm(true)
  }

  async function handleCreate(values) {
    setFormError(null)
    try {
      await createFollowUp(leadId, values)
      setShowForm(false)
      refresh()
    } catch (err) {
      setFormError(err.message)
    }
  }

  async function handleComplete(id) {
    setCompleteError(null)
    setCompletingId(id)
    try {
      await completeFollowUp(id)
      refresh()
    } catch (err) {
      setCompleteError(err.message)
    } finally {
      setCompletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm font-medium text-red-800">
          Couldn&rsquo;t load follow-ups.
        </p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setFormError(null)
              setShowForm(true)
            }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            + Add Follow-Up
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <FollowUpForm
            onSubmit={handleCreate}
            serverError={formError}
            onCancel={() => {
              setShowForm(false)
              setFormError(null)
            }}
          />
        </div>
      )}

      {completeError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {completeError}
        </p>
      )}

      {followUps === null || followUps.length === 0 ? (
        <p className="text-sm text-slate-400">No follow-ups yet.</p>
      ) : (
        <ul className="space-y-3">
          {followUps.map((followUp) => {
            const status = statusOf(followUp)
            return (
              <li
                key={followUp.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        followUp.completed
                          ? 'text-slate-400 line-through'
                          : 'text-slate-900'
                      }`}
                    >
                      {followUp.title}
                    </p>
                    {followUp.description && (
                      <p className="mt-1 text-sm text-slate-600">
                        {followUp.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      Due {formatDateKey(followUp.due_date)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[status]
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                    {!followUp.completed && (
                      <button
                        type="button"
                        onClick={() => handleComplete(followUp.id)}
                        disabled={completingId !== null}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {completingId === followUp.id ? <Spinner /> : 'Mark Complete'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}