// Temporary placeholder — real authentication is built in Phase 1.
// Kept as a stub so the landing page navigation is testable in Phase 0.
import { Link } from 'react-router'

export default function Login() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Log in to ClientFlow AI
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Authentication arrives in Phase 1 of the build plan.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  )
}
