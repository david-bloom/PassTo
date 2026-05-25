# PassTo MVP Task Backlog

**Status:** Draft Baseline — Ready for David Review  
**Owner:** Codex  
**Created:** 2026-05-25  
**Related Task:** TASK-0003  
**Source:** `/docs/prd/PASS_TO_PRD.md`  

## Purpose

This backlog translates the PassTo PRD v0.1 into MVP execution epics suitable for later Codex task specs and Claude implementation tasks.

This document is not an authorization to implement. Each implementation task still requires David approval and should follow the PassTo task governance process.

## Sequencing Principles

1. Define platform responsibility boundaries before implementation.
2. Define subscription gating rules before building gated features.
3. Define Supabase schema/RLS before writing production data workflows.
4. Build trust gates before credential issuance.
5. Build safe failure visibility before commercial launch.
6. Keep Lovable as the MVP frontend/website host unless a blocker is identified.
7. Prefer Supabase Edge Functions for orchestration where practical.
8. Use Vercel only where needed for sensitive backend/API routes or existing integration code.

---

## EPIC-001 — Lovable MVP Frontend and Route Map

**Goal:** Define the MVP Lovable route map, existing screen reuse, and frontend/backend boundaries.

### Candidate tasks

- Inventory current Lovable pages, forms, and backend calls.
- Identify old Make webhook calls that must be replaced.
- Map MVP routes:
  - `/`
  - `/enroll`
  - `/verify-identity`
  - `/verify-phone`
  - `/license-lookup`
  - `/data-match-review`
  - `/selfie`
  - `/dashboard`
  - `/share`
  - `/show-qr`
  - `/v/{token}`
  - `/upgrade`
  - `/pdf-export`
- Define which pages are nurse-facing, verifier-facing, and admin/ops-facing.
- Define UI states for pending, success, failure, retry, and support paths.
- Document which API/Edge Function each page needs.

### Acceptance criteria

- Lovable remains MVP frontend/website host.
- No privileged secrets are stored in Lovable frontend code.
- Backend endpoint needs are clear enough for Supabase/Vercel tasking.

---

## EPIC-002 — Supabase Foundation

**Goal:** Establish Supabase as system of record, auth/data foundation, and RLS boundary.

### Candidate tasks

- Review Claude Task 001-R schema remediation artifact.
- Reconcile schema artifact with PRD v0.1.
- Resolve outstanding schema questions:
  - audit action namespace
  - primary license designation
  - RLS test approach
  - show_qr verifier behavior
  - PDF QR token type
  - DECISION-0011 documentation inconsistency
- Create final Supabase schema and RLS plan.
- Define service-role-only operations.
- Define required Edge Functions.

### Acceptance criteria

- Codex signs off on schema/RLS plan before migration.
- David approves migration before production application.
- RLS testing approach is defined before launch.

---

## EPIC-003 — Account and Profile Onboarding

**Goal:** Allow a nurse to create an account and enter the credential issuance funnel.

### Candidate tasks

- Define Supabase Auth signup/login flow.
- Create or reuse Lovable account/profile screens.
- Create `profiles` linkage to auth user.
- Define onboarding step state machine.
- Define email capture and consent requirements.
- Define support/retry states.

### Acceptance criteria

- Nurse can create an account.
- Profile state persists in Supabase.
- User cannot access credential issuance before required gates pass.

---

## EPIC-004 — Identity Verification, Phone Verification, License Lookup, and Data Matching

**Goal:** Implement the trust workflow that gates credential issuance.

### Candidate tasks

- Define ID.me authorization and callback flow.
- Define ID.me assurance-level handling: IAL2 success, IAL1 retry/support, failure states.
- Define uniqueness/deduplication behavior using ID.me subject.
- Define Twilio phone verification flow.
- Resolve Twilio A2P 10DLC readiness or fallback.
- Define RapidAPI / Propelus license lookup flow.
- Define data matching algorithm:
  - name normalization
  - word-boundary comparison
  - match pass/fail result
  - account flagging
  - audit/event write
  - temporary identity field cleanup
- Define selfie capture flow.
- Replace old Make-dependent logic with Supabase Edge Functions where practical.

### Acceptance criteria

- Credential issuance is blocked until identity, phone/fallback, license lookup, and data-match gates pass.
- Failed match blocks issuance and creates ops-visible state.
- Temporary sensitive identity fields are minimized and never returned to frontend responses.

---

## EPIC-005 — License and Credential Records

**Goal:** Store license and credential state in Supabase and expose safe nurse-facing dashboard data.

### Candidate tasks

- Finalize license record fields.
- Finalize credential/pass record fields.
- Define status translation fields:
  - source raw status
  - source display status
  - normalized status
  - status intent
  - wallet pass treatment
  - checked-at timestamp
- Define primary license behavior.
- Define multiple-license entitlement behavior.
- Define dashboard query/API.

### Acceptance criteria

- Nurse can view credential and license status.
- Unknown or failed verification status does not issue a valid credential.
- Active licenses expiring within 30 days receive caution treatment.

---

## EPIC-006 — Wallet Pass Issuance and Lifecycle

**Goal:** Issue and manage wallet credentials through PassKit / Apple Wallet / Google Wallet.

### Candidate tasks

- Decide whether PassKit templates precede or follow schema migration.
- Define pass template fields and current-as-of display.
- Define Apple Wallet issuance path.
- Define Google Wallet issuance path.
- Define wallet pass failure state.
- Define wallet pass update/refresh behavior.
- Confirm wallet pass does not include permanent verification QR.

### Acceptance criteria

- Wallet pass issuance is treated as core MVP.
- Wallet pass status accurately reflects credential/license treatment.
- Wallet pass failure is visible to user/admin and alerts ops where critical.

---

## EPIC-007 — Verifier Credential View

**Goal:** Allow external verifiers to view a controlled credential snapshot without creating an account.

### Candidate tasks

- Define `/v/{token}` route behavior.
- Define verifier form fields: name and email only.
- Define Terms of Use acceptance requirement.
- Define optional marketing consent.
- Define credential display fields.
- Define current-as-of disclaimer.
- Define token states: active, used, expired, revoked, invalid.
- Define audit/verification event writes.

### Acceptance criteria

- Verifier can view credential only with valid token.
- Verifier access is one-time and short-lived.
- Verifier form does not over-collect data.
- Credential view includes required disclaimers.

---

## EPIC-008 — Share Links and QR Codes

**Goal:** Allow nurses to create controlled share links and show-QR sessions.

### Candidate tasks

- Define share link creation flow.
- Define show-QR creation flow.
- Define token TTLs:
  - share_link currently assumed 72 hours
  - show_qr currently assumed 45 minutes
- Define token hashing and raw-token return-once behavior.
- Define entitlement/payment gates for share actions.
- Define nurse dashboard history.
- Define QR rendering in Lovable.

### Acceptance criteria

- Tokens are one-time and short-lived.
- Wallet pass does not use permanent verifier QR.
- Payment/entitlement gates cannot be bypassed from frontend.

---

## EPIC-009 — Subscription Gating and Stripe Integration

**Goal:** Define and implement feature gating and Stripe payments/subscriptions.

### Candidate tasks

- Reconcile Standard/Premier pricing discrepancy.
- Confirm Free, Standard, Premier entitlements.
- Define one-off paid actions.
- Define additional license purchase behavior, including whether Free can buy additional licenses.
- Define subscription lapse behavior.
- Define Stripe checkout and webhook flows.
- Define purchases/payments records.
- Define gate checks for share, QR, refresh, PDF, additional licenses, notifications, and wallet lifecycle.

### Acceptance criteria

- Gate rules are defined before gated features are built.
- Stripe state is reflected safely in Supabase.
- Payment failures block paid actions without corrupting credential state.

---

## EPIC-010 — Refresh and Status Updates

**Goal:** Support manual, paid, tier-included, and/or scheduled credential refresh behavior.

### Candidate tasks

- Define refresh triggers by tier.
- Define RapidAPI / Propelus refresh behavior.
- Define refresh event records.
- Define wallet pass update after refresh.
- Define user notifications after refresh.
- Define failure handling when lookup is unavailable.

### Acceptance criteria

- Refresh updates license and credential state safely.
- Failed refresh does not incorrectly mark a credential valid.
- Refresh visibility exists for user/admin.

---

## EPIC-011 — Notifications and Ops Alerts

**Goal:** Define and implement user-facing notifications and operational alerts.

### Candidate tasks

- Define notification matrix by event and tier.
- Define Postmark transactional email templates.
- Define ops alert triggers.
- Define delivery event records.
- Define fallback if Postmark fails.
- Define Twilio/SMS notifications if A2P readiness permits.

### Acceptance criteria

- Critical user lifecycle events have notification behavior.
- Critical integration failures alert ops.
- Delivery failures are logged.

---

## EPIC-012 — PDF Export

**Goal:** Provide durable static credential exports with current-as-of disclosure.

### Candidate tasks

- Confirm PDFMonkey as MVP provider or replace.
- Define PDF fields and disclaimer copy.
- Define PDF storage location and retention.
- Define entitlement/payment gate.
- Define PDF QR/token behavior.
- Define PDF failure/retry behavior.

### Acceptance criteria

- PDF shows current-as-of information.
- PDF export is permissioned and paid/tier-gated correctly.
- PDF generation failures are visible and retryable.

---

## EPIC-013 — Admin/Ops Tools

**Goal:** Give David/PassTo sufficient operational visibility for MVP launch.

### Candidate tasks

- Decide admin mechanism: Supabase dashboard/views first vs. Lovable admin UI.
- Define admin views for users, licenses, credentials, verification events, payments, failed jobs, notifications, and audit events.
- Define retry/resolution paths.
- Define support escalation states.

### Acceptance criteria

- Ops can inspect critical failure states.
- Ops can identify blocked onboarding and failed issuance cases.
- Ops has a safe path to retry or resolve known failure states.

---

## EPIC-014 — QA and Security Validation

**Goal:** Validate product, RLS, backend, payment, and integration safety before launch.

### Candidate tasks

- Create QA test matrix.
- Create RLS policy tests.
- Validate service-role-only operations.
- Validate token hashing and one-time use.
- Validate payment gate enforcement.
- Validate degraded-mode behavior.
- Validate no sensitive temporary identity fields leak to frontend.
- Validate audit/event writes.

### Acceptance criteria

- Critical user journeys pass QA.
- RLS prevents cross-user access.
- Payment gates cannot be bypassed.
- Token behavior meets security requirements.

---

## EPIC-015 — Launch Readiness

**Goal:** Ensure MVP can launch without known commercial or operational blockers.

### Candidate tasks

- Confirm Twilio A2P 10DLC readiness or approved fallback.
- Confirm ID.me production credentials.
- Confirm RapidAPI / Propelus production setup and limits.
- Confirm Stripe products/prices/webhooks.
- Confirm Postmark sender/domain setup.
- Confirm PDF provider setup.
- Confirm PassKit / Apple Wallet / Google Wallet setup.
- Confirm Terms of Use and verifier disclaimer.
- Confirm support/contact path.
- Confirm monitoring/alerting baseline.

### Acceptance criteria

- No unresolved launch-critical provider blockers.
- Legal/disclaimer copy is approved enough for MVP.
- Ops alerting and support path are live.
- David approves launch readiness.

---

## Cross-Epic Open Decisions

1. Final Standard and Premier subscription prices.
2. Whether Free users can buy additional licenses in MVP.
3. Final verifier token lifecycle, including PDF QR behavior.
4. Twilio A2P 10DLC readiness and launch fallback.
5. Admin mechanism: Supabase dashboard/views first vs. Lovable admin UI.
6. Whether Vercel is needed for specific MVP backend/API routes.
7. PassKit template sequencing.
8. Terms of Use and verifier disclaimer final copy.
9. DECISION-0011 cleanup in canonical decision documentation.

## Recommended Next Task

```text
TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map
```

Purpose:

- Prevent frontend/backend responsibility drift.
- Identify all Lovable screens and backend endpoints.
- Decide which backend operations are Supabase Edge Functions vs. Vercel routes.
- Create a clean handoff foundation for schema, RLS, and Claude implementation tasks.
