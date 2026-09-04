import { useCallback, useEffect, useState } from 'react'
import { getLead } from '../data/leads.js'

/**
 * Server-state hook for ONE lead (edit page now, lead details later).
 * Same conventions as useLeads: state updates only inside promise
 * callbacks, `cancelled` flag for unmounts, refresh for retry buttons.
 *
 * One twist, same trick as AuthProvider's profile: the loaded lead is
 * stored TOGETHER WITH the leadId it belongs to, and the exposed value
 * is DERIVED. If the route param changes (e.g. browser back/forward
 * between two edit URLs), the stale lead instantly stops being exposed
 * and the page falls back to its loading state — without any
 * synchronous setState inside the effect.
 *
 * Exposed states:
 *   isLoading=true            → fetch in flight for the current leadId
 *   error set                 → fetch failed (page shows error + retry)
 *   notFound=true             → loaded; zero rows = doesn't exist OR
 *                               belongs to another user (same message!)
 *   lead set                  → render the edit form
 */
export function useLead(leadId) {
  const [loaded, setLoaded] = useState({ leadId: null, lead: null })
  const [errorState, setErrorState] = useState({ leadId: null, message: null })

  // Derived values — computed during render, never synchronized via
  // setState, so a stale result can never be shown for a new leadId.
  const currentError =
    errorState.leadId === leadId ? errorState.message : null
  const isCurrent = loaded.leadId === leadId
  const lead = isCurrent ? loaded.lead : null
  const notFound = isCurrent && currentError === null && loaded.lead === null
  const isLoading = currentError === null && !isCurrent

  useEffect(() => {
    let cancelled = false
    getLead(leadId)
      .then((row) => {
        if (!cancelled) {
          setLoaded({ leadId, lead: row })
          setErrorState({ leadId: null, message: null })
        }
      })
      .catch((err) => {
        if (!cancelled) setErrorState({ leadId, message: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [leadId])

  // Retry for the page's "Try again" button (event handler — the
  // synchronous error clear here is safe).
  const refresh = useCallback(() => {
    setErrorState({ leadId: null, message: null })
    return getLead(leadId)
      .then((row) => setLoaded({ leadId, lead: row }))
      .catch((err) => setErrorState({ leadId, message: err.message }))
  }, [leadId])

  return { lead, isLoading, error: currentError, notFound, refresh }
}
