/**
 * Minimal loading indicator.
 * fullScreen: blocks the whole page (used by ProtectedRoute while the
 * session is being restored); otherwise renders inline (for buttons).
 */
export default function Spinner({ fullScreen = false, label = 'Loading…' }) {
  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600"
      role="status"
    >
      <span className="sr-only">{label}</span>
    </span>
  )
}
