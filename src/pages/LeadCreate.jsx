import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import LeadForm from '../components/leads/LeadForm.jsx'
import { createLead } from '../data/leads.js'
import { useAuth } from '../hooks/useAuth.js'

/**
 * Create Lead page (Stage 2).
 *
 * Ownership note: user_id is NEVER a form field. It comes from the
 * auth session here, and the database's RLS policy independently
 * verifies it against the JWT on every insert.
 */
export default function LeadCreate() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)

  // `values` arrives already validated and normalized by the Zod schema
  // (trimmed, empty → null, value → number). RHF only calls this when
  // validation passed.
  async function handleCreate(values) {
    setServerError(null)
    try {
      await createLead(user.id, values)
      navigate('/leads')
    } catch (err) {
      // Network failure, RLS rejection, DB constraint — show the
      // server's message and keep the form values intact.
      setServerError(err.message)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        to="/leads"
        className="text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        ← Leads
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">Create lead</h1>
      <p className="mt-1 text-sm text-slate-500">
        Only the name is required — fill in the rest as you learn more.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <LeadForm
          onSubmit={handleCreate}
          submitLabel="Create lead"
          cancelTo="/leads"
          serverError={serverError}
        />
      </div>
    </main>
  )
}
