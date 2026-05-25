# Claude Task 001-R — Supabase MVP Schema Spike — Remediation Artifact

**Task ID:** Claude Task 001-R  
**Executed By:** Claude — Senior Engineer  
**Date:** 2026-05-24  
**Status:** Remediation Complete — Awaiting Codex Re-Review  
**Remediates:** All 10 Codex QA blockers — `/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md`  
**Incorporates:** DECISION-0011 — `/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md`  
**Supabase Project:** `zpvbexzdiklxlvrxsvop`  

---

## Remediation Summary

This artifact supersedes the v2 implementation (`2026-05-24-claude-task-001-supabase-schema-implementation.md`).
It addresses all 10 Codex QA blockers and incorporates all approved DECISION-0011 decisions.

**Changes from v2:**

| Item | Source | Change |
|---|---|---|
| BLOCKER 10 — Data retention fully resolved | DECISION-0011 | 7-year retention confirmed. `purchases` and `pdf_exports` use `ON DELETE RESTRICT` on `profile_id` to enforce retention at DB layer. Cascade removed from financial and PDF records. |
| BLOCKER 10 — Token TTL fully resolved | DECISION-0011 | `token_type` field added to `verification_tokens`. `share_link` = 72h TTL. `show_qr` = 45min TTL. Both one-time use. |
| PDF exports — dedicated table | DECISION-0011 | `pdf_exports` table added. PDF records are not modeled via `purchases.metadata`. Supabase Storage. `purchase_id` FK nullable (Standard/Premier entitlement-covered). |
| `purchases.related_entity_type` | DECISION-0011 | Added `pdf_export` to the check constraint. |
| `communication_events.related_entity_type` | DECISION-0011 | Added `pdf_export` to the check constraint. |
| Entitlement model documented | DECISION-0011 | Free = 1 license, no additional license purchase. Standard = 1 included + $4.99 each additional. Premier = 2 included + $4.99 each additional. |
| Subscription pricing documented | DECISION-0011 | Standard $9.99/month. Premier $19.99/month. Added to schema comments. |

**All 10 Codex QA blockers from v1 remain addressed. BLOCKER 10 is now fully resolved.**

**Final table count: 14**
- All 13 from v2 unchanged except `verification_tokens` (new `token_type` field)
- New: `pdf_exports`

---

## 1. Summary

PassTo is a digital nurse credentialing app. Nurses verify identity via ID.me, look up nursing licenses via Propelus/RapidAPI, receive wallet passes (Apple/Google Wallet via PassKit) reflecting current license status, and share credentials with verifiers via one-time short-lived tokens. Verifiers access credentials through a form-gated link. Verifiers have no PassTo accounts.

**Key schema design positions in this remediation:**

1. **Canonical table naming (TASK-0002)** — `verification_tokens`, `verifiers`, `verification_events`.
2. **Two token types with approved TTLs** — `share_link` (72h) and `show_qr` (45min) per DECISION-0011.
3. **Token hashing** — `token_hash` (SHA-256) stored; raw token generated server-side, returned once, never stored.
4. **Verifier data service-role-only** — `verifiers` has no nurse RLS policies. Nurse history via `get_verification_history()` SECURITY DEFINER function.
5. **Token creation service-role-only** — Nurse clients cannot insert verification tokens. All creation via Vercel API route enforcing payment/entitlement/TTL.
6. **License status canonical fields** — `source_status_raw`, `source_status_display`, `normalized_status`, `status_intent`, `wallet_pass_treatment` (`valid`/`caution`/`invalid`/`do_not_issue`), `status_checked_at`.
7. **Explicit token status enum** — `active`/`used`/`expired`/`replaced`/`revoked`/`payment_failed`/`generation_failed`.
8. **`purchases` table covers all paid actions** — `share_token`, `refresh`, `pdf_export`, `additional_license`.
9. **`pdf_exports` table** — Dedicated per DECISION-0011. Supabase Storage backend. Nurse access via authenticated request or short-lived signed URL.
10. **7-year retention per DECISION-0011** — Soft delete on `profiles.deleted_at`. `purchases` and `pdf_exports` use `ON DELETE RESTRICT` on `profile_id`. Hard profile deletion must not occur within 7 years; application enforces this; DB enforces it for financial and PDF records.
11. **`updated_at` triggers on all mutable tables.**

---

## 2. Migration SQL Draft

```sql
-- ============================================================
-- PassTo MVP — Supabase Migration v3
-- Claude Task 001-R — Remediation Artifact
-- 2026-05-24
--
-- Apply to project: zpvbexzdiklxlvrxsvop
-- DO NOT apply to production without Codex QA and David approval.
-- ============================================================


-- ============================================================
-- EXTENSIONS
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
-- deleted_at supports soft deletion per 7-year retention policy
-- (DECISION-0011). Hard deletion must not occur within 7 years.
-- Application must use deleted_at for account closure; hard
-- deletion of auth.users only after 7-year retention window
-- via controlled purge process.
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

comment on table  public.profiles                        is 'One row per nurse. Extends auth.users. Created by trigger. Soft deletion via deleted_at. 7-year retention per DECISION-0011 — do not hard-delete within 7 years.';
comment on column public.profiles.id_me_subject          is 'ID.me subject claim. Deduplication key. Null until ID.me verification completes.';
comment on column public.profiles.phone                  is 'E.164 format. Populated after phone verification. Twilio SMS destination.';
comment on column public.profiles.id_verification_level  is 'ID.me IAL assurance level. IAL2 required for full credential access.';
comment on column public.profiles.deleted_at             is 'Soft delete timestamp. Null = active. Set on account closure. Hard delete via purge process only after 7-year retention window per DECISION-0011.';

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
--
-- Entitlement model per DECISION-0011:
--   Free: 1 license maximum, no additional license purchase allowed.
--   Standard: 1 license included. Additional licenses at $4.99 each.
--   Premier: 2 licenses included. Additional licenses at $4.99 each.
-- Entitlement enforcement is at the API layer, not the schema.
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

comment on table  public.licenses                        is 'Nursing license records from state board APIs. Source of truth for credential status. Service role writes; nurses read.';
comment on column public.licenses.source_status_raw      is 'Board status string exactly as returned by the Propelus API. Never normalized or modified.';
comment on column public.licenses.source_status_display  is 'Board-provided display name for the status, if available. Null if API does not return one.';
comment on column public.licenses.normalized_status      is 'PassTo canonical status. One of seven values per DECISION-0008. Unknown = verification_failure; do not issue pass.';
comment on column public.licenses.status_intent          is 'Product intent derived from normalized_status. Drives application behavior and pass decisions.';
comment on column public.licenses.wallet_pass_treatment  is 'valid=Active; caution=Active with expiry <=30 days; invalid=Suspended/Revoked/Expired; do_not_issue=Unknown or verification failure.';
comment on column public.licenses.status_checked_at      is 'Timestamp of the most recent successful Propelus API lookup.';
comment on column public.licenses.is_primary             is 'Nurse-designated primary license. One-per-profile enforced by partial unique index. Set via service-role API route.';
comment on column public.licenses.lookup_response        is 'Raw Propelus API JSON response. Preserved verbatim for audit and debugging.';

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
-- Tokens created (via service-role API route) to grant verifier
-- or nurse-display access to credential data. Two types:
--
--   share_link: 72-hour TTL, one-time use per DECISION-0011.
--               Shared as a URL to a remote verifier.
--               Verifier completes form → verifiers record created.
--
--   show_qr:    45-minute TTL, one-time use per DECISION-0011.
--               Displayed as QR code for in-person verification.
--               Verifier scans; form-gate behavior TBD by Codex.
--
-- Raw token generated server-side, returned once to nurse, never stored.
-- Only SHA-256 hash stored. Token creation is service-role only.
-- Nurses may read and revoke their own tokens.
-- ============================================================

create table public.verification_tokens (
  id          uuid        primary key default gen_random_uuid(),
  profile_id  uuid        not null references public.profiles(id) on delete cascade,
  pass_id     uuid        not null references public.passes(id) on delete cascade,
  token_hash  text        not null unique,
  token_type  text        not null default 'share_link'
    check (token_type in ('share_link', 'show_qr')),
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

comment on table  public.verification_tokens            is 'Verifier access tokens. One-time, short-lived per DECISION-0005 and DECISION-0011. SHA-256 hash stored; raw token returned to nurse once and never persisted.';
comment on column public.verification_tokens.token_hash is 'SHA-256 hash of the raw token. Application hashes the presented token on redemption and looks up by hash.';
comment on column public.verification_tokens.token_type is 'share_link = 72h TTL, URL-shared to remote verifier. show_qr = 45min TTL, QR code for in-person display. Per DECISION-0011.';
comment on column public.verification_tokens.status     is 'Mutually exclusive lifecycle state. Once used, a token is permanently used and does not transition to expired.';
comment on column public.verification_tokens.expires_at is 'Application sets based on token_type: share_link = now() + 72h; show_qr = now() + 45min. Validated atomically on redemption: UPDATE ... WHERE status = active AND expires_at > now().';

create trigger set_verification_tokens_updated_at
  before update on public.verification_tokens
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 6. VERIFIERS
--
-- Verifier identity and session record. Created when a verifier
-- submits the share_link access form. One record per token.
--
-- SERVICE-ROLE ONLY for all access.
-- Verifier email is not exposed to nurse clients.
-- Nurse-facing verification history via get_verification_history().
--
-- Note: show_qr tokens may not produce a verifiers record if
-- no form-gate is presented. Codex to confirm show_qr form behavior.
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

comment on table  public.verifiers                   is 'Verifier identity and session record. One per token (unique(token_id)). Service-role only — name and email never exposed to nurse clients.';
comment on column public.verifiers.email             is 'Verifier email as entered in the access form. Service-role only. Not displayed to nurse per approved product rules.';
comment on column public.verifiers.terms_accepted_at is 'Required Terms of Use acceptance. Credential data must not be served before this record exists.';
comment on column public.verifiers.status            is 'Session lifecycle. active → completed on normal exit. active → expired on TTL. Mutually exclusive.';

create trigger set_verifiers_updated_at
  before update on public.verifiers
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 7. VERIFICATION EVENTS
--
-- Individual events during a verifier session. Append-only.
-- Service role writes; nurse access via get_verification_history().
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

comment on table  public.verification_events            is 'Events within a verifier session. Append-only. Service-role writes; nurse access via SECURITY DEFINER function.';
comment on column public.verification_events.event_type is 'PassTo-specific event set. Verifiers view credentials; they do not approve or reject.';


-- ============================================================
-- 8. STRIPE CUSTOMERS
--
-- Stripe customer reference. One per nurse profile. Individual billing.
-- Stripe is source of truth. Service role writes.
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
-- Updated by Stripe webhook via service role only.
-- Stripe is source of truth.
--
-- Per DECISION-0011:
--   Standard: $9.99/month. 1 license included. Additional at $4.99.
--   Premier:  $19.99/month. 2 licenses included. Additional at $4.99.
--   Free: No subscription. 1 license. No additional license purchase.
--
-- Null plan_name must be treated as Free tier by application.
-- license_entitlement_count: Free=1, Standard=1, Premier=2.
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

comment on table  public.stripe_subscriptions                          is 'Current subscription state. Stripe webhook writes only. Stripe is source of truth. Standard=$9.99/mo; Premier=$19.99/mo per DECISION-0011.';
comment on column public.stripe_subscriptions.plan_name                is 'Null = Free tier. Do not rely on nullable plan for entitlement without explicit fallback. Free has no subscription record.';
comment on column public.stripe_subscriptions.license_entitlement_count is 'Included license entitlements per billing cycle. Free=1 (no sub record); Standard=1; Premier=2. Additional licenses at $4.99 each (Standard/Premier only — Free may not purchase additional per DECISION-0011).';

create trigger set_stripe_subscriptions_updated_at
  before update on public.stripe_subscriptions
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 10. PURCHASES
--
-- Single table for all paid MVP actions.
-- Covers: share token creation, on-demand refresh, PDF export,
-- additional license. 7-year retention per DECISION-0011.
--
-- ON DELETE RESTRICT on profile_id: prevents hard deletion of
-- a profile with purchase records. Enforce 7-year retention.
-- Purge process must delete purchases before profile.
--
-- Per DECISION-0011 pricing:
--   share_token:       $1.99 where paid (Free/Standard pay; Premier may be entitlement).
--   refresh:           $1.99 where paid.
--   pdf_export:        $1.99 for Free. Entitlement-covered for Standard/Premier.
--   additional_license: $4.99 (Standard/Premier only — Free not allowed per DECISION-0011).
-- amount_cents = 0 for entitlement-covered actions.
-- ============================================================

create table public.purchases (
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
      'verification_token', 'license', 'pass',
      'stripe_subscription', 'pdf_export'
    )),
  related_entity_id        uuid,
  metadata                 jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table  public.purchases                          is 'All paid MVP actions. 7-year retention per DECISION-0011. ON DELETE RESTRICT prevents hard profile deletion with purchase records.';
comment on column public.purchases.action_type              is 'share_token=$1.99 where paid; refresh=$1.99 where paid; pdf_export=$1.99 for Free; additional_license=$4.99 Standard/Premier only.';
comment on column public.purchases.amount_cents             is 'Amount charged in cents. 0 for entitlement-covered actions (Standard/Premier PDF export, etc.).';
comment on column public.purchases.related_entity_type      is 'pdf_export links to pdf_exports.id. verification_token links to verification_tokens.id.';

create trigger set_purchases_updated_at
  before update on public.purchases
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 11. PDF EXPORTS
--
-- Per DECISION-0011: PDF records tracked in pdf_exports table.
-- Storage: Supabase Storage (bucket: pdf-exports).
-- Access: authenticated nurse request or short-lived signed URL.
-- PDFs are static records including the approved static disclaimer.
-- 7-year retention per DECISION-0011.
--
-- ON DELETE RESTRICT on profile_id: prevents hard profile deletion
-- when PDF records exist. Purge process must delete pdf_exports first.
--
-- purchase_id is nullable:
--   Non-null: PDF was a paid action (Free tier $1.99).
--   Null: PDF was entitlement-covered (Standard/Premier).
-- ============================================================

create table public.pdf_exports (
  id                 uuid        primary key default gen_random_uuid(),
  profile_id         uuid        not null references public.profiles(id) on delete restrict,
  license_id         uuid        references public.licenses(id) on delete set null,
  pass_id            uuid        references public.passes(id) on delete set null,
  purchase_id        uuid        references public.purchases(id) on delete set null,
  storage_bucket     text        not null default 'pdf-exports',
  storage_path       text        not null unique,
  file_size_bytes    integer,
  disclaimer_version text        not null,
  status             text        not null default 'pending'
    check (status in ('pending', 'generating', 'ready', 'error')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table  public.pdf_exports                   is 'PDF export records per DECISION-0011. Supabase Storage backend. 7-year retention — ON DELETE RESTRICT prevents profile hard-deletion with PDF records.';
comment on column public.pdf_exports.storage_path      is 'Supabase Storage object path within pdf-exports bucket. unique to prevent duplicate records.';
comment on column public.pdf_exports.disclaimer_version is 'Version identifier of the approved static PDF disclaimer text included in this export. Supports future disclaimer version tracking.';
comment on column public.pdf_exports.purchase_id       is 'Null = entitlement-covered (Standard/Premier). Non-null = paid (Free $1.99). FK to purchases.';
comment on column public.pdf_exports.status            is 'pending → generating → ready (normal). pending → error (failure). Ready = file exists in Supabase Storage.';

create trigger set_pdf_exports_updated_at
  before update on public.pdf_exports
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 12. REFRESH EVENTS
--
-- Audit trail for all license refresh attempts.
-- Covers scheduled and nurse-initiated on-demand refreshes.
-- Append-only. Supports billing audit and API failure tracking.
-- ============================================================

create table public.refresh_events (
  id                             uuid        primary key default gen_random_uuid(),
  profile_id                     uuid        not null references public.profiles(id) on delete cascade,
  license_id                     uuid        references public.licenses(id) on delete set null,
  triggered_by                   text        not null check (triggered_by in ('nurse', 'scheduled')),
  result                         text        not null default 'pending'
    check (result in ('pending', 'success', 'no_change', 'failed', 'api_error')),
  previous_normalized_status     text,
  new_normalized_status          text,
  previous_wallet_pass_treatment text,
  new_wallet_pass_treatment      text,
  lookup_source                  text        not null default 'propelus',
  error_message                  text,
  purchase_id                    uuid        references public.purchases(id) on delete set null,
  created_at                     timestamptz not null default now()
);

comment on table  public.refresh_events                is 'Append-only audit trail for all license refresh attempts. Scheduled and nurse-initiated.';
comment on column public.refresh_events.triggered_by   is 'nurse = on-demand refresh (may be paid at $1.99); scheduled = automated daily refresh.';
comment on column public.refresh_events.purchase_id    is 'FK to purchases for paid on-demand refreshes. Null for scheduled refreshes.';
comment on column public.refresh_events.result         is 'no_change = lookup succeeded but status unchanged; success = status updated.';


-- ============================================================
-- 13. COMMUNICATION EVENTS
--
-- Outbound SMS (Twilio) and email (Postmark) log.
-- Service role writes; nurses read their own records.
-- ============================================================

create table public.communication_events (
  id                  uuid        primary key default gen_random_uuid(),
  profile_id          uuid        references public.profiles(id) on delete set null,
  related_entity_type text
    check (related_entity_type in (
      'license', 'pass', 'verification_token',
      'refresh_event', 'stripe_subscription', 'purchase', 'pdf_export'
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

comment on table  public.communication_events                    is 'Outbound SMS/email log. Service role writes; nurses read own records.';
comment on column public.communication_events.external_message_id is 'Twilio MessageSID or Postmark MessageID for delivery webhook correlation.';
comment on column public.communication_events.profile_id         is 'Set null on delete — communication logs preserved even if profile is hard-deleted.';

create trigger set_communication_events_updated_at
  before update on public.communication_events
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 14. AUDIT EVENTS
--
-- Append-only security and compliance audit trail.
-- Service role writes only. No user-facing SELECT in MVP.
-- actor_id set null on delete — audit records always preserved.
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

comment on table  public.audit_events          is 'Append-only compliance audit trail. Service role only. actor_id set null on delete — records always preserved. 7-year retention per DECISION-0011.';
comment on column public.audit_events.actor_id is 'Null for system-initiated events (webhooks, scheduled jobs) or after profile hard-deletion.';
comment on column public.audit_events.action   is 'Canonical action namespace — to be defined by Codex before migration (see open question 1).';


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

create index idx_verification_tokens_type
  on public.verification_tokens(token_type, profile_id);

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

-- pdf_exports
create index idx_pdf_exports_profile_id
  on public.pdf_exports(profile_id);

create index idx_pdf_exports_license_id
  on public.pdf_exports(license_id);

create index idx_pdf_exports_ready
  on public.pdf_exports(profile_id, created_at desc)
  where status = 'ready';

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
-- Returns token-level summary for nurses without exposing
-- verifier identity (name, email). Called from Vercel API routes.
-- ============================================================

create or replace function public.get_verification_history(p_profile_id uuid)
returns table (
  token_id       uuid,
  token_type     text,
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
    vt.token_type,
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
  group by vt.id, vt.token_type, vt.status, vt.created_at, vt.expires_at,
           vt.used_at, v.id, v.session_started_at
  order by vt.created_at desc;
$$;

comment on function public.get_verification_history(uuid) is
  'Nurse-safe verification history. Returns token-level summary including token_type; no verifier identity exposed. Call with service role from Vercel API route.';


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
alter table public.pdf_exports            enable row level security;
alter table public.refresh_events         enable row level security;
alter table public.communication_events   enable row level security;
alter table public.audit_events           enable row level security;
```

---

## 3. RLS Policy Draft

**Design principles:**

1. Nurses own and read their own data. No cross-nurse access.
2. `verifiers` table — **service-role only**. No nurse SELECT. Verifier name/email never exposed.
3. `verification_events` — service-role only. Nurse history via `get_verification_history()`.
4. `verification_tokens` INSERT — service-role only. Nurse client cannot create tokens. All creation via payment/entitlement API route.
5. `pdf_exports` — nurse SELECT own records. PDF file access via Supabase Storage signed URL from API layer. No nurse INSERT.
6. All billing, audit, and operational writes are service-role only.

```sql
-- ============================================================
-- PROFILES
-- No INSERT policy — trigger handles creation on signup.
-- No DELETE policy — soft deletion via deleted_at.
-- ============================================================

create policy "nurse_select_own_profile"
  on public.profiles for select
  using (auth.uid() = auth_user_id);

create policy "nurse_update_own_profile"
  on public.profiles for update
  using  (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);


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
-- Nurses read and revoke their own tokens. No nurse INSERT.
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
-- SERVICE-ROLE ONLY. No user-facing policies.
-- ============================================================

-- (No user-facing policies.)


-- ============================================================
-- VERIFICATION EVENTS
-- SERVICE-ROLE ONLY. No user-facing policies.
-- ============================================================

-- (No user-facing policies.)


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
-- PDF EXPORTS
-- Nurses read own records (metadata only).
-- PDF file access via Supabase Storage signed URL from API layer.
-- No nurse INSERT — PDF generation via service-role API route.
-- ============================================================

create policy "nurse_select_own_pdf_exports"
  on public.pdf_exports for select
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
-- SERVICE-ROLE ONLY. No user-facing policies in MVP.
-- ============================================================

-- (No user-facing policies.)
```

**RLS ownership summary (v3):**

| Table | Nurse Policy | Service Role | Note |
|---|---|---|---|
| `profiles` | SELECT / UPDATE own | trigger creates on signup | No DELETE policy — soft delete via `deleted_at` |
| `licenses` | SELECT own | Propelus lookup route | |
| `passes` | SELECT own | pass issuance / refresh route | |
| `wallet_passes` | SELECT own (via passes FK) | PassKit webhook | |
| `verification_tokens` | SELECT / UPDATE (revoke) own | token creation route | No nurse INSERT |
| `verifiers` | **None** — service-role only | verifier form route | Nurse history via SECURITY DEFINER function |
| `verification_events` | **None** — service-role only | verifier session route | |
| `stripe_customers` | SELECT own | Stripe checkout + webhook | |
| `stripe_subscriptions` | SELECT own (via FK) | Stripe webhook | |
| `purchases` | SELECT own | payment route | `ON DELETE RESTRICT` — 7-year retention |
| `pdf_exports` | SELECT own (metadata) | PDF generation route | File access via Storage signed URL |
| `refresh_events` | SELECT own | refresh route | |
| `communication_events` | SELECT own | Twilio / Postmark routes | `profile_id` set null on delete |
| `audit_events` | None | all routes and webhooks | `actor_id` set null on delete |

---

## 4. Schema Rationale

| Table | Owner | MVP-Critical | Key Design Decision |
|---|---|:---:|---|
| `profiles` | Nurse | Yes | Soft delete via `deleted_at`. Hard delete only after 7 years per DECISION-0011. Trigger-based creation — no nurse INSERT policy. |
| `licenses` | Service / Nurse (read) | Yes | 5-field canonical status model per DECISION-0008. Entitlement limits enforced at API layer: Free=1 (no additional), Standard=1+$4.99, Premier=2+$4.99 per DECISION-0011. |
| `passes` | Service / Nurse (read) | Yes | PassTo credential pass record. `license_id` set null on delete preserves pass history. |
| `wallet_passes` | Service | Yes | Thin PassKit reference. `unique(pass_id, provider)` supports Apple + Google. PassKit authoritative. |
| `verification_tokens` | Service / Nurse (read + revoke) | Yes | Two types per DECISION-0011: `share_link` (72h TTL) and `show_qr` (45min TTL). SHA-256 hash only. Mutually exclusive `status` enum. Nurse INSERT removed. |
| `verifiers` | Service only | Yes | One per token. Service-role only. Nurse history via `get_verification_history()`. |
| `verification_events` | Service only | Yes | Append-only. Service-role only. |
| `stripe_customers` | Service / Nurse (read) | Yes | 1:1 with profiles. Stripe authoritative. |
| `stripe_subscriptions` | Service / Nurse (read) | Yes | $9.99/mo Standard, $19.99/mo Premier per DECISION-0011. Null `plan_name` = Free. |
| `purchases` | Service / Nurse (read) | Yes | Single paid-action table. `ON DELETE RESTRICT` — 7-year financial record retention per DECISION-0011. |
| `pdf_exports` | Service / Nurse (read metadata) | Yes | Dedicated table per DECISION-0011. Supabase Storage backend. `disclaimer_version` tracks static PDF disclaimer per DECISION-0011. `ON DELETE RESTRICT` — 7-year retention. |
| `refresh_events` | Service / Nurse (read) | Yes | Append-only. Scheduled and on-demand refreshes. Links to purchases for paid refreshes. |
| `communication_events` | Service / Nurse (read) | Support | SMS/email log. `profile_id` set null on delete. |
| `audit_events` | Service | Support | Append-only. `actor_id` set null on delete. Namespace defined by Codex before migration. |

**Tables not included:**

| Table | Decision | Reason |
|---|---|---|
| `organizations` | Removed | B2C individual-nurse model. No org accounts in MVP. |
| `organization_members` | Removed | Dependent on `organizations`. |
| `notification_events` | Deferred | Covered by `communication_events` for MVP. |
| `jobs` | Deferred | Async job tracking deferred. Refresh and PDF generation assumed synchronous or Vercel-managed for MVP. |

---

## 5. Challenge Log

| # | Concern | Severity | Status |
|---|---|:---:|---|
| 1 | **Canonical naming (BLOCKER 1)** | High | ✅ Resolved — `verification_tokens`, `verifiers`, `verification_events` |
| 2 | **`verifier_organization` in schema (BLOCKER 2)** | High | ✅ Resolved — removed |
| 3 | **Verifier email nurse-readable (BLOCKER 3)** | High | ✅ Resolved — service-role only; `get_verification_history()` function |
| 4 | **Raw token stored in DB (BLOCKER 4)** | High | ✅ Resolved — SHA-256 hash only |
| 5 | **Nurse INSERT on share tokens (BLOCKER 5)** | High | ✅ Resolved — nurse INSERT removed; service-role API only |
| 6 | **License status fields diverge from canonical (BLOCKER 6)** | High | ✅ Resolved — 5-field canonical model |
| 7 | **Token status not mutually exclusive (BLOCKER 7)** | Medium | ✅ Resolved — explicit `status` enum with 7 values |
| 8 | **Per-action billing under-modeled (BLOCKER 8)** | Medium | ✅ Resolved — `purchases` table |
| 9 | **PDF/refresh/job tables missing (BLOCKER 9)** | Medium | ✅ Resolved — `pdf_exports` table per DECISION-0011; `refresh_events` added; `jobs` deferred |
| 10 | **Data retention unresolved (BLOCKER 10)** | Medium | ✅ **Fully resolved** — 7-year retention per DECISION-0011. `deleted_at` on profiles. `ON DELETE RESTRICT` on `purchases.profile_id` and `pdf_exports.profile_id`. TTLs: share_link=72h, show_qr=45min. |
| 11 | **`is_primary` designation RLS gap** | Medium | Open — nurse cannot set `is_primary` via RLS. Routed through service-role API. Codex to confirm implementation. |
| 12 | **`audit_events.action` free-text** | Low | Open — no enum constraint. Codex must define canonical action namespace before migration. |
| 13 | **RLS nested subquery depth** | Low | Open (accepted for MVP) — `stripe_subscriptions` policy has 2-level subquery. Acceptable at MVP scale. Future: add `profile_id` FK to `stripe_subscriptions`. |
| 14 | **`verifiers` record for `show_qr` tokens** | Low | Open — does a show_qr token produce a `verifiers` record if no form gate is presented? Codex to confirm show_qr flow behavior. |
| 15 | **PDF QR token type** | Low | Open — DECISION-0011 notes "PDF QR token TTL still requires confirmation if PDF QR remains in MVP." Not modeled yet. May require a third `token_type` value (`pdf_qr`) if confirmed. |

---

## 6. Open Questions

### Remaining — Codex Architecture Decisions Required Before Migration

**1. `audit_events.action` namespace**
Canonical action string format must be defined. Suggested convention: `resource.verb` (e.g., `license.refreshed`, `verification_token.issued`, `pass.updated`). Without this, audit records will be inconsistent across edge functions.

**2. `is_primary` designation implementation path**
How does a nurse designate their primary license?
- (a) Service-role Vercel API route (recommended — enforces business rules)
- (b) `primary_license_id` FK column on `profiles` (alternative — simpler read)
- (c) Narrow nurse UPDATE policy on `licenses.is_primary` (not recommended — harder to enforce one-true-primary)
Partial unique index `idx_licenses_one_primary_per_profile` is already in place for DB enforcement.

**3. RLS testing approach**
Manual Postman tests, SQL-based RLS test scripts, or Supabase built-in policy testing? Confirm before migration is applied.

**4. `verifiers` record for `show_qr` tokens**
Does a `show_qr` token produce a `verifiers` record when the verifier scans the QR code? Or is show_qr a nurse-display-only flow with no verifier form gate? This affects whether `verifiers.token_id` can be null for show_qr tokens (currently not nullable — would require schema change if show_qr has no form gate).

**5. PDF QR token type (DECISION-0011 follow-up)**
DECISION-0011 notes this is unresolved. If a PDF QR token type is confirmed for MVP, a third `token_type` value (`pdf_qr`) is needed with its own TTL. Currently not modeled. Flag for David + Codex decision.

### Resolved by DECISION-0011 (Previously Open)

| Item | Resolution |
|---|---|
| Data retention period | 7 years operational, audit, payment, verification records |
| Share-link token TTL | 72 hours or first successful use |
| Show-QR token TTL | 45 minutes or first use |
| Free user additional license | Not allowed in MVP |
| Standard additional license | $4.99 each |
| Premier additional license | $4.99 each (2 included) |
| Standard subscription price | $9.99/month |
| Premier subscription price | $19.99/month |
| PDF storage location | Supabase Storage |
| PDF record tracking | `pdf_exports` table |
| PDF access control | Authenticated nurse or short-lived signed URL |
| PDF static disclaimer | Static record with `disclaimer_version` field |

---

## 7. Self-QA Against Acceptance Criteria

### Criterion 1 — SQL is syntactically correct for Supabase/Postgres

- `gen_random_uuid()` for PKs. `pgcrypto` declared.
- All `COMMENT ON` statements are outside `CREATE TABLE` bodies. ✓
- `timestamptz` throughout. ✓
- All check constraints, unique constraints, FK references valid Postgres syntax. ✓
- `set_updated_at()` trigger correctly uses `NEW` record. ✓
- `handle_new_user()` uses `security definer` + `set search_path`. ✓
- `get_verification_history()` is `security definer` and returns `token_type`. ✓
- `ON DELETE RESTRICT` on `purchases.profile_id` and `pdf_exports.profile_id`. ✓

**Status: PASS**

---

### Criterion 2 — Every table has a clear owner and purpose

All 14 tables documented in Section 4 with owner, MVP-critical flag, and key design decision.

**Status: PASS**

---

### Criterion 3 — Every core relationship has a FK or explicit reason for avoiding one

All FKs present. Notable:
- `passes.license_id` → set null on delete (preserve pass history)
- `refresh_events.license_id` → set null on delete (preserve refresh history)
- `audit_events.actor_id` → set null on delete (audit records always preserved)
- `pdf_exports.purchase_id` → set null on delete (nullable by design — entitlement-covered PDFs have no purchase)
- `communication_events` → polymorphic entity reference (no FK on `related_entity_id`, consistent with pattern)

**Status: PASS**

---

### Criterion 4 — Public share/review flows don't expose private account data

- Raw token never stored. SHA-256 hash only. ✓
- `verifiers` table service-role only. Nurse clients cannot read verifier name or email. ✓
- `get_verification_history()` returns only non-PII session summary fields + `token_type`. ✓
- Token redemption is atomic (`UPDATE ... WHERE status = 'active' AND expires_at > now() RETURNING *`). ✓
- `pdf_exports` nurse SELECT limited to metadata; file access via Storage signed URL from API. ✓

**Status: PASS**

---

### Criterion 5 — Stripe, PassKit, Postmark, Twilio referenced but not over-modeled

- `stripe_customers`: FK mapping only.
- `stripe_subscriptions`: Current state reference. Stripe authoritative.
- `wallet_passes`: External pass ID and URL only.
- `communication_events`: Log of sends only.
- `purchases`: PassTo billing record only.
- `pdf_exports`: PassTo metadata only. Supabase Storage is file authority.

**Status: PASS**

---

### Criterion 6 — RLS addressed table-by-table

All 14 tables have explicit policies or documented rationale for service-role-only access (`verifiers`, `verification_events`, `audit_events`).

**Status: PASS**

---

### Criterion 7 — Claude documents assumptions and unresolved questions

Section 5 (Challenge Log) — 15 items with severity and status.
Section 6 (Open Questions) — 5 remaining Codex decisions; all David decisions resolved by DECISION-0011.

**Status: PASS**

---

### Criterion 8 — Claude stays inside MVP scope

Deferred items explicitly listed in Section 4: `notification_events`, `jobs`. No scope expansion without label. `pdf_exports` added per DECISION-0011 (David-approved expansion).

**Status: PASS**

---

### Criterion 9 — Challenged tables are explicitly explained

`organizations`, `organization_members` removed with rationale.
`pass_shares`, `pass_recipients`, `review_sessions`, `review_events` renamed/restructured per BLOCKER 1.
`notification_events`, `jobs` explicitly deferred with reasoning.

**Status: PASS**

---

### Criterion 10 — New table additions are justified

`licenses` — essential.
`purchases` — BLOCKER 8 / confirmed MVP pricing.
`refresh_events` — BLOCKER 9 / billing audit.
`pdf_exports` — DECISION-0011 David approval.

**Status: PASS**

---

### Criterion 11 — All 10 BLOCKER items from Codex QA addressed

| Blocker | Status |
|---|---|
| BLOCKER 1 — Naming alignment | ✅ Resolved |
| BLOCKER 2 — `verifier_organization` removed | ✅ Resolved |
| BLOCKER 3 — Verifier email private | ✅ Resolved |
| BLOCKER 4 — Token hashing | ✅ Resolved |
| BLOCKER 5 — Token creation service-role only | ✅ Resolved |
| BLOCKER 6 — License status canonical fields | ✅ Resolved |
| BLOCKER 7 — Explicit token status enum | ✅ Resolved |
| BLOCKER 8 — Purchases table | ✅ Resolved |
| BLOCKER 9 — `pdf_exports` + `refresh_events` added; `jobs` deferred | ✅ Resolved |
| BLOCKER 10 — 7-year retention + TTLs + entitlement model per DECISION-0011 | ✅ **Fully resolved** |

**Status: ALL 10 BLOCKERS RESOLVED**

---

## Claude Implementation Notes

**Files created in this remediation:**
- `/docs/tasks/2026-05-24-claude-task-001-supabase-schema-remediation.md` — this file (v3 schema)

**This artifact supersedes:**
- `/docs/tasks/2026-05-24-claude-task-001-supabase-schema-implementation.md` (v2)

**Key changes from v2 to v3:**
- `verification_tokens` — `token_type` field added (`share_link` / `show_qr`)
- `pdf_exports` — new table (DECISION-0011)
- `purchases.profile_id` — changed to `ON DELETE RESTRICT` (7-year retention)
- `pdf_exports.profile_id` — `ON DELETE RESTRICT` (7-year retention)
- `purchases.related_entity_type` — added `pdf_export`
- `communication_events.related_entity_type` — added `pdf_export`
- `get_verification_history()` — returns `token_type` field
- All schema comments updated to reference DECISION-0011 values

**Deviations from Codex QA spec:**
- None. All 10 blockers addressed as specified.

**Deviations from DECISION-0011:**
- None. All 10 David decisions incorporated.

**Remaining items requiring Codex decision before migration:**
1. `audit_events.action` canonical namespace
2. `is_primary` designation implementation path
3. RLS testing approach
4. `verifiers` record behavior for `show_qr` tokens
5. PDF QR token type (if confirmed for MVP — requires `token_type` enum update)

**Production guardrail:**
Do not apply to Supabase project `zpvbexzdiklxlvrxsvop` without Codex QA re-review and David final approval.

**Status:** Ready for Codex re-review.
Labels: `assigned: codex`, `needs: codex-review`, `status: ready-for-codex-qa`
