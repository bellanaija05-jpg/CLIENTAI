import { supabase } from '../lib/supabaseClient.js'
import { FunctionsHttpError } from '@supabase/supabase-js'

/**
 * Data-access layer for AI features (Phase 5).
 *
 * Same convention as every other module here: components never talk to
 * transport directly. The AI generation itself happens in the
 * generate-follow-up Supabase Edge Function — the provider API key only
 * ever exists as a server-side function secret. supabase.functions.invoke
 * automatically attaches the signed-in user's JWT, and the function
 * re-verifies lead ownership through RLS before doing anything.
 */

// Generate an AI follow-up draft for one lead.
// Returns the generated message text. Server-side errors (bad lead,
// not signed in, provider down, missing key...) arrive as the Edge
// Function's JSON { error } and are surfaced as thrown Errors with the
// same user-safe message the function produced.
export async function generateFollowUp(leadId, intent) {
  const { data, error } = await supabase.functions.invoke(
    'generate-follow-up',
    { body: { leadId, intent } },
  )

  if (error) {
    if (error instanceof FunctionsHttpError) {
      // The function responded with a JSON { error } body — use it.
      let message =
        'The AI service could not complete your request. Please try again.'
      try {
        const payload = await error.context.json()
        if (payload?.error) message = payload.error
      } catch {
        // Non-JSON error body: keep the default message.
      }
      throw new Error(message)
    }
    // Network/DNS-style failure reaching the function at all.
    throw new Error(
      error.message ||
        'Could not reach the AI service. Check your connection and try again.',
    )
  }

  if (!data?.text || typeof data.text !== 'string' || data.text.trim() === '') {
    throw new Error('The AI returned an empty response. Try generating again.')
  }

  return data.text.trim()
}

// Generate the AI Daily Sales Brief (Phase 8 Stage 4) from the compact
// context the Dashboard's pure builder (lib/aiSalesBrief.js) produced.
// Same conventions as generateFollowUp above: the generation happens in
// the generate-sales-brief Edge Function (server-side API key, caller's
// JWT attached automatically by supabase.functions.invoke) — the browser
// never sees a provider secret, and the context is derived only from
// data the signed-in user's own RLS-scoped requests already returned.
// Returns the briefing text from the function's documented { brief }
// response; server-side errors arrive as thrown Errors with the same
// user-safe message the function produced.
export async function generateSalesBrief(context) {
  const { data, error } = await supabase.functions.invoke(
    'generate-sales-brief',
    { body: { context } },
  )

  if (error) {
    if (error instanceof FunctionsHttpError) {
      // The function responded with a JSON { error } body — use it.
      let message =
        'The AI service could not complete your request. Please try again.'
      try {
        const payload = await error.context.json()
        if (payload?.error) message = payload.error
      } catch {
        // Non-JSON error body: keep the default message.
      }
      throw new Error(message)
    }
    // Network/DNS-style failure reaching the function at all.
    throw new Error(
      error.message ||
        'Could not reach the AI service. Check your connection and try again.',
    )
  }

  // Strict shape check: the ONLY success shape is { brief: "<prose>" }.
  // The echo guards are the client's last line of defense — a stale or
  // misbehaving deployed function can never leak raw response fields
  // (generatedFor, JSON, [object Object]) into the panel; they surface
  // as the usual friendly error instead.
  if (
    !data?.brief ||
    typeof data.brief !== 'string' ||
    data.brief.trim() === '' ||
    /^\s*[{[]/.test(data.brief) ||
    /\bgeneratedFor\b/.test(data.brief)
  ) {
    throw new Error('The AI returned an invalid response. Try generating again.')
  }

  return data.brief.trim()
}