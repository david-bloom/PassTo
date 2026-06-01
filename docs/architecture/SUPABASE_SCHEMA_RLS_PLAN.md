# PassTo Supabase Schema and RLS Plan

**Status:** Historical Planning Baseline — TASK-0006 Codex Approved; Superseded by v4 Migration SQL  
**Owner:** Claude  
**Created:** 2026-05-26  
**Related Task:** TASK-0006  
**Source:** Claude Task 001-R remediation artifact, DECISION-0011, Naming Conventions, Responsibility Map  

---

## Purpose

This document was the consolidated Supabase Schema and RLS Plan for PassTo MVP planning.

It reconciles the v3 remediation artifact (Claude Task 001-R) with canonical naming conventions, defines the RLS model per table, lists required Edge Functions, and states all remaining decisions that must be resolved before a migration is applied.

**This document does not approve migration execution and is no longer the implementation source of truth.**

Current implementation references:

- `/docs/architecture/V4_MIGRATION_SQL.md`
- Live Supabase schema for `wvzjfxacykgsaffskgtr`
- Current task specs and Codex QA notes

Migration requires:
1. Codex QA re-review of this plan
2. Resolution of all open decisions listed below
3. David explicit migration approval

---

## Schema Version History

| Version | File | Status |
|---|---|---|
| v1 (spike) | `supabase/supabase_schema_v1.sql` | Superseded — 10 Codex QA blockers found |
| v2 | `docs/tasks/2026-05-24-claude-task-001-supabase-schema-implementation.md` | Superseded by v3 |
| v3 (remediation) | `docs/tasks/2026-05-24-claude-task-001-supabase-schema-remediation.md` | Current source — all 10 blockers resolved, 5 open questions remain |
| This plan | `docs/architecture/SUPABASE_SCHEMA_RLS_PLAN.md` | Consolidated plan — pending Codex QA |

The v3 remediation artifact is the SQL source. This document reconciles it with canonical naming and defines Edge Functions and service-role operations.

---

## Authorized MVP Table Set

14 tables authorized for MVP. All from v3 remediation, with naming decisions applied below.

| # | v3 Name | Canonical Name | Decision | MVP-Critical |
|---|---|---|---|---|
| 1 | `profiles` | `profiles` | Match — no change | Yes |
| 2 | `licenses` | `licenses` | Match — no change | Yes |
| 3 | `passes` | `credentials` | **DECISION REQUIRED** — see Naming Decision 1 | Yes |
| 4 | `wallet_passes` | `wallet_passes` | Match — no change | Yes |
| 5 | `verification_tokens` | `verification_tokens` | Match — no change | Yes |
| 6 | `verifiers` | `verifiers` | Match — no change | Yes |
| 7 | `verification_events` | `verification_events` | Match — no change | Yes |
| 8 | `stripe_customers` | *(not in canonical list)* | Accept as supporting table | Yes |
| 9 | `stripe_subscriptions` | `subscriptions` | **DECISION REQUIRED** — see Naming Decision 2 | Yes |
| 10 | `purchases` | `payments` | **DECISION REQUIRED** — see Naming Decision 3 | Yes |
| 11 | `pdf_exports` | `pdf_exports` | Match — no change | Yes |
| 12 | `refresh_events` | `refresh_events` | Match — no change | Yes |
| 13 | `communication_events` | `notification_events` | **DECISION REQUIRED** — see Naming Decision 4 | Yes |
| 14 | `audit_events` | `audit_events` | Match — no change | Yes |
| — | *(missing)* | `stripe_events` | **GAP** — see Naming Decision 5 | Yes |

---

## Naming Decisions

These four naming divergences between the v3 artifact and canonical naming must be resolved before a final migration SQL is written.

---

### Naming Decision 1 — `passes` vs `credentials`

**v3 name:** `passes`  
**Canonical name:** `credentials`  
**Canonical definition:** "PassTo credential record derived from a nurse/license. Owns credential state, display eligibility, current-as-of timestamps."

**Analysis:**  
The v3 `passes` table IS the PassTo credential record — it holds credential state, links profile to license, and drives wallet pass content. The canonical naming calls this `credentials`. The term "passes" could be confused with wallet passes (`wallet_passes`). Using `credentials` is cleaner and matches every flow doc and PRD reference.

**Recommendation:** Rename `passes` → `credentials` in the migration SQL.

**Impact:** All FKs referencing `passes.id` (in `wallet_passes`, `verification_tokens`, `pdf_exports`) update to `credentials.id`. No product behavior changes.

**Decision required from:** Codex (naming authority). David if Codex escalates.

---

### Naming Decision 2 — `stripe_subscriptions` vs `subscriptions`

**v3 name:** `stripe_subscriptions`  
**Canonical name:** `subscriptions`

**Analysis:**  
The canonical naming convention uses `subscriptions` (not vendor-prefixed). The v3 uses `stripe_subscriptions` because it stores Stripe-specific fields. However, PassTo has only one payment provider (Stripe) for MVP — there is no ambiguity. Vendor-prefixing a core product table is inconsistent with canonical conventions.

The v3 also includes `stripe_customers` (no canonical equivalent). Accept `stripe_customers` as a necessary Stripe-mapping table. But `stripe_subscriptions` should align with canonical `subscriptions`.

**Recommendation:** Rename `stripe_subscriptions` → `subscriptions` in the migration SQL. Retain `stripe_customers` as-is (it's a thin Stripe-mapping table, not a core product concept).

**Impact:** FK on `stripe_customers` → `subscriptions`. No product behavior changes.

**Decision required from:** Codex.

---

### Naming Decision 3 — `purchases` vs `payments`

**v3 name:** `purchases`  
**Canonical name:** `payments`

**Analysis:**  
The canonical naming uses `payments` for "Stripe payment or paid action records." The v3 uses `purchases` because it was designed as a generic paid-action table covering share_token, refresh, pdf_export, additional_license. The canonical `payments` concept is the same thing.

The v3 `purchases` is actually better-designed than a simple `payments` log — it has `action_type`, `related_entity_type`, and `ON DELETE RESTRICT` for 7-year retention. But the name should align with canonical conventions.

**Recommendation:** Rename `purchases` → `payments` in the migration SQL. Retain all v3 column design (action_type, amount_cents, ON DELETE RESTRICT, etc.).

**Impact:** All FKs referencing `purchases.id` (in `pdf_exports`, `refresh_events`) update to `payments.id`. No product behavior changes.

**Decision required from:** Codex.

---

### Naming Decision 4 — `communication_events` vs `notification_events`

**v3 name:** `communication_events`  
**Canonical name:** `notification_events`

**Analysis:**  
The canonical naming uses `notification_events` for "outbound notification send attempts." The v3 uses `communication_events` because it covers both SMS (Twilio) and email (Postmark) and includes both outbound and potential inbound. However, for MVP, this table is primarily an outbound notification log. The canonical `notification_events` is the correct name.

The `communication_events` design (channel, provider, direction, status, external_message_id) is solid and should be kept — just renamed.

**Recommendation:** Rename `communication_events` → `notification_events` in the migration SQL.

**Impact:** Naming only. No FK changes (table has no direct FKs from other tables).

**Decision required from:** Codex.

---

### Naming Decision 5 — Missing `stripe_events` table

**Status:** GAP — in canonical naming, missing from v3

**Canonical definition:** "Stores raw or normalized Stripe webhook processing records. Used for idempotency and auditability."

**Analysis:**  
The v1 schema included a `stripe_events` table. The v3 remediation dropped it, presumably because the `purchases` table handles the business-logic side of Stripe events. However, Stripe webhook idempotency requires a separate event-log table — `purchases` represents business outcomes, not raw webhook events.

Without `stripe_events`, there is no idempotency layer for Stripe webhooks. A duplicate webhook could create duplicate payment records.

**Recommendation:** Add `stripe_events` to the migration SQL with at minimum:
```sql
create table public.stripe_events (
  id                uuid        primary key default gen_random_uuid(),
  stripe_event_id   text        not null unique,
  event_type        text        not null,
  processed         boolean     not null default false,
  processed_at      timestamptz,
  payload           jsonb       not null,
  created_at        timestamptz not null default now()
);
-- Service-role only. No user-facing RLS policies.
```

**Decision required from:** Codex to confirm design. David if scope addition requires approval.

---

## RLS Model Per Table

All tables have RLS enabled. Model below reflects v3 design with naming decisions applied.

| Table | Nurse Policy | Anonymous Policy | Service Role | Notes |
|---|---|---|---|---|
| `profiles` | SELECT + UPDATE own row | None | Trigger creates on signup | No DELETE policy — soft delete via `deleted_at` |
| `licenses` | SELECT own (via profile_id) | None | Writes all license data | Propelus lookup route writes |
| `credentials` *(was passes)* | SELECT own (via profile_id) | None | Writes all credential data | Pass issuance and refresh routes write |
| `wallet_passes` | SELECT own (via credentials FK) | None | PassKit webhook writes | `unique(credential_id, provider)` |
| `verification_tokens` | SELECT own + UPDATE (revoke only) | None | Token creation route | No nurse INSERT — service role creates after entitlement check |
| `verifiers` | **None** — service role only | None | Verifier form route | Nurse history via `get_verification_history()` SECURITY DEFINER |
| `verification_events` | **None** — service role only | None | Verifier session route | Append-only |
| `stripe_customers` | SELECT own (via profile_id) | None | Stripe checkout route | 1:1 with profiles |
| `subscriptions` *(was stripe_subscriptions)* | SELECT own (via stripe_customers FK) | None | Stripe webhook route | Null plan_name = Free tier |
| `payments` *(was purchases)* | SELECT own (via profile_id) | None | Payment and entitlement routes | `ON DELETE RESTRICT` — 7-year retention |
| `pdf_exports` | SELECT own (metadata only) | None | PDF generation route | PDF file access via Supabase Storage signed URL |
| `refresh_events` | SELECT own (via profile_id) | None | Refresh route | Append-only |
| `notification_events` *(was communication_events)* | SELECT own (via profile_id) | None | Twilio / Postmark routes | `profile_id` SET NULL on delete |
| `audit_events` | **None** — service role only | None | All routes and webhooks | `actor_id` SET NULL on delete. Append-only |
| `stripe_events` *(to add)* | **None** — service role only | None | Stripe webhook route | Idempotency table — no user policies |

### Key RLS Decisions

1. **Verifier access is NOT via RLS.** Verifiers have no Supabase auth session. Token validation runs service-role via Edge Function or Vercel route. Supabase RLS does not cover the `/v/{token}` verifier flow.

2. **Token creation is service-role only.** Nurses can read and revoke their own tokens but cannot INSERT. All token creation routes through a backend that validates payment and entitlement.

3. **Nurse verification history** is served by the `get_verification_history()` SECURITY DEFINER function, which returns token-level summaries without exposing verifier name or email.

4. **`profiles` UPDATE policy** must not allow a nurse to directly set privileged fields (e.g., `id_verification_status`, `onboarding_step`). These must be set by service-role only. The nurse UPDATE policy should be restricted to safe fields (e.g., `first_name`, `last_name`, `phone`). This is a gap in the v3 RLS draft — the update policy allows full row update. **Codex must define allowed-column scope for nurse UPDATE on profiles before migration.**

---

## Service-Role-Only Operations

The following must never be client-insertable or client-updatable. All must run through Supabase Edge Functions or approved Vercel API routes.

1. Create license record (Propelus lookup result)
2. Update license status fields (`source_status_raw`, `normalized_status`, `wallet_pass_treatment`, etc.)
3. Set `is_primary` on a license
4. Create credential/pass record
5. Update credential status
6. Create or update wallet_pass record (PassKit webhook)
7. Create verification_token (requires entitlement + payment check)
8. Create verifier record
9. Create verification_event record
10. Create or update stripe_customer record
11. Create or update subscription record (Stripe webhook)
12. Create payment record (post-payment confirmation)
13. Create pdf_export record
14. Create refresh_event record
15. Create stripe_event record (webhook idempotency)
16. Write audit_events (all backend routes)
17. Update `profiles.id_verification_status`, `profiles.onboarding_step` (privileged profile fields)

---

## Required Edge Functions

Derived from the Responsibility Map (`LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`). Supabase preferred unless a concrete reason requires Vercel.

| Edge Function | Trigger | Tables Touched | Service Role Required |
|---|---|---|---|
| `idme-callback` | ID.me redirect after nurse auth | `profiles`, `audit_events` | Yes |
| `twilio-send-code` | Nurse phone verification start | `notification_events` | Yes |
| `twilio-verify-code` | Nurse phone verification confirm | `profiles`, `audit_events` | Yes |
| `propelus-lookup` | Nurse license lookup form submit | `licenses`, `refresh_events`, `audit_events` | Yes |
| `data-match` | Post-lookup identity/license match | `profiles`, `licenses`, `audit_events` | Yes |
| `credential-issue` | Post-match credential issuance | `credentials`, `audit_events` | Yes |
| `wallet-pass-create` | Credential issuance | `wallet_passes` | Yes — PassKit signing may route to Vercel |
| `wallet-pass-update` | Credential refresh | `wallet_passes`, `refresh_events` | Yes — PassKit signing may route to Vercel |
| `token-create-share` | Nurse requests share link | `verification_tokens`, `payments` | Yes |
| `token-create-qr` | Nurse requests show-QR | `verification_tokens`, `payments` | Yes |
| `token-validate` | Verifier opens share link or QR | `verification_tokens`, `verifiers`, `verification_events`, `audit_events` | Yes |
| `stripe-checkout` | Nurse initiates payment | `stripe_customers`, `payments` | Yes |
| `stripe-webhook` | Stripe sends event | `stripe_events`, `payments`, `subscriptions`, `audit_events` | Yes |
| `refresh-scheduled` | Scheduled daily license refresh | `licenses`, `credentials`, `wallet_passes`, `refresh_events`, `notification_events` | Yes |
| `pdf-generate` | Nurse requests PDF export | `pdf_exports`, `payments` | Yes — PDFMonkey may route to Vercel |
| `notification-send` | License expiry / status change alert | `notification_events` | Yes |

**Vercel routes (not Edge Functions):**  
The following are assigned to Vercel per the Responsibility Map (pending Open Decisions 1–4):

- `sign-apple` — Apple Wallet pass signing (existing Vercel route in `api/sign-apple.js`)
- `sign-google` — Google Wallet JWT signing (existing Vercel route in `api/sign-google.js`)
- `idme-callback` — May move to Vercel if Edge Function implementation is not preferred (Open Decision 2)

---

## Deferred Tables

Explicitly deferred from MVP. Requires David approval to re-scope into MVP.

| Table | Reason for Deferral |
|---|---|
| `jobs` | Async job tracking deferred. Refresh and PDF generation assumed synchronous or Vercel-managed for MVP per v3 rationale. |
| `organizations` | MVP is B2C individual-nurse only. No org accounts in MVP. |
| `organization_members` | Dependent on `organizations`. |
| `notification_events` *(as separate from `notification_events` above)* | The v3 `communication_events` is being renamed to `notification_events`. No separate table needed. |
| `license_status_mappings` | In canonical naming and data model. Not in v3. Recommend adding as a reference table for normalized_status lookup. See Open Decision 9 below. |

---

## Open Decisions Blocking Migration Approval

All of the following must be resolved before final migration SQL is written and applied.

### From v3 Remediation (Codex decisions)

**OD-1 — `audit_events.action` canonical namespace**  
Free-text `action` column has no constraint. Without a canonical format, audit records will be inconsistent across Edge Functions. v3 suggests `resource.verb` format (e.g., `license.refreshed`).  
**Owner:** Codex to define namespace. David to approve if it affects product language.

**OD-2 — `is_primary` designation implementation path**  
Three options: (a) service-role Vercel/Edge API route (recommended), (b) `primary_license_id` FK on `profiles`, (c) narrow nurse UPDATE policy on `licenses.is_primary`. Partial unique index is in place for DB enforcement.  
**Owner:** Codex recommendation. David to confirm if it affects product UX.

**OD-3 — RLS testing approach**  
Manual Postman tests, SQL-based RLS test scripts, or Supabase built-in policy testing? Must be confirmed before migration is applied.  
**Owner:** Codex.

**OD-4 — `verifiers` record behavior for `show_qr` tokens**  
Does a `show_qr` token produce a `verifiers` record when scanned? If show_qr has no form gate, `verifiers.token_id unique not null` would prevent null verifier records — requiring a schema change.  
**Owner:** Codex to define show_qr form behavior. David to confirm product intent.

**OD-5 — PDF QR token type**  
DECISION-0011 left this unresolved. If PDF QR tokens are confirmed for MVP, a third `token_type` value (`pdf_qr`) is needed with its own TTL.  
**Owner:** David to decide if PDF QR is in MVP scope. Codex to implement if confirmed.

### From Naming Reconciliation (this plan)

**OD-6 — `passes` → `credentials` rename**  
Accept canonical `credentials` name or document a justified deviation.  
**Owner:** Codex to confirm. Recommendation: rename to `credentials`.

**OD-7 — `stripe_subscriptions` → `subscriptions` rename**  
Accept canonical `subscriptions` or retain vendor-prefixed name.  
**Owner:** Codex to confirm. Recommendation: rename to `subscriptions`.

**OD-8 — `purchases` → `payments` rename**  
Accept canonical `payments` or retain `purchases`.  
**Owner:** Codex to confirm. Recommendation: rename to `payments`.

**OD-9 — `communication_events` → `notification_events` rename**  
Accept canonical `notification_events` or retain `communication_events`.  
**Owner:** Codex to confirm. Recommendation: rename to `notification_events`.

**OD-10 — `stripe_events` table addition**  
Add idempotency table for Stripe webhooks, or document why `payments` table is sufficient for idempotency.  
**Owner:** Codex to confirm. Recommendation: add `stripe_events`.

**OD-11 — Nurse UPDATE policy on `profiles` must be column-scoped**  
v3 allows full row UPDATE by nurse. Privileged fields (`id_verification_status`, `onboarding_step`, `id_me_subject`) must be service-role-only. Codex must define the allowed column list for nurse UPDATE before migration.  
**Owner:** Codex.

**OD-12 — `license_status_mappings` table**  
In canonical naming and data model. Not in v3. This table maps raw source status strings to normalized status. Without it, the status translation logic lives only in Edge Function code. Should it be a DB reference table?  
**Owner:** Codex recommendation. David to approve if adding to MVP scope.

---

## Migration Approval Checklist

Before any Supabase migration is applied:

- [ ] Codex QA re-review of this plan
- [ ] All 12 open decisions above resolved (OD-1 through OD-12)
- [ ] Final migration SQL written (v4) incorporating naming decisions and additions
- [ ] RLS test plan confirmed (OD-3)
- [ ] David explicit migration approval
- [ ] Supabase project confirmed: `zpvbexzdiklxlvrxsvop`
- [ ] Rollback plan documented

---

## Key Security Invariants

These must be preserved in the final migration SQL and all Edge Functions.

1. Raw verification tokens are never stored. Only SHA-256 hash in `token_hash`.
2. Verifier name and email are never readable by nurse clients. Service-role only.
3. Token creation requires service-role. No nurse INSERT on `verification_tokens`.
4. Payment-gated actions (share token, QR, refresh, PDF) are server-controlled. No client bypass.
5. Stripe webhooks require idempotency. Duplicate events must not create duplicate payment records.
6. `profiles.deleted_at` soft-delete only. Hard delete blocked by `ON DELETE RESTRICT` on `payments.profile_id` and `pdf_exports.profile_id` for 7-year retention.
7. `audit_events` is append-only. No UPDATE or DELETE policy.
8. Verifier access on `/v/{token}` is not covered by RLS — token validation runs service-role via Edge Function.

---

## Related Docs

```text
/docs/tasks/2026-05-24-claude-task-001-supabase-schema-remediation.md — v3 source SQL
/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md — 10 blockers (all resolved in v3)
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md — approved product decisions
/docs/architecture/NAMING_CONVENTIONS.md
/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md
/docs/architecture/DATA_MODEL.md
/docs/architecture/SECURITY_MODEL.md
/docs/tasks/TASK-0006.md
```
