import { supabase } from '../lib/supabaseClient.js'

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
export async function updateLead(leadId, values) {
  const { data, error } = await supabase
    .from('leads')
    .update(values)
    .eq('id', leadId)
    .select('id, name, company, email, phone, status, value, created_at')
    .single()

  if (error) throw error
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
