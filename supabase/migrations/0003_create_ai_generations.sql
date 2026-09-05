-- ============================================================
-- Migration 0003: AI generation history (ai_generations)
-- Phase 5 of ClientFlow AI (AI Follow-Up Generator)
--
-- Prerequisite: 0002_create_crm_tables.sql has been applied.
-- Apply via: Supabase Dashboard → SQL Editor → paste entire file → Run.
-- The whole file executes as ONE transaction: all-or-nothing.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enum type — valid AI generation intents, enforced by the
--    database itself for every writer. Kept deliberately small:
--    the three intents map to the CRM's sales stages. Extend
--    later with ALTER TYPE ... ADD VALUE.
--
--    The matching UI constants live in src/lib/schemas.js —
--    keep the two in sync.
-- ------------------------------------------------------------
create type public.ai_generation_type as enum (
  'FOLLOW_UP_GENERAL',
  'FOLLOW_UP_NO_RESPONSE',
  'FOLLOW_UP_PROPOSAL'
);

-- ------------------------------------------------------------
-- 2. ai_generations — an append-only history of AI drafts.
--
--    Same composite FK pattern as activities/follow_ups:
--    (lead_id, user_id) → leads (id, user_id) links the record
--    to its lead AND guarantees the record's owner matches the
--    lead's owner — cross-user rows are structurally impossible.
--
--    Stored: which intent, which model produced it (a config
--    identifier, NOT a secret), and the generated text. The lead
--    context is NOT duplicated — it can always be reconstructed
--    from the CRM tables via lead_id.
--
--    Deliberately immutable: the Edge Function can INSERT (the
--    user's own JWT is on every call), and users can SELECT
--    their own rows — there are no UPDATE/DELETE policies, so
--    history cannot be rewritten or hidden by any client.
-- ------------------------------------------------------------
create table public.ai_generations (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null,
  user_id    uuid not null,
  type       public.ai_generation_type not null,
  model      text,
  response   text not null,
  created_at timestamptz not null default now(),

  foreign key (lead_id, user_id)
    references public.leads (id, user_id)
    on delete cascade
);

-- ------------------------------------------------------------
-- 3. Indexes — each maps to a query we actually run:
--    "this lead's generations, newest first" (Lead Details)
--    and "my recent generations" (future dashboards/usage).
-- ------------------------------------------------------------
create index ai_generations_lead_id_created_at_idx
  on public.ai_generations (lead_id, created_at desc);

create index ai_generations_user_created_at_idx
  on public.ai_generations (user_id, created_at desc);

-- ------------------------------------------------------------
-- 4. Row Level Security — same boundary as every other table:
--    USING  = which existing rows you may see.
--    WITH CHECK = which new rows you may write.
--    The Edge Function calls Supabase with the CALLER'S JWT (never
--    the service_role key), so these policies also govern what the
--    server-side code can write on the user's behalf.
-- ------------------------------------------------------------
alter table public.ai_generations enable row level security;

create policy "Users can view own ai_generations"
  on public.ai_generations for select
  using (auth.uid() = user_id);

create policy "Users can insert own ai_generations"
  on public.ai_generations for insert
  with check (auth.uid() = user_id);

-- Deliberately NO update/delete policies: an AI generation history
-- is append-only. Rows disappear automatically via ON DELETE
-- CASCADE when the lead (or auth user) is deleted.
