-- TASK-0074 / APPROVAL-0037 / Stage 1 Engineering Validation
-- Demo/UAT baseline schema for the isolated demo Supabase project
-- atnmcjkjshyqcttnmzkq. NOT to be applied to the production project
-- wvzjfxacykgsaffskgtr.
--
-- Implements the schema described in docs/tasks/TASK-0074.md (Schema, RLS,
-- Selfie Short-TTL Delivery Contract, Demo Entitlement Contract, Cleanup
-- Mechanics) as revised through CR4-0074.
--
-- Conventions:
--   * All demo tables live under the `demo` schema for logical isolation.
--   * Identifiers use snake_case; surrogate keys use UUID v4.
--   * Token ledgers store only sha256(token_hash) bytea; raw tokens are
--     never persisted.
--   * RLS is enabled on every table. Default deny. Authorization derives
--     from auth.uid() joined to demo.session_participants and
--     demo.presenters; client-supplied session_id is never trusted.
--   * Service-role writes (from Edge Functions) bypass RLS and are
--     authorized by Edge Function code.

set client_min_messages = warning;
set search_path = public;

create schema if not exists demo;
grant usage on schema demo to authenticated;
grant usage on schema demo to service_role;

-- =============================================================================
-- Enums
-- =============================================================================

do $$ begin
  create type demo.session_mode as enum ('demo', 'uat');
exception when duplicate_object then null; end $$;

do $$ begin
  create type demo.participant_role as enum ('participant', 'presenter', 'observer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type demo.selfie_caller_context as enum ('nurse_app', 'verifier');
exception when duplicate_object then null; end $$;

do $$ begin
  create type demo.recording_state as enum ('raw', 'redacted', 'deleted');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- Core session tables
-- =============================================================================

create table if not exists demo.sessions (
  session_id              uuid primary key default gen_random_uuid(),
  mode                    demo.session_mode not null,
  environment             text not null default 'demo_uat'
                            check (environment = 'demo_uat'),
  created_at              timestamptz not null default now(),
  created_by              uuid references auth.users (id),
  state                   text not null default 'prepared',
  presenter_phone_id      text,
  participant_phone_id    text,
  selfie_id               uuid,
  closed_at               timestamptz
);

comment on table demo.sessions is
  'Top-level demo/UAT session record. mode and environment are immutable; '
  'enforce via trigger demo.tg_sessions_immutable.';

create or replace function demo.tg_sessions_immutable()
returns trigger language plpgsql as $$
begin
  if new.mode <> old.mode then
    raise exception 'demo.sessions.mode is immutable';
  end if;
  if new.environment <> old.environment then
    raise exception 'demo.sessions.environment is immutable';
  end if;
  if new.session_id <> old.session_id then
    raise exception 'demo.sessions.session_id is immutable';
  end if;
  return new;
end $$;

drop trigger if exists tg_sessions_immutable on demo.sessions;
create trigger tg_sessions_immutable
  before update on demo.sessions
  for each row execute function demo.tg_sessions_immutable();

create table if not exists demo.session_participants (
  participant_id          uuid primary key default gen_random_uuid(),
  session_id              uuid not null references demo.sessions (session_id) on delete cascade,
  auth_user_id            uuid not null references auth.users (id),
  role                    demo.participant_role not null,
  created_at              timestamptz not null default now(),
  revoked_at              timestamptz,
  unique (session_id, auth_user_id, role)
);

create index if not exists ix_session_participants_auth_user
  on demo.session_participants (auth_user_id) where revoked_at is null;
create index if not exists ix_session_participants_session
  on demo.session_participants (session_id);

create table if not exists demo.presenters (
  auth_user_id            uuid primary key references auth.users (id),
  granted_at              timestamptz not null default now(),
  granted_by              uuid references auth.users (id),
  revoked_at              timestamptz
);

-- =============================================================================
-- Token ledgers
-- =============================================================================

create table if not exists demo.verifier_sessions (
  verifier_session_id     uuid primary key default gen_random_uuid(),
  demo_session_id         uuid not null references demo.sessions (session_id) on delete cascade,
  share_token_hash        bytea not null,
  opened_at               timestamptz not null default now(),
  expires_at              timestamptz not null,
  closed_at               timestamptz,
  ip_hash                 bytea,
  ua_fingerprint          text,
  check (expires_at > opened_at)
);

create index if not exists ix_verifier_sessions_active
  on demo.verifier_sessions (expires_at)
  where closed_at is null;

create table if not exists demo.share_tokens (
  token_hash              bytea primary key,
  session_id              uuid not null references demo.sessions (session_id) on delete cascade,
  issued_at               timestamptz not null default now(),
  expires_at              timestamptz not null,
  first_used_at           timestamptz,
  revoked_at              timestamptz,
  verifier_session_id     uuid references demo.verifier_sessions (verifier_session_id),
  check (expires_at > issued_at)
);

create index if not exists ix_share_tokens_session
  on demo.share_tokens (session_id);

create table if not exists demo.selfie_access_tokens (
  token_hash              bytea primary key,
  session_id              uuid not null references demo.sessions (session_id) on delete cascade,
  verifier_session_id     uuid references demo.verifier_sessions (verifier_session_id),
  caller_context          demo.selfie_caller_context not null,
  issued_at               timestamptz not null default now(),
  expires_at              timestamptz not null,
  consumed_at             timestamptz,
  consumed_via            text,
  check (expires_at > issued_at),
  check (
    (caller_context = 'nurse_app' and verifier_session_id is null)
    or
    (caller_context = 'verifier' and verifier_session_id is not null)
  )
);

create index if not exists ix_selfie_access_tokens_session
  on demo.selfie_access_tokens (session_id);
create index if not exists ix_selfie_access_tokens_verifier_session
  on demo.selfie_access_tokens (verifier_session_id)
  where verifier_session_id is not null;

-- =============================================================================
-- Demo entitlement contract
-- =============================================================================

create table if not exists demo.entitlements (
  session_id              uuid primary key references demo.sessions (session_id) on delete cascade,
  tier_label              text not null default 'demo',
  features                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (tier_label in ('demo', 'uat'))
);

comment on table demo.entitlements is
  'The ONLY persistent store of demo/UAT entitlement state. Demo code MUST '
  'NOT read or write profiles.subscription_tier, subscriptions, payments, '
  'stripe_events, or any other production-shape entitlement/payment table. '
  'Enforced by code review, the Demo Entitlement Contract section of '
  'TASK-0074, and the production-shape diff QA gate.';

-- =============================================================================
-- Recording metadata (manual-attestation model)
-- =============================================================================

create table if not exists demo.recordings (
  recording_id            uuid primary key default gen_random_uuid(),
  session_id              uuid not null references demo.sessions (session_id) on delete cascade,
  mode                    demo.session_mode not null,
  captured_at             timestamptz not null,
  captured_by             uuid references auth.users (id),
  storage_location_label  text not null,
  state                   demo.recording_state not null default 'raw',
  redacted_at             timestamptz,
  deleted_at              timestamptz,
  attestation_by          uuid references auth.users (id),
  attestation_at          timestamptz
);

create index if not exists ix_recordings_state_captured
  on demo.recordings (state, captured_at);

-- =============================================================================
-- Audit tables (service-role writes only)
-- =============================================================================

create table if not exists demo.audit_simulator (
  audit_id                bigserial primary key,
  session_id              uuid references demo.sessions (session_id) on delete set null,
  simulator               text not null,        -- 'identity' | 'license'
  input                   jsonb,
  output                  jsonb,
  acknowledgment_event_id uuid,
  recorded_at             timestamptz not null default now()
);

create table if not exists demo.audit_otp (
  audit_id                bigserial primary key,
  session_id              uuid references demo.sessions (session_id) on delete set null,
  phone_target            text,                 -- 'presenter' | 'participant'
  sent_at                 timestamptz,
  verified_at             timestamptz,
  failure_reason          text,
  recorded_at             timestamptz not null default now()
);

create table if not exists demo.audit_selfie_capture (
  audit_id                bigserial primary key,
  session_id              uuid references demo.sessions (session_id) on delete set null,
  selfie_id               uuid,
  consent_flags           jsonb,
  recorded_at             timestamptz not null default now()
);

create table if not exists demo.audit_wallet_issue (
  audit_id                bigserial primary key,
  session_id              uuid references demo.sessions (session_id) on delete set null,
  provider                text,                 -- 'apple_wallet' | 'google_wallet'
  status                  text,                 -- 'issued' | 'failed'
  pass_identifier         text,
  recorded_at             timestamptz not null default now()
);

create table if not exists demo.audit_share_create (
  audit_id                bigserial primary key,
  session_id              uuid references demo.sessions (session_id) on delete set null,
  share_token_hash        bytea,
  expires_at              timestamptz,
  recorded_at             timestamptz not null default now()
);

create table if not exists demo.audit_verifier_view (
  audit_id                bigserial primary key,
  session_id              uuid references demo.sessions (session_id) on delete set null,
  verifier_session_id     uuid references demo.verifier_sessions (verifier_session_id) on delete set null,
  verifier_payload        jsonb,                -- safe-display projection sent to the verifier
  recorded_at             timestamptz not null default now()
);

create table if not exists demo.audit_session_reset (
  audit_id                bigserial primary key,
  session_id              uuid references demo.sessions (session_id) on delete set null,
  reset_by                uuid references auth.users (id),
  recorded_at             timestamptz not null default now()
);

create table if not exists demo.audit_role_changes (
  audit_id                bigserial primary key,
  session_id              uuid references demo.sessions (session_id) on delete set null,
  auth_user_id            uuid references auth.users (id),
  role                    demo.participant_role,
  change                  text,                 -- 'granted' | 'revoked'
  changed_by              uuid references auth.users (id),
  recorded_at             timestamptz not null default now()
);

create table if not exists demo.audit_isolation_failures (
  audit_id                bigserial primary key,
  context                 text,                 -- 'boot' | 'request'
  endpoint                text,
  violation               text,
  details                 jsonb,
  recorded_at             timestamptz not null default now()
);

-- =============================================================================
-- Role-change audit trigger
-- =============================================================================

create or replace function demo.tg_session_participants_audit()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    insert into demo.audit_role_changes
      (session_id, auth_user_id, role, change, changed_by)
    values
      (new.session_id, new.auth_user_id, new.role, 'granted', auth.uid());
  elsif tg_op = 'UPDATE' and old.revoked_at is null and new.revoked_at is not null then
    insert into demo.audit_role_changes
      (session_id, auth_user_id, role, change, changed_by)
    values
      (new.session_id, new.auth_user_id, new.role, 'revoked', auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists tg_session_participants_audit on demo.session_participants;
create trigger tg_session_participants_audit
  after insert or update on demo.session_participants
  for each row execute function demo.tg_session_participants_audit();

create or replace function demo.tg_presenters_audit()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    insert into demo.audit_role_changes
      (session_id, auth_user_id, role, change, changed_by)
    values
      (null, new.auth_user_id, 'presenter', 'granted', auth.uid());
  elsif tg_op = 'UPDATE' and old.revoked_at is null and new.revoked_at is not null then
    insert into demo.audit_role_changes
      (session_id, auth_user_id, role, change, changed_by)
    values
      (null, new.auth_user_id, 'presenter', 'revoked', auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists tg_presenters_audit on demo.presenters;
create trigger tg_presenters_audit
  after insert or update on demo.presenters
  for each row execute function demo.tg_presenters_audit();

-- =============================================================================
-- Authorization helper functions
-- =============================================================================

create or replace function demo.is_active_participant(p_session_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1
      from demo.session_participants sp
     where sp.session_id    = p_session_id
       and sp.auth_user_id  = auth.uid()
       and sp.role          = 'participant'
       and sp.revoked_at    is null
  );
$$;

create or replace function demo.is_active_presenter_for(p_session_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1
      from demo.session_participants sp
      join demo.presenters p on p.auth_user_id = sp.auth_user_id
     where sp.session_id    = p_session_id
       and sp.auth_user_id  = auth.uid()
       and sp.role          = 'presenter'
       and sp.revoked_at    is null
       and p.revoked_at     is null
  );
$$;

create or replace function demo.is_active_presenter()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from demo.presenters p
     where p.auth_user_id = auth.uid()
       and p.revoked_at   is null
  );
$$;

-- CR2-S1-01: tighten execute grants on the SECURITY DEFINER helpers.
-- These helpers are evaluated inside RLS policies for authenticated
-- callers and must NOT be invokable by anon. The audit-trigger
-- functions are AFTER triggers and never invoked directly by clients.
revoke all on function demo.is_active_participant(uuid) from public;
revoke all on function demo.is_active_participant(uuid) from anon;
grant execute on function demo.is_active_participant(uuid) to authenticated;
grant execute on function demo.is_active_participant(uuid) to service_role;

revoke all on function demo.is_active_presenter_for(uuid) from public;
revoke all on function demo.is_active_presenter_for(uuid) from anon;
grant execute on function demo.is_active_presenter_for(uuid) to authenticated;
grant execute on function demo.is_active_presenter_for(uuid) to service_role;

revoke all on function demo.is_active_presenter() from public;
revoke all on function demo.is_active_presenter() from anon;
grant execute on function demo.is_active_presenter() to authenticated;
grant execute on function demo.is_active_presenter() to service_role;

-- =============================================================================
-- Row-level security
-- =============================================================================

-- Enable RLS on every table. Default deny via "no policies = no access".

alter table demo.sessions               enable row level security;
alter table demo.session_participants   enable row level security;
alter table demo.presenters             enable row level security;
alter table demo.verifier_sessions      enable row level security;
alter table demo.share_tokens           enable row level security;
alter table demo.selfie_access_tokens   enable row level security;
alter table demo.entitlements           enable row level security;
alter table demo.recordings             enable row level security;
alter table demo.audit_simulator        enable row level security;
alter table demo.audit_otp              enable row level security;
alter table demo.audit_selfie_capture   enable row level security;
alter table demo.audit_wallet_issue     enable row level security;
alter table demo.audit_share_create     enable row level security;
alter table demo.audit_verifier_view    enable row level security;
alter table demo.audit_session_reset    enable row level security;
alter table demo.audit_role_changes     enable row level security;
alter table demo.audit_isolation_failures enable row level security;

-- demo.sessions: authenticated participants and presenters can SELECT
-- their bound session row. Writes go through Edge Functions (service
-- role). State transitions are not directly mutable via client SQL.

create policy demo_sessions_select_bound
  on demo.sessions for select to authenticated
  using (
       demo.is_active_participant(session_id)
    or demo.is_active_presenter_for(session_id)
  );

-- demo.session_participants: a user can SELECT only their own
-- participation row. Inserts/updates are service-role only.

create policy demo_session_participants_select_self
  on demo.session_participants for select to authenticated
  using (auth_user_id = auth.uid());

-- demo.presenters: a presenter can SELECT only their own allowlist row.
-- Inserts/updates are service-role only.

create policy demo_presenters_select_self
  on demo.presenters for select to authenticated
  using (auth_user_id = auth.uid());

-- demo.entitlements: nurse/presenter can SELECT their bound session's
-- entitlement. Writes are service-role only.

create policy demo_entitlements_select_bound
  on demo.entitlements for select to authenticated
  using (
       demo.is_active_participant(session_id)
    or demo.is_active_presenter_for(session_id)
  );

-- demo.recordings: presenters of the session can SELECT and UPDATE
-- metadata (attestation timestamps, state transitions). Inserts go
-- through Edge Functions or the presenter console.

create policy demo_recordings_select_presenter
  on demo.recordings for select to authenticated
  using (demo.is_active_presenter_for(session_id));

create policy demo_recordings_update_presenter
  on demo.recordings for update to authenticated
  using  (demo.is_active_presenter_for(session_id))
  with check (demo.is_active_presenter_for(session_id));

-- Token ledgers, verifier sessions, and audit tables: NO policies for
-- the `authenticated` role. Service-role-only access.

-- =============================================================================
-- Notes
-- =============================================================================
-- * This migration intentionally does NOT enable any extensions, create any
--   storage buckets, or set any Supabase secrets. Those are handled by the
--   demo project's storage policy and dashboard secrets workflow.
-- * The streaming-proxy + ledger flows defined in TASK-0074 are implemented
--   in the demo-* Edge Functions and SECURITY DEFINER helpers that will be
--   added in subsequent migrations.
-- * `pgcrypto` (for gen_random_uuid) is enabled by default on Supabase
--   projects. If not, add: create extension if not exists pgcrypto;
