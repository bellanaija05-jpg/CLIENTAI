import { Link } from 'react-router'

/**
 * Catch-all 404 page. Public (outside ProtectedRoute): a logged-out
 * visitor gets the same page — the Dashboard link then bounces them to
 * /login through the normal ProtectedRoute flow, so no auth logic is
 * duplicated here.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-4xl" aria-hidden="true">
          🧭
        </p>
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you are looking for doesn&rsquo;t exist or may have moved.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/dashboard"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Go to home
          </Link>
        </div>
      </div>
    </main>
  )
}