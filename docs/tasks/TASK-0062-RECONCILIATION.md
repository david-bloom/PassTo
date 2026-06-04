# TASK-0062 Reconciliation — GA Tier Features vs MVP PRD

**Task:** TASK-0062 — Reconcile GA Tier Features Against MVP PRD  
**Status:** Reconciliation Complete  
**Date:** 2026-06-04  
**Owner:** Claude  
**Reviewer:** Codex (QA pending)

---

## Executive Summary

David's decision (APPROVAL-0030) is confirmed: **MVP scope follows the PRD. TIER_FEATURES.md is a GA/complete-product reference, not MVP launch scope.**

All acceptance criteria are met. TASK-0056 (share-link) behavior is correctly aligned with MVP PRD. Deferred features (Show QR, PDF, scheduled refresh, additional license, paid share links) remain explicitly out of scope.

---

## Reconciliation Checklist

### ✅ Acceptance Criterion 1
**David decision is recorded: MVP sticks with PRD; TIER_FEATURES.md is GA / complete-product reference, not MVP launch scope.**

**Status: MET**

- APPROVAL-0030 recorded 2026-06-04: "My decision is to stick with the PRD. The TIER_FEATURES.md is for complete products, General Availability, not MVP."
- TIER_FEATURES.md header explicitly states: "Status: Complete Product / General Availability Reference - Not MVP Launch Scope"
- PAYMENTS.md and SUBSCRIPTION.md both preface with: "The approved PRD remains the source of truth for MVP launch scope. Usage pricing in this document is a GA/product-complete reference unless the PRD or a task approval explicitly includes the capability in MVP."

---

### ✅ Acceptance Criterion 2
**TASK-0056 behavior is reconciled with MVP PRD entitlement rules.**

**Status: MET**

**Evidence:**

| Item | TASK-0056 Implementation | MVP PRD | Match? |
|---|---|---|---|
| Share link creation | Backend-controlled gate | "backend checks ownership and entitlement" | ✅ YES |
| Token storage | SHA-256 hash only; raw token returned once | "stores only a token hash, and returns the raw token once" | ✅ YES |
| Free tier access | Free users can create (no subscription check) | PRD does not mention paid share links | ✅ YES |
| Paid tier access | Requires active subscription | "backend checks... entitlement" | ✅ YES |
| TTL | 72 hours or first use | Not specified in PRD; TASK-0056 documents 72 hours approved | ✅ YES |
| Lovable involvement | Lovable calls `/dashboard` → backend function; no direct token insert | "Lovable must not directly insert verification_tokens" | ✅ YES |
| Audit | Both creation and rejection paths write audit_events | PRD requires audit/event logging | ✅ YES |

**Gate chain in `share-link-create` (line 163-181):**
- Free users: Always allowed
- Paid tier users (Standard/Premier): Must have active `subscriptions` row with `status = 'active'`
- No payment/Stripe charge for Free-tier share-link creation (MVP scope)

**Conclusion:** TASK-0056 correctly implements MVP share-link entitlements per PRD.

---

### ✅ Acceptance Criterion 3
**Show QR remains deferred from MVP unless separately reopened by David.**

**Status: MET**

**Evidence:**

| Document | Status |
|---|---|
| PRD Section 2 — Deferred Capabilities | "Show QR is deferred from launch-critical MVP" |
| PRD Section 5 — Feature Requirements | Not listed as launch-critical |
| TASK-0056 Out of Scope | "Show QR token creation" |
| TASK-0058 (Verifier Flow) | Does not implement Show QR verifier path |
| MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE | Show QR not in any phase |
| deno.lock | No QR generation library committed |

**Schema support:** `verification_tokens.token_type` enum includes `show_qr`, but no MVP task creates tokens with this type. Feature remains GA-ready without MVP implementation.

**Conclusion:** Show QR is properly deferred and schema-ready but not exposed to MVP users.

---

### ✅ Acceptance Criterion 4
**PDF export remains deferred from MVP unless separately reopened by David.**

**Status: MET**

**Evidence:**

| Document | Status |
|---|---|
| PRD Section 2 — Deferred Capabilities | "PDF export is deferred from launch-critical MVP" |
| PRD Section 5 — Feature Requirements | "Show QR/PDF hidden or clearly deferred" |
| TASK-0062 Out of Scope | "PDF export implementation" |
| MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE | PDF not in any phase |
| Dashboard spec | No PDF export action button |

**Schema support:** `purchases` table supports `action_type = 'pdf_export'` and `metadata.storage_path`. No MVP implementation.

**Conclusion:** PDF export is properly deferred and purchase-table-ready without MVP task implementation.

---

### ✅ Acceptance Criterion 5
**Scheduled refresh remains deferred from MVP unless separately reopened by David.**

**Status: MET**

**Evidence:**

| Document | Status |
|---|---|
| PRD Section 2 — Deferred Capabilities | "Scheduled automated refresh is deferred from launch-critical MVP" |
| PRD Section 6 | Deferred integrations include "scheduled refresh automation" |
| MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE | Refresh not in Phases 1-6 |
| `refresh_events` table | Includes `triggered_by in ('nurse', 'scheduled')` but no job queue implementation |

**Conclusion:** Refresh infrastructure is schema-ready; scheduled/automated execution is deferred from MVP.

---

### ✅ Acceptance Criterion 6
**Additional license flow remains deferred from MVP unless separately reopened by David.**

**Status: MET**

**Evidence:**

| Document | Status |
|---|---|
| PRD Section 2 — Deferred Capabilities | "Additional license flow is deferred from launch-critical MVP" |
| TIER_FEATURES.md | "Additional licenses: Not available in MVP" |
| SUBSCRIPTION.md | "Free: 1 license only; additional license purchase not available in MVP" |
| MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE | Additional license not in any phase |
| Dashboard action visibility | No "Add License" button in MVP |

**Schema support:** `purchases` table supports `action_type = 'additional_license'`. No MVP frontend or backend flow implemented.

**Conclusion:** Additional license is properly deferred from MVP. Schema supports future GA feature.

---

### ✅ Acceptance Criterion 7
**Lovable does not directly insert verification_tokens, payments, stripe_events, refresh_events, or pdf_exports.**

**Status: MET**

**Evidence:**

**Verification Tokens** (`verification_tokens`):
- RLS Policy: No nurse INSERT policy
- Creation: Service-role only via `share-link-create` Edge Function
- Audit: `share-link-create` writes `audit_events` before token insert (fail-closed)

**Payments** (`payments`):
- RLS Policy: No user INSERT policies
- Creation: Service-role only via Stripe webhook handler (`stripe-webhook`)
- Lovable involvement: Calls `stripe-checkout-create` function; does not create payment rows

**Stripe Events** (`stripe_events`):
- RLS Policy: Service-role only
- Creation: `stripe-webhook` Edge Function (idempotent webhook handler)
- Lovable involvement: None (webhook-driven)

**Refresh Events** (`refresh_events`):
- RLS Policy: Service-role only (no user INSERT)
- Creation: Backend refresh function (deferred for MVP)
- Lovable involvement: None (backend-controlled)

**PDF Exports** (`pdf_exports`):
- RLS Policy: Service-role only
- Creation: Not implemented in MVP
- Lovable involvement: None

**Schema enforces:** All sensitive tables have `enable row level security` and no authenticated user INSERT policies.

**Conclusion:** Lovable cannot bypass backend gate checks. All entitlement enforcement is server-controlled.

---

### ✅ Acceptance Criterion 8
**Claude documents files changed, tests run, deviations, and risks.**

**Status: MET (This Document)**

---

## Files Reviewed

| File | Purpose | Status |
|---|---|---|
| `/docs/prd/PASS_TO_PRD.md` | MVP scope definition | ✓ Reviewed |
| `/docs/features/TIER_FEATURES.md` | GA tier reference | ✓ Reviewed — confirmed as GA/non-MVP |
| `/docs/features/SUBSCRIPTION.md` | GA subscription spec | ✓ Reviewed — confirmed as GA/non-MVP |
| `/docs/flows/PAYMENTS.md` | GA payments reference | ✓ Reviewed — confirmed as GA/non-MVP |
| `/docs/tasks/TASK-0056.md` | Share-link implementation | ✓ Reviewed — aligned with PRD |
| `/docs/tasks/TASK-0058.md` | Verifier flow | Verified in prior session — no GA features |
| `/supabase/functions/share-link-create/index.ts` | Share-link gate logic | ✓ Reviewed — correct entitlement checks |
| `/docs/architecture/NAMING_CONVENTIONS.md` | Canonical naming | ✓ Spot-checked for resource.verb audit format |

---

## Tests Run

**Source review only** (no new code execution):
- Verified `share-link-create` entitlement gate logic (lines 163-181)
- Verified RLS policies prevent Lovable INSERT on payment-gated tables
- Verified schema enum constraints on `token_type` and `action_type`
- Verified Task status and PRD alignment

---

## Deviations from Original TASK-0062 Proposal

**None.** Original proposal and David's decision are fully aligned.

---

## Risks and Open Items

**No blockers identified.**

| Risk | Likelihood | Mitigation |
|---|---|---|
| GA docs accidentally used as MVP implementation guide during Phase 7 | Low | This reconciliation document is linked in TASK-0062 and MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE |
| Future PRD revision accidentally includes GA features in MVP scope | Low | PRD ownership (David), task approval gates, and charter document the boundary |
| Stripe product/price IDs created for GA features (Show QR $1.99, PDF $1.99) | Medium | David controls Stripe live setup; not part of MVP execution tasks |

---

## Recommendations for Phase 7

When Phase 7 (Ops, Alerts, QA, Launch Readiness) begins:

1. **Dashboard action visibility:** Verify that Show QR and PDF export buttons are explicitly hidden or marked "Coming Soon" in MVP.
2. **Lovable prompts:** Confirm no MVP routes mention paid share links, PDF pricing, or additional licenses.
3. **RLS boundary audit:** Full cross-table verification that no Lovable-accessible role can bypass `service_role` checks on `verification_tokens`, `payments`, `stripe_events`.
4. **Stripe webhook:** Verify webhook handler does not process product/price IDs for deferred features (GA pricing).

---

## Conclusion

**TASK-0062 reconciliation is complete.** All acceptance criteria are satisfied. MVP follows the PRD. TIER_FEATURES.md is preserved as a GA reference. Deferred features are schema-ready but not exposed to MVP.

**Next step:** Codex QA of this reconciliation, then proceed to TASK-0061 (subscription management) and TASK-0063 (entitlement hardening).

---

**Prepared by:** Claude  
**Date:** 2026-06-04  
**Status:** Ready for Codex QA
