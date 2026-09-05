/**
 * Shared panel error state (Phase 6 Stage 2 — extracted from
 * Dashboard.jsx so every dashboard panel shows the SAME error treatment
 * instead of three private copies). The retry re-runs the page-level
 * hook(s) that own the failed data.
 */
export default function PanelError({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
      <p className="text-sm font-medium text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  )
}