import { useLeadActivities } from '../../hooks/useLeadActivities.js'
import { formatDateTime } from '../../utils/format.js'
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

/**
 * The activities timeline for one lead (Phase 4 Stage 2, view only).
 *
 * Self-contained: owns its own server state (useLeadActivities), so a
 * failure here can never block or break the lead information rendered
 * above it on the detail page. Activity CREATION arrives in a later
 * stage — this component is intentionally read-only.
 */
export default function ActivityTimeline({ leadId }) {
  const { activities, isLoading, error, refresh } = useLeadActivities(leadId)

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

  if (activities === null || activities.length === 0) {
    return <p className="py-2 text-sm text-slate-400">No activities yet.</p>
  }

  return (
    <div className="relative">
      {/* The vertical rail; one type-colored dot per item sits on it. */}
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
              <span className="font-medium">{activity.type}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={activity.created_at}>
                {formatDateTime(activity.created_at)}
              </time>
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
