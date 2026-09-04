import { useCallback, useEffect, useState } from 'react'
import { listLeadFollowUps } from '../data/followUps.js'

/**
 * Server-state hook for one lead's follow-ups. Identical conventions to
 * useLeadActivities: promise-callback state updates, `cancelled` flag,
 * refresh for retries, and id-keyed derived state so a leadId change can
 * never expose stale follow-ups from a previous lead.
 *
 * No "not found" state: an empty list is a valid result, and a foreign
 * leadId yields zero rows under RLS — leaking nothing either way.
 */
export function useLeadFollowUps(leadId) {
  const [loaded, setLoaded] = useState({ leadId: null, followUps: null })
  const [errorState, setErrorState] = useState({ leadId: null, message: null })

  const currentError =
    errorState.leadId === leadId ? errorState.message : null
  const isCurrent = loaded.leadId === leadId
  const followUps = isCurrent ? loaded.followUps : null
  const isLoading = currentError === null && !isCurrent

  useEffect(() => {
    let cancelled = false
    listLeadFollowUps(leadId)
      .then((rows) => {
        if (!cancelled) {
          setLoaded({ leadId, followUps: rows })
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
    return listLeadFollowUps(leadId)
      .then((rows) => setLoaded({ leadId, followUps: rows }))
      .catch((err) => setErrorState({ leadId, message: err.message }))
  }, [leadId])

  return { followUps, isLoading, error: currentError, refresh }
}