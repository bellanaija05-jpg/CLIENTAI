import { useCallback, useEffect, useState } from 'react'
import { listLeadActivities } from '../data/activities.js'

/**
 * Server-state hook for one lead's activity timeline. Same conventions
 * as useLead/useLeads: state updates only inside promise callbacks,
 * `cancelled` flag for unmounts, refresh for retry buttons, and the
 * id-keyed derived-state pattern so a route/param change can never
 * expose stale activities from a previous lead.
 *
 * Note: there is no "not found" state here — an empty list is a valid
 * result ("this lead simply has no activities yet"), and for a foreign
 * leadId RLS also yields zero rows, leaking nothing either way.
 */
export function useLeadActivities(leadId) {
  const [loaded, setLoaded] = useState({ leadId: null, activities: null })
  const [errorState, setErrorState] = useState({ leadId: null, message: null })

  const currentError =
    errorState.leadId === leadId ? errorState.message : null
  const isCurrent = loaded.leadId === leadId
  const activities = isCurrent ? loaded.activities : null
  const isLoading = currentError === null && !isCurrent

  useEffect(() => {
    let cancelled = false
    listLeadActivities(leadId)
      .then((rows) => {
        if (!cancelled) {
          setLoaded({ leadId, activities: rows })
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

  const refresh = useCallback(() => {
    setErrorState({ leadId: null, message: null })
    return listLeadActivities(leadId)
      .then((rows) => setLoaded({ leadId, activities: rows }))
      .catch((err) => setErrorState({ leadId, message: err.message }))
  }, [leadId])

  return { activities, isLoading, error: currentError, refresh }
}
