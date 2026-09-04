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

// Update the logged-in user's own profile (display fields only).
// values comes from the Zod-validated Settings form ({ full_name,
// business_name }); id and email are never editable. The eq('id',
// userId) is defense in depth — the RLS UPDATE policy ("Users can
// update own profile") would reject a foreign id anyway. Same
// ownership pattern as the leads data layer.
export async function updateProfile(userId, values) {
  const { data, error } = await supabase
    .from('profiles')
    .update(values)
    .eq('id', userId)
    .select('id, full_name, business_name, email, created_at')
    .single()

  if (error) throw error
  return data
}
