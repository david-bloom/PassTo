-- ============================================================
-- Migration M: Demo Environment Tables
-- TASK-0074 — Build Isolated Demo/UAT Environment
--
-- Apply to demo Supabase project ONLY.
-- NEVER apply to the production project (wvzjfxacykgsaffskgtr).
-- David approval required before applying.
--
-- Creates:
--   demo_sessions        — per-session records with immutable mode
--   demo_personas        — Avery Demo fixture + auth link
--   subscriptions.demo_session_id column — marks synthetic demo rows
--   licenses.demo_synthetic column — marks synthetic license rows
-- ============================================================

-- ── demo_personas ─────────────────────────────────────────────────────────────
-- Stores the canonical demo personas and their auth user links.
-- auth_user_id and profile_id are NULL until David completes Phase 1 setup.

create table if not exists public.demo_personas (
  id              uuid         primary key default gen_random_uuid(),
  persona_key     text         unique not null,
  first_name      text         not null,
  last_name       text         not null,
  license_type    text         not null default 'RN',
  license_state   text         not null default 'NY',
  auth_user_id    uuid         unique,        -- populated by David post-Phase-1
  demo_email      text         unique,        -- populated by David post-Phase-1
  created_at      timestamptz  not null default now()
);

-- Avery Demo canonical fixture
insert into public.demo_personas (persona_key, first_name, last_name, license_type, license_state)
values ('avery_demo', 'Avery', 'Demo', 'RN', 'NY')
on conflict (persona_key) do nothing;

-- ── demo_sessions ─────────────────────────────────────────────────────────────
-- One row per presenter-initiated session.
-- mode is immutable after insert (enforced via trigger + RLS no-UPDATE policy).

create table if not exists public.demo_sessions (
  id               uuid        primary key default gen_random_uuid(),
  demo_session_id  uuid        unique not null default gen_random_uuid(),
  mode             text        not null check (mode in ('demo', 'uat')),
  persona          text        not null default 'avery_demo'
                               references public.demo_personas (persona_key),
  created_by       uuid,       -- presenter auth_user_id (informational)
  created_at       timestamptz not null default now()
);

-- Immutable mode trigger — blocks any UPDATE that changes the mode column
create or replace function public.demo_sessions_mode_immutable()
  returns trigger
  language plpgsql
  security definer
as $$
begin
  if tg_op = 'UPDATE' and new.mode is distinct from old.mode then
    raise exception 'demo_sessions.mode is immutable after insert (session: %)', old.demo_session_id;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_demo_sessions_mode_immutable on public.demo_sessions;
create trigger enforce_demo_sessions_mode_immutable
  before update on public.demo_sessions
  for each row execute function public.demo_sessions_mode_immutable();

-- ── RLS — demo_personas ───────────────────────────────────────────────────────
alter table public.demo_personas enable row level security;

create policy "demo_personas_service_role_all"
  on public.demo_personas
  for all
  to service_role
  using (true)
  with check (true);

-- ── RLS — demo_sessions ───────────────────────────────────────────────────────
-- No UPDATE or DELETE policies — immutability enforced at both trigger and RLS levels.
alter table public.demo_sessions enable row level security;

create policy "demo_sessions_service_role_insert"
  on public.demo_sessions
  for insert
  to service_role
  with check (true);

create policy "demo_sessions_service_role_select"
  on public.demo_sessions
  for select
  to service_role
  using (true);

-- ── Augment subscriptions — demo flag ────────────────────────────────────────
-- demo_session_id marks synthetic demo rows non-promotable to production.
alter table public.subscriptions
  add column if not exists demo_session_id uuid references public.demo_sessions (demo_session_id);

-- ── Augment licenses — demo synthetic flag ────────────────────────────────────
alter table public.licenses
  add column if not exists demo_synthetic boolean not null default false;
