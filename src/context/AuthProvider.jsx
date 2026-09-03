import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { getProfile } from '../data/profiles.js'
import { AuthContext } from './AuthContext.js'

/**
 * Provides authentication state to the whole app (mounted in App.jsx).
 *
 * Exposes via context:
 *  - session   : Supabase session object, or null when logged out
 *  - user      : shortcut to session.user, or null
 *  - profile   : the user's public.profiles row, or null
 *  - isLoading : true while the initial session is being restored
 *                (prevents a "flash" of the login page on refresh)
 *  - signOut() : ends the session on this device
 *
 * The onAuthStateChange listener keeps everything reactive: sign-ins,
 * sign-outs, token refreshes, and email-confirmation redirects are all
 * picked up automatically — pages never set auth state manually.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Profile state is keyed by the user it belongs to. We never store
  // "profile" directly — see the derived value below.
  const [profileState, setProfileState] = useState({
    userId: null,
    profile: null,
  })

  // 1. Restore an existing session (survives page refresh) and subscribe
  //    to every future auth event.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setIsLoading(false))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

  // 2. DERIVED, not synchronized: the profile is only exposed when it
  //    belongs to the CURRENT user. If a stale row from a previous
  //    session is still in state (e.g. right after switching accounts),
  //    this returns null instead of leaking the wrong profile — no
  //    synchronous setState-in-effect needed.
  const profile = profileState.userId === userId ? profileState.profile : null

  // 3. Whenever a user appears, fetch their profile row. State is only
  //    updated inside the async callbacks (never synchronously in the
  //    effect body), per the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    if (!userId) return

    let cancelled = false
    getProfile(userId)
      .then((p) => {
        if (!cancelled) setProfileState({ userId, profile: p })
      })
      .catch(() => {
        // A missing profile must never crash the app (e.g. if the
        // migration hasn't been applied yet). Pages handle null.
        if (!cancelled) setProfileState({ userId, profile: null })
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } finally {
      // The listener clears the session; the derived profile follows,
      // and ProtectedRoute redirects to /login. No navigation here.
    }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isLoading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
