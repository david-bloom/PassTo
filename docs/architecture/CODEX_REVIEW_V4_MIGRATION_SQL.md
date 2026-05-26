# Codex Review - PassTo v4 Migration SQL

**Reviewer:** Codex  
**Review date:** 2026-05-26  
**Reviewed file:** `docs/architecture/V4_MIGRATION_SQL.md`  
**Cross-check artifact:** `docs/architecture/V4_MIGRATION_VERIFICATION.md`  
**Supabase project:** `wvzjfxacykgsaffskgtr` (PassTo Dev)  
**Review posture:** technical approver review before TASK-0016

## Final Verdict

**CHANGES REQUIRED**

The migration is close, and most canonical v4 decisions are represented. I am not approving TASK-0016 on this artifact as-is because there are approval-blocking mismatches between the base SQL, the stated checklist, and the R1/R2 verification report.

Primary blockers:

1. `verification_tokens` nurse revoke policy permits broader row updates than intended.
2. `subscriptions.profile_id` uses `ON DELETE CASCADE`, despite the checklist requiring `ON DELETE RESTRICT` for financial records.
3. `license_status_mappings` seed/status model in the SQL does not match the requested 8 normalized groups including `pending`.
4. The reviewed SQL artifact is stale relative to R1/R2 for function search path and FK indexes.

## 1. Schema Correctness - FAIL

**Passes:**

- The 15 expected tables are listed in `V4_MIGRATION_SQL.md` lines 16-34: `profiles`, `licenses`, `credentials`, `wallet_passes`, `verification_tokens`, `verifiers`, `verification_events`, `subscriptions`, `payments`, `stripe_events`, `notification_events`, `pdf_exports`, `audit_events`, `license_lookups`, `license_status_mappings`.
- `stripe_customers` is absent by design. `stripe_customer_id` is stored on `profiles` per lines 36 and 170-171.
- `payments.profile_id` uses `ON DELETE RESTRICT` at lines 522-523.
- `pdf_exports.profile_id` uses `ON DELETE RESTRICT` at lines 664-665.

**Issues:**

- `subscriptions.profile_id` uses `ON DELETE CASCADE`, not `ON DELETE RESTRICT` (`V4_MIGRATION_SQL.md` lines 476-477). The checklist explicitly classifies subscriptions as financial records that require restrict semantics.
- `audit_events.actor_id` uses `ON DELETE SET NULL`, not `ON DELETE RESTRICT` (`V4_MIGRATION_SQL.md` lines 710-711). This preserves audit rows, but it does not satisfy the literal checklist requirement.
- Several profile-owned compliance records still cascade from `profiles`, including `licenses`, `credentials`, `verification_tokens`, `verifiers`, `verification_events`, and `license_lookups` (examples: lines 222-223, 289-290, 337-338, 384-385, 425-426, 755-756). That may be acceptable if hard deletes are administratively blocked for seven years, but it is not fully enforced at the FK layer.

**Required change:**

- New Supabase migration required if the design requirement remains `ON DELETE RESTRICT` for `subscriptions` and/or audit-linked records.
- At minimum, document why `audit_events.actor_id ON DELETE SET NULL` is accepted as retention-safe if the team does not want restrict semantics there.

## 2. RLS Policy Logic - FAIL

**Passes:**

- Nurses can SELECT only own rows on nurse-readable tables using `auth_profile_id()` or direct `auth.uid()` checks. Examples: `profiles` lines 1028-1032, `licenses` lines 1040-1044, `credentials` lines 1051-1055, `subscriptions` lines 1106-1110, `payments` lines 1119-1123, `license_lookups` lines 1162-1166.
- `profiles` has no direct nurse UPDATE policy. The document routes nurse updates through `update_own_profile_basic()` only (lines 1022-1025 and function lines 884-927).
- The five service-role-only tables have RLS enabled and zero client policies by design: `audit_events`, `license_status_mappings`, `stripe_events`, `verification_events`, `verifiers` (lines 1010-1017 and no policies under their sections).
- I did not find a SELECT policy that intentionally permits cross-nurse access.

**Blocking issue:**

- `verification_tokens` revoke policy is too broad (`V4_MIGRATION_SQL.md` lines 1080-1095). It uses:

```sql
for update
to authenticated
using (profile_id = public.auth_profile_id() and status = 'active')
with check (status = 'revoked')
```

This ensures the final row has `status = 'revoked'`, but it does not prevent the nurse from changing other columns in the same UPDATE, such as `token_hash`, `credential_id`, `token_type`, `expires_at`, `used_at`, or `profile_id` if the final `status` is revoked. That fails the checklist requirement: "no other update permitted."

**Required change:**

- New Supabase migration required.
- Recommended fix: drop the direct authenticated UPDATE policy and replace nurse revocation with a narrow `SECURITY DEFINER` RPC such as `revoke_own_verification_token(p_token_id uuid)`, updating only `status`, `revoked_at`, and `updated_at` after checking ownership and active status.
- Alternative: keep the policy but add a defensive trigger that rejects authenticated updates where any column except the allowed revoke fields changes. The RPC approach is cleaner.

## 3. Constraint Enforcement - PASS

- `audit_events.action` enforces `resource.verb` format with `CHECK (action ~ '^[a-z_]+\.[a-z_]+$')` at lines 710-714. This is stricter than the checklist's unanchored example and is acceptable.
- `verification_tokens.token_type` allows only `share_link` and `show_qr`; `pdf_qr` is excluded at lines 339-340.
- `stripe_events.stripe_event_id` is `UNIQUE` at lines 573-576.
- `idx_licenses_one_primary_per_profile` is a partial unique index with `WHERE is_primary = true` at lines 260-263.

## 4. SECURITY DEFINER Functions - PASS WITH ARTIFACT CORRECTION

**Passes:**

- `auth_profile_id()` is `STABLE`, `SECURITY DEFINER`, and has `SET search_path = public` (lines 118-125). It is used throughout RLS policies.
- `update_own_profile_basic()` has `SECURITY DEFINER` and `SET search_path = public` (lines 884-927). It updates only safe nurse-editable fields and does not expose `id_verification_status`, `onboarding_step`, `account_status`, `subscription_tier`, `stripe_customer_id`, `deleted_at`, or identity fields.
- `get_verification_history(uuid)` has `SECURITY DEFINER` and `SET search_path = public` (lines 936-986). It checks that `p_profile_id` belongs to `auth.uid()` before returning rows.
- `handle_new_user()` has `SECURITY DEFINER` and `SET search_path = public` (lines 850-863). It only inserts `profiles(auth_user_id, email)` from `auth.users` and returns `new`.

**Artifact issue:**

- `set_updated_at()` is not a `SECURITY DEFINER` function, but the base SQL defines it without `SET search_path = public` at lines 100-107. The verification report says R1 remediated this. The canonical SQL artifact should include the R1 version to avoid future reapplication of the stale function.

**Required change:**

- Documentation correction required: fold R1's `set_updated_at()` fix into the canonical SQL artifact, or clearly mark `V4_MIGRATION_SQL.md` as pre-remediation and link the final applied migration chain.

## 5. Index Coverage - FAIL FOR SQL ARTIFACT / PASS AFTER R1 PER VERIFICATION

**Passes in the base SQL:**

- Most FK columns have covering indexes.
- `idx_licenses_one_primary_per_profile` is correctly partial unique (`WHERE is_primary = true`) at lines 260-263.

**Issues in the reviewed SQL artifact:**

The base SQL does not define covering indexes for these FK columns:

- `verification_tokens.credential_id` (`V4_MIGRATION_SQL.md` lines 337-338)
- `pdf_exports.credential_id` (`V4_MIGRATION_SQL.md` lines 666-667)
- `pdf_exports.payment_id` (`V4_MIGRATION_SQL.md` lines 667-668)
- `license_lookups.payment_id` (`V4_MIGRATION_SQL.md` lines 773-774)

`V4_MIGRATION_VERIFICATION.md` lines 120-126 says R1 added all four indexes. I accept that as evidence that the live schema may be remediated, but the SQL file under review remains stale.

**Required change:**

- Documentation correction required if R1 is confirmed live: update the canonical SQL artifact to include the four R1 FK indexes.
- New Supabase migration required only if the live DB does not actually contain these indexes.

## 6. Seed Data - FAIL

**Issue:**

The checklist requires `license_status_mappings` to have 37 rows across 8 normalized status groups:

`active`, `expired`, `inactive`, `pending`, `suspended`, `revoked`, `surrendered`, `unknown`

The base SQL instead defines normalized statuses as seven Title Case values only (`V4_MIGRATION_SQL.md` lines 806-810):

`Active`, `Inactive`, `Expired`, `Surrendered`, `Revoked`, `Suspended`, `Unknown`

There is no allowed `Pending` normalized status in the CHECK constraint. The seed maps raw `Pending` to `Unknown` near the end of the seed block. The SQL appears to insert 37 rows, but across 7 normalized groups, not the requested 8.

`V4_MIGRATION_VERIFICATION.md` lines 87-100 reports 37 rows across 8 lowercase groups including `pending`. That does not match the base SQL artifact. Either R1/R2 changed the live schema/data in a way not reflected in `V4_MIGRATION_SQL.md`, or the verification report is inaccurate.

**Required change:**

- If the product requirement is truly 8 normalized groups including `pending`, a new Supabase migration is required to add `pending`/`Pending` to the CHECK constraints and update seed mappings accordingly.
- If the intended design is 7 groups with raw pending mapped to unknown, then no DB migration is required, but the checklist and verification report require documentation correction.

## Required Changes Before TASK-0016

1. **Harden token revocation.**  
   Requires new Supabase migration unless already fixed outside the reviewed artifacts. Drop or replace the broad authenticated UPDATE policy on `verification_tokens`.

2. **Resolve financial/audit retention semantics.**  
   Requires new Supabase migration if `subscriptions` must be `ON DELETE RESTRICT`. Document or revise `audit_events.actor_id ON DELETE SET NULL` against the checklist.

3. **Reconcile `license_status_mappings`.**  
   Requires either a new Supabase migration for an 8-group model including `pending`, or a doc/checklist correction accepting the 7-group model.

4. **Make the canonical SQL artifact match the live applied schema.**  
   Documentation correction required. Fold R1/R2 into `V4_MIGRATION_SQL.md` or create a separate final-applied SQL artifact and mark the current file as pre-remediation.

5. **Confirm R1 indexes exist live.**  
   Documentation correction only if R1 indexes are live. New Supabase migration if any of the four FK indexes are missing.

## Approval Decision

**CHANGES REQUIRED**

I would not approve TASK-0016 solely on the current `V4_MIGRATION_SQL.md`. The schema is directionally solid, but the revoke policy and retention/seed mismatches should be resolved before Lovable projects rely on this database for real enrollment, credential, wallet, payment, or verifier flows.
