# Codex QA Response — TASK-0018 Claude Migration Review

**Reviewer:** Codex
**Date:** 2026-05-27
**Reviewed Artifact:** `docs/tasks/TASK-0018.md` — Claude QA Review of v4 Supabase Migration SQL and RLS
**Status:** Approved — Phase 2 Unblocked

---

## Overall Verdict

Claude's review is solid. Proceed with Phase 2 now. Schedule R4 before Phase 3.3. P2 documentation cleanup does not block account/profile work.

---

## P1 Finding — licenses.normalized_status CHECK mismatch

**Verdict: Confirmed. Fix approved with improvements.**

The mismatch is real. Claude's proposed fix is directionally correct. The following version is slightly more robust and should be used as the authoritative R4 migration SQL:

```sql
alter table public.licenses
  drop constraint if exists licenses_normalized_status_check;

alter table public.licenses
  add constraint licenses_normalized_status_check
  check (normalized_status = any (array[
    'Active','Inactive','Expired','Surrendered',
    'Revoked','Suspended','Pending','Unknown'
  ]));

comment on column public.licenses.normalized_status
  is 'PassTo canonical status. Eight values. Pending = source has pending application/renewal/review state; credential issuance depends on mapping rules.';
```

Improvements over Claude's draft:
- `DROP CONSTRAINT IF EXISTS` instead of `DROP CONSTRAINT` — safe to re-run without error if constraint name differs.
- Column comment updated — the current comment says "Seven values" which will be stale after R4.

**Phase impact:**
- Does NOT block Phase 2. Profile/auth/onboarding does not touch `licenses.normalized_status` or license lookup writes.
- Does block Phase 3.3 (license lookup Edge Function). Apply R4 before that task is executed.

---

## Pre-Phase-3 Gate

**Confirmed.**

Name: `v4_passto_mvp_remediation_r4`

Scope: expand `licenses.normalized_status` CHECK to include `'Pending'` and update the column comment. Do not touch `license_status_mappings` — R3 already handled that table.

This migration is small, low-risk, and independent. It should be reviewed by Codex and approved by David before Phase 3.3 begins, not before Phase 2.

---

## Phase 2 Unblock Decision

**Phase 2 is unblocked. Safe to start immediately.**

Profile/auth/onboarding routing does not depend on:
- `licenses.normalized_status`
- License lookup writes
- Selfie Storage bucket
- Stripe
- Verifier tokens

Start TASK-0019 (Phase 2: profile init and onboarding routing) now.

---

## P2 Findings Triage

### Real, can wait until before Phase 6 or Stripe work

**`stripe_customers` ADR (TASK-0007 OD-7 deviation):**
Real documentation debt. The deviation (drop `stripe_customers`, put `stripe_customer_id` on `profiles`) was a reasonable MVP simplification, but no ADR records the rationale. Create the ADR before Phase 6 / Stripe checkout implementation so the pattern is documented before Stripe data modeling decisions pile up.

**PRD Section 4.4 `stripe_customers` inconsistency:**
Real. PRD Section 4.4 still lists `stripe_customers` as a canonical launch-critical table. Clean this up before any Phase 6 tasks use PRD Section 4 as a source of truth.

**`V4_MIGRATION_VERIFICATION.md` Section 5 stale seed counts:**
Real, but pure cleanup. Section 5 still shows pre-R3 data (37 rows, 8 lowercase groups). The Post-R3 addendum at the bottom is correct. Update Section 5 inline when convenient — not blocking anything.

**Hard-delete cascade warning:**
Real retained risk. Accepted in DECISION-0016. Add the prohibition language to `SECURITY_MODEL.md` before production launch, not before Phase 2 or 3.

### Real, fix before Phase 3 or Phase 5 tasking

**`show_qr` implementation guard:**
This needs to be fixed before Phase 3 or Phase 5 tasking begins. The schema allows `show_qr` in `verification_tokens.token_type`, but the approved PRD defers Show QR from MVP launch. The risk is that an implementation task inadvertently treats `show_qr` as in-scope because the database supports it.

Action: Add an explicit guard to `MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md` before Phase 3 or Phase 5 work is tasked:

```
GUARD: No Edge Function or Lovable route may create show_qr tokens in MVP.
show_qr is dormant/deferred schema support only. Re-opening this scope requires
explicit David approval and a new task.
```

### Expected separate work (not a migration defect)

**Selfie Storage bucket (Phase 1.6):**
Not a migration defect. It was never part of the v4 schema migration. It needs its own task before Phase 3.5 (selfie capture). Create that task as a pre-Phase-3.5 gate — it does not block Phase 2 or Phase 3.1–3.4.

---

## Codex Acceptance Criteria Result

| Item | Result |
|---|---|
| P1 finding confirmed | ✅ |
| R4 fix SQL reviewed and approved | ✅ (with improvements) |
| P2 findings triaged with timing | ✅ |
| Phase 2 unblock confirmed | ✅ |
| Pre-Phase-3.3 gate confirmed | ✅ |

---

## Recommended Next Tasks

```text
TASK-0019 — Phase 2: Profile Init and Onboarding Routing
  Start now. Phase 2.2 (profile creation/init flow), 2.3 (onboarding step routing), 2.4 (account/auth QA).
  Owner: Claude (spec) + David (Lovable execution)

Pre-Phase-3.3 gate — v4_passto_mvp_remediation_r4
  Apply before license lookup Edge Function task begins.
  Migration: expand licenses.normalized_status CHECK to 8 values + update column comment.
  Use the approved SQL above.
  Owner: Claude (draft) → Codex (review) → David (approval) → Claude (apply)

Before Phase 3 tasking — show_qr guard
  Add implementation guard to MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md.
  Owner: Claude

Before Phase 6 — stripe_customers ADR
  Document the deviation from TASK-0007 OD-7 as an approved architecture decision.
  Owner: Claude (draft) → Codex (review)
```
