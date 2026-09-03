import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../hooks/useAuth.js'
import Spinner from '../../components/ui/Spinner.jsx'

/**
 * Sign-up page.
 *
 * full_name / business_name travel with the signup as user metadata;
 * the database trigger (handle_new_user) copies them into the profiles
 * row automatically. The client never inserts into profiles.
 *
 * Outcomes after signUp():
 *  - Email confirmation ON (recommended): no session yet → we show a
 *    "check your inbox" screen; clicking the email link lands back in
 *    the app with a session.
 *  - Email confirmation OFF: data.session is present immediately → the
 *    auth listener updates context and the <Navigate> below fires.
 */
export default function SignUp() {
  const { session } = useAuth()

  const [form, setForm] = useState({
    fullName: '',
    businessName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)

  // Already logged in? Straight to the app.
  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name: form.fullName.trim(),
          business_name: form.businessName.trim(),
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setIsSubmitting(false)
      return
    }

    if (!data.session) {
      // Email confirmation is enabled in this project.
      setIsSubmitting(false)
      setNeedsEmailConfirmation(true)
    }
    // If data.session exists, the session-driven <Navigate> above takes over.
  }
  if (needsEmailConfirmation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Check your inbox ✉️
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            We sent a confirmation link to{' '}
            <strong className="text-slate-700">{form.email.trim()}</strong>.
            Open it on this device to activate your account, then log in.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Go to log in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Start organizing your clients in minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-slate-700"
              >
                Your name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                autoComplete="name"
                value={form.fullName}
                onChange={updateField}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            <div>
              <label
                htmlFor="businessName"
                className="block text-sm font-medium text-slate-700"
              >
                Business name <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                autoComplete="organization"
                value={form.businessName}
                onChange={updateField}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

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
                value={form.email}
                onChange={updateField}
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
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={updateField}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <p className="mt-1 text-xs text-slate-400">
                At least 8 characters.
              </p>
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
              Create account
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Log in
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

