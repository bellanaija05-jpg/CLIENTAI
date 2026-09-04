import { useCallback, useEffect, useState } from 'react'
import { listMyLeads } from '../data/leads.js'

/**
 * Server-state hook for the leads list — the state layer between the
 * data layer and the page (the third of our three layers):
 *
 *   data/  → how to talk to Supabase (no React)
 *   hooks/ → when React needs the data (loading / error / refresh)
 *   pages/ → how it looks
 *
 * States the page can be in:
 *   isLoading=true              → initial load in flight (leads is null)
 *   isLoading=false, error set  → fetch failed (page shows error + retry)
 *   isLoading=false, leads=[]   → user legitimately has no leads
 *   isLoading=false, leads=[…]  → render the list
 *
 * Note: visibility filtering is NOT done here. RLS decides what
 * listMyLeads() returns — the hook only manages loading/error state.
 *
 * Convention: state is updated only inside promise callbacks
 * (.then/.catch/.finally), never synchronously in an effect body.
 */
export function useLeads() {
  const [leads, setLeads] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initial fetch on mount. State is updated ONLY inside promise
  // callbacks (.then/.catch/.finally), never synchronously in the
  // effect body — that is what the react-hooks/set-state-in-effect
  // rule enforces. The `cancelled` flag prevents state updates if the
  // component unmounts before the request finishes (e.g. sign-out).
  useEffect(() => {
    let cancelled = false
    listMyLeads()
      .then((rows) => {
        if (!cancelled) {
          setLeads(rows)
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

  // Retry, used by the page's "Try again" button (an event handler, so
  // synchronous setState here is fine). Deliberately mirrors the effect
  // above: two small readable blocks instead of a shared abstraction.
  const refresh = useCallback(() => {
    setIsLoading(true)
    setError(null)
    return listMyLeads()
      .then((rows) => {
        setLeads(rows)
        setError(null)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  return { leads, isLoading, error, refresh }
}
