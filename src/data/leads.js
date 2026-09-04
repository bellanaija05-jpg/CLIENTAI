import { supabase } from '../lib/supabaseClient.js'
import { logStatusChange } from './activities.js'

/**
 * Data-access layer for leads.
 *
 * Project convention: every Supabase call lives in src/data — components
 * and hooks never import the client directly.
 *
 * Security note: none of these functions filter by user_id manually.
 * Row Level Security does that in the database on every call, based on
 * the JWT that supabase-js attaches automatically. listMyLeads() simply
 * selects all *visible* rows — and "visible" means "owned by the caller".
 */

// Create a lead for the currently authenticated user.
// user_id comes from the auth SESSION (never from a form field), and
// RLS ("Users can insert own leads") independently verifies it against
// the JWT — a tampered client cannot create a lead for someone else.
// Optional fields arrive as null (see lib/schemas.js), so the database
// stores clean NULLs instead of empty strings.
export async function createLead(userId, lead) {
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...lead, user_id: userId })
    .select('id, name, company, email, phone, status, value, created_at')
    .single()

  if (error) throw error
  return data
}

// Fetch ONE lead by id, for the edit page (and the future details page).
// Ownership: RLS ("Users can view own leads" — using auth.uid() =
// user_id) filters every query, so another user's lead matches ZERO
// rows. maybeSingle() turns "no rows" into null (not an error), which
// the page renders as "not found" — deliberately the SAME message for
// "doesn't exist" and "not yours", so the UI never leaks whether a
// foreign id exists.
export async function getLead(leadId) {
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, name, email, phone, company, source, status, value, notes, created_at, updated_at',
    )
    .eq('id', leadId)
    .maybeSingle()

  if (error) throw error
  return data
}

// Update ONLY the editable fields of a lead. The payload comes from the
// Zod-validated form, which has no id/user_id/created_at fields — and
// Zod object parsing strips unknown keys anyway, so those columns can
// never be modified from here. updated_at is owned by the
// leads_set_updated_at database trigger, not by client code.
// RLS ("Users can update own leads" — using AND with check on
// auth.uid() = user_id) means another user's lead matches zero rows:
// nothing is read, nothing is written.
// Update a lead AND keep its activity history consistent (Stage 3):
//   1. read the current lead from the DATABASE — the previous status is
//      never trusted from the client, and this also proves ownership
//      (a foreign leadId returns null here and nothing else happens);
//   2. update the lead — if this fails we throw BEFORE any activity is
//      created, so a failed update can never produce a status activity;
//   3. only on an actual status transition, log a STATUS_CHANGE activity
//      ("Status changed from X to Y.").
//
// KNOWN LIMITATION, reported honestly: supabase-js runs these as two
// separate calls and cannot wrap them in one database transaction. If
// the update succeeds but the activity insert fails, we throw a clear
// "saved, but not logged" error — and the flow is self-healing: the
// retry re-reads the lead, sees the status already matches, and
// completes without duplicating the activity. (A fully atomic version
// is possible later via a Postgres function through supabase.rpc();
// deliberately not introduced now.)
export async function updateLead(leadId, values) {
  const previous = await getLead(leadId)
  if (!previous) {
    throw new Error('Lead not found.')
  }

  const { data, error } = await supabase
    .from('leads')
    .update(values)
    .eq('id', leadId)
    .select('id, name, company, email, phone, status, value, created_at')
    .single()

  if (error) throw error

  if (values.status !== undefined && previous.status !== values.status) {
    try {
      await logStatusChange(leadId, previous.status, values.status)
    } catch {
      throw new Error(
        'Your changes were saved, but the status change could not be logged. Try saving again to finish logging it.',
      )
    }
  }

  return data
}

// List every lead the database lets this caller see.
// With RLS enabled that is exactly "my own leads" — the two-account
// security test in Phase 2 is what proves it.
export async function listMyLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, company, email, phone, status, value, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Delete one of the caller's leads by id.
// If the id belongs to another user, RLS makes the DELETE match zero
// rows — no error, and nothing is deleted.
export async function deleteLead(leadId) {
  const { error } = await supabase.from('leads').delete().eq('id', leadId)

  if (error) throw error
}
