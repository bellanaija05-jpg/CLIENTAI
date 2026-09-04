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

// ISO timestamp → "Mar 9, 2026, 2:45 PM" (rendered in the viewer's
// locale). Used where the time of day matters (activity timeline).
export function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// --- Date-only (Postgres `date`) helpers -------------------------------
// A `date` column arrives from supabase-js as "YYYY-MM-DD". We handle it
// as a date KEY with string part math rather than JS Date parsing, which
// would introduce timezone offsets for date-only values.

// Local today as "YYYY-MM-DD", for comparing against date keys. ISO
// date strings compare correctly with plain string < / >, so a due date
// key is "overdue" when it is less than this.
export function todayDateKey() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "2026-09-08" → "Sep 8, 2026" — built from the parts as a LOCAL date
// (midnight local), so the displayed day can never shift by a timezone.
export function formatDateKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// --- Contact action href builders (Stages 11/12) ------------------------
// Minimal href builders for a lead's contact fields. The displayed text
// always stays exactly as stored — these only shape the href of the
// semantic <a> wrapper. No tracking parameters, no country-code guessing.

// Email: remove ALL whitespace (not just the ends) so a data-entry
// artifact inside the address — stray spaces, line breaks, non-breaking
// spaces — can never produce an invalid mailto: URI that silently fails
// to open a mail client. Everything else is kept verbatim, so the stored
// email remains the source of truth and the displayed text is untouched
// (only the href is shaped).
export function emailHref(email) {
  return `mailto:${email.replace(/\s+/g, '')}`
}

// Phone: strip only the characters a tel: URI cannot carry (whitespace
// and punctuation separators). Digits and any leading "+" are kept
// verbatim — the stored number is the source of truth.
export function telHref(phone) {
  return `tel:${phone.replace(/[\s().-]/g, '')}`
}
