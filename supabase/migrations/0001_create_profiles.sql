-- ============================================================
-- Migration 0001: profiles table + auto-creation trigger
-- Phase 1 of ClientFlow AI (Authentication)
--
-- How to apply: Supabase Dashboard → SQL Editor → New query →
-- paste this entire file → Run.
-- The file stays in git so the whole schema is reproducible.
-- ============================================================

-- profiles is a 1-to-1 extension of Supabase's managed auth.users.
-- We never duplicate auth state (passwords, tokens live in auth.users);
-- we only add CRM profile data. Primary key IS the auth user id.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  business_name text,
  email         text not null,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Row Level Security: users may only read/update their OWN profile.
--
-- Deliberately NO insert policy: the profile row is created
-- exclusively by the trigger below, inside the database — the client
-- never inserts profiles.
-- Deliberately NO delete policy: rows disappear automatically via
-- ON DELETE CASCADE when the auth user is deleted.
-- ------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------------
-- Auto-create a profile row for every new signup.
--
-- Why a trigger instead of inserting from React: it is atomic with the
-- signup and cannot be forgotten or bypassed by client bugs.
--
-- security definer is required: the trigger fires for inserts into
-- auth.users performed by Supabase's auth service, a role that cannot
-- write to public.profiles through RLS on its own.
-- set search_path = public is the standard hardening for
-- security definer functions.
-- ------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, business_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'business_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
