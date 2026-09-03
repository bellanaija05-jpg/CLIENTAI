import { supabase } from '../lib/supabaseClient.js'

/**
 * Data-access layer for profiles.
 *
 * Project convention: every Supabase call lives in src/data — components
 * and hooks never import the client directly. This keeps the API surface
 * swappable and the calls unit-testable.
 */

// Fetch the profile row for the logged-in user.
// RLS (policy "Users can view own profile") restricts this to the
// caller's own row — enforced in the database, not here.
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, business_name, email, created_at')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}
