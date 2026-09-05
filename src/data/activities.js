import { supabase } from '../lib/supabaseClient.js'

/**
 * Data-access layer for activities.
 *
 * Same convention as leads.js: every Supabase call lives in src/data,
 * and ownership is enforced by RLS ("Users can view own activities" —
 * auth.uid() = user_id), never by manual client-side filtering.
 *
 * The composite foreign key (lead_id, user_id) → leads (id, user_id)
 * makes cross-user activity rows unrepresentable in the first place,
 * so a foreign leadId simply matches zero rows here.
 */

// List the activities for one lead, newest first. Selects only what
// the timeline UI needs: id (React keys), type, description, created_at.
export async function listLeadActivities(leadId) {
  const { data, error } = await supabase
    .from('activities')
    .select('id, type, description, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// --- Activity creation (Phase 4 Stage 3) --------------------------------

const MANUAL_ACTIVITY_TYPES = ['NOTE', 'CALL', 'EMAIL', 'MEETING']

// Shared insert used by both entry points below. The authenticated
// identity comes from the Supabase SESSION — never from the UI — and
// RLS ("Users can insert own activities") verifies it against the JWT.
// The composite FK (lead_id, user_id) additionally requires the lead to
// belong to the same user, so an activity can never be attached to
// another user's lead, even by a tampered client.
async function insertActivity(leadId, type, description) {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id
  if (!userId) {
    throw new Error('You must be signed in to record activities.')
  }

  const { data, error } = await supabase
    .from('activities')
    .insert({ lead_id: leadId, user_id: userId, type, description })
    .select('id, type, description, created_at')
    .single()

  if (error) throw error
  return data
}

// Record a MANUAL activity (Note/Call/Email/Meeting) from the form.
// STATUS_CHANGE is deliberately refused here: users never create it by
// hand — status transitions are logged by the data layer itself.
export async function createActivity(leadId, type, description) {
  if (!MANUAL_ACTIVITY_TYPES.includes(type)) {
    throw new Error('Choose a valid activity type.')
  }
  return insertActivity(leadId, type, description)
}

// INTERNAL — used by updateLead (data/leads.js) when a lead's status
// actually changes. Not intended for direct UI use.
export async function logStatusChange(leadId, fromStatus, toStatus) {
  return insertActivity(
    leadId,
    'STATUS_CHANGE',
    `Status changed from ${fromStatus} to ${toStatus}.`,
  )
}

// Lightweight activity "stamps" for the whole user (Phase 6 Stage 1):
// ONLY lead_id + created_at, so the lead-intelligence engine can derive
// "last activity per lead" in one request. Deliberately minimal:
//   - no descriptions/types — the timeline functions own those;
//   - no manual user filtering — RLS ("Users can view own activities")
//     scopes every row to the caller, same as everywhere else in src/data;
//   - no ordering — the engine takes the max created_at per lead itself
//     (buildLastActivityMap in lib/leadIntelligence.js), so sorting here
//     would only cost the database work.
// Consumers: hooks/useMyActivityStamps.js → leadIntelligence rules.
// NOTE: leads.updated_at is deliberately NOT used for staleness — it
// moves on any lead edit and never moves when an activity is created.
export async function listMyActivityStamps() {
  const { data, error } = await supabase
    .from('activities')
    .select('lead_id, created_at')

  if (error) throw error
  return data
}
