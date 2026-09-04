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
