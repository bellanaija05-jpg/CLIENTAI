import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../hooks/useAuth.js'
import { updateProfile } from '../data/profiles.js'
import { profileFormSchema } from '../lib/schemas.js'
import { formatDate } from '../utils/format.js'
import Spinner from '../components/ui/Spinner.jsx'

// Same field styling constants as LeadForm/ActivityForm — the app's
// established form language, deliberately not extracted yet.
const labelClass = 'block text-sm font-medium text-slate-700'
const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200'
const errorClass = 'mt-1 text-xs text-red-600'

/**
 * Settings / account page (Phase 4 close-out).
 *
 * Shows the account facts the user cannot change (email, member since,
 * user id — all owned by Supabase auth / the signup trigger) and a
 * small form for the two display fields the profiles table exists for
 * (full_name, business_name). The save goes through updateProfile and
 * the existing RLS UPDATE policy ("Users can update own profile") —
 * ownership is enforced in the database, exactly like every other
 * write in the app.
 */
export default function Settings() {
  const { user, profile, refreshProfile, signOut, isLoading: authLoading } =
    useAuth()
  const [serverError, setServerError] = useState(null)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileFormSchema),
    // The form only mounts once `profile` is non-null (see below), so
    // these defaults always reflect the real row — RHF reads them once.
    defaultValues: {
      full_name: profile?.full_name ?? '',
      business_name: profile?.business_name ?? '',
    },
  })

  async function handleSave(values) {
    setServerError(null)
    setSaved(false)
    try {
      await updateProfile(user.id, values)
      // Re-fetch through AuthContext so the navbar name updates too.
      await refreshProfile()
      setSaved(true)
    } catch (err) {
      // Keep every edited value intact so the user can simply retry.
      setServerError(err.message)
    }
  }

  if (authLoading) return <Spinner fullScreen />

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your account details. Only you can see or change them.
      </p>

      {profile === null ? (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-medium text-amber-900">
            Profile not loaded
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Your profile row could not be read. If this stays empty, check
            that migration 0001_create_profiles.sql has been applied.
          </p>
        </div>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Account
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <dt className="w-32 shrink-0 font-medium text-slate-500">
                  Email
                </dt>
                <dd className="text-slate-800">{profile.email}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <dt className="w-32 shrink-0 font-medium text-slate-500">
                  Member since
                </dt>
                <dd className="text-slate-800">
                  {formatDate(profile.created_at)}
                </dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <dt className="w-32 shrink-0 font-medium text-slate-500">
                  User ID
                </dt>
                <dd className="break-all font-mono text-xs text-slate-500">
                  {profile.id}
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Profile
            </h2>
            <form
              onSubmit={handleSubmit(handleSave)}
              noValidate
              className="mt-4 space-y-4"
            >
              <div>
                <label htmlFor="full_name" className={labelClass}>
                  Full name
                </label>
                <input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  {...register('full_name')}
                  className={inputClass}
                />
                {errors.full_name && (
                  <p className={errorClass}>{errors.full_name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="business_name" className={labelClass}>
                  Business name
                </label>
                <input
                  id="business_name"
                  type="text"
                  autoComplete="organization"
                  {...register('business_name')}
                  className={inputClass}
                />
                {errors.business_name && (
                  <p className={errorClass}>{errors.business_name.message}</p>
                )}
              </div>

              {saved && (
                <p
                  role="status"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                >
                  Profile saved.
                </p>
              )}
              {serverError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {serverError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  Sign out
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && <Spinner />}
                  Save changes
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </main>
  )
}