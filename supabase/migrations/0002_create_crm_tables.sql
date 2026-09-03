-- ============================================================
-- Migration 0002: CRM core tables (leads, activities, follow_ups)
-- Phase 2 of ClientFlow AI
--
-- Prerequisite: 0001_create_profiles.sql has been applied.
-- Apply via: Supabase Dashboard → SQL Editor → paste entire file → Run.
-- The whole file executes as ONE transaction: all-or-nothing.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enum types — valid values enforced by the database itself,
--    for every writer, forever. Extend later with
--    ALTER TYPE ... ADD VALUE (no table rewrite).
-- ------------------------------------------------------------
create type public.lead_status as enum (
  'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'
);

create type public.activity_type as enum (
  'NOTE', 'EMAIL', 'CALL', 'MEETING', 'STATUS_CHANGE'
);

-- ------------------------------------------------------------
-- 2. leads
-- ------------------------------------------------------------
create table public.leads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  email      text,
  phone      text,
  company    text,
  source     text,
  status     public.lead_status not null default 'NEW',
  value      numeric(12, 2) not null default 0 check (value >= 0),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Composite uniqueness lets activities/follow_ups reference
  -- (id, user_id), which makes cross-user child rows
  -- structurally impossible — even for a buggy client.
  unique (id, user_id)
);

-- updated_at is maintained by the database, never by client code.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_set_updated_at
  before update on public.leads
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. activities
--    The composite FK (lead_id, user_id) → leads (id, user_id) does
--    double duty: it links the activity to its lead AND guarantees
--    the activity's owner matches the lead's owner. No separate
--    user_id FK is needed — the cascade chain reaches auth.users
--    through leads.
-- ------------------------------------------------------------
create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null,
  user_id     uuid not null,
  type        public.activity_type not null,
  description text not null,
  created_at  timestamptz not null default now(),

  foreign key (lead_id, user_id)
    references public.leads (id, user_id)
    on delete cascade
);

-- ------------------------------------------------------------
-- 4. follow_ups
-- ------------------------------------------------------------
create table public.follow_ups (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null,
  user_id     uuid not null,
  title       text not null,
  description text,
  due_date    date not null,
  completed   boolean not null default false,
  created_at  timestamptz not null default now(),

  foreign key (lead_id, user_id)
    references public.leads (id, user_id)
    on delete cascade
);

-- ------------------------------------------------------------
-- 5. Indexes — Postgres does NOT auto-index FK columns, so each
--    FK we filter or join on gets an explicit index.
--    Four indexes only: each maps to a query we will actually run;
--    every extra index slows down every write.
-- ------------------------------------------------------------
create index leads_user_id_status_idx
  on public.leads (user_id, status);

create index activities_lead_id_created_at_idx
  on public.activities (lead_id, created_at desc);

create index follow_ups_lead_id_idx
  on public.follow_ups (lead_id);

-- Partial index: only open follow-ups. Serves the Follow-ups page
-- buckets (Overdue / Today / Upcoming) and the dashboard.
create index follow_ups_user_due_date_idx
  on public.follow_ups (user_id, due_date)
  where completed = false;

-- ------------------------------------------------------------
-- 6. Row Level Security
--    No USING (true). No shortcuts. The database is the boundary.
--    USING  = which existing rows you may see/touch.
--    WITH CHECK = which new/modified rows you may write.
--    UPDATE needs both — otherwise a user could re-point a row
--    (theirs or someone else's) at a different user_id.
-- ------------------------------------------------------------
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.follow_ups enable row level security;

-- leads -------------------------------------------------------
create policy "Users can view own leads"
  on public.leads for select
  using (auth.uid() = user_id);

create policy "Users can insert own leads"
  on public.leads for insert
  with check (auth.uid() = user_id);

create policy "Users can update own leads"
  on public.leads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own leads"
  on public.leads for delete
  using (auth.uid() = user_id);

-- activities --------------------------------------------------
create policy "Users can view own activities"
  on public.activities for select
  using (auth.uid() = user_id);

create policy "Users can insert own activities"
  on public.activities for insert
  with check (auth.uid() = user_id);

create policy "Users can update own activities"
  on public.activities for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own activities"
  on public.activities for delete
  using (auth.uid() = user_id);

-- follow_ups --------------------------------------------------
create policy "Users can view own follow_ups"
  on public.follow_ups for select
  using (auth.uid() = user_id);

create policy "Users can insert own follow_ups"
  on public.follow_ups for insert
  with check (auth.uid() = user_id);

create policy "Users can update own follow_ups"
  on public.follow_ups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own follow_ups"
  on public.follow_ups for delete
  using (auth.uid() = user_id);

