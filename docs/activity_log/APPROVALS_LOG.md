# PassTo Approvals Log

This log records David approvals, rejections, Done decisions, and risk acceptances.

## Approval Format

```markdown
## APPROVAL-0000 — Approval Title

**Date:** YYYY-MM-DD  
**Approved By:** David  
**Related Task:** TASK-0000 / N/A  
**Decision:** Approved / Rejected / Approved with Notes / Done / Not Done / Do Not Do  

### Summary

What was approved or rejected?

### Approval Checklist

- [ ] I approve this task for execution.
- [ ] I approve the stated acceptance criteria.
- [ ] I approve the stated out-of-scope items.
- [ ] I understand the risks noted below.

### Notes

-
```

---

## APPROVAL-0034 — TASK-0072 Wallet Provider Configuration and Display Spec Approval

**Date:** 2026-06-05
**Approved By:** David
**Related Task:** TASK-0072
**Decision:** Approved

### Summary

David approved TASK-0072 execution and the wallet pass display specification after Codex implemented the actual Apple PassKit layout and mirrored Google Wallet display payload:

```text
approved
```

### Approval Checklist

- [x] I approve configuring Apple Wallet / PassKit credentials for PassTo.
- [x] I approve configuring Google Wallet issuer/service-account credentials for PassTo.
- [x] I approve setting required Vercel environment variables without exposing values in GitHub.
- [x] I approve setting required Supabase Edge Function secrets without exposing values in GitHub.
- [x] I approve deploying/redeploying wallet signing routes and `wallet-issue` if needed.
- [x] I approve test-mode or launch-readiness wallet issuance against an approved disposable credential.
- [x] I approve `docs/design_system/WALLET_PASS_DISPLAY_SPEC.md` as implementation truth for TASK-0072.
- [x] I understand this does not approve production launch or broader risk acceptance.

### Notes

Approval covers provider configuration and live wallet QA for TASK-0072. It does not approve production launch, permanent QR/barcode embedding, committed secrets, raw wallet provider credentials in GitHub, Stripe live-mode changes, or unrelated task/issue closure.

---

## APPROVAL-0033 — TASK-0061, TASK-0062, and TASK-0063 Done Approval

**Date:** 2026-06-05
**Approved By:** David
**Related Task:** TASK-0061, TASK-0062, TASK-0063
**Decision:** Done / Passed

### Summary

David approved TASK-0061, TASK-0062, and TASK-0063 after Codex re-QA/final review:

```text
David approves Tasks-0061, 0062, 0063
```

### Approval Checklist

- [x] I approve TASK-0061 as Done for its documented subscription management and cancellation-flow scope.
- [x] I approve TASK-0062 as Done for its documented MVP-vs-GA tier reconciliation scope.
- [x] I approve TASK-0063 as Done for its documented entitlement/lapse ops visibility scope.
- [x] I understand this does not approve TASK-0064 Done, production launch, Stripe live-mode cutover, live Stripe product/price changes, issue closure outside the named tasks, or risk acceptance outside the named task scopes.

### Notes

Approval follows Codex re-QA for TASK-0061 and TASK-0062 and Codex final review for TASK-0063. Residual limitations remain as documented in each task file.

---

## APPROVAL-0032 — TASK-0060 Pass / Done Approval

**Date:** 2026-06-04
**Approved By:** David
**Related Task:** TASK-0060
**Decision:** Done / Passed

### Summary

David approved TASK-0060 after Codex re-QA verified the real Stripe test checkout, webhook persistence, and duplicate webhook idempotency evidence.

### Approval Checklist

- [x] I approve TASK-0060 as Passed / Done for its documented scope.
- [x] I approve the recorded real Stripe test-mode checkout evidence.
- [x] I approve the recorded duplicate webhook resend/idempotency evidence.
- [x] I understand this does not approve Stripe live-mode cutover, production launch, issue closure outside this task, or risk acceptance beyond the documented TASK-0060 scope.

### Notes

Approval source: David stated "David approved" after Codex reported TASK-0060 re-QA evidence and duplicate event verification for `evt_1TeiXlAxxYwftEABuYocF2ge`.

---

## APPROVAL-0031 — Phase 5 Closeout and Phase 6 Execution Approvals

**Date:** 2026-06-04
**Approved By:** David
**Related Task:** TASK-0055, TASK-0057, TASK-0058, TASK-0059, TASK-0060, TASK-0061, TASK-0062, TASK-0063
**Decision:** Approved / Done

### Summary

David provided the following approvals:

```text
TASK-0055 David Approves
TASK-0057 David Approves
TASK-0058 David Approves
TASK-0059 David approves Pass/Done
TASK-0060 David Approves
TASK-0061 David Approves
TASK-0062 David Approves
TASK-0063 David Approves
```

### Interpretation

- TASK-0055, TASK-0057, and TASK-0058 are complete for their documented scope.
- TASK-0059 is approved as Pass/Done for the recorded Phase 5 QA evidence task.
- TASK-0060, TASK-0061, TASK-0062, and TASK-0063 are approved for execution within their documented scopes.
- TASK-0056 was not included in this approval and remains `Live E2E Exercised - Awaiting David Review`.
- TASK-0064 was not included in this approval and remains `Spec Drafted - Awaiting David Approval`.

### Approval Checklist

- [x] I approve TASK-0055 after review.
- [x] I approve TASK-0057 after review.
- [x] I approve TASK-0058 after review.
- [x] I approve TASK-0059 Pass/Done.
- [x] I approve TASK-0060 for execution.
- [x] I approve TASK-0061 for execution.
- [x] I approve TASK-0062 for reconciliation execution.
- [x] I approve TASK-0063 for execution.
- [x] I understand this does not approve production launch or risk acceptance.

### Notes

Approved: documented task-scope closeout for TASK-0055, TASK-0057, TASK-0058, TASK-0059; documented task-scope execution for TASK-0060 through TASK-0063.

Not approved: TASK-0056 Done/closeout, TASK-0064 execution/Done, production launch, task/issue closure outside the named task docs, Stripe live-mode changes, live Stripe products/prices, migrations outside approved task scope, secret changes outside approved task scope, deferred Show QR/PDF/additional-license/employer-dashboard scope, or launch risk acceptance.

---

## APPROVAL-0030 — MVP Scope Follows PRD; Tier Features Are GA Reference

**Date:** 2026-06-04
**Approved By:** David
**Related Task:** TASK-0062
**Decision:** Approved Scope Clarification

### Summary

David clarified that MVP scope should follow the PRD, and that `docs/features/TIER_FEATURES.md` describes the complete product / General Availability tier model rather than MVP launch scope:

```text
My decision is to stick with the PRD. The TIER_FEATURES.md is for complete products, General Availability, not MVP.
```

### Interpretation

- The PRD is the controlling source for MVP launch-critical and deferred scope.
- `TIER_FEATURES.md` is a GA / complete-product tier reference.
- APPROVAL-0029 is superseded for MVP implementation purposes.
- Free-tier paid actions in `TIER_FEATURES.md` do not authorize MVP implementation of Show QR, on-demand refresh, PDF export, scheduled refresh, or other PRD-deferred capabilities.
- TASK-0062 should reconcile GA tier documentation against MVP PRD scope, not implement GA paid actions.

### Approval Checklist

- [x] I approve using the PRD as the controlling MVP scope source.
- [x] I approve treating `TIER_FEATURES.md` as complete-product / GA reference.
- [x] I approve superseding APPROVAL-0029 for MVP implementation purposes.
- [x] I understand this does not approve implementation, launch, or risk acceptance.

### Notes

Approved: documentation clarification and reconciliation direction only.

Not approved: implementation, migrations, Edge Function deployments, Stripe live-mode changes, live Stripe products/prices, secret changes, Lovable UI changes, production launch, task Done, issue closure, or risk acceptance.

---

## APPROVAL-0029 — Free-Tier Paid Action Policy Decision

**Date:** 2026-06-04
**Approved By:** David
**Related Task:** TASK-0062
**Decision:** Approved Policy Decision

### Summary

David confirmed the Free-tier paid action policy:

```text
Free tier can share, generate QR code, refresh and pdf export for $1.99
```

Interpretation:

- Free-tier share link is available as a $1.99 paid action.
- Free-tier Show QR verifier access is available as a $1.99 paid action.
- Free-tier on-demand refresh is available as a $1.99 paid action.
- Free-tier PDF export is available as a $1.99 paid action.
- Payment-gated action execution must be backend-controlled and must wait for server-confirmed Stripe payment.

### Approval Checklist

- [x] I approve the Free-tier paid action policy for share link, Show QR, on-demand refresh, and PDF export.
- [x] I approve updating TASK-0062 and Phase 6 docs to record the policy decision.
- [x] I understand current TASK-0056 behavior allows Free-tier share-link creation without payment and must be reconciled before production launch.
- [x] I understand this does not approve implementation or production launch.

### Notes

Superseded for MVP implementation purposes by APPROVAL-0030. `TIER_FEATURES.md` remains a complete-product / GA reference, while the PRD controls MVP launch scope.

Approved: product/pricing decision and documentation update only.

Not approved: implementation, migrations, Edge Function deployments, Stripe live-mode changes, live Stripe products/prices, secret changes, Lovable UI changes, production launch, task Done, issue closure, or risk acceptance.

---

## APPROVAL-0025 — TASK-0065 Supabase Auth Password Reset Redirect Fix Approved

**Date:** 2026-06-02  
**Approved By:** David  
**Related Task:** TASK-0065  
**Decision:** Approved  

### Summary

David approved creating and assigning a Claude task to fix the password reset email redirect, after reporting that a received password reset email linked to `http://localhost:3000/`.

```text
David approved. Codex Make a task for Claude
```

TASK-0065 covers Supabase Auth URL configuration and, if needed, Lovable password-reset redirect behavior so reset links point to `https://enroll.passtodigital.com`.

### Approval Checklist

- [x] I approve TASK-0065 for execution.
- [x] I approve changing Supabase Auth URL configuration for password-reset redirect correctness.
- [x] I approve a Lovable password-reset redirect adjustment if needed.
- [x] I understand this is a production-impacting auth configuration change and must be documented with before/after values and test evidence.

### Notes

- Approved scope: fix password reset redirect host/path, test with a reset email, document values changed and rollback/recovery note.
- Not approved: production launch, task Done decision, issue closure, database migrations, Edge Function deployments, unrelated secret changes, or broad redirect allowlists outside trusted PassTo domains without separate approval.

---

## APPROVAL-0024 — TASK-0058 Approved for Execution

**Date:** 2026-06-02
**Approved By:** David
**Related Task:** TASK-0058
**Decision:** Approved

### Summary

David approved TASK-0058 for execution:

```text
execute 0058
```

TASK-0058 — Implement `/v/{token}` Verifier Flow. Lovable prompt for the public verifier credential view page. No new backend functions — `token-verify` (TASK-0057) is the backend. Also includes a minor `token-verify` v2 update to accept `marketing_consent`.

### Approval Checklist

- [x] I approve TASK-0058 for execution.
- [x] I approve the Lovable prompt for `/v/:token` as the verifier UI implementation spec.
- [x] I approve the `token-verify` v2 update adding `marketing_consent` field.
- [x] I understand this does not approve Show QR, PDF export, employer dashboard, verifier account creation, or production launch.

### Notes

- Approved scope: Lovable prompt + `token-verify` marketing_consent patch only.
- Not approved: Show QR, PDF export, employer dashboard, verifier account creation, production launch, risk acceptance, Done decision.
- TASK-0056 (issue #11) and TASK-0057 (issue #12) Codex QA still pending.

---

## APPROVAL-0023 — TASK-0057 Approved for Execution

**Date:** 2026-06-02
**Approved By:** David
**Related Task:** TASK-0057
**Decision:** Approved

### Summary

David approved TASK-0057 for execution:

```text
execute task 0057
```

TASK-0057 — Implement Verifier Token Validation Function. New `token-verify` Edge Function: anonymous POST accepting raw token + verifier form, hashes server-side, validates token, creates verifiers row, writes verification_events, marks token used, returns safe credential display data.

### Approval Checklist

- [x] I approve TASK-0057 for execution.
- [x] I approve `token-verify` writing to `verifiers`, `verification_events`, and `audit_events`, and marking `verification_tokens.status = 'used'`.
- [x] I understand this is an anonymous endpoint — auth is via token hash, not Supabase JWT.
- [x] I understand TASK-0056 Codex QA (issue #11) is still open — TASK-0057 proceeds with that as a noted dependency gap.
- [x] I understand this does not approve TASK-0058, Show QR, PDF export, or production launch.

### Notes

- Approved scope: `token-verify` Edge Function only.
- Not approved: TASK-0058, verifier UI, Show QR, PDF export, employer dashboard, production launch, risk acceptance, Done decision.
- TASK-0056 Codex QA (issue #11) still pending — end-to-end token creation → validation chain testable only after #11 resolves.

---

## APPROVAL-0022 — TASK-0056 Approved for Execution

**Date:** 2026-06-02
**Approved By:** David
**Related Task:** TASK-0056
**Decision:** Approved

### Summary

David approved TASK-0056 for execution via "execute task 0057" followed by selecting "Do 0056 first" — confirming TASK-0056 should execute before TASK-0057.

TASK-0056 — Implement Share-Link Token Creation Function. New `share-link-create` Edge Function + `dashboard-status` real eligibility update.

### Approval Checklist

- [x] I approve TASK-0056 for execution.
- [x] I approve `share-link-create` writing to `verification_tokens` and `audit_events`.
- [x] I approve `dashboard-status` being updated to return real share-link eligibility state.
- [x] I understand raw tokens are never stored — only SHA-256 hash persisted.
- [x] I understand this does not approve TASK-0057, Show QR, PDF export, or production launch.

### Notes

- Approved scope: `share-link-create` Edge Function + `dashboard-status` eligibility update only.
- Not approved: TASK-0057, verifier token validation, Show QR, PDF export, employer dashboard, production launch, risk acceptance, Done decision.
- Source pushed to GitHub before deployment per corrected workflow.

---

## APPROVAL-0021 — Delete Unapproved share-link-create Supabase Function

**Date:** 2026-06-02
**Approved By:** David
**Related Task:** TASK-0056 cleanup only
**Decision:** Approved with Notes

### Summary

David approved deletion of the unapproved `share-link-create` Edge Function from Supabase project `wvzjfxacykgsaffskgtr`:

> I approve deleting the unapproved live Supabase Edge Function share-link-create from project wvzjfxacykgsaffskgtr. This applies to TASK-0056 cleanup only. It does not approve TASK-0056 execution, redeployment, production launch, risk acceptance, or task Done.

Context: a prior Claude session deployed `share-link-create` to Supabase without David approval and without pushing source to GitHub. The function had two P1 bugs and was non-functional. Codex flagged it during TASK-0055 QA.

### Approval Checklist

- [x] I approve deleting `share-link-create` from Supabase project `wvzjfxacykgsaffskgtr`.
- [x] I understand this does not approve TASK-0056 execution or redeployment.
- [x] I understand this does not approve production launch, risk acceptance, or task Done.

### Notes

- Not approved: TASK-0056 execution, share-link-create redeployment, production launch, risk acceptance, Done decision.
- When TASK-0056 is formally approved, Claude will rewrite the function from scratch with all Codex-identified bugs fixed.

---

## APPROVAL-0020 — TASK-0055 Approved for Execution

**Date:** 2026-06-02
**Approved By:** David
**Related Task:** TASK-0055
**Decision:** Approved

### Summary

David approved TASK-0055 for execution:

```text
execute 0055
```

TASK-0055 — Implement Nurse Dashboard Launch-Critical Status View. New `dashboard-status` Edge Function (read-only GET, returns credential/license/wallet/subscription state) and Lovable prompt for the `/dashboard` page.

### Approval Checklist

- [x] I approve TASK-0055 for execution.
- [x] I approve the `dashboard-status` Edge Function reading `profiles`, `licenses`, `credentials`, `wallet_passes`, and `subscriptions` tables in read-only mode.
- [x] I approve the Lovable prompt for `/dashboard` as the dashboard UI implementation spec.
- [x] I understand share-link token creation is not approved here — `share_link_eligible` will return `false` until TASK-0056 is separately approved.
- [x] I understand deferred features (QR, PDF export, add-license, employer dashboard) must not appear as launch blockers.

### Notes

- Approved scope: `dashboard-status` Edge Function + Lovable prompt only. No schema migrations.
- Not approved: share-link token creation, QR code, PDF export, add-license flow, employer dashboard, production launch, Done decision, risk acceptance.
- Codex QA required before Lovable prompt is sent to Lovable — issue [#10](https://github.com/david-bloom/PassTo/issues/10).

---

## APPROVAL-0019 — TASK-0052 Approved for Execution

**Date:** 2026-06-02
**Approved By:** David
**Related Task:** TASK-0052
**Decision:** Approved

### Summary

David approved TASK-0052 for execution:

```text
0052
```

TASK-0052 — Implement Success / PassReady Credential Status Flow. Lovable `/success` page update to consume Phase 4 backend endpoints and show credential/wallet states accurately.

### Notes

- `/pass-ready` disposition requires separate David decision before implementation.
- Not approved: production launch, share-link, Show QR, PDF export, nurse dashboard beyond routing.

---

## APPROVAL-0018 — TASK-0051 Approved for Execution

**Date:** 2026-06-02
**Approved By:** David
**Related Task:** TASK-0051
**Decision:** Approved

### Summary

David approved TASK-0051 for execution:

```text
0051
```

TASK-0051 — Persist Wallet Provider State to Supabase. Covers wallet status reader update, per-provider state, and ops alert documentation.

### Notes

- `wallet_passes` write logic is already implemented in TASK-0050 `wallet-issue`.
- Main work: update `success-status` to return separate Apple/Google wallet state.
- Not approved: production launch, risk acceptance, Done decision.

---

## APPROVAL-0017 — TASK-0050 Approved for Execution

**Date:** 2026-06-02
**Approved By:** David
**Related Task:** TASK-0050
**Decision:** Approved

### Summary

David approved TASK-0050 for execution:

```text
0050
```

TASK-0050 — Define Wallet Signing and Issuance Contract. Covers signing boundary decision, contract document, revised Vercel signing routes, and new `wallet-issue` Edge Function.

### Approval Checklist

- [x] I approve TASK-0050 for execution.
- [x] I understand wallet signing routes will be revised to require internal service token auth.
- [x] I understand production wallet certificates (Apple) and Google service account keys must be set separately and are hard gates.
- [x] I understand this does not approve production wallet certificate procurement, live wallet provider configuration, or production launch.

### Notes

- Not approved: production Apple certificate/key procurement, Google Wallet issuer setup, production launch, risk acceptance, Done decision.
- Certificate/key secrets (`APPLE_WWDR_PEM_BASE64`, `APPLE_CERT_PEM_BASE64`, `APPLE_KEY_PEM_BASE64`, `GOOGLE_SERVICE_ACCOUNT_JSON`) must be set by David separately — hard gate.

---

## APPROVAL-0016 — TASK-0049 Approved for Execution

**Date:** 2026-06-02
**Approved By:** David
**Related Task:** TASK-0049
**Decision:** Approved

### Summary

David approved TASK-0049 for execution:

```text
execute task 0049
```

TASK-0049 — Implement Credential Creation Gate. Backend credential row creation after all trust/payment/selfie gates pass. Service-role only. Lovable cannot directly create credentials.

### Approval Checklist

- [x] I approve TASK-0049 for execution.
- [x] I approve the stated acceptance criteria.
- [x] I understand this is a trust-boundary task — credential creation is backend-controlled only.
- [x] I understand any required migration must be documented and separately approved before application.
- [x] I understand wallet signing and PassKit issuance remain out of scope (TASK-0050).

### Notes

- Not approved: PassKit/wallet provider calls, Apple/Google wallet certificate setup, production launch, risk acceptance, Done decision.

---

## APPROVAL-0015 — TASK-0040 and TASK-0048 Complete / Passed

**Date:** 2026-06-02  
**Approved By:** David  
**Related Task:** TASK-0040, TASK-0048  
**Decision:** Complete / Passed  

### Summary

David approved marking both TASK-0040 and TASK-0048 as complete/passed:

```text
david approves marking both as complete/passed
```

### Approval Checklist

- [x] I approve TASK-0040 as Complete / Passed.
- [x] I approve TASK-0048 as Complete / Passed.
- [x] I understand the documented QA deferrals remain pre-production gaps.
- [x] I understand this does not approve production launch unless separately documented.

### Notes

- TASK-0040 pre-production gap: real Stripe checkout test through Lovable using Stripe test card `4242 4242 4242 4242`.
- TASK-0048 pre-production gap: live RapidAPI end-to-end test before production use.
- This approval does not approve Stripe live-mode cutover, live Stripe product/pricing changes, credential issuance launch, wallet issuance launch, production launch, or broader risk acceptance.

---

## APPROVAL-0014 — TASK-0048 Approved for Execution

**Date:** 2026-06-02
**Approved By:** David
**Related Task:** TASK-0048
**Decision:** Approved

### Summary

David approved TASK-0048 for execution:

```text
0048 approved
```

TASK-0048 — Re-instrument ID.me-First License Lookup Flow. Covers re-sequencing the license lookup step to occur before `/confirm-info`, adding name-only fallback search support, and any required Migration J, new/revised Edge Functions, and flow-doc updates.

### Approval Checklist

- [x] I approve TASK-0048 for execution.
- [x] I approve Migration J, new/revised Edge Functions, and flow-doc updates within the documented spec scope.
- [x] I understand that Migration J application, function deployment, and production-impacting config changes still require documented review before execution.

### Notes

- Claude must not apply Migration J or deploy functions without first documenting the migration SQL, files changed, and deployment steps for review.
- Codex QA is required before TASK-0048 is treated as accepted for downstream credential issuance work.
- This approval does not approve production launch, credential issuance, wallet issuance, or live Stripe changes.

---

## APPROVAL-0013 — TASK-0040 Reconfirmed for Execution

**Date:** 2026-06-02
**Approved By:** David
**Related Task:** TASK-0040
**Decision:** Approved (reconfirmation of APPROVAL-0011)

### Summary

David reconfirmed TASK-0040 for execution this session:

```text
0040 approved for execution
```

TASK-0040 — Implement Stripe Subscription State and Entitlement Gating. Original approval on record as APPROVAL-0011 (2026-06-01). This entry records David's explicit reconfirmation at session start.

### Notes

- Approved scope unchanged from APPROVAL-0011: checkout/session creation, webhook idempotency, subscriptions/payments persistence, server-side entitlement checks, subscription lapse handling, audit/event records — test mode only.
- Not approved: Stripe live-mode cutover, live product/pricing changes, production launch, credential/wallet launch, annual plans, coupons, institutional/employer billing, additional license purchase flow.
- Any migration, secret change, or Edge Function deployment must be documented before execution.

---

## APPROVAL-0012 — Standing Approval Lanes Approved

**Date:** 2026-06-02  
**Approved By:** David  
**Related Task:** N/A  
**Decision:** Approved with Notes  

### Summary

David approved the proposed operating changes to reduce bottlenecks:

```text
all suggestions approved
```

The approved workflow creates standing approvals for low-risk recurring work, allows bounded batch approvals, and preserves explicit hard gates for production-impacting or Done/risk decisions.

### Approval Checklist

- [x] Standing approvals are approved for read-only checks, draft task specs, handoff packets, Lovable prompts, non-execution activity-log updates, read-only Supabase/GitHub checks, read-only side agents, implementation/QA planning, and approved workflow documentation.
- [x] Batch approvals may be used when David approves a bounded work package with explicit "approved" and "not approved" scope.
- [x] Hard gates remain required for migrations, deployments, secrets, RLS/live grants, Stripe live-mode/product/price changes, wallet certificates/private keys, credential/wallet launch, production launch, risk acceptance, Done decisions, closing tasks/issues, and moving deferred features into launch scope.
- [x] Chat approvals must be recorded in GitHub before downstream agents rely on them.

### Notes

- This approval does not approve any individual task execution beyond the standing lanes.
- If classification is unclear, agents must treat the action as a hard gate and request David approval.

---

## APPROVAL-0011 — TASK-0040 Approved for Execution

**Date:** 2026-06-01  
**Approved By:** David  
**Related Task:** TASK-0040  
**Decision:** Approved with Notes  

### Summary

David approved TASK-0040:

```text
I approve 0040
```

This approval clears the prior "awaiting David approval" blocker for TASK-0040 Stripe subscription/payment state and entitlement gating implementation.

### Approval Checklist

- [x] I approve TASK-0040 for execution.
- [x] I approve the stated acceptance criteria.
- [x] I approve the stated out-of-scope items.
- [x] I understand Stripe secrets must remain server-side only.
- [x] I understand Stripe live-mode cutover remains out of scope unless separately approved.

### Notes

- Claude may implement checkout/session creation or approved subscription start flow, webhook idempotency, `subscriptions`/`payments` persistence, server-side entitlement checks, subscription lapse handling, and audit/event records.
- Paid entitlements must only activate from server-confirmed Stripe payment/subscription state.
- Client navigation or Stripe return URLs must not activate paid entitlements.
- This approval does not approve Stripe live-mode cutover, live product/pricing changes, production launch, credential/wallet issuance launch, annual plans, coupons, institutional billing, employer billing, or additional license purchase flow.
- Any concrete migration, secret change, Edge Function deployment, or production-impacting Stripe configuration must still be documented for review.

---

## APPROVAL-0010 — TASK-0047 Approved to Proceed

**Date:** 2026-06-01  
**Approved By:** David  
**Related Task:** TASK-0047  
**Decision:** Approved with Notes  

### Summary

David approved proceeding to TASK-0047 after TASK-0046 live re-QA v10 passed:

```text
approved proceeding to 0047
```

This approval clears the prior "pending David approval" blocker for TASK-0047 review/execution planning.

### Approval Checklist

- [x] I approve proceeding to TASK-0047.
- [x] I understand TASK-0045 has passed Codex re-QA for downstream backend work.
- [x] I understand TASK-0046 live re-QA v10 has passed for the backend gate.
- [x] I understand TASK-0040 Stripe subscription/payment state remains pending separate approval.
- [x] I understand any concrete migration, production-impacting deployment, live Stripe setup, or live Twilio production enablement still requires its own documented approval path.

### Notes

- Claude may revise TASK-0047 into an executable route/state matrix and implementation plan.
- TASK-0047 must update the phone-success transition to advance to `plan`, not `license`.
- TASK-0047 must keep Stripe responsibilities aligned to TASK-0040 and must not activate paid entitlements from client navigation or Stripe return URLs.
- This approval does not approve production launch, credential issuance, wallet issuance, live Stripe product/payment changes, live Twilio production enablement, or any unreviewed migration.

---

## APPROVAL-0009 — TASK-0046 Migration H Approved

**Date:** 2026-06-01  
**Approved By:** David  
**Related Task:** TASK-0046  
**Decision:** Approved with Notes  

### Summary

David approved applying Migration H for TASK-0046:

```text
I approve Migration H
```

Migration H hardens `public.complete_license_verification(...)` by recreating the RPC with locked `search_path`, server-side validation, revoked public/anon/authenticated execute grants, and `service_role`-only execute.

David also corrected the RapidAPI provider contract: RapidAPI documentation says `POST /verify` returns a full structured license record with `status`, issue date, expiration date, and discipline data when exposed by the state board. David provided this example response:

```json
{
  "state": "TX",
  "license_number": "751234",
  "full_name": "JANE A SMITH",
  "license_type": "RN",
  "license_status": "Active",
  "issue_date": "2015-06-12",
  "expiration_date": "2026-08-31",
  "discipline": [],
  "source_url": "https://www.bon.texas.gov/..."
}
```

### Approval Checklist

- [x] I approve applying `supabase/migrations/migration_h_license_verification_harden.sql`.
- [x] I understand Migration H changes live RPC privileges and validation.
- [x] I understand `license-lookup` still requires a source update before redeploy because the current checked-in function expects a `results[]` response shape and does not read top-level `license_status`.
- [x] I understand live Codex re-QA is still required after Migration H application and `license-lookup` redeployment.

### Notes

- Migration H approval does not by itself approve redeploying the current `license-lookup` source as-is.
- Claude should update `license-lookup` to use the documented RapidAPI `POST /verify` response shape and `license_status` field before redeploy.
- The prior Codex open blocker "provider does not return status" is superseded by David's provider-contract correction, but the implementation must be reconciled to that contract.

---

## APPROVAL-0001 — TASK-0001 Approved for Execution

**Date:** 2026-05-24  
**Approved By:** David  
**Related Task:** TASK-0001  
**Decision:** Approved  

### Summary

David confirmed TASK-0001 — Create Foundational Documentation Templates.

### Approval Checklist

- [x] I approve this task for execution.
- [x] I approve the creation of foundational documentation templates and supporting logs.
- [x] I understand this is documentation-governance work only.

### Notes

Approval captured from David’s confirmation: “TASK-0001 — Create Foundational Documentation Templates CONFIRMED.”

---

## APPROVAL-0002 — TASK-0002 Approved for Execution

**Date:** 2026-05-24  
**Approved By:** David  
**Related Task:** TASK-0002  
**Decision:** Approved  

### Summary

David confirmed TASK-0002 — Decompose Product Attributes Blueprint into Canonical Feature Docs.

### Approval Checklist

- [x] I approve this task for execution.
- [x] I approve decomposing the Product Attributes Blueprint into canonical feature, flow, and architecture docs.
- [x] I understand this is documentation and architecture-planning work only.

### Notes

Approval captured from David’s confirmation: “TASK-0002 — Decompose Product Attributes Blueprint into Canonical Feature Docs CONFIRMED.”

---

## APPROVAL-0003 — Charter v1.4 Amendment Approved

**Date:** 2026-05-24  
**Approved By:** David  
**Related Task:** N/A — Charter Amendment  
**Decision:** Approved  

### Summary

David approved the v1.4 charter update covering Claude-direct assignment spec stubs, minimal/full startup read scope, David substitution for Codex on Class B code-touching work when Codex is unavailable, the `Ready for Codex Retrospective Review` status, and PM-level MVP architecture guidance.

### Approval Checklist

- [x] I approve Claude-direct assignment spec stubs.
- [x] I approve minimal vs full startup read scope.
- [x] I approve David substitution for Codex approval on Class B code-touching work when Codex is unavailable.
- [x] I approve adding Ready for Codex Retrospective Review as a task status.
- [x] I approve updating the charter to v1.4.

### Notes

The main charter full-file replacement was blocked by the GitHub connector safety layer. The approved v1.4 rules were captured in `/docs/team_charter/TEAM_CHARTER_V1_4_AMENDMENT.md` and should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future maintenance task.

---

## APPROVAL-0004 — Charter v1.5 Amendment Approved

**Date:** 2026-05-24  
**Approved By:** David  
**Related Task:** N/A — Charter Amendment  
**Decision:** Approved  

### Summary

David approved the v1.5 charter update establishing GitHub label-based routing for Codex, Claude, and David because Claude does not have a GitHub username.

### Approval Checklist

- [x] I approve GitHub label-based routing instead of `@mentions` for Claude.
- [x] I approve assignment labels: `assigned: codex`, `assigned: claude`, `assigned: david`.
- [x] I approve response-needed labels: `needs: codex-review`, `needs: claude-response`, `needs: david-approval`.
- [x] I approve status labels: `status: blocked`, `status: ready-for-review`, `status: ready-for-codex-qa`, `status: ready-for-david-review`.
- [x] I approve adding this rule to the active charter as v1.5.

### Notes

The approved v1.5 rules were captured in `/docs/team_charter/TEAM_CHARTER_V1_5_AMENDMENT.md` and should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future maintenance task.

---

## APPROVAL-0005 — Charter v1.7 Amendment Approved

**Date:** 2026-05-24
**Approved By:** David
**Related Task:** N/A — Charter Amendment
**Decision:** Approved

### Summary

David approved the v1.7 charter update establishing Claude's authority to create GitHub pull requests for approved tasks, approved remediation work, and approved Class B work. Defines PR content requirements, routing label requirements, Codex PR review scope, and merge authority rules.

### Approval Checklist

- [x] I approve Claude PR creation authority for approved tasks, remediation, and Class B work.
- [x] I approve the required PR content fields (Task ID, spec, criteria, summary, files, tests, deviations, risks).
- [x] I approve routing labels: `assigned: codex`, `needs: codex-review`, `status: ready-for-codex-qa` for approved work.
- [x] I approve draft PR + `assigned: david` / `needs: david-approval` / `status: blocked` for unapproved-scope work.
- [x] I approve Codex PR review scope (scope, architecture, security/RLS, data/integration, design-system, criteria, QA).
- [x] I confirm Claude may not merge or self-approve PRs.
- [x] I confirm David remains final approver for Done and merge decisions.

### Notes

v1.6 was already committed (scheduled triage agents). This amendment is captured as v1.7 in `/docs/team_charter/TEAM_CHARTER_V1_7_AMENDMENT.md` and should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future maintenance task.

---

## APPROVAL-0006 — Charter v1.8 Amendment Approved

**Date:** 2026-05-24  
**Approved By:** David  
**Related Task:** N/A — Charter Amendment  
**Decision:** Approved  

### Summary

David approved the v1.8 charter update establishing the `C` / `c` handshake for the repo-visible Codex/Claude review loop.

### Approval Checklist

- [x] I approve `C` / `c` as David’s manual immediate trigger for the GitHub review loop.
- [x] I approve that `C` in Codex means Codex must re-scan GitHub, review items assigned to Codex, and respond in the repo-visible thread.
- [x] I approve that `C` in Claude means Claude must inspect repo-visible Codex feedback, act on every item, update GitHub, and report status.
- [x] I approve that `C` never means continue from memory and always means read GitHub first.
- [x] I approve that `C` does not authorize new Class A work, merge, deployment, migration, risk acceptance, or Done decisions.

### Notes

The approved v1.8 rules were captured in `/docs/team_charter/TEAM_CHARTER_V1_8_AMENDMENT.md` and should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future maintenance task.

---

## APPROVAL-0007 — TASK-0003 Approved for Execution

**Date:** 2026-05-25  
**Approved By:** David  
**Related Task:** TASK-0003  
**Decision:** Approved  

### Summary

David approved TASK-0003 — Create PassTo PRD v0.1 and MVP Task Backlog, incorporating Claude feedback directly.

### Approval Checklist

- [x] I approve this task for execution.
- [x] I approve creating `/docs/prd/PASS_TO_PRD.md`.
- [x] I approve creating `/docs/tasks/MVP_TASK_BACKLOG.md`.
- [x] I approve incorporating Claude PRD outline feedback directly.
- [x] I understand this is documentation and planning work only, not implementation authorization.

### Notes

Approval captured from David’s confirmation: “TASK-0003 — Create PassTo PRD v0.1 and MVP Task Backlog, incorporating Claude feedback directly APPROVED.”

---

## APPROVAL-0008 — TASK-0004 Approved for Execution

**Date:** 2026-05-25  
**Approved By:** David  
**Related Task:** TASK-0004  
**Decision:** Approved  

### Summary

David approved TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map as a documentation/architecture task.

### Approval Checklist

- [x] I approve this task for execution.
- [x] I approve creating `/docs/tasks/TASK-0004.md`.
- [x] I approve creating `/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`.
- [x] I approve defining Lovable, Supabase, and Vercel MVP responsibility boundaries.
- [x] I understand this is documentation and architecture-planning work only, not implementation authorization.

### Notes

Approval captured from David’s confirmation: “TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map Approved” and follow-up instruction: “restart creating TASK-0004 as a documentation/architecture task, then add the responsibility map that defines what Lovable, Supabase, and Vercel each own for MVP.”

---

## APPROVAL-0026 — TASK-0065 Remediation Approve-With-Modifications (Codex)

**Date:** 2026-06-02
**Approved By:** Codex (technical), David (relayed)
**Related Task:** TASK-0065 remediation; spawns TASK-0066
**Decision:** Approve With Modifications

### Summary

Codex reviewed Claude's proposed correction of TASK-0065 after an in-session misdiagnosis left the Supabase Auth URL Configuration in a half-state. Codex approved the App-domain Site URL target with modifications: replace `app.passtodigital.com/**` wildcard with exact production paths, add enrollment-domain redirects so the Enrollment Lovable project's auth callbacks land on their own domain, and route Edge Function CORS changes to a separate approved task because they are outside TASK-0065's approval boundary.

### Approval Checklist

- [x] Approve Supabase Site URL `https://app.passtodigital.com` (post-onboarding nurse app).
- [x] Approve redirect allow-list of exact production paths only (no broad wildcards):
  - `https://app.passtodigital.com/update-password`
  - `https://app.passtodigital.com/reset-password`
  - `https://app.passtodigital.com/dashboard`
  - `https://enroll.passtodigital.com/post-login`
  - `https://enroll.passtodigital.com/id-verification`
- [x] Approve Lovable enrollment project (`d279ccd3-…`) `emailRedirectTo` correction targeting `enroll.passtodigital.com/post-login` (or `/id-verification` fallback) at every Supabase Auth call site.
- [x] Approve Lovable app project (`9a223cc4-…`) `resetPasswordForEmail` `redirectTo` set to `https://app.passtodigital.com/update-password`.
- [x] Approve client-side post-`signInWithPassword` routing based on profile/onboarding state, not Site URL fallback.
- [x] Route Edge Function CORS allow-list changes to a separate task (TASK-0066) requiring its own David approval.

### Notes

Codex verdict text was relayed by David in the Claude session. Codex referenced Supabase Redirect URLs documentation, Supabase `redirectTo` troubleshooting, and Supabase password reset docs as sources for the wildcard guidance.

This approval covers:

- Supabase Auth URL Configuration change for project `wvzjfxacykgsaffskgtr` (applied 2026-06-02 — verified Total URLs: 5).
- Lovable instruction prompts produced for both the enrollment and app projects.
- Documentation updates to TASK-0065, ACTIVITY_LOG, and this APPROVALS_LOG.

This approval explicitly does NOT cover:

- Edge Function source changes, redeployments, or CORS allow-list updates (route to TASK-0066).
- Database migrations, RLS, secrets.
- Production launch, task Done decisions, or issue closure.
- Broad wildcard redirect allow-list entries beyond trusted PassTo domains.

---

## APPROVAL-0027 — TASK-0066 Execution Approved (CORS Update + Redeploy)

**Date:** 2026-06-02
**Approved By:** David (relayed in Claude session)
**Related Task:** TASK-0066
**Decision:** Approved — Option A for token-verify

### Summary

David approved TASK-0066 execution after a live `/dashboard` load on `app.passtodigital.com` failed with "Something went wrong" and Claude diagnosed the root cause as `dashboard-status` Edge Function CORS still returning `access-control-allow-origin: https://enroll.passtodigital.com`. APPROVAL-0026 explicitly excluded Edge Function changes, requiring this separate approval.

For the `token-verify` CORS sub-decision flagged in the TASK-0066 spec (Option A lock to app.passtodigital.com vs Option B keep `*`), David chose **Option A** per Claude's recommendation.

### Approval Checklist

- [x] Approve `dashboard-status` CORS allow-origin change to `https://app.passtodigital.com`.
- [x] Approve `share-link-create` CORS allow-origin change to `https://app.passtodigital.com`.
- [x] Approve `token-verify` CORS allow-origin change to `https://app.passtodigital.com` (Option A — locked to App domain, NOT keep `*`).
- [x] Approve push to GitHub `main` before deployment.
- [x] Approve redeploy of all 3 functions to Supabase project `wvzjfxacykgsaffskgtr` (verify_jwt preserved per function).
- [x] Approve live CORS preflight verification.

### Execution Trail

Initial deploy was applied 2026-06-02 (commits `b7c760cb`, `e828de23`, `e0835dca`; deploys: dashboard-status v4, share-link-create v2, token-verify v4). David subsequently directed a rollback (deploy versions v5/v3/v5) based on an initial misattribution of the dashboard fix to a Lovable publish event. Edge Function logs evidence then demonstrated the CORS fix was the actual unblocker, and David authorized re-apply of the same TASK-0066 policy. Final live state matches Option A as originally approved: dashboard-status v6, share-link-create v4, token-verify v6.

The re-apply did not require a new approval — it restored the originally-approved final state, just via a longer path.

### Notes

Live CORS preflight verified post-deploy for all 3 functions: `access-control-allow-origin: https://app.passtodigital.com` returned for `Origin: https://app.passtodigital.com` requests. `token-verify` POST without auth returned `400 missing_token` confirming `verify_jwt` remained `false` throughout.

This approval explicitly does NOT cover:

- Database migrations, RLS, secrets.
- Other Edge Function changes (beyond the 3 named).
- Production launch, task Done decisions, or issue closure.
- Broadening any allow-list beyond the App domain.
- Frontend launch-readiness items surfaced during QA (see `LOVABLE_PROMPT_2026-06-02_APP_LAUNCH_READINESS.md`).

Codex QA on the implementation remains required before TASK-0066 can be marked Done. End-to-end share-link → verifier exercise blocked on Lovable applying the Share Credential button wiring (see launch-readiness prompt).

---

## APPROVAL-0028 — QA-003 Remediation: SHARE_LINK_BASE_URL Supabase Secret Set

**Date:** 2026-06-03
**Approved By:** David (applied directly during QA run)
**Related Task:** QA-003 (share-link-create returning wrong host in share_url)
**Decision:** Applied — Supabase secret configured

### Summary

During the 2026-06-03 manual E2E QA run, QA finding QA-003 identified that the
`share-link-create` Edge Function was returning `share_url` values pointing to
`https://passtodigital.com/v/…` (the marketing domain) rather than
`https://app.passtodigital.com/v/…` (the App domain where `/v/:token` is
deployed). The root cause was the Supabase secret `SHARE_LINK_BASE_URL` not
being set, causing the function to fall through to its hardcoded default
(`https://passtodigital.com/v`).

David set the secret directly in the Supabase dashboard during the QA run.
No Edge Function code change or redeployment was required — the function
reads the env var fresh on each invocation.

### Approval Checklist

- [x] Confirmed root cause: `SHARE_LINK_BASE_URL` secret absent from project
  `wvzjfxacykgsaffskgtr`.
- [x] Set `SHARE_LINK_BASE_URL = https://app.passtodigital.com/v` in Supabase
  project secrets.
- [x] Verified: new share link generated after secret set shows
  `https://app.passtodigital.com/v/…` host (QA Agent confirmed via URL pattern).
- [x] Verified: prior token exercised end-to-end by rewriting host; verifier
  flow confirmed working (QA-A7, QA-A8, QA-A9 all passed).

### Notes

This approval covers the secret configuration change only. It does not cover:

- Any Edge Function source changes (none were made).
- Production launch or task Done decisions.
- Changes to the hardcoded default in function source (recommend updating
  source default to `https://app.passtodigital.com/v` as a belt-and-suspenders
  fix in a future Lovable/Edge Function cycle — not required given secret is
  now set).

Codex should verify the secret is present and correct in the Supabase project
secrets list as part of QA-003 codex_verification_requested review.
