import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import LeadForm from '../components/leads/LeadForm.jsx'
import { updateLead } from '../data/leads.js'
import { useLead } from '../hooks/useLead.js'
import EmptyState from '../components/ui/EmptyState.jsx'
import Spinner from '../components/ui/Spinner.jsx'

/**
 * DB row → RHF defaultValues. Nulls become empty strings (the form is
 * string-based; the Zod schema converts them back to null on submit)
 * and the numeric value becomes its string form ("1500.5"). The schema
 * then re-validates everything with the SAME rules as creation.
 */
function leadToFormValues(lead) {
  return {
    name: lead.name,
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    company: lead.company ?? '',
    source: lead.source ?? '',
    status: lead.status,
    value:
      lead.value === null || lead.value === undefined
        ? ''
        : String(lead.value),
    notes: lead.notes ?? '',
  }
}

/**
 * Edit Lead page (Stage 3). Reuses LeadForm unchanged — only the props
 * differ from LeadCreate: real defaultValues + an update handler.
 *
 * States: loading → load error (+retry) → not found → form.
 * On failed saves the server error is shown and RHF keeps every edited
 * value intact, so the user can simply retry.
 */
export default function LeadEdit() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const { lead, isLoading, error, notFound, refresh } = useLead(leadId)
  const [serverError, setServerError] = useState(null)

  async function handleUpdate(values) {
    setServerError(null)
    try {
      await updateLead(leadId, values)
      navigate('/leads')
    } catch (err) {
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
            description="This lead doesn't exist — or it belongs to a different account. Either way, it can't be edited from here."
          />
        </div>
      )}

      {!isLoading && !error && lead && (
        <>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Edit lead
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Editing &ldquo;{lead.name}&rdquo;.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {/* key={lead.id}: if the route param ever changes without an
                unmount, a changed lead id remounts the form so RHF reads
                the NEW defaultValues (its one-time rule). */}
            <LeadForm
              key={lead.id}
              defaultValues={leadToFormValues(lead)}
              onSubmit={handleUpdate}
              submitLabel="Save changes"
              cancelTo="/leads"
              serverError={serverError}
            />
          </div>
        </>
      )}
    </main>
  )
}
