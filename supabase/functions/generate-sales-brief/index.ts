// Supabase Edge Function: generate-sales-brief (Phase 8 Stage 4)
//
// The AI Daily Sales Brief: a 2–4 sentence natural-language summary of
// the day's sales situation, shown on the Dashboard.
//
// Deliberately a SEPARATE function from generate-follow-up (Phase 5):
// the brief has no single lead, needs no persistence (ai_generations
// requires a lead_id FK), and its context arrives already computed from
// the client — keeping the two flows independent guarantees Phase 5's
// behavior can never drift.
//
// The deterministic intelligence engine (src/lib/leadIntelligence.js)
// remains the ONLY source of truth for priority, ranking, signals, next
// actions, and metrics. This function NEVER decides what matters — it
// only summarizes the already-ranked facts it receives, under strict
// no-invention rules.
//
// Flow:
//   1. Verify the caller's JWT (user-scoped Supabase client — never
//      service_role). The brief is generated only for signed-in users.
//   2. Sanitize the request body's `context` with a strict whitelist:
//      known fields only, arrays capped, strings trimmed and length-
//      capped, numbers coerced to finite values. The client built this
//      context from its own RLS-scoped CRM data; nothing here is stored
//      or used for any database access.
//   3. Build the server-side prompt (role + no-invention rules) and call
//      the AI provider (OpenAI-compatible chat completions) using the
//      SAME function secrets as generate-follow-up. One retry on failure.
//   4. Return { brief } — the ONE documented success shape, where brief
//      is the plain-prose briefing text. All errors are JSON { error }
//      with user-safe messages — provider details and keys never reach
//      the client.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Browser callers need CORS headers on every response (supabase-js
// sends a preflight OPTIONS for cross-origin function calls).
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Payload ceilings — mirror the client builder's caps (lib/aiSalesBrief.js)
// so a hand-crafted request can never bloat the prompt.
const MAX_ATTENTION_ITEMS = 10
const MAX_WORK_TASKS = 10
const MAX_STRING_LENGTH = 300

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

// --- Context sanitization -------------------------------------------------
// The body's `context` is untrusted input: it is summarized into a
// prompt, so every field is whitelisted, trimmed, capped, and type-
// coerced. Unknown fields are dropped; malformed values become null and
// are filtered out.

function safeString(value, maxLength = MAX_STRING_LENGTH) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  return trimmed.slice(0, maxLength)
}

function safeNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function safeItem(entry) {
  if (entry === null || typeof entry !== 'object') return null
  const item = {
    name: safeString(entry.name, 200),
    status: safeString(entry.status, 50),
    value: safeNumber(entry.value),
    priority: safeString(entry.priority, 20),
    reason: safeString(entry.reason),
    recommendedAction: safeString(entry.recommendedAction, 200),
  }
  return item.name === null ? null : item
}

function safeTask(entry) {
  if (entry === null || typeof entry !== 'object') return null
  const task = {
    title: safeString(entry.title, 200),
    leadName: safeString(entry.leadName, 200),
    dueDate: safeString(entry.dueDate, 10),
    daysOverdue: safeNumber(entry.daysOverdue),
  }
  return task.title === null ? null : task
}

function sanitizeContext(raw) {
  if (raw === null || typeof raw !== 'object') return null
  const metrics =
    raw.salesMetrics !== null && typeof raw.salesMetrics === 'object'
      ? raw.salesMetrics
      : {}
  const workQueue =
    raw.workQueue !== null && typeof raw.workQueue === 'object'
      ? raw.workQueue
      : {}

  return {
    generatedFor: safeString(raw.generatedFor, 10),
    salesMetrics: {
      totalLeads: safeNumber(metrics.totalLeads),
      openLeads: safeNumber(metrics.openLeads),
      pipelineValue: safeNumber(metrics.pipelineValue),
      wonRevenue: safeNumber(metrics.wonRevenue),
      highPriorityLeads: safeNumber(metrics.highPriorityLeads),
      overdueFollowUps: safeNumber(metrics.overdueFollowUps),
      dueTodayFollowUps: safeNumber(metrics.dueTodayFollowUps),
    },
    attentionItems: Array.isArray(raw.attentionItems)
      ? raw.attentionItems
          .slice(0, MAX_ATTENTION_ITEMS)
          .map(safeItem)
          .filter(Boolean)
      : [],
    workQueue: {
      overdueFollowUps: safeNumber(workQueue.overdueFollowUps),
      dueTodayFollowUps: safeNumber(workQueue.dueTodayFollowUps),
      tasks: Array.isArray(workQueue.tasks)
        ? workQueue.tasks
            .slice(0, MAX_WORK_TASKS)
            .map(safeTask)
            .filter(Boolean)
        : [],
    },
  }
}

// Build the full prompt. The system message fixes the role and the
// no-invention contract; the user message carries the structured context.
function buildMessages(context) {
  return [
    {
      role: 'system',
      content: [
        'You are an AI sales assistant helping a salesperson understand today\u2019s CRM activity.',
        'You will receive a structured CRM context that the application\u2019s sales intelligence engine has already computed and ranked. The engine decides what matters — you only summarize it.',
        'Rules you must follow:',
        '- Use ONLY the supplied CRM context. Never invent or embellish any fact.',
        '- Never invent customer conversations, interests, objections, promises, deadlines, revenue, or lead activity.',
        '- Never claim a lead is likely to close unless the supplied data explicitly supports that wording.',
        '- Never claim a customer responded or replied unless the context says so.',
        '- Never invent urgency that the context does not show.',
        '- Never add a currency symbol or reformat numbers — state values exactly as given.',
        '- Summarize the already-ranked attention items in their given order: mention the most important opportunity first (name, value, and why it matters per the context).',
        '- Mention overdue follow-up work when the context shows any.',
        '- End by recommending the salesperson start with the highest-priority actionable item the context already identifies.',
        '- If the context is thin or lacks specifics, say so naturally instead of speculating.',
        '- Write 2 to 4 sentences maximum, in a professional, encouraging tone — like a competent assistant briefing a colleague.',
        '- Plain text only: no markdown, no headings, no bullet points, no commentary before or after.',
        '- Return ONLY the briefing text.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        'Write today\u2019s sales brief from the CRM context below.',
        // The summarization contract rides along in THIS message too, not
        // only in the system message: some OpenAI-compatible providers
        // apply system messages inconsistently, and a model that misses
        // the rules may echo the JSON context back instead of summarizing
        // it (which previously leaked raw fields like generatedFor into
        // the UI).
        'Summarize it in 2 to 4 sentences of plain prose: what matters most today, any overdue follow-up work, and what to start with.',
        'The attentionItems array is already ranked most-important first.',
        'Use ONLY the facts in the context — never invent anything, and never add a currency symbol.',
        'Do NOT repeat, quote, or echo the JSON itself, and never mention internal field names such as generatedFor, salesMetrics, attentionItems, workQueue, or priority in your reply.',
        'Reply with ONLY the briefing text — no markdown, no headings, no JSON, no field names, no commentary.',
        '',
        'CRM context (JSON):',
        JSON.stringify(context),
      ].join('\n'),
    },
  ]
}

// A valid brief is plain prose. The model is instructed to summarize and
// never to echo — but if a misbehaving model/provider echoes the JSON
// context (or any raw object) back, treating it as a FAILED attempt
// keeps internal field names out of the UI: the caller's retry loop
// tries once more, and if that also fails the user sees the usual
// friendly error state instead of a raw data dump.
function isValidBriefText(text) {
  return !/^\s*[{[]/.test(text) && !/\bgeneratedFor\b/.test(text)
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
        // Lower temperature than follow-up drafts: a brief is a factual
        // summary of supplied numbers, not creative writing.
        temperature: 0.4,
        max_tokens: 300,
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
        { error: 'You must be signed in to generate your sales brief.' },
        401,
      )
    }

    // USER-SCOPED client (anon key + caller's token). This function makes
    // no database queries at all — the client is created purely to verify
    // the JWT — and the service_role key is deliberately never used.
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
        { error: 'You must be signed in to generate your sales brief.' },
        401,
      )
    }

    // --- 2. Input validation: sanitize the context whitelist. ---
    const body = await req.json().catch(() => null)
    const context = sanitizeContext(body?.context)
    if (context === null) {
      return jsonResponse({ error: 'A valid sales context is required.' }, 400)
    }

    // --- 3. Provider configuration + call (one retry). ---
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

    const promptMessages = buildMessages(context)
    let text = null
    let lastError = null
    for (let attempt = 0; attempt < 2 && text === null; attempt++) {
      try {
        const candidate = await callProvider(
          { baseUrl, apiKey, model },
          promptMessages,
        )
        // Only accept PROSE. An echoed context dump (or any raw JSON/
        // object) is a failed attempt: retry once, then surface the
        // friendly error below — internal field names must never reach
        // the UI.
        if (isValidBriefText(candidate)) {
          text = candidate
        } else {
          lastError = new Error(
            'The AI returned an invalid response. Try generating again.',
          )
        }
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

    // --- 4. Success. The ONE documented response shape: { brief }.
    // Nothing is persisted: a brief is a disposable, on-demand summary
    // of data the user can always regenerate. ---
    return jsonResponse({ brief: text })
  } catch (_err) {
    // Deliberately opaque: never forward internal details to the client.
    return jsonResponse(
      {
        error:
          'Something went wrong while generating your sales brief. Please try again.',
      },
      500,
    )
  }
})
