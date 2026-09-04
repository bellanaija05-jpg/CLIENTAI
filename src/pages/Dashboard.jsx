// Temporary authenticated landing page.
// The real dashboard (KPIs, upcoming follow-ups, recent leads) is built
// in Phase 7. This stub exists so the Phase 1 auth loop is testable
// end-to-end: sign up → see your profile (proof the database trigger
// and RLS read worked) → sign out → get bounced to /login.
import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth.js'
import Spinner from '../components/ui/Spinner.jsx'

export default function Dashboard() {
  const { user, profile, signOut, isLoading } = useAuth()

  if (isLoading) return <Spinner fullScreen />

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          Phase 1 stub
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          You are logged in 🎉
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          The real dashboard arrives in Phase 7. This page exists to verify
          the authentication flow end-to-end.
        </p>

        <div className="mt-4">
          <Link
            to="/leads"
            className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Go to Leads →
          </Link>
        </div>

        {profile === null && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Profile row not loaded yet — if this stays empty, check that
            migration 0001_create_profiles.sql has been applied.
          </p>
        )}

        <dl className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 font-medium text-slate-500">User ID</dt>
            <dd className="break-all text-slate-800">{user?.id}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 font-medium text-slate-500">
              Full name
            </dt>
            <dd className="text-slate-800">{profile?.full_name || '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 font-medium text-slate-500">
              Business
            </dt>
            <dd className="text-slate-800">{profile?.business_name || '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 font-medium text-slate-500">Email</dt>
            <dd className="text-slate-800">{profile?.email || user?.email}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={signOut}
          className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}
