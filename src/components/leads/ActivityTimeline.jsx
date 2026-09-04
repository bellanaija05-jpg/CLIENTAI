import { useState } from 'react'
import { createActivity } from '../../data/activities.js'
import { useLeadActivities } from '../../hooks/useLeadActivities.js'
import { formatDateTime } from '../../utils/format.js'
import ActivityForm from './ActivityForm.jsx'
import Spinner from '../ui/Spinner.jsx'

// Dot colors per activity type (mirrors the activity_type enum). A
// defensive fallback keeps unknown values visible rather than broken.
const TYPE_DOTS = {
  NOTE: 'bg-slate-400',
  EMAIL: 'bg-blue-500',
  CALL: 'bg-emerald-500',
  MEETING: 'bg-violet-500',
  STATUS_CHANGE: 'bg-amber-500',
}

// Readable labels — "Status Change" rather than the raw enum value
// (Part 8). Used in the meta line under each description.
const TYPE_LABELS = {
  NOTE: 'Note',
  EMAIL: 'Email',
  CALL: 'Call',
  MEETING: 'Meeting',
  STATUS_CHANGE: 'Status Change',
}

/**
 * The activities timeline for one lead (Part 1–3, 7–8).
 *
 * Self-contained: owns its own server state (useLeadActivities) and the
 * Add Activity inline form (ActivityForm), so a failure here can never
 * block the lead information above it. After a successful create it
 * closes the form and refreshes the timeline — newest first, no reload.
 *
 * Security: createActivity (data layer) refuses STATUS_CHANGE, derives
 * user identity from the session, and relies on RLS + the composite FK
 * to reject foreign leads. No user is ever accepted from the form.
 */
export default function ActivityTimeline({ leadId, openSignal = 0 }) {
  const { activities, isLoading, error, refresh } = useLeadActivities(leadId)
  const [showForm, setShowForm] = useState(false)
  const [serverError, setServerError] = useState(null)

  // Quick Actions (Stage 12) can ask this section to open its existing
  // inline form. Rather than an effect, we adjust state during render
  // when the signal changes — the pattern React recommends for reacting
  // to prop changes without cascading renders. The signal is a counter,
  // so a repeated click still triggers the adjustment; opening while
  // already open is a harmless no-op. Nothing is ever created here —
  // only the existing ActivityForm opens.
  const [lastSignal, setLastSignal] = useState(openSignal)
  if (openSignal !== lastSignal) {
    setLastSignal(openSignal)
    setServerError(null)
    setShowForm(true)
  }

  async function handleCreate(values) {
    setServerError(null)
    try {
      await createActivity(leadId, values.type, values.description)
      // Success: close + remount next time a clean form; then refetch.
      setShowForm(false)
      refresh()
    } catch (err) {
      // Failure: keep the form open + intact so the user can retry.
      setServerError(err.message)
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
          Couldn&rsquo;t load activities.
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
              setServerError(null)
              setShowForm(true)
            }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            + Add Activity
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <ActivityForm
            onSubmit={handleCreate}
            serverError={serverError}
            onCancel={() => {
              setShowForm(false)
              setServerError(null)
            }}
          />
        </div>
      )}

      {activities === null || activities.length === 0 ? (
        <p className="text-sm text-slate-400">No activities yet.</p>
      ) : (
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute bottom-2 left-[3px] top-2 w-px bg-slate-200"
          />
          <ol className="space-y-5">
            {activities.map((activity) => (
              <li key={activity.id} className="relative pl-6">
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1.5 h-[7px] w-[7px] rounded-full ${
                    TYPE_DOTS[activity.type] ?? 'bg-slate-300'
                  }`}
                />
                <p className="text-sm leading-6 text-slate-800">
                  {activity.description}
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-medium">
                    {TYPE_LABELS[activity.type] ?? activity.type}
                  </span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={activity.created_at}>
                    {formatDateTime(activity.created_at)}
                  </time>
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
