# Codex QA Review — V4 Migration SQL and Verification

**Reviewer:** Codex  
**Date:** 2026-05-26  
**Reviewed Artifacts:**  
- `docs/architecture/V4_MIGRATION_SQL.md`  
- `docs/architecture/V4_MIGRATION_VERIFICATION.md`  
- `docs/architecture/CODEX_RESPONSE_TASK_0007_SCHEMA_QA.md`  
- Approved consolidated PRD  

**QA Result:** Changes Required  
**Migration / Lovable Cutover Approval:** Not Approved by Codex  
**Current Status:** Superseded by David direct approval with Claude — see `docs/activity_log/DECISION-0016-V4-MIGRATION-DIRECT-APPROVAL.md`  

---

## Status Note

This Codex QA review remains a risk record. It is not deleted or rewritten.

After this review, David approved the v4 migration directly with Claude. That direct approval is recorded in:

```text
docs/activity_log/DECISION-0016-V4-MIGRATION-DIRECT-APPROVAL.md
```

Future work should treat the migration as approved by David/Claude, while preserving the findings below as accepted risks or future cleanup items.

---

## Executive Summary

Codex does not approve the v4 migration artifacts for downstream Lovable cutover yet.

The schema direction is broadly aligned with the approved PRD and TASK-0007, but the reviewed artifacts have material inconsistencies and at least two real data/security risks:

1. `V4_MIGRATION_SQL.md` is no longer the final applied SQL because the verification report references remediation migrations R1/R2 that are not folded back into the main SQL artifact.
2. The verification report's `license_status_mappings` counts/status groups do not match the SQL seed data.
3. The current `verification_tokens` UPDATE policy allows a nurse to mutate more than just revoke fields while revoking a token.
4. The schema still permits hard-delete cascades that can erase verification/credential/license history, despite the approved 7-year retention rule.
5. `show_qr` remains included in the migration despite the approved PRD marking Show QR deferred from launch-critical MVP; this needs either a documented exception or removal from launch schema.

---

## Findings

### P1 — Final SQL artifact does not include remediation migrations R1/R2

**Files:** `docs/architecture/V4_MIGRATION_SQL.md`, `docs/architecture/V4_MIGRATION_VERIFICATION.md`

`V4_MIGRATION_SQL.md` still shows the original draft SQL. It defines `set_updated_at()` without `SET search_path = public`, uses the pre-remediation `profiles` RLS form in the SQL body, and does not include the additional FK indexes or function privilege revokes described in the verification report.

The verification report says R1 and R2 were applied and fixed these issues, but the canonical SQL artifact still contains the pre-remediation SQL.

**Risk:** A future dev/prod migration copied from `V4_MIGRATION_SQL.md` would reintroduce already-fixed advisor warnings and may not match the verified database.

**Required remediation:** Update `V4_MIGRATION_SQL.md` to be the full final v4 SQL, including R1 and R2 changes inline, or create a clearly named final artifact such as `V4_MIGRATION_SQL_FINAL.md` that includes the base migration plus remediation SQL in order.

---

### P1 — Verification token revoke policy allows overbroad row mutation

**File:** `docs/architecture/V4_MIGRATION_SQL.md`

The policy:

```sql
create policy "nurse_revoke_own_verification_token"
  on public.verification_tokens
  for update
  to authenticated
  using (
    profile_id = public.auth_profile_id()
    and status = 'active'
  )
  with check (status = 'revoked');
```

This restricts the final row status to `revoked`, but it does not restrict which columns can be changed in the same UPDATE. A nurse with access to an active token row could potentially update `token_hash`, `token_type`, `credential_id`, `expires_at`, `used_at`, `profile_id`, or other fields while setting `status = 'revoked'`.

**Risk:** Client-side mutation of token metadata undermines token auditability and data integrity.

**Required remediation:** Remove direct UPDATE policy and replace with a SECURITY DEFINER RPC such as `revoke_own_verification_token(token_id uuid)` that updates only `status = 'revoked'`, `revoked_at = now()`, and `updated_at = now()` after confirming ownership and current active status. Alternatively, add a trigger that rejects all nurse-token updates except the approved revoke fields, but the RPC pattern is cleaner.

---

### P1 — Hard-delete cascades can violate 7-year retention

**File:** `docs/architecture/V4_MIGRATION_SQL.md`

The approved retention rule requires operational, audit, payment, and verification records to be retained for 7 years. The schema comments say hard deletion should not occur inside that window, but the database still allows destructive cascade paths if service-role/admin deletes an auth user or profile.

Examples:

- `profiles.auth_user_id references auth.users(id) on delete cascade`
- `licenses.profile_id references profiles(id) on delete cascade`
- `credentials.profile_id references profiles(id) on delete cascade`
- `verification_tokens.profile_id references profiles(id) on delete cascade`
- `verifiers.token_id references verification_tokens(id) on delete cascade`
- `verification_events.verifier_id references verifiers(id) on delete cascade`

**Risk:** Deleting an auth user/profile can erase license, credential, token, verifier, and verification-event history, contrary to approved retention requirements. Relying only on app discipline is fragile for a regulated/trust product.

**Required remediation:** Add database-level protection for pre-retention hard deletes. At minimum, replace cascade behavior on retention-sensitive tables with `ON DELETE RESTRICT` or `ON DELETE SET NULL` where feasible, and/or add a trigger that blocks hard deletion of `profiles` when retained records exist. Keep `deleted_at` as the only normal account closure path.

---

### P2 — Verification report seed-data summary does not match SQL

**Files:** `docs/architecture/V4_MIGRATION_SQL.md`, `docs/architecture/V4_MIGRATION_VERIFICATION.md`

The verification report says `license_status_mappings` has 37 rows across these groups:

```text
active = 7
expired = 5
inactive = 5
pending = 5
suspended = 4
revoked = 4
surrendered = 4
unknown = 3
```

But the SQL seed data uses title-case normalized statuses constrained to:

```text
Active, Inactive, Expired, Surrendered, Revoked, Suspended, Unknown
```

There is no `Pending` normalized status in the SQL constraint. The raw `Pending` row maps to `Unknown`. Also, the SQL appears to include 6 Active mappings, 5 caution mappings normalized as `Suspended`, and 3 additional suspended mappings, which does not match the report's stated counts.

**Risk:** The verification report is not a reliable cross-check for status mapping correctness. Status mapping is credential-issuance logic, so incorrect certification here matters.

**Required remediation:** Re-run and correct the seed-data verification from actual SQL results. Report the exact counts using the same case and enum values as the schema. Confirm all expected raw statuses are present and mapped correctly.

---

### P2 — `show_qr` remains in schema despite PRD deferral

**Files:** `docs/architecture/V4_MIGRATION_SQL.md`, `docs/prd/PASS_TO_PRD.md`

The approved PRD says Show QR is deferred from launch-critical MVP. The v4 SQL allows:

```sql
token_type in ('share_link', 'show_qr')
```

TASK-0007 originally allowed `show_qr`, but the later approved PRD made Show QR deferred. Including `show_qr` in the schema may be acceptable as future-supporting structure, but the artifact should explicitly state that no launch implementation may create or expose `show_qr` tokens.

**Risk:** Implementation tasks may treat Show QR as launch-ready because the database supports it.

**Required remediation:** Either remove `show_qr` from the launch migration or document it as dormant/deferred schema support and add an implementation guard: no launch Edge Function/UI may create `show_qr` tokens unless David reopens scope.

---

### P2 — `stripe_customers` removal conflicts with TASK-0007 instruction

**Files:** `docs/architecture/V4_MIGRATION_SQL.md`, `docs/architecture/CODEX_RESPONSE_TASK_0007_SCHEMA_QA.md`

TASK-0007 explicitly said to retain `stripe_customers` as a provider-mapping table while renaming `stripe_subscriptions` to `subscriptions`. v4 instead drops `stripe_customers` and moves `stripe_customer_id` onto `profiles` and `subscriptions`.

This may be a reasonable simplification, but it is a deviation from the Codex-approved TASK-0007 decision and needs explicit approval or rationale.

**Risk:** Provider mapping gets embedded into core profile state earlier than approved, and future customer/subscription edge cases may be harder to model.

**Required remediation:** Either restore `stripe_customers` or add an explicit architecture decision documenting why v4 intentionally deviates from TASK-0007 and why the simplified `profiles.stripe_customer_id` pattern is accepted.

---

### P3 — `set_updated_at()` in the SQL artifact lacks final search_path hygiene

**File:** `docs/architecture/V4_MIGRATION_SQL.md`

The base SQL defines:

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
```

The verification report says R1 fixed this with `SET search_path = public`, but that correction is not reflected in the main SQL artifact.

This is covered by P1, but called out separately because it is one of the exact security hygiene items Codex was asked to verify.

**Required remediation:** Fold R1 into the final SQL artifact.

---

## Verification Report Cross-Check

Codex does not accept `V4_MIGRATION_VERIFICATION.md` as fully reliable until the mismatches above are corrected.

Accepted portions:

- Table list matches the intended 15-table design.
- RLS enabled on all 15 tables is directionally correct.
- `pdf_qr` exclusion is correct.
- `stripe_events.stripe_event_id` uniqueness is correct.
- Partial unique index for `licenses.is_primary` is correct.
- Service-role-only tables with zero client policies are directionally correct.

Not accepted yet:

- Verification report seed-data counts.
- Verification report's implicit claim that the SQL artifact is final.
- Verification report's acceptance of `verification_tokens` revoke UPDATE policy.
- Verification report's acceptance of hard-delete/cascade retention posture.

---

## Required Remediation Checklist

Before Codex can approve downstream Lovable cutover or build tasks against this schema:

- [ ] Publish final v4 SQL artifact that includes base migration plus R1/R2 remediation in one canonical place.
- [ ] Replace `verification_tokens` direct revoke UPDATE policy with a narrow revoke RPC or equivalent column-change guard.
- [ ] Add database-level protection against retention-violating hard deletes/cascades, or document a stricter enforceable deletion model and update FKs/triggers accordingly.
- [ ] Correct `license_status_mappings` verification counts and normalized status labels.
- [ ] Resolve/document the `show_qr` schema-vs-PRD deferral mismatch.
- [ ] Resolve/document the `stripe_customers` removal deviation from TASK-0007.
- [ ] Re-run verification after remediation and update `V4_MIGRATION_VERIFICATION.md`.

---

## QA Decision

```text
V4 migration SQL: Changes Required
V4 verification report: Changes Required
Lovable cutover to canonical Supabase: Not Approved by Codex
Next implementation tasks depending on this schema: Blocked by Codex QA, superseded only by David direct approval
```

Recommended next task:

```text
TASK-0016A — Remediate Codex QA Findings for V4 Migration Schema/RLS
```

After remediation, Claude should submit the updated final SQL and verification report for Codex re-review.
