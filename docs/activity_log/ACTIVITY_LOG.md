# PassTo Activity Log

This log records meaningful PassTo operating activity, approvals, closeouts, blockers, and handoffs.

---

## TASK-0072 Approved for Wallet Provider Configuration - 2026-06-05 - David / Codex

**Task:** TASK-0072 — Configure and Verify Apple and Google Wallet Pass Issuance
**Status:** Approved - Ready for Provider Configuration and Live Wallet QA
**Approval Record:** APPROVAL-0034
**Files Updated:** `docs/tasks/TASK-0072.md`, `docs/design_system/WALLET_PASS_DISPLAY_SPEC.md`, `docs/tasks/PRD_PHASE_04_CREDENTIAL_WALLET_TASK_LIST.md`, `docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md`, `docs/tasks/PRD_SECTION_07_MASTER_TASK_LIST.md`, `docs/activity_log/APPROVALS_LOG.md`, `docs/activity_log/ACTIVITY_LOG.md`

### Summary

David approved TASK-0072 execution and the wallet pass display specification after Codex built the actual Apple PassKit pass layout and mirrored Google Wallet display payload.

### Approval Boundary

Approved: Apple Wallet / PassKit credential configuration, Google Wallet issuer/service-account configuration, required Vercel environment variables, required Supabase Edge Function secrets, deployment/redeployment of wallet signing routes and `wallet-issue` if needed, and test-mode or launch-readiness wallet issuance against an approved disposable credential.

Not approved: production launch, broader risk acceptance, permanent QR/barcode embedding, committing secrets or raw provider credentials, Stripe live-mode changes, or unrelated task/issue closure.

### Next Required Action

Proceed with TASK-0072 provider setup and live wallet QA when the required Apple, Google, Vercel, Supabase, and disposable test credential inputs are available.

---

## TASK-0072 Wallet Provider Bring-Up Task Created - 2026-06-05 - Codex

**Task:** TASK-0072 — Configure and Verify Apple and Google Wallet Pass Issuance
**Status:** Spec Drafted - Awaiting David Approval
**Files Updated:** `docs/tasks/TASK-0072.md`, `docs/tasks/PRD_PHASE_04_CREDENTIAL_WALLET_TASK_LIST.md`, `docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md`, `docs/tasks/PRD_SECTION_07_MASTER_TASK_LIST.md`, `docs/activity_log/ACTIVITY_LOG.md`

### Summary

David identified that PassTo had not yet fully rigged up actual Apple Wallet and Google Wallet pass issuance. Codex confirmed that TASK-0050 created the source scaffolding and contract, but real provider issuance remained deferred pending wallet certificates, Google issuer setup, Vercel environment configuration, Supabase secrets, deployment, and end-to-end verification.

### Next Required Action

David approval is required before TASK-0072 execution because the work involves certificate/private-key handling, Google service account credentials, Vercel environment variables, Supabase secrets, and wallet-provider launch posture.

---

## TASK-0061, TASK-0062, and TASK-0063 Done Approval - 2026-06-05 - David / Codex

**Tasks:** TASK-0061, TASK-0062, TASK-0063
**Status:** Done / Passed - David Approved
**Approval Record:** APPROVAL-0033
**Files Updated:** `docs/tasks/TASK-0061.md`, `docs/tasks/TASK-0062.md`, `docs/tasks/TASK-0063.md`, `docs/tasks/PRD_PHASE_06_STRIPE_ENTITLEMENTS_TASK_LIST.md`, `docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md`, `docs/activity_log/APPROVALS_LOG.md`, `docs/activity_log/ACTIVITY_LOG.md`

### Summary

David approved TASK-0061, TASK-0062, and TASK-0063 as Done after Codex re-QA/final review.

### Scope Confirmed Done

- TASK-0061: subscription management and cancellation-flow source-level remediation passed Codex re-QA.
- TASK-0062: MVP-vs-GA tier reconciliation passed Codex re-QA.
- TASK-0063: entitlement/lapse ops visibility passed Codex final review.

### Approval Boundary

This approval does not approve TASK-0064 Done, production launch, Stripe live-mode cutover, live Stripe product/price changes, issue closure outside the named tasks, or risk acceptance beyond the named task scopes.

---

## TASK-0060 Passed After Real Stripe Checkout and Idempotency Re-QA - 2026-06-04 - Codex

**Task:** TASK-0060 — Reconcile Stripe Checkout End-to-End Readiness
**Status:** Complete / Passed - David Approved
**Approval Record:** APPROVAL-0032
**Files Updated:** `docs/tasks/TASK-0060.md`, `docs/tasks/PRD_PHASE_06_STRIPE_ENTITLEMENTS_TASK_LIST.md`, `docs/activity_log/QA_FINDINGS_LOG.md`, `docs/activity_log/APPROVALS_LOG.md`, `docs/activity_log/ACTIVITY_LOG.md`

### Summary

Codex re-QA verified the real Standard Stripe test checkout through Lovable, webhook persistence, profile advancement, and duplicate webhook idempotency. David approved TASK-0060 as Passed / Done.

### Evidence

| Check | Result |
|---|---|
| Test profile | `payment-pending@passtodigital.test` / `2a703241-8e7f-4f79-9727-2a3809cc0566` |
| Final profile step | `selfie` |
| Subscription | `sub_1TeiXkAxxYwftEABIFUaGs8l`, active, Standard, 1 entitlement |
| Payment | `subscription_start`, succeeded, 999 cents |
| Stripe event | `evt_1TeiXlAxxYwftEABuYocF2ge`, processed, no error |
| Duplicate resend | Stripe delivery `wc_1Tej5xAxxYwftEABpxPqshI9` returned `{ "received": true, "duplicate": true }` |
| Duplicate side effects | Still one subscription, one payment, one `subscription_start` |

### Remaining Notes

- Stale Lovable plan copy/pricing should be cleaned up outside TASK-0060.
- `subscriptions.current_period_end` was null in the verified row; track under TASK-0061 / TASK-0063 subscription management and lapse behavior.

### Approval Boundary

This pass does not approve Stripe live-mode cutover, production launch, broad risk acceptance, or unrelated issue/task closure.

---

## Lovable JWT Integration Issue Discovered During TASK-0060 Checkout Test - 2026-06-04 (Evening) - Claude

**Task:** TASK-0060 — Reconcile Stripe Checkout End-to-End Readiness
**Status:** Execution blocked on Lovable integration issue
**Files Updated:** `docs/tasks/TASK-0060.md`

### Summary

Payment-pending test persona was successfully created via seed harness and user authenticated with magic link. However, when attempting to call `stripe-checkout-create` Edge Function from Lovable, the request returns 401 Unauthorized because **the JWT from the magic-link session is not being passed in the Authorization header** by Lovable's Supabase client.

### What Worked

✅ Seed harness successfully created all 14 personas, including payment-pending  
✅ Magic-link authentication working correctly  
✅ User session valid at page level  
✅ /payment route accessible and responsive  
✅ Stripe secrets, Edge Functions, and database all correctly configured  

### The Blocker

❌ Lovable → Supabase Edge Function call is missing Authorization header  
❌ stripe-checkout-create receives 401 Unauthorized  
❌ Frontend shows: "You must be signed in to subscribe"  

### Investigation Required

Lovable team needs to review:
1. How `passtoSupabase.functions.invoke()` passes JWT to Edge Functions
2. Whether magic-link sessions are properly recognized by Lovable's Supabase client
3. Authorization header construction in function invocation logic
4. Potential session/auth state mismatch between Lovable and Supabase

### Path Forward

Once Lovable JWT passing is fixed, TASK-0060 can be completed with:
1. Use payment-pending persona (already seeded and verified)
2. Authenticate with magic link
3. Navigate to /payment
4. Complete Stripe checkout with test card
5. Verify webhook updates

---

## Payment-Pending Persona Added to Seed Harness - 2026-06-04 (Late Afternoon) - Claude

**Tasks:** TASK-0044 (extension), TASK-0060 (unblock)
**Status:** QA infrastructure enhancement complete
**Files Updated:** `scripts/seed-dev-test-personas.ts`, `docs/tasks/TASK-0044.md`, `docs/tasks/TASK-0060.md`

### Summary

Added repeatable, documented dev-only test infrastructure for Stripe checkout testing. The new `payment-pending` persona addresses the QA infrastructure gap identified during TASK-0060 investigation.

### How to Use for TASK-0060 Testing

```bash
# Create/reset payment-pending test persona
deno run --allow-env --allow-net scripts/seed-dev-test-personas.ts --apply

# Output will include magic link or generated password
# Use the printed credentials to sign in to Lovable
# Navigate to /payment → complete Stripe checkout with test card 4242 4242 4242 4242
```

### Persona Details

- **Email:** `payment-pending@passtodigital.test`
- **onboarding_step:** `payment`
- **subscription_tier:** `standard`
- **All upstream gates:** Verified (identity, phone, license)
- **Sign-in method:** Magic link (printed on seed run, never committed)

### Benefits

✅ Repeatable and documented  
✅ Hard-guarded against production  
✅ No passwords or secrets committed  
✅ Supports unlimited QA/development re-runs  
✅ Within TASK-0044 approved scope  

---

## TASK-0060 Authentication Blocker Identified - 2026-06-04 (Afternoon) - Claude

**Task:** TASK-0060 — Reconcile Stripe Checkout End-to-End Readiness
**Status:** Blocked on user authentication
**Blocker Type:** Supabase Auth JWT unavailable in Lovable
**Files Updated:** `docs/tasks/TASK-0060.md`

### Summary

Claude positioned test profile into payment-ready state (`onboarding_step = payment`, `subscription_tier = standard`) and verified Edge Function readiness. All infrastructure is in place: `stripe-checkout-create` is live v13, all Stripe secrets are configured, and the database profile is correctly positioned.

However, the user cannot authenticate into Lovable to initiate the Stripe checkout because Supabase Auth JWT generation is failing. Edge Function logs show all recent POST requests from Lovable return 401 Unauthorized.

### Root Cause

1. Password-based login does not work (previous password hash compatibility issue)
2. Password recovery email API is returning "Unable to process request"
3. Frontend provides no login form; redirect loops to ID.me flow

### Blocking Path Forward

User authentication must be re-established before real Stripe checkout can be exercised. Unblock requires one of:
- User re-enrolls through ID.me flow (but license lookup may fail per user report)
- Password recovery email is fixed and new password set
- Direct admin session generation is explicitly approved by David

---

## TASK-0060 Live Recheck - 2026-06-04 - Codex

**Task:** TASK-0060 — Reconcile Stripe Checkout End-to-End Readiness
**Status:** Still blocked — payment-step test profile not present
**Approval Record:** APPROVAL-0031
**Files Updated:** `docs/tasks/TASK-0060.md`, `docs/activity_log/ACTIVITY_LOG.md`

### Summary

After David reported Stripe and Supabase were updated, Codex rechecked the live backend state.

`stripe-checkout-create` exists and is live as ACTIVE v13 with `verify_jwt: true`. The deployed function expects `STRIPE_CLIENT_SECRET`, `STRIPE_PRICE_STANDARD`, and `STRIPE_PRICE_PREMIER`. `stripe-webhook` remains ACTIVE v8 with `verify_jwt: false`.

### Blocker

The documented checkout test email exists, but its live profile is still:

```text
onboarding_step = identity
subscription_tier = free
id_verification_status = unverified
id_verification_level = null
```

No profile currently satisfies the payment-step gate required by `stripe-checkout-create`.

### Correction

The prior local TASK-0060 note claiming the test profile was checkout-ready was not supported by live Supabase state and has been corrected. Plaintext test credentials must not be committed to GitHub docs.

### Next Recommended Action

Route a disposable test nurse through Lovable onboarding to Standard/Premier, or explicitly approve a controlled SQL/test-harness update that positions a disposable test profile at `payment`.

---

## TASK-0060 Execution Attempt Blocked - 2026-06-04 - Codex

**Task:** TASK-0060 — Reconcile Stripe Checkout End-to-End Readiness
**Status:** Blocked — Payment-step test profile required
**Approval Record:** APPROVAL-0031
**Files Updated:** `docs/tasks/HANDOFF_PACKET_2026-06-04_TASK0060.md`, `docs/tasks/TASK-0060.md`, `docs/tasks/PRD_PHASE_06_STRIPE_ENTITLEMENTS_TASK_LIST.md`, `docs/activity_log/ACTIVITY_LOG.md`

### Execution Summary

Codex performed the approved TASK-0060 execution prep and live-state verification, but could not complete a real Stripe Checkout because the live Supabase project currently has no eligible authenticated paid-plan profile at `onboarding_step = payment`.

### Evidence

| Check | Result |
|---|---|
| `stripe-checkout-create` | ACTIVE v7, `verify_jwt: true` |
| `stripe-webhook` | ACTIVE v8, `verify_jwt: false` |
| `payment-status` | ACTIVE v5 |
| `payments.action_type` constraint | Includes `subscription_start` and `subscription_renewal` |
| Payment-ready profiles | 0 |
| Subscriptions | 0 rows |
| Payments | 0 rows |
| Stripe events | 21 prior fixture/replay rows; no new real checkout evidence |

### Blocker

TASK-0060 requires a real checkout for a real Supabase profile/session. No current live profile is at `onboarding_step = payment` with a paid `subscription_tier`, and Codex did not have an approved/authenticated paid-plan session to call `stripe-checkout-create`.

### Approval Boundary

No profile was mutated, no Stripe resource was created, no webhook was replayed, no live-mode Stripe setting was changed, and the task was not marked passed/Done.

### Next Recommended Action

Create or route a disposable test nurse to the paid-plan payment step, preferably through Lovable onboarding or a sanctioned `payment-pending` dev persona, then rerun TASK-0060 checkout with Stripe test card `4242 4242 4242 4242`.

---

## Phase 5 / Phase 6 David Approvals - 2026-06-04 - David / Codex

**Task:** TASK-0055, TASK-0057, TASK-0058, TASK-0059, TASK-0060, TASK-0061, TASK-0062, TASK-0063
**Status:** Phase 5 partial closeout recorded; Phase 6 TASK-0060 through TASK-0063 approved for execution
**Approval Record:** APPROVAL-0031
**Files Updated:** `docs/tasks/TASK-0055.md`, `docs/tasks/TASK-0057.md`, `docs/tasks/TASK-0058.md`, `docs/tasks/TASK-0059.md`, `docs/tasks/TASK-0060.md`, `docs/tasks/TASK-0061.md`, `docs/tasks/TASK-0062.md`, `docs/tasks/TASK-0063.md`, `docs/tasks/PRD_PHASE_05_DASHBOARD_SHARE_LINK_TASK_LIST.md`, `docs/tasks/PRD_PHASE_06_STRIPE_ENTITLEMENTS_TASK_LIST.md`, `docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md`, `docs/activity_log/APPROVALS_LOG.md`, `docs/activity_log/ACTIVITY_LOG.md`

### Decision

David approved:

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

TASK-0055, TASK-0057, and TASK-0058 are complete for their documented scopes. TASK-0059 is Pass/Done for the recorded Phase 5 QA evidence task.

TASK-0060, TASK-0061, TASK-0062, and TASK-0063 are approved for execution within their task scopes.

TASK-0056 was not included and remains awaiting David review / TASK-0062 MVP entitlement reconciliation. TASK-0064 was not included and remains awaiting David approval.

### Approval Boundary

This does not approve production launch, launch risk acceptance, Stripe live-mode changes, live Stripe product/price changes, deferred Show QR/PDF/additional-license/employer-dashboard scope, TASK-0056 Done, TASK-0064 execution/Done, or issue closure.

### Next Recommended Action

Claude/Codex should execute the approved Phase 6 work in dependency order, beginning with TASK-0060 checkout evidence and TASK-0062 MVP/GA reconciliation.

---

## MVP Scope Clarification - 2026-06-04 - David / Codex

**Task:** TASK-0062 — Reconcile GA Tier Features Against MVP PRD
**Status:** MVP Scope Clarified — Awaiting Reconciliation Spec
**Approval Record:** APPROVAL-0030
**Files Updated:** `docs/features/TIER_FEATURES.md`, `docs/features/SUBSCRIPTION.md`, `docs/features/SHARING.md`, `docs/features/REFRESH.md`, `docs/features/PDF_EXPORT.md`, `docs/flows/PAYMENTS.md`, `docs/tasks/TASK-0062.md`, `docs/tasks/PRD_PHASE_06_STRIPE_ENTITLEMENTS_TASK_LIST.md`, `docs/tasks/TASK-0064.md`, `docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md`, `docs/activity_log/APPROVALS_LOG.md`, `docs/activity_log/ACTIVITY_LOG.md`

### Decision

David clarified:

```text
My decision is to stick with the PRD. The TIER_FEATURES.md is for complete products, General Availability, not MVP.
```

### Interpretation

The PRD controls MVP launch-critical and deferred scope. `TIER_FEATURES.md` is a complete-product / GA tier reference and must not be used to authorize MVP implementation of PRD-deferred capabilities.

APPROVAL-0029 is superseded for MVP implementation purposes by APPROVAL-0030.

### Approval Boundary

This records a documentation and scope clarification only. It does not approve implementation, migrations, Edge Function deployments, Stripe live-mode changes, live Stripe products/prices, secret changes, Lovable UI changes, production launch, task Done, issue closure, or risk acceptance.

### Next Recommended Action

Codex should produce a focused reconciliation spec for TASK-0062 that verifies MVP dashboard/share-link entitlement behavior follows the PRD, while preserving `TIER_FEATURES.md` as the GA reference.

---

## Free-Tier Paid Action Policy Decision - 2026-06-04 - David / Codex

**Task:** TASK-0062 — Resolve Free-Tier Paid Action Entitlement Policy
**Status:** Superseded for MVP by APPROVAL-0030
**Approval Record:** APPROVAL-0029; superseded for MVP implementation by APPROVAL-0030
**Files Updated:** `docs/tasks/TASK-0062.md`, `docs/tasks/PRD_PHASE_06_STRIPE_ENTITLEMENTS_TASK_LIST.md`, `docs/activity_log/APPROVALS_LOG.md`, `docs/activity_log/ACTIVITY_LOG.md`

### Decision

David confirmed:

```text
Free tier can share, generate QR code, refresh and pdf export for $1.99
```

### Interpretation

Free-tier nurses may use the following as $1.99 one-time paid actions:

- Share link / verifier access token.
- Show QR verifier access.
- On-demand refresh.
- PDF export.

Payment-gated action execution must remain backend-controlled. Lovable must not directly create verifier tokens, complete refresh state, generate PDFs, insert payment records, or mark Stripe payment truth.

### Reconciliation Needed

Current TASK-0056 / Phase 5 share-link behavior must be reconciled against PRD MVP entitlement rules. The $1.99 Free-tier paid-action policy belongs to GA / complete-product scope unless separately reopened for MVP.

### Approval Boundary

This records the product/pricing decision only. It does not approve implementation, migrations, Edge Function deployments, Stripe live-mode changes, live Stripe products/prices, secret changes, Lovable UI changes, production launch, task Done, issue closure, or risk acceptance.

### Next Recommended Action

Codex should produce a TASK-0062 reconciliation handoff/spec covering PRD-controlled MVP entitlement behavior, GA documentation boundaries, dashboard states, and QA cases for ensuring GA-only paid actions are not treated as MVP launch blockers.

---


## Charter Amendment v1.10 - Contract Integration Gates - 2026-06-03 - Codex

**Scope:** Add QA protocol amendment after TASK-0055 exposed a backend/frontend contract integration test gap.  
**Approval / Authority:** David explicitly instructed Codex to add the amendment to the charter.  
**Files Updated:** `docs/team_charter/TEAM_CHARTER_V1_10_AMENDMENT.md`, `docs/team_charter/TEAM_CHARTER.md`, `docs/team_charter/DEFINITION_OF_DONE.md`, `docs/team_charter/README.md`

### Rule Added

When backend and frontend work are decoupled, backend QA and frontend QA are not sufficient for task closeout if the backend response controls frontend routing, user eligibility, entitlement state, shareability, credential visibility, or cross-domain handoff.

QA must exercise the backend response through the deployed frontend and verify the final user-visible behavior, including exact final URL/domain when a flow crosses domains.

### Triggering Lesson

TASK-0055 dashboard QA verified backend gate behavior and later UI behavior, but missed the integrated flow where `dashboard-status` returns `403 onboarding_not_complete` and the App frontend must route to Enrollment rather than a local App onboarding route.

### Approval Boundary

This is a documentation-only workflow update that records an approved operating rule. It does not implement code, deploy, migrate, change secrets, alter live state, mark any task Done, close any issue, approve production launch, or accept risk.

## Phase 5 / App Task Status Reconciliation - 2026-06-03 - Codex

**Scope:** Reconcile task-file statuses with GitHub-recorded manual E2E QA, Codex verification, and launch-readiness evidence.  
**Approval / Authority:** David requested task status updates; documentation-only status reconciliation under standing approval lanes.  
**Files Updated:** 'docs/tasks/TASK-0055.md', 'docs/tasks/TASK-0056.md', 'docs/tasks/TASK-0057.md', 'docs/tasks/TASK-0058.md', 'docs/tasks/TASK-0059.md', 'docs/tasks/TASK-0065.md', 'docs/tasks/TASK-0066.md', 'docs/tasks/PRD_PHASE_05_DASHBOARD_SHARE_LINK_TASK_LIST.md'

### Statuses Recorded

| Task | Updated status |
|---|---|
| TASK-0055 | Live UI QA Verified - Awaiting David Review |
| TASK-0056 | Live E2E Exercised - Awaiting David Review |
| TASK-0057 | Live Verifier Flow Exercised - Awaiting David Review |
| TASK-0058 | Live UI QA Verified - Awaiting David Review |
| TASK-0059 | QA Evidence Recorded - Awaiting David Review |
| TASK-0065 | Implemented - Live Password Reset Verified, Awaiting David Review |
| TASK-0066 | Implemented - Live CORS and App Flow Verified, Awaiting David Review |
| Phase 5 task inventory | Execution and QA Evidence Reconciled - Awaiting David Review |

### Evidence Basis

- Manual E2E QA and post-deployment verification entries in 'docs/activity_log/ACTIVITY_LOG.md'.
- Finding statuses in 'docs/activity_log/QA_FINDINGS_LOG.md', including Codex verification for QA-001, QA-002, QA-007, QA-009, QA-010, and QA-011.
- Live/source evidence previously recorded by Codex for App route titles, dashboard/share UI, CORS preflights, share-link source, and token verification source.

### Approval Boundary

This reconciliation does not mark any task Done, close any issue, publish a final QA-pass decision, approve production launch, accept risk, deploy, migrate, change secrets, change RLS, or alter live Supabase/Vercel/Stripe/wallet state. David review / Done decisions remain the next gate.

### Next Recommended Action

David reviews the reconciled task statuses and either approves targeted Done/QA-pass closeout decisions or requests a focused re-check for any task whose evidence is still insufficient.

## Codex Verification of Manual E2E QA Findings — 2026-06-03 — Codex

**Scope:** Verify applied findings QA-002, QA-003, QA-007, QA-010, and QA-011 against source/live evidence.  
**Approval / Authority:** David requested publish after QA findings log publication; QA Agent boundaries preserved.  
**Files Updated:** `docs/activity_log/QA_FINDINGS_LOG.md`

### Proposed Status Updates Recorded

| Finding | Recorded status | Evidence summary |
|---|---|---|
| QA-002 | `codex_verified` | Deployed App bundle no longer queries `profiles.license_id`; login handler now uses profile `id` plus separate `licenses` lookup. |
| QA-003 | `applied` | Live `share-link-create` CORS accepts App origin and QA evidence shows App-host share URL. Codex could not independently read the Supabase secret or create a fresh authenticated link because Supabase MCP auth was expired and no test auth token was available. |
| QA-007 | `codex_verified` | Deployed App bundle renders neutral per-provider wallet cards and exact `not_attempted` copy. |
| QA-010 | `codex_verified` | Deployed App bundle renders authenticated `AppHeader` with PassTo wordmark, email chip/menu, and Supabase sign-out action. |
| QA-011 | `codex_verified` | Enroll `/post-login` returns HTTP 200 and deployed bundle routes profile state to enrollment steps or App dashboard. |

### Boundaries

No findings were closed. No QA-pass, Done, risk-acceptance, issue-closure, deployment, migration, secret, Supabase, Stripe, Vercel, wallet-provider, or launch-readiness decision was made. QA-001 and QA-009 remain awaiting Codex verification; QA-004 and QA-005 remain open; QA-006 remains decision-pending; QA-008 remains applied-partial.

---

## TASK-0065 Created — 2026-06-02 — Codex

**Task:** TASK-0065 — Fix Supabase Auth Password Reset Redirect URL  
**Status:** Approved — Awaiting Claude Execution  
**Approval:** APPROVAL-0025  
**Approval Lane:** Hard gate approved by David — Supabase Auth/provider configuration

### Summary

David reported that a received password reset email links to `http://localhost:3000/`. Codex created TASK-0065 for Claude to fix Supabase Auth URL configuration and any necessary Lovable password-reset redirect behavior so reset links use `https://enroll.passtodigital.com`.

### Required Target

| Setting / behavior | Required value |
|---|---|
| Supabase Auth Site URL | `https://enroll.passtodigital.com` |
| Redirect allowlist | include `/reset-password` and `/update-password` on `https://enroll.passtodigital.com` |
| Lovable reset call | explicit `redirectTo` to the live reset/update route if needed |

### Files Updated

- `docs/tasks/TASK-0065.md`
- `docs/activity_log/APPROVALS_LOG.md`
- `docs/activity_log/ACTIVITY_LOG.md`

### Approval Boundary

This records David approval for TASK-0065 execution only. It does not approve production launch, task Done decision, issue closure, database migrations, Edge Function deployments, unrelated secret changes, or broad redirect allowlists outside trusted PassTo domains.

### Next Recommended Action

Claude should execute TASK-0065: capture current Supabase Auth URL settings, apply the approved live-domain reset redirect configuration, verify Lovable redirect behavior, send a test password reset email, and document evidence.

---

## Phase 6 Tasks Created — 2026-06-02 — Codex

**Scope:** PRD Phase 6 — Stripe, Entitlements, and Lapse Behavior  
**Status:** Task specs created — Awaiting David approval for execution  
**Approval Lane:** Standing approval — draft task specs and documentation updates only

### Summary

Codex created the Phase 6 Stripe/entitlement/lapse task set as `TASK-0060` through `TASK-0064` and added a Phase 6 task inventory.

| Phase Item | Task | Status |
|---|---|---|
| 6.1 | TASK-0060 — Reconcile Stripe Checkout End-to-End Readiness | Spec Drafted — Awaiting David Approval |
| 6.2 | TASK-0061 — Define Subscription Management and Cancellation Flow | Spec Drafted — Awaiting David Approval |
| 6.3 | TASK-0062 — Reconcile GA Tier Features Against MVP PRD | MVP Scope Clarified — Awaiting Reconciliation Spec |
| 6.4 | TASK-0063 — Harden Entitlement and Lapse Ops Visibility | Spec Drafted — Awaiting David Approval |
| 6.5 | TASK-0064 — Codex QA Phase 6 Stripe, Entitlements, and Lapse Behavior | Spec Drafted — Awaiting David Approval |

Created `docs/tasks/PRD_PHASE_06_STRIPE_ENTITLEMENTS_TASK_LIST.md` and updated `docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md` so Phase 6 references the new task IDs.

### Relationship to TASK-0040

`TASK-0040` already completed the core Stripe subscription/payment implementation and was marked Complete / Passed by David. The new Phase 6 task set avoids duplicating that work and instead focuses on remaining launch-readiness gaps: real Lovable checkout testing, subscription management/cancellation behavior, Free-tier paid action reconciliation, entitlement/lapse ops visibility, and QA closure.

### Approval Boundary

This task creation does not approve implementation, backend code changes, migrations, deployments, secret changes, Stripe live-mode changes, live Stripe product/price changes, production launch, task Done decisions, issue closure, risk acceptance, or moving deferred paid actions into launch scope.

### Next Recommended Action

David should review the Phase 6 task specs and approve the first task to execute when ready. `TASK-0060` is the recommended first execution gate because it closes the remaining real-checkout evidence gap from `TASK-0040`.

---

## Phase 5 Tasks Created — 2026-06-02 — Codex

**Scope:** PRD Phase 5 — Dashboard and Share-Link Verification  
**Status:** Task specs created — Awaiting David approval for execution  
**Approval Lane:** Standing approval — draft task specs and documentation updates only

### Summary

Codex created the Phase 5 dashboard/share-link/verifier task set as `TASK-0055` through `TASK-0059` and added a Phase 5 task inventory.

| Phase Item | Task | Status |
|---|---|---|
| 5.1 | TASK-0055 — Implement Nurse Dashboard Launch-Critical Status View | Spec Drafted — Awaiting David Approval |
| 5.2 | TASK-0056 — Implement Share-Link Token Creation Function | Spec Drafted — Awaiting David Approval |
| 5.3 | TASK-0057 — Implement Verifier Token Validation Function | Spec Drafted — Awaiting David Approval |
| 5.4 | TASK-0058 — Implement `/v/{token}` Verifier Flow | Spec Drafted — Awaiting David Approval |
| 5.5 | TASK-0059 — Codex QA Phase 5 Dashboard and Share-Link Verification | Spec Drafted — Awaiting David Approval |

Updated `docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md` so Phase 5 references the new task IDs.

### Relationship to Earlier Drafts

Earlier high-level tasks `TASK-0039`, `TASK-0041`, and `TASK-0042` remain historical Section 3 planning context. The new Phase 5 task set supersedes those broad drafts for execution granularity.

### Approval Boundary

This task creation does not approve implementation, backend code changes, migrations, deployments, secret changes, Stripe live-mode changes, Show QR, PDF export, employer dashboard scope, task Done decisions, issue closure, risk acceptance, credential/wallet launch, or production launch.

### Next Recommended Action

David should review and approve the Phase 5 task specs before Claude execution. Phase 4 status should also be reconciled before Phase 5 depends on Phase 4 as complete.

---

## Phase 4 Task Inventory Sync — 2026-06-02 — Codex

**Scope:** PRD Phase 4 — Credential and Wallet Issuance  
**Status:** Task inventory updated  
**Approval Lane:** Standing approval — documentation/task inventory sync only

### Summary

Codex confirmed that PRD Phase 4 task records already exist as:

| Phase Item | Task | Current Source-of-Truth Status |
|---|---|---|
| 4.1 | TASK-0049 — Implement Credential Creation Gate | Ready for Codex Re-QA — P2 remediated |
| 4.2 | TASK-0050 — Define Wallet Signing and Issuance Contract | Codex QA Complete — Ready for David Review |
| 4.3 | TASK-0051 — Persist Wallet Provider State to Supabase | Codex QA Complete — Ready for David Review |
| 4.4 | TASK-0052 — Implement Success / PassReady Credential Status Flow | Codex QA Complete — Ready for David Review |
| 4.5 | TASK-0053 — Codex QA Phase 4 Credential and Wallet Issuance | Codex QA Complete — Ready for David Review, with TASK-0049 re-QA status to reconcile |

Updated `docs/tasks/PRD_PHASE_04_CREDENTIAL_WALLET_TASK_LIST.md` so the Phase 4 inventory points to the created tasks and no longer presents them as draft-only records.

### Open Reconciliation

`TASK-0053` says Phase 4 QA is complete, but its own task table still lists `TASK-0049` as Ready for Codex Re-QA. The previous session closeout also lists `TASK-0049` re-QA as the next required action before Phase 4 QA closure.

### Approval Boundary

This is a documentation-only inventory sync. It does not approve backend code changes, migrations, deployments, secret changes, wallet provider setup, certificate/private-key handling, credential issuance launch, wallet issuance launch, task Done decisions, issue closure, risk acceptance, or production launch.

### Next Recommended Action

Codex should reconcile whether `TASK-0049` re-QA is still pending or already complete. If pending, run or route the re-QA. If already complete, update `TASK-0049`, `TASK-0053`, and the activity log consistently before routing Phase 4 to David for Done review.

---

## Flow Documentation Update — 2026-06-02 — David / Codex

**Scope:** ID.me-first onboarding Lovable UX  
**Status:** Documentation updated  
**Approval Source:** David instructed Codex to update documentation after giving Lovable the combined `/confirm-info` + OTP behavior.

### Summary

Codex updated the onboarding docs to record the current Lovable UX decision: `/confirm-info` is now the visible combined page where the nurse reviews matched identity/license/contact data, clicks Confirm, receives the Twilio OTP, enters the OTP inline, and proceeds to `/account-select` only after OTP success.

The backend trust states remain separate:

```text
confirm-info-complete → onboarding_step = phone
phone-send-otp        → sends OTP from phone state
phone-verify-otp      → verifies OTP, writes verified phone, advances to plan
```

### Files Updated

- `docs/flows/IDME_FIRST_ONBOARDING.md`
- `docs/tasks/TASK-0048.md`
- `docs/tasks/TASK-0054.md`
- `docs/prd/PASS_TO_PRD.md`

### Approval Boundary

This is a documentation and Lovable UX flow update only. It does not approve backend code changes, migrations, deployments, secret changes, QA pass decisions, task closure, risk acceptance, credential issuance launch, wallet issuance launch, or production launch.

---

## David Completion Approval — 2026-06-02 — David / Codex

**Tasks:** TASK-0040, TASK-0048  
**Status:** Complete / Passed — David Approved  
**Approval Record:** APPROVAL-0015  

David approved marking both tasks as complete/passed:

```text
david approves marking both as complete/passed
```

### Final Task Status

| Task | Status | Key pre-production gap |
|---|---|---|
| TASK-0048 | Complete / Passed — David Approved | Live RapidAPI end-to-end test needed before production |
| TASK-0040 | Complete / Passed — David Approved | Real Stripe checkout test through Lovable with test card `4242 4242 4242 4242` needed before production |

### Approval Boundary

This approval accepts the current QA gates and task statuses. It does not approve Stripe live-mode cutover, live Stripe product/pricing changes, credential issuance launch, wallet issuance launch, production launch, or broader risk acceptance.

---

## Functions Deployed — 2026-06-02 — David / Claude

**Task:** TASK-0048 — Edge Functions deployed  
**Status:** All 5 deployed successfully  
**Project:** `wvzjfxacykgsaffskgtr`

| Function | Status |
|---|---|
| `license-lookup-start` | ✅ Deployed — v1 ACTIVE |
| `license-lookup-status` | ✅ Deployed — v1 ACTIVE |
| `license-lookup-select` | ✅ Deployed — v1 ACTIVE |
| `confirm-info-status` | ✅ Deployed — v1 ACTIVE |
| `confirm-info-complete` | ✅ Deployed — v1 ACTIVE |

All functions use `verify_jwt: true`. No existing functions redeployed.  
**Next:** Codex QA required before TASK-0048 is treated as complete.

---

## Migration Applied — 2026-06-02 — David / Claude

**Task:** TASK-0048 — Migration J applied  
**Status:** Applied successfully — no rows returned  
**Migration:** `migration_j_license_lookups_search_mode.sql`  
**Project:** `wvzjfxacykgsaffskgtr`

Applied via Supabase SQL Editor. Three parts executed:
- Part 1: `license_lookups` extended with `submitted_license_number`, `submitted_state`, `submitted_license_type`, `search_mode`, `candidate_data`, `completed_at`; `lookup_source` default set to null
- Part 2: `profiles_onboarding_step_check` constraint recreated with full step set including `license_checking`, `confirm`, `plan`, `payment`, `selfie`
- Part 3: `complete_license_verification()` RPC updated to advance to `confirm` (not `phone`); accepts `license` or `license_checking` as source steps; service_role grants preserved

**Next:** Deploy 5 Edge Functions, then Codex QA.

---

## QA Result — 2026-06-02 — Claude (Conductor)

**Task:** TASK-0040 — Implement Stripe Subscription State and Entitlement Gating  
**Status:** Codex QA Complete — Ready for David Review  
**Verdict:** QA gate cleared — test-mode replay complete, all findings remediated

### Stripe Test-Mode Replay Results

All 5 required event types confirmed delivered via Stripe CLI Shell and Dashboard resend. `stripe_events` table evidence reviewed in Supabase SQL Editor.

| Event | Outcome |
|---|---|
| Bad signature | ✅ 400 rejected, no row written |
| `checkout.session.completed` | ✅ processed=true, sig verified, non-subscription mode correctly skipped |
| `customer.subscription.created` | ✅ processed=false, hardening throws on missing profile_id |
| `customer.subscription.updated` | ✅ processed=false, same |
| `customer.subscription.deleted` | ✅ processed=true, early return on unknown subscription |
| `invoice.payment_failed` | ✅ processed=true, early return on unknown customer |
| Duplicate resend (same evt_ID) | ✅ One row only — idempotency confirmed |

### Remaining Pre-Production Gap

CLI fixture subscriptions carry no `profile_id` in metadata. Full subscription persistence (creating real `subscriptions`/`payments` rows) requires a real test nurse going through Stripe checkout in the Lovable test environment with card `4242 4242 4242 4242`. Required before production launch, not blocking the current QA gate.

**Next Owner:** David — review + Done decision  
**Hard gates remain:** production launch, live-mode cutover, live Stripe product/pricing changes, credential/wallet launch, risk acceptance, task closure.

---

## Remediation — 2026-06-02 — Claude

**Task:** TASK-0040 — Codex QA P1 remediation  
**Status:** Remediated and redeployed — requesting Codex re-QA  
**Commit:** a57b25a

### Codex QA v1 Findings (Blocked)

- P1: `stripe-webhook` deployed with `verify_jwt: true` — Stripe cannot call it
- P1: Entitlement counts wrong (standard: 2, premier: 5 vs DECISION-0010 canonical standard: 1, premier: 2)
- P1: `handleSubscriptionUpsert` could not resolve `profile_id`; `stripe-checkout-create` did not set `subscription_data.metadata`

### Fixes Applied

| Finding | Fix |
|---|---|
| verify_jwt | Redeployed `stripe-webhook` with `--no-verify-jwt` |
| Entitlement counts | Corrected to standard: 1, premier: 2 (DECISION-0010) |
| subscription_data.metadata | `stripe-checkout-create` now sets `subscription_data[metadata][profile_id/plan_name]` |
| handleSubscriptionUpsert | Reads profile_id from sub.metadata, falls back to DB row, skips on unresolvable |

### Redeployed

- `stripe-webhook` — with `--no-verify-jwt`
- `stripe-checkout-create` — updated subscription_data.metadata

**Next Owner:** Codex re-QA

---

## Session Activity — 2026-06-02 — Claude / David

**Task:** TASK-0040 — Implement Stripe Subscription State and Entitlement Gating  
**Status:** Implementation complete — pending Codex QA  
**Project:** `wvzjfxacykgsaffskgtr`

### Deployed

| Item | Status |
|---|---|
| Migration K (`payments.action_type` extended) | ✅ Applied |
| `STRIPE_SECRET_KEY` | ✅ Set in Supabase secrets |
| `STRIPE_PRICE_ID_STANDARD` | ✅ Set in Supabase secrets |
| `STRIPE_PRICE_ID_PREMIER` | ✅ Set in Supabase secrets |
| `STRIPE_WEBHOOK_SECRET` | ✅ Set in Supabase secrets |
| `stripe-checkout-create` | ✅ v1 ACTIVE |
| `stripe-webhook` | ✅ v1 ACTIVE |
| `selfie-complete` | ✅ v1 ACTIVE (deployed in TASK-0047) |
| Stripe webhook endpoint registered | ✅ All 5 events (`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`) |

### Not Applied

- Stripe live-mode cutover — out of scope
- Live Stripe product/pricing changes — out of scope

**Next Owner:** Codex QA  
**Next Required Action:** Codex QA with Stripe test-mode event replay before any downstream payment-dependent gate is treated as complete.

---

## Migration Applied — 2026-06-02 — David / Claude

**Task:** TASK-0040 — Migration K applied  
**Status:** Applied successfully — no rows returned  
**Migration:** `migration_k_payments_action_type.sql`  
**Project:** `wvzjfxacykgsaffskgtr`

Extends `payments.action_type` CHECK constraint to include `subscription_start` and `subscription_renewal`. Required before `stripe-webhook` can process checkout events without constraint violations.

**Next:** Steps 2–5 — Supabase secrets, Stripe products/prices, function deploys, webhook registration.

---

## Session Closeout — 2026-06-02 — Claude

**Role:** Claude — Senior Engineer / Main Conductor  
**Session Date:** 2026-06-02  
**GitHub Checked:** Yes — all changes pushed

---

### Work Completed This Session

#### Approvals Recorded
- APPROVAL-0012 — Standing Approval Lanes (carried from prior session)
- APPROVAL-0013 — TASK-0040 reconfirmed
- APPROVAL-0014 — TASK-0048 approved
- APPROVAL-0015 — TASK-0040 and TASK-0048 marked Complete/Passed by David
- APPROVAL-0016 — TASK-0049 approved
- APPROVAL-0017 — TASK-0050 approved
- APPROVAL-0018 — TASK-0051 approved
- APPROVAL-0019 — TASK-0052 approved

#### TASK-0048 — Re-instrument ID.me-First License Lookup Flow
- Migration J written (3 parts: `license_lookups` extension, `onboarding_step` CHECK constraint, `complete_license_verification()` RPC update to advance to `confirm`)
- Applied Migration J via Supabase SQL Editor
- Deployed 5 Edge Functions: `license-lookup-start`, `license-lookup-status`, `license-lookup-select`, `confirm-info-status`, `confirm-info-complete`
- Codex QA v1: blocked — P1 audit fail-open, P2 candidate validation, P2 step row count
- Remediated all findings, redeployed 3 functions
- Codex re-QA: pass with deferrals — **TASK-0048 marked Complete/Passed by David**
- Lovable prompt written and pasted: `/license-info` update, `/license-checking` new page, `/confirm-info` update, `/phone-check` prefill, progress indicator update

#### TASK-0040 — Stripe Subscription State and Entitlement Gating
- Migration K applied (`payments.action_type` extended for `subscription_start`, `subscription_renewal`)
- Supabase secrets set, Stripe test products/prices created
- `stripe-checkout-create` and `stripe-webhook` deployed
- Stripe webhook registered (5 events)
- Codex QA v1: blocked — P1 `verify_jwt: true`, P1 wrong entitlement counts, P1 `handleSubscriptionUpsert` profile_id gap
- Remediated all P1s, redeployed with `--no-verify-jwt`
- Stripe test-mode replay: all 7 test cases passed (bad sig, 5 event types, duplicate idempotency)
- Codex re-QA: pass with P2 hardening — **TASK-0040 marked Complete/Passed by David**

#### TASK-0049 — Implement Credential Creation Gate
- `credential-create` Edge Function written and deployed (v1)
- No migration needed (credentials table existed)
- Codex QA: P2 — no DB unique constraint on `(profile_id, license_id)`
- Migration L written and applied; `credential-create` v2 handles `23505` idempotently
- Status: **Ready for Codex Re-QA**

#### TASK-0050 — Define Wallet Signing and Issuance Contract
- `WALLET_SIGNING_CONTRACT.md` written (signing boundary, contract, secrets, retry/idempotency)
- `api/sign-apple.js` hardened: internal auth, credential_id input, Supabase data load, deterministic serial
- `api/sign-google.js` hardened: same + QR barcode removed
- `wallet-issue` Edge Function written and deployed (v1)
- Codex QA v1: P1 package.json missing `@supabase/supabase-js`, P1 asset files with " copy" suffix, P1 wallet writes not fail-closed
- All P1s remediated; P2 hardening applied (activation partial state, fail-closed reads)
- Status: **Codex QA Complete — Ready for David Review**

#### TASK-0051 — Persist Wallet Provider State to Supabase
- `success-status` updated from v6 → v8: per-provider wallet state, fail-closed DB reads, status-gated legacy URLs
- Codex QA: P2 read errors + legacy URL gap, both remediated
- Status: **Codex QA Complete — Ready for David Review**

#### TASK-0052 — Success / PassReady Credential Status Flow
- Lovable prompt written: 5 UI states, Phase 4 backend call sequence
- `/pass-ready` → redirect to `/success` (David decision)
- Prompt pasted into Lovable
- Lovable Supabase connection fixed (was pointing to old project `ofpxczstptysqxoruiox` — reconnected to `wvzjfxacykgsaffskgtr`)
- Live test: State 2 ("credential ready, wallet pending") confirmed by David at `enroll.passtodigital.com`
- Status: **Codex QA Complete — Ready for David Review**

#### TASK-0053 — Phase 4 Codex QA
- Status updated to In Progress
- Full finding matrix across TASK-0049–0052 documented
- Status: **In Progress — awaiting TASK-0049 re-QA**

#### TASK-0054
- Confirmed superseded by TASK-0048. Ignored per David instruction.

---

### Files / Docs Changed

**Migrations applied:**
- `migration_j_license_lookups_search_mode.sql` — applied
- `migration_k_payments_action_type.sql` — applied
- `migration_l_credentials_unique.sql` — applied

**Edge Functions deployed:**
- `license-lookup-start` v6, `license-lookup-status` v5, `license-lookup-select` v6
- `confirm-info-status` v5, `confirm-info-complete` v6
- `stripe-checkout-create` v6, `stripe-webhook` v7
- `credential-create` v2, `wallet-issue` v3, `success-status` v8

**GitHub docs:**
- `docs/activity_log/APPROVALS_LOG.md` — APPROVAL-0012 through 0019
- `docs/activity_log/ACTIVITY_LOG.md` — this and all session entries
- `docs/tasks/TASK-0048.md` through `TASK-0054.md` — updated
- `docs/flows/IDME_FIRST_ONBOARDING.md` — route sequence, step table, implementation notes
- `docs/architecture/WALLET_SIGNING_CONTRACT.md` — created
- `docs/tasks/LOVABLE_PROMPT_2026-06-02_TASK0048_LICENSE_CONFIRM_ROUTES.md` — created
- `docs/tasks/LOVABLE_PROMPT_2026-06-02_TASK0052_SUCCESS_PAGE.md` — created
- `api/sign-apple.js`, `api/sign-google.js` — hardened
- `package.json` — `@supabase/supabase-js` added
- `api/assets/icon.png`, `icon@2x.png`, `logo@2x.png` — created (corrected from " copy" originals)

---

### Open Items

| Item | Status | Owner |
|---|---|---|
| TASK-0049 Codex re-QA (Migration L + 23505 path) | ⬜ Requested | Codex |
| TASK-0053 Phase 4 closure QA | ⬜ Awaiting 0049 re-QA | Codex |
| David Done decisions: TASK-0050, 0051, 0052 | ⬜ Ready for review | David |
| Apple Wallet certificate procurement | ⬜ Hard gate | David |
| Google Wallet issuer setup | ⬜ Hard gate | David |
| `WALLET_INTERNAL_SECRET` + `VERCEL_SIGN_APPLE_URL` + `VERCEL_SIGN_GOOGLE_URL` set in Supabase | ⬜ Needed for wallet issuance | David |
| Vercel re-deploy after `package.json` + asset fixes | ⬜ Required for signing routes to work | David |
| End-to-end test through full onboarding flow (live nurse or test persona) | ⬜ Pre-production | David / Claude |
| Real Stripe checkout test (nurse through Lovable → `4242` card) | ⬜ Pre-production gap | David |

---

### Decisions Made

- `/pass-ready` → redirect to `/success`
- Selfie is optional at MVP (`selfie-complete` supports skip)
- Wallet signing boundary: Apple and Google both via Vercel (Node.js)
- No permanent QR in wallet pass
- `credential-create` uses service-role writes (no RPC), deviation documented
- Entitlement counts canonical: Standard = 1 license, Premier = 2 (DECISION-0010)

---

### Risks / Issues

- Wallet signing will fail (503) until Apple/Google credentials and Vercel URLs are configured
- `wallet_activation_partial: true` partial state logged to ops — requires manual credential activation if credential DB write fails after wallet issues
- Race condition for credential idempotency now DB-enforced (Migration L), not function-only
- Vercel `package.json` must be re-deployed for `@supabase/supabase-js` dependency to take effect in production

---

### David Approval Needed

- Done decisions: TASK-0050, TASK-0051, TASK-0052
- TASK-0049 Done decision (after Codex re-QA clears)
- TASK-0053 Phase 4 QA closure Done decision
- Apple Wallet certificate/private key handling (hard gate)
- Google Wallet issuer + service account key (hard gate)
- Production launch (hard gate)

---

### Next Recommended Action

1. Wait for Codex re-QA on TASK-0049
2. After TASK-0049 clears — TASK-0053 Phase 4 QA closes
3. David Done decisions on Phase 4 tasks
4. Begin wallet provider setup (Apple/Google) and Vercel signing deployment
5. End-to-end test through full Lovable onboarding flow

---

### Handoff Notes

Next session should read:
```
docs/team_charter/AGENT_OPERATING_MODEL.md
docs/team_charter/STANDING_APPROVAL_LANES.md
docs/activity_log/ACTIVITY_LOG.md
docs/activity_log/APPROVALS_LOG.md
docs/tasks/TASK-0049.md
docs/tasks/TASK-0053.md
docs/architecture/WALLET_SIGNING_CONTRACT.md
```

All deployed functions are on `wvzjfxacykgsaffskgtr`. Lovable app at `enroll.passtodigital.com` uses `passtoSupabase` client correctly configured to this project.

---

## QA Result — 2026-06-02 — Codex / Claude (Conductor)

**Tasks:** TASK-0050, TASK-0051, TASK-0052  
**Status:** Codex QA Complete — Ready for David Review  
**Verdict:** Pass with deferrals — conductor accepted, P2 items remediated before publishing

Codex proposed pass-with-deferrals on all three tasks. Conductor accepted and fixed all three P2 hardening items before publishing:

| Fix | Deployed |
|---|---|
| `success-status`: credential/wallet/subscription reads now fail closed (503) on DB error | ✅ v8 |
| `success-status`: legacy `wallet_pass_url`/`wallet_provider` now status-gated on `issued` | ✅ v8 |
| `wallet-issue`: credential activation failure now returns `credential_status: pending, wallet_activation_partial: true` | ✅ v3 |

**Remaining documented deferrals (not blocking):** Apple/Google real signing not testable until certificates/issuer configured; Vercel production config not verified by Codex.

---

## Migration Applied — 2026-06-02 — David / Claude

**Task:** TASK-0049 P2 — Migration L applied  
**Migration:** `migration_l_credentials_unique.sql`  
**Project:** `wvzjfxacykgsaffskgtr`  
**Status:** Applied successfully — no rows returned

`unique(profile_id, license_id)` constraint now enforced at DB level. `credential-create` v2 handles `23505` unique violation as idempotent return.

---

## Live Test — 2026-06-02 — David / Claude

**Task:** TASK-0052 — /success page live test  
**Status:** Confirmed working — State 2 (credential ready, wallet pending)

Test profile manually advanced to `pass` step in SQL Editor. Loaded `/success` at `enroll.passtodigital.com`. Loading state displayed, then State 2 confirmed by David. Route guard and `/pass-ready` redirect both working. Wallet signing in error state as expected (Vercel signing not yet configured).

**TASK-0052 status updated to: Implemented and Tested — Ready for Codex QA**

---

## Session Activity — 2026-06-02 — Claude

**Task:** TASK-0052 — Implement Success / PassReady Credential Status Flow  
**Status:** Lovable prompt ready — pending David /pass-ready decision  
**Approval:** APPROVAL-0019

Lovable prompt written for `/success` Phase 4 update. Covers 5 UI states (issued, wallet pending, loading, blocked, suspended). Backend call sequence: success-status → credential-create → wallet-issue → re-poll. No deferred Show QR/share/add-license controls.

**Open decision:** `/pass-ready` route — redirect to /success, alias, or remove. Prompt ready to paste now; /pass-ready handling added after David decides.

**Files created:** `docs/tasks/LOVABLE_PROMPT_2026-06-02_TASK0052_SUCCESS_PAGE.md`

---

## Session Activity — 2026-06-02 — Claude

**Task:** TASK-0051 — Persist Wallet Provider State to Supabase  
**Status:** Implementation complete — pending deployment + Codex QA  
**Approval:** APPROVAL-0018

`success-status` updated to read both Apple and Google `wallet_passes` rows and return per-provider wallet state. Adds `wallet.apple`, `wallet.google`, `wallet.any_issued` fields. Retains legacy `wallet_status`/`wallet_pass_url`/`wallet_provider` for backward compatibility. Ops notification deferred (no email/SMS infrastructure yet).

**Files changed:** `supabase/functions/success-status/index.ts`  
**Next:** Deploy, then Codex QA.

---

## Session Activity — 2026-06-02 — Claude

**Task:** TASK-0050 — Define Wallet Signing and Issuance Contract  
**Status:** Implementation complete — pending deployment + Codex QA  
**Approval:** APPROVAL-0017

Signing boundary: Apple Wallet and Google Wallet both via Vercel (Node.js). `wallet-issue` Edge Function orchestrates, loads from DB, calls Vercel routes with internal auth, writes `wallet_passes`, activates credential. QR barcode removed from Google pass.

**Files created/changed:** `docs/architecture/WALLET_SIGNING_CONTRACT.md`, `api/sign-apple.js` (hardened), `api/sign-google.js` (hardened, QR removed), `supabase/functions/wallet-issue/index.ts`

**Blocking hard gates:** Apple Wallet certificate procurement + Google Wallet issuer setup (David must provide before wallet issuance can work in any environment).

**Next:** Deploy `wallet-issue`, then Codex QA.

---

## Session Activity — 2026-06-02 — Claude

**Task:** TASK-0049 — Implement Credential Creation Gate  
**Status:** Implementation complete — pending deployment + Codex QA  
**Approval:** APPROVAL-0016

`credential-create` Edge Function created. No migration required. Six trust/payment gates enforced. Audit written before credential insert (fail-closed). Idempotent. PassKit not called (TASK-0050 scope).

**Files created:** `supabase/functions/credential-create/index.ts`  
**Next:** David deploys, then Codex QA.

---

## QA Result — 2026-06-02 — Codex / Claude (Conductor)

**Task:** TASK-0048 — Re-instrument ID.me-First License Lookup Flow  
**Status:** Codex QA Complete — Ready for David Review  
**Verdict:** Pass with deferrals — P1/P2 remediation gate cleared

Codex re-QA confirmed all three P1 and two P2 findings from the prior blocked verdict are remediated in deployed source (license-lookup-start v6, license-lookup-select v6, confirm-info-complete v6).

Residual deferrals: no live RapidAPI calls run during QA (source-only); `failLookup()` audit remains non-fatal on failure paths (accepted); DB state advances before success audit in `processVerifyResult` (Edge Function transaction limitation, significantly improved); `lookup_source` NOT NULL schema quirk (deferred); TASK-0048/TASK-0054 label drift (historical).

**Conductor decision:** proposed verdict accepted. TASK-0048 status updated to Codex QA Complete — Ready for David Review.

This is not a production approval, Done decision, or task closure. David approval required for those hard gates.

**Next Owner:** David (review + Done decision)

---

## Remediation — 2026-06-02 — Claude

**Task:** TASK-0048 — Codex QA P1/P2 remediation  
**Status:** Remediated and redeployed — requesting Codex re-QA  
**Commit:** 543d331

### Codex QA v1 Findings (Blocked)

- P1: Audit writes fail-open for terminal transitions in `license-lookup-start` and `confirm-info-complete`
- P2: `license-lookup-select` accepted any license_number without validating against stored candidate list
- P2: `license-lookup-start` multi-candidate path ignored profile step update row count

### Fixes Applied

| Finding | Fix |
|---|---|
| P1 audit fail-open (lookup_success + needs_selection) | Inline audit inserts, return 500 on failure |
| P1 audit fail-open (confirm-info-complete) | Audit written before step advance; failure aborts transition |
| P2 candidate validation | Selected license_number verified against `candidate_data` before /verify |
| P2 step row count | `.single()` result checked; reverts to `failed` + returns 500 on zero rows |

### Redeployed

- `license-lookup-start` — remediated
- `confirm-info-complete` — remediated
- `license-lookup-select` — remediated

**Next Owner:** Codex re-QA

---

## Session Activity — 2026-06-02 — Claude

**Task:** TASK-0048 — Re-instrument ID.me-First License Lookup Flow
**GitHub Checked:** Yes
**Status:** Implementation complete — pending Migration J application + function deployment + Codex QA

### What Was Found

All five new Edge Functions (`license-lookup-start`, `license-lookup-status`, `license-lookup-select`, `confirm-info-status`, `confirm-info-complete`) were already written in a prior session under the label TASK-0054. Migration J (extending `license_lookups`) also existed.

### Critical Issues Fixed

**Issue 1: `complete_license_verification()` RPC advanced to `'phone'`, not `'confirm'`**

Migration H advanced `onboarding_step` to `'phone'` after a successful license match. The prior functions patched this with post-RPC overrides — a race condition risk. Migration J (Part 3) now updates the RPC to advance to `'confirm'` directly and accepts `'license'` OR `'license_checking'` as valid source steps. Post-RPC overrides in the Edge Functions become harmless no-ops.

**Issue 2: `onboarding_step` CHECK constraint missing `'license_checking'` and `'confirm'`**

The v4 baseline CHECK was `('identity', 'phone', 'license', 'pass', 'complete')`. Writes of `'license_checking'` or `'confirm'` would fail. Migration J (Part 2) drops and recreates the constraint with the full step set.

### Files Changed

- `supabase/migrations/migration_j_license_lookups_search_mode.sql` — expanded (Part 2: CHECK constraint, Part 3: RPC update)
- `docs/flows/IDME_FIRST_ONBOARDING.md` — route sequence updated, step table added, implementation notes added
- `docs/tasks/TASK-0048.md` — implementation notes, deviations, production actions, open questions added

### Production Actions Required (David confirmation before each)

1. Apply `migration_j_license_lookups_search_mode.sql` via Supabase SQL Editor
2. Deploy 5 functions: `license-lookup-start`, `license-lookup-status`, `license-lookup-select`, `confirm-info-status`, `confirm-info-complete`
3. Tag Codex for QA

**Next Owner:** David (migration + deployment approval) → Codex QA  
**No existing functions need redeployment.** `phone-send-otp` and all TASK-0047 gate functions are unchanged.

---

## Approvals — 2026-06-02 — David / Claude

**Tasks:** TASK-0048, TASK-0040
**GitHub Checked:** Yes
**Status:** Both tasks approved for execution — approvals recorded

David approved both tasks at session start:

```text
0048 approved
0040 approved for execution
```

- TASK-0048: status updated to `Approved for Execution`. Recorded as APPROVAL-0014.
- TASK-0040: reconfirmed. Recorded as APPROVAL-0013 (original APPROVAL-0011 remains authoritative).

### Approval Boundaries

**TASK-0048:** Migration J, new/revised Edge Functions, and flow-doc updates are within approved scope. Migration application and function deployment still require documented review before execution.

**TASK-0040:** Stripe test-mode implementation approved. No live-mode cutover, live product/pricing, production launch, or credential/wallet launch. Any migration or deployment must be documented before execution.

**Next Owner:** Claude
**Next Required Action:** Begin TASK-0040 implementation (Stripe checkout, webhook, subscriptions/payments schema, entitlement reads). In parallel, draft TASK-0048 Migration J and Edge Function plan. Surface both to David before any Supabase action.

---

## Workflow Approval — 2026-06-02 — Codex

**Task:** Standing approval lanes and David bottleneck reduction  
**GitHub Checked:** Yes  
**Status:** Approved by David and recorded  
**Summary:** David approved the proposed operating model for reducing bottlenecks: standing approvals for low-risk recurring work, bounded batch approvals for scoped task packages, and explicit hard gates for production-impacting work, risk acceptance, Done decisions, and launch posture.

### Files Created / Updated

- `docs/team_charter/STANDING_APPROVAL_LANES.md`
- `docs/activity_log/APPROVALS_LOG.md`
- `docs/activity_log/ACTIVITY_LOG.md`

### Approval Boundary

- This workflow approval does not approve individual task execution beyond the documented standing lanes.
- Hard gates remain required for migrations, deployments, secrets, RLS/live grants, Stripe live-mode/product/price changes, wallet certificates/private keys, credential/wallet launch, production launch, risk acceptance, Done decisions, closing tasks/issues, and moving deferred features into launch scope.

**Next Owner:** Codex / Claude  
**Next Required Action:** Use standing approvals for low-risk recurring work, use batch approvals for bounded packages, and request David approval at hard gates.

---

## Workflow Update — 2026-06-02 — Codex

**Task:** Shared PassTo agent operating model  
**GitHub Checked:** Yes  
**Status:** Added shared workflow docs — approved by David  
**Summary:** David approved adding shared agent workflow docs to GitHub so Claude, Codex, Lovable handoffs, and side agents can use the same conductor, QA-agent, skills, and handoff-packet model. Codex created the approved docs in `docs/team_charter/`.

### Files Created

- `docs/team_charter/AGENT_OPERATING_MODEL.md`
- `docs/team_charter/HANDOFF_PACKET_TEMPLATE.md`
- `docs/team_charter/PASSTO_SKILLS_GUIDE.md`

### Approval Boundary

- This workflow update does not approve any task execution, migration, deployment, live Stripe change, credential issuance, wallet issuance, or production launch.
- Claude and Codex should use the shared docs for future task handoffs and agent coordination.

**Next Owner:** David / Claude / Codex  
**Next Required Action:** David updates the Claude new-session prompt to reference the new shared docs; Codex and Claude use handoff packets before execution, QA, Lovable prompts, or complex side-agent work.

---

## Task Creation — 2026-06-02 — Codex

**Task:** PRD Phase 4 Credential and Wallet Issuance  
**GitHub Checked:** Yes  
**Status:** Draft tasks created — awaiting David approval before execution  
**Summary:** Codex created the Phase 4 credential/wallet task set as TASK-0049 through TASK-0053 and added a Phase 4 master task list. The tasks split credential creation, wallet signing contract, wallet provider state persistence, Success/PassReady status UX, and Codex QA into separate approval-ready work items.

### Files Created

- `docs/tasks/PRD_PHASE_04_CREDENTIAL_WALLET_TASK_LIST.md`
- `docs/tasks/TASK-0049.md` — Implement Credential Creation Gate
- `docs/tasks/TASK-0050.md` — Define Wallet Signing and Issuance Contract
- `docs/tasks/TASK-0051.md` — Persist Wallet Provider State to Supabase
- `docs/tasks/TASK-0052.md` — Implement Success / PassReady Credential Status Flow
- `docs/tasks/TASK-0053.md` — Codex QA Phase 4 Credential and Wallet Issuance

### Files Updated

- `docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md` — Phase 4 now references TASK-0049 through TASK-0053.

### Approval Boundary

- These task specs do not authorize execution, migration application, wallet certificate/key setup, live wallet provider configuration, live function deployment, credential issuance launch, wallet issuance launch, or production launch.
- David approval is required before Claude executes any Phase 4 implementation task.
- Codex QA remains required before Phase 4 is treated as accepted for downstream Phase 5 work.

**Next Owner:** David / Claude  
**Next Required Action:** David reviews and approves or revises the Phase 4 task set, then Claude executes only the approved next task.

---

## QA Result — 2026-06-01 — Codex

**Task:** TASK-0047 Reorder Phone, Plan, Payment, Selfie, and Success Backend Routing  
**GitHub Checked:** Yes  
**Status:** Passed for remediated backend route-gate scope — TASK-0040 and selfie/pass-ready deferrals remain open  
**Summary:** Codex performed live re-QA after Claude's remediation request. The deployed `plan-select` and `success-status` functions are now v2, the missing `/account-select`, `/payment`, and `/upload-selfie` status gates are deployed, the paid entitlement reader no longer relies on `profiles.subscription_tier` alone, and the `plan-select` optimistic update now fails closed when zero rows are updated.

### Evidence

- Migration I remains applied as `20260601233257 migration_i_harden_phone_verification`.
- `complete_phone_verification(uuid, text)` remains executable only by `postgres` and `service_role`.
- `phone-send-otp` and `phone-verify-otp` remain ACTIVE at v11.
- `plan-select` is ACTIVE at v2 and records `subscription_tier` as selected plan intent, not confirmed entitlement.
- `success-status` is ACTIVE at v2 and derives `can_add_license` only from active `subscriptions` rows with `license_entitlement_count > 1`.
- `account-select-status`, `payment-status`, and `selfie-status` are ACTIVE at v1.
- Edge Function logs check returned no recent errors.

### Remaining Open Items

- Stripe checkout/session creation, webhook confirmation, subscription persistence, and paid step advancement remain TASK-0040 scope.
- Selfie upload mechanics and step advancement from `selfie` remain pending David's selfie requirement decision.
- `/pass-ready` redirect/alias/removal remains pending David decision.
- This QA result does not approve production launch, credential issuance, wallet issuance, live Stripe product/payment changes, or live Twilio production enablement.

**Next Owner:** Claude / David  
**Next Required Action:** Continue with the next approved dependency, most likely TASK-0040 Stripe subscription/payment state, while preserving the documented approval boundaries.

---

## QA Result — 2026-06-01 — Codex

**Task:** TASK-0047 Reorder Phone, Plan, Payment, Selfie, and Success Backend Routing  
**GitHub Checked:** Yes  
**Status:** Blocked — phone remediation mostly passes; payment/route gate findings open  
**Summary:** Codex performed live QA for issue #5 against Migration I and deployed Edge Functions. Migration I is applied, `complete_phone_verification(...)` is service-role only, phone success advances to `plan`, and `phone-send-otp` / `phone-verify-otp` v11 enforce the durable license match gate. TASK-0047 remains blocked for full completion because paid plan selection writes paid `subscription_tier` before Stripe confirmation, and the required `/account-select`, `/payment`, and `/upload-selfie` backend route gates are incomplete or explicitly deferred while the acceptance criteria still require direct-navigation protection.

### Passing Portions

- Migration I applied as `20260601233257 migration_i_harden_phone_verification`.
- `complete_phone_verification(uuid, text)` grants are hardened: only `postgres` and `service_role` have EXECUTE.
- RPC validates active profile, verified ID.me, IAL2, phone step, E.164 phone, and primary license `data_match_passed = true`.
- Phone success now advances `onboarding_step` from `phone` to `plan`.
- `phone-send-otp` v11 and `phone-verify-otp` v11 both check primary license `data_match_passed = true`.
- `phone-verify-otp` post-phone idempotency targets `plan/payment/selfie/pass/complete` and returns `next_step: "plan"` on success.
- `success-status` v1 is a status surface only for `pass` / `complete`.

### Blocking Findings

- P1: `plan-select` writes `profiles.subscription_tier = standard/premier` before Stripe confirmation. Paid entitlement state must come from server-confirmed Stripe subscription/payment state, not client plan selection.
- P1: Required route gates are incomplete or deferred. `plan-select` and `success-status` are deployed, but there is no read-only `/account-select` gate, no `/payment` gate, and no `/upload-selfie` gate while TASK-0047 still requires direct-navigation protection for those routes.
- P2: `plan-select` uses an optimistic `.eq("onboarding_step", "plan")` update guard but does not verify that a row was actually updated before returning success.

**Next Owner:** Claude / David  
**Next Required Action:** Remediate paid entitlement semantics and implement or formally defer each missing route gate, then request Codex re-QA. Phone remediation may remain in place.

---

## Approval / TASK-0040 Stripe — 2026-06-01 — David / Codex

**Task:** TASK-0040 Implement Stripe Subscription State and Entitlement Gating  
**GitHub Checked:** Yes  
**Status:** Approved for execution — Stripe test-mode/MVP implementation scope  
**Summary:** David approved TASK-0040. Codex recorded the approval in `APPROVAL-0011` and updated TASK-0040 from awaiting approval to approved for execution within the documented Stripe subscription/payment state and entitlement gating scope.

### Approval Boundary

- Approved: checkout/session creation or approved subscription start flow, webhook idempotency, `subscriptions`/`payments` persistence, server-side entitlement checks, subscription lapse handling, and audit/event records.
- Not approved by this note: Stripe live-mode cutover, live product/pricing changes, production launch, credential/wallet issuance launch, annual plans, coupons, institutional billing, employer billing, additional license purchase flow, or any undocumented production-impacting configuration.
- Any concrete migration, secret change, Edge Function deployment, or production-impacting Stripe configuration must still be documented with files changed, tests run, deviations, and risks for review.

### Required Direction

- Stripe secrets must stay server-side and out of Lovable.
- Webhooks must verify Stripe signatures and be idempotent through `stripe_events`.
- Paid entitlements must activate only from server-confirmed Stripe payment/subscription state, not from client navigation or Stripe return URLs.
- TASK-0047 may depend on TASK-0040 server-derived payment/entitlement facts and must not create a parallel payment model.

**Next Owner:** Claude  
**Next Required Action:** Implement TASK-0040 within the approved scope, identify any migration/secret/deployment steps, and request Codex QA before downstream payment-dependent gates are treated as complete.

---

## Approval / TASK-0047 Proceed — 2026-06-01 — David / Codex

**Task:** TASK-0047 Reorder Phone, Plan, Payment, Selfie, and Success Backend Routing  
**GitHub Checked:** Yes  
**Status:** Approved to proceed into TASK-0047 spec revision / execution planning  
**Summary:** David approved proceeding to TASK-0047 after TASK-0046 live re-QA v10 passed. Codex recorded the approval in `APPROVAL-0010` and updated TASK-0047 to remove the prior TASK-0045/TASK-0046 dependency blocker while preserving production-impacting approval boundaries.

### Current Dependency State

- TASK-0045: Codex re-QA approved for downstream backend work; P2 production hardening remains tracked.
- TASK-0046: Codex live re-QA v10 passed; backend license/data-match gate satisfied.
- TASK-0040: Stripe subscription/payment state remains `Spec Drafted — Awaiting David Approval`.

### Approval Boundary

- Approved: TASK-0047 spec revision, route/state matrix, implementation planning, and Claude execution within documented scope.
- Not approved by this note: unreviewed migrations, production launch, credential issuance, wallet issuance, live Stripe product/payment changes, live Twilio production enablement, or any payment entitlement activation outside TASK-0040.

### Required 0047 Direction

- Phone verification success must advance `profiles.onboarding_step` from `phone` to `plan`, not `license`.
- `/phone-check`, `/account-select`, `/payment`, `/upload-selfie`, and `/success` need one authoritative server-derived route/state matrix.
- Stripe responsibilities must stay aligned with TASK-0040; paid entitlements must not activate from client navigation or Stripe return URLs.
- `/success` must be a status surface, not proof of credential/wallet issuance.

**Next Owner:** Claude  
**Next Required Action:** Revise TASK-0047 into an executable implementation plan/matrix, identify any required migration or function deployment as a separate approval item, then execute only within the approved scope.

---

## QA Result — 2026-06-01 — Codex

**Task:** TASK-0046 License Info Lookup and ID.me/License Binding  
**GitHub Checked:** Yes  
**Status:** Passed — TASK-0046 backend gate satisfied  
**Summary:** Codex performed live re-QA after Claude's v10 provider `license_type` binding remediation. The deployed `license-lookup` Edge Function is active at version 10 with `verify_jwt = true`, reads provider top-level `license_type`, blocks missing provider type, blocks submitted/provider type mismatch with terminal lookup/audit evidence, and persists the provider type as authoritative after the exact-match check passes.

### Evidence

- GitHub source reviewed: `001aeeb9503f616f5294b8e6e89241861415a48c`.
- TASK-0046 update reviewed: `c2290055fd4334e300d7389bf430f06d9dbfbbac`.
- GitHub issue #3 re-QA request reviewed.
- Supabase live function: `license-lookup` version 10, ACTIVE, `verify_jwt = true`.
- Migration H remains applied: `20260601224646 migration_h_license_verification_harden`.
- `complete_license_verification(uuid, uuid, text, text)` remains executable only by `postgres` and `service_role`; `anon_exec = false`, `authenticated_exec = false`.
- Edge Function logs check returned no errors.
- TASK-0047 has not proceeded.

### Open Risk

- v10 uses exact uppercase license-type matching only. David's RapidAPI examples include `LVN` and `CN`, while current MVP input validation supports `LPN` and `CNA` but not `LVN` or `CN`. This is not blocking TASK-0046 re-QA because the v10 docs explicitly record no alias map as intentional for MVP, but David should approve an alias map or expanded input list before launch if LVN/CN coverage is required.

**Approval Boundary:** This passes TASK-0046 backend re-QA only. It does not approve production launch, credential issuance, wallet issuance, payment flow execution, or downstream production-impacting deployment. David approval remains required for those steps.  
**Next Owner:** David / Claude  
**Next Required Action:** David may approve proceeding to TASK-0047 review/execution planning, with the LVN/CN alias/input risk tracked as a launch-readiness follow-up.

---

## QA Result — 2026-06-01 — Codex

**Task:** TASK-0046 License Info Lookup and ID.me/License Binding  
**GitHub Checked:** Yes  
**Status:** Blocked — provider license type binding remediation required  
**Summary:** Codex performed live re-QA after Migration H was applied and `license-lookup` version 9 was deployed. The prior P1/P2 remediation is materially improved: Migration H is live, the RPC is no longer executable by `anon`/`authenticated`, the deployed function reads RapidAPI top-level `license_status`, missing status fails closed as `Unknown` / `do_not_issue`, and raw provider payload/discipline is not stored in `lookup_response`.

### Remaining Blocker

- P1: RapidAPI returns top-level `license_type`, but deployed `license-lookup` does not bind that provider-returned type to the submitted/stored type. The function validates and stores browser-submitted `license_type`, reads provider `license_type` only into `lookup_response.matched_license_type`, and can advance onboarding when status and name pass even if the provider says the license is a different type.

### Required Before TASK-0046 Can Pass Re-QA

- Parse provider `license_type` into the trusted provider result.
- Normalize submitted and provider license types through an approved alias map.
- Block or fail closed when provider type differs from submitted type, unless David explicitly approves a different source-of-truth rule.
- Write terminal lookup/audit evidence for type mismatch.
- Add QA coverage for license number found with a different license type.

**Residual Test Gap:** Codex did not run a live authenticated end-to-end RapidAPI lookup because no authenticated test session/JWT and live test license were provided in GitHub task docs.  
**Next Owner:** Claude  
**Next Required Action:** Remediate provider `license_type` binding, redeploy `license-lookup`, and request Codex re-QA. TASK-0047 remains blocked.

---

## Approval / Provider Contract Update — 2026-06-01 — David / Codex

**Task:** TASK-0046 License Info Lookup and ID.me/License Binding  
**Status:** Migration H approved; `license-lookup` source revision required before redeploy  
**Summary:** David approved Migration H. David also corrected the RapidAPI provider contract: RapidAPI does return license status via a structured `POST /verify` response, including `license_status`, issue date, expiration date, and discipline data when exposed by the state board.

### David Approval

```text
I approve Migration H
```

### David-Provided RapidAPI Contract

RapidAPI documentation says `POST /verify` verifies by license number and state and returns the full structured license record, including license number, full name, license type, status, issue/expiration dates, and discipline data when exposed.

Example response provided by David:

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

### Codex Interpretation

- Migration H is approved for David/Claude application.
- The current checked-in `license-lookup` source should not be redeployed as-is because it expects a `{ results: [...] }` response shape and reads `match.status`, while David's provider contract is a top-level structured record with `license_status`.
- Claude should revise `license-lookup` before redeploy so it submits the documented `POST /verify` request, reads `license_status`, persists only allowlisted non-sensitive fields, strips `discipline`/unneeded PII from `lookup_response`, and then requests Codex review/re-QA after deployment.

**Next Owner:** Claude / David  
**Next Required Action:** Apply approved Migration H when ready, revise `license-lookup` to the documented RapidAPI contract before redeploy, then tag Codex for live TASK-0046 re-QA. TASK-0047 remains blocked.

---

## C Handshake Result — 2026-06-01 — Codex

**GitHub Checked:** Yes  
**Items Found:** Claude committed TASK-0046 P1/P2 remediation after Codex's remediation direction. The stale Issue #1 still has Codex routing labels, but its scope remains superseded by later task docs and prior C-handshake notes.  
**Action Taken:** Codex reviewed the repo-visible TASK-0046 remediation source: `migration_h_license_verification_harden.sql`, `license-lookup/index.ts`, TASK-0046, and the activity log. Codex recorded a source-level review in TASK-0046.  
**GitHub Updated:** Yes — TASK-0046 updated with "Codex C Handshake Source Review — 2026-06-01".  
**Next Owner:** David  
**Next Required Action:** David approval is required before applying Migration H or redeploying `license-lookup`. After David-approved migration/deployment, tag Codex for live TASK-0046 re-QA. TASK-0047 remains blocked until TASK-0046 live re-QA passes and the provider-status gate is resolved.

### Source Review Summary

Codex found no new source-level blocker in Claude's TASK-0046 remediation against the P1/P2 checklist. Migration H hardens `complete_license_verification(...)` in source, and the remediated Edge Function fails closed when the provider does not return current license status.

This is not live re-QA and does not approve production use. No migration, deployment, merge, Done decision, risk acceptance, or TASK-0047 approval is granted by this C handshake.

---

## Remediation Direction — 2026-06-01 — Codex

**Task:** TASK-0046 License Info Lookup and ID.me/License Binding  
**Status:** Blocked — remediation direction recorded  
**Summary:** Codex translated the TASK-0046 post-deployment QA findings into an ordered remediation handoff for Claude. The direction prioritizes the two P1 blockers: hardening `complete_license_verification(...)` against direct client execution and preventing the RapidAPI adapter from treating provider existence as active/issuable license status.

### Required Before TASK-0046 Re-QA

- Harden or move `complete_license_verification(...)`; revoke `PUBLIC`, `anon`, and `authenticated` execute; grant only service-role access; validate profile/license/status invariants inside the RPC.
- Treat provider responses without current status as `Unknown` / `do_not_issue`, unless David approves a provider/path that proves active status.
- Redact/allowlist `lookup_response` before storage.
- Clear stale `data_match_passed` before each lookup refresh and require current issuable status downstream.
- Make required lookup/audit persistence fail closed or transactional.
- Reconcile implementation docs with actual provider configuration.

**Approval Boundary:** This remediation note does not authorize migration execution, live privilege changes, secret changes, provider/path changes, or Edge Function deployment. David approval is required before any production-impacting action.

**Next Owner:** Claude  
**Next Required Action:** Prepare TASK-0046 remediation SQL/source changes, obtain David approval for any production-impacting step, deploy only after approval, then request Codex re-QA before TASK-0047 proceeds.

---

## QA Result — 2026-06-01 — Codex

**Task:** TASK-0046 License Info Lookup and ID.me/License Binding  
**Status:** Blocked — not production-safe  
**Summary:** Codex performed post-deployment QA against the live `license-lookup` Edge Function and Migration G schema. The Edge Function is active with `verify_jwt = true`, but TASK-0046 is blocked by two P1 issues: the `public.complete_license_verification(...)` SECURITY DEFINER RPC is executable by `anon` and `authenticated`, and the deployed RapidAPI path does not return active/issuable license status while the function synthesizes `Registered` as `Active`.

### Findings

- P1: Revoke/move/harden `complete_license_verification(...)`; it currently bypasses the Edge Function and can advance license onboarding when called directly.
- P1: Do not treat provider existence as active license status. Use a provider/path that returns status, or treat missing status as `Unknown` / `do_not_issue`.
- P2: Redact/allowlist `lookup_response` before storing provider payloads.
- P2: Clear stale `data_match_passed` before each lookup refresh and require current issuable status downstream.
- P2: Make required lookup/audit persistence fail closed or transactional.

**Next Owner:** Claude  
**Next Required Action:** Remediate the P1 findings, deploy the updated function/migration, and ask Codex for TASK-0046 re-QA before TASK-0047 depends on this gate.

---

## Product Decision — 2026-06-01 — David / Codex

**Task:** TASK-0046 License Binding  
**Decision:** Approved MVP DOB mode: `dob_match_mode = name_only`  
**Summary:** Claude asked whether to proceed with name-only matching because FLOW-LICENSE-003 originally specified ID.me DOB vs. license DOB matching, but the live v4 `licenses` table has no DOB column. David/Codex approved the conservative MVP path: do not store or compare DOB for MVP; use ID.me-verified first/last name and server-returned license holder first/last name, persist `dob_match_mode = name_only`, and audit that DOB was not matched.

**Next Owner:** Claude  
**Next Required Action:** Document the schema mapping and implement TASK-0046 using conservative deterministic name-only matching. Do not store ID.me DOB or license DOB unless separately approved.

---

## Task Review / Closure — 2026-06-01 — David / Codex

**Tasks:** TASK-0002, TASK-0003, TASK-0006, TASK-0024  
**Status:** Updated  
**Summary:** David confirmed TASK-0002 and TASK-0003 are done/approved and requested Codex review of TASK-0006 and TASK-0024. Codex approved TASK-0006 as a historical schema/RLS planning baseline, superseded by the v4 migration sequence, and closed TASK-0024 as will-not-do because the old authenticated ID.me Phase 3.1 flow is superseded by TASK-0045.

### Results

- TASK-0002: marked Done / Approved.
- TASK-0003: marked Done / Approved.
- TASK-0006: Codex approved; use v4 migration docs/live schema/current task specs for implementation.
- TASK-0024: closed will-not-do; use TASK-0045 as the canonical ID.me-first backend model.

**Next Owner:** Claude  
**Next Required Action:** Do not treat TASK-0024 or TASK-0025 as blockers. Continue through TASK-0046 and TASK-0047 using TASK-0045.

---

## Task Closure — 2026-06-01 — David / Codex

**Task:** TASK-0025 Phase 3.1 ID.me exchange and Lovable callback wiring  
**Status:** Closed — will not do  
**Summary:** David directed Codex to close TASK-0025. The older authenticated Phase 3.1 ID.me path is superseded by the ID.me-first pre-account backend flow in TASK-0045, which is now Codex QA-approved for downstream backend work.

**Next Owner:** Claude  
**Next Required Action:** Do not use TASK-0025 as a blocker. Continue with TASK-0046 and TASK-0047 using TASK-0045 as the canonical ID.me-first trust model.

---

## Re-QA Approval — 2026-06-01 — Codex

**Task:** TASK-0045 ID.me-first onboarding backend  
**Status:** Approved for downstream backend work; P2/P3 production hardening remains  
**Summary:** David asked Codex to QA TASK-0045 again after the second remediation and deployment. Codex verified live Supabase state: Migration E v3 is applied, `idme-verification-start` is deployed, `idme-exchange-v2` no longer accepts browser `code_verifier`, `create-account` atomically claims attempts, and `onboarding_attempts` now has the required state/PKCE columns, constraints, and service-role-only grants.

### Result

- TASK-0045 P1 blockers are resolved.
- TASK-0046 may proceed against the approved ID.me-first trust model.
- TASK-0047 remains dependent on TASK-0046's durable license/data-match gate.
- Production launch still requires P2/P3 hardening: remove ID.me diagnostic logging, pin the provider response contract, document or replace the browser token-hash handoff, add abuse controls for public pre-account endpoints, and run an end-to-end ID.me sandbox enrollment.

**Next Owner:** Claude  
**Next Required Action:** Begin TASK-0046 revisions/implementation using the verified ID.me-first model, while separately tracking TASK-0045 production hardening.

---

## Re-QA Result — 2026-06-01 — Codex

**Task:** TASK-0045 ID.me-first onboarding backend  
**Status:** Blocked — migration/deployment revision required  
**Summary:** David asked Codex to review TASK-0045 again after Claude's P1 remediation. Codex reviewed the GitHub source, revised Migration E, and live Supabase state. The source direction is improved, but the live deployed functions are still the older insecure `verify_jwt = false` implementations, `idme-verification-start` is not deployed, and the revised Migration E does not fit the live `onboarding_attempts` table.

### Findings

- Live `idme-exchange-v2` still accepts browser-supplied `code_verifier` and lacks server-side state validation.
- Live `create-account` still pre-confirms browser-submitted email and does not atomically claim the attempt.
- Live `onboarding_attempts` lacks `state_hash`, `code_verifier_ciphertext`, `consumed_at`, and `account_creating`.
- Live `onboarding_attempts.idme_subject` and `id_verification_level` are `NOT NULL`, but the new `idme-verification-start` inserts a pre-ID.me `started` attempt before those values exist.
- Revised Migration E uses `expires_at > now()` in a partial index predicate, which must be replaced with explicit expiry state transitions and a valid state-based partial unique index.

**Next Owner:** Claude  
**Next Required Action:** Revise Migration E for the live table shape, then after David approval apply the migration and deploy the remediated functions. Codex re-QA should run again against live schema and deployed function source.

---

## Spec Review — 2026-06-01 — Codex

**Tasks:** TASK-0044 Dev Test Personas, TASK-0046 License Binding, TASK-0047 Phone/Plan/Payment Routing  
**Status:** Spec reviews completed; revisions required before execution approval  
**Summary:** David asked Codex to review and comment on three drafted specs. Codex recorded pre-implementation review notes directly in each task file and updated the task status labels.

### Results

- TASK-0044 direction is approved with required revisions before execution, mainly stronger dev-project guards, allowlist-only cleanup, and ID.me-first persona updates.
- TASK-0046 needs revisions and remains blocked on TASK-0045. Key blockers are the unresolved ID.me-first trust model, live v4 schema mapping, provider contract, and durable license/identity match gate.
- TASK-0047 needs revisions and remains blocked on TASK-0045/TASK-0046. Key blockers are the phone-success transition from `license` to `plan`, an explicit route/state matrix, and Stripe/payment gating alignment with TASK-0040.

**Next Owner:** David / Claude  
**Next Required Action:** David should hold execution approval until the spec revisions are made. Claude should remediate TASK-0045 first, then revise TASK-0046 and TASK-0047 against the final trust-boundary and license-binding model.

---

## C Handshake Result — 2026-05-31 — Codex

**GitHub Checked:** Yes  
**Items Found:** Fresh TASK-0033 Claude remediation commits after Codex QA.  
**Action Taken:** Re-reviewed `phone-send-otp` and `phone-verify-otp` source plus live Supabase Edge Function versions/schema.  
**GitHub Updated:** Pending publish — TASK-0033 updated with Codex Re-QA approval.  
**Next Owner:** Claude / David  
**Next Required Action:** Phase 3.2 QA may proceed when broader onboarding blockers permit it. TASK-0045 remains blocked on the separate ID.me-first security findings.

### Codex Re-QA Summary

TASK-0033 remediation is approved:

- Failed Twilio send attempts now write `notification_events.status = 'failed'`.
- Twilio `expired`, `max_attempts_reached`, and `canceled` map to `code_expired`.
- Supabase insert returned errors are now logged.
- Live functions are `phone-send-otp` v7 and `phone-verify-otp` v7, both ACTIVE with `verify_jwt = true`.

---

## Security Review — 2026-05-31 — Codex

**Task:** TASK-0045 ID.me-first onboarding backend  
**Status:** Security direction approved with constraints; execution still awaiting David approval  
**Summary:** David requested Codex security review for the unauthenticated `idme-exchange-v2` callback, proposed `onboarding_attempts` schema, and Supabase Auth account creation mechanism. Codex recorded the review in TASK-0045.

### Decisions

- `verify_jwt = false` is acceptable only for the pre-account ID.me callback if the function validates an onboarding attempt server-side before any token exchange or write.
- Approved callback validation pattern: server-created `onboarding_attempt`, high-entropy `state`, stored `state_hash`, server-held encrypted/sealed PKCE verifier, S256 PKCE, expiry, single-use consumption, and exact redirect allowlist.
- `onboarding_attempts` is approved directionally but needs constraints beyond a partial active-attempt index, including unique `state_hash`, status checks, expiry/consumption constraints, ID.me subject uniqueness, and service-role-only access.
- `supabase.auth.admin.createUser()` is approved for this flow after ID.me validation and contact confirmation, with service-role-only use and no automatic phone confirmation from ID.me phone.

### Open / Approval Needed

- David approval is still required before Claude executes TASK-0045.
- Claude must provide SQL and Edge Function implementation details before applying migrations or deploying.
- Codex recommends a server-only/private table for onboarding attempts if compatible with project conventions.

---

## C Handshake Result — 2026-05-31 — Codex

**GitHub Checked:** Yes  
**Items Found:** Stale Issue #1 still labeled for Codex; repo-visible TASK-0033 handoff in activity log requesting Codex QA of `phone-send-otp` and `phone-verify-otp`.  
**Action Taken:** Reviewed TASK-0033 Edge Function source and live Supabase state against TASK-0026.  
**GitHub Updated:** Yes — TASK-0033 updated with Codex QA result.  
**Next Owner:** Claude  
**Next Required Action:** Claude remediation for TASK-0033 before Phase 3.2 QA.  

### Codex QA Summary

`phone-send-otp` and `phone-verify-otp` correctly preserve the main trust boundary: phone writes happen only after Twilio approval through the atomic `complete_phone_verification()` RPC.

Codex found changes required before Phase 3.2 QA:

- P2: Twilio send failures do not create `notification_events.status = 'failed'` rows.
- P2: `phone-verify-otp` collapses Twilio terminal statuses such as `expired` and `max_attempts_reached` into `invalid_code`.
- P3: Supabase insert error handling catches thrown exceptions but does not inspect returned `{ error }` values.

Full findings are recorded in `/docs/tasks/TASK-0033.md`.

---

## Session Update — 2026-05-31 — Codex

**Tasks:** ID.me-first onboarding flow proposal; backend task specs TASK-0045 through TASK-0047; Lovable prompt  
**Status:** Documentation updated; implementation tasks drafted awaiting David approval  
**Summary:** David asked Codex to evaluate and document a revised nurse onboarding workflow that starts with ID.me instead of password-first account creation. Codex documented the proposed ID.me-first flow, updated the relevant flow and PRD docs, created Claude backend implementation task specs, and wrote a Lovable prompt for the new pages/UX.

### Proposed Route Sequence

```text
/id-verification
/confirm-info
/license-info
/phone-check
/account-select
/payment
/upload-selfie
/success
```

### Files Updated

- `/docs/flows/IDME_FIRST_ONBOARDING.md`
- `/docs/flows/README.md`
- `/docs/flows/ACCOUNT_CREATION.md`
- `/docs/flows/ID_VERIFICATION.md`
- `/docs/flows/LICENSE_LOOKUP.md`
- `/docs/prd/PRD_SECTION_03_USER_JOURNEYS.md`
- `/docs/prd/PASS_TO_PRD.md`
- `/docs/tasks/PRD_SECTION_03_MASTER_TASK_LIST.md`
- `/docs/tasks/TASK-0045.md`
- `/docs/tasks/TASK-0046.md`
- `/docs/tasks/TASK-0047.md`
- `/docs/tasks/LOVABLE_PROMPT_2026-05-31_IDME_FIRST_ONBOARDING.md`

### Open / Approval Needed

- David approval is required before Claude executes TASK-0045, TASK-0046, or TASK-0047.
- Codex security review is required before implementation because ID.me-first onboarding changes identity/account-linking order.
- Open decisions remain: exact pre-account state model, selfie optional/required status, `/success` vs `/pass-ready` migration path, and support copy for ID.me/license mismatch.

---

## Session Close — 2026-05-28 — Claude

**Tasks:** TASK-0025 sandbox run attempt (step 3.1-7)
**Status:** Sandbox run blocked — email rate limit; session issue diagnosed
**Summary:** Attempted Phase 3.1 sandbox run after Migration D confirmed applied and test account SQL-reset. Run failed at callback: `IdmeCallback.tsx` redirected to `/create-account` because `supabase.auth.getSession()` returned null. Root cause: David navigated directly to `/id-verification` without first authenticating through the Lovable app. Session is only established when the user clicks the magic link from their email inside the Lovable auth flow — not by navigating to a URL directly. Second sign-in attempt hit email rate limit again. Session closed; will retry when rate limit resets.

### To Resume (step 3.1-7)
1. Wait for email rate limit to reset (Supabase default: 3 emails/hour/IP)
2. Go to `https://enroll.passtodigital.com/create-account`
3. Enter test email — request magic link **from the Lovable app**
4. Click the link **in the email** (let it redirect — do not copy/paste the URL)
5. From inside the app (authenticated), navigate to `/id-verification`
6. Click Verify with ID.me → complete sandbox flow → share Edge Function logs

### State at Close
- Migration D: ✅ Applied and verified
- `idme-exchange` v4: ✅ Deployed (function bee0cbf5, ACTIVE)
- Test account: ✅ SQL-reset to `onboarding_step = 'identity'`
- TASK-0025 document: ✅ Updated on GitHub (commit 04583025)
- Sandbox run: ⬜ Pending — resume when rate limit clears

---

## Session Update — 2026-05-28 — Claude

**Tasks:** TASK-0025 Codex Re-QA Remediation (Round 2) + `idme-exchange` v4 deployment
**Status:** v4 deployed; TASK-0025 document updated on GitHub; Migration D pending David; sandbox run pending
**Summary:** Addressed TASK-0025 Codex re-QA round 2 findings (verdict: Blocked — P2 audit non-atomic; P1 doc stale). Deployed `idme-exchange` v4 to Supabase project `wvzjfxacykgsaffskgtr` (function ID `bee0cbf5`, version 4, ACTIVE): Steps 9–11 replaced with single call to `complete_identity_verification()` RPC. Profile update and audit insert now execute in one Postgres transaction (Migration D). `writeAuditOrThrow()` removed; `audit_write_failed` error key no longer emitted; `exchange_failed` idempotency covers the profile-already-advanced case. Updated TASK-0025 document: v4 code block, Codex Re-QA Round 2 section, Migration D SQL + verify query, updated Deviations table. GitHub commit 04583025. Sandbox run (step 3.1-7) blocked by Migration D; email rate limit resolved via Supabase magic link + SQL reset of test account onboarding_step. Also confirmed: David applied 3.1-5a (openid tefca scope) and 3.1-6a (idempotency fallback expand + navigate fix) on 2026-05-28.

### Architecture Decision
- `complete_identity_verification(p_profile_id, p_subject)` — new SECURITY DEFINER Postgres function; atomically sets `id_verification_status = 'verified'`, `id_verification_level = 'IAL2'`, `id_me_subject = p_subject`, `onboarding_step = 'phone'`, and inserts `identity.verification_completed` audit event. Called only by `idme-exchange` Edge Function via service-role client.
- This matches the same atomic pattern established in TASK-0026 Migration C (`complete_phone_verification`).

### Open After This Session
- **David must apply Migration D** — `complete_identity_verification()` RPC — in Supabase SQL Editor (SQL in TASK-0025.md Codex Re-QA Round 2 section)
- After Migration D applied: David to run sandbox flow at `enroll.passtodigital.com/id-verification` using magic link sign-in + SQL-reset test account
- After sandbox run: Claude to review Edge Function logs, pin IAL/subject field names, deploy v5 with exact fields + TEFCA policy validation
- TASK-0026 implementation blocked until TASK-0025 sandbox run passes

---

## Session Update — 2026-05-28 — Claude

**Tasks:** TASK-0026 Codex Re-QA Remediation (Round 2)
**Status:** Spec updated with atomic DB function (Migration C); awaiting David migration approvals
**Summary:** Addressed TASK-0026 re-QA findings (verdict: Approved with required fixes). P2 fix: replaced non-atomic "profile update then audit" pattern with Migration C — `complete_phone_verification()` Postgres function that atomically updates `profiles.phone + onboarding_step = 'license'` and inserts `audit_events` in a single transaction. If RPC fails, neither operation commits. `audit_write_failed` error key removed. Caller-impact check requirement added to Migration A notes. Duplicate failure table rows removed. Acceptance Criteria updated to require Migrations A, B, C (not optional). TASK-0026 updated on GitHub commit be878256.

### Architecture Decision
- `complete_phone_verification(p_profile_id, p_phone)` — new SECURITY DEFINER Postgres function; atomically sets phone + advances step + writes audit. Called only by `phone-verify-otp` Edge Function via service-role client.

### Open After This Session
- David must perform caller-impact check (grep Lovable for `p_phone` before Migration A)
- David must apply Migration A (remove p_phone from RPC)
- David must apply Migration B (add 'phone_verification' to notification_events CHECK)
- David must apply Migration C (create complete_phone_verification() RPC)
- TASK-0025 scope fix (3.1-5a), idempotency fix (3.1-6a), and sandbox run (3.1-7) still pending
- TASK-0027 blocked until TASK-0025 complete AND Migrations A/B/C applied

---

## Session Update — 2026-05-27 — Claude

**Tasks:** TASK-0026 Codex QA Remediation
**Status:** Spec updated; two migration SQLs written; awaiting David action
**Summary:** Addressed TASK-0026 Codex QA findings (verdict: Blocked). P1 trust model gap: `update_own_profile_basic()` accepts `p_phone` allowing nurses to self-write phone without Twilio. Resolution: Migration A removes `p_phone` from the RPC (SQL written; David must approve and apply). Codex selected Option B for `notification_events.related_entity_type`: Migration B adds `'phone_verification'` to CHECK (SQL written). Spec updated for all findings: IAL2 defensive checks in both Edge Functions; `phone-verify-otp` audit fail-closed (same `writeAuditOrThrow` pattern as `idme-exchange`); idempotency now requires phone match before returning `{ verified: true }`. TASK-0026 updated on GitHub commit f9c85ec5.

### Architecture Decision
- `profiles.phone` trust model: write only via service-role (`phone-verify-otp`). `update_own_profile_basic()` will no longer accept `p_phone` after Migration A.
- `notification_events.related_entity_type`: Option B — `'phone_verification'` added via Migration B.

### Open After This Session
- David must review and apply Migration A (remove `p_phone` from RPC) in Supabase SQL Editor
- David must apply Migration B (`'phone_verification'` to notification_events CHECK) in Supabase SQL Editor
- TASK-0025 P1 scope fix (3.1-5a), idempotency fix (3.1-6a), and sandbox run (3.1-7) still pending
- TASK-0026 implementation (TASK-0027) blocked until TASK-0025 complete AND both migrations applied

---

## Session Update — 2026-05-27 — Claude

**Tasks:** TASK-0025 Codex QA Remediation
**Status:** Edge Function v3 deployed; two Lovable actions pending David; sandbox run required for P1.2/P2.1
**Summary:** Addressed TASK-0025 Codex QA findings (verdict: Blocked). P2 fixes deployed to `idme-exchange` v3: RFC 7636 PKCE verifier format validation (43–128 unreserved chars); `writeAuditOrThrow()` for success-path audit fail-closed; improved IAL/subject logic (OIDC-standard `sub` primary, `loa` string fallback, removed non-standard `attributes?.ial`); diagnostic UserInfo logging for sandbox run. Edge Function function ID bee0cbf5, now version 3, ACTIVE. TASK-0025 updated on GitHub commit 088951df. Two items require David Lovable action: 3.1-5a (scope `'openid tefca'`); 3.1-6a (expand idempotency fallback to `audit_write_failed`). Two items remain pending sandbox run (step 3.1-7): P1 IAL/subject field pin; P2 TEFCA policy claim validation.

### Open After This Session
- Step 3.1-5a: David must apply scope fix in Lovable (change scope to `'openid tefca'` in IdVerification.tsx)
- Step 3.1-6a: David must apply idempotency fallback expansion in Lovable (IdmeCallback.tsx)
- Step 3.1-7: David must run sandbox flow at enroll.passtodigital.com/id-verification and share Edge Function logs
- After sandbox run: Claude to pin IAL/subject fields and add TEFCA policy claim validation; redeploy if needed

---

## Session Update — 2026-05-27 — Claude

**Tasks:** TASK-0026 (Phase 3.2 Twilio Phone Verification Spec)
**Status:** Pushed to GitHub — commit f6c52508
**Summary:** Created TASK-0026 — full Phase 3.2 spec for Twilio OTP phone verification. Covers two Edge Functions (`phone-send-otp`, `phone-verify-otp`), Lovable `/verify-phone` two-step UI, schema alignment (no migrations required except optional Option B for `notification_events.related_entity_type`), security boundaries (phone written only after Twilio confirms OTP), audit events (`phone.otp_sent`, `phone.verified`, `phone.otp_failed`, `phone.otp_expired`), and all failure state routing. Open deps: three Twilio secrets (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID) not yet provided. Open decision for Codex: Option A (null) vs Option B ('phone_verification' migration) for notification_events type.

### Open After This Session
- TASK-0026: awaiting Codex QA
- TASK-0025 Phase 3.1 QA (step 3.1-7): David to run sandbox flow at enroll.passtodigital.com/id-verification
- TASK-0024-CODEX-QA: awaiting final Codex approval (all P1/P2/P3 findings addressed)
- TASK-0022-CODEX-QA: awaiting final Codex approval (remediation submitted commit ea986581)
- Twilio secrets: David to obtain from Twilio console before Phase 3.2 implementation

---

## Session Update — 2026-05-27 — Claude

**Tasks:** TASK-0024 (Phase 3.1 spec), TASK-0024-CODEX-QA
**Status:** Both pushed to GitHub
**Summary:** Finalized TASK-0024 Phase 3.1 ID.me spec — marked all open dependencies resolved (sandbox confirmed, IDME_CLIENT_SECRET held by David, redirect URI whitelisted 2026-05-27, P2 deploy URL confirmed). Created TASK-0024-CODEX-QA with 39 verification checks across 9 areas: OAuth flow design, Edge Function process correctness, security boundary compliance, schema alignment, Lovable changes completeness, failure state coverage, audit event compliance, phase scope boundary, and implementation task completeness.

### Open After This Session
- TASK-0024-CODEX-QA: awaiting Codex review
- TASK-0025 (Phase 3.1 implementation): blocked on Codex QA approval + David approval

---

## Session Closeout — 2026-05-27 — Claude

**Task ID:** TASK-0022 — Implement Phase 2 Auth, Profile Init, and Onboarding Routing
**Status:** Complete
**Role:** Claude (QA support) + David (Lovable implementation)
**Summary:** Executed Phase 2 auth wiring across the P2 enrollment Lovable project. Replaced CreateAccount.tsx with v4 Supabase Auth signup, implemented email-confirmation flow with sessionStorage.pendingName pattern, added post-login name completion via update_own_profile_basic() RPC, implemented routeByOnboardingStep() reading profiles.onboarding_step, stubbed /id-verification and IdmeCallback.tsx for Phase 3.1, removed Airtable/Make dead code, and ran Phase 2.4 QA. All QA checks passed.

### Key Deviations from Spec
- Route `/verify-identity` corrected to `/id-verification` throughout (actual App.tsx route)
- IdmeCallback.tsx was already partially stubbed (null cast) — replaced with clean early return
- Old P2 Supabase project `ofpxczstptysqxoruiox` not found (deleted or Lovable-managed) — EF deletion moot
- profiles table cast required in routeByOnboardingStep() (generated types from old project; not regenerated in Phase 2)
- EnrollmentContext license fields (licenseNumber, licenseType, licenseState) remain as empty defaults — Phase 3.3 scope

### Phase 2.4 QA Results
- signup → /confirm-email routing: PASS
- handle_new_user() trigger fires, profiles row created: PASS
- post-login name completion via RPC: PASS
- routeByOnboardingStep() routes identity → /id-verification: PASS
- RLS isolation (anonymous query returns empty): PASS
- No enrollments insert, no sessionStorage.enrollmentId: PASS
- No Make webhook fires: PASS
- Direct UPDATE on profiles.onboarding_step/account_status blocked: PASS

### Deferred to Later Phases
- P1/P3 ENV var updates (2.2-1, 2.2-3): deferred — P2 active client already hardcoded to canonical project
- P2 VITE_WEBHOOK_IDME_CALLBACK removal (2.2-4): deferred
- Phase 3.1: ID.me OAuth wiring in IdVerification.tsx and IdmeCallback.tsx
- Phase 3.2: Twilio OTP, phone collection and verification
- Phase 3.3: Primary license collection page, license lookup Edge Function
- Pre-Phase-3.3: v4_passto_mvp_remediation_r4 (licenses.normalized_status CHECK expansion)

---

## Session Entry — 2026-05-27 — Claude

**Task ID:** TASK-0023 / TASK-0024
**Status:** TASK-0023 Complete; TASK-0024 Proposed
**Role:** Claude
**Summary:** Closed TASK-0023 (Phase 3 prep — all acceptance criteria met, Phase 2 blocker resolved). Created TASK-0024 — Phase 3.1 ID.me Edge Function and Callback Wiring Spec covering: idme-exchange Edge Function design, Lovable IdVerification.tsx and IdmeCallback.tsx changes, schema writes, audit event requirements, failure state routing, security boundaries, and open dependencies. TASK-0024 requires Codex QA before implementation.

### Open Dependencies Before TASK-0024 Implementation
- David must confirm sandbox vs production ID.me environment
- David must provide IDME_CLIENT_SECRET
- David must confirm redirect URI registered with ID.me

---


## Session Closeout — 2026-05-23 — Codex

**Task ID:** N/A — Operating Charter / Documentation System Setup  
**Status:** Done  
**Role:** Codex / Engineering Director  
**Summary:** Created and iteratively updated the PassTo Engineering Team Operating Charter and design-system documentation structure. Established GitHub as the source of truth for AI-team collaboration, task governance, design-system references, startup protocol, and close-of-session protocol.

### Work Completed

- Created `/docs/team_charter/TEAM_CHARTER.md`.
- Updated the charter through v1.3.
- Captured approved canonical documentation folders.
- Captured Option A Claude-GitHub-Codex review/respond workflow with David as final approver.
- Captured Definition of Done and task metadata requirements.
- Added approval classes and GitHub review triggers.
- Added false-assumption escalation and task granularity rules.
- Added blocked approval protocol.
- Added `/docs/design_system/` as a canonical folder.
- Added design-system impact requirements to task metadata and governance rules.
- Created `/docs/design_system/README.md`.
- Updated `/docs/design_system/README.md` to reflect actual asset structure:
  - `/docs/design_system/logos/`
  - `/docs/design_system/screenshots/`
- Added close-of-session protocol to the charter as v1.3.

### Files / Docs Changed

- `/docs/team_charter/TEAM_CHARTER.md`
- `/docs/design_system/README.md`
- `/docs/activity_log/ACTIVITY_LOG.md`

### Decisions Made

- GitHub documentation is the PassTo source of truth.
- Canonical documentation folders are:
  - `/docs/team_charter/`
  - `/docs/prd/`
  - `/docs/architecture/`
  - `/docs/tasks/`
  - `/docs/activity_log/`
  - `/docs/features/`
  - `/docs/flows/`
  - `/docs/design_system/`
- Official startup trigger:
  - `[Codex/Claude], let’s start a new PassTo session.`
- Official close trigger:
  - `[Codex/Claude], close the PassTo session.`
- David remains final approver.
- Codex owns security architecture, specs, QA plans, and architectural review.
- Claude owns execution, implementation notes, deviations, test results, and risk reporting.

### Risks / Issues

- The supporting activity-log files referenced by the charter may still need to be created:
  - `/docs/activity_log/DECISIONS_LOG.md`
  - `/docs/activity_log/RISKS_LOG.md`
  - `/docs/activity_log/APPROVALS_LOG.md`
- The canonical folders may need README files for easier navigation and AI startup review.
- Future sessions must avoid relying on this chat unless the relevant context has been written into GitHub.

### Open Questions

- Should Codex create initial templates for task specs, decision logs, risk logs, and approval logs?
- Should the design-system asset inventory be indexed with exact filenames for easier task references?

### Approval Needed

- No approval needed for this closeout entry.
- Future creation of additional templates may require David approval depending on scope.

### Next Recommended Action

Codex should next create the foundational templates for:

- `/docs/tasks/TASK_TEMPLATE.md`
- `/docs/activity_log/DECISIONS_LOG.md`
- `/docs/activity_log/RISKS_LOG.md`
- `/docs/activity_log/APPROVALS_LOG.md`
- README files for the canonical documentation folders

### Handoff Notes

Next session should begin with:

```text
Codex, let’s start a new PassTo session.
```

Codex should read `/docs/team_charter/TEAM_CHARTER.md`, `/docs/activity_log/ACTIVITY_LOG.md`, and `/docs/design_system/README.md` before recommending next work.

---

## Session Closeout — 2026-05-24 — Codex

**Task ID:** TASK-0001 — Create Foundational Documentation Templates  
**Status:** Ready for David Review  
**Role:** Codex / Engineering Director  
**Summary:** Created foundational task, decision, risk, approval, and folder-navigation documentation templates. Corrected the architecture documentation path so the approved `/docs/architecture/` canonical folder can exist.

### Work Completed

- Created `/docs/tasks/TASK-0001.md`.
- Created `/docs/tasks/TASK_TEMPLATE.md`.
- Created `/docs/activity_log/DECISIONS_LOG.md`.
- Created `/docs/activity_log/RISKS_LOG.md`.
- Created `/docs/activity_log/APPROVALS_LOG.md`.
- Created README files for:
  - `/docs/team_charter/README.md`
  - `/docs/prd/README.md`
  - `/docs/architecture/README.md`
  - `/docs/tasks/README.md`
  - `/docs/activity_log/README.md`
  - `/docs/features/README.md`
  - `/docs/flows/README.md`
- Removed an empty file at `/docs/architecture` that blocked creation of the approved `/docs/architecture/` folder.
- Packaged local copies of the foundational templates.

### Files / Docs Changed

- `/docs/tasks/TASK-0001.md`
- `/docs/tasks/TASK_TEMPLATE.md`
- `/docs/activity_log/DECISIONS_LOG.md`
- `/docs/activity_log/RISKS_LOG.md`
- `/docs/activity_log/APPROVALS_LOG.md`
- `/docs/team_charter/README.md`
- `/docs/prd/README.md`
- `/docs/architecture/README.md`
- `/docs/tasks/README.md`
- `/docs/activity_log/README.md`
- `/docs/features/README.md`
- `/docs/flows/README.md`
- Deleted empty blocking file: `/docs/architecture`

### Decisions Made

- TASK-0001 was approved by David for execution.
- Foundational documentation templates should live inside their canonical folders.
- `/docs/architecture` must be a folder, not an empty file.

### Risks / Issues

- Design-system asset inventory is not yet indexed by exact filename.
- Product, architecture, feature, and flow docs still need substantive content beyond README entry points.

### Open Questions

- Should Codex next create a design-system asset inventory using exact filenames from `/docs/design_system/logos/` and `/docs/design_system/screenshots/`?
- Should the next task focus on PRD/MVP scope or system architecture?

### Approval Needed

- David final Done decision for TASK-0001.

### Next Recommended Action

David should review TASK-0001 and decide Done / Not Done.

Recommended next task after Done:

```text
TASK-0002 — Create PassTo PRD and MVP Scope Baseline
```

Alternative next task:

```text
TASK-0002 — Create Design-System Asset Inventory
```

### Handoff Notes

Next Codex session should begin from:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/tasks/TASK-0001.md
/docs/activity_log/ACTIVITY_LOG.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/RISKS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
```

---

## Session Closeout — 2026-05-24 — Codex

**Task ID:** TASK-0002 — Decompose Product Attributes Blueprint into Canonical Feature Docs  
**Status:** Ready for David Review  
**Role:** Codex / Engineering Director  
**Summary:** Decomposed the Product Attributes Blueprint v1.6 into canonical feature, flow, and architecture documents aligned with the Supabase/Vercel architecture direction. Logged product decisions confirmed by David.

### Work Completed

- Created `/docs/tasks/TASK-0002.md`.
- Created `/docs/features/TIER_FEATURES.md`.
- Created `/docs/features/SHARING.md`.
- Created `/docs/features/REFRESH.md`.
- Created `/docs/features/PDF_EXPORT.md`.
- Created `/docs/features/SUBSCRIPTIONS.md`.
- Created `/docs/features/NOTIFICATIONS.md`.
- Created `/docs/flows/VERIFIER_CREDENTIAL_VIEW.md`.
- Created `/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md`.
- Updated `/docs/activity_log/DECISIONS_LOG.md` with product and architecture decisions.
- Updated `/docs/activity_log/APPROVALS_LOG.md` with TASK-0002 approval.

### Files / Docs Changed

- `/docs/tasks/TASK-0002.md`
- `/docs/features/TIER_FEATURES.md`
- `/docs/features/SHARING.md`
- `/docs/features/REFRESH.md`
- `/docs/features/PDF_EXPORT.md`
- `/docs/features/SUBSCRIPTIONS.md`
- `/docs/features/NOTIFICATIONS.md`
- `/docs/flows/VERIFIER_CREDENTIAL_VIEW.md`
- `/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md`
- `/docs/activity_log/DECISIONS_LOG.md`
- `/docs/activity_log/APPROVALS_LOG.md`
- `/docs/activity_log/ACTIVITY_LOG.md`

### Decisions Made

- Product Attributes Blueprint v1.6 should be decomposed into canonical docs.
- Notifications replaces expiry-alerts as the broader feature scope.
- Sharing and verifier credential view remain separate docs.
- Verifier access uses one-time short-lived tokens.
- Wallet pass does not carry a permanent verification QR.
- Product attribute architecture moves away from Airtable/Make assumptions.
- Status translation system is required.
- Verifier form, disclaimers, and consent copy are confirmed.
- MVP usage pricing and license entitlements are confirmed.

### Risks / Issues

- Final Terms of Use still requires legal/product drafting.
- Subscription pricing remains unconfirmed unless separately approved.
- Exact Supabase schema and RLS policies require a later task.
- Design-system asset inventory remains a separate possible task.
- TASK-0001 and TASK-0002 both still need David final Done decision.

### Open Questions

- Should the next task be Supabase schema/RLS design or PRD/MVP scope baseline?
- Should Free users be allowed to buy additional licenses in MVP, or should additional license be hidden for Free?
- What are final Standard and Premier subscription prices?

### Approval Needed

- David final Done decision for TASK-0002.
- David final Done decision for TASK-0001 remains pending.

### Next Recommended Action

David should review TASK-0002 and decide Done / Not Done.

Recommended next task:

```text
TASK-0003 — Create Supabase Product Attributes Schema and RLS Plan
```

Alternative next task:

```text
TASK-0003 — Create PassTo PRD and MVP Scope Baseline
```

### Handoff Notes

Next Codex session should begin from:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/tasks/TASK-0002.md
/docs/features/TIER_FEATURES.md
/docs/features/SHARING.md
/docs/features/REFRESH.md
/docs/features/PDF_EXPORT.md
/docs/features/SUBSCRIPTIONS.md
/docs/features/NOTIFICATIONS.md
/docs/flows/VERIFIER_CREDENTIAL_VIEW.md
/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
/docs/activity_log/ACTIVITY_LOG.md
```

---

## Session Closeout — 2026-05-24 — Codex

**Task ID:** Session Closeout  
**Status:** Closed  
**Role:** Codex / Engineering Director  
**Summary:** Closed the PassTo session after completing TASK-0002 documentation decomposition and logging the related product decisions, approval, and activity closeout.

### Work Completed

- Confirmed session close request from David.
- Preserved the completed TASK-0002 state in the activity log.
- Confirmed next-session handoff path.

### Files / Docs Changed

- `/docs/activity_log/ACTIVITY_LOG.md`

### Decisions Made

- No new product or architecture decisions were made during closeout.

### Risks / Issues

- TASK-0001 still needs David final Done decision.
- TASK-0002 still needs David final Done decision.
- Final Terms of Use still requires legal/product drafting.
- Subscription pricing remains unconfirmed unless separately approved.
- Exact Supabase schema and RLS policies require a later task.

### Open Questions

- Should TASK-0003 be Supabase schema/RLS design or PRD/MVP scope baseline?
- Should Free users be allowed to buy additional licenses in MVP, or should additional license be hidden for Free?
- What are final Standard and Premier subscription prices?

### Approval Needed

- David final Done decision for TASK-0001.
- David final Done decision for TASK-0002.

### Next Recommended Action

David should decide Done / Not Done for TASK-0001 and TASK-0002.

Then proceed with:

```text
TASK-0003 — Create Supabase Product Attributes Schema and RLS Plan
```

Alternative:

```text
TASK-0003 — Create PassTo PRD and MVP Scope Baseline
```

### Handoff Notes

Next session should begin with:

```text
Codex, let’s start a new PassTo session.
```

Codex should read:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/activity_log/ACTIVITY_LOG.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
/docs/tasks/TASK-0001.md
/docs/tasks/TASK-0002.md
/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md
/docs/features/TIER_FEATURES.md
/docs/features/SHARING.md
/docs/features/REFRESH.md
/docs/features/PDF_EXPORT.md
/docs/features/SUBSCRIPTIONS.md
/docs/features/NOTIFICATIONS.md
/docs/flows/VERIFIER_CREDENTIAL_VIEW.md
```

---

## Session Closeout — 2026-05-24 — Claude

**Task ID:** Claude Task 001 / Claude Task 001-R
**Status:** Remediation Complete — Awaiting Codex Re-Review
**Role:** Claude — Senior Engineer
**Summary:** Executed Claude Task 001 (Supabase MVP Schema Spike), set up GitHub authentication, committed the schema artifact, captured charter v1.7 (Claude PR Authority), addressed Codex QA review blockers in v2, then executed formal Task 001-R incorporating DECISION-0011 to produce the v3 definitive remediation artifact. All 10 Codex QA blockers resolved. Issue #1 routed back to Codex for re-review.

### Work Completed

- Read full GitHub documentation at session start (team charter, activity log, task files, feature docs, architecture docs, decisions log, approvals log).
- Executed Claude Task 001 — Supabase MVP Schema Spike. Produced v1 implementation artifact with 7 required sections (Migration SQL, RLS Policies, Schema Rationale, Challenge Log, Open Questions, Self-QA, Implementation Notes).
- Installed `gh` CLI (GitHub CLI v2.92.0) to enable autonomous GitHub operations.
- Committed v1 schema artifact to GitHub — resolved source-of-truth gap flagged by Codex.
- Captured charter v1.7 amendment (Claude GitHub PR Authority) to `/docs/team_charter/TEAM_CHARTER_V1_7_AMENDMENT.md`.
- Logged APPROVAL-0005 (charter v1.7) to `/docs/activity_log/APPROVALS_LOG.md`.
- Reviewed Codex QA review (Issue #1) — 10 blockers, "Changes Required," migration not approved.
- Produced v2 schema addressing all 10 Codex QA blockers. Committed to GitHub. Posted remediation response in Issue #1 format. Updated Issue #1 labels.
- Created Task 001-R task artifact (`/docs/tasks/2026-05-24-claude-task-001-R-schema-remediation.md`).
- Pulled DECISION-0011 from GitHub (committed by Codex/David with 10 approved migration-blocking decisions).
- Executed formal Task 001-R — produced v3 definitive remediation artifact incorporating DECISION-0011: `pdf_exports` table, `token_type` field (share_link/show_qr), 7-year retention enforcement, entitlement model, subscription pricing. Committed, pushed, posted Issue #1 comment in required format, confirmed labels.

### Files Created / Changed

- `docs/tasks/2026-05-24-claude-task-001-supabase-schema-implementation.md` — v2 revision (10 blockers addressed)
- `docs/tasks/2026-05-24-claude-task-001-supabase-schema-remediation.md` — v3 definitive remediation (DECISION-0011 incorporated) — **current schema source of truth**
- `docs/tasks/2026-05-24-claude-task-001-R-schema-remediation.md` — Task 001-R formal task artifact
- `docs/team_charter/TEAM_CHARTER_V1_7_AMENDMENT.md` — Claude GitHub PR Authority amendment
- `docs/activity_log/APPROVALS_LOG.md` — APPROVAL-0005 added

### Commits

- `a49a9e4` — Add Claude Task 001 schema implementation artifact (v1)
- `d636913` — Create Codex QA review for Claude Task 001
- `1233cb0` — Add charter v1.7 amendment — Claude GitHub PR authority
- `f5170f0` — Update v1.7 charter amendment for Claude PR authority
- `83a77a6` — Remediate Task 001 schema — address all 10 Codex QA blockers (v2)
- `76ce998` — Add Task 001-R artifact — schema remediation task record
- `f871685` — Add Task 001-R remediation artifact — v3 schema with DECISION-0011

### Decisions Made

- GitHub is source of truth for all task artifacts — Claude must commit before declaring work complete.
- `gh` CLI installed at `~/bin/gh` for autonomous GitHub push/comment/label operations.
- Charter v1.7 approved: Claude may create pull requests for approved tasks; may not merge or self-approve.
- DECISION-0011 approved: 7-year retention, two token TTLs (72h share_link / 45min show_qr), pdf_exports table, entitlement model, subscription pricing.
- v3 schema artifact is the current source of truth for the Supabase MVP migration design.

### Risks / Issues

- BLOCKER 10 fully resolved in schema but production migration still blocked pending Codex re-review and David final approval.
- `ON DELETE RESTRICT` on `purchases.profile_id` and `pdf_exports.profile_id` requires application to delete children before purging profiles after 7-year retention window.
- `verifiers.token_id NOT NULL UNIQUE` may need schema change if show_qr tokens have no form gate (open Codex question 4).
- PDF QR token type is unresolved (DECISION-0011 follow-up) — may require third `token_type` value.

### Outstanding Items — David

- TASK-0001: Final Done decision pending.
- TASK-0002: Final Done decision pending.
- Final migration approval (after Codex re-review clears remaining 5 architecture questions).

### Outstanding Items — Codex

- Issue #1: Re-review v3 remediation artifact (`f871685`).
- Define `audit_events.action` canonical namespace before migration.
- Decide `is_primary` designation implementation path.
- Confirm RLS testing approach.
- Confirm `verifiers` record behavior for `show_qr` tokens.
- Decide PDF QR token type (if MVP — requires `token_type` enum update).

### Next Recommended Action

Codex should re-review Issue #1 and the v3 artifact:

```text
/docs/tasks/2026-05-24-claude-task-001-supabase-schema-remediation.md
```

If all remaining architecture questions are resolved and QA passes, Codex should update Issue #1 labels to `assigned: david` / `needs: david-approval` for final migration approval.

### Handoff Notes

Next Claude session should begin with the full startup read:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/team_charter/TEAM_CHARTER_V1_4_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_5_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_6_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_7_AMENDMENT.md
/docs/activity_log/ACTIVITY_LOG.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
/docs/tasks/2026-05-24-claude-task-001-supabase-schema-remediation.md
/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md
GitHub Issue #1
```

---

## Session Activity — 2026-05-25 — Codex

**Task ID:** TASK-0003 — Create PassTo PRD v0.1 and MVP Task Backlog  
**Status:** Ready for David Review  
**Role:** Codex / Engineering Director  
**Summary:** Created PassTo PRD v0.1 and MVP Task Backlog incorporating Claude PRD outline feedback directly and David’s Lovable-hosted MVP frontend decision.

### Work Completed

- Reviewed Claude comments embedded in `/docs/prd/PASS_TO_PRD_OUTLINE.md`.
- Created Codex response to Claude’s PRD outline review in `/docs/prd/CLAUDE_PRD_OUTLINE_REVIEW_RESPONSE.md`.
- Captured David approval for TASK-0003.
- Created `/docs/tasks/TASK-0003.md`.
- Created `/docs/prd/PASS_TO_PRD.md`.
- Created `/docs/tasks/MVP_TASK_BACKLOG.md`.
- Updated `/docs/activity_log/APPROVALS_LOG.md` with APPROVAL-0007.
- Updated this activity log.

### Files / Docs Changed

- `/docs/prd/PASS_TO_PRD_OUTLINE.md` — Claude comments present from review.
- `/docs/prd/CLAUDE_PRD_OUTLINE_REVIEW_RESPONSE.md`.
- `/docs/tasks/TASK-0003.md`.
- `/docs/prd/PASS_TO_PRD.md`.
- `/docs/tasks/MVP_TASK_BACKLOG.md`.
- `/docs/activity_log/APPROVALS_LOG.md`.
- `/docs/activity_log/ACTIVITY_LOG.md`.

### Decisions / Direction Captured

- Lovable is retained as the MVP frontend builder and website host.
- Supabase is the system of record and RLS/data foundation.
- Supabase Edge Functions are preferred for orchestration where practical.
- Vercel is retained only for backend/API routes where needed.
- Airtable and Make are abandoned as execution platforms.
- ID.me, Twilio, RapidAPI/Propelus, data matching, selfie capture, and wallet pass issuance are now represented in the PRD and backlog.
- Wallet pass is treated as core MVP unless David explicitly changes product definition.
- Degraded-mode and ops alert requirements are now PRD-level requirements.

### Risks / Issues

- Activity log references DECISION-0011, but the visible `/docs/activity_log/DECISIONS_LOG.md` currently stops at DECISION-0010. A cleanup task may be required.
- Final Standard/Premier subscription pricing has conflicting documentation signals: visible Decisions Log says still unconfirmed, while Claude schema activity references $9.99/$19.99.
- Twilio A2P 10DLC remains a launch-readiness blocker unless David approves fallback.
- Terms of Use and verifier disclaimer remain unresolved legal/product work.
- Final Supabase schema and RLS design remain subject to Codex review and David approval.

### Open Questions

- Should TASK-0004 be the Lovable/Supabase/Vercel responsibility map as recommended?
- Should Codex create a DECISION-0011 cleanup entry or locate the missing decision artifact first?
- Should Standard/Premier pricing be treated as approved at $9.99/$19.99 or still open until David reconfirms?
- Should admin/ops start with Supabase dashboard/views or a Lovable admin UI?

### Approval Needed

- David final Done decision for TASK-0003.
- David final pricing confirmation before Stripe setup.
- David launch fallback decision if Twilio A2P 10DLC is not ready.

### Next Recommended Action

Proceed with:

```text
TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map
```

Then:

```text
TASK-0005 — Create Supabase Schema and RLS Plan
TASK-0006 — Create MVP Build Sequence for Claude
```

### Handoff Notes

Next Codex or Claude session should read:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/activity_log/ACTIVITY_LOG.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
/docs/tasks/TASK-0003.md
/docs/prd/PASS_TO_PRD.md
/docs/tasks/MVP_TASK_BACKLOG.md
/docs/prd/CLAUDE_PRD_OUTLINE_REVIEW_RESPONSE.md
/docs/tasks/2026-05-24-claude-task-001-supabase-schema-remediation.md
```

---

## Session Activity — 2026-05-25 — Codex

**Task ID:** TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map  
**Status:** Ready for David Review  
**Role:** Codex / Engineering Director  
**Summary:** Created a documentation/architecture responsibility map defining what Lovable, Supabase, and Vercel each own for the PassTo MVP.

### Work Completed

- Captured David approval for TASK-0004.
- Created `/docs/tasks/TASK-0004.md`.
- Created `/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`.
- Updated `/docs/activity_log/APPROVALS_LOG.md` with APPROVAL-0008.
- Updated this activity log.

### Files / Docs Changed

- `/docs/tasks/TASK-0004.md`.
- `/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`.
- `/docs/activity_log/APPROVALS_LOG.md`.
- `/docs/activity_log/ACTIVITY_LOG.md`.

### Decisions / Direction Captured

- Lovable owns MVP frontend, website hosting, route experience, and UI iteration.
- Supabase owns system of record, auth/data foundation, RLS, storage where needed, Edge Functions where practical, event/audit persistence, and service-role-safe backend state.
- Vercel is retained only for backend/API routes where Supabase Edge Functions or Lovable are not the right fit.
- Vercel is not the default MVP frontend host.
- Lovable must not hold privileged secrets or make trust/payment/credential issuance decisions.
- Future implementation tasks must identify frontend owner, data owner, backend owner, integrations touched, secrets, service-role need, RLS impact, and affected routes.

### Risks / Issues

- Actual Lovable route inventory still needs audit.
- Supabase Edge Functions vs. Vercel route boundaries may change after provider SDK/runtime review.
- Existing Vercel wallet signing code needs explicit retain/rewrite decision.
- ID.me callback, Stripe webhook, PDF generation, and wallet pass signing ownership remain open until implementation planning.
- Admin/ops mechanism remains open: Supabase dashboard/views first vs. Lovable admin UI.

### Open Questions

- Should TASK-0005 be Supabase Schema and RLS Plan or Lovable Route/API Audit?
- Should existing Vercel wallet signing endpoints be retained for MVP?
- Should ID.me and Stripe webhook handling be Supabase Edge Functions or Vercel routes?
- Should admin/ops begin with Supabase dashboard/views only?

### Approval Needed

- David final Done decision for TASK-0004.
- David decision on next task priority.

### Next Recommended Action

Recommended next task:

```text
TASK-0005 — Create Supabase Schema and RLS Plan
```

Alternative if implementation sequencing risk feels higher:

```text
TASK-0005 — Audit Lovable MVP Routes and Backend Calls
```

### Handoff Notes

Next Codex or Claude session should read:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/activity_log/ACTIVITY_LOG.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
/docs/tasks/TASK-0004.md
/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md
/docs/prd/PASS_TO_PRD.md
/docs/tasks/MVP_TASK_BACKLOG.md
```

---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0018 — Claude QA Review: v4 Supabase Migration SQL and RLS
**Status:** Done — 2026-05-27
**Role:** Claude / QA Reviewer
**Summary:** Performed an independent Claude QA review of the complete v4 migration chain (base + R1/R2/R3) against TASK-0007 decisions, PRD Sections 1–7, launch-critical MVP scope, and Supabase security best practices. Result: Pass with Required Fix.

### Work Completed

- Read all source artifacts from GitHub: `V4_MIGRATION_SQL.md`, `CODEX_RESPONSE_TASK_0007_SCHEMA_QA.md`, `PRD_SECTION_04_DATA_RLS_BACKEND.md`, `CODEX_REVIEW_V4_MIGRATION_SQL.md`, `CODEX_QA_V4_MIGRATION_REVIEW.md`, `V4_MIGRATION_VERIFICATION.md`, `DECISION-0016-V4-MIGRATION-DIRECT-APPROVAL.md`, `PRD_SECTION_07_LAUNCH_QA_DECISIONS.md`, all related task files.
- Conducted fresh independent review of the complete final migration artifact.
- Identified one new P1 finding not caught by prior Codex QA.
- Documented all findings with file/table/policy references.
- Created `docs/tasks/TASK-0018.md` and pushed to GitHub (commit 780d1fd).
- No migration was applied.

### Key Finding — P1

`licenses.normalized_status` CHECK constraint was not updated by Remediation R3. `license_status_mappings.normalized_status` was expanded to 8 values including `'Pending'` (R3), but `licenses.normalized_status` still only allows 7 values. If the license lookup Edge Function reads `normalized_status = 'Pending'` from `license_status_mappings` and writes it to `licenses.normalized_status`, the database will throw a CHECK constraint violation. A new migration (`v4_passto_mvp_remediation_r4`) is required before Phase 3.3 (license lookup Edge Function) is built.

### Files / Docs Changed

- `docs/tasks/TASK-0018.md` — created

### Decisions / Direction Captured

- TASK-0018 QA verdict: Pass with Required Fix.
- Phase 2 (account/profile foundation) is unblocked.
- Pre-Phase-3 gate: apply `licenses.normalized_status` CHECK expansion before license lookup Edge Function is built.

### Risks / Issues

- P1: `licenses.normalized_status` CHECK mismatch with `license_status_mappings` — will cause runtime error in Phase 3.
- P2: TASK-0007 OD-7 deviation (`stripe_customers` drop) not documented as ADR.
- P2: PRD Section 4 inconsistencies (`stripe_customers` listed, `show_qr` marked deferred but in schema).
- P2: `V4_MIGRATION_VERIFICATION.md` Section 5 still shows pre-R3 seed counts.
- P3: Hard-delete cascade risk (accepted, documented in DECISION-0016).
- P3: Supabase Storage selfie bucket not yet created.

### Next Recommended Actions

```text
TASK-0019 — Phase 2: Profile Init and Onboarding Routing (Phase 2.2 + 2.3 + 2.4)
Pre-Phase-3 gate — v4_passto_mvp_remediation_r4: expand licenses.normalized_status CHECK to 8 values
```

### Handoff Notes

Next session should read:
```text
docs/tasks/TASK-0018.md
docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md
docs/prd/PRD_SECTION_04_DATA_RLS_BACKEND.md
docs/architecture/V4_MIGRATION_SQL.md
```

---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0019 — Supabase Storage Architecture Plan: Selfie Assets
**Status:** Done — 2026-05-27
**Role:** Claude / Architect
**Summary:** Created the complete Supabase Storage architecture specification for PassTo selfie assets. Reviewed against PRD Sections 3, 4, 5, 6, P2 enrollment pipeline spec, and TASK-0018 findings. No bucket, policy, or migration was applied. All 12 required deliverables produced.

### Work Completed

- Read source artifacts from GitHub: `PRD_SECTION_03_USER_JOURNEYS.md`, `PRD_SECTION_04_DATA_RLS_BACKEND.md`, `PRD_SECTION_05_FEATURE_REQUIREMENTS.md`, `PRD_SECTION_06_INTEGRATIONS_FAILURE_OPS.md`, `P2_ENROLLMENT_PIPELINE_MIGRATION_SPEC.md`, `SECURITY_MODEL.md`, `V4_MIGRATION_SQL.md`, `LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`, `TASK-0018.md`.
- Identified that `profiles` table has no `selfie_storage_path` or `selfie_captured_at` columns — both required before Phase 3.5.
- Confirmed bucket name `selfies` from P2 pipeline spec.
- Designed private bucket with path `{auth_user_id}/selfie.jpg`, overwrite-on-retry pattern.
- Specified two-step upload pattern: Lovable direct upload (user JWT + Storage RLS) + Edge Function backend confirmation (service-role profile field update, audit event write, onboarding step advance).
- Specified four Storage RLS policies: INSERT, UPDATE, SELECT (nurse-scoped to own path); no DELETE for authenticated users.
- Specified required schema migration `v4_passto_mvp_selfie_fields`: add `selfie_storage_path text` and `selfie_captured_at timestamptz` to `profiles` — service-role only writes.
- Documented 8 failure scenarios, 7 security risks with mitigations, 14 acceptance criteria.
- Created `docs/tasks/TASK-0019.md` and pushed to GitHub (commit d287c38).
- No Supabase bucket, policy, or migration was applied.

### Files / Docs Changed

- `docs/tasks/TASK-0019.md` — created

### Decisions / Direction Captured

- Selfie bucket name: `selfies` (already in P2 pipeline spec)
- Bucket: private; PRD Section 5.9 explicit requirement
- Path: `{auth_user_id}/selfie.jpg` using `auth.uid()` prefix (not `profiles.id`) — avoids join in Storage RLS
- Upload pattern: Lovable direct upload + mandatory Edge Function confirmation step
- `selfie_storage_path` must NOT be in `update_own_profile_basic()` RPC — nurse cannot self-attest
- No signed URLs approved for MVP selfies except short-TTL (≤60s) ops-only pattern
- Credential issuance gate: `selfie_storage_path IS NULL` blocks credential creation

### Risks / Issues

- `profiles` schema gap: `selfie_storage_path` and `selfie_captured_at` not yet in v4 schema — required before Phase 3.5
- Selfie purge process not yet defined — must be documented before production launch
- Upload BEFORE data match: Storage RLS cannot enforce enrollment gate; backend Edge Function must enforce `onboarding_step` check

### Next Recommended Actions

```
TASK-0020 — Implement Selfie Storage: Create selfies bucket, apply Storage RLS policies, apply v4_passto_mvp_selfie_fields migration
Gate: Codex QA review of TASK-0019 plan + David approval before TASK-0020 execution
Pre-Phase-3.3: Apply v4_passto_mvp_remediation_r4 (licenses.normalized_status CHECK expansion)
```

### Handoff Notes

Next session should read:
```
docs/tasks/TASK-0019.md
docs/architecture/V4_MIGRATION_SQL.md
docs/architecture/P2_ENROLLMENT_PIPELINE_MIGRATION_SPEC.md
```

---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0020 — Implement Selfie Storage Bucket, Policies, and Profile Fields
**Status:** Done — 2026-05-27
**Role:** Claude / Engineer
**Summary:** Implemented the selfie Storage foundation approved in TASK-0019. Created private `selfies` bucket, applied three exact-path Storage RLS policies, and applied schema migration `v4_passto_mvp_selfie_storage` adding `selfie_storage_path` and `selfie_captured_at` to `profiles`. All 13 verification checks passed. No deviations.

### Work Completed

- Confirmed clean baseline: no `selfies` bucket, no Storage policies, no selfie columns on `profiles`.
- Applied migration `v4_passto_mvp_selfie_storage` (version `20260527143033`) via Supabase MCP to `wvzjfxacykgsaffskgtr`.
- Migration scope: bucket INSERT, three Storage RLS policies (INSERT/UPDATE/SELECT), two `profiles` column additions with service-role comments.
- Ran full verification plan (13 checks) — all passed.
- Updated `docs/tasks/TASK-0020.md` on GitHub with execution results, checked acceptance criteria, marked Done.
- Updated `docs/activity_log/ACTIVITY_LOG.md`.

### Files / Docs Changed

- `docs/tasks/TASK-0020.md` — updated: status Done, acceptance criteria checked, execution results and verification table added

### Supabase Changes Applied

| Object | Type | Detail |
|---|---|---|
| `selfies` | Storage bucket | private, 10 MB, image/jpeg + image/png + image/webp |
| `nurse_upload_own_selfie` | Storage RLS policy | INSERT, exact-path, authenticated |
| `nurse_update_own_selfie` | Storage RLS policy | UPDATE (USING + WITH CHECK), exact-path, authenticated |
| `nurse_select_own_selfie` | Storage RLS policy | SELECT, exact-path, authenticated |
| `profiles.selfie_storage_path` | Schema column | text, nullable, service-role write only |
| `profiles.selfie_captured_at` | Schema column | timestamptz, nullable, service-role write only |

### Decisions / Direction Captured

- No authenticated DELETE policy on `selfies` — deletion via service-role only
- `selfie_storage_path` and `selfie_captured_at` are NOT in `update_own_profile_basic()` — confirmed
- Exact-path RLS (`name = auth.uid()::text || '/selfie.jpg'`) enforced — Codex QA correction applied

### Risks / Issues

- Selfie purge process still not defined — must be documented before production launch
- Backend confirmation step (Edge Function) must enforce `onboarding_step` gate before confirming selfie — not yet built
- Phase 3.5 Lovable implementation must handle HEIC/HEIF: convert to JPEG or show unsupported-format retry message

### Next Recommended Actions

```
TASK-0021 — Phase 2: Profile Init and Onboarding Routing
Pre-Phase-3.3: Apply v4_passto_mvp_remediation_r4 (licenses.normalized_status CHECK expansion)
Pre-Phase-3.5: Edge Function confirmation logic for selfie step (submit-enrollment)
```

### Handoff Notes

Next session should read:
```
docs/tasks/TASK-0020.md
docs/tasks/TASK-0019.md
docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md
```
---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0021 — Phase 2 Profile Init and Onboarding Routing Spec
**Status:** Done — 2026-05-27
**Role:** Claude / Engineer
**Summary:** Produced the implementation-ready Phase 2 specification for Lovable auth wiring, profile initialization, onboarding step routing, and Airtable/Make dead-code removal. No Supabase migrations, Edge Functions, or code deployed — spec only.

### Work Completed

- Read 11 source documents from `david-bloom/PassTo` including V4_MIGRATION_SQL.md, P2_ENROLLMENT_PIPELINE_MIGRATION_SPEC.md, MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md, PRD sections, and all prior tasks.
- Confirmed `handle_new_user()` trigger fully creates profiles row at signUp — no `profile-init` Edge Function needed for Phase 2.
- Documented correct UUID identity: `profiles.auth_user_id = auth.uid()` ≠ `profiles.id` — corrects stale P2 pipeline spec Note 2.
- Specified exact ENV var updates for P1/P2/P3 Lovable projects pointing at `wvzjfxacykgsaffskgtr`.
- Specified `update_own_profile_basic()` RPC call pattern for name/phone population post-signUp.
- Specified `routeByOnboardingStep()` router reading `profiles.onboarding_step`.
- Identified all Airtable/Make dead code to remove: `create-airtable-record` (P2), `sync-airtable` (P1), Airtable comment block (P3).
- Defined 14 ordered implementation tasks for TASK-0022.
- Defined 28-item Phase 2.4 QA checklist.
- Wrote complete spec to `docs/tasks/TASK-0021.md` on GitHub (commit 81b1ad819c308250d69cc070304f9be2ffff16a4).

### Files / Docs Changed

- `docs/tasks/TASK-0021.md` — updated: skeleton replaced with complete Phase 2 spec, status Done

### Decisions / Direction Captured

- `handle_new_user()` trigger is sufficient for Phase 2 row creation — no new Edge Function needed
- `profiles.auth_user_id` = `auth.uid()` (not `profiles.id`) — all Lovable identity references must use `authData.user.id`
- Stale `create-airtable-record` and `sync-airtable` are dead code; removal is Phase 2 scope
- `onboarding_step` remains backend-controlled only — Lovable must never write it directly
- Phase 2 is fully unblocked from R4 remediation (only Phase 3.3 needs R4)

### Risks / Issues

- Null-profile guard needed for legacy pre-v4 auth accounts — minimum viable guard defined in Section 6
- `update_own_profile_basic()` RPC failure on signUp is non-blocking (profiles row exists, name/phone null) but should be logged
- `profiles.id ≠ auth.uid()` discrepancy in P2_ENROLLMENT_PIPELINE_MIGRATION_SPEC.md Note 2 — documented, flagged for Phase 3 Edge Function implementers

### Next Recommended Actions

```
TASK-0022 — Implement Phase 2 Auth, Profile Init, and Onboarding Routing (14 tasks — David in Lovable)
Pre-Phase-3.3: Apply v4_passto_mvp_remediation_r4 (licenses.normalized_status CHECK expansion)
```

### Handoff Notes

Next session should read:
```
docs/tasks/TASK-0021.md
docs/tasks/TASK-0020.md
docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md
```
---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0022 — Implement Phase 2 Auth, Profile Init, and Onboarding Routing
**Status:** Proposed — pending Codex QA of TASK-0021 and David execution approval
**Role:** Claude / Engineer
**Summary:** Created TASK-0022 implementation task. Defines all 14 ordered steps for David to execute in Lovable P1/P2/P3: ENV var wiring to wvzjfxacykgsaffskgtr, signUp flow with update_own_profile_basic() RPC, onboarding router, null-profile guard, Airtable/Make dead code removal, and Phase 2.4 QA checklist. No Supabase changes applied.

### Work Completed

- Read TASK-0021.md, V4_MIGRATION_SQL.md, and MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md from GitHub before writing.
- Created docs/tasks/TASK-0022.md with full implementation scope, code reference, route map, error states, security boundaries, 28-item QA checklist, and acceptance criteria.
- Pushed to GitHub (commit bda969e3bc9a69ca3525ebc93e261d4f3e0e86b1).

### Files / Docs Changed

- `docs/tasks/TASK-0022.md` — created

### Decisions / Direction Captured

- TASK-0022 blocked on TASK-0021 Codex QA approval (no P1/P2 findings) and David execution approval
- Phase 2 requires no Supabase migrations — all work is Lovable config + code changes
- R4 remediation remains a separate pre-Phase-3.3 gate, not blocking Phase 2

### Next Recommended Actions

```
TASK-0021 Codex QA → David approval → TASK-0022 execution
Pre-Phase-3.3: Apply v4_passto_mvp_remediation_r4
```
---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0021 / TASK-0022 — Codex QA corrections applied
**Status:** TASK-0021 updated; TASK-0022 updated; both pending David approval
**Role:** Claude / Engineer
**Summary:** Applied 6 Codex-required corrections to both TASK-0021 (Phase 2 spec) and TASK-0022 (implementation task). No Supabase changes applied.

### Corrections Applied

| # | Finding | Change in TASK-0021 | Change in TASK-0022 |
|---|---|---|---|
| CQ-1 | IdmeCallback.tsx Make calls must be blocked in Phase 2, not deferred | DQ-8: table updated; "In Phase 2 scope" statement added; step 2.2-4a added | Step 2.2-4a added; Out of Scope updated; acceptance criteria + QA checklist updated |
| CQ-2 | update_own_profile_basic() cannot run without active session | Section 4.1 signUp flow: added authData.session check; no-session path routes to /confirm-email | Code reference updated with same session check |
| CQ-3 | Null-profile recovery section was contradictory (referenced Edge Function then said out of scope) | DQ-6: retry/support only; no recovery Edge Function in Phase 2 | Error states table: null-profile and fetch error now separate rows with correct behavior |
| CQ-4 | Supabase env values must be verified at implementation time | Section 3.1: "Implementation note" added to verify from Supabase dashboard | ENV section header updated to say "verify before use" |
| CQ-5 | Profile fetch did not distinguish error from null | DQ-4: explicit separation of error vs null handling | Profile fetch pattern code updated |
| CQ-6 | Edge Function deletion did not require confirming no live callers first | Steps 2.2-12 and 2.2-13: dependency updated to "verify no live callers" | Same dependency update |

### Files Changed

- `docs/tasks/TASK-0021.md` — 6 corrections applied; Codex QA findings table added; status updated
- `docs/tasks/TASK-0022.md` — 6 corresponding implementation changes applied

### Next Recommended Actions

```
David approval of TASK-0022 → execute 15 implementation steps in Lovable
```



---

## Session Activity — 2026-05-30 — Claude

**Task ID:** TASK-0025 / TASK-0031 — Phase 3.1 sandbox run and Phase 2 wiring progress  
**Status:** TASK-0025 paused — ID.me UserInfo endpoint unresolved; session housekeeping complete  
**Role:** Claude / Senior Engineer  
**Summary:** Worked through Phase 3.1 sandbox run diagnosis. Resolved Supabase client wiring issues in P2 (IdmeCallback.tsx was on wrong Supabase project). Applied Migration D (`complete_identity_verification()` RPC). Diagnosed `provider_error` root cause as incorrect `IDME_ATTRIBUTES_URL` (404 on `/oauth/userinfo`). Identified the correct endpoint is likely `https://api.idmelabs.com/api/public/v3/attributes.json` but could not confirm before ID.me sandbox became unreliable. A2P 10DLC application submitted. Codex task numbering conflict (TASK-0018–0026 overwritten) caught and resolved by Codex. TASK-0031–0043 created as the canonical Section 3 journey task sequence.

### Work Completed

- Verified Migration D (`complete_identity_verification()` RPC) applied successfully.
- Identified and fixed `IdmeCallback.tsx` import pointing at old Supabase project — switched to `passto-supabase/client`.
- Confirmed all P2 files outside auto-generated `src/integrations/supabase/` already use `passto-supabase/client`.
- Diagnosed `IDME_ATTRIBUTES_URL` as root cause of `provider_error` — `/oauth/userinfo` returns 404 on `api.idmelabs.com`.
- Tried `https://api.id.me/oauth/userinfo` — also failed. Recommended `https://api.idmelabs.com/api/public/v3/attributes.json` as next attempt.
- Paused TASK-0025 sandbox run pending ID.me sandbox stability and correct UserInfo endpoint confirmation.
- Caught and flagged Codex task numbering collision (TASK-0018–0026 overwritten). Codex restored original files and renumbered Section 3 journey tasks to TASK-0031–0043.
- Verified GitHub state after Codex fix: TASK-0018 and TASK-0026 confirmed restored, TASK-0031–0043 confirmed present.
- Confirmed TASK-0031 and TASK-0040 are the only two unblocked Section 3 tasks.
- Logged A2P 10DLC submission as RISK-0002 in RISKS_LOG.md.
- Noted email confirmation was temporarily disabled for testing — must be re-enabled.

### Supabase Changes Applied This Session

| Change | Migration | Status |
|---|---|---|
| `complete_identity_verification()` RPC | Migration D (manual SQL) | ✅ Applied |

### Files / Docs Changed

- `docs/activity_log/RISKS_LOG.md` — RISK-0002 (TC-11 A2P 10DLC) added
- `docs/activity_log/ACTIVITY_LOG.md` — this entry

### Open Items Carried Forward

| Item | Status |
|---|---|
| TASK-0025 step 3.1-7 — Phase 3.1 sandbox run | Paused — `IDME_ATTRIBUTES_URL` unresolved; try `https://api.idmelabs.com/api/public/v3/attributes.json` |
| Supabase Auth email confirmation | Must be re-enabled — was disabled for testing |
| TASK-0031 — Account Profile Foundation | Unblocked — awaiting David approval |
| TASK-0040 — Stripe / Entitlement Gating | Unblocked — awaiting David approval |
| R4 migration (`licenses.normalized_status`) | Required before Phase 3.3; SQL approved |

### Decisions / Direction Captured

- `IdmeCallback.tsx` must use `passto-supabase/client`, not auto-generated `supabase/client`.
- P2 Lovable cannot hand-edit auto-generated `src/integrations/supabase/` files — import swap to `passto-supabase/client` is the correct pattern.
- TC-11 A2P 10DLC submitted 2026-05-30 — production SMS pending carrier approval (3–7 business days).
- TASK-0031–0043 are the canonical Section 3 journey task sequence. TASK-0018–0026 remain the original implementation task records.


---

## Session Activity — 2026-05-30 (continued) — Claude

**Task ID:** TASK-0033 — Implement Twilio Phone Verification Journey
**Status:** In Progress — Edge Functions deployed; pending Codex QA and Phase 3.1 end-to-end test
**Role:** Claude / Senior Engineer
**Summary:** Deployed `phone-send-otp` and `phone-verify-otp` Edge Functions to `wvzjfxacykgsaffskgtr`. Implemented Lovable `/verify-phone` two-step page. Twilio secrets set by David. All Phase 3.2 pre-implementation migrations (A, B, C) confirmed applied. Codex QA required before Phase 3.2 QA run.

### Work Completed

- Wrote `phone-send-otp` Edge Function per TASK-0026 spec (E.164 validation, gate checks, Twilio Verify, notification_events, audit_events).
- Wrote `phone-verify-otp` Edge Function per TASK-0026 spec (OTP check, idempotency, `complete_phone_verification()` atomic RPC).
- Deployed both functions to `wvzjfxacykgsaffskgtr` — ACTIVE v1.
- David set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` secrets.
- Lovable P2: `VerifyPhone.tsx` created and `/verify-phone` route registered in `App.tsx`.
- Pushed Edge Function source to GitHub: `supabase/functions/phone-send-otp/index.ts`, `supabase/functions/phone-verify-otp/index.ts`.
- Updated `docs/tasks/TASK-0033.md` with execution results.
- A2P 10DLC application submitted — logged as RISK-0002.

### Files Changed

- `supabase/functions/phone-send-otp/index.ts` — created
- `supabase/functions/phone-verify-otp/index.ts` — created
- `docs/tasks/TASK-0033.md` — updated with execution results
- `docs/activity_log/ACTIVITY_LOG.md` — this entry
- `docs/activity_log/RISKS_LOG.md` — RISK-0002 added (earlier in session)

### Deviations

- TASK-0026 spec gated Phase 3.2 on TASK-0025 completion. David approved early execution. End-to-end QA deferred to Phase 3.1 completion.
- CORS restricted to `enroll.passtodigital.com` (tighter than `idme-exchange` which uses `*`).

### Needs Codex QA

Codex should review `phone-send-otp` and `phone-verify-otp` against TASK-0026 spec before Phase 3.2 QA is run. Key review areas:
- Gate logic (IAL2 + onboarding_step checks)
- Twilio Verify API call pattern
- `complete_phone_verification()` RPC usage (atomic)
- `notification_events` and `audit_events` write correctness
- Idempotency logic in `phone-verify-otp`
- CORS policy

### Open Items

| Item | Status |
|---|---|
| TASK-0025 Phase 3.1 sandbox run | Paused — try `IDME_ATTRIBUTES_URL = https://api.idmelabs.com/api/public/v3/attributes.json` |
| Codex QA of TASK-0033 Edge Functions | Required before Phase 3.2 QA |
| Phase 3.2 end-to-end QA | Blocked on Phase 3.1 completion |
| Twilio A2P 10DLC carrier approval | Submitted 2026-05-30 — pending (3–7 days) |
| Supabase Auth email confirmation | Must be re-enabled if still off |

---

## Session Activity — 2026-06-01 — Claude

**Task ID:** TASK-0045 — ID.me-First Onboarding Backend — P1 Remediation
**Status:** Remediation Complete — Pending Migration E + Deployment + Codex Re-QA
**Role:** Claude / Senior Engineer
**Summary:** Addressed all three P1 findings from Codex QA security review of 2026-05-31. Rewrote `idme-exchange-v2` to validate server-side state/PKCE from a pre-created attempt. Created new `idme-verification-start` function that generates state and code_verifier server-side and stores encrypted verifier in DB. Updated `create-account` with atomic attempt claim, email verification comparison, and conditional email confirmation. Revised Migration E as ALTER TABLE (not CREATE TABLE — Codex confirmed table exists). Could not deploy — no Supabase access token available; deployment instructions added to TASK-0045.

### Work Completed

- Wrote `idme-verification-start` Edge Function — generates server-side state + PKCE, stores state_hash + AES-GCM encrypted code_verifier, creates onboarding_attempt before ID.me redirect.
- Rewrote `idme-exchange-v2` — input changed from `{ code, code_verifier }` to `{ attempt_id, code, state }`; validates state_hash via `constantTimeEqual()`; atomically sets `consumed_at` before calling ID.me; decrypts code_verifier from DB; marks attempt abandoned on any failure.
- Updated `create-account` — atomically claims attempt (`id_verified → account_creating`); compares confirmed_email to `attempt.verified_email`; sets `email_confirm` only when email unchanged; uses `error.code === "email_exists"` for duplicate detection; resets attempt to `id_verified` on any pre-link failure.
- Wrote Migration E (revised) as ALTER TABLE — adds `state_hash`, `code_verifier_ciphertext`, `consumed_at`, adds `account_creating` to state CHECK, drops/recreates unique index with `expires_at > now()` guard, adds `cleanup_expired_onboarding_attempts()`.
- Pushed all four files to GitHub, updated TASK-0045 status.

### GitHub Files Changed

| File | Commit |
|---|---|
| `supabase/functions/idme-verification-start/index.ts` | 0bb5e67e21ef |
| `supabase/functions/idme-exchange-v2/index.ts` | 554dad0d9fb3 |
| `supabase/functions/create-account/index.ts` | 3876717175 |
| `supabase/migrations/migration_e_onboarding_attempts_v2.sql` | c3ca7b4029a4 |
| `docs/tasks/TASK-0045.md` | 92b2991b0c6c |

### Supabase Changes Required (David)

| Action | Status |
|---|---|
| Apply `migration_e_onboarding_attempts_v2.sql` via Supabase dashboard | ⬜ Pending David |
| Set `ONBOARDING_ENCRYPTION_KEY` secret on both `idme-verification-start` and `idme-exchange-v2` | ⬜ Pending David |
| Deploy `idme-verification-start` (`--no-verify-jwt`) | ⬜ Pending David — see TASK-0045 for commands |
| Deploy `idme-exchange-v2` (`--no-verify-jwt`) | ⬜ Pending David — see TASK-0045 for commands |
| Deploy `create-account` (`--no-verify-jwt`) | ⬜ Pending David — see TASK-0045 for commands |

### Open Items Carried Forward

| Item | Status |
|---|---|
| Migration E application + deployment | Pending David (steps above) |
| TASK-0045 Codex re-QA | Pending — after deployment |
| TASK-0025 IDME_ATTRIBUTES_URL | Unresolved — try `https://api.idmelabs.com/api/public/v3/attributes.json` |
| D-3: Abandon TASK-0022 Lovable Phase 2 work? | Pending David decision |
| TASK-0046, TASK-0047 | Blocked on TASK-0045 completion |

---

## Session Activity — 2026-06-01 (continued) — Claude

**Task ID:** TASK-0045 — Second Remediation (Codex Re-QA Blockers)
**Status:** Complete — pushed; awaiting Migration E application + deployment + Codex re-QA
**Role:** Claude / Senior Engineer
**Summary:** Fixed all P1/P2 findings from Codex Re-QA of 2026-06-01. Migration E: dropped NOT NULL from idme_subject and id_verification_level, removed invalid expires_at > now() from partial index predicate, added state-aware CHECK constraints, revoked anon/authenticated grants. create-account: profile now uses ID.me-verified names (not browser input) as identity anchor, fail-closed on attempt-link, awaited success audit, added Cache-Control: no-store, renamed session_token → token_hash.

### Fixes

**Migration E (v3):**
- `ALTER COLUMN idme_subject DROP NOT NULL` — allows started rows before ID.me exchange
- `ALTER COLUMN id_verification_level DROP NOT NULL` — same
- Removed `expires_at > now()` from partial index predicate (invalid in Postgres)
- Added three state-aware CHECK constraints (started/verified/linked field requirements)
- `REVOKE ALL ON onboarding_attempts FROM anon, authenticated`

**create-account:**
- Profile first_name/last_name set from attempt.verified_first_name/verified_last_name (ID.me trust source, not browser input)
- Attempt-link failure returns `warning: attempt_link_partial` (fail-closed recovery state)
- Success audit is awaited
- json() includes Cache-Control: no-store on all responses
- session_token renamed to token_hash in response body

### GitHub Files Changed

| File | Commit |
|---|---|
| `supabase/migrations/migration_e_onboarding_attempts_v2.sql` | 064bffaf4912 |
| `supabase/functions/create-account/index.ts` | 738c257984f5 |
| `docs/tasks/TASK-0045.md` | 18b63e4276e2 |

### Next Steps (David)

1. Apply `supabase/migrations/migration_e_onboarding_attempts_v2.sql` via Supabase dashboard SQL Editor
2. Run deploy commands:
   ```
   npx supabase functions deploy idme-verification-start --project-ref wvzjfxacykgsaffskgtr --no-verify-jwt
   npx supabase functions deploy idme-exchange-v2 --project-ref wvzjfxacykgsaffskgtr --no-verify-jwt
   npx supabase functions deploy create-account --project-ref wvzjfxacykgsaffskgtr --no-verify-jwt
   ```
3. Tag Codex for re-QA against live schema + deployed functions

---

## Session Activity — 2026-06-01 (continued) — David + Claude

**Task ID:** TASK-0045 — Function Deployments
**Status:** All three functions deployed; Migration E still pending application
**Summary:** David deployed all three remediated Edge Functions to `wvzjfxacykgsaffskgtr` after successful `supabase login`.

| Function | Result |
|---|---|
| `idme-verification-start` | ✅ Deployed — first-ever deployment |
| `idme-exchange-v2` | ✅ Redeployed from remediated source |
| `create-account` | ✅ Redeployed from remediated source |

**Migration E still required.** `onboarding_attempts` lacks `state_hash`, `code_verifier_ciphertext`, `consumed_at`, and `account_creating` state until David applies `supabase/migrations/migration_e_onboarding_attempts_v2.sql` via the Supabase dashboard SQL Editor. Functions will error on any attempt insert until the migration runs.

---

## Session Activity — 2026-06-01 (continued) — Claude

**Task ID:** TASK-0046 — License Info Lookup and ID.me/License Binding — Implementation
**Status:** Implementation complete — pending Migration G approval + deployment + Codex QA
**Role:** Claude / Senior Engineer
**Summary:** Built TASK-0046 after David confirmed RapidAPI as provider and approved name-only DOB matching. Resolved all Codex spec gaps (schema mapping, state transition, match gate). Wrote Migration G (data_match_passed + complete_license_verification RPC) and license-lookup Edge Function (RapidAPI adapter, conservative name matching, atomic RPC, verify_jwt=true).

### Files Committed

| File | Commit |
|---|---|
| `supabase/migrations/migration_g_license_match_fields.sql` | bb410bace824 |
| `supabase/functions/license-lookup/index.ts` | c60dfcf77d70 |
| `docs/tasks/TASK-0046.md` | 951917d5a024 |

### Decisions Resolved This Session

| Item | Resolution |
|---|---|
| Provider | RapidAPI — David confirmed |
| DOB matching | `dob_match_mode = name_only` — David approved in commit b778849 |
| Schema mapping | FLOW-LICENSE table names reconciled to live v4 |
| State transition | `complete_license_verification()` RPC atomically advances `onboarding_step = 'phone'` on match pass |
| Durable match gate | `licenses.data_match_passed` boolean — credential creation reads this field |

### Next Steps (David)

1. Approve Migration G SQL (`supabase/migrations/migration_g_license_match_fields.sql`)
2. Apply via Supabase dashboard SQL Editor
3. Set Supabase secrets: `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, `RAPIDAPI_LICENSE_URL`
4. Deploy: `npx supabase functions deploy license-lookup --project-ref wvzjfxacykgsaffskgtr`
5. Tag Codex for QA

---

## Session Activity — 2026-06-02 — Claude

**Task ID:** TASK-0046 — P1/P2 Remediation
**Status:** Remediation complete — pending David approval + Migration H + redeployment + Codex re-QA
**Role:** Claude / Senior Engineer
**Summary:** Addressed all Codex P1/P2 findings. Migration H hardens `complete_license_verification()` RPC with locked search_path, full server-side validation, and revoked public execute. Edge Function removes synthetic "Registered"→Active status mapping, treats missing status as Unknown/do_not_issue, stores allowlisted payload, clears stale match state on every refresh, and makes terminal outcome writes fail-closed.

### Files Pushed

| File | Commit |
|---|---|
| `supabase/migrations/migration_h_license_verification_harden.sql` | 9178a4baa354 |
| `supabase/functions/license-lookup/index.ts` | dfb9810f3e90 |
| `docs/tasks/TASK-0046.md` | 49e1cfcf6422 |

### Production-Impacting Actions Required (David approval needed before each)

1. Apply `migration_h_license_verification_harden.sql` via Supabase SQL Editor
2. Deploy `license-lookup`: `npx supabase functions deploy license-lookup --project-ref wvzjfxacykgsaffskgtr`
3. Tag Codex for re-QA

### Known Implications of P1 Status Fix

With the `"Registered"` → Active mapping removed and the provider returning no status field, the current RapidAPI endpoint will return `normalized_status = 'Unknown'` for every lookup. This means no nurse can currently advance past the license step. This is the correct fail-safe behavior per Codex's finding. Advancing onboarding requires either:
- A provider that returns current active/inactive/expired status; or
- David approval to accept a different MVP stance (e.g., treat existence as Active with documented risk acceptance)

Claude is not proposing a provider switch or a risk acceptance. This is a David decision before TASK-0047 can proceed.

---

## Session Activity — 2026-06-01 — Claude

**Task IDs:** TASK-0046 (closed), TASK-0047 (Codex QA passed; deferrals open)
**Status:** Both tasks passed Codex live QA. Backend onboarding gate chain complete through plan selection.
**Role:** Claude / Senior Engineer

### TASK-0046 — Closed

All Codex QA findings resolved across three remediation cycles:
- Migration H applied: `complete_license_verification()` hardened (service_role only, server-side invariant checks)
- `license-lookup` revised to documented POST /verify contract (`license_number + state`, top-level `license_status`)
- Provider `license_type` binding added: type mismatch blocks progression, terminal audit written
- Codex live re-QA v10 passed

### TASK-0047 — Backend Route Gates Complete; Deferrals Open

Migration I applied: `complete_phone_verification()` fixed (phone → plan, service_role only, license match gate).

Edge functions deployed:

| Function | Version | Purpose |
|---|---|---|
| `phone-send-otp` | v11 | Added license match gate |
| `phone-verify-otp` | v11 | Added license match gate; fixed idempotency to post-phone steps |
| `plan-select` | v2 | Plan intent write + fail-closed row-count guard; subscription_tier ≠ confirmed entitlement |
| `success-status` | v2 | can_add_license from confirmed subscriptions table (TASK-0040), not subscription_tier |
| `account-select-status` | v1 | /account-select gate |
| `payment-status` | v1 | /payment gate; reads subscriptions for Stripe confirmation state |
| `selfie-status` | v1 | /upload-selfie gate |

Codex re-QA passed. TASK-0047 status: Codex QA passed.

### Open Items Requiring David Input

| Item | Task | Status |
|---|---|---|
| Stripe checkout implementation | TASK-0040 | Spec drafted, awaiting David approval |
| Selfie required vs optional at MVP | TASK-0047 | Open question; selfie upload mechanics deferred |
| `/pass-ready` disposition | TASK-0047 | Open question; redirect/alias/remove |

### GitHub Issues

| Issue | Status |
|---|---|
| [#3](https://github.com/david-bloom/PassTo/issues/3) TASK-0046 Codex re-QA | Closed (v10 passed) |
| [#4](https://github.com/david-bloom/PassTo/issues/4) TASK-0047 David approval | Closed (approved + executed) |
| [#5](https://github.com/david-bloom/PassTo/issues/5) TASK-0047 Codex QA | Passed re-QA |

---

## Session Activity — 2026-06-02 — Claude

**Task IDs:** TASK-0055  
**Status:** Implementation complete — Codex QA Required  
**Role:** Claude / Senior Engineer

### TASK-0055 — Nurse Dashboard Launch-Critical Status View — Executed

David approved TASK-0055 as APPROVAL-0020 (2026-06-02): "execute 0055".

#### Deliverables

**New Edge Function:** `supabase/functions/dashboard-status/index.ts`

New read-only GET endpoint called by Lovable from `/dashboard`. Returns all launch-critical state for the nurse dashboard in a single authenticated call:

| Field | Source |
|---|---|
| `subscription_tier`, `subscription_status`, `subscription_plan_name` | `profiles` + `subscriptions` |
| `license_type`, `license_state`, `license_normalized_status`, `license_status_intent`, `license_expiration_date`, `license_current_as_of` | `licenses` (primary, most recent) |
| `credential_status`, `credential_issued_at`, `credential_expires_at` | `credentials` (most recent) |
| `wallet.apple`, `wallet.google`, `wallet.any_issued` | `wallet_passes` (by credential_id) |
| `share_link_eligible: false, share_link_reason: "not_implemented"` | Hardcoded until TASK-0056 |
| `can_add_license` | `subscriptions.license_entitlement_count` |

Gate: `onboarding_step` in `["pass", "complete"]`. All other steps return `403 onboarding_not_complete` with the current step.

**New Lovable Prompt:** `docs/tasks/LOVABLE_PROMPT_2026-06-02_TASK0055_DASHBOARD.md`

Instructs Lovable to:
- Call `dashboard-status` on page load
- Render credential, license, wallet, and subscription status cards with correct PassTo design tokens
- Show "Share Credential — Coming Soon" as permanently disabled (TASK-0056 not yet implemented)
- Route guard: redirect to sign-in (401), to the correct onboarding step (403), or show error (503)
- Explicitly prohibit: QR code, PDF export, Add-license prompt, Employer dashboard, direct DB writes

#### No Migrations Required

`dashboard-status` reads existing tables only. No schema changes.

#### Open Items

| Item | Status |
|---|---|
| Share-link toggle | Blocked on TASK-0056 — `share_link_eligible` will remain `false` until TASK-0056 backend is in place |
| `subscriptions` column verification | Codex QA should verify `plan_name`, `status`, `license_entitlement_count` match applied migration |
| Lovable implementation | David must paste `LOVABLE_PROMPT_2026-06-02_TASK0055_DASHBOARD.md` into Lovable after Codex QA passes |

#### GitHub Issue

GitHub Issue: [#10](https://github.com/david-bloom/PassTo/issues/10) TASK-0055 Codex QA — Nurse Dashboard Status Function (opened)

**Deployment:** `dashboard-status` v1 deployed to Supabase project wvzjfxacykgsaffskgtr

---

## Governance Remediation — 2026-06-02 — Claude

**Scope:** Stale unapproved TASK-0056 local artifact — deleted
**Trigger:** Codex flagged source-of-truth split during TASK-0055 QA (Issue #10)

### Finding

During TASK-0055 Codex QA, Codex found a local `share-link-create/index.ts` file (6.5KB, Jun 2 15:33) from a prior Claude session that was never pushed to GitHub and never deployed to Supabase. TASK-0056 on GitHub remained "Spec Drafted — Awaiting David Approval" with no approval on record — the file was unapproved Class A work written locally in violation of the GitHub-as-source-of-truth rule.

Two bugs were identified in the local source before deletion:
- **P1:** Profile lookup used `eq('id', user.id)` instead of `eq('auth_user_id', user.id)` — would break authentication for every caller
- **P2:** Referenced `credentials.license_id` column — not confirmed to exist in schema

### Action

David approved deletion (Option A). Local `share-link-create/` directory deleted. GitHub remote and Supabase remain unaffected (file was never there).

### State After Remediation

| Item | State |
|---|---|
| Local `share-link-create/` | Deleted |
| GitHub remote | Never existed |
| Supabase | Never deployed |
| TASK-0056 | Spec Drafted — Awaiting David Approval |

When David approves TASK-0056, Claude will write the function fresh from the spec with both bugs addressed.

### TASK-0055 QA

Unaffected. Codex continuing source review + live endpoint test per Issue #10 Option A directive.

---

## Governance Remediation — 2026-06-02 — Claude

**Scope:** Unapproved share-link-create Supabase function — deleted
**Approval:** APPROVAL-0021 (David, 2026-06-02)
**Trigger:** Codex TASK-0056 blocked verdict — P1 source-of-truth mismatch (live Supabase vs. no GitHub source, no approval)

### Finding

Codex QA on TASK-0056 found `share-link-create` ACTIVE on Supabase (v2, 19:33:48) despite:
- No GitHub source (contents API 404)
- No David approval (TASK-0056 status: Spec Drafted — Awaiting Approval)
- Local source deleted by Claude earlier this session before Supabase state was checked

Claude error: local `share-link-create/index.ts` was deleted after David chose Option A (discard stale artifact) without first verifying Supabase deployment state. The function was already live.

### P1 Bugs Confirmed in Live Source (recovered via `supabase functions download`)

| Bug | Line | Issue |
|---|---|---|
| Wrong profile lookup key | 72 | `.eq('id', user.id)` → should be `.eq('auth_user_id', user.id)`. Returned `403 profile_not_found` for all valid nurses. |
| Wrong audit action format | 151 | `action: 'create'` → should be `'verification_token.created'`. Fail-closed `500 audit_failed` before any token written. |

### Actions Taken

1. `share-link-create` deleted from Supabase (APPROVAL-0021)
2. Recovered local source deleted
3. TASK-0056.md updated with cleanup history
4. APPROVALS_LOG.md updated with APPROVAL-0021

### State After Remediation

| Location | State |
|---|---|
| Supabase | Deleted |
| GitHub | Never existed |
| Local | Deleted |
| TASK-0056 | Spec Drafted — Awaiting David Approval (unchanged) |

No share links were successfully created — P1 profile lookup bug blocked all valid requests.

When TASK-0056 is formally approved, Claude rewrites from scratch: source pushed to GitHub first, Codex QA, then deploy.

---

## TASK-0056 Codex QA Verdict — 2026-06-02 — Codex

**Verdict:** Blocked — Not Ready for Implementation QA
**Task:** TASK-0056 — Implement Share-Link Token Creation Function

### Summary

Codex issued a blocked verdict because no approved implementation exists. Prior unapproved deployment has been removed. QA cannot proceed without David approval and a clean implementation.

### Required Next Action

David approves TASK-0056 → Claude rewrites clean from spec (GitHub-first, fixes all known defects, includes `dashboard-status` eligibility update) → Codex QA restarts.

---

## Session Activity — 2026-06-02 — Claude

**Task IDs:** TASK-0056
**Status:** Implementation complete — Codex QA Required
**Role:** Claude / Senior Engineer

### TASK-0056 — Share-Link Token Creation — Executed

David approved TASK-0056 as APPROVAL-0022 (2026-06-02): "execute task 0057" + "Do 0056 first".

#### Deliverables

**New Edge Function:** `supabase/functions/share-link-create/index.ts`

POST endpoint. Full gate chain: auth → profile (IAL2, active, terminal step) → credential (active, owned) → license (Active, data_match_passed, linked) → entitlement (free always passes; paid requires active subscription). Writes `verification_tokens` (hash only, never raw) and `audit_events` (creation + all rejection paths).

**Updated Edge Function:** `supabase/functions/dashboard-status/index.ts` (v3)

Replaced hardcoded `share_link_eligible: false / not_implemented` with real `deriveShareLinkEligibility()` helper. Returns specific reason codes: `credential_not_active`, `license_not_active`, `license_match_not_passed`, `entitlement_not_confirmed`.

#### Prior Bug Fixes Applied

| Bug | Fix |
|---|---|
| `eq('id', user.id)` profile lookup | `eq('auth_user_id', user.id)` |
| `action: 'create'` (OD-1 violation) | `'verification_token.created'` / `'verification_token.creation_rejected'` |
| No rejection-path audit events | All gates write best-effort rejection audit |

#### Deployment

Both functions deployed to Supabase project `wvzjfxacykgsaffskgtr`. Source in GitHub before deployment.

#### Open Items

| Item | Status |
|---|---|
| `SHARE_LINK_BASE_URL` Supabase secret | Not yet set — defaults to `https://passtodigital.com/v`; must be set before production |
| First-use token marking | Deferred to TASK-0057 |
| Codex QA | Required — Issue to be opened |

---

## Session Activity — 2026-06-02 — Claude

**Task IDs:** TASK-0057
**Status:** Implementation complete — Codex QA Required
**Role:** Claude / Senior Engineer

### TASK-0057 — Verifier Token Validation — Executed

David approved TASK-0057 as APPROVAL-0023 (2026-06-02): "execute task 0057".

#### Deliverable

**New Edge Function:** `supabase/functions/token-verify/index.ts`

Anonymous POST endpoint. Accepts `token` (raw), `verifier_name`, `verifier_email`, `terms_accepted`. Hashes token server-side, validates against `verification_tokens`, checks credential + license still active at redemption time, atomically marks token used, inserts `verifiers` row, writes `verification_events` and `audit_events`, returns safe credential display payload.

**Double-use prevention:** `UPDATE WHERE status='active'` — atomic, single winner for any concurrent redemptions.

**Safe payload:** credential status/dates, license type/state/status/expiry/current-as-of. No nurse PII, no license number, no raw provider data.

#### Dependency Gap

TASK-0056 Codex QA (issue #11) still open. End-to-end token creation → validation chain requires #11 to resolve before live testing.

---

## Session Activity — 2026-06-02 — Claude

**Task IDs:** TASK-0058
**Status:** Implementation complete — Codex QA Required
**Role:** Claude / Senior Engineer

### TASK-0058 — `/v/{token}` Verifier Flow — Executed

David approved TASK-0058 as APPROVAL-0024 (2026-06-02): "execute 0058".

#### Deliverables

**New Lovable Prompt:** `docs/tasks/LOVABLE_PROMPT_2026-06-02_TASK0058_VERIFIER_FLOW.md`

Instructs Lovable to build the public `/v/:token` verifier page. Form: name, email, required Terms checkbox, optional marketing consent. All eight response states handled. Credential view shows license type/state/status/expiry/current-as-of and disclaimer. Excludes nurse PII, license number, internal IDs.

**Updated Edge Function:** `supabase/functions/token-verify/index.ts` v2

Added optional `marketing_consent` boolean field, passed to `verifiers.marketing_consent`. Required by `verifiers` table schema and verifier flow doc. Defaults false if not provided.

#### Deviations from VERIFIER_CREDENTIAL_VIEW.md

Nurse name and license number excluded from display — `token-verify` intentionally omits them as private data per task spec. Flow doc predates implemented backend contract.

#### Open Items

TASK-0056 QA (issue #11) and TASK-0057 QA (issue #12) still pending. Lovable prompt ready to paste after both pass.

---

## TASK-0057 Remediation — 2026-06-02 — Claude

**Trigger:** Codex blocked verdict — issue #12, 3 × P1 + 1 × P2

### Fixes Applied

| Finding | Fix |
|---|---|
| P1a — `verify_jwt: true` on live | Added `config.toml` (`verify_jwt = false`), redeployed `--no-verify-jwt`; live v3 ACTIVE |
| P1b — GitHub / live out of sync | Both files committed to GitHub (`ce3ae92`) before deploy; now in sync |
| P1c — Verifier/event writes not fail-closed | Resequenced: verifier insert (fail-closed) → events (fail-closed) → mark-used; `token_used` returned on UNIQUE violation |
| P2 — No rejection-path events | All 8 rejection paths write `audit_events: verification.rejected`; `verification_events` requires verifier_id (NOT NULL) so rejections go to audit_events — documented deviation |

### Live State

`token-verify` v3, ACTIVE, 20:25:55 UTC. Issue #12 updated — Codex re-QA requested.

---

## TASK-0057 + TASK-0058 Codex QA Verdicts — 2026-06-02 — Codex

**TASK-0057 Verdict:** Pass with Deferrals (issue #12 closed)
**TASK-0058 Verdict:** Pass with Deferrals (issue #13 closed)

### TASK-0057 Accepted Deferrals

- End-to-end token creation → validation deferred until TASK-0056 QA clears
- Rejection-path `verification_events` deviation accepted (audit_events used; `verifier_id NOT NULL` constraint blocks direct path)
- P2 hardening noted: verification_events insert failure after verifier insert strands token — not a launch blocker

### TASK-0058 Accepted Deferrals

- Lovable prompt not yet applied — live UI + responsive QA pending post paste-in
- Full `/dashboard` → `/v/:token` flow deferred until TASK-0056 QA + conductor acceptance
- `missing_token` route-shape prevention accepted

### Phase 5 Backend QA Status

| Task | QA Status |
|---|---|
| TASK-0055 `dashboard-status` | Pass with Gaps (issue #10 closed) |
| TASK-0056 `share-link-create` | Issue #11 — open, pending Codex re-QA |
| TASK-0057 `token-verify` | Pass with Deferrals (issue #12 closed) |
| TASK-0058 Lovable prompt | Pass with Deferrals (issue #13 closed) |

### Next Actions

1. TASK-0056 issue #11 must resolve before end-to-end flow can be tested
2. David to paste Lovable prompts (TASK-0055 dashboard + TASK-0058 verifier) into Lovable when ready
3. Post-paste Lovable UI QA needed for both prompts

---

## Lovable Implementation Applied — 2026-06-02 — David

**Scope:** TASK-0055 `/dashboard` + TASK-0058 `/v/:token`
**Action:** David pasted both Lovable prompts into Lovable and confirmed execution.

### Applied Prompts

| Task | Prompt | Route |
|---|---|---|
| TASK-0055 | `LOVABLE_PROMPT_2026-06-02_TASK0055_DASHBOARD.md` | `/dashboard` |
| TASK-0058 | `LOVABLE_PROMPT_2026-06-02_TASK0058_VERIFIER_FLOW.md` | `/v/:token` |

### Next Action

Live UI QA for both pages — issue #14 opened for Codex.

End-to-end `/dashboard` share-link creation → `/v/:token` verifier flow still deferred until TASK-0056 QA (issue #11) clears.

---

## Session Closeout — 2026-06-02 — Claude

**Session type:** Extended execution session — Phase 5 backend + Lovable UI implementation
**Closed by:** David

---

### Work Completed This Session

#### Governance

| Item | Action |
|---|---|
| APPROVAL-0020 missing from APPROVALS_LOG | Recorded (TASK-0055) |
| Unapproved `share-link-create` found live on Supabase | Deleted (APPROVAL-0021); local source deleted; cleanup logged |
| Unapproved `share-link-create` local source deleted before Supabase check | Error acknowledged; source recovered via `supabase functions download`; then deleted per David approval |

#### Tasks Executed

| Task | Deliverable | Status |
|---|---|---|
| TASK-0055 | `dashboard-status` Edge Function + Lovable prompt | Codex QA pass-with-gaps; Lovable applied; Live UI QA pending (issue #14) |
| TASK-0056 | `share-link-create` Edge Function + `dashboard-status` real eligibility update | Codex QA pending (issue #11) |
| TASK-0057 | `token-verify` Edge Function v3 (anonymous, fail-closed, rejection audits) | Codex QA pass-with-deferrals |
| TASK-0058 | Verifier Lovable prompt + `token-verify` marketing_consent patch | Codex QA pass-with-deferrals; Lovable applied; Live UI QA pending (issue #14) |

#### Approvals Recorded

| Approval | Task | Decision |
|---|---|---|
| APPROVAL-0020 | TASK-0055 | Approved — "execute 0055" |
| APPROVAL-0021 | TASK-0056 cleanup | Approved — delete unapproved Supabase function |
| APPROVAL-0022 | TASK-0056 | Approved — "execute task 0057" + "Do 0056 first" |
| APPROVAL-0023 | TASK-0057 | Approved — "execute task 0057" |
| APPROVAL-0024 | TASK-0058 | Approved — "execute 0058" |

#### Functions Deployed to Supabase

| Function | Version | Change |
|---|---|---|
| `dashboard-status` | v3 | v1 new; v2 method guard; v3 real share-link eligibility |
| `share-link-create` | v1 | Clean rewrite from spec; all prior P1 bugs fixed |
| `token-verify` | v3 | v1 new; v2 marketing_consent; v3 verify_jwt:false + fail-closed writes + rejection audits |

---

### Open Issues at Session Close

| Issue | Task | Owner | Blocking |
|---|---|---|---|
| [#14](https://github.com/david-bloom/PassTo/issues/14) | TASK-0055 + TASK-0058 Live UI QA | Codex | No — functional, pending UI verification |
| [#11](https://github.com/david-bloom/PassTo/issues/11) | TASK-0056 Codex QA | Codex | Yes — blocks end-to-end share-link flow and `/v/:token` success state |
| [#8](https://github.com/david-bloom/PassTo/issues/8) | TASK-0054 Codex QA | Codex | Pre-existing |
| [#7](https://github.com/david-bloom/PassTo/issues/7) | TASK-0048 David Approval | David | Pre-existing |
| [#6](https://github.com/david-bloom/PassTo/issues/6) | TASK-0040 Codex QA | Codex | Pre-existing |
| [#5](https://github.com/david-bloom/PassTo/issues/5) | TASK-0047 Codex QA | Codex | Pre-existing |
| [#4](https://github.com/david-bloom/PassTo/issues/4) | TASK-0047 David Approval | David | Pre-existing |
| [#3](https://github.com/david-bloom/PassTo/issues/3) | TASK-0046 Live Re-QA | Codex | Pre-existing |
| [#1](https://github.com/david-bloom/PassTo/issues/1) | TASK-0001 Codex QA | Codex | Pre-existing |

---

### What Needs to Happen Next

**Priority 1 — Unblock end-to-end share-link flow:**
Codex QA issue #11 (`share-link-create`) must resolve. Once it passes, the full `/dashboard` share-link creation → `/v/:token` verifier validation chain can be tested live.

**Priority 2 — Live UI QA:**
Codex issue #14 covers `/dashboard` and `/v/:token` live UI testing. Failure-state testing on `/v/:token` is available now. Success-state testing requires issue #11 to clear first.

**Priority 3 — TASK-0059 (Phase 5 QA closure):**
Once issues #11 and #14 resolve, TASK-0059 (Phase 5 Codex QA) can run to formally close Phase 5.

**To resume:** David sends `C` to trigger a fresh GitHub scan and act on any Codex findings.

---

### Deployment Guard Notes

- `SHARE_LINK_BASE_URL` secret not yet set in Supabase — defaults to `https://passtodigital.com/v`. Must be configured before production use.
- Wallet signing (`APPLE_WWDR_PEM_BASE64`, `APPLE_CERT_PEM_BASE64`, `APPLE_KEY_PEM_BASE64`, `GOOGLE_SERVICE_ACCOUNT_JSON`) not yet configured — wallet passes will remain in error state until configured.
- `TASK-0056` P2 hardening noted: if `verification_events` insert fails after `verifiers` insert, token is stranded. Not a launch blocker but should be addressed before production scale.

---

## TASK-0065 — Supabase Auth Password Reset Redirect Fix — 2026-06-02 — Claude

**Approval:** APPROVAL-0025 (recorded in task spec)
**Scope:** Supabase Auth URL configuration change only — no migrations, no Edge Function deployments

### Before State

| Setting | Value |
|---|---|
| Site URL | `http://localhost:3000` |
| Redirect URLs | None |

### After State

| Setting | Value |
|---|---|
| Site URL | `https://app.passtodigital.com` |
| Redirect URL 1 | `https://app.passtodigital.com/update-password` |
| Redirect URL 2 | `https://app.passtodigital.com/reset-password` |
| Redirect URL 3 | `https://app.passtodigital.com/**` |

### Deviation

Task spec target was `enroll.passtodigital.com`. Live app is at `app.passtodigital.com` (David confirmed 2026-06-02). All redirect targets use `app.passtodigital.com`.

**Follow-up required (out of scope for TASK-0065):** Edge Function CORS headers still reference `enroll.passtodigital.com`. If `app.passtodigital.com` is the permanent live domain, CORS must be updated across all functions before production.

### Outstanding QA

Live password reset email test required — trigger reset, inspect link host, confirm `app.passtodigital.com` not `localhost`, verify update-password route works.

---

## TASK-0065 Remediation + TASK-0066 Spawned — 2026-06-02 — Claude

**Approval:** APPROVAL-0026 (Codex Approve-With-Modifications, relayed by David)
**Scope:** Supabase Auth URL Configuration correction + Lovable instruction prompts. No Edge Function deployments. No code changes.

### Context: 3-app architecture clarified

David clarified that PassTo MVP runs across three Lovable projects:

| Project | Lovable ID | Domain | Purpose |
|---|---|---|---|
| Marketing | `6c973fd1-2dcd-4377-8c98-4d2f0d68732e` | (TBD) | Landing |
| Enrollment | `d279ccd3-8397-4e7b-933c-8f5c8468d19e` | `enroll.passtodigital.com` | Sign-up, ID verification, license, wallet pass setup |
| App | `9a223cc4-ef58-43d4-929a-4c0424b586c2` | `app.passtodigital.com` | Nurse dashboard, share-link, `/v/:token`, password reset, account |

### What went wrong

After TASK-0065's initial implementation set Site URL to `https://app.passtodigital.com`, David reported a 404 at `https://app.passtodigital.com/id-verification` after login. Claude misdiagnosed this as the Lovable dashboard and verifier prompts having been applied to the wrong project. Claude began reverting Supabase Auth URL Configuration toward `enroll.passtodigital.com`; changed Site URL back to `enroll`, did not touch the redirect URLs. This produced an inconsistent half-state.

David's architecture clarification confirmed the original `app.passtodigital.com` Site URL was correct. The 404 root cause is the enrollment-app routing nurses to the Site URL host (which does not own `/id-verification`), and the fix is explicit Lovable `redirectTo` values, not further Supabase URL config changes.

### What Codex approved (APPROVAL-0026)

Final Supabase Auth URL Configuration applied 2026-06-02:

| Setting | Final value |
|---|---|
| Site URL | `https://app.passtodigital.com` |
| Redirect URL 1 | `https://app.passtodigital.com/update-password` |
| Redirect URL 2 | `https://app.passtodigital.com/reset-password` |
| Redirect URL 3 | `https://app.passtodigital.com/dashboard` |
| Redirect URL 4 | `https://enroll.passtodigital.com/post-login` |
| Redirect URL 5 | `https://enroll.passtodigital.com/id-verification` |

`app.passtodigital.com/**` wildcard removed per Codex guidance against broad production wildcards.

Verification: dashboard reported "Successfully updated site URL" and "Successfully removed URL(s)" toasts; final state shows "Total URLs: 5".

### Companion Lovable prompts produced (not yet applied)

- `docs/tasks/LOVABLE_PROMPT_2026-06-02_TASK0065_ENROLLMENT_REDIRECT.md` — instructs the Enrollment Lovable project to pass explicit `emailRedirectTo` at every Supabase Auth call site so mid-onboarding nurses stay on `enroll.passtodigital.com`.
- `docs/tasks/LOVABLE_PROMPT_2026-06-02_TASK0065_APP_RESET.md` — instructs the App Lovable project to pass explicit `redirectTo` for `resetPasswordForEmail` and to route partially-enrolled nurses back to `enroll.passtodigital.com/post-login` after sign-in.

### TASK-0066 spawned

Codex required Edge Function CORS allow-list changes for `dashboard-status`, `share-link-create`, and `token-verify` to be routed to a separate approved task. Spec drafted at `docs/tasks/TASK-0066.md` — Status: Spec Drafted — Awaiting David Approval. TASK-0066 includes a David decision gate on whether `token-verify` should lock to `app.passtodigital.com` (Claude's recommendation) or retain `*` as an intentional public anonymous endpoint.

### What did NOT happen this session

- No Edge Function source changes.
- No Edge Function redeployments.
- No database migrations, RLS changes, or secrets changes.
- No Lovable code changes — only instruction prompts produced for Lovable.
- No production launch decision; no Done/closure decision on TASK-0065.

### Outstanding work

1. David approves TASK-0066 (and chooses `token-verify` CORS option A vs B). Claude executes once approved.
2. Lovable applies the two redirect prompts to the enrollment and app projects.
3. Live QA: password reset round-trip on the app; sign-up round-trip on the enrollment app; mid-onboarding sign-in stays on enroll.
4. Codex re-QA on TASK-0065 after the full chain is verified live.

---

## TASK-0066 Executed — Edge Function CORS Allow-List for App Domain — 2026-06-02 — Claude

**Approval:** APPROVAL-0027 (Codex Approve-With-Modifications via APPROVAL-0026 spec + David execution authorization + Option A for token-verify).
**Scope:** Edge Function CORS allow-list correction. No database, no RLS, no secrets.

### Context

Block A SQL seed (david@passtodigital.com promoted to verified IAL2 + synthetic license + active credential) was applied earlier in the session, and the gate chain verified READY for share-link-create. When David signed in on app.passtodigital.com and visited /dashboard, the App displayed "Something went wrong." Live `OPTIONS` preflight against `dashboard-status` returned `access-control-allow-origin: https://enroll.passtodigital.com`, confirming CORS as the root cause — the App browser at app.passtodigital.com was being blocked from reading the function's responses.

### What was changed (final live state)

| Function | Final version | CORS allow-origin | verify_jwt |
|---|---|---|---|
| `dashboard-status` | v6 | `https://app.passtodigital.com` | true |
| `share-link-create` | v4 | `https://app.passtodigital.com` | true |
| `token-verify` | v6 | `https://app.passtodigital.com` (Option A) | false (preserved) |

GitHub source for all 3 updated on `main` to match deployed state.

### In-session deploy → rollback → re-apply trail (lessons learned)

The CORS deployment happened three times this session due to an evidence/attribution mistake:

1. **Initial deploy (TASK-0066 execution).** David approved Option A. Claude pushed source + deployed. Live state: app origin on all 3. Dashboard worked. David confirmed "IT WORKED."

2. **Rollback (David's instruction).** David noted that publishing the Lovable App project had been the actual fix for the "Something went wrong" error and directed a rollback of TASK-0066, treating the CORS deploy as a red herring. Claude executed the rollback — restored prior CORS values (enroll origin / `*`) on GitHub + Supabase.

3. **Re-apply (after evidence).** Subsequent test sign-in by David surfaced "Could not load your profile" — same symptom class as before. Edge Function log review showed that the two successful `dashboard-status` 200 GETs during the "IT WORKED" window had ALL occurred against v4 (the CORS = app deployment). Post-rollback, no successful GETs. This evidence demonstrated the CORS fix was actually required — the Lovable publish was a necessary but insufficient fix. Claude re-applied TASK-0066 (commits `aa53f734`, `9f46ec2a`, `36effc56`; deploys v6/v4/v6). Live state matches the originally-approved policy.

**Lesson:** When David and Claude disagree on root cause, cross-check against Edge Function logs / server evidence BEFORE rolling back working code. Claude's mistake was acting on the rollback request without first asking Edge Function logs whether the dashboard had actually been hitting the function during the "IT WORKED" window.

### Companion artifacts

- `docs/tasks/LOVABLE_PROMPT_2026-06-02_APP_LAUNCH_READINESS.md` — consolidated Lovable prompt covering 8 launch-readiness items (P0 share-link UI, P1 routing/copy/recovery-context fixes, P2 metadata/titles/header) surfaced during this session's QA. /verify-demo decision pending David.
- `docs/activity_log/APPROVALS_LOG.md` — APPROVAL-0027 entry recording the David approval + execution scope.

### What did NOT happen this session

- No database migrations, RLS changes, or secrets changes.
- No Lovable code changes from Claude (Lovable applies frontend changes; Claude produced the prompt only).
- No production launch decision.
- No TASK-0066 Done decision (pending Codex re-QA after Lovable applies launch-readiness fixes and the share-link → verifier round-trip is exercisable end-to-end).
- No changes to `david@passtodigital.com` or `test-nurse-001@passtodigital.com` test-data seeds (Block A and Block B remain in place).

### Outstanding work (gating Done)

1. David decides `/verify-demo` route disposition (remove / gate / keep).
2. Lovable applies the launch-readiness prompt to the App project.
3. End-to-end share-link → verifier round-trip exercised on app.passtodigital.com.
4. Codex re-QA against the live App + Edge Function state.

---

## Manual E2E QA Run — 2026-06-03 — Claude (QA Agent)

**Scope authority:** `docs/team_charter/PASSTO_MANUAL_E2E_QA_SCOPE.md` v3,
commit `085104a` (branch `codex/manual-e2e-qa-scope`)
**Domains tested:** `app.passtodigital.com`, `enroll.passtodigital.com`
**Test identities:** `test-nurse-001@passtodigital.com` (Block-B seeded),
`test-nurse-002@passtodigital.com` (fresh auth user, no seed)

### 11 findings raised

See `docs/activity_log/QA_FINDINGS_LOG.md` for full finding records.

| ID | Severity | Title | Final Status |
|---|---|---|---|
| QA-001 | P0 | Share Credential UI was "Coming Soon" | `codex_verification_requested` |
| QA-002 | P0 | `profiles.license_id` 400 bug — blocked every fresh login | `codex_verification_requested` |
| QA-003 | P0 | `share-link-create` returned wrong host in share_url | `codex_verification_requested` |
| QA-004 | P1 | `/` no redirect for signed-in users | `open` |
| QA-005 | P1 | `/update-password` no recovery-context check | `open` |
| QA-006 | P1 | `/verify-demo` exposes fabricated credentials | `decision_pending` |
| QA-007 | P1 | "Wallet Passes Preparing" copy for not_attempted state | `codex_verification_requested` |
| QA-008 | P2 | Lovable default metadata — partial fix (OG image URL remaining) | `applied_partial` |
| QA-009 | P2 | Inconsistent page titles per route | `codex_verification_requested` |
| QA-010 | P1 | No header / nav / sign-out on /dashboard | `codex_verification_requested` |
| QA-011 | P0 | enroll `/post-login` route missing — 404 on partial-nurse cross-domain handoff | `codex_verification_requested` |

### Tests that passed (within scope)

QA-A1, QA-A3, QA-A4, QA-A5, QA-A6 (post-fix), QA-A7, QA-A8, QA-A9,
QA-A10, QA-A12, QA-A13 (inspect-only), QA-E1, QA-E2 (ID.me sandbox
redirect handshake), QA-011 cold + authenticated cross-domain path.

### Fixes applied during run

- **QA-002** (Lovable): `profiles.license_id` removed from App post-signin
  SELECT. Verified live at 15:10 UTC.
- **QA-003** (David): `SHARE_LINK_BASE_URL` Supabase secret set to
  `https://app.passtodigital.com/v`. Approval recorded as APPROVAL-0028.
- **QA-011** (Lovable enroll): `/post-login` route implemented. Verified
  cold + authenticated paths both resolve to `/id-verification`.
- **QA-007, QA-009, QA-010** (Lovable App): Wallet copy rewritten per-provider;
  per-route titles set; AppHeader with sign-out added. All visually verified
  by QA Agent.
- **QA-008** (Lovable App): Partial fix — title/og-title/badge resolved;
  OG/Twitter image URL still on Lovable CDN (remaining gap).
- **QA-001** (Lovable App, pre-run): Share Credential button wired to
  share-link-create Edge Function. Verified working during run.

### Deferred scopes

- Block E (ID.me sandbox completion past IAL1 wall)
- Block S (Stripe sandbox — no upgrade surface reachable from current App)

### Scope compliance

No real PII used. No secrets/tokens captured. No Supabase/Edge Function/
Vercel/DNS/wallet/GitHub config changes by Claude. No finding marked closed
by Claude. No QA-pass or launch-readiness declaration made.

---

## Session Activity — 2026-06-03 (post-deployment) — Claude

**Task ID:** TASK-LAUNCH-READINESS remediation completion verification
**Status:** Four launch-readiness fixes applied, verified live, QA findings log updated
**Role:** Claude / QA Verification
**Summary:** Lovable completed all four remaining remediation issues and deployed to production (2026-06-03). Claude verified all acceptance criteria against live production URLs and updated source-of-truth QA findings log.

### Fixes Applied & Verified

| Issue | Fix | Verification |
|---|---|---|
| **QA-004** | Root route auto-redirect for authenticated users (getSession + onAuthStateChange) | ✅ Verified: signed-in → /dashboard, no-session → form |
| **QA-005** | /update-password recovery context check (PASSWORD_RECOVERY event or active session) | ✅ Verified: no-session → "invalid link", recovery email → form |
| **QA-006** | /verify-demo route deleted entirely (David disposition: remove) | ✅ Verified: route returns 404, codebase grep "verify-demo" returns 0 |
| **QA-008** | OG/Twitter images now at https://app.passtodigital.com/og-image.jpg (PassTo-controlled) | ✅ Verified: live view-source shows PassTo domain, image serves 200 OK |

### Acceptance Criteria Met

- QA-004: All 4 criteria ✅
- QA-005: All 3 criteria ✅  
- QA-006: All 4 criteria ✅
- QA-008: All 5 criteria ✅

### Source-of-Truth Updates

Updated `docs/activity_log/QA_FINDINGS_LOG.md`:
- QA-004: status `open` → `applied`
- QA-005: status `open` → `applied`
- QA-006: status `decision_pending` → `applied`
- QA-008: status `applied_partial` → `applied`

Aggregate status: 11 findings now {5 applied, 2 codex_verification_requested, 4 codex_verified} (0 open, 0 decision_pending, 0 applied_partial)

### Production Evidence

**Live URLs verified:**
- `https://app.passtodigital.com/` (authenticated redirect working)
- `https://app.passtodigital.com/update-password` (recovery context check working)
- `https://app.passtodigital.com/verify-demo` (route not found)
- `https://app.passtodigital.com/og-image.jpg` (image accessible, PassTo-branded)

**Curl verification:**
- og:image meta tag: `https://app.passtodigital.com/og-image.jpg` ✅
- twitter:image meta tag: `https://app.passtodigital.com/og-image.jpg` ✅

### Next Steps

Remaining items for launch readiness:
- **QA-001, QA-009**: Codex verification requested (already marked in findings log)
- **All 11 findings**: Once Codex verifies QA-001 and QA-009, full QA pass + launch readiness sign-off

### Files Committed

- `docs/activity_log/QA_FINDINGS_LOG.md` — updated with completion of QA-004, 005, 006, 008

Commit: 1aec3d7 (pushed to main)
