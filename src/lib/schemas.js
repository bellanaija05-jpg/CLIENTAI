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

  notes: optionalText(5000),
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
