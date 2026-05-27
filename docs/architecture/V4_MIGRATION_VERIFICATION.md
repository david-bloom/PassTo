# V4 Migration Verification Report

**Task:** TASK-0015 — Post-Migration Schema and RLS Verification  
**Target:** `wvzjfxacykgsaffskgtr` (PassTo Dev)  
**Initial Migration Applied:** `v4_passto_mvp_schema` — 2026-05-26  
**Latest Verified Migration:** `v4_passto_mvp_remediation_r4` — 2026-05-27  
**Verification Date:** 2026-05-27  
**Verified By:** Claude (TASK-0015) and Codex follow-up cleanup  
**Status:** PASSED — current documentation reflects R1/R2/R3, selfie storage, and R4  

---

## 1. Table Presence

**Expected:** 15 public product tables. **Result:** 15/15.

| # | Table | Present |
|---|---|---|
| 1 | `audit_events` | Yes |
| 2 | `credentials` | Yes |
| 3 | `license_lookups` | Yes |
| 4 | `license_status_mappings` | Yes |
| 5 | `licenses` | Yes |
| 6 | `notification_events` | Yes |
| 7 | `payments` | Yes |
| 8 | `pdf_exports` | Yes |
| 9 | `profiles` | Yes |
| 10 | `stripe_events` | Yes |
| 11 | `subscriptions` | Yes |
| 12 | `verification_events` | Yes |
| 13 | `verification_tokens` | Yes |
| 14 | `verifiers` | Yes |
| 15 | `wallet_passes` | Yes |

No unexpected public product tables. `stripe_customers` is intentionally absent; `stripe_customer_id` lives on `profiles` per the accepted MVP design.

---

## 2. RLS Enabled

RLS is enabled on all 15 public product tables.

---

## 3. Critical Constraint Checks

| Area | Expected | Result |
|---|---|---|
| `verification_tokens.token_type` | Allows `share_link`, `show_qr`; excludes `pdf_qr` | Passed |
| `audit_events.action` | Enforces `resource.verb` format | Passed |
| `stripe_events.stripe_event_id` | Unique idempotency constraint | Passed |
| `licenses.is_primary` | One primary license per profile via partial unique index | Passed |
| `license_status_mappings.normalized_status` | 8 values including `Pending` | Passed after R3 |
| `licenses.normalized_status` | 8 values including `Pending` | Passed after R4 |

---

## 4. RLS Policy Audit

Nurse-facing read/update access remains scoped to owned rows. Privileged tables remain service-role-only.

Service-role-only tables with no client policies by design:

| Table | Reason |
|---|---|
| `audit_events` | Append-only audit log. Service role writes. No nurse read. |
| `license_status_mappings` | Reference data resolved through backend functions. |
| `stripe_events` | Raw Stripe webhook payloads and idempotency. |
| `verification_events` | Written by verifier/token backend flow. |
| `verifiers` | Contains verifier PII; not directly nurse-readable. |

`profiles` has no direct nurse UPDATE policy. Nurse profile updates route through `update_own_profile_basic()`, which permits only approved self-service fields.

---

## 5. Seed Data

**Table:** `license_status_mappings`  
**Current expected state:** 42 rows across 8 Title Case `normalized_status` groups after R3.  
**Result:** Passed.

| Normalized Status | Row Count |
|---|---:|
| `Active` | 6 |
| `Expired` | 5 |
| `Inactive` | 5 |
| `Pending` | 5 |
| `Revoked` | 5 |
| `Surrendered` | 3 |
| `Suspended` | 8 |
| `Unknown` | 5 |
| **Total** | **42** |

Correction note: the original Section 5 incorrectly stated 37 rows across 8 lowercase groups including `pending`. The pre-R3 state was 37 rows across 7 Title Case groups with no `Pending`; R3 added the 5 `Pending` rows.

---

## 6. Storage Foundation

TASK-0020 created the private `selfies` Supabase Storage bucket and added the required profile fields.

| Item | Result |
|---|---|
| `selfies` bucket exists | Passed |
| Bucket private | Passed |
| File size limit 10 MB | Passed |
| MIME types `image/jpeg`, `image/png`, `image/webp` | Passed |
| Exact-path INSERT policy | Passed |
| Exact-path UPDATE policy | Passed |
| Exact-path SELECT policy | Passed |
| No authenticated DELETE policy | Passed |
| `profiles.selfie_storage_path` | Added |
| `profiles.selfie_captured_at` | Added |

---

## 7. Migration History

Current verified migration history:

| Version | Migration |
|---|---|
| `20260526203020` | `v4_passto_mvp_schema` |
| `20260526203708` | `v4_passto_mvp_remediation_r1` |
| `20260526203905` | `v4_passto_mvp_remediation_r2` |
| `20260526214025` | `v4_passto_mvp_remediation_r3` |
| `20260527143033` | `v4_passto_mvp_selfie_storage` |
| `20260527162803` | `v4_passto_mvp_remediation_r4` |

---

## 8. Remediation Summary

| Migration | Key Changes | Result |
|---|---|---|
| R1 | `set_updated_at` search_path, anon revokes, profile RLS initplan, 4 FK indexes | Applied |
| R2 | PUBLIC EXECUTE revoke and explicit authenticated grants | Applied |
| R3 | `subscriptions` RESTRICT, token revoke RPC, `Pending` group in `license_status_mappings` | Applied |
| Selfie storage | Private bucket, exact-path policies, `profiles` selfie fields | Applied |
| R4 | `licenses.normalized_status` expanded to include `Pending` | Applied |

---

## 9. Accepted Retained Risk

`audit_events.actor_id ON DELETE SET NULL` remains intentional. It preserves audit rows if a profile is deleted while avoiding a design where any account with audit history can never be purged. Normal account closure must use `profiles.deleted_at`; hard deletion of `auth.users` is not an approved account-closure operation.

---

## 10. Current Gate Status

- Phase 2 profile/auth/onboarding work is unblocked.
- Phase 3.3 license lookup is no longer blocked by the `Pending` status constraint mismatch; R4 resolved it.
- Phase 3.5 selfie upload has the Storage foundation in place; Lovable UI and backend confirmation remain future implementation work.
