/**
 * Small formatting helpers shared across pages.
 * Pure functions (no React, no fetching) — trivial to reuse and test.
 */

// "2026-03-09T10:14:00Z" → "Mar 9, 2026" (rendered in the viewer's locale)
export function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// 12500.5 → "12,500.5" — thousands separators only.
// Deliberately NO currency symbol: ClientFlow has no per-user currency
// setting yet, and printing "$" would be a fake assumption. Real
// currency formatting arrives with the Settings phase.
export function formatValue(number) {
  return Number(number ?? 0).toLocaleString()
}
