import { useCallback, useEffect, useState } from 'react'
import { listMyFollowUps } from '../data/followUps.js'

/**
 * Server-state hook for ALL of the user's follow-ups (global page).
 * No leadId — like useLeads, a whole-user query. Same conventions:
 * promise-callback state updates, `cancelled` flag, refresh for retry.
 */
export function useMyFollowUps() {
  const [followUps, setFollowUps] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    listMyFollowUps()
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
    return listMyFollowUps()
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