import { Link } from 'react-router'
import { emailHref, telHref } from '../../utils/format.js'

// Compact control styling, following the app's existing button language
// (the "Mark Complete" outline style; the brand-600 solid style). A
// focus-visible ring is added explicitly so keyboard focus is obvious on
// every control.
const PRIMARY_CLASSES =
  'rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
const SECONDARY_CLASSES =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'

/**
 * Compact row of the most common lead actions (Phase 4 Stage 12).
 *
 * Pure UI: it renders links/buttons and calls back up — it never fetches,
 * never writes, and never creates a record. Add Activity / Add Follow-Up
 * only ask the page to open the existing inline forms in their sections;
 * Email / Call reuse the exact same safe mailto:/tel: href builders as
 * the contact fields and are rendered only when the data exists, so a
 * missing email or phone can never produce a broken link.
 */
export default function LeadQuickActions({
  leadId,
  email,
  phone,
  onAddActivity,
  onAddFollowUp,
}) {
  return (
    <div
      role="group"
      aria-label="Quick actions"
      className="flex flex-wrap items-center justify-start gap-2 sm:justify-end"
    >
      <Link to={`/leads/${leadId}/edit`} className={PRIMARY_CLASSES}>
        Edit Lead
      </Link>
      <button type="button" onClick={onAddActivity} className={SECONDARY_CLASSES}>
        Add Activity
      </button>
      <button
        type="button"
        onClick={onAddFollowUp}
        className={SECONDARY_CLASSES}
      >
        Add Follow-Up
      </button>
      {email && (
        <a href={emailHref(email)} className={SECONDARY_CLASSES}>
          Email
        </a>
      )}
      {phone && (
        <a href={telHref(phone)} className={SECONDARY_CLASSES}>
          Call
        </a>
      )}
    </div>
  )
}