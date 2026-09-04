import { supabase } from '../lib/supabaseClient.js'

/**
 * Data-access layer for follow-ups.
 *
 * Same conventions as activities.js: every Supabase call lives here,
 * ownership is enforced by RLS (auth.uid() = user_id) plus the composite
 * FK (lead_id, user_id) → leads (id, user_id), and the user identity for
 * inserts comes from the auth SESSION — never from the UI.
 */

// All follow-ups for the authenticated user, across all leads — the
// global Follow-Ups page. One efficient query (no per-lead requests).
// The embedded `leads(name)` keeps only the needed lead name for each
// row; supabase-js resolves it through the existing FK, and RLS applies
// to both tables. Ordering is deterministic (see the page's groups).
export async function listMyFollowUps() {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('id, lead_id, title, description, due_date, completed, created_at, leads(name)')
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// Per-lead + whole-user follow-up functions.
//
// Every INCOMPLETE follow-up for the authenticated user, across all
// leads. Used by the Dashboard's "Follow-Ups Due" card; RLS filters
// to the caller's rows. The due-count itself is computed client-side
// with todayDateKey() (date-only, timezone-safe).
export async function listIncompleteFollowUps() {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('id, due_date, completed')
    .eq('completed', false)
    .order('due_date', { ascending: true })

  if (error) throw error
  return data
}

// All follow-ups for one lead, in DISPLAY order: incomplete first
// (earliest due date asc), then completed (most recently created
// first) — the leftover grouping after the due_date sort.
export async function listLeadFollowUps(leadId) {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('id, title, description, due_date, completed, created_at')
    .eq('lead_id', leadId)
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error

  const incomplete = data.filter((followUp) => !followUp.completed)
  const completed = data
    .filter((followUp) => followUp.completed)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  return [...incomplete, ...completed]
}

// Create a follow-up for a lead. values come from the Zod-validated form
// ({ title, description, due_date }); completed defaults to false in the
// database. RLS + composite FK reject any foreign lead_id.
export async function createFollowUp(leadId, values) {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id
  if (!userId) {
    throw new Error('You must be signed in to set follow-ups.')
  }

  const { data, error } = await supabase
    .from('follow_ups')
    .insert({
      lead_id: leadId,
      user_id: userId,
      title: values.title,
      description: values.description,
      due_date: values.due_date,
    })
    .select('id, title, description, due_date, completed, created_at')
    .single()

  if (error) throw error
  return data
}

// Mark a follow-up complete. Ownership is RLS-enforced: completing a
// foreign id simply updates zero rows (PostgREST then errors), so no
// cross-user write is ever possible.
export async function completeFollowUp(followUpId) {
  const { data, error } = await supabase
    .from('follow_ups')
    .update({ completed: true })
    .eq('id', followUpId)
    .select('id, title, description, due_date, completed, created_at')
    .single()

  if (error) throw error
  return data
}