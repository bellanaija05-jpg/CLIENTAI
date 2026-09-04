import { useState } from 'react'
import { Link } from 'react-router'
import { useMyFollowUps } from '../hooks/useMyFollowUps.js'
import { completeFollowUp } from '../data/followUps.js'
import { todayDateKey } from '../utils/format.js'
import FollowUpItem from '../components/followUps/FollowUpItem.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

// A group section on the page. Renders its items; falls back to the
// group-specific empty message when there are none.
function Group({ title, items, emptyText, completing, onComplete }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((followUp) => (
            <FollowUpItem
              key={followUp.id}
              followUp={followUp}
              completingId={completing}
              onComplete={onComplete}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default function FollowUps() {
  const { followUps, isLoading, error, refresh } = useMyFollowUps()
  const [completing, setCompleting] = useState(null)
  const [completeError, setCompleteError] = useState(null)

  async function handleComplete(id) {
    setCompleteError(null)
    setCompleting(id)
    try {
      await completeFollowUp(id)
      refresh()
    } catch (err) {
      setCompleteError(err.message)
    } finally {
      setCompleting(null)
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex justify-center py-10"><Spinner /></div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Follow-Ups</h1>
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">Couldn&rsquo;t load your follow-ups.</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  const rows = followUps ?? []
  const todayKey = todayDateKey()

  // Group by state. Sorting:
  //  Overdue → earliest due first (the SQL already sorts by due_date asc)
  //  Due Today → received in created asc order from the query (oldest first)
  //  Upcoming → earliest due first (due_date asc)
  //  Completed → most recently created first (reverse created_at)
  const overdue = rows.filter((f) => !f.completed && f.due_date < todayKey)
  const dueToday = rows.filter((f) => !f.completed && f.due_date === todayKey)
  const upcoming = rows.filter((f) => !f.completed && f.due_date > todayKey)
  const completed = rows
    .filter((f) => f.completed)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">← Dashboard</Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Follow-Ups</h1>
      <p className="mt-1 text-sm text-slate-500">
        Stay on top of the conversations and tasks that need your attention.
      </p>

      {completeError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{completeError}</p>
      )}

      {rows.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon="📌"
            title="No follow-ups yet."
            description="Follow-ups you schedule on your leads will show up here, grouped by what needs attention now."
            action={
              <Link to="/leads" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
                View Leads
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <Group title="Overdue" items={overdue} empty="No overdue follow-ups." completing={completing} onComplete={handleComplete} />
          <Group title="Due Today" items={dueToday} empty="Nothing due today." completing={completing} onComplete={handleComplete} />
          <Group title="Upcoming" items={upcoming} empty="No upcoming follow-ups." completing={completing} onComplete={handleComplete} />
          <Group title="Completed" items={completed} empty="No completed follow-ups yet." completing={completing} onComplete={handleComplete} />
        </div>
      )}
    </main>
  )
}