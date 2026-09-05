import { useCallback, useEffect, useState } from 'react'
import { listMyActivityStamps } from '../data/activities.js'

/**
 * Server-state hook for the user's lightweight ACTIVITY STAMPS
 * (lead_id + created_at rows) — the Phase 6 input for "last activity per
 * lead". Conventions copied exactly from useMyFollowUps/useLeads:
 *
 *   - fetch once on mount; refresh for retry buttons
 *   - state updates ONLY inside promise callbacks (never in the effect
 *     body), with a `cancelled` flag guarding unmounts
 *   - no leadId — a whole-user query; RLS decides which rows arrive, the
 *     hook only manages loading/error state
 *
 * Like the other hooks it fetches unconditionally on mount — the
 * existing architecture (e.g. the dashboard) renders derived zero-states
 * from empty arrays rather than skipping requests.
 *
 * Exposed: { activityStamps, isLoading, error, refresh }
 *   activityStamps is null until loaded; [] means "no activities yet"
 *   (leads legitimately have no last-activity signal).
 */
export function useMyActivityStamps() {
  const [activityStamps, setActivityStamps] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    listMyActivityStamps()
      .then((rows) => {
        if (!cancelled) {
          setActivityStamps(rows)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(() => {
    setIsLoading(true)
    setError(null)
    return listMyActivityStamps()
      .then((rows) => {
        setActivityStamps(rows)
        setError(null)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  return { activityStamps, isLoading, error, refresh }
}