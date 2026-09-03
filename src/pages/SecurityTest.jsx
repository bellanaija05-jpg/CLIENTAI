// ⚠️ TEMPORARY — Phase 2 test harness — removed in Phase 3.
// Purpose: prove the Phase 2 database + Row Level Security work from
// the app's authenticated context, using two accounts. This is NOT
// product UI: no styling effort, no reusable components.
import { useEffect, useState } from 'react'
import { deleteLead, insertLead, listMyLeads } from '../data/leads.js'
import { useAuth } from '../hooks/useAuth.js'
import Spinner from '../components/ui/Spinner.jsx'

export default function SecurityTest() {
  const { user, signOut } = useAuth()
  const [leadName, setLeadName] = useState('TEST Lead')
  const [leads, setLeads] = useState(null) // null = not loaded yet
  const [error, setError] = useState(null)
  const [isBusy, setIsBusy] = useState(false)

  async function refresh() {
    setError(null)
    setIsBusy(true)
    try {
      setLeads(await listMyLeads())
    } catch (err) {
      setError(err.message)
    } finally {
      setIsBusy(false)
    }
  }

  // Initial load — state updates happen only inside the async
  // callbacks (per the react-hooks/set-state-in-effect rule).
  useEffect(() => {
    let cancelled = false
    listMyLeads()
      .then((rows) => {
        if (!cancelled) setLeads(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(event) {
    event.preventDefault()
    setError(null)
    setIsBusy(true)
    try {
      await insertLead(user.id, { name: leadName.trim() })
      await refresh()
    } catch (err) {
      setError(err.message)
      setIsBusy(false)
    }
  }

  async function handleDelete(leadId) {
    setError(null)
    setIsBusy(true)
    try {
      await deleteLead(leadId)
      await refresh()
    } catch (err) {
      setError(err.message)
      setIsBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Temporary Phase 2 test harness.</strong> Verifies the CRM
        tables + Row Level Security with two accounts. Removed in Phase 3 —
        do not build product features here.
      </div>

      <h1 className="mt-6 text-2xl font-bold text-slate-900">
        RLS security test
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Logged in as <code className="text-xs">{user?.id}</code>
      </p>

      {/* Account switching for the two-account RLS test. No manual
          navigation: signOut() clears the session via the auth listener,
          and ProtectedRoute then redirects to /login automatically. */}
      <div className="mt-4">
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Sign out
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Every query below goes to Supabase with your JWT. You can only ever
        see leads that RLS lets you see.
      </p>

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          type="text"
          required
          value={leadName}
          onChange={(e) => setLeadName(e.target.value)}
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          aria-label="New lead name"
        />
        <button
          type="submit"
          disabled={isBusy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Create test lead
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={isBusy}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          Refresh list
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {leads === null ? (
        <Spinner fullScreen={false} />
      ) : leads.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          No leads visible. Either you haven&rsquo;t created one yet, or this
          is Account B before creating its own — which is exactly what
          should happen.
        </p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
              <th className="py-2">Name</th>
              <th className="py-2">Status</th>
              <th className="py-2">Value</th>
              <th className="py-2">Created</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-slate-100">
                <td className="py-2 font-medium text-slate-800">{lead.name}</td>
                <td className="py-2 text-slate-600">{lead.status}</td>
                <td className="py-2 text-slate-600">{lead.value}</td>
                <td className="py-2 text-slate-500">
                  {new Date(lead.created_at).toLocaleString()}
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(lead.id)}
                    disabled={isBusy}
                    className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
