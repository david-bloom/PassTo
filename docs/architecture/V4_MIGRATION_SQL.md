# PassTo MVP — v4 Migration SQL

**Task:** TASK-0012 — Write v4 Migration SQL for `wvzjfxacykgsaffskgtr`
**Authorized by:** Codex (TASK-0007 — CODEX_RESPONSE_TASK_0007_SCHEMA_QA.md)
**Target project:** `wvzjfxacykgsaffskgtr` (PassTo Dev)
**Date:** 2026-05-26
**Status:** DRAFT — awaiting David approval (TASK-0013)

---

> **DO NOT APPLY** without explicit David approval.
> Apply via Supabase MCP `apply_migration` in TASK-0014 only.

---

## Table Summary (15 tables)

| # | Table | Notes |
|---|---|---|
| 1 | `profiles` | Nurse record. Extends auth.users. Soft-delete. stripe_customer_id added (replaces stripe_customers table). |
| 2 | `licenses` | Propelus/Nursys license data. Service-role writes. |
| 3 | `credentials` | PassTo credential record. **Was `passes` — OD-6.** |
| 4 | `wallet_passes` | PassKit/Apple/Google reference. FK updated to credentials. |
| 5 | `verification_tokens` | share_link + show_qr only. **pdf_qr excluded — OD-5.** |
| 6 | `verifiers` | Verifier identity/session. Service-role only. show_qr form-gated — OD-4. |
| 7 | `verification_events` | Append-only session events. Service-role only. |
| 8 | `subscriptions` | **Was `stripe_subscriptions` — OD-7.** FK directly to profiles. |
| 9 | `payments` | **Was `purchases` — OD-8.** 7-year retention, ON DELETE RESTRICT. |
| 10 | `stripe_events` | **New in v4 — OD-10.** Stripe webhook idempotency. |
| 11 | `notification_events` | **Was `communication_events` — OD-9.** SMS/email log. |
| 12 | `pdf_exports` | PDF records. Supabase Storage. 7-year retention. |
| 13 | `audit_events` | Append-only audit trail. resource.verb action enforced — OD-1. |
| 14 | `license_lookups` | **Was `refresh_events`.** Initial + refresh lookup audit trail. |
| 15 | `license_status_mappings` | **New in v4 — OD-12.** Status normalization reference table. |

**Note on `stripe_customers`:** Dropped per v4 15-table spec (TASK-0012/TASK-0015). `stripe_customer_id` field added directly to `profiles`. `subscriptions` FK links directly to `profiles.id`.

---

## v4 Changes from v3

| OD | Change |
|---|---|
| OD-1 | `audit_events.action` CHECK enforces `resource.verb` format |
| OD-2 | `licenses.is_primary` partial unique index (retained from v3) |
| OD-5 | `verification_tokens.token_type` = `share_link` \| `show_qr` only — no `pdf_qr` |
| OD-6 | `passes` → `credentials`; FK columns renamed to `credential_id` |
| OD-7 | `stripe_subscriptions` → `subscriptions`; `stripe_customers` dropped; `stripe_customer_id` on `profiles` |
| OD-8 | `purchases` → `payments`; FK columns renamed to `payment_id` |
| OD-9 | `communication_events` → `notification_events` |
| OD-10 | `stripe_events` table added |
| OD-11 | No direct nurse UPDATE on `profiles`; `update_own_profile_basic` SECURITY DEFINER RPC |
| OD-12 | `license_status_mappings` table added with seed data |
| Misc | `refresh_events` → `license_lookups`; `triggered_by` adds `onboarding` value |

---

## Migration SQL

```sql
-- ============================================================
-- PassTo MVP — Supabase Migration v4
-- Task: TASK-0012
-- Authorized by: Codex (TASK-0007 / CODEX_RESPONSE_TASK_0007_SCHEMA_QA.md)
-- Target project: wvzjfxacykgsaffskgtr (PassTo Dev)
-- Date: 2026-05-26
-- Status: DRAFT — requires TASK-0013 David approval before execution
--
-- DO NOT APPLY without explicit David approval.
-- Apply via Supabase MCP apply_migration in TASK-0014.
--
-- v4 OD resolutions applied:
--   OD-1  audit_events.action CHECK: resource.verb format
--   OD-2  licenses.is_primary: partial unique index
--   OD-5  verification_tokens.token_type: share_link + show_qr (no pdf_qr)
--   OD-6  passes → credentials
--   OD-7  stripe_subscriptions → subscriptions; stripe_customers dropped
--   OD-8  purchases → payments
--   OD-9  communication_events → notification_events
--   OD-10 stripe_events table added
--   OD-11 profiles nurse UPDATE: SECURITY DEFINER RPC only
--   OD-12 license_status_mappings table + seed data
--   Misc  refresh_events → license_lookups
--   Misc  Full RLS policies for all 15 tables
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "pgcrypto";


-- ============================================================
-- GENERIC updated_at TRIGGER FUNCTION
-- Applied to all tables with an updated_at column.
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- HELPER: auth_profile_id()
-- Returns profiles.id for the current auth.uid().
-- Used in RLS policies. SECURITY DEFINER to avoid RLS recursion.
-- ============================================================

create or replace function public.auth_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid()
$$;


-- ============================================================
-- 1. PROFILES
-- One row per nurse. Extends auth.users.
-- Created by trigger on auth.users insert.
-- Protected fields (id_verification_status, onboarding_step,
-- account_status, subscription_tier, stripe_customer_id, etc.)
-- are service-role only. Nurse safe-field updates via RPC (OD-11).
-- stripe_customer_id replaces separate stripe_customers table (v4).
-- ============================================================

create table public.profiles (
  id                       uuid        primary key default gen_random_uuid(),
  auth_user_id             uuid        not null unique references auth.users(id) on delete cascade,
  email                    text        not null,

  -- Nurse-updateable fields (via update_own_profile_basic RPC — OD-11)
  first_name               text,
  last_name                text,
  display_name             text,
  preferred_name           text,
  phone                    text,
  notification_preferences jsonb,

  -- Identity verification — service-role only
  id_verification_status   text        not null default 'unverified'
    check (id_verification_status in ('unverified', 'pending', 'verified', 'failed')),
  id_verification_level    text
    check (id_verification_level in ('IAL1', 'IAL2')),
  id_me_subject            text        unique,

  -- Onboarding & account — service-role only
  onboarding_step          text        not null default 'identity'
    check (onboarding_step in ('identity', 'phone', 'license', 'pass', 'complete')),
  account_status           text        not null default 'active'
    check (account_status in ('active', 'suspended', 'closed')),

  -- Subscription tier — service-role only (denormalized from subscriptions)
  subscription_tier        text        not null default 'free'
    check (subscription_tier in ('free', 'standard', 'premier')),

  -- Stripe — service-role only (replaces stripe_customers table in v4)
  stripe_customer_id       text        unique,

  -- Soft delete
  deleted_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table  public.profiles                          is 'One row per nurse. Extends auth.users. Soft deletion via deleted_at. 7-year retention — do not hard-delete within 7 years (DECISION-0011).';
comment on column public.profiles.id_me_subject            is 'ID.me subject claim. Deduplication key. Null until ID.me verification completes.';
comment on column public.profiles.phone                    is 'E.164 format. Populated after Twilio phone verification.';
comment on column public.profiles.id_verification_level    is 'ID.me IAL assurance level. IAL2 required for full credential access.';
comment on column public.profiles.account_status           is 'active = normal. suspended = admin hold. closed = nurse-requested. Service-role only.';
comment on column public.profiles.subscription_tier        is 'Denormalized from subscriptions for fast read. Updated by stripe-webhook function. Service-role only.';
comment on column public.profiles.stripe_customer_id       is 'Stripe Customer ID (cus_xxx). Set by stripe-checkout function. Replaces separate stripe_customers table in v4.';
comment on column public.profiles.notification_preferences  is 'Nurse notification opt-in preferences. Updateable via update_own_profile_basic RPC.';
comment on column public.profiles.deleted_at               is 'Soft delete. Null = active. Hard delete via purge process only after 7-year retention window.';

create index idx_profiles_id_me_subject
  on public.profiles(id_me_subject)
  where id_me_subject is not null;

create index idx_profiles_stripe_customer_id
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

create index idx_profiles_active
  on public.profiles(deleted_at)
  where deleted_at is null;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 2. LICENSES
-- License records from Propelus/Nursys. Service-role writes.
-- One row per nurse per license (state + type + number).
-- Canonical 5-field status model. is_primary one-per-profile (OD-2).
-- ============================================================

create table public.licenses (
  id                    uuid        primary key default gen_random_uuid(),
  profile_id            uuid        not null references public.profiles(id) on delete cascade,
  state                 text        not null,
  license_type          text        not null,
  license_number        text,
  first_name            text,
  last_name             text,

  -- Status model (5 canonical fields)
  source_status_raw     text,
  source_status_display text,
  normalized_status     text
    check (normalized_status in (
      'Active', 'Inactive', 'Expired',
      'Surrendered', 'Revoked', 'Suspended', 'Unknown'
    )),
  status_intent         text
    check (status_intent in (
      'credential_valid', 'credential_caution',
      'credential_invalid', 'verification_failure'
    )),
  wallet_pass_treatment text
    check (wallet_pass_treatment in ('valid', 'caution', 'invalid', 'do_not_issue')),

  expiration_date       date,
  issue_date            date,
  is_primary            boolean     not null default false,
  status_checked_at     timestamptz,
  lookup_source         text        not null default 'propelus',
  lookup_response       jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (profile_id, state, license_type, license_number)
);

comment on table  public.licenses                          is 'Nursing license records from Propelus/Nursys. Source of truth for credential status. Service-role writes; nurses read.';
comment on column public.licenses.source_status_raw        is 'Board status string exactly as returned by Propelus. Never modified.';
comment on column public.licenses.normalized_status        is 'PassTo canonical status. Seven values. Unknown = verification failure; do not issue credential.';
comment on column public.licenses.wallet_pass_treatment    is 'valid=Active; caution=Active expiring ≤30d; invalid=Suspended/Revoked/Expired; do_not_issue=Unknown/failure.';
comment on column public.licenses.is_primary               is 'Nurse-designated primary license. One-per-profile via partial unique index. Set via service-role only (OD-2).';
comment on column public.licenses.lookup_response          is 'Raw Propelus API JSON. Preserved verbatim for audit and debugging.';

-- OD-2: one primary license per profile
create unique index idx_licenses_one_primary_per_profile
  on public.licenses(profile_id)
  where is_primary = true;

create index idx_licenses_profile_id
  on public.licenses(profile_id);

create index idx_licenses_normalized_status
  on public.licenses(normalized_status);

create index idx_licenses_expiration
  on public.licenses(expiration_date)
  where expiration_date is not null;

create trigger set_licenses_updated_at
  before update on public.licenses
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 3. CREDENTIALS (was passes — OD-6)
-- PassTo credential record derived from a nurse license.
-- One per nurse per license. Drives wallet pass content and status.
-- Service-role writes; nurses read.
-- ============================================================

create table public.credentials (
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

comment on table  public.credentials                       is 'PassTo credential record. One per license. Drives wallet pass content and status. Was "passes" in v3 (OD-6).';
comment on column public.credentials.pass_template_data    is 'Payload sent to PassKit for pass generation. Display fields derived from license; not raw license data.';
comment on column public.credentials.license_id            is 'Set null on license delete — credential history preserved.';

create index idx_credentials_profile_id
  on public.credentials(profile_id);

create index idx_credentials_license_id
  on public.credentials(license_id);

create trigger set_credentials_updated_at
  before update on public.credentials
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 4. WALLET PASSES
-- PassKit / Apple Wallet / Google Wallet provider reference.
-- Thin record only. PassKit is source of truth.
-- FK updated to credentials.id (was pass_id → passes.id — OD-6).
-- unique(credential_id, provider): one record per provider per credential.
-- ============================================================

create table public.wallet_passes (
  id                  uuid        primary key default gen_random_uuid(),
  credential_id       uuid        not null references public.credentials(id) on delete cascade,
  provider            text        not null default 'passkit'
    check (provider in ('passkit', 'apple_wallet', 'google_wallet')),
  external_pass_id    text,
  serial_number       text,
  pass_url            text,
  status              text        not null default 'pending'
    check (status in ('pending', 'issued', 'voided', 'error')),
  provider_response   jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (credential_id, provider)
);

comment on table  public.wallet_passes                     is 'PassKit and wallet provider reference. PassKit is authoritative. credential_id FK replaces pass_id (OD-6).';
comment on column public.wallet_passes.external_pass_id    is 'PassKit-assigned pass ID. Reference only.';
comment on column public.wallet_passes.pass_url            is 'Add-to-wallet link from PassKit. Served to nurse for wallet installation.';

create index idx_wallet_passes_credential_id
  on public.wallet_passes(credential_id);

create trigger set_wallet_passes_updated_at
  before update on public.wallet_passes
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 5. VERIFICATION TOKENS
-- Tokens granting verifier access to credential data.
-- OD-5: two types only — share_link (72h) and show_qr (45min).
--       pdf_qr excluded from MVP.
-- Raw token generated server-side, returned once, never stored.
-- Only SHA-256 hash stored. Token creation is service-role only.
-- FK updated to credentials.id (was pass_id → passes.id — OD-6).
-- ============================================================

create table public.verification_tokens (
  id            uuid        primary key default gen_random_uuid(),
  profile_id    uuid        not null references public.profiles(id) on delete cascade,
  credential_id uuid        not null references public.credentials(id) on delete cascade,
  token_hash    text        not null unique,
  token_type    text        not null default 'share_link'
    check (token_type in ('share_link', 'show_qr')),   -- OD-5: no pdf_qr in MVP
  status        text        not null default 'active'
    check (status in (
      'active', 'used', 'expired', 'replaced',
      'revoked', 'payment_failed', 'generation_failed'
    )),
  expires_at    timestamptz not null,
  used_at       timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table  public.verification_tokens               is 'Verifier access tokens. One-time short-lived. SHA-256 hash stored; raw token returned to nurse once, never persisted. credential_id replaces pass_id (OD-6).';
comment on column public.verification_tokens.token_hash    is 'SHA-256 hash of the raw token. Application hashes presented token on redemption and looks up by hash.';
comment on column public.verification_tokens.token_type    is 'share_link = 72h TTL, URL-shared to remote verifier. show_qr = 45min TTL, QR for in-person. pdf_qr excluded from MVP (OD-5).';
comment on column public.verification_tokens.expires_at    is 'share_link = now() + 72h; show_qr = now() + 45min. Validated atomically on redemption.';

create index idx_verification_tokens_profile_id
  on public.verification_tokens(profile_id);

create index idx_verification_tokens_active
  on public.verification_tokens(token_hash, status, expires_at)
  where status = 'active';

create index idx_verification_tokens_type
  on public.verification_tokens(token_type, profile_id);

create trigger set_verification_tokens_updated_at
  before update on public.verification_tokens
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 6. VERIFIERS
-- Verifier identity and session record.
-- OD-4: form-gated for BOTH share_link and show_qr tokens.
--       Every token redemption creates a verifiers record.
-- SERVICE-ROLE ONLY. Nurse history via get_verification_history().
-- ============================================================

create table public.verifiers (
  id                   uuid        primary key default gen_random_uuid(),
  token_id             uuid        not null unique references public.verification_tokens(id) on delete cascade,
  name                 text        not null,
  email                text        not null,
  terms_accepted_at    timestamptz not null,
  marketing_consent    boolean     not null default false,
  status               text        not null default 'active'
    check (status in ('active', 'completed', 'expired', 'error')),
  session_started_at   timestamptz not null default now(),
  session_completed_at timestamptz,
  ip_address           inet,
  user_agent           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table  public.verifiers                     is 'Verifier identity and session. One per token (unique). Service-role only. Both share_link and show_qr are form-gated and create a record (OD-4).';
comment on column public.verifiers.email               is 'Verifier email. Service-role only — never displayed to nurses.';
comment on column public.verifiers.terms_accepted_at   is 'Required ToU acceptance. Credential data must not be served before this record exists.';

create index idx_verifiers_token_id
  on public.verifiers(token_id);

create trigger set_verifiers_updated_at
  before update on public.verifiers
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 7. VERIFICATION EVENTS
-- Individual events within a verifier session. Append-only.
-- Service-role writes. Nurse access via get_verification_history().
-- verification_token_id added for efficient token-level querying (OD-4).
-- ============================================================

create table public.verification_events (
  id                    uuid        primary key default gen_random_uuid(),
  verifier_id           uuid        not null references public.verifiers(id) on delete cascade,
  verification_token_id uuid        references public.verification_tokens(id) on delete set null,
  event_type            text        not null
    check (event_type in (
      'session_started',
      'credential_viewed',
      'pdf_downloaded',
      'session_completed',
      'session_expired'
    )),
  metadata              jsonb,
  created_at            timestamptz not null default now()
);

comment on table  public.verification_events                         is 'Events within a verifier session. Append-only. Service-role writes. Nurse access via SECURITY DEFINER function.';
comment on column public.verification_events.verification_token_id   is 'Direct FK to verification_tokens for token-level event querying (OD-4 schema instruction).';

create index idx_verification_events_verifier_id
  on public.verification_events(verifier_id);

create index idx_verification_events_token_id
  on public.verification_events(verification_token_id);


-- ============================================================
-- 8. SUBSCRIPTIONS (was stripe_subscriptions — OD-7)
-- Current subscription state per nurse. Stripe webhook writes only.
-- stripe_customers table dropped in v4 — stripe_customer_id on profiles.
-- FK now directly to profiles.id.
-- ============================================================

create table public.subscriptions (
  id                        uuid        primary key default gen_random_uuid(),
  profile_id                uuid        not null unique references public.profiles(id) on delete cascade,
  stripe_subscription_id    text        not null unique,
  stripe_customer_id        text        not null,   -- denormalized for webhook event correlation
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

comment on table  public.subscriptions                                is 'Current subscription state. Stripe webhook writes only. Was "stripe_subscriptions" in v3 (OD-7). FK now to profiles; stripe_customers table dropped.';
comment on column public.subscriptions.stripe_customer_id            is 'Stripe Customer ID (cus_xxx). Denormalized from profiles.stripe_customer_id for webhook correlation.';
comment on column public.subscriptions.plan_name                     is 'Null = Free tier (no active subscription record). Standard=$9.99/mo; Premier=$19.99/mo (DECISION-0011).';
comment on column public.subscriptions.license_entitlement_count     is 'Included license slots. Free=1 (no sub record); Standard=1; Premier=2. Additional at $4.99 each.';

create index idx_subscriptions_stripe_customer_id
  on public.subscriptions(stripe_customer_id);

create index idx_subscriptions_status
  on public.subscriptions(status);

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 9. PAYMENTS (was purchases — OD-8)
-- Single table for all paid MVP actions.
-- 7-year retention per DECISION-0011.
-- ON DELETE RESTRICT on profile_id prevents hard profile deletion.
-- related_entity_type values updated: 'credential' (was 'pass'),
--   'subscription' (was 'stripe_subscription').
-- ============================================================

create table public.payments (
  id                       uuid        primary key default gen_random_uuid(),
  profile_id               uuid        not null references public.profiles(id) on delete restrict,
  action_type              text        not null
    check (action_type in ('share_token', 'refresh', 'pdf_export', 'additional_license')),
  stripe_payment_intent_id text,
  amount_cents             integer     not null check (amount_cents >= 0),
  status                   text        not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  related_entity_type      text
    check (related_entity_type in (
      'verification_token', 'license', 'credential', 'subscription', 'pdf_export'
    )),
  related_entity_id        uuid,
  metadata                 jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table  public.payments                           is 'All paid MVP actions. 7-year retention. ON DELETE RESTRICT prevents hard profile deletion with payment records. Was "purchases" in v3 (OD-8).';
comment on column public.payments.action_type               is 'share_token=$1.99 where paid; refresh=$1.99 where paid; pdf_export=$1.99 Free / entitlement Standard+Premier; additional_license=$4.99.';
comment on column public.payments.amount_cents              is 'Amount in cents. 0 for entitlement-covered actions.';
comment on column public.payments.related_entity_type       is 'v4 values: "credential" (was "pass"), "subscription" (was "stripe_subscription"). Other values unchanged.';

create index idx_payments_profile_id
  on public.payments(profile_id);

create index idx_payments_action_type
  on public.payments(action_type);

create index idx_payments_entity
  on public.payments(related_entity_type, related_entity_id);

create trigger set_payments_updated_at
  before update on public.payments
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 10. STRIPE EVENTS (new in v4 — OD-10)
-- Stripe webhook idempotency table. Service-role only.
-- stripe-webhook function must insert or check stripe_event_id
-- before writing payments or subscriptions records.
-- Duplicate Stripe events must not create duplicate business records.
-- ============================================================

create table public.stripe_events (
  id              uuid        primary key default gen_random_uuid(),
  stripe_event_id text        not null unique,
  event_type      text        not null,
  processed       boolean     not null default false,
  processed_at    timestamptz,
  payload         jsonb       not null,
  error_message   text,
  created_at      timestamptz not null default now()
);

comment on table  public.stripe_events                   is 'Stripe webhook idempotency table. New in v4 (OD-10). stripe-webhook must check stripe_event_id before writing payments or subscriptions.';
comment on column public.stripe_events.stripe_event_id   is 'Stripe event ID (evt_xxx). Unique constraint enforces idempotency.';
comment on column public.stripe_events.processed         is 'True once event fully processed without error.';
comment on column public.stripe_events.error_message     is 'Error detail if processing failed. Supports retry investigation.';

create index idx_stripe_events_stripe_event_id
  on public.stripe_events(stripe_event_id);

create index idx_stripe_events_unprocessed
  on public.stripe_events(processed, created_at)
  where processed = false;


-- ============================================================
-- 11. NOTIFICATION EVENTS (was communication_events — OD-9)
-- Outbound SMS (Twilio) and email (Postmark) log.
-- Service-role writes; nurses read own records.
-- profile_id SET NULL on delete — logs preserved on hard deletion.
-- related_entity_type values updated to v4 canonical names.
-- ============================================================

create table public.notification_events (
  id                  uuid        primary key default gen_random_uuid(),
  profile_id          uuid        references public.profiles(id) on delete set null,
  related_entity_type text
    check (related_entity_type in (
      'license', 'credential', 'verification_token',
      'license_lookup', 'subscription', 'payment', 'pdf_export'
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

comment on table  public.notification_events                        is 'Outbound SMS/email log. Service-role writes; nurses read own records. Was "communication_events" in v3 (OD-9).';
comment on column public.notification_events.external_message_id    is 'Twilio MessageSID or Postmark MessageID for delivery webhook correlation.';
comment on column public.notification_events.profile_id             is 'SET NULL on delete — notification logs preserved even after profile hard-deletion.';
comment on column public.notification_events.related_entity_type    is 'v4 values: "credential" (was "pass"), "license_lookup" (was "refresh_event"), "subscription" (was "stripe_subscription"), "payment" (was "purchase").';

create index idx_notification_events_profile_id
  on public.notification_events(profile_id);

create index idx_notification_events_entity
  on public.notification_events(related_entity_type, related_entity_id);

create trigger set_notification_events_updated_at
  before update on public.notification_events
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 12. PDF EXPORTS
-- PDF export records. Storage: Supabase Storage (pdf-exports bucket).
-- 7-year retention. ON DELETE RESTRICT on profile_id.
-- credential_id FK replaces pass_id → passes.id (OD-6).
-- payment_id FK replaces purchase_id → purchases.id (OD-8).
-- ============================================================

create table public.pdf_exports (
  id                 uuid        primary key default gen_random_uuid(),
  profile_id         uuid        not null references public.profiles(id) on delete restrict,
  license_id         uuid        references public.licenses(id) on delete set null,
  credential_id      uuid        references public.credentials(id) on delete set null,
  payment_id         uuid        references public.payments(id) on delete set null,
  storage_bucket     text        not null default 'pdf-exports',
  storage_path       text        not null unique,
  file_size_bytes    integer,
  disclaimer_version text        not null,
  status             text        not null default 'pending'
    check (status in ('pending', 'generating', 'ready', 'error')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table  public.pdf_exports                     is 'PDF export records. Supabase Storage backend. 7-year retention. ON DELETE RESTRICT prevents profile hard-deletion.';
comment on column public.pdf_exports.credential_id       is 'FK to credentials (was pass_id → passes in v3 — OD-6).';
comment on column public.pdf_exports.payment_id          is 'FK to payments (was purchase_id → purchases in v3 — OD-8). Null = entitlement-covered (Standard/Premier).';
comment on column public.pdf_exports.storage_path        is 'Supabase Storage object path within pdf-exports bucket. Unique to prevent duplicate records.';
comment on column public.pdf_exports.disclaimer_version  is 'Version identifier of the approved PDF disclaimer text included in this export.';

create index idx_pdf_exports_profile_id
  on public.pdf_exports(profile_id);

create index idx_pdf_exports_license_id
  on public.pdf_exports(license_id);

create index idx_pdf_exports_ready
  on public.pdf_exports(profile_id, created_at desc)
  where status = 'ready';

create trigger set_pdf_exports_updated_at
  before update on public.pdf_exports
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 13. AUDIT EVENTS
-- Append-only security and compliance audit trail.
-- Service-role writes only. No user-facing SELECT policies.
-- OD-1: action CHECK enforces resource.verb format.
-- No UPDATE or DELETE policy — immutable once written.
-- actor_id SET NULL on delete — records always preserved.
-- ============================================================

create table public.audit_events (
  id             uuid        primary key default gen_random_uuid(),
  actor_id       uuid        references public.profiles(id) on delete set null,
  action         text        not null check (action ~ '^[a-z_]+\.[a-z_]+$'),  -- OD-1
  resource_type  text        not null,
  resource_id    uuid,
  change_before  jsonb,
  change_after   jsonb,
  ip_address     inet,
  user_agent     text,
  created_at     timestamptz not null default now()
);

comment on table  public.audit_events           is 'Append-only compliance audit trail. Service-role only. actor_id set null on delete. No DELETE policy. 7-year retention.';
comment on column public.audit_events.actor_id  is 'Null for system events (webhooks, scheduled jobs) or after profile hard-deletion.';
comment on column public.audit_events.action    is 'resource.verb format enforced by CHECK (OD-1). Examples: profile.created, license.lookup_started, credential.issued, stripe_event.received.';

create index idx_audit_actor
  on public.audit_events(actor_id);

create index idx_audit_resource
  on public.audit_events(resource_type, resource_id);

create index idx_audit_created_at
  on public.audit_events(created_at);


-- ============================================================
-- 14. LICENSE LOOKUPS (was refresh_events)
-- Audit trail for all license lookup attempts (initial + refresh).
-- Covers nurse-initiated, scheduled, and onboarding lookups.
-- Append-only. payment_id FK replaces purchase_id → purchases (OD-8).
-- ============================================================

create table public.license_lookups (
  id                             uuid        primary key default gen_random_uuid(),
  profile_id                     uuid        not null references public.profiles(id) on delete cascade,
  license_id                     uuid        references public.licenses(id) on delete set null,
  triggered_by                   text        not null
    check (triggered_by in ('nurse', 'scheduled', 'onboarding')),
  result                         text        not null default 'pending'
    check (result in ('pending', 'success', 'no_change', 'failed', 'api_error')),
  previous_normalized_status     text,
  new_normalized_status          text,
  previous_wallet_pass_treatment text,
  new_wallet_pass_treatment      text,
  lookup_source                  text        not null default 'propelus',
  error_message                  text,
  payment_id                     uuid        references public.payments(id) on delete set null,
  created_at                     timestamptz not null default now()
);

comment on table  public.license_lookups                 is 'Append-only audit trail for license lookups. Covers initial lookups, on-demand refreshes, and scheduled refreshes. Was "refresh_events" in v3.';
comment on column public.license_lookups.triggered_by    is 'nurse = on-demand (may be paid); scheduled = automated daily; onboarding = initial lookup during enrollment.';
comment on column public.license_lookups.payment_id      is 'FK to payments for paid on-demand lookups (was purchase_id → purchases in v3 — OD-8). Null for scheduled/onboarding.';

create index idx_license_lookups_profile_id
  on public.license_lookups(profile_id);

create index idx_license_lookups_license_id
  on public.license_lookups(license_id);


-- ============================================================
-- 15. LICENSE STATUS MAPPINGS (new in v4 — OD-12)
-- Reference table mapping raw source status strings to PassTo
-- canonical status and product treatment.
-- Auditable and updateable without redeploying Edge Function code.
-- No client policies for MVP — Edge Functions read via service role.
-- ============================================================

create table public.license_status_mappings (
  id                           uuid        primary key default gen_random_uuid(),
  source_type                  text        not null,
  source_name                  text        not null,
  raw_status                   text        not null,
  source_status_display        text,
  normalized_status            text        not null
    check (normalized_status in (
      'Active', 'Inactive', 'Expired',
      'Surrendered', 'Revoked', 'Suspended', 'Unknown'
    )),
  status_intent                text        not null
    check (status_intent in (
      'credential_valid', 'credential_caution',
      'credential_invalid', 'verification_failure'
    )),
  wallet_pass_treatment        text        not null
    check (wallet_pass_treatment in ('valid', 'caution', 'invalid', 'do_not_issue')),
  credential_issuance_allowed  boolean     not null default false,
  requires_alert               boolean     not null default false,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),

  unique (source_type, source_name, raw_status)
);

comment on table  public.license_status_mappings                          is 'Reference table: raw source status → PassTo canonical status. New in v4 (OD-12). Auditable; updateable without code deploy.';
comment on column public.license_status_mappings.source_type              is 'Source system type. e.g., "propelus"';
comment on column public.license_status_mappings.source_name              is 'Source dataset. e.g., "nursys" for Nursys/NLC data via Propelus.';
comment on column public.license_status_mappings.raw_status               is 'Status string exactly as returned by source. Case-sensitive.';
comment on column public.license_status_mappings.credential_issuance_allowed is 'True only when PassTo may issue or display a credential for this status.';
comment on column public.license_status_mappings.requires_alert           is 'True if a status change to this mapping should trigger a nurse notification.';

create index idx_license_status_mappings_lookup
  on public.license_status_mappings(source_type, source_name, raw_status);

create trigger set_license_status_mappings_updated_at
  before update on public.license_status_mappings
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- AUTO-PROFILE TRIGGER
-- Creates profiles row automatically on auth.users INSERT.
-- Runs SECURITY DEFINER (bypasses RLS). Safe: auth.users insert
-- only happens via Supabase Auth (signUp / SSO).
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
-- SECURITY DEFINER FUNCTIONS
-- ============================================================

-- OD-11: Nurse safe profile update RPC.
-- Nurse clients call this instead of a direct UPDATE on profiles.
-- Only updates explicitly allowed fields.
-- Privileged fields (id_verification_status, onboarding_step,
-- account_status, subscription_tier, stripe_customer_id, etc.)
-- are NOT updateable via this function.

create or replace function public.update_own_profile_basic(
  p_first_name               text    default null,
  p_last_name                text    default null,
  p_phone                    text    default null,
  p_display_name             text    default null,
  p_preferred_name           text    default null,
  p_notification_preferences jsonb   default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  select id into v_profile_id
  from public.profiles
  where auth_user_id = auth.uid();

  if v_profile_id is null then
    raise exception 'Profile not found for current user';
  end if;

  update public.profiles
  set
    first_name               = coalesce(p_first_name,               first_name),
    last_name                = coalesce(p_last_name,                last_name),
    phone                    = coalesce(p_phone,                    phone),
    display_name             = coalesce(p_display_name,             display_name),
    preferred_name           = coalesce(p_preferred_name,           preferred_name),
    notification_preferences = coalesce(p_notification_preferences, notification_preferences),
    updated_at               = now()
  where id = v_profile_id;
end;
$$;

comment on function public.update_own_profile_basic is 'Safe nurse profile update. Only allowed fields updated. Privileged fields (id_verification_status, onboarding_step, account_status, subscription_tier, stripe_customer_id, deleted_at) cannot be set via this function. Per OD-11.';


-- Nurse-safe verification history.
-- Returns token-level summary without exposing verifier name or email.
-- Caller must own the profile (auth.uid() enforced inside function).

create or replace function public.get_verification_history(p_profile_id uuid)
returns table (
  token_id     uuid,
  token_type   text,
  token_status text,
  created_at   timestamptz,
  expires_at   timestamptz,
  used_at      timestamptz,
  was_accessed boolean,
  accessed_at  timestamptz,
  event_count  bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and auth_user_id = auth.uid()
  ) then
    raise exception 'Access denied';
  end if;

  return query
  select
    vt.id                  as token_id,
    vt.token_type,
    vt.status              as token_status,
    vt.created_at,
    vt.expires_at,
    vt.used_at,
    (v.id is not null)     as was_accessed,
    v.session_started_at   as accessed_at,
    coalesce(
      (select count(*) from public.verification_events ve where ve.verifier_id = v.id),
      0
    )                      as event_count
  from public.verification_tokens vt
  left join public.verifiers v on v.token_id = vt.id
  where vt.profile_id = p_profile_id
  order by vt.created_at desc;
end;
$$;

comment on function public.get_verification_history is 'Nurse-safe token history. No verifier PII exposed. Caller must own the profile.';


-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS on all 15 tables.
-- Service role bypasses RLS by default (Supabase behavior).
-- Policies below govern authenticated (nurse) and anon access only.
-- ============================================================

alter table public.profiles                enable row level security;
alter table public.licenses                enable row level security;
alter table public.credentials             enable row level security;
alter table public.wallet_passes           enable row level security;
alter table public.verification_tokens     enable row level security;
alter table public.verifiers               enable row level security;
alter table public.verification_events     enable row level security;
alter table public.subscriptions           enable row level security;
alter table public.payments                enable row level security;
alter table public.stripe_events           enable row level security;
alter table public.notification_events     enable row level security;
alter table public.pdf_exports             enable row level security;
alter table public.audit_events            enable row level security;
alter table public.license_lookups         enable row level security;
alter table public.license_status_mappings enable row level security;


-- ── profiles ──────────────────────────────────────────────────
-- SELECT: nurse sees only own row
-- No direct UPDATE policy — nurse uses update_own_profile_basic() (OD-11)
-- No INSERT policy — handle_new_user trigger handles creation
-- No DELETE policy — soft delete only; hard delete blocked by RESTRICT FKs

create policy "nurse_select_own_profile"
  on public.profiles
  for select
  to authenticated
  using (auth_user_id = auth.uid());


-- ── licenses ──────────────────────────────────────────────────
-- SELECT: nurse sees own licenses only

create policy "nurse_select_own_licenses"
  on public.licenses
  for select
  to authenticated
  using (profile_id = public.auth_profile_id());


-- ── credentials ───────────────────────────────────────────────
-- SELECT: nurse sees own credentials only

create policy "nurse_select_own_credentials"
  on public.credentials
  for select
  to authenticated
  using (profile_id = public.auth_profile_id());


-- ── wallet_passes ─────────────────────────────────────────────
-- SELECT: nurse sees wallet passes for own credentials only

create policy "nurse_select_own_wallet_passes"
  on public.wallet_passes
  for select
  to authenticated
  using (
    credential_id in (
      select id from public.credentials
      where profile_id = public.auth_profile_id()
    )
  );


-- ── verification_tokens ───────────────────────────────────────
-- SELECT: nurse sees own tokens
-- UPDATE: nurse may revoke own active tokens only
--         WITH CHECK ensures final status can only be 'revoked'

create policy "nurse_select_own_verification_tokens"
  on public.verification_tokens
  for select
  to authenticated
  using (profile_id = public.auth_profile_id());

create policy "nurse_revoke_own_verification_token"
  on public.verification_tokens
  for update
  to authenticated
  using (
    profile_id = public.auth_profile_id()
    and status = 'active'
  )
  with check (status = 'revoked');


-- ── verifiers ─────────────────────────────────────────────────
-- No policies. Service-role only. RLS enabled + zero policies = zero client access.


-- ── verification_events ───────────────────────────────────────
-- No policies. Service-role only.


-- ── subscriptions ─────────────────────────────────────────────
-- SELECT: nurse sees own subscription record only

create policy "nurse_select_own_subscriptions"
  on public.subscriptions
  for select
  to authenticated
  using (profile_id = public.auth_profile_id());


-- ── payments ──────────────────────────────────────────────────
-- SELECT: nurse sees own payment records only
-- No DELETE policy — ON DELETE RESTRICT enforces 7-year retention

create policy "nurse_select_own_payments"
  on public.payments
  for select
  to authenticated
  using (profile_id = public.auth_profile_id());


-- ── stripe_events ─────────────────────────────────────────────
-- No policies. Service-role only.


-- ── notification_events ───────────────────────────────────────
-- SELECT: nurse sees own notification records only

create policy "nurse_select_own_notification_events"
  on public.notification_events
  for select
  to authenticated
  using (profile_id = public.auth_profile_id());


-- ── pdf_exports ───────────────────────────────────────────────
-- SELECT: nurse sees own PDF export metadata only
-- Actual file access via Supabase Storage signed URL

create policy "nurse_select_own_pdf_exports"
  on public.pdf_exports
  for select
  to authenticated
  using (profile_id = public.auth_profile_id());


-- ── audit_events ──────────────────────────────────────────────
-- No policies. Service-role only. Append-only (no DELETE policy).


-- ── license_lookups ───────────────────────────────────────────
-- SELECT: nurse sees own lookup history only

create policy "nurse_select_own_license_lookups"
  on public.license_lookups
  for select
  to authenticated
  using (profile_id = public.auth_profile_id());


-- ── license_status_mappings ───────────────────────────────────
-- No client policies for MVP (OD-12 default recommendation).
-- Edge Functions read via service role and return normalized status.


-- ============================================================
-- SEED DATA — license_status_mappings
-- Common Propelus / Nursys status values mapped to PassTo canonical.
-- source_type: propelus
-- source_name: nursys (NLC/NCSBN state board data via Propelus API)
--
-- wallet_pass_treatment notes:
--   valid        = issue and display full active credential
--   caution      = issue but display caution indicator (expiring/encumbered)
--   invalid      = credential exists but cannot be displayed as valid
--   do_not_issue = do not issue credential; status is severe or unknown
-- ============================================================

insert into public.license_status_mappings
  (source_type, source_name, raw_status, source_status_display,
   normalized_status, status_intent, wallet_pass_treatment,
   credential_issuance_allowed, requires_alert)
values
  -- ── Active / valid states ──────────────────────────────────
  ('propelus', 'nursys', 'Active',     'Active',
   'Active', 'credential_valid', 'valid', true, false),

  ('propelus', 'nursys', 'ACTIVE',     'Active',
   'Active', 'credential_valid', 'valid', true, false),

  ('propelus', 'nursys', 'active',     'Active',
   'Active', 'credential_valid', 'valid', true, false),

  ('propelus', 'nursys', 'Clear',      'Clear',
   'Active', 'credential_valid', 'valid', true, false),

  ('propelus', 'nursys', 'Current',    'Current',
   'Active', 'credential_valid', 'valid', true, false),

  ('propelus', 'nursys', 'In Good Standing', 'In Good Standing',
   'Active', 'credential_valid', 'valid', true, false),

  -- ── Caution states (active but flags present) ──────────────
  ('propelus', 'nursys', 'Encumbered', 'Encumbered',
   'Suspended', 'credential_caution', 'caution', true, true),

  ('propelus', 'nursys', 'Probation',  'On Probation',
   'Suspended', 'credential_caution', 'caution', true, true),

  ('propelus', 'nursys', 'Limited',    'Limited',
   'Suspended', 'credential_caution', 'caution', true, true),

  ('propelus', 'nursys', 'Restricted', 'Restricted',
   'Suspended', 'credential_caution', 'caution', true, true),

  ('propelus', 'nursys', 'Conditional', 'Conditional',
   'Suspended', 'credential_caution', 'caution', true, true),

  -- ── Suspended / temporary invalid states ──────────────────
  ('propelus', 'nursys', 'Suspended',  'Suspended',
   'Suspended', 'credential_invalid', 'invalid', false, true),

  ('propelus', 'nursys', 'SUSPENDED',  'Suspended',
   'Suspended', 'credential_invalid', 'invalid', false, true),

  ('propelus', 'nursys', 'Suspended - Temporary', 'Suspended - Temporary',
   'Suspended', 'credential_invalid', 'invalid', false, true),

  -- ── Expired / lapsed states ────────────────────────────────
  ('propelus', 'nursys', 'Expired',    'Expired',
   'Expired', 'credential_invalid', 'invalid', false, true),

  ('propelus', 'nursys', 'EXPIRED',    'Expired',
   'Expired', 'credential_invalid', 'invalid', false, true),

  ('propelus', 'nursys', 'Lapsed',     'Lapsed',
   'Expired', 'credential_invalid', 'invalid', false, true),

  ('propelus', 'nursys', 'Not Renewed', 'Not Renewed',
   'Expired', 'credential_invalid', 'invalid', false, true),

  ('propelus', 'nursys', 'Delinquent', 'Delinquent',
   'Expired', 'credential_invalid', 'invalid', false, true),

  -- ── Inactive states ────────────────────────────────────────
  ('propelus', 'nursys', 'Inactive',   'Inactive',
   'Inactive', 'credential_invalid', 'invalid', false, true),

  ('propelus', 'nursys', 'INACTIVE',   'Inactive',
   'Inactive', 'credential_invalid', 'invalid', false, true),

  ('propelus', 'nursys', 'Retired',    'Retired',
   'Inactive', 'credential_invalid', 'invalid', false, true),

  ('propelus', 'nursys', 'Emeritus',   'Emeritus',
   'Inactive', 'credential_invalid', 'invalid', false, true),

  ('propelus', 'nursys', 'Voluntary Inactive', 'Voluntary Inactive',
   'Inactive', 'credential_invalid', 'invalid', false, true),

  -- ── Surrendered states ─────────────────────────────────────
  ('propelus', 'nursys', 'Surrendered', 'Surrendered',
   'Surrendered', 'credential_invalid', 'do_not_issue', false, true),

  ('propelus', 'nursys', 'SURRENDERED', 'Surrendered',
   'Surrendered', 'credential_invalid', 'do_not_issue', false, true),

  ('propelus', 'nursys', 'Voluntarily Surrendered', 'Voluntarily Surrendered',
   'Surrendered', 'credential_invalid', 'do_not_issue', false, true),

  -- ── Revoked states ─────────────────────────────────────────
  ('propelus', 'nursys', 'Revoked',    'Revoked',
   'Revoked', 'credential_invalid', 'do_not_issue', false, true),

  ('propelus', 'nursys', 'REVOKED',    'Revoked',
   'Revoked', 'credential_invalid', 'do_not_issue', false, true),

  ('propelus', 'nursys', 'Denied',     'Denied',
   'Revoked', 'credential_invalid', 'do_not_issue', false, true),

  ('propelus', 'nursys', 'Cancelled',  'Cancelled',
   'Revoked', 'credential_invalid', 'do_not_issue', false, true),

  ('propelus', 'nursys', 'Annulled',   'Annulled',
   'Revoked', 'credential_invalid', 'do_not_issue', false, true),

  -- ── Unknown / verification failure states ──────────────────
  ('propelus', 'nursys', 'Unknown',    'Unknown',
   'Unknown', 'verification_failure', 'do_not_issue', false, true),

  ('propelus', 'nursys', 'Not Found',  'Not Found',
   'Unknown', 'verification_failure', 'do_not_issue', false, true),

  ('propelus', 'nursys', 'Error',      'Error',
   'Unknown', 'verification_failure', 'do_not_issue', false, true),

  ('propelus', 'nursys', 'Pending',    'Pending',
   'Unknown', 'verification_failure', 'do_not_issue', false, false),

  ('propelus', 'nursys', 'Under Investigation', 'Under Investigation',
   'Unknown', 'verification_failure', 'do_not_issue', false, true);
```

---

## RLS Policy Summary

| Table | Nurse SELECT | Nurse UPDATE | Nurse INSERT | Nurse DELETE | Notes |
|---|---|---|---|---|---|
| `profiles` | Own row | Via RPC only | Via trigger | None | OD-11: no direct UPDATE policy |
| `licenses` | Own rows | None | None | None | Service-role writes |
| `credentials` | Own rows | None | None | None | Service-role writes |
| `wallet_passes` | Own (via credential_id) | None | None | None | Service-role writes |
| `verification_tokens` | Own tokens | Revoke own active only | None | None | WITH CHECK: status = 'revoked' only |
| `verifiers` | **None** | None | None | None | Service-role only |
| `verification_events` | **None** | None | None | None | Service-role only; append-only |
| `subscriptions` | Own row | None | None | None | Service-role writes |
| `payments` | Own rows | None | None | **None** | ON DELETE RESTRICT; 7-year retention |
| `stripe_events` | **None** | None | None | None | Service-role only |
| `notification_events` | Own rows | None | None | None | Service-role writes |
| `pdf_exports` | Own rows | None | None | **None** | ON DELETE RESTRICT; 7-year retention |
| `audit_events` | **None** | None | None | **None** | Service-role only; append-only |
| `license_lookups` | Own rows | None | None | None | Service-role writes; append-only |
| `license_status_mappings` | **None** | None | None | None | Service-role only; MVP default |

---

## Key Security Invariants Preserved

1. Raw verification tokens never stored — SHA-256 hash only in `token_hash`
2. Verifier name and email never readable by nurse clients — service-role only
3. Token creation service-role only — no nurse INSERT on `verification_tokens`
4. Payment-gated actions (share token, QR, refresh, PDF) server-controlled only
5. Stripe idempotency — `stripe_events.stripe_event_id` unique constraint
6. 7-year retention — `profiles.deleted_at` soft delete; `ON DELETE RESTRICT` on `payments.profile_id` and `pdf_exports.profile_id`
7. `audit_events` append-only — no UPDATE or DELETE policy
8. Verifier access on `/v/{token}` not covered by RLS — token validation runs service-role via Edge Function

---

## Pre-Execution Checklist (for TASK-0013 review)

- [ ] Confirm target project is `wvzjfxacykgsaffskgtr` (PassTo Dev)
- [ ] Confirm project has 0 existing tables (fresh migration — no destructive drops needed)
- [ ] Confirm all 12 Codex ODs are reflected in SQL (OD-1 through OD-12)
- [ ] Confirm `stripe_customers` drop is acceptable (stripe_customer_id moved to profiles)
- [ ] Confirm `license_lookups` name is correct (was `refresh_events`)
- [ ] Confirm `license_status_mappings` seed data covers expected Propelus status values
- [ ] Confirm RLS table is correct: 8 tables service-role only; 7 tables nurse-readable

---

## Execution Instructions (TASK-0014)

After David approval:

```
Tool: mcp__585b59f7-61af-4fac-bd1d-0f78516e1f14__apply_migration
Project: wvzjfxacykgsaffskgtr
Name: v4_passto_mvp_schema
SQL: <copy SQL block above>
```

Post-execution: Run TASK-0015 verification checks before switching any Lovable project to this database.

---

## Related Documents

```
docs/architecture/SUPABASE_SCHEMA_RLS_PLAN.md — v3 planning baseline
docs/architecture/CODEX_RESPONSE_TASK_0007_SCHEMA_QA.md — OD resolutions
docs/tasks/TASK-0012.md — This task
docs/tasks/TASK-0013.md — David review gate
docs/tasks/TASK-0014.md — Apply migration
docs/tasks/TASK-0015.md — Post-migration verification
```
