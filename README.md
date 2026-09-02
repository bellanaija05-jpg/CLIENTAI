# ClientFlow AI

A lightweight CRM for freelancers, agencies, and consultants: capture leads,
organize them through a sales pipeline, schedule follow-ups, and (soon)
generate personalized follow-up messages with AI.

## Stack

- **Frontend:** React + Vite, Tailwind CSS v4, React Router v7
- **Backend:** Supabase (Auth + PostgreSQL with Row Level Security)
- **AI:** external provider, integrated in a later phase through a server-side
  proxy so the API key never reaches the browser

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
