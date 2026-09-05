import { z } from 'zod'

/**
 * Validation contracts shared between forms (create now, edit later).
 *
 * LEAD_STATUSES mirrors the lead_status enum created in
 * supabase/migrations/0002_create_crm_tables.sql — keep the two in
 * sync. The database remains the final authority: an unknown status is
 * rejected by Postgres even if the UI allowed it.
 */
export const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
]

/**
 * Canonical human-readable labels for the lead statuses (Phase 6 Stage 1
 * consolidation). The ONE place that names a status — Pipeline columns,
 * dashboards, insights — imports from here instead of keeping private
 * copies. Keys MUST mirror LEAD_STATUSES / the lead_status enum in
 * migration 0002 (labels are presentation only; the values are the
 * contract).
 */
export const STATUS_LABELS = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  WON: 'Won',
  LOST: 'Lost',
}

// Optional text field: trimmed, capped, and turned into null when left
// empty — so the database stores a clean NULL instead of ''.
function optionalText(maxLength) {
  return z
    .string()
    .trim()
    .max(maxLength, `Must be ${maxLength} characters or fewer`)
    .transform((value) => (value === '' ? null : value))
}

// Pragmatic email shape: something@something.something, no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Notes use the same normalization in the full lead form and the focused
// Lead Details editor: trim, cap at 5,000 characters, empty → null.
export const leadNotesSchema = optionalText(5000)

export const leadFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or fewer'),

  // Empty string means "no email" and becomes null; anything else must
  // match the email pattern.
  email: z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .max(320, 'Email must be 320 characters or fewer')
        .regex(EMAIL_PATTERN, 'Enter a valid email address'),
    ])
    .transform((value) => (value === '' ? null : value)),

  phone: optionalText(40),
  company: optionalText(200),
  source: optionalText(80),

  status: z.enum(LEAD_STATUSES),

  // Stored as numeric(12,2) in Postgres — the max below is exactly that
  // column's ceiling, so users get a friendly message instead of a
  // server error. Blank counts as 0 (the suggested default).
  value: z
    .string()
    .trim()
    .refine((v) => v === '' || !Number.isNaN(Number(v)), 'Enter a valid number')
    .transform((v) => (v === '' ? 0 : Number(v)))
    .refine((v) => v >= 0, 'Value cannot be negative')
    .refine((v) => v <= 9999999999.99, 'Value is too large'),

  notes: leadNotesSchema,
})

/**
 * Initial values for an empty lead form. `value` starts as an empty
 * STRING (the form field is text); the schema turns it into the number 0.
 */
export const emptyLeadForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: '',
  status: 'NEW',
  value: '',
  notes: '',
}

/**
 * Manual activity types. STATUS_CHANGE is deliberately excluded:
 * users never create it by hand — the data layer logs it automatically
 * when a lead's status changes (see updateLead in data/leads.js).
 */
export const ACTIVITY_TYPES = ['NOTE', 'CALL', 'EMAIL', 'MEETING']

export const activityFormSchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2000 characters or fewer'),
})

/** Initial values for an empty activity form. */
export const emptyActivityForm = {
  type: 'NOTE',
  description: '',
}

/**
 * Follow-up form (Phase 4 Stage 4). due_date comes from a native
 * <input type="date"> as "YYYY-MM-DD", which is exactly the Postgres
 * `date` shape — no coercion needed; the database stays date-only.
 */
export const followUpFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  description: optionalText(2000),
  due_date: z.string().min(1, 'Due date is required'),
})

/** Initial values for an empty follow-up form. */
export const emptyFollowUpForm = {
  title: '',
  description: '',
  due_date: '',
}

/**
 * AI follow-up intents (Phase 5). Kept deliberately small — three
 * intents that map onto the CRM's sales stages. Values MUST match the
 * ai_generation_type enum in supabase/migrations/0003_create_ai_generations.sql
 * (the database is the final authority) and the Edge Function's
 * VALID_INTENTS list — keep the three in sync.
 */
export const AI_INTENTS = [
  {
    value: 'FOLLOW_UP_GENERAL',
    label: 'General follow-up',
    description: 'A friendly check-in that moves the lead to the next step.',
  },
  {
    value: 'FOLLOW_UP_NO_RESPONSE',
    label: 'After no response',
    description: 'A short, easy-to-answer nudge when the lead has gone quiet.',
  },
  {
    value: 'FOLLOW_UP_PROPOSAL',
    label: 'After a proposal',
    description: 'Follow up on a sent proposal or quote and its timeline.',
  },
]

/** Default intent for the AI follow-up generator. */
export const DEFAULT_AI_INTENT = AI_INTENTS[0].value

/**
 * Account/profile form (Phase 4 close-out). The profiles table already
 * has an RLS UPDATE policy ("Users can update own profile"), so the two
 * display fields are user-editable. Email and id are owned by Supabase
 * auth / the signup trigger and are never editable here.
 */
export const profileFormSchema = z.object({
  full_name: optionalText(120),
  business_name: optionalText(120),
})
