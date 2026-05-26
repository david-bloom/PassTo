# Codex Response — TASK-0007 Schema/RLS QA

**Task:** TASK-0007 — Codex QA Re-Review of Supabase Schema and RLS Plan  
**Reviewer:** Codex  
**Date:** 2026-05-26  
**Status:** Complete — v4 Migration SQL Authorized for Drafting  
**Reviewed Plan:** `/docs/architecture/SUPABASE_SCHEMA_RLS_PLAN.md`  

---

## Executive Decision

Codex accepts the `TASK-0006` Supabase Schema and RLS Plan as the planning baseline and resolves all 12 open decisions.

Claude is authorized to draft v4 migration SQL, but the migration must not be applied until David gives explicit migration approval.

Important correction: the schema plan still references old Supabase project `zpvbexzdiklxlvrxsvop`. The currently connected PassTo Supabase project is:

```text
wvzjfxacykgsaffskgtr
```

The v4 migration draft must target `wvzjfxacykgsaffskgtr` unless David explicitly identifies a different dev/prod project.

---

## Decision Summary

| Decision | Resolution | Status |
|---|---|---|
| OD-1 | Use `resource.verb` namespace for `audit_events.action`. | Resolved |
| OD-2 | `is_primary` is set only by service-role backend route/function. | Resolved |
| OD-3 | Use SQL-based RLS regression tests plus Supabase advisors and manual smoke tests. | Resolved |
| OD-4 | `show_qr` verifier flow is form-gated and creates a `verifiers` record. | Resolved |
| OD-5 | `pdf_qr` is out of MVP migration scope. | Resolved |
| OD-6 | Rename `passes` to `credentials`. | Resolved |
| OD-7 | Rename `stripe_subscriptions` to `subscriptions`. | Resolved |
| OD-8 | Rename `purchases` to `payments`. | Resolved |
| OD-9 | Rename `communication_events` to `notification_events`. | Resolved |
| OD-10 | Add `stripe_events` table for webhook idempotency. | Resolved |
| OD-11 | Scope nurse `profiles` UPDATE to safe self-service fields only. | Resolved |
| OD-12 | Add `license_status_mappings` as an MVP reference table. | Resolved |

---

## OD-1 — `audit_events.action` Namespace

**Resolution:** Use `resource.verb` format.

Examples:

```text
profile.created
profile.updated
identity.started
identity.verified
identity.failed
phone.code_sent
phone.verified
license.lookup_started
license.lookup_succeeded
license.lookup_failed
license.status_changed
license.primary_set
data_match.passed
data_match.failed
credential.issued
credential.refreshed
credential.revoked
wallet_pass.created
wallet_pass.updated
verification_token.created
verification_token.used
verification_token.revoked
verification.viewed
payment.checkout_started
payment.succeeded
payment.failed
subscription.created
subscription.updated
subscription.cancelled
stripe_event.received
stripe_event.processed
pdf_export.requested
pdf_export.generated
pdf_export.failed
notification.sent
notification.failed
admin.intervention
```

**Migration instruction:** Add a CHECK constraint enforcing shape, not an exhaustive enum:

```sql
action text not null check (action ~ '^[a-z_]+\.[a-z_]+$')
```

Reason: the namespace format should be enforced without requiring a schema migration every time a new backend action is added.

---

## OD-2 — `is_primary` Designation

**Resolution:** `licenses.is_primary` may only be changed by service-role backend logic.

Use the existing partial unique index pattern:

```sql
create unique index idx_licenses_one_primary_per_profile
  on public.licenses(profile_id)
  where is_primary = true;
```

**Implementation instruction:** Add a Supabase Edge Function, tentatively `license-set-primary`, or include this capability inside the license management Edge Function. The function must:

1. Authenticate the nurse.
2. Confirm the license belongs to the nurse.
3. In one transaction, unset any existing primary license for that profile.
4. Set the requested license as primary.
5. Write an `audit_events` record with `action = 'license.primary_set'`.

No direct nurse UPDATE policy may allow changing `licenses.is_primary`.

---

## OD-3 — RLS Testing Approach

**Resolution:** Use a three-part RLS validation approach before migration approval.

1. **SQL-based regression tests:** Create a repeatable SQL test script that uses controlled test users/claims to verify allow/deny behavior for each table. This should be committed as documentation or a test artifact before migration approval.
2. **Supabase advisors:** Run Supabase database/security advisors after the migration is drafted and before David approval.
3. **Manual smoke tests:** Verify the highest-risk paths through the app/API: nurse own-data read, cross-nurse denial, token creation denial from client, verifier token validation through backend, and service-role-only writes.

**Minimum test cases:**

- Nurse can SELECT own profile.
- Nurse cannot SELECT another nurse profile.
- Nurse can update only approved self-service profile fields.
- Nurse cannot update `id_verification_status`, `id_verification_level`, `id_me_subject`, `onboarding_step`, `account_status`, or `deleted_at`.
- Nurse can SELECT own licenses, credentials, wallet pass status, payments, subscriptions, PDF exports, refresh events, and notification events.
- Nurse cannot INSERT verification tokens directly.
- Nurse cannot write `audit_events`, `stripe_events`, `verification_events`, or `verifiers`.
- Anonymous users cannot browse credential tables.
- Verifier access only works through backend token validation.

---

## OD-4 — `show_qr` Verifier Behavior

**Resolution:** `show_qr` is form-gated in MVP.

A scanned show-QR token must route the verifier through the same minimal verifier capture pattern as share links:

```text
verifier_name
verifier_email
```

The backend must create a `verifiers` record and a `verification_events` record for both `share_link` and `show_qr` token use.

**Rationale:** PassTo's trust value depends on auditable verification history. Allowing `show_qr` scans without a verifier record creates an avoidable audit gap and complicates schema semantics.

**Schema instruction:** Keep `verifiers.token_id` unique/not-null if that is the v3 design, or preferably use `verification_events.verification_token_id` as the event link and `verification_events.verifier_id` as the verifier link. Either way, MVP behavior must create a verifier record for `show_qr` scans.

---

## OD-5 — PDF QR Token Type

**Resolution:** `pdf_qr` is out of MVP migration scope.

Do not include `pdf_qr` in the v4 `verification_tokens.token_type` constraint.

MVP token types are:

```text
share_link
show_qr
```

PDF export remains in MVP as a static PDF record stored in Supabase Storage, controlled by authenticated nurse access or short-lived signed URLs. If a QR code inside exported PDFs becomes required later, it should be added through a separate approved task and migration.

---

## OD-6 — `passes` to `credentials`

**Resolution:** Accept canonical rename.

The v4 migration must use:

```text
credentials
```

Do not use `passes` for the core credential record. Reserve `wallet_passes` for Apple/Google/PassKit provider records.

---

## OD-7 — `stripe_subscriptions` to `subscriptions`

**Resolution:** Accept canonical rename.

The v4 migration must use:

```text
subscriptions
```

Retain `stripe_customers` as a provider-mapping table. `subscriptions` is PassTo product state even when Stripe is the MVP provider.

---

## OD-8 — `purchases` to `payments`

**Resolution:** Accept canonical rename.

The v4 migration must use:

```text
payments
```

Retain the v3 paid-action design, including action type, amount, Stripe IDs, related entity fields, retention behavior, and `ON DELETE RESTRICT` where required.

---

## OD-9 — `communication_events` to `notification_events`

**Resolution:** Accept canonical rename.

The v4 migration must use:

```text
notification_events
```

Retain the v3 design fields for channel, provider, direction, status, external message ID, metadata, and error detail where present.

---

## OD-10 — Add `stripe_events`

**Resolution:** Add `stripe_events` to v4 migration.

Minimum table design:

```sql
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
```

**RLS instruction:** Enable RLS. No anon/authenticated policies. Service-role only.

**Webhook instruction:** `stripe-webhook` must insert or check `stripe_events.stripe_event_id` before writing `payments` or `subscriptions`. Duplicate Stripe events must not create duplicate business records.

---

## OD-11 — Nurse UPDATE Scope on `profiles`

**Resolution:** Do not allow broad nurse row updates.

Nurse self-service updates may cover only these fields for MVP:

```text
first_name
last_name
phone
```

Optional if present in the v4 profile schema:

```text
display_name
preferred_name
notification_preferences
```

Nurses must not directly update:

```text
auth_user_id
email
id_verification_status
id_verification_level
id_me_subject
onboarding_step
account_status
subscription_tier
deleted_at
created_at
updated_at
```

**Migration instruction:** Do not rely only on a normal RLS UPDATE policy for full-row `profiles` updates. Use one of these patterns:

1. Preferred: expose a SECURITY DEFINER RPC such as `update_own_profile_basic(...)` that updates only allowed columns, and do not grant generic client UPDATE on `profiles`.
2. Acceptable: use RLS `WITH CHECK` plus a trigger that rejects changes to privileged columns unless performed by service role.

Codex preference is option 1 for clarity and least surprise.

---

## OD-12 — `license_status_mappings`

**Resolution:** Add `license_status_mappings` as an MVP reference table.

**Rationale:** Status mapping is a product rule, not just code plumbing. Keeping it in a table makes the mapping auditable, reviewable, and updateable without redeploying Edge Function code every time a source status changes.

Minimum table design:

```sql
create table public.license_status_mappings (
  id                            uuid        primary key default gen_random_uuid(),
  source_type                   text        not null,
  source_name                   text        not null,
  raw_status                    text        not null,
  source_status_display          text,
  normalized_status             text        not null check (normalized_status in ('Active', 'Inactive', 'Expired', 'Surrendered', 'Revoked', 'Suspended', 'Unknown')),
  status_intent                 text        not null check (status_intent in ('credential_valid', 'credential_caution', 'credential_invalid', 'verification_failure')),
  wallet_pass_treatment          text        not null check (wallet_pass_treatment in ('valid', 'caution', 'invalid', 'do_not_issue')),
  credential_issuance_allowed    boolean     not null default false,
  requires_alert                boolean     not null default false,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (source_type, source_name, raw_status)
);
```

**RLS instruction:** Enable RLS. Authenticated users may read only if the app truly needs direct client display. Default recommendation: no client policies; Edge Functions read via service role and return safe normalized status to Lovable.

---

## Additional Required Correction — Supabase Project Ref

`SUPABASE_SCHEMA_RLS_PLAN.md` references:

```text
zpvbexzdiklxlvrxsvop
```

The currently connected PassTo Supabase project is:

```text
wvzjfxacykgsaffskgtr
```

Claude must update v4 migration notes and any task references to use `wvzjfxacykgsaffskgtr`, unless David explicitly says the old project ref is the intended migration target.

---

## v4 Migration SQL Authorization

Codex authorizes Claude to draft v4 migration SQL with the decisions above.

This authorization is for drafting only.

Do not apply the migration to Supabase until:

1. Claude writes v4 migration SQL.
2. Codex reviews v4 SQL.
3. RLS test plan is attached or referenced.
4. David explicitly approves migration execution.

---

## TASK-0007 Acceptance Criteria Result

| Acceptance Criteria | Result |
|---|---|
| All 12 open decisions resolved or escalated to David with a clear recommendation | Passed |
| Final naming decisions confirmed for all renamed/added tables | Passed |
| `audit_events.action` canonical namespace defined | Passed |
| `profiles` nurse UPDATE column scope defined | Passed |
| `stripe_events` table design confirmed or rejected with rationale | Passed |
| RLS testing approach confirmed | Passed |
| show_qr verifier form behavior confirmed | Passed |
| PDF QR token type decision confirmed | Passed — out of MVP |
| Codex produces a written QA response document or updates the schema plan with decisions | Passed |
| If all decisions resolved: Codex authorizes Claude to write v4 migration SQL | Passed |

---

## Final Status

```text
TASK-0007: Complete
v4 migration SQL: Authorized for drafting
migration execution: Not approved
```
