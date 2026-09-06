# ClientFlow AI

A lightweight CRM for freelancers, agencies, and consultants: capture leads,
organize them through a sales pipeline, schedule follow-ups, and (soon)
generate personalized follow-up messages with AI.

## Stack

- **Frontend:** React + Vite, Tailwind CSS v4, React Router v7
- **Backend:** Supabase (Auth + PostgreSQL with Row Level Security + Edge
  Functions)
- **AI:** OpenAI-compatible provider, called only from a Supabase Edge
  Function so the API key never reaches the browser

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Then fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your
   Supabase dashboard (Project Settings → API). Not required until Phase 1.

3. Start the dev server:

   ```bash
   npm run dev
   ```

## AI Follow-Up Generator (Phase 5)

The AI Follow-Up Generator on Lead Details drafts a personalized follow-up
message from the lead's real CRM context (status, value, notes, recent
activities, follow-ups). The draft is editable and copyable — nothing is
ever sent automatically.

Setup:

1. Apply `supabase/migrations/0003_create_ai_generations.sql` in the Supabase
   SQL Editor (after 0001 and 0002).
2. Set the provider key as an **Edge Function secret** — never a `VITE_`
   variable:

   ```bash
   supabase secrets set AI_API_KEY=sk-your-key-here
   # optional overrides (defaults: gpt-4o-mini @ https://api.openai.com/v1):
   supabase secrets set AI_MODEL=gpt-4o-mini
   supabase secrets set AI_API_BASE_URL=https://api.openai.com/v1
   ```

3. Deploy the function:

   ```bash
   supabase functions deploy generate-follow-up
   # local development instead:
   supabase functions serve generate-follow-up
   ```

Without a deployed function or `AI_API_KEY`, the rest of the CRM works
normally and the generator shows a user-friendly error state.

## Sales Intelligence & Lead Prioritization (Phase 6)

ClientFlow answers *"which leads should I focus on first?"* with a
deterministic, rule-based intelligence engine (`src/lib/leadIntelligence.js`)
that turns the CRM data you already enter into actionable signals. No AI is
involved in scoring, and "last activity" always comes from activity
timestamps — never `updated_at`.

- **Priority** — every open lead is scored on signals like overdue and
  upcoming follow-ups, proposal stage, deal value, and activity freshness,
  then labelled **High / Medium / Low**. WON and LOST leads are closed and
  get no priority.
- **Dashboard** — a Needs Attention panel (top leads that need action
  today, with their recommended next action), a Sales Summary (total/open/
  won/lost, pipeline value, high-priority count), and a Pipeline-by-stage
  breakdown.
- **Lead Details** — a Lead Intelligence section explaining why a lead has
  its priority, the influencing signals, and the recommended next action.
- **Leads list** — Priority column, priority filter, and a "Priority (high
  first)" sort, combinable with search and status filtering.

The engine is centralised and explainable: the same `computeLeadPriority()`
drives the dashboard, Lead Details, and the Leads list, so priorities are
always consistent.

## AI Daily Sales Brief (Phase 8 Stage 4)

A compact panel on the Dashboard (between Today's Sales Focus and Today's
Sales Work) that turns the deterministic intelligence into a 2–4 sentence
assistant briefing: what matters most today, what is overdue, and where to
start. The AI only summarizes facts the engine already computed and ranked —
it never decides priority and never invents information.

- Generation is **user-triggered only** ("Generate Brief" / "Refresh
  Brief") — never automatic, so it costs one AI request per explicit click.
- A day with no meaningful signals shows a deterministic "all caught up"
  message without spending an AI request.
- Nothing is persisted; the brief is a disposable on-demand summary (no
  new table or migration).
- Context is built by the pure helper `src/lib/aiSalesBrief.js` from data
  the Dashboard already loaded — no extra CRM requests.

Setup: uses the **same** `AI_API_KEY` / `AI_MODEL` / `AI_API_BASE_URL`
secrets as the follow-up generator. Deploy the additional function once:

```bash
supabase functions deploy generate-sales-brief
# local development instead:
supabase functions serve generate-sales-brief
```

Without the deployed function or `AI_API_KEY`, the Dashboard works
normally and the brief shows a user-friendly error state.

## Production deployment

A testing/learning-friendly checklist. The app is **frontend-only static
files + Supabase** — deploy the static build to any static host (Netlify,
Vercel, Cloudflare Pages, GitHub Pages) and configure Supabase once.

1. **Build the frontend**

   ```bash
   npm install
   npm run build
   ```

   Static files land in `dist/` — point your host's "publish directory" at it.

2. **Configure the frontend environment variables** in your host's dashboard
   (not in git):

   | Variable | Where from |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Supabase project URL (Project Settings → API) |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public by design) |

   > The anon key is **safe** in the browser — real access control is enforced
   > by PostgreSQL Row Level Security (RLS), not by hiding this key. The
   > `service_role` key must never be used in the frontend.

3. **Apply the database migrations** once in the Supabase SQL Editor, **in
   order** (`0001` → `0002` → `0003`). Each file is a single transaction
   (all-or-nothing) and uses `IF NOT EXISTS`.

4. **Provision the AI Edge Function secret** (if you want the AI Follow-Up
   Generator): set it in the Supabase dashboard under
   **Project Settings → Functions → Secrets**.

   ```bash
   supabase secrets set AI_API_KEY=sk-your-key-here
   # optional overrides (defaults shown):
   supabase secrets set AI_MODEL=gpt-4o-mini
   supabase secrets set AI_API_BASE_URL=https://api.openai.com/v1
   ```

   Deploy the function once:

   ```bash
   supabase functions deploy generate-follow-up
   ```

   > No `GEMINI_API_KEY` is needed — the project uses an OpenAI-compatible
   > `AI_API_KEY` secret instead. If left unset, the rest of the CRM works
   > normally and the generator shows a friendly error.

5. **Configure Supabase Auth redirects**. In **Project Settings → Auth**, set:

   - **Site URL** → your production domain (e.g. `https://app.clientflow.ai`)
   - **Redirect URLs** → add your domain plus auth callback paths,
     e.g. `https://app.clientflow.ai/login` and `https://app.clientflow.ai/callback`

   Without these, email-confirmation links and magic-link logins will fail to
   return users to the app.

That's the full production checklist. Re-deploying the frontend is just
rebuild + republish; Supabase configuration is one-time.

## Scripts

| Command             | Purpose                        |
| ------------------- | ------------------------------ |
| `npm run dev`       | Start the Vite dev server      |
| `npm run build`     | Production build               |
| `npm run preview`   | Preview the production build   |
| `npm run lint`      | ESLint                         |

## Build phases

- [x] Phase 0 — Foundations: Vite + React + Tailwind, ESLint, routing
      skeleton, landing page, environment configuration
- [x] Phase 1 — Authentication (Supabase Auth + profiles trigger)
- [x] Phase 2 — Database schema + Row Level Security
- [x] Phase 3 — Leads CRUD
- [x] Phase 4 — Lead details + activities
- [x] Phase 5 — Follow-ups
- [x] Phase 6 — Sales pipeline (kanban)
- [x] Phase 7 — Dashboard + analytics v1
- [x] Phase 8 — Settings + polish
- [ ] Phase 9 — Hardening + deploy
- [x] Phase 10 — AI follow-up generator (Supabase Edge Function proxy)
