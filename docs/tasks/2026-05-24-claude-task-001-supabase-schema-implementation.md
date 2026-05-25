# PassTo Task 001 — Supabase MVP Schema Spike

**Executed By:** Claude — Senior Engineer
**Date:** 2026-05-24
**Supabase Project:** `zpvbexzdiklxlvrxsvop`
**Status:** Needs Codex QA — Remediation v2
**Remediation Of:** Codex QA Review — Issue #1 — 2026-05-24

---

## Remediation Summary

This is the remediated version of the Claude Task 001 schema spike, addressing all 10 blockers identified in the Codex QA review (Issue #1, `/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md`).

**Changes from v1:**

| Blocker | Change |
|---|---|
| BLOCKER 1 | Renamed: `pass_shares` → `verification_tokens`, `pass_recipients` + `review_sessions` → `verifiers`, `review_events` → `verification_events` |
| BLOCKER 2 | Removed `verifier_organization` field |
| BLOCKER 3 | `verifiers` table is service-role-only. No nurse SELECT. Nurse-facing verification history served via API. |
| BLOCKER 4 | `verification_tokens` now stores `token_hash` (SHA-256). Raw token generated server-side, returned once, never stored. |
| BLOCKER 5 | Removed nurse INSERT policy on `verification_tokens`. Token creation is service-role only (payment/entitlement gate enforced in API route). |
| BLOCKER 6 | Renamed license status fields to canonical model. Wallet treatment values changed from colors to intent (`valid`/`caution`/`invalid`/`do_not_issue`). Added `status_checked_at`. |
| BLOCKER 7 | Added explicit `status` field to `verification_tokens` with full mutually exclusive enum. |
| BLOCKER 8 | Added `purchases` table for all paid actions (share, refresh, PDF, additional license). |
| BLOCKER 9 | Added `refresh_events` table. PDF exports modeled via `purchases` + metadata. `jobs` and `notification_events` explicitly deferred. |
| BLOCKER 10 | Added `deleted_at` to `profiles`. Flagged data retention as David decision required before migration. |
| N1 | Removed nurse INSERT policy on `profiles` (trigger handles creation). |
| N2 | Added generic `set_updated_at()` trigger applied to all tables with `updated_at`. |
| N3 | Added `unique(pass_id, provider)` to `wallet_passes`. |

**Final table count: 13** (12 from v1 − 1 merged + 2 added)

- Removed: `review_sessions` (merged into `verifiers`)
- Renamed: `pass_shares` → `verification_tokens`, `pass_recipients` → `verifiers`, `review_events` → `verification_events`
- Added: `purchases`, `refresh_events`

---

## 1. Summary

This spike designs the Supabase/Postgres schema foundation for PassTo's MVP, remediated to address Codex QA findings. PassTo is a digital nurse credentialing app: nurses verify their identity via ID.me, look up their nursing license from state boards via Propelus/RapidAPI, receive a wallet pass (Apple/Google Wallet via PassKit) reflecting current license status, and share credentials with verifiers via one-time short-lived tokens. Verifiers access credentials through a form-gated link and have no PassTo accounts.

**Key design positions in this remediated spike:**

1. **Canonical table naming aligned with TASK-0002 architecture** — Verifier/share entities renamed to match approved vocabulary: `verification_tokens`, `verifiers`, `verification_events`.

2. **Token hashing for security** — `verification_tokens` stores `token_hash` (SHA-256 of raw token). Raw token generated server-side, returned once to nurse, never persisted. Database breach cannot yield usable tokens.

3. **Verifier data is service-role-only** — Nurses cannot read verifier identity (name, email) directly. All nurse-facing verification history is served by API routes returning safe, non-PII fields. Prevents verifier email exposure.

4. **Share/token creation is service-role-only** — Nurse clients cannot insert verification tokens directly. All token creation flows through a Vercel API route that enforces entitlement, payment, credential ownership, and TTL before generating and returning the raw token.

5. **License status model matches approved canonical fields** — `source_status_raw`, `source_status_display`, `normalized_status`, `status_intent`, `wallet_pass_treatment` (`valid`/`caution`/`invalid`/`do_not_issue`), `status_checked_at`.

6. **Explicit token status enum** — `verification_tokens.status` is mutually exclusive: `active`/`used`/`expired`/`replaced`/`revoked`/`payment_failed`/`generation_failed`.

7. **`purchases` table covers all paid MVP actions** — Single table for share, refresh, PDF export, and additional license purchases. Replaces scattered payment intent fields.

8. **`refresh_events` table tracks all license refresh attempts** — Supports billing audit, API failure tracking, and status-change detection for scheduled and on-demand refreshes.

9. **`deleted_at` on `profiles` for soft deletion** — Blocks hard cascade delete pending David's data retention decision.

10. **`updated_at` triggers on all mutable tables** — Generic trigger ensures `updated_at` is maintained automatically.

---

## 2. Migration SQL Draft

```sql
-- ============================================================
-- PassTo MVP — Supabase Migration
-- Claude Task 001 — Schema Spike v2 (Remediated)
-- 2026-05-24
--
-- Apply to project: zpvbexzdiklxlvrxsvop
-- DO NOT apply to production without Codex QA and David approval.
-- DO NOT apply until David decides data retention policy (BLOCKER 10).
-- ============================================================

create extension if not exists "pgcrypto";


-- ============================================================
-- GENERIC updated_at TRIGGER
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
-- 1. PROFILES
--
-- One row per nurse. Extends auth.users.
-- Created automatically by trigger on auth.users insert.
-- deleted_at supports soft deletion pending retention policy.
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
  deleted_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table  public.profiles                        is 'One row per nurse. Extends auth.users. Created by trigger. deleted_at supports soft deletion pending retention policy decision.';
comment on column public.profiles.id_me_subject          is 'ID.me subject claim. Deduplication key. Null until ID.me verification completes.';
comment on column public.profiles.phone                  is 'E.164 format. Populated after phone verification. Twilio SMS destination.';
comment on column public.profiles.id_verification_level  is 'ID.me IAL assurance level. IAL2 required for full credential access.';
comment on column public.profiles.deleted_at             is 'Soft delete timestamp. Null = active. Set on account closure. Hard delete policy pending David retention decision.';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 2. LICENSES
--
-- License records fetched from state board APIs via Propelus.
-- One row per nurse per license (state + type + number).
-- Implements canonical 5-field status model per DECISION-0008.
-- Service role writes only.
-- ============================================================

create table public.licenses (
  id                    uuid        primary key default gen_random_uuid(),
  profile_id            uuid        not null references public.profiles(id) on delete cascade,
  state                 text        not null,
  license_type          text        not null,
  license_number        text,
  first_name            text,
  last_name             text,
  source_status_raw     text,
  source_status_display text,
  normalized_status     text
    check (normalized_status in (
      'Active', 'Inactive', 'Expired',
      'Surrendered', 'Revoked', 'Suspended', 'Unknown'
    )),
  status_intent         text
    check (status_intent in ('credential_valid', 'credential_caution', 'credential_invalid', 'verification_failure')),
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

comment on table  public.licenses                      is 'Nursing license records from state board APIs. Source of truth for credential status. Service role writes; nurses read.';
comment on column public.licenses.source_status_raw    is 'Board status string exactly as returned by the Propelus API. Never normalized or modified.';
comment on column public.licenses.source_status_display is 'Board-provided display name for the status, if available. Null if API does not return one.';
comment on column public.licenses.normalized_status    is 'PassTo canonical status. One of seven values per DECISION-0008.';
comment on column public.licenses.status_intent        is 'Product intent derived from normalized_status. Drives application behavior and pass decisions.';
comment on column public.licenses.wallet_pass_treatment is 'Wallet pass visual and behavioral treatment. valid=Active, caution=Active <30d expiry, invalid=Suspended/Revoked/Expired, do_not_issue=Unknown/error states.';
comment on column public.licenses.status_checked_at    is 'Timestamp of the most recent successful Propelus API lookup.';
comment on column public.licenses.is_primary           is 'Nurse-designated primary license. Enforced as one-true-per-profile by partial unique index.';
comment on column public.licenses.lookup_response      is 'Raw Propelus API JSON response. Preserved verbatim for audit and debugging.';

create unique index idx_licenses_one_primary_per_profile
  on public.licenses(profile_id)
  where is_primary = true;

create trigger set_licenses_updated_at
  before update on public.licenses
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 3. PASSES
--
-- PassTo credential pass record. One per nurse license.
-- Drives wallet pass content and status.
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
comment on column public.passes.pass_template_data is 'Data payload sent to PassKit for pass generation. Display fields derived from license; not raw license data.';
comment on column public.passes.license_id         is 'Set null on license delete to preserve pass history. Status snapshot remains in pass_template_data.';

create trigger set_passes_updated_at
  before update on public.passes
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 4. WALLET PASSES
--
-- PassKit / Apple Wallet / Google Wallet provider reference.
-- Thin record only. PassKit is source of truth.
-- unique(pass_id, provider) allows one record per provider per pass.
-- Service role writes (PassKit webhook).
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
  updated_at          timestamptz not null default now(),

  unique (pass_id, provider)
);

comment on table  public.wallet_passes                  is 'PassKit and wallet provider reference. Never mirror PassKit internal schema. PassKit is authoritative.';
comment on column public.wallet_passes.external_pass_id is 'PassKit-assigned pass ID. Reference only.';
comment on column public.wallet_passes.pass_url         is 'Add-to-wallet link from PassKit. Served to nurse for wallet installation.';

create trigger set_wallet_passes_updated_at
  before update on public.wallet_passes
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 5. VERIFICATION TOKENS
--
-- Share tokens created by nurses (via service-role API route) to
-- grant verifier access. One-time and short-lived per DECISION-0005.
--
-- Raw token is generated server-side, returned once to nurse,
-- never stored. Only SHA-256 hash is stored.
--
-- Token creation is service-role only (enforced at API layer).
-- Nurses may read and revoke their own tokens.
-- ============================================================

create table public.verification_tokens (
  id          uuid        primary key default gen_random_uuid(),
  profile_id  uuid        not null references public.profiles(id) on delete cascade,
  pass_id     uuid        not null references public.passes(id) on delete cascade,
  token_hash  text        not null unique,
  status      text        not null default 'active'
    check (status in (
      'active',
      'used',
      'expired',
      'replaced',
      'revoked',
      'payment_failed',
      'generation_failed'
    )),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.verification_tokens            is 'Nurse-initiated verifier access tokens. One-time, short-lived per DECISION-0005. Stores SHA-256 hash of raw token only. Raw token returned to nurse once at creation; never stored.';
comment on column public.verification_tokens.token_hash is 'SHA-256 hash of the raw token. Application hashes the presented token on redemption and looks up by hash. Raw token is never persisted.';
comment on column public.verification_tokens.status     is 'Mutually exclusive token lifecycle state. Once used, a token is permanently used and does not transition to expired.';
comment on column public.verification_tokens.expires_at is 'Required short TTL per DECISION-0005. Application enforces atomically: UPDATE ... WHERE token_hash = $1 AND status = active AND expires_at > now() RETURNING *.';

create trigger set_verification_tokens_updated_at
  before update on public.verification_tokens
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 6. VERIFIERS
--
-- Verifier identity and session record, created when verifier
-- submits the access form. Merges prior pass_recipients and
-- review_sessions into one entity per TASK-0002 canonical naming.
--
-- SERVICE-ROLE ONLY for all access.
-- Verifier email is not exposed to nurse clients.
-- Nurse-facing verification history is served via API
-- returning only non-PII session summary fields.
-- ============================================================

create table public.verifiers (
  id                  uuid        primary key default gen_random_uuid(),
  token_id            uuid        not null unique references public.verification_tokens(id) on delete cascade,
  name                text        not null,
  email               text        not null,
  terms_accepted_at   timestamptz not null,
  marketing_consent   boolean     not null default false,
  status              text        not null default 'active'
    check (status in ('active', 'completed', 'expired', 'error')),
  session_started_at  timestamptz not null default now(),
  session_completed_at timestamptz,
  ip_address          inet,
  user_agent          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table  public.verifiers                   is 'Verifier identity and session record. One per token (unique(token_id)). Service-role only — verifier email is never exposed to nurse clients.';
comment on column public.verifiers.email             is 'Verifier email as entered in the access form. Service-role only. Not displayed to nurse per approved product rules.';
comment on column public.verifiers.terms_accepted_at is 'Required Terms of Use acceptance. Credential data must not be served before this record exists.';
comment on column public.verifiers.status            is 'Session lifecycle. active → completed on normal exit. active → expired on TTL. Mutually exclusive.';

create trigger set_verifiers_updated_at
  before update on public.verifiers
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 7. VERIFICATION EVENTS
--
-- Individual events during a verifier session.
-- Append-only. No updates.
-- Service role writes; nurse read access via token chain
-- requires SECURITY DEFINER function (see RLS notes).
-- ============================================================

create table public.verification_events (
  id          uuid        primary key default gen_random_uuid(),
  verifier_id uuid        not null references public.verifiers(id) on delete cascade,
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

comment on table  public.verification_events            is 'Events within a verifier session. Append-only. No updates. Service-role writes; nurse access via SECURITY DEFINER function.';
comment on column public.verification_events.event_type is 'PassTo-specific event set. Verifiers view credentials; they do not approve or reject.';


-- ============================================================
-- 8. STRIPE CUSTOMERS
--
-- Stripe customer reference. One per nurse profile.
-- Individual billing. Stripe is source of truth.
-- Service role writes.
-- ============================================================

create table public.stripe_customers (
  id                 uuid        primary key default gen_random_uuid(),
  profile_id         uuid        not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text        not null unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.stripe_customers is 'One-to-one with profiles. Individual nurse billing. Stripe is source of truth.';

create trigger set_stripe_customers_updated_at
  before update on public.stripe_customers
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 9. STRIPE SUBSCRIPTIONS
--
-- Current subscription state per nurse.
-- Updated by Stripe webhook handler via service role only.
-- Null plan_name should be treated as Free tier by application.
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

comment on table  public.stripe_subscriptions                          is 'Current subscription state. Stripe webhook writes only. Stripe is source of truth.';
comment on column public.stripe_subscriptions.plan_name                is 'Null must be treated as Free tier by application. Do not rely on nullable plan for entitlement without explicit fallback.';
comment on column public.stripe_subscriptions.license_entitlement_count is 'Included license lookup entitlements per billing cycle. Free=1, Standard=1, Premier=2 per DECISION-0010.';

create trigger set_stripe_subscriptions_updated_at
  before update on public.stripe_subscriptions
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 10. PURCHASES
--
-- Single table for all paid MVP actions.
-- Covers: share token creation, on-demand refresh, PDF export,
-- additional license. Replaces scattered stripe_payment_intent_id
-- fields across product tables.
-- ============================================================

create table public.purchases (
  id                       uuid        primary key default gen_random_uuid(),
  profile_id               uuid        not null references public.profiles(id) on delete cascade,
  action_type              text        not null
    check (action_type in ('share_token', 'refresh', 'pdf_export', 'additional_license')),
  stripe_payment_intent_id text,
  amount_cents             integer     not null check (amount_cents >= 0),
  status                   text        not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  related_entity_type      text
    check (related_entity_type in (
      'verification_token', 'license', 'pass', 'stripe_subscription'
    )),
  related_entity_id        uuid,
  metadata                 jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table  public.purchases                          is 'All paid MVP actions. Single source of truth for per-action billing. Service role writes.';
comment on column public.purchases.action_type              is 'share_token=$1.99 where paid; refresh=$1.99 where paid; pdf_export=$1.99 for Free; additional_license=$4.99.';
comment on column public.purchases.amount_cents             is 'Amount charged in cents. 0 for entitlement-covered actions.';
comment on column public.purchases.metadata                 is 'Flexible storage. For pdf_export: includes Supabase Storage path. For refresh: includes lookup source.';

create trigger set_purchases_updated_at
  before update on public.purchases
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 11. REFRESH EVENTS
--
-- Audit trail for all license refresh attempts.
-- Covers scheduled and nurse-initiated on-demand refreshes.
-- Append-only. Supports billing audit and API failure tracking.
-- ============================================================

create table public.refresh_events (
  id                           uuid        primary key default gen_random_uuid(),
  profile_id                   uuid        not null references public.profiles(id) on delete cascade,
  license_id                   uuid        references public.licenses(id) on delete set null,
  triggered_by                 text        not null check (triggered_by in ('nurse', 'scheduled')),
  result                       text        not null default 'pending'
    check (result in ('pending', 'success', 'no_change', 'failed', 'api_error')),
  previous_normalized_status   text,
  new_normalized_status        text,
  previous_wallet_pass_treatment text,
  new_wallet_pass_treatment    text,
  lookup_source                text        not null default 'propelus',
  error_message                text,
  purchase_id                  uuid        references public.purchases(id) on delete set null,
  created_at                   timestamptz not null default now()
);

comment on table  public.refresh_events                is 'Append-only audit trail for all license refresh attempts. Scheduled and nurse-initiated.';
comment on column public.refresh_events.triggered_by   is 'nurse = on-demand refresh (may be paid); scheduled = automated daily refresh.';
comment on column public.refresh_events.purchase_id    is 'FK to purchases for paid on-demand refreshes. Null for scheduled refreshes.';
comment on column public.refresh_events.result         is 'no_change = lookup succeeded but status did not change; success = status updated.';


-- ============================================================
-- 12. COMMUNICATION EVENTS
--
-- Outbound SMS (Twilio) and email (Postmark) log.
-- Replaces notification_events for MVP.
-- Service role writes; nurses read their own records.
-- ============================================================

create table public.communication_events (
  id                  uuid        primary key default gen_random_uuid(),
  profile_id          uuid        references public.profiles(id) on delete set null,
  related_entity_type text
    check (related_entity_type in (
      'license', 'pass', 'verification_token',
      'refresh_event', 'stripe_subscription', 'purchase'
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

comment on table  public.communication_events                    is 'Outbound SMS/email log. Covers notification_events for MVP. Service role writes; nurses read own records.';
comment on column public.communication_events.external_message_id is 'Twilio MessageSID or Postmark MessageID for delivery webhook correlation.';

create trigger set_communication_events_updated_at
  before update on public.communication_events
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 13. AUDIT EVENTS
--
-- Append-only security and compliance audit trail.
-- Service role writes only. No user-facing SELECT in MVP.
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

comment on table  public.audit_events          is 'Append-only compliance audit trail. Service role only. Not user-facing in MVP.';
comment on column public.audit_events.actor_id is 'Null for system-initiated events (webhooks, scheduled jobs).';
comment on column public.audit_events.action   is 'Canonical action namespace to be defined by Codex before migration (see open question 1).';


-- ============================================================
-- INDEXES
-- ============================================================

-- profiles
create index idx_profiles_id_me_subject
  on public.profiles(id_me_subject)
  where id_me_subject is not null;

create index idx_profiles_active
  on public.profiles(deleted_at)
  where deleted_at is null;

-- licenses
create index idx_licenses_profile_id
  on public.licenses(profile_id);

create index idx_licenses_normalized_status
  on public.licenses(normalized_status);

create index idx_licenses_expiration
  on public.licenses(expiration_date)
  where expiration_date is not null;

-- passes
create index idx_passes_profile_id
  on public.passes(profile_id);

create index idx_passes_license_id
  on public.passes(license_id);

-- wallet_passes
create index idx_wallet_passes_pass_id
  on public.wallet_passes(pass_id);

-- verification_tokens
create index idx_verification_tokens_profile_id
  on public.verification_tokens(profile_id);

create index idx_verification_tokens_active
  on public.verification_tokens(token_hash, status, expires_at)
  where status = 'active';

-- verifiers
create index idx_verifiers_token_id
  on public.verifiers(token_id);

-- verification_events
create index idx_verification_events_verifier_id
  on public.verification_events(verifier_id);

-- purchases
create index idx_purchases_profile_id
  on public.purchases(profile_id);

create index idx_purchases_action_type
  on public.purchases(action_type);

create index idx_purchases_entity
  on public.purchases(related_entity_type, related_entity_id);

-- refresh_events
create index idx_refresh_events_profile_id
  on public.refresh_events(profile_id);

create index idx_refresh_events_license_id
  on public.refresh_events(license_id);

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

-- audit_events
create index idx_audit_actor
  on public.audit_events(actor_id);

create index idx_audit_resource
  on public.audit_events(resource_type, resource_id);

create index idx_audit_created_at
  on public.audit_events(created_at);


-- ============================================================
-- AUTO-PROFILE TRIGGER
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
-- NURSE-SAFE VERIFICATION HISTORY FUNCTION
--
-- Returns token-level verification summary for a nurse without
-- exposing verifier identity. Used by dashboard API.
-- Replaces direct nurse SELECT on verifiers/verification_events.
-- ============================================================

create or replace function public.get_verification_history(p_profile_id uuid)
returns table (
  token_id       uuid,
  token_status   text,
  created_at     timestamptz,
  expires_at     timestamptz,
  used_at        timestamptz,
  was_accessed   boolean,
  accessed_at    timestamptz,
  event_count    bigint
)
language sql
security definer
set search_path = public
as $$
  select
    vt.id                   as token_id,
    vt.status               as token_status,
    vt.created_at,
    vt.expires_at,
    vt.used_at,
    (v.id is not null)      as was_accessed,
    v.session_started_at    as accessed_at,
    count(ve.id)            as event_count
  from public.verification_tokens vt
  left join public.verifiers v on v.token_id = vt.id
  left join public.verification_events ve on ve.verifier_id = v.id
  where vt.profile_id = p_profile_id
  group by vt.id, vt.status, vt.created_at, vt.expires_at, vt.used_at,
           v.id, v.session_started_at
  order by vt.created_at desc;
$$;

comment on function public.get_verification_history(uuid) is
  'Nurse-safe verification history. Returns token-level summary without verifier identity. Call with service role from Vercel API route.';


-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles               enable row level security;
alter table public.licenses               enable row level security;
alter table public.passes                 enable row level security;
alter table public.wallet_passes          enable row level security;
alter table public.verification_tokens    enable row level security;
alter table public.verifiers              enable row level security;
alter table public.verification_events    enable row level security;
alter table public.stripe_customers       enable row level security;
alter table public.stripe_subscriptions   enable row level security;
alter table public.purchases              enable row level security;
alter table public.refresh_events         enable row level security;
alter table public.communication_events   enable row level security;
alter table public.audit_events           enable row level security;
```

---

## 3. RLS Policy Draft / Plan

**Design principles (v2):**

1. Nurses own their own data. No cross-nurse access.
2. Verifier identity (`verifiers` table) is **service-role only** — no nurse SELECT. Verifier email is never exposed to nurse clients.
3. Verification history is served to nurses via the `get_verification_history()` SECURITY DEFINER function, not via direct table SELECT.
4. Token creation (`verification_tokens` INSERT) is **service-role only** — nurse clients cannot insert tokens directly. All creation goes through the payment/entitlement API route.
5. All billing, operational, and audit writes are service-role only.

```sql
-- ============================================================
-- PROFILES
-- No INSERT policy — trigger handles profile creation.
-- ============================================================

create policy "nurse_select_own_profile"
  on public.profiles for select
  using (auth.uid() = auth_user_id);

create policy "nurse_update_own_profile"
  on public.profiles for update
  using  (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- No DELETE policy. Soft deletion via deleted_at.
-- Hard delete policy pending David retention decision.


-- ============================================================
-- LICENSES
-- Nurses read own. Service role writes.
-- ============================================================

create policy "nurse_select_own_licenses"
  on public.licenses for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );


-- ============================================================
-- PASSES
-- Nurses read own. Service role writes.
-- ============================================================

create policy "nurse_select_own_passes"
  on public.passes for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );


-- ============================================================
-- WALLET PASSES
-- Nurses read own (via passes FK). Service role writes.
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
-- VERIFICATION TOKENS
--
-- Nurses read and revoke their own tokens.
-- No nurse INSERT. Token creation is service-role only
-- (payment/entitlement gate enforced in Vercel API route).
-- ============================================================

create policy "nurse_select_own_verification_tokens"
  on public.verification_tokens for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );

create policy "nurse_revoke_own_verification_tokens"
  on public.verification_tokens for update
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  )
  with check (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );


-- ============================================================
-- VERIFIERS
--
-- SERVICE-ROLE ONLY. No user-facing policies.
-- Verifier name and email are never exposed to nurse clients.
-- Nurse-facing verification history is served via
-- get_verification_history() SECURITY DEFINER function.
-- ============================================================

-- (No user-facing policies.)


-- ============================================================
-- VERIFICATION EVENTS
--
-- SERVICE-ROLE ONLY for writes.
-- No direct nurse SELECT. History exposed via
-- get_verification_history() function only.
-- ============================================================

-- (No user-facing policies. Service role only.)


-- ============================================================
-- STRIPE CUSTOMERS
-- Nurses read own. Service role writes.
-- ============================================================

create policy "nurse_select_own_stripe_customer"
  on public.stripe_customers for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );


-- ============================================================
-- STRIPE SUBSCRIPTIONS
-- Nurses read own. Service role writes.
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
-- PURCHASES
-- Nurses read own. Service role writes.
-- ============================================================

create policy "nurse_select_own_purchases"
  on public.purchases for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );


-- ============================================================
-- REFRESH EVENTS
-- Nurses read own. Service role writes.
-- ============================================================

create policy "nurse_select_own_refresh_events"
  on public.refresh_events for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );


-- ============================================================
-- COMMUNICATION EVENTS
-- Nurses read own. Service role writes.
-- ============================================================

create policy "nurse_select_own_communications"
  on public.communication_events for select
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  );


-- ============================================================
-- AUDIT EVENTS
-- Service role only. No user-facing policies in MVP.
-- ============================================================

-- (No user-facing policies.)
```

**RLS ownership summary (v2):**

| Table | Nurse Policy | Service Role Writes |
|---|---|---|
| `profiles` | SELECT / UPDATE own | trigger creates on signup |
| `licenses` | SELECT own | Propelus lookup API route |
| `passes` | SELECT own | pass issuance / refresh route |
| `wallet_passes` | SELECT own (via passes FK) | PassKit webhook |
| `verification_tokens` | SELECT / UPDATE (revoke) own | token creation API route |
| `verifiers` | **None** — service-role only | verifier form API route |
| `verification_events` | **None** — service-role only | verifier session API route |
| `stripe_customers` | SELECT own | Stripe checkout + webhook |
| `stripe_subscriptions` | SELECT own (via stripe_customers FK) | Stripe webhook |
| `purchases` | SELECT own | payment API route |
| `refresh_events` | SELECT own | refresh API route |
| `communication_events` | SELECT own | Twilio / Postmark API routes |
| `audit_events` | None | all API routes and webhooks |

---

## 4. Schema Rationale

| Table | Owner | MVP-Critical | Key Design Decision |
|---|---|:---:|---|
| `profiles` | Nurse | Yes | Extends `auth.users`. ID.me fields for deduplication. `deleted_at` for soft deletion pending retention policy. Trigger handles creation — no nurse INSERT policy. |
| `licenses` | Service / Nurse (read) | Yes | Canonical 5-field status model per DECISION-0008: `source_status_raw`, `source_status_display`, `normalized_status`, `status_intent`, `wallet_pass_treatment`. Treatment values are product intent (`valid`/`caution`/`invalid`/`do_not_issue`), not colors. `status_checked_at` tracks freshness. |
| `passes` | Service / Nurse (read) | Yes | PassTo credential pass record. Links to license via nullable FK. `pass_template_data` JSONB for PassKit payload without schema coupling. |
| `wallet_passes` | Service | Yes | Thin PassKit reference. `unique(pass_id, provider)` allows one record per provider. PassKit is authoritative. |
| `verification_tokens` | Service / Nurse (read + revoke) | Yes | Stores SHA-256 hash of raw token. Raw token never persisted. Explicit `status` enum for mutually exclusive lifecycle states. Nurse INSERT removed — all creation via service-role API route with payment/entitlement gate. |
| `verifiers` | Service only | Yes | Merges `pass_recipients` + `review_sessions`. `unique(token_id)` enforces one verifier record per token. Service-role only — verifier email not exposed to nurses. Nurse history via `get_verification_history()`. |
| `verification_events` | Service only | Yes | Per-session events. Append-only. Service-role only — no nurse direct SELECT. Nurse-facing summary available via `get_verification_history()`. |
| `stripe_customers` | Service / Nurse (read) | Yes | 1:1 with profiles. Individual billing. Stripe authoritative. |
| `stripe_subscriptions` | Service / Nurse (read) | Yes | Current plan state. Null `plan_name` = Free per application rule. All Stripe status values modeled. `license_entitlement_count` per DECISION-0010. |
| `purchases` | Service / Nurse (read) | Yes | Single paid-action table for share, refresh, PDF, additional license. `amount_cents = 0` for entitlement-covered actions. `metadata` carries PDF storage path for pdf_export rows. |
| `refresh_events` | Service / Nurse (read) | Yes | Append-only refresh audit trail. Tracks trigger source, status delta, API errors, and purchase linkage for paid on-demand refreshes. |
| `communication_events` | Service / Nurse (read) | Support | SMS/email log. Covers `notification_events` for MVP. `external_message_id` for delivery webhook correlation. |
| `audit_events` | Service | Support | Append-only compliance trail. Action namespace must be defined before migration (open question 1). |

**Tables not included and reason:**

| Table | Decision | Reason |
|---|---|---|
| `organizations` | Removed | B2C individual-nurse model. No org accounts in MVP. |
| `organization_members` | Removed | Dependent on `organizations`. |
| `pdf_exports` | Deferred | PDF exports modeled via `purchases` (action_type = `pdf_export`) + `metadata.storage_path`. Lean for MVP. |
| `notification_events` | Deferred | Covered by `communication_events` for MVP. |
| `jobs` | Deferred | Async job tracking deferred. Refresh and PDF generation assumed synchronous for MVP or handled at Vercel layer. |

---

## 5. Challenge Log

| # | Concern | Severity | Status | Recommendation |
|---|---|:---:|---|---|
| 1 | **Canonical naming drift (BLOCKER 1)** | High | **Resolved** | Tables renamed to match TASK-0002 vocabulary: `verification_tokens`, `verifiers`, `verification_events`. |
| 2 | **`verifier_organization` in schema (BLOCKER 2)** | High | **Resolved** | Removed. MVP collects name and email only. |
| 3 | **Verifier email nurse-readable (BLOCKER 3)** | High | **Resolved** | `verifiers` is service-role only. Nurse history via `get_verification_history()` SECURITY DEFINER function. |
| 4 | **Raw token stored in DB (BLOCKER 4)** | High | **Resolved** | `verification_tokens` stores SHA-256 hash. Raw token generated and returned server-side once; never persisted. |
| 5 | **Nurse INSERT on share tokens (BLOCKER 5)** | High | **Resolved** | Nurse INSERT policy removed. All token creation via service-role API route with payment/entitlement gate. |
| 6 | **License status fields diverge from canonical (BLOCKER 6)** | High | **Resolved** | Status fields renamed: `source_status_raw`, `source_status_display`, `normalized_status`, `status_intent`, `wallet_pass_treatment`, `status_checked_at`. Treatment values changed to intent-based. |
| 7 | **Token status not mutually exclusive (BLOCKER 7)** | Medium | **Resolved** | Explicit `status` field added to `verification_tokens` with 7-value enum. Timestamps retained for auditability. |
| 8 | **Per-action billing under-modeled (BLOCKER 8)** | Medium | **Resolved** | `purchases` table added. All paid actions (share, refresh, PDF, additional license) tracked uniformly. |
| 9 | **PDF/refresh/job tables missing (BLOCKER 9)** | Medium | **Resolved** | `refresh_events` added. PDF modeled via `purchases` + metadata. `jobs` and `notification_events` explicitly deferred. |
| 10 | **Data retention policy unresolved (BLOCKER 10)** | Medium | **Partially resolved — David decision required** | `deleted_at` added to `profiles`. Hard cascade deletes remain on most tables. Migration must not go to production until David confirms retention posture. See open question 2. |
| 11 | **`is_primary` designation RLS gap** | Medium | Open | Nurse cannot update `is_primary` via RLS. Recommend routing through service-role API. Codex decision required. |
| 12 | **`audit_events.action` free-text** | Low | Open | No enum constraint. Codex must define canonical action namespace before migration. See open question 1. |
| 13 | **RLS nested query depth** | Low | Open (accepted for MVP) | `stripe_subscriptions` policy has 2-level subquery. At MVP scale acceptable. Future: add `profile_id` to `stripe_subscriptions` for flat RLS. |
| 14 | **`email` normalization** | Low | Open (non-blocking) | Consider `citext` or lowercase normalization for verifier email lookups. Not a migration blocker. |

---

## 6. Open Questions

### Blocking Before Migration Execution

**1. `audit_events` action namespace** — Codex must define canonical action names (e.g., `license.created`, `verification_token.issued`, `refresh_event.success`) before migration. Without this, audit records are inconsistent across edge functions.

**2. Data retention and account deletion posture** — David must decide: (a) How long are verification records, purchases, and audit events retained when a nurse account is closed? (b) Is personal data anonymized on deletion? (c) Are `deleted_at` profiles ever hard-deleted, and after what period? This blocks production migration. `deleted_at` placeholder is in place; cascade delete behavior is unchanged until this is decided.

**3. Token TTL** — What is the intended expiry window for `verification_tokens.expires_at`? DECISION-0005 says "short-lived" without specifying duration. Application sets this; schema just requires it. Product/David decision.

**4. `is_primary` designation implementation path** — Should nurses designate a primary license via (a) service-role Vercel API route (recommended), (b) `primary_license_id` FK on `profiles`, or (c) narrow update policy? Codex decision required before dashboard implementation.

**5. RLS testing approach** — Manual Postman testing, SQL-based RLS test scripts, or Supabase's built-in policy testing? Codex to confirm before migration is applied.

### Non-Blocking Before MVP Build

**6. Free user — additional license purchase** — Can Free users buy additional licenses at $4.99 in MVP, or is additional license hidden for Free? Affects `purchases` table `action_type` logic. David decision.

**7. Subscription pricing** — Final Standard and Premier prices for Stripe product setup. DECISION-0010 confirms per-action prices; subscription prices listed but may need David confirmation before Stripe configuration.

**8. PDF storage path** — Where are generated PDFs stored? `purchases.metadata.storage_path` assumes Supabase Storage. Confirm the PDF generation and storage approach (PDFMonkey → Supabase Storage? Vercel temporary URL?).

**9. Scheduled refresh job approach** — Is scheduled refresh a Supabase pg_cron job, a Vercel cron route, or an external scheduler? This affects `refresh_events.triggered_by` values and potentially whether a `jobs` table is needed later.

**10. `stripe_subscriptions.plan_name` null handling** — Confirm application will treat null plan as Free tier in all entitlement checks. Document this in edge function spec to avoid entitlement bypass.

---

## 7. Self-QA Against Acceptance Criteria

### Criterion 1 — SQL is syntactically correct for Supabase/Postgres

- `gen_random_uuid()` for PKs. `pgcrypto` declared for token hash generation.
- `COMMENT ON COLUMN` outside `CREATE TABLE` bodies. ✓
- `timestamptz` throughout. ✓
- All check constraints, unique constraints, and FK references use valid Postgres syntax. ✓
- `set_updated_at()` trigger correctly uses `NEW` record. ✓
- `handle_new_user()` trigger uses `security definer` and `set search_path`. ✓
- `get_verification_history()` function is `security definer` — runs with function owner privileges, not caller privileges. ✓

**Status: PASS**

---

### Criterion 2 — Every proposed table has a clear owner and purpose

All 13 tables documented in Section 4 with owner, MVP-critical flag, and key design decision.

**Status: PASS**

---

### Criterion 3 — Every core relationship has a FK or explicit reason for avoiding one

All FKs present and accounted for. Notable decisions:
- `passes.license_id` → set null on delete (preserve pass history)
- `refresh_events.license_id` → set null on delete (preserve refresh history)
- `audit_events.actor_id` → set null on delete (null for system events)
- `communication_events` → polymorphic entity reference (no FK, consistent with v1 rationale)

**Status: PASS**

---

### Criterion 4 — Public share/review flows modeled without exposing private account data

- Raw token never stored. SHA-256 hash only.
- `verifiers` table is service-role only. Nurse clients cannot read verifier identity.
- `get_verification_history()` function returns only non-PII session summary fields.
- Token redemption validation is atomic (`UPDATE ... WHERE status = 'active' AND expires_at > now() RETURNING *`).

**Status: PASS**

---

### Criterion 5 — Stripe, PassKit, Postmark, Twilio referenced but not over-modeled

- `stripe_customers`: FK mapping only. No Stripe invoice schema.
- `stripe_subscriptions`: Current state reference. Stripe authoritative.
- `wallet_passes`: External pass ID and URL only. No PassKit template schema.
- `communication_events`: Log of sends. No provider-internal schema.
- `purchases`: PassTo billing record only. Stripe PI reference, not Stripe schema duplication.

**Status: PASS**

---

### Criterion 6 — RLS addressed table-by-table

All 13 tables have explicit policies or explicit documentation of why no user-facing policy applies (`verifiers`, `verification_events`, `audit_events` are service-role only with documented rationale).

**Status: PASS**

---

### Criterion 7 — Claude documents assumptions and unresolved questions

Section 5 (Challenge Log) — 14 items with severity and status.
Section 6 (Open Questions) — 5 blocking, 5 non-blocking.
Unresolved David decisions flagged explicitly.

**Status: PASS**

---

### Criterion 8 — Claude stays inside MVP scope or clearly labels proposed expansions

Deferred items explicitly listed in Section 4: `pdf_exports`, `notification_events`, `jobs`. All labeled as deferred with reasoning. No scope expansion without label.

**Status: PASS**

---

### Criterion 9 — Tables challenged from the candidate list are explicitly explained

`organizations`, `organization_members` removed with full rationale.
`pass_shares`, `pass_recipients`, `review_sessions`, `review_events` renamed/restructured with explicit explanation per BLOCKER 1 remediation.

**Status: PASS**

---

### Criterion 10 — New table additions are justified

`licenses` — essential, not scope expansion.
`purchases` — required by BLOCKER 8, confirmed MVP pricing.
`refresh_events` — required by BLOCKER 9, MVP billing/audit coverage.

**Status: PASS**

---

### Criterion 11 — All BLOCKER items from Codex QA are addressed

| Blocker | Status |
|---|---|
| BLOCKER 1 — Naming alignment | ✅ Resolved |
| BLOCKER 2 — verifier_organization removed | ✅ Resolved |
| BLOCKER 3 — Verifier email private | ✅ Resolved |
| BLOCKER 4 — Token hashing | ✅ Resolved |
| BLOCKER 5 — Token creation service-role only | ✅ Resolved |
| BLOCKER 6 — License status canonical fields | ✅ Resolved |
| BLOCKER 7 — Explicit token status enum | ✅ Resolved |
| BLOCKER 8 — Purchases table | ✅ Resolved |
| BLOCKER 9 — refresh_events added; others decided | ✅ Resolved |
| BLOCKER 10 — deleted_at added; David decision flagged | ⚠️ Partial — David retention decision required before migration |

**Status: PASS (with BLOCKER 10 partial pending David decision)**

---

## Claude Implementation Notes

**Files changed in this remediation:**
- `/docs/tasks/2026-05-24-claude-task-001-supabase-schema-implementation.md` — full revision (v2)

**Deviations from v1:**
- All noted in Remediation Summary at top of document.

**Deviations from Codex QA spec:**
- None. All 10 blockers addressed as specified or with documented rationale.

**Remaining items requiring Codex decision before migration:**
- Audit event action namespace (open question 1)
- `is_primary` designation path (open question 4)
- RLS testing approach (open question 5)

**Remaining items requiring David decision before migration:**
- Data retention / account deletion posture (open question 2) — **migration blocker**
- Token TTL (open question 3)

**Status:** Ready for Codex QA re-review.
Labels: `assigned: codex`, `needs: codex-review`, `status: ready-for-codex-qa`
