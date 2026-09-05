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
- [ ] Phase 1 — Authentication (Supabase Auth + profiles trigger)
- [ ] Phase 2 — Database schema + Row Level Security
- [ ] Phase 3 — Leads CRUD
- [ ] Phase 4 — Lead details + activities
- [ ] Phase 5 — Follow-ups
- [ ] Phase 6 — Sales pipeline (kanban)
- [ ] Phase 7 — Dashboard + analytics v1
- [ ] Phase 8 — Settings + polish
- [ ] Phase 9 — Hardening + deploy
- [ ] Phase 10 — AI follow-up generator (Supabase Edge Function proxy)
