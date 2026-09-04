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
// The client never invents a user_id: it comes from the session, and
// RLS ("Users can insert own leads") rejects any row that claims
// someone else's identity.
export async function insertLead(userId, lead) {
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...lead, user_id: userId })
    .select('id, name, company, status, value, created_at')
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
