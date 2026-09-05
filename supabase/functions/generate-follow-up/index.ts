// Supabase Edge Function: generate-follow-up (Phase 5)
//
// The ONLY place in ClientFlow AI that knows the AI provider API key.
// The React app calls this function through supabase.functions.invoke,
// which automatically attaches the signed-in user's JWT — the key never
// exists in the browser bundle, in Vite env vars, or in any table.
//
// Flow:
//   1. Verify the caller's JWT and build a USER-SCOPED Supabase client
//      (anon key + caller's token). Every database read/write below runs
//      under the caller's RLS policies — the function never uses the
//      service_role key, so it can only ever touch data the caller
//      could touch themselves.
//   2. Load the requested lead through RLS. A foreign or unknown leadId
//      matches ZERO rows and returns the SAME "Lead not found." error —
//      the UI never learns whether someone else's lead id exists.
//   3. Load the lead's recent activities and follow-ups (same RLS).
//   4. Build the prompt server-side from that real CRM context.
//   5. Call the AI provider (OpenAI-compatible chat completions) using
//      secrets from the Edge Function environment. One retry on failure.
//   6. Validate the response and store it in ai_generations (the insert
//      runs under the caller's JWT, so RLS enforces user scoping).
//   7. Return { text }. All errors are JSON { error } with user-safe
//      messages — provider details, stack traces, and keys are never
//      forwarded to the client.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Browser callers need CORS headers on every response (supabase-js
// sends a preflight OPTIONS for cross-origin function calls).
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_INTENTS = [
  'FOLLOW_UP_GENERAL',
  'FOLLOW_UP_NO_RESPONSE',
  'FOLLOW_UP_PROPOSAL',
]

// Per-intent instructions. The CRM context (notes, activities,
// follow-ups) provides the specifics; these only shape the angle.
const INTENT_INSTRUCTIONS = {
  FOLLOW_UP_GENERAL:
    'This is a general check-in follow-up: re-engage the lead, offer help, and gently move the conversation to the next step.',
  FOLLOW_UP_NO_RESPONSE:
    'The lead has not responded recently: write a short, friendly nudge that makes replying easy. Do NOT claim they received or read a previous message unless the context proves it, and do NOT guilt or pressure them.',
  FOLLOW_UP_PROPOSAL:
    'A proposal or quote has been sent: follow up on it, offer to answer questions, and ask about the decision timeline. Do NOT invent proposal details, prices, or dates that are not in the context.',
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Map provider HTTP failures to safe, actionable messages. Raw provider
// errors never reach the client (they can embed account details).
function userErrorMessage(status) {
  if (status === 401 || status === 403) {
    return 'The AI service rejected its credentials. Check the AI_API_KEY function secret and try again.'
  }
  if (status === 429) {
    return 'The AI service is rate-limited right now. Please try again in a moment.'
  }
  return 'The AI service is temporarily unavailable. Please try again.'
}

// Build the full prompt from the lead's real CRM context. Everything the
// model sees comes from the database — nothing is invented here either.
function buildMessages(lead, activities, followUps, intent) {
  const statusLabels = {
    NEW: 'New (not yet contacted)',
    CONTACTED: 'Contacted',
    QUALIFIED: 'Qualified',
    PROPOSAL: 'Proposal sent',
    WON: 'Won',
    LOST: 'Lost',
  }

  const contextLines = [
    `Lead name: ${lead.name}`,
    lead.company ? `Company: ${lead.company}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.source ? `Lead source: ${lead.source}` : null,
    `Current pipeline status: ${statusLabels[lead.status] ?? lead.status}`,
    lead.value > 0 ? `Deal value: ${lead.value}` : null,
    lead.notes ? `CRM notes about this lead: ${lead.notes}` : null,
    activities?.length
      ? `Recent activity history (newest first):\n${activities
          .map(
            (a) =>
              `- [${a.type}] ${a.description} (${a.created_at.slice(0, 10)})`,
          )
          .join('\n')}`
      : 'No activities have been logged yet.',
    followUps?.length
      ? `Follow-ups for this lead:\n${followUps
          .map(
            (f) =>
              `- ${f.title}${f.completed ? ' (completed)' : ` (due ${f.due_date})`}${f.description ? `: ${f.description}` : ''}`,
          )
          .join('\n')}`
      : 'No follow-ups have been scheduled yet.',
  ]
    .filter(Boolean)
    .join('\n')

  return [
    {
      role: 'system',
      content: [
        'You write follow-up messages for a small-business CRM user (a freelancer, agency, or consultant) to send to one of their leads.',
        'Rules you must follow:',
        '- Use ONLY the supplied CRM context. Never invent facts, names, dates, prices, meeting outcomes, or promises.',
        '- Never pretend a conversation, call, meeting, or reply happened unless the context proves it did.',
        '- Do not make unsupported promises (discounts, timelines, availability).',
        '- Reference relevant notes, recent activities, or open follow-ups when they genuinely help; skip them otherwise.',
        '- Match the lead\u2019s current pipeline stage — do not push a New lead as if they are about to sign.',
        '- Keep the message concise (roughly 60-150 words) and natural, in a warm, helpful sales tone — never robotic.',
        '- Do not include a subject line, bracketed placeholders, or signature blocks.',
        '- Return ONLY the message text, with no commentary before or after it.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        'Write a follow-up message for this lead using the CRM context below.',
        INTENT_INSTRUCTIONS[intent] ?? INTENT_INSTRUCTIONS.FOLLOW_UP_GENERAL,
        '',
        'CRM context:',
        contextLines,
      ].join('\n'),
    },
  ]
}

// One provider call. Returns the generated text or throws with a safe
// message; the caller retries once and then surfaces the last error.
async function callProvider({ baseUrl, apiKey, model }, messages) {
  // Normalize the base URL: a trailing slash in the AI_API_BASE_URL
  // secret must never produce a double slash in the endpoint URL
  // (…/openai//chat/completions → 404). Strips ALL trailing slashes.
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })
  } catch {
    // Network-level failure (DNS, TLS, connection...): the raw error can
    // contain environment details, so surface a safe message only.
    throw new Error('Could not reach the AI provider. Please try again.')
  }

  if (!response.ok) {
    throw new Error(userErrorMessage(response.status))
  }

  const payload = await response.json()
  const text = payload?.choices?.[0]?.message?.content?.trim()
  if (!text) {
    throw new Error('The AI returned an empty response. Try generating again.')
  }
  return text
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // --- 1. Authentication: the caller's JWT, verified by Supabase. ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse(
        { error: 'You must be signed in to generate follow-ups.' },
        401,
      )
    }

    // USER-SCOPED client (anon key + caller's token): every query below
    // runs under the caller's RLS policies. The service_role key is
    // deliberately never used here.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return jsonResponse(
        { error: 'You must be signed in to generate follow-ups.' },
        401,
      )
    }

    // --- 2. Input validation (never trust the request body). ---
    const body = await req.json().catch(() => null)
    const leadId = body?.leadId
    const intent = body?.intent
    if (typeof leadId !== 'string' || leadId.length === 0) {
      return jsonResponse({ error: 'A lead id is required.' }, 400)
    }
    if (!VALID_INTENTS.includes(intent)) {
      return jsonResponse({ error: 'Unknown follow-up type.' }, 400)
    }

    // --- 3. Lead ownership: RLS decides. A foreign/unknown id matches
    // zero rows, and BOTH cases get the same message (no leaking). ---
    const { data: lead } = await supabase
      .from('leads')
      .select('id, name, email, phone, company, source, status, value, notes')
      .eq('id', leadId)
      .maybeSingle()
    if (!lead) {
      return jsonResponse({ error: 'Lead not found.' }, 404)
    }

    // --- 4. Supporting context (same RLS-scoped client). Best-effort:
    // empty lists simply make a slightly more generic prompt, and a
    // context failure must not kill the generation. ---
    const [activitiesResult, followUpsResult] = await Promise.all([
      supabase
        .from('activities')
        .select('type, description, created_at')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('follow_ups')
        .select('title, description, due_date, completed')
        .eq('lead_id', lead.id)
        .order('due_date', { ascending: false })
        .limit(5),
    ])
    const activities = activitiesResult.data ?? []
    const followUps = followUpsResult.data ?? []

    // --- 5. Provider configuration + call (one retry). ---
    const apiKey = Deno.env.get('AI_API_KEY')
    if (!apiKey) {
      return jsonResponse(
        {
          error:
            'AI is not configured yet. Set the AI_API_KEY function secret to enable generation.',
        },
        503,
      )
    }
    const baseUrl =
      Deno.env.get('AI_API_BASE_URL') ?? 'https://api.openai.com/v1'
    const model = Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini'

    const promptMessages = buildMessages(lead, activities, followUps, intent)
    let text = null
    let lastError = null
    for (let attempt = 0; attempt < 2 && text === null; attempt++) {
      try {
        text = await callProvider(
          { baseUrl, apiKey, model },
          promptMessages,
        )
      } catch (err) {
        lastError = err
      }
    }
    if (text === null) {
      return jsonResponse(
        {
          error:
            lastError?.message ??
            'The AI service is temporarily unavailable. Please try again.',
        },
        502,
      )
    }

    // --- 6. Store the generation. The insert runs under the caller's
    // JWT: RLS ("Users can insert own ai_generations") enforces user
    // scoping, and the composite FK rejects any foreign lead_id. ---
    const { error: insertError } = await supabase
      .from('ai_generations')
      .insert({
        lead_id: lead.id,
        user_id: user.id,
        type: intent,
        model,
        response: text,
      })
    if (insertError) {
      // The draft is still returned — history is best-effort, and the
      // user should not lose a good generation over a logging failure.
      console.error('ai_generations insert failed:', insertError.message)
    }

    // --- 7. Success. ---
    return jsonResponse({ text })
  } catch (_err) {
    // Deliberately opaque: never forward internal details to the client.
    return jsonResponse(
      {
        error:
          'Something went wrong while generating the follow-up. Please try again.',
      },
      500,
    )
  }
})

