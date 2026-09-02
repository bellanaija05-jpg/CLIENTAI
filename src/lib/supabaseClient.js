import { createClient } from '@supabase/supabase-js'

// Configuration comes exclusively from environment variables.
// Vite only exposes variables prefixed with VITE_ to the browser bundle,
// which is why every app-level variable must start with VITE_.
//
// The anon key is PUBLIC by design: it is safe in the browser because real
// security is enforced by PostgreSQL Row Level Security (RLS), never by
// hiding this key. The service_role key must NEVER be placed in this app.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. ' +
      'Copy .env.example to .env and set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY (Supabase Dashboard → Project Settings → API), ' +
      'then restart the dev server.',
  )
}

// Single shared client for the whole app. Nothing imports this yet — it is
// created in Phase 0 so Phase 1 (authentication) can use it immediately.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
