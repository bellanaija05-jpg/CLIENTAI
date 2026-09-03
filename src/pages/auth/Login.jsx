import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../hooks/useAuth.js'
import Spinner from '../../components/ui/Spinner.jsx'

/**
 * Log in page.
 *
 * Deliberate pattern: on SUCCESS we do not navigate manually. The
 * AuthContext listener reacts to the sign-in event, this component
 * re-renders with a session, and the <Navigate> below sends the user
 * to where they were originally headed. This avoids a race condition
 * where we navigate before auth state has actually updated.
 */
export default function Login() {
  const { session } = useAuth()
  const location = useLocation()
  // Where was the user trying to go when ProtectedRoute bounced them here?
  const from = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Already logged in? No reason to see the login form.
  if (session) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      // Supabase returns user-friendly messages like "Invalid login
      // credentials" or "Email not confirmed" — show them directly.
      setError(signInError.message)
      setIsSubmitting(false)
      return
    }

    // Success: no manual navigation — the auth listener updates the
    // session and the <Navigate> above takes over.
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Log in to ClientFlow AI</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Spinner />}
              Log in
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          No account yet?{' '}
          <Link
            to="/signup"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Sign up
          </Link>
        </p>
        <p className="mt-2 text-center">
          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  )
}

