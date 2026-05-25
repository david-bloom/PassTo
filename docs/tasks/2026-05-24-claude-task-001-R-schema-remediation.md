# Claude Task 001-R — Remediate Supabase MVP Schema Spike After Codex QA

**Task ID:** Claude Task 001-R  
**Executed By:** Claude — Senior Engineer  
**Date:** 2026-05-24  
**Assigned By:** David  
**Remediates:** Claude Task 001 — Supabase MVP Schema Spike  
**Codex QA Source:** `/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md`  
**Status:** Remediation Complete — Awaiting Codex Re-Review  

---

## Task Assignment

David assigned Claude Task 001-R after Codex completed QA on the Task 001 schema spike artifact and returned a "Changes Required" result.

**Task:** Remediate all 10 blocking issues identified in the Codex QA review. Do not apply any migration to Supabase. Update the implementation artifact in GitHub and respond in Issue #1 using Codex's required remediation format. When complete, label Issue #1: `assigned: codex`, `needs: codex-review`, `status: ready-for-codex-qa`.

---

## Acceptance Criteria

- [ ] Read `/docs/tasks/2026-05-24-claude-task-001-supabase-schema-implementation.md`
- [ ] Read `/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md`
- [ ] Read GitHub Issue #1
- [ ] Address all 10 Codex blocking issues in the implementation artifact
- [ ] Commit updated implementation artifact to GitHub
- [ ] Post Codex-format remediation response to Issue #1
- [ ] Update Issue #1 labels: `assigned: codex`, `needs: codex-review`, `status: ready-for-codex-qa`
- [ ] Do NOT apply migration to Supabase

---

## Blockers Addressed

| Blocker | Description | Resolution |
|---|---|---|
| BLOCKER 1 | Verifier/share schema naming diverges from TASK-0002 canonical architecture | Tables renamed: `verification_tokens`, `verifiers`, `verification_events`. Previous names removed. |
| BLOCKER 2 | `verifier_organization` collected despite MVP rule: name/email only | Column removed. `verifiers` now stores `name` and `email` only. |
| BLOCKER 3 | Verifier email nurse-readable via RLS | `verifiers` made service-role only (no nurse RLS policies). Nurse-facing history served via `get_verification_history()` SECURITY DEFINER function — returns token summary only, no verifier contact data. |
| BLOCKER 4 | Raw share tokens stored in database | `verification_tokens` now stores `token_hash` (SHA-256). Raw token generated server-side, returned once to nurse, never persisted. |
| BLOCKER 5 | Nurse direct INSERT into share tokens bypasses payment/entitlement gates | Nurse INSERT policy removed. All token creation via service-role API route enforcing payment + entitlement + credential ownership + TTL. |
| BLOCKER 6 | License status fields don't match approved status translation model | Renamed to canonical 5-field model: `source_status_raw`, `source_status_display`, `normalized_status`, `status_intent`, `wallet_pass_treatment` (`valid`/`caution`/`invalid`/`do_not_issue`), `status_checked_at`. `Unknown` → `do_not_issue`. Near-expiry → `caution`. |
| BLOCKER 7 | Token status under-modeled; derived booleans vs. mutually exclusive states | Explicit `status` enum added to `verification_tokens`: `active`/`used`/`expired`/`replaced`/`revoked`/`payment_failed`/`generation_failed`. Timestamps retained for auditability. |
| BLOCKER 8 | Paid action tracking insufficient for share/refresh/PDF/additional-license | `purchases` table added. Single table for all paid MVP actions. `action_type` enum: `share_token`/`refresh`/`pdf_export`/`additional_license`. `amount_cents = 0` for entitlement-covered actions. |
| BLOCKER 9 | PDF export, refresh events, jobs, notification events need explicit MVP/deferred decisions | `refresh_events` table added (MVP). PDF modeled via `purchases.metadata`. `jobs` and `notification_events` explicitly deferred with documented rationale. |
| BLOCKER 10 | Data retention/account deletion policy blocks production migration | `deleted_at` added to `profiles` for soft deletion. David retention decision flagged as **migration blocker** in open questions. No hard cascades on audit/verification/payment records changed yet. |

**Non-blocking issues also addressed:**

| Item | Resolution |
|---|---|
| N1 — `profiles` nurse INSERT policy | Removed. Trigger handles profile creation on `auth.users` insert. |
| N2 — `updated_at` triggers missing | `set_updated_at()` generic trigger defined and applied to all tables with `updated_at`. |
| N3 — `wallet_passes` provider uniqueness | `unique(pass_id, provider)` added. Supports one record per provider per pass. |
| N4 — Null `plan_name` entitlement ambiguity | Application-level rule documented: null `plan_name` = Free tier. Schema comment added. |
| N5 — `email` normalization | Lowercase normalization noted. `citext` option flagged in open questions pending Supabase extension confirmation. |

---

## Files Changed

| File | Change |
|---|---|
| `docs/tasks/2026-05-24-claude-task-001-supabase-schema-implementation.md` | Full v1 → v2 revision. Addresses all 10 blockers. Migration SQL, RLS policies, rationale, challenge log, open questions, and self-QA all updated. |

**Commit:** `83a77a6` — _"Remediate Task 001 schema — address all 10 Codex QA blockers"_

---

## Codex-Format Issue Response

Remediation response posted to Issue #1:  
https://github.com/david-bloom/PassTo/issues/1#issuecomment-4530736085

Response uses the exact format specified in the Codex QA review. All 10 blocker checkboxes are checked. Remaining David and Codex decisions are clearly separated.

---

## Remaining Open Items

### David Decisions Required Before Migration

| Item | Notes |
|---|---|
| **Data retention / account deletion posture** | **Migration blocker.** How long are audit, verification, and payment records retained when a nurse account closes? Is personal data anonymized? Are `deleted_at` profiles ever hard-deleted? |
| **Token TTL** | What is the intended expiry window for `verification_tokens.expires_at`? DECISION-0005 says "short-lived" — specific duration needed. Schema supports any TTL via `expires_at`. |
| **Free user additional license purchase** | Can Free users buy additional licenses ($4.99) in MVP? Or is additional license hidden for Free until upgrade? Affects `purchases.action_type` enforcement. |
| **Standard/Premier subscription prices** | Final monthly prices for Stripe product setup. Needed before Stripe configuration. |
| **PDF storage approach** | Is Supabase Storage the confirmed target for PDF export files? `purchases.metadata.storage_path` assumes this. |

### Codex Decisions Required Before Migration

| Item | Notes |
|---|---|
| **`audit_events.action` namespace** | Canonical action string format must be defined before migration (e.g., `license.created`, `verification_token.issued`). Schema has no enum constraint until Codex specifies. |
| **`is_primary` designation path** | How does a nurse designate their primary license — service-role API route, `primary_license_id` FK on `profiles`, or narrow update policy? |
| **RLS testing approach** | Manual Postman, SQL RLS test scripts, or Supabase built-in policy testing? Codex to confirm before migration is approved. |

---

## Issue #1 Label State After Remediation

```text
assigned: codex          ✓
needs: codex-review      ✓
status: ready-for-codex-qa  ✓
assigned: claude         removed ✓
needs: claude-response   removed ✓
status: blocked          removed ✓
```

---

## Production Guardrail

Migration must not be applied to Supabase project `zpvbexzdiklxlvrxsvop` until:

1. Codex re-reviews the v2 artifact and clears all blockers.
2. David decides data retention / account deletion posture.
3. David gives final migration approval.

---

## Task 001-R Status

```text
Remediation: Complete
Implementation Artifact: Committed — commit 83a77a6
Issue #1 Response: Posted
Labels: Routed to Codex
Migration Approval: Not Approved (pending Codex re-review and David decisions)
Safe to Apply to Supabase: No
Next Owner: Codex (re-review)
```
