import { useRef, useState } from 'react'
import { updateLeadNotes } from '../../data/leads.js'
import { leadNotesSchema } from '../../lib/schemas.js'
import Spinner from '../ui/Spinner.jsx'

/**
 * Editable primary Notes field for Lead Details (Phase 4 Stage 10).
 *
 * Local state isolates editing and save failures from the rest of the page.
 * Saving updates only leads.notes, then asks useLead to refetch so both the
 * displayed note and database-managed updated_at remain truthful. It never
 * creates an Activity.
 */
export default function LeadNotes({ leadId, notes, onSaved }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [validationError, setValidationError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const saveInFlight = useRef(false)
  const hasNotes = Boolean(notes?.trim())

  function beginEditing() {
    setDraft(notes ?? '')
    setValidationError(null)
    setServerError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setDraft(notes ?? '')
    setValidationError(null)
    setServerError(null)
    setIsEditing(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saveInFlight.current) return

    const result = leadNotesSchema.safeParse(draft)
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Enter valid notes.')
      return
    }

    setValidationError(null)
    setServerError(null)
    // Ref guard: two submit events can fire before React re-renders with
    // the disabled button, so state alone cannot prevent duplicates.
    saveInFlight.current = true
    setIsSaving(true)
    try {
      await updateLeadNotes(leadId, result.data)
      await onSaved()
      setIsEditing(false)
    } catch (err) {
      // Keep the editor and draft intact so the user can retry.
      setServerError(err.message)
    } finally {
      saveInFlight.current = false
      setIsSaving(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Notes
      </h2>

      {isEditing ? (
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="lead-notes" className="sr-only">
            Lead notes
          </label>
          <textarea
            id="lead-notes"
            rows={6}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setValidationError(null)
            }}
            disabled={isSaving}
            autoFocus
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-50"
          />

          {validationError && (
            <p className="mt-1 text-xs text-red-600">{validationError}</p>
          )}
          {serverError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Couldn&rsquo;t save notes. {serverError}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving && <Spinner />}
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {hasNotes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800">
              {notes}
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No notes yet.</p>
          )}
          <button
            type="button"
            onClick={beginEditing}
            className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            {hasNotes ? 'Edit Notes' : 'Add Notes'}
          </button>
        </>
      )}
    </section>
  )
}
