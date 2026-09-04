import { useCallback, useEffect, useState } from 'react'
import { listIncompleteFollowUps } from '../data/followUps.js'

/**
 * Server-state hook for the user's INCOMPLETE follow-ups (dashboard).
 * No leadId — like useLeads, this is a whole-user query. Same
 * conventions: promise-callback state updates, `cancelled` flag,
 * refresh for retry buttons.
 */
export function useIncompleteFollowUps() {
  const [followUps, setFollowUps] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    listIncompleteFollowUps()
      .then((rows) => {
        if (!cancelled) {
          setFollowUps(rows)
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
    return listIncompleteFollowUps()
      .then((rows) => {
        setFollowUps(rows)
        setError(null)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  return { followUps, isLoading, error, refresh }
}