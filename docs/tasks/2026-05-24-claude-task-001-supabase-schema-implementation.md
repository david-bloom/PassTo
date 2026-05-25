# PassTo Task 001 — Supabase MVP Schema Spike

**Executed By:** Claude — Senior Engineer
**Date:** 2026-05-24
**Supabase Project:** `zpvbexzdiklxlvrxsvop`
**Status:** Ready for Codex QA Review

---

## 1. Summary

This spike designs the Supabase/Postgres schema foundation for PassTo's MVP. PassTo is a digital nurse credentialing app: nurses verify their identity via ID.me, look up their nursing license from state boards via Propelus/RapidAPI, receive a wallet pass (Apple/Google Wallet via PassKit) reflecting current license status, and share credentials with verifiers (employers, facilities) via one-time short-lived tokens. Verifiers access credentials through a form-gated link — they do not have PassTo accounts.

**Key design positions taken in this spike:**

1. **`licenses` table added** — Not in the candidate list. This is the most critical gap. PassTo cannot function without a table storing the license data returned by the Propelus API. It drives pass status, wallet pass content, and the 4-layer status translation system required by DECISION-0008. Adding this is not scope expansion; it is schema correctness.

2. **`organizations` and `organization_members` removed** — PassTo is B2C for individual nurses. Verifiers do not have accounts; they access credentials via a link and fill out a name/email form (DECISION-0009). There are no multi-nurse organizational accounts in MVP. These tables introduce an org-centric data model that does not match the product. Removed with full explanation in the Challenge Log.

3. **`profiles` extended for PassTo identity** — Added `id_me_subject` (deduplication key for ID.me), `id_verification_status`, `id_verification_level`, `phone` (E.164 for Twilio), and `onboarding_step` (UX routing). These are required by the identity and onboarding flows.

4. **`stripe_customers` uses `profile_id`** — The candidate list implied `organization_id`. PassTo billing is individual (nurse-to-Stripe), not organization-level.

5. **`stripe_subscriptions` carries `license_entitlement_count`** — Required by DECISION-0010 (Free=1, Standard=1, Premier=2) so the application can enforce per-plan license limits without a separate lookup table.

6. **`pass_shares` enforces one-time semantics at schema level** — `expires_at NOT NULL` is required; `used_at` tracks first redemption. Application uses an atomic UPDATE-and-return pattern to prevent double-redemption. Per DECISION-0005.

7. **Verifier access is service-role edge function only** — Verifiers do not authenticate with Supabase. All credential data served to verifiers passes through Vercel API routes using service role. RLS policies on verifier-adjacent tables reflect this architecture; no anon-role verifier access is modeled.

8. **`review_events` event types are PassTo-specific** — Generic "approve/reject" events removed. PassTo verifiers view credentials; they do not approve or reject them. Event types reflect the actual verifier credential view flow.

**Final table count: 12** (13 candidates − 2 removed + 1 added)

---

## 2. Migration SQL Draft

```sql
-- ============================================================
-- PassTo MVP — Supabase Migration
-- Claude Task 001 — Schema Spike
-- 2026-05-24
--
-- Apply to project: zpvbexzdiklxlvrxsvop
-- DO NOT apply to production without Codex QA and David approval.
-- ============================================================

-- Extensions (Supabase includes pgcrypto by default; explicit for clarity)
create extension if not exists "pgcrypto";


-- ============================================================
-- 1. PROFILES
--
-- One row per nurse. Extends auth.users without duplicating
-- auth state. Created automatically by trigger on auth.users insert.
-- ============================================================

create table public.profiles (
  id                      uuid        primary key default gen_random_uuid(),
  auth_user_id            uuid        not null unique references auth.users(id) on delete cascade,
  email                   text        not null,
  first_name              text,
  last_name               text,
  phone                   text,
  id_verification_status  text        not null default 'unverified'
    check (id_verification_status in ('unverified', 'pending', 'verified', 'failed')),
  id_verification_level   text
    check (id_verification_level in ('IAL1', 'IAL2')),
  id_me_subject           text        unique,
  onboarding_step         text        not null default 'identity'
    check (onboarding_step in ('identity', 'phone', 'license', 'pass', 'complete')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table  public.profiles                        is 'One row per nurse. Extends auth.users. Created by trigger on auth.users insert.';
comment on column public.profiles.id_me_subject          is 'ID.me subject claim. Used to prevent duplicate accounts for the same real-world identity. Null until ID.me verification completes.';
comment on column public.profiles.phone                  is 'E.164 format. Populated after phone verification. Twilio SMS destination.';
comment on column public.profiles.id_verification_level  is 'ID.me IAL assurance level. IAL2 required for full access.';
comment on column public.profiles.onboarding_step        is 'Current onboarding progress gate. Updated as nurse completes each step.';


-- ============================================================
-- 2. LICENSES
--
-- License records fetched from state board APIs via Propelus.
-- One row per nurse per license (state + type + number).
-- Nurses may have multiple licenses (multi-state, multi-type).
-- Service role writes only. Nurses read-only.
-- ============================================================

create table public.licenses (
  id                  uuid        primary key default gen_random_uuid(),
  profile_id          uuid        not null references public.profiles(id) on delete cascade,
  state               text        not null,
  license_type        text        not null,
  license_number      text,
  first_name          text,
  last_name           text,
  raw_status          text,
  normalized_status   text
    check (normalized_status in (
      'Active', 'Inactive', 'Expired',
      'Surrendered', 'Revoked', 'Suspended', 'Unknown'
    )),
  display_status      text,
  wallet_treatment    text
    check (wallet_treatment in ('green', 'yellow', 'red', 'grey')),
  expiration_date     date,
  issue_date          date,
  is_primary          boolean     not null default false,
  last_lookup_at      timestamptz,
  lookup_source       text        not null default 'propelus',
  lookup_response     jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (profile_id, state, license_type, license_number)
);

comment on table  public.licenses                   is 'Nursing license records from state board APIs. Source of truth for credential status. Service role writes; nurses read.';
comment on column public.licenses.raw_status        is 'Board status string exactly as returned by the API. Never normalized or modified.';
comment on column public.licenses.normalized_status is 'PassTo canonical status. One of seven values per DECISION-0008.';
comment on column public.licenses.display_status    is 'Human-readable status shown to nurse in dashboard.';
comment on column public.licenses.wallet_treatment  is 'Visual treatment for wallet pass display. Derived from normalized_status. green=Active, yellow=warning states, red=Revoked/Suspended, grey=Unknown.';
comment on column public.licenses.is_primary        is 'Nurse-designated primary license. One true per profile. Enforced at application layer and by partial unique index.';
comment on column public.licenses.lookup_response   is 'Raw Propelus API JSON response. Preserved verbatim for audit and debugging.';


-- ============================================================
-- 3. PASSES
--
-- PassTo credential pass record. Drives wallet pass content
-- and status. One pass per license record.
-- Service role writes; nurses read.
-- ============================================================

create table public.passes (
  id                  uuid        primary key default gen_random_uuid(),
  profile_id          uuid        not null references public.profiles(id) on delete cascade,
  license_id          uuid        references public.licenses(id) on delete set null,
  status              text        not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'revoked', 'expired')),
  pass_template_data  jsonb,
  issued_at           timestamptz,
  last_refreshed_at   timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table  public.passes                    is 'PassTo credential pass. One per license. Drives wallet pass content and status.';
comment on column public.passes.pass_template_data is 'Data payload sent to PassKit for pass generation. Contains display fields derived from license; not raw license data.';
comment on column public.passes.license_id         is 'Set null on license delete to preserve pass history. Status snapshot is in pass_template_data.';


-- ============================================================
-- 4. WALLET PASSES
--
-- PassKit / wallet provider reference. Thin record only.
-- PassKit is the source of truth for issued pass state.
-- Service role writes (PassKit webhook handler).
-- ============================================================

create table public.wallet_passes (
  id                  uuid        primary key default gen_random_uuid(),
  pass_id             uuid        not null references public.passes(id) on delete cascade,
  provider            text        not null default 'passkit'
    check (provider in ('passkit', 'apple_wallet', 'google_wallet')),
  external_pass_id    text,
  serial_number       text,
  pass_url            text,
  status              text        not null default 'pending'
    check (status in ('pending', 'issued', 'voided', 'error')),
  provider_response   jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table  public.wallet_passes                  is 'PassKit and wallet provider reference. Never mirror PassKit internal schema. PassKit is authoritative for issued pass state.';
comment on column public.wallet_passes.external_pass_id is 'PassKit-assigned pass ID. Reference only.';
comment on column public.wallet_passes.pass_url         is 'Add-to-wallet link returned by PassKit. Served to nurse for wallet installation.';


-- ============================================================
-- 5. PASS SHARES
--
-- Share tokens created by nurses to grant verifier access.
-- One-time and short-lived per DECISION-0005.
-- Token is opaque hex; no auth secrets stored here.
-- ============================================================

create table public.pass_shares (
  id                       uuid        primary key default gen_random_uuid(),
  profile_id               uuid        not null references public.profiles(id) on delete cascade,
  pass_id                  uuid        not null references public.passes(id) on delete cascade,
  share_token              text        not null unique default encode(gen_random_bytes(32), 'hex'),
  is_active                boolean     not null default true,
  expires_at               timestamptz not null,
  used_at                  timestamptz,
  revoked_at               timestamptz,
  stripe_payment_intent_id text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table  public.pass_shares                          is 'Nurse-created share tokens. One-time, short-lived per DECISION-0005. Opaque 32-byte hex token; never store auth secrets here.';
comment on column public.pass_shares.expires_at               is 'Required. Short TTL enforced at application layer. Application checks (is_active AND expires_at > now() AND used_at IS NULL) atomically before serving credential data.';
comment on column public.pass_shares.used_at                  is 'Set when token is first redeemed. Application uses UPDATE ... WHERE used_at IS NULL RETURNING * to enforce one-time semantics atomically.';
comment on column public.pass_shares.stripe_payment_intent_id is 'Stripe PaymentIntent reference for the $1.99 per-share charge. Null if covered by subscription entitlement (open question — see challenge log item 4).';


-- ============================================================
-- 6. PASS RECIPIENTS
--
-- Verifier identity captured when verifier submits the access form.
-- Created by edge function after form submission.
-- Service role writes; nurses read.
-- ============================================================

create table public.pass_recipients (
  id                    uuid        primary key default gen_random_uuid(),
  share_id              uuid        not null unique references public.pass_shares(id) on delete cascade,
  verifier_name         text        not null,
  verifier_email        text        not null,
  verifier_organization text,
  terms_accepted_at     timestamptz not null,
  marketing_consent     boolean     not null default false,
  ip_address            inet,
  user_agent            text,
  created_at            timestamptz not null default now()
);

comment on table  public.pass_recipients                   is 'Verifier form data captured at credential access time per DECISION-0009. Service role inserts; nurses read.';
comment on column public.pass_recipients.verifier_email    is 'Email as entered by verifier. Not validated against a PassTo account. Store verbatim.';
comment on column public.pass_recipients.terms_accepted_at is 'Required Terms of Use acceptance timestamp. Credential data must not be served before this record exists.';
comment on column public.pass_recipients.share_id          is 'Unique constraint: one recipient record per share. Enforces one-time access model at schema level.';


-- ============================================================
-- 7. REVIEW SESSIONS
--
-- Created when a verifier opens a share link.
-- Maps to the Verifier Credential View flow.
-- Service role writes; nurses read.
-- ============================================================

create table public.review_sessions (
  id            uuid        primary key default gen_random_uuid(),
  share_id      uuid        not null references public.pass_shares(id) on delete cascade,
  recipient_id  uuid        references public.pass_recipients(id) on delete set null,
  status        text        not null default 'active'
    check (status in ('active', 'completed', 'expired', 'error')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.review_sessions is 'Verifier credential view sessions. Created by edge function on share token redemption. One session per share token use.';


-- ============================================================
-- 8. REVIEW EVENTS
--
-- Individual events within a verifier credential view session.
-- Append-only. No updates.
-- Service role writes; nurses read.
-- ============================================================

create table public.review_events (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references public.review_sessions(id) on delete cascade,
  event_type  text        not null
    check (event_type in (
      'session_started',
      'credential_viewed',
      'pdf_downloaded',
      'session_completed',
      'session_expired'
    )),
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

comment on table  public.review_events            is 'Events within a verifier session. Append-only. No updates. Event types reflect credential view flow, not generic approval workflow.';
comment on column public.review_events.event_type is 'PassTo-specific event set. Verifiers view credentials; they do not approve or reject them.';


-- ============================================================
-- 9. STRIPE CUSTOMERS
--
-- Stripe customer reference. One per nurse profile.
-- Individual billing model — not organization-level.
-- Stripe is source of truth. Service role writes.
-- ============================================================

create table public.stripe_customers (
  id                 uuid        primary key default gen_random_uuid(),
  profile_id         uuid        not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text        not null unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.stripe_customers is 'One-to-one with profiles. PassTo billing is individual (nurse), not organizational. Stripe is source of truth for all payment state.';


-- ============================================================
-- 10. STRIPE SUBSCRIPTIONS
--
-- Current subscription state per nurse.
-- Updated by Stripe webhook handler via service role only.
-- Carries license_entitlement_count per DECISION-0010.
-- ============================================================

create table public.stripe_subscriptions (
  id                        uuid        primary key default gen_random_uuid(),
  stripe_customer_id        uuid        not null references public.stripe_customers(id) on delete cascade,
  stripe_subscription_id    text        not null unique,
  plan_name                 text
    check (plan_name in ('free', 'standard', 'premier')),
  status                    text
    check (status in (
      'active', 'past_due', 'canceled',
      'incomplete', 'incomplete_expired',
      'trialing', 'unpaid'
    )),
  license_entitlement_count integer     not null default 1
    check (license_entitlement_count > 0),
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  canceled_at               timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table  public.stripe_subscriptions                         is 'Current subscription state. Updated only by Stripe webhook via service role. Stripe is source of truth.';
comment on column public.stripe_subscriptions.license_entitlement_count is 'Included license lookup entitlements per billing cycle. Free=1, Standard=1, Premier=2 per DECISION-0010. Application enforces limits against this field.';
comment on column public.stripe_subscriptions.status                  is 'Stripe subscription status values verbatim. Application must handle all states, including incomplete and unpaid.';


-- ============================================================
-- 11. COMMUNICATION EVENTS
--
-- Outbound SMS (Twilio) and email (Postmark) log.
-- Written by edge functions and webhook handlers via service role.
-- Nurses read their own records.
-- ============================================================

create table public.communication_events (
  id                  uuid        primary key default gen_random_uuid(),
  profile_id          uuid        references public.profiles(id) on delete set null,
  related_entity_type text
    check (related_entity_type in (
      'license', 'pass', 'pass_share',
      'review_session', 'stripe_subscription'
    )),
  related_entity_id   uuid,
  channel             text        not null check (channel in ('sms', 'email')),
  provider            text        check (provider in ('twilio', 'postmark')),
  direction           text        not null default 'outbound'
    check (direction in ('outbound', 'inbound')),
  status              text        not null default 'pending'
    check (status in ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  subject             text,
  external_message_id text,
  error_message       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table  public.communication_events                    is 'Outbound SMS and email event log. Written by edge functions and webhook handlers. Nurses read their own records.';
comment on column public.communication_events.profile_id         is 'Null for system-initiated events not tied to a nurse (e.g., ops alerts).';
comment on column public.communication_events.external_message_id is 'Twilio MessageSID or Postmark MessageID. Used to correlate delivery webhook callbacks.';


-- ============================================================
-- 12. AUDIT EVENTS
--
-- Append-only security and compliance audit trail.
-- Service role writes. No user-facing select in MVP.
-- ============================================================

create table public.audit_events (
  id             uuid        primary key default gen_random_uuid(),
  actor_id       uuid        references public.profiles(id) on delete set null,
  action         text        not null,
  resource_type  text        not null,
  resource_id    uuid,
  change_before  jsonb,
  change_after   jsonb,
  ip_address     inet,
  user_agent     text,
  created_at     timestamptz not null default now()
);

comment on table  public.audit_events          is 'Append-only audit trail. No updates. Service role for all writes. Not user-facing in MVP.';
comment on column public.audit_events.actor_id is 'Null for system-initiated events (webhooks, scheduled jobs).';
comment on column public.audit_events.action   is 'Free-text action name. Canonical namespace must be defined before migration (see open question 1).';


-- ============================================================
-- INDEXES
-- ============================================================

-- profiles
create index idx_profiles_id_me_subject
  on public.profiles(id_me_subject)
  where id_me_subject is not null;

-- licenses
create index idx_licenses_profile_id
  on public.licenses(profile_id);

create index idx_licenses_normalized_status
  on public.licenses(normalized_status);

create index idx_licenses_expiration
  on public.licenses(expiration_date)
  where expiration_date is not null;

-- One-primary enforcement: prevents two is_primary=true rows per profile at DB level.
-- See challenge log item 3 for tradeoffs.
create unique index idx_licenses_one_primary_per_profile
  on public.licenses(profile_id)
  where is_primary = true;

-- passes
create index idx_passes_profile_id
  on public.passes(profile_id);

create index idx_passes_license_id
  on public.passes(license_id);

-- wallet_passes
create index idx_wallet_passes_pass_id
  on public.wallet_passes(pass_id);

-- pass_shares
create index idx_pass_shares_profile_id
  on public.pass_shares(profile_id);

-- Active-token lookup index. Used on every verifier link access.
create index idx_pass_shares_active_token
  on public.pass_shares(share_token, is_active, expires_at)
  where is_active = true;

-- review_sessions
create index idx_review_sessions_share_id
  on public.review_sessions(share_id);

-- review_events
create index idx_review_events_session_id
  on public.review_events(session_id);

-- stripe_customers
create index idx_stripe_customers_profile_id
  on public.stripe_customers(profile_id);

-- stripe_subscriptions
create index idx_stripe_subs_customer_id
  on public.stripe_subscriptions(stripe_customer_id);

create index idx_stripe_subs_status
  on public.stripe_subscriptions(status);

-- communication_events
create index idx_comms_profile_id
  on public.communication_events(profile_id);

create index idx_comms_entity
  on public.communication_events(related_entity_type, related_entity_id);

create index idx_comms_created_at
  on public.communication_events(created_at);

-- audit_events
create index idx_audit_actor
  on public.audit_events(actor_id);

create index idx_audit_resource
  on public.audit_events(resource_type, resource_id);

create index idx_audit_created_at
  on public.audit_events(created_at);


-- ============================================================
-- AUTO-PROFILE TRIGGER
--
-- Creates a profiles row whenever a Supabase auth.users row
-- is inserted (sign-up). Standard Supabase pattern.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, email)
  values (new.id, new.email)
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles             enable row level security;
alter table public.licenses             enable row level security;
alter table public.passes               enable row level security;
alter table public.wallet_passes        enable row level security;
alter table public.pass_shares          enable row level security;
alter table public.pass_recipients      enable row level security;
alter table public.review_sessions      enable row level security;
alter table public.review_events        enable row level security;
alter table public.stripe_customers     enable row level security;
alter table public.stripe_subscriptions enable row level security;
alter table public.communication_events enable row level security;
alter table public.audit_events         enable row level security;
```

---

## 3. RLS Policy Draft / Plan

**Design principles:**

1. Nurses own their own data. No cross-nurse data access via authenticated session.
2. Verifiers do not have Supabase accounts. All verifier-facing credential data is served by Vercel API routes using service role. No anon-role verifier access policies are defined.
3. Billing and operational tables (Stripe, communication events, audit events) are service-role-only for writes. Nurses read their own records where appropriate.
4. Webhook handlers (Stripe, PassKit, Twilio, Postmark) use service role exclusively.

**Profile resolution pattern used throughout:**

```sql
(select id from public.profiles where auth_user_id = auth.uid())
```

This subquery runs on each row evaluation. At MVP scale this is acceptable. See challenge log item 8 for future optimization path.

```sql
-- ============================================================
-- PROFILES
-- ============================================================

create policy "nurse_select_own_profile"
  on public.profiles for select
  using (auth.uid() = auth_user_id);

create policy "nurse_insert_own_profile"
  on public.profiles for insert
  with check (auth.uid() = auth_user_id);

create policy "nurse_update_own_profile"
  on public.profiles for update
  using  (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- No delete policy. Account deletion is a product decision
-- requiring data retention review (open question 2).


-- ============================================================
-- LICENSES
--
-- Nurses read their own licenses.
-- Service role writes exclusively (Propelus lookup edge function).
-- ============================================================

create policy "nurse_select_own_licenses"
  on public.licenses for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );

-- No INSERT / UPDATE / DELETE for nurses.
-- License data comes from the API, not nurse input.
-- is_primary designation is handled via service-role API route.
-- See challenge log item 6.


-- ============================================================
-- PASSES
--
-- Nurses read their own passes.
-- Service role writes (pass issuance and refresh edge functions).
-- ============================================================

create policy "nurse_select_own_passes"
  on public.passes for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );


-- ============================================================
-- WALLET PASSES
--
-- Nurses read wallet passes linked to their own passes.
-- Service role writes (PassKit webhook handler).
-- ============================================================

create policy "nurse_select_own_wallet_passes"
  on public.wallet_passes for select
  using (
    pass_id in (
      select id from public.passes
      where profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );


-- ============================================================
-- PASS SHARES
--
-- Nurses create, read, and soft-revoke their own shares.
-- No hard delete; revocation sets is_active = false.
-- ============================================================

create policy "nurse_select_own_shares"
  on public.pass_shares for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );

create policy "nurse_insert_own_shares"
  on public.pass_shares for insert
  with check (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );

create policy "nurse_revoke_own_shares"
  on public.pass_shares for update
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  )
  with check (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );


-- ============================================================
-- PASS RECIPIENTS
--
-- Nurses read verifier form data for their own shares.
-- Service role inserts only (edge function after verifier submits form).
-- ============================================================

create policy "nurse_select_own_pass_recipients"
  on public.pass_recipients for select
  using (
    share_id in (
      select id from public.pass_shares
      where profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );


-- ============================================================
-- REVIEW SESSIONS
--
-- Nurses read sessions linked to their own shares.
-- Service role writes only (edge function on token redemption).
-- ============================================================

create policy "nurse_select_own_review_sessions"
  on public.review_sessions for select
  using (
    share_id in (
      select id from public.pass_shares
      where profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );


-- ============================================================
-- REVIEW EVENTS
--
-- Nurses read events within their own sessions.
-- Service role writes only.
-- ============================================================

create policy "nurse_select_own_review_events"
  on public.review_events for select
  using (
    session_id in (
      select rs.id from public.review_sessions rs
      join public.pass_shares ps on rs.share_id = ps.id
      where ps.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );


-- ============================================================
-- STRIPE CUSTOMERS
--
-- Nurses read their own Stripe customer reference.
-- Service role writes (Stripe checkout and webhook handler).
-- ============================================================

create policy "nurse_select_own_stripe_customer"
  on public.stripe_customers for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );


-- ============================================================
-- STRIPE SUBSCRIPTIONS
--
-- Nurses read their own subscription state.
-- Service role writes (Stripe webhook handler only).
-- ============================================================

create policy "nurse_select_own_stripe_subscription"
  on public.stripe_subscriptions for select
  using (
    stripe_customer_id in (
      select id from public.stripe_customers
      where profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );


-- ============================================================
-- COMMUNICATION EVENTS
--
-- Nurses read outbound SMS / email records linked to their profile.
-- Service role writes.
-- ============================================================

create policy "nurse_select_own_communications"
  on public.communication_events for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );


-- ============================================================
-- AUDIT EVENTS
--
-- No user-facing select policies in MVP.
-- All access via service role.
-- ============================================================

-- (No user-facing policies. Service role only.)
```

**RLS ownership summary:**

| Table | Nurse Policy | Service Role Writes |
|---|---|---|
| `profiles` | SELECT / INSERT / UPDATE own | trigger creates on signup |
| `licenses` | SELECT own | Propelus lookup edge function |
| `passes` | SELECT own | pass issuance / refresh edge function |
| `wallet_passes` | SELECT own (via passes FK) | PassKit webhook handler |
| `pass_shares` | SELECT / INSERT / UPDATE (revoke) own | — |
| `pass_recipients` | SELECT own (via shares FK) | verifier form edge function |
| `review_sessions` | SELECT own (via shares FK) | verifier access edge function |
| `review_events` | SELECT own (via sessions → shares FK) | verifier access edge function |
| `stripe_customers` | SELECT own | Stripe checkout + webhook |
| `stripe_subscriptions` | SELECT own (via stripe_customers FK) | Stripe webhook |
| `communication_events` | SELECT own | Twilio / Postmark edge functions |
| `audit_events` | None | all edge functions and webhooks |

---

## 4. Schema Rationale

| Table | Owner | MVP-Critical | Key Design Decision |
|---|---|:---:|---|
| `profiles` | Nurse | Yes | Extends `auth.users`. Adds ID.me fields (`id_me_subject`, `id_verification_level`) for identity deduplication and assurance-level gating. `onboarding_step` for UX routing. Never duplicates auth state. |
| `licenses` | Service / Nurse (read) | **Yes — ADDED** | Most important addition. PassTo cannot function without storing license lookup results. Implements DECISION-0008's 4-layer status model: `raw_status` preserves board fidelity; `normalized_status` enables consistent product behavior; `display_status` serves UX; `wallet_treatment` drives pass visuals. `lookup_response` JSONB preserves raw API response for audit and re-parsing without schema changes. |
| `passes` | Service / Nurse (read) | Yes | PassTo's internal credential pass record. Drives what PassKit displays. Linked to `licenses` via nullable FK (set null on license delete to preserve pass history). `pass_template_data` JSONB carries the PassKit payload without tying schema to PassKit's data model. |
| `wallet_passes` | Service | Yes | Thin PassKit/wallet provider reference. Stores `external_pass_id`, `pass_url`, and provider status. Never mirrors PassKit's internal schema — PassKit is authoritative. Service role writes via PassKit webhook. |
| `pass_shares` | Nurse | Yes | Core of the sharing flow. `share_token` is 32-byte opaque hex (no JWT, no embedded claims, no auth secrets). `expires_at NOT NULL` enforces short-lived requirement (DECISION-0005). `used_at` tracks one-time redemption. `stripe_payment_intent_id` links share creation to the $1.99 per-share charge. |
| `pass_recipients` | Service / Nurse (read) | Yes | Verifier form data per DECISION-0009 (name, email, terms accepted, marketing consent). Created by edge function after verifier submits. `unique(share_id)` enforces one recipient record per share at schema level, reinforcing one-time access model. |
| `review_sessions` | Service / Nurse (read) | Yes | Maps to the Verifier Credential View flow. Created on token redemption. `status` tracks session lifecycle. IP and user-agent captured for audit. |
| `review_events` | Service / Nurse (read) | Yes | Append-only event log per session. Event types are PassTo-specific: verifiers view credentials; they do not approve or reject. `pdf_downloaded` supports the $1.99 PDF export billing event. `metadata` JSONB for extensibility without schema churn. |
| `stripe_customers` | Service / Nurse (read) | Yes | 1:1 with `profiles`. PassTo bills individual nurses, not organizations. Stripe is authoritative. This table holds only the FK mapping. |
| `stripe_subscriptions` | Service / Nurse (read) | Yes | Current plan state. `license_entitlement_count` is carried here to allow application-level entitlement checks without joining to a separate config table. All Stripe status values modeled (active, past_due, canceled, incomplete, incomplete_expired, trialing, unpaid) so application handles every real-world subscription state. |
| `communication_events` | Service / Nurse (read) | Support | Outbound SMS/email log. `external_message_id` enables correlation with Twilio and Postmark delivery webhook callbacks. `direction` supports future inbound tracking (e.g., nurse SMS replies). |
| `audit_events` | Service | Support | Append-only compliance trail. `actor_id` null for system/webhook events. `change_before` / `change_after` JSONB for mutation logging. Not user-facing in MVP. Free-text `action` requires canonical namespace definition before migration (open question 1). |

**Tables challenged and removed from candidate list:**

| Table | Decision | Reason |
|---|---|---|
| `organizations` | **Removed** | PassTo is B2C for individual nurses. Verifiers do not have accounts — they access credentials via share link and submit name/email only (DECISION-0009). No organizational accounts exist in the MVP product. Adding this table creates an org-centric data model that does not match the product and would complicate RLS, billing, and onboarding flows for no MVP benefit. Future consideration: employer/facility portal for enterprise tier. |
| `organization_members` | **Removed** | Dependent on `organizations`. Same reasoning. |

---

## 5. Challenge Log

| # | Concern | Severity | Recommendation | David Decision Required? |
|---|---|:---:|---|:---:|
| 1 | **`organizations` removed from candidate list** | High | Candidate list assumed an org-centric model. PassTo is individual-nurse B2C; verifiers are anonymous. Schema is restructured accordingly. If an employer portal is planned for a future tier, `organizations` will need to be added as a separate task. | No — recommendation stands for MVP; David to note if employer portal is in future scope |
| 2 | **`licenses` missing from candidate list** | Critical | `licenses` is the most important table in the PassTo schema. It stores Propelus API responses, the 4-layer status translation (DECISION-0008), and is the source of truth for all credential state. Omitting it would require wallet pass status and nurse credential state to be stored in unqueryable JSONB blobs. Added without hesitation. | No |
| 3 | **`is_primary` on `licenses` — enforcement gap** | Medium | Only one license per nurse should be `is_primary = true`. A partial unique index (`WHERE is_primary = true`) is included in the migration to enforce this at DB level. However, the application must clear the existing primary before setting a new one, or do so in a single transaction. If a nurse has zero primary licenses (valid when account is new), the dashboard must handle this gracefully. Recommend Codex review the license designation API route before implementation. | No |
| 4 | **Per-action billing is partially modeled** | Medium | `pass_shares.stripe_payment_intent_id` tracks the $1.99 per-share charge. But refresh charges ($1.99 on-demand) and PDF export charges ($1.99) have no dedicated table. If Codex wants an auditable per-action billing record, a `purchases` or `metered_events` table should be added in TASK-0003 or later. For MVP, `audit_events` logging of Stripe PI IDs may be sufficient as an interim approach. | Yes — product decision on audit depth for per-action billing |
| 5 | **Token redemption TOCTOU risk** | Medium | One-time token enforcement (`used_at IS NULL`) must be checked and set atomically. The correct pattern is: `UPDATE pass_shares SET used_at = now(), is_active = false WHERE share_token = $1 AND is_active = true AND expires_at > now() AND used_at IS NULL RETURNING *`. If no row returns, the token is invalid or already used. This must be enforced in the Vercel API route, not as a separate SELECT then UPDATE. This is an implementation requirement that must be documented in the edge function spec. | No — Codex to document in edge function spec |
| 6 | **`is_primary` update — nurse-facing RLS gap** | Medium | Current RLS policies do not allow nurses to update `licenses.is_primary` directly. But nurses need to designate a primary license from their dashboard. Three options: (a) narrow UPDATE policy on `licenses` for `is_primary` only (fragile — Postgres RLS cannot restrict to specific columns in UPDATE); (b) add `primary_license_id uuid` to `profiles` (cleaner, simpler RLS); (c) route all primary designation through a service-role Vercel API endpoint. Option (c) is safest for MVP. Recommend Codex decide before implementation. | No — Codex architectural decision |
| 7 | **`audit_events.action` is free-text** | Low | No enum constraint on action names. Without a canonical namespace, different edge functions will produce inconsistent event strings (`license_created` vs `license.created` vs `create_license`). Recommend defining and documenting a canonical action namespace before migration. See open question 1. | No — Codex should define namespace before migration |
| 8 | **RLS nested query depth** | Low | RLS policies on `review_events` require a 3-level join chain to resolve ownership (`review_events → review_sessions → pass_shares → profiles`). At MVP scale (hundreds of nurses), this is acceptable. If query performance degrades at scale, denormalize `profile_id` onto `review_sessions` and `review_events` to flatten the RLS check. Not recommended for MVP — adds write-time complexity for a future optimization. | No |
| 9 | **No soft-delete or data retention model** | Medium | Hard deletes cascade on most tables. There is no soft-delete, archival table, or `deleted_at` column. If a nurse deletes their account, all associated data is permanently purged. For compliance and the ability to produce audit records post-deletion, a data retention policy decision is needed before production. Particularly relevant given HIPAA-adjacent credential data. | Yes — data retention and account deletion policy |
| 10 | **Auto-profile trigger missing from previously produced spike** | Low | The existing `2026-05-24-claude-task-001-supabase-schema-spike.md` in the repository omits the `handle_new_user()` trigger. Without it, the application must manually call a profile-creation endpoint after every signup, creating a race condition and reliability dependency. The trigger is included in this migration. This is a required Supabase pattern, not a scope expansion. | No |

---

## 6. Open Questions

### Blocking Before Migration Execution

**1. `audit_events` action namespace** — What canonical format and values should `action` use? (e.g., `license.created`, `pass.issued`, `share.created`, `share.redeemed`, `session.started`) Without agreement, different edge functions will produce inconsistent audit records. Codex should define and publish the namespace before migration runs.

**2. Data retention and account deletion** — If a nurse requests account deletion, what data is deleted, what is retained, and for how long? This affects whether cascade deletes are safe on `profiles`, or whether a soft-delete flag and retention-period archive table are needed. HIPAA-adjacent credential data and verifier access logs may have retention obligations.

**3. Per-action billing tracking depth** — Is `stripe_payment_intent_id` on `pass_shares` sufficient to audit the $1.99 per-share charge? Or do we need a dedicated `purchases` or `metered_events` table to also track refresh charges ($1.99) and PDF exports ($1.99)? This affects whether TASK-0003 needs an additional table.

**4. `is_primary` designation — implementation path** — Should nurses designate a primary license via (a) a service-role Vercel API route, (b) a `primary_license_id` column on `profiles`, or (c) a narrow direct update to `licenses`? This determines the RLS and API route design for the dashboard. Codex recommendation needed before implementation.

**5. RLS testing approach** — Manual Postman / REST testing against the Supabase project, or SQL-based RLS validation scripts? Codex should confirm the testing approach before migration is applied, so acceptance criteria for the RLS test pass can be agreed on.

### Non-Blocking Before MVP Build

**6. Share token TTL** — What is the intended expiry window for `pass_shares.expires_at`? The schema requires it to be set but does not enforce a value. DECISION-0005 says "short-lived" but does not specify duration. Product/David decision.

**7. PDF export tracking** — Should PDF exports be logged as a dedicated record (new table: `pdf_exports`) for per-export billing and audit, or is `review_events` with `event_type = 'pdf_downloaded'` sufficient?

**8. Refresh request log** — Should on-demand and scheduled license refreshes be tracked in a `license_refresh_log` table (for per-refresh billing audit), or does `audit_events` provide sufficient coverage?

**9. Subscription history** — Current `stripe_subscriptions` design holds only current state. If a nurse upgrades from Standard to Premier, the Standard record is overwritten. Should subscription plan change history be tracked in a separate table, or is Stripe's dashboard sufficient for that?

**10. Communication events — inbound tracking** — Should inbound SMS (e.g., nurse replies to Twilio SMS) be tracked in `communication_events`? The `direction` column supports this, but it requires a Twilio inbound webhook handler. Out of MVP scope unless needed for phone verification flow.

**11. `profiles.onboarding_step` — derived vs. stored** — `onboarding_step` is a stored denormalization of onboarding progress. It could also be derived from: `id_verification_status`, `phone IS NOT NULL`, `count of licenses`, `count of passes`. Stored field is simpler for the frontend but risks drift if other fields update without updating `onboarding_step`. Recommend Codex confirm whether stored or derived is preferred.

**12. `wallet_passes` — one-to-one vs. one-to-many per pass** — A nurse's `pass` could theoretically have both an Apple Wallet and a Google Wallet record (two `wallet_passes` rows). The current schema supports this. Is this intended, or should each pass have exactly one wallet pass record? No `unique(pass_id, provider)` constraint is applied yet.

---

## 7. Self-QA Against Acceptance Criteria

### Criterion 1 — SQL is syntactically correct for Supabase/Postgres

- `gen_random_uuid()` used for all primary keys (Postgres 13+ native, default in Supabase).
- `gen_random_bytes()` via `pgcrypto` for share tokens (extension declared explicitly).
- `COMMENT ON COLUMN` statements are correctly placed outside `CREATE TABLE` bodies as separate DDL statements. _(Note: the existing spike file in the repository placed these inside `CREATE TABLE`, which is invalid Postgres syntax. This implementation corrects that error.)_
- `timestamptz` used throughout (not `timestamp` without timezone).
- All check constraints, unique constraints, and FK references use valid Postgres syntax.
- Partial indexes use correct `WHERE` clause form.
- Auto-profile trigger uses `security definer` and `set search_path = public` per Supabase security best practice.

**Status: PASS**

---

### Criterion 2 — Every proposed table has a clear owner and purpose

All 12 tables are documented with `COMMENT ON TABLE`, schema rationale, and ownership in Section 4.

**Status: PASS**

---

### Criterion 3 — Every core relationship has a FK or an explicit reason for avoiding one

| Relationship | FK Present | Notes |
|---|:---:|---|
| `profiles` → `auth.users` | Yes | `auth_user_id` with cascade delete |
| `licenses` → `profiles` | Yes | cascade delete |
| `passes` → `profiles` | Yes | cascade delete |
| `passes` → `licenses` | Yes | set null on delete (preserves pass history) |
| `wallet_passes` → `passes` | Yes | cascade delete |
| `pass_shares` → `profiles` | Yes | cascade delete |
| `pass_shares` → `passes` | Yes | cascade delete |
| `pass_recipients` → `pass_shares` | Yes | cascade delete |
| `review_sessions` → `pass_shares` | Yes | cascade delete |
| `review_sessions` → `pass_recipients` | Yes | set null (recipient may not exist yet when session opens) |
| `review_events` → `review_sessions` | Yes | cascade delete |
| `stripe_customers` → `profiles` | Yes | cascade delete |
| `stripe_subscriptions` → `stripe_customers` | Yes | cascade delete |
| `communication_events` → `profiles` | Yes | set null (null for system events) |
| `audit_events` → `profiles` | Yes | set null (null for system/webhook events) |
| `communication_events` → related entity | No FK | Intentional: polymorphic entity reference using type + UUID pair. FK would require separate junction tables for each entity type. Acceptable for MVP audit log use. |

**Status: PASS**

---

### Criterion 4 — Public share and review flows modeled without exposing private account data

- Verifiers have no Supabase session. All verifier-facing credential access goes through service-role Vercel API routes. No anon-role policies are defined.
- `share_token` is opaque 32-byte hex. No JWT, no embedded claims, no account identifiers, no auth secrets.
- `pass_recipients` stores verifier name and email only — no nurse account data is mixed in.
- `review_sessions` and `review_events` contain no nurse PII beyond the FK chain; the chain is not exposed to verifiers.
- RLS policies on nurse-owned tables grant no verifier-role access.

**Status: PASS**

---

### Criterion 5 — Stripe, PassKit, Postmark, Twilio referenced but not over-modeled

- `stripe_customers`: holds only the `stripe_customer_id` mapping. No Stripe invoice, price, or product schema.
- `stripe_subscriptions`: holds current plan state and status reference. Stripe is authoritative.
- `wallet_passes`: holds `external_pass_id`, `pass_url`, and provider status only. No PassKit template internals.
- `communication_events`: logs sends and provider message IDs. No Postmark/Twilio internal schema.
- All vendor writes are service-role-only.

**Status: PASS**

---

### Criterion 6 — RLS addressed table-by-table

All 12 tables have explicit RLS policies or explicit documentation of why no user-facing policy is defined (audit events). The RLS ownership summary in Section 3 covers every table. Verifier access path (service role only) is clearly documented.

**Status: PASS**

---

### Criterion 7 — Claude documents assumptions and unresolved questions

Assumptions documented in Section 4 (Schema Rationale). Unresolved questions captured in Section 6 with 5 blocking and 7 non-blocking items. Challenge Log (Section 5) flags 10 concerns with severity, recommendation, and whether David decision is required.

**Status: PASS**

---

### Criterion 8 — Claude stays inside MVP scope or clearly labels proposed expansions

Explicitly excluded and not included:
- Full admin dashboard schema
- Advanced analytics / event warehouse
- Referral system
- Template marketplace
- Enterprise multi-brand permissions
- Notification preference center
- Lifecycle automation engine
- Edge function code
- Production migration execution

Items recommended but not included (pdf_exports table, license_refresh_log, subscription history) are labeled as non-blocking open questions only.

**Status: PASS**

---

### Criterion 9 — Tables challenged from the candidate list are explicitly explained

`organizations` and `organization_members` are challenged and removed in Challenge Log item 1 and Schema Rationale. Reasoning covers: PassTo's B2C model, verifier anonymity per DECISION-0009, and the absence of multi-nurse organizational accounts in MVP.

**Status: PASS**

---

### Criterion 10 — New table additions are justified

`licenses` is added and justified in Challenge Log item 2 and Schema Rationale. Justification: it is the most critical data entity in PassTo, required by DECISION-0008 (status translation), and its absence would force credential state into unqueryable JSONB blobs on `passes`. Its addition is not scope expansion — it is schema correctness.

**Status: PASS**

---

## Claude Implementation Notes

**Deviations from candidate list:**
- `organizations` removed (B2C model mismatch)
- `organization_members` removed (dependent on organizations)
- `licenses` added (essential gap — not scope expansion)

**Deviations from previous spike in repo (`2026-05-24-claude-task-001-supabase-schema-spike.md`):**
- `COMMENT ON COLUMN` syntax corrected (was inside `CREATE TABLE` — invalid Postgres DDL)
- Auto-profile creation trigger added (missing from previous spike)
- `stripe_customers` uses `profile_id` not `organization_id` (individual billing model)
- `stripe_subscriptions` adds `license_entitlement_count` per DECISION-0010
- `review_events` event types changed to PassTo-specific (removed generic approve/reject)
- `pass_shares.expires_at` made NOT NULL (required by DECISION-0005)
- `pass_shares.used_at` added (one-time token enforcement)
- RLS restructured from org-centric to nurse-centric ownership

**Codex QA requested on:**
- SQL syntax correctness
- RLS policy completeness and security
- `is_primary` partial unique index tradeoffs (challenge log item 3)
- Token redemption atomicity pattern (challenge log item 5)
- Blocking open questions 1–5 before migration execution

**Status:** Ready for Codex QA Review — `assigned: codex`, `needs: codex-review`
