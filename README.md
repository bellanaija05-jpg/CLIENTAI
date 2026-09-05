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
