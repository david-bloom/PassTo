# PassTo Product Requirements Document

**Status:** Approved Consolidated PRD - Section 3 ID.me-first revision proposed 2026-05-31  
**Owner:** David Bloom  
**Drafting Support:** Codex and Claude  
**Created:** 2026-05-26  
**Approved:** 2026-05-26  
**Source:** Approved PRD Sections 1-7  

## 1. Product Summary, Technical Context, and Current Build State

PassTo is a verified digital nursing license credential for U.S. nurses. It is designed to be stored in Apple Wallet or Google Wallet and shared through a controlled link-based verification flow.

PassTo helps a nurse prove, quickly and credibly, that they are who they say they are and that they hold a valid, current nursing license. It helps verifiers, employers, staffing agencies, and reviewers check credential status without relying on screenshots, paper documents, slow manual lookups, or fragmented state-board workflows.

The MVP is focused on the nurse-owned credential. PassTo is not an employer credentialing management platform, a replacement for state nursing boards, or a background check product. It is a portable trust layer that sits between nurses, license data sources, and the people who need to verify licensure.

The primary MVP user is the nurse credential holder, with travel nurses as the beachhead segment. The primary verifier user is an employer, staffing agency reviewer, facility administrator, or other person who needs to confirm that a nurse's license credential is valid and current.

The MVP must prove that a nurse can create a trustworthy digital credential and that a verifier can confidently inspect it.

At minimum, the MVP must show that PassTo can:

- Create or link a nurse account and credential profile after secure onboarding.
- Verify identity through ID.me at the required assurance level.
- Verify phone possession through Twilio SMS.
- Look up nursing license data through the approved license source.
- Match the verified identity to the license record before credential issuance.
- Capture a selfie after a successful match.
- Issue a wallet-ready credential.
- Let the nurse display credential status and create a controlled share link.
- Let a verifier view a controlled credential record.
- Maintain enough audit, event, and operational history to support launch.

The confirmed MVP stack is:

- **Lovable:** MVP frontend experience and user-facing routes.
- **Supabase:** System of record, database, Auth backend, RLS, Edge Functions where practical, Storage where needed, audit/event persistence, and most backend trust decisions.
- **Vercel:** Targeted backend/API routes only where Supabase Edge Functions are not the right fit, especially wallet signing or Node-specific libraries.

Airtable and Make are no longer the target MVP architecture. Prior business rules, failure paths, and audit requirements carry forward unless explicitly revised.

## 2. Users, MVP Goals, and Scope Boundaries

### MVP Users

- **Nurse credential holder:** starts secure onboarding, verifies identity, confirms contact/profile info, connects a license, passes data matching, verifies phone, captures a selfie, receives a wallet credential, and manages credential actions.
- **Verifier / employer / reviewer:** inspects credential status through controlled tokenized access. No PassTo account required for MVP.
- **PassTo admin / operations user:** David or approved support operator using Supabase dashboard/views and logs.

Institutional buyers, employer accounts, employer dashboards, multi-user teams, and enterprise workflows are post-MVP unless David explicitly reopens that scope.

### MVP Goals

The MVP must:

- Let a nurse create or link a PassTo account and profile through secure onboarding.
- Verify identity through ID.me at the required assurance level.
- Verify phone possession through Twilio SMS.
- Look up a nursing license through the approved license source.
- Confirm license ownership through data matching before credential issuance.
- Capture and store a selfie as part of the trust workflow.
- Create a credential record only after required gates pass.
- Issue a wallet pass as a launch-critical product capability.
- Let the nurse view credential and license status in a dashboard.
- Let a verifier inspect credential status through a controlled share-link flow.
- Enforce subscription and entitlement rules server-side.
- Maintain audit, event, payment, and verification history sufficient for commercial launch.

### Launch-Critical Capabilities

- ID.me-first onboarding, account/profile linking, and Supabase Auth.
- ID.me identity verification.
- Twilio phone verification.
- License lookup.
- Data matching.
- Selfie capture and storage.
- Credential record creation.
- Wallet pass issuance.
- Nurse dashboard.
- Share-link verifier access.
- Stripe subscriptions and entitlement gating.
- Audit/events/RLS/security baseline.
- Ops visibility through Supabase.

### Deferred Capabilities

- Show QR.
- PDF export.
- Scheduled automated refresh.
- Additional license flow.
- Lovable admin UI.
- Employer dashboard.
- Institutional billing.
- Deep analytics.

### Confirmed Scope Decisions

- Show QR is deferred from launch-critical MVP.
- PDF export is deferred from launch-critical MVP.
- Wallet pass issuance is launch-critical.
- Twilio phone verification is launch-critical.
- Selfie storage is owned by PassTo using Supabase Storage.
- Subscription lapse downgrades the user to Free behavior.
- `passtodigital.com` currently routes to P1.

When a subscription lapses, PassTo downgrades the account to Free-tier behavior rather than deleting or revoking existing credential records. The nurse's credential remains visible, existing credential and wallet records are retained, paid-tier-only actions are blocked, and audit/payment/subscription events are retained.

## 3. End-to-End MVP User Journeys

The launch-critical MVP journey is:

```text
Nurse discovers PassTo
-> starts ID.me verification
-> enters license details
-> license lookup runs
-> data match runs
-> confirms matched identity/license/contact info
-> verifies phone by SMS OTP from the same confirmation page
-> chooses plan
-> pays if needed
-> selfie is captured and stored
-> credential record is created
-> wallet pass is issued
-> nurse reaches dashboard
-> nurse creates share link
-> verifier opens link
-> verifier submits minimal info and accepts terms
-> verifier views credential status
```

### ID.me-First Onboarding and Account/Profile Linking

The nurse starts onboarding with ID.me rather than password-first account creation. ID.me verification happens through a trusted backend flow. Supabase Auth/profile state is created or linked after backend verification. After license lookup and identity/license binding pass, the nurse confirms safe matched identity, license, and contact fields before phone OTP verification. Account/profile linking does not itself authorize credential issuance.

### Identity Verification

The nurse completes ID.me verification as the first substantive enrollment step. Lovable starts or displays the flow, but token exchange, assurance-level validation, identity result handling, and audit writes happen in a trusted backend context. IAL2 is required for credential issuance.

### Phone Verification

After license lookup and ID.me/license binding pass, the nurse confirms contact information and verifies phone possession through Twilio SMS. Lovable may show this as one combined `/confirm-info` page: confirm info, send OTP, enter OTP, then proceed to plan selection. Backend code still treats confirmation and OTP verification as separate trust events. Credential issuance remains blocked until phone verification passes.

### License Lookup

After ID.me verification, the nurse enters required license details. Lovable invokes a dedicated backend license lookup function. License lookup remains separate from ID.me exchange so audit, retry, and failure handling stay clear. Plan selection and payment should not be requested until lookup, identity/license binding, contact confirmation, and phone OTP verification pass.

### Data Matching

Backend code compares normalized ID.me identity data against license source data. Data matching is a hard issuance gate. Failed matching blocks issuance, flags the account/credential state, writes an audit event, and requires remediation/support.

### Selfie Capture

After successful data matching, phone verification, and plan/payment handling where required, the nurse captures a selfie. Lovable owns the UI. The selfie is stored in protected Supabase Storage. Credential issuance remains blocked until selfie capture succeeds if selfie is required for launch.

### Credential Creation and Wallet Issuance

After all gates pass, backend code creates the credential record and triggers wallet pass issuance automatically at the end of enrollment. PassReady or equivalent UI shows status. Wallet signing may use Vercel where Node libraries, certificates, or wallet provider SDKs require it.

### Dashboard

The nurse dashboard shows credential status, license status, current-as-of timestamp, wallet readiness, subscription/tier state, and launch-critical actions only. Show QR and PDF export are deferred.

### Share Link and Verifier View

The nurse creates a controlled share link. Backend checks ownership and entitlement, stores only a token hash, and returns the raw token once. The verifier opens `/v/{token}`, submits name/email, accepts Terms, and views safe credential status. The backend creates verifier and verification event records.

## 4. Data Model, RLS, and Backend Responsibilities

Supabase is the MVP source of truth. The current connected PassTo Supabase project is:

```text
wvzjfxacykgsaffskgtr
```

Canonical MVP tables:

- `profiles`
- `licenses`
- `credentials`
- `wallet_passes`
- `verification_tokens`
- `verifiers`
- `verification_events`
- `stripe_customers`
- `subscriptions`
- `payments`
- `stripe_events`
- `notification_events`
- `refresh_events`
- `pdf_exports`
- `audit_events`
- `license_status_mappings`

Supabase Storage owns protected product assets. Launch-critical storage is selfies. Generated PDFs are deferred with PDF export.

RLS must enforce:

- Nurses access only their own allowed data.
- Nurses cannot access other nurses' data.
- Verifiers cannot browse Supabase tables directly.
- Anonymous users cannot browse credential records.
- Privileged tables and actions are service-role-only.
- Payment-gated actions cannot be bypassed by client-side writes.
- Audit and verification history is retained and protected.

Lovable may use the Supabase publishable key and the logged-in user's JWT for user-scoped access. Lovable must not use the service-role key, write trust decisions, create verification tokens directly, write payment truth directly, validate verifier tokens, or decide whether credentials can be issued.

Service-role-only operations include ID.me token exchange, Twilio send/verify, license lookup, data matching, credential creation, wallet signing/issuance/update, verification token creation, verifier token validation, verifier/event creation, Stripe checkout/webhooks, subscription/payment updates, audit writes, license status mapping resolution, and privileged storage handling.

Supabase Edge Functions are the preferred backend orchestration layer. Vercel should be used only where Supabase Edge Functions are not the right tool, especially wallet pass signing if Node-specific libraries, certificates, or provider SDKs require it.

Verifier access uses hashed short-lived tokens. MVP token type is `share_link`. `show_qr` and `pdf_qr` are deferred.

This PRD does not authorize schema migration execution. Migration execution requires v4 migration SQL, RLS test plan, Codex review, and David explicit migration approval.

## 5. Feature Requirements

Launch-critical feature requirements:

- **Account creation and authentication:** Supabase Auth backend, Lovable UI, profile initialized per nurse.
- **Nurse profile setup:** trust fields are backend-controlled; nurse-editable fields are limited.
- **ID.me identity verification:** IAL2 required; backend handles secrets and result processing.
- **Twilio phone verification:** backend sends/verifies SMS; launch-critical unless David approves fallback.
- **License lookup:** dedicated backend function calls approved source and stores source data.
- **Data matching:** backend deterministic matching; failed match blocks issuance.
- **Selfie capture and storage:** Lovable UI, protected Supabase Storage.
- **Credential creation:** backend-controlled after gates pass.
- **Wallet pass issuance:** automatic after enrollment; visible success/failure states.
- **Nurse dashboard:** launch-critical actions only; Show QR/PDF hidden or clearly deferred.
- **Share-link creation:** backend-controlled, token hash stored, raw token returned once.
- **Verifier credential view:** `/v/{token}`, name/email, Terms, safe credential status.
- **Stripe subscriptions and entitlement gating:** backend-confirmed Stripe state, idempotent webhooks, server-side entitlements.
- **Audit/event logging:** non-optional infrastructure using `resource.verb` action naming.
- **Ops visibility:** Supabase dashboard/views sufficient for launch unless David approves admin UI.
- **Critical notifications/ops alerts:** minimal launch scope through Postmark unless changed.

Deferred features: Show QR, PDF export, scheduled automated refresh, additional license purchase/use, employer dashboard, Lovable admin UI, deep analytics, institutional billing.

## 6. Integrations, Failure States, and Admin/Ops

Launch-critical integrations:

- Supabase Auth, Database, RLS, Edge Functions, Storage.
- ID.me.
- Twilio.
- RapidAPI / Propelus.
- Stripe.
- PassKit / Apple Wallet / Google Wallet.
- Postmark for critical email/ops alerts.

Deferred integrations/capabilities include PDFMonkey/PDF generation, Show QR token flow, scheduled refresh automation, employer/institution systems, and deep analytics.

Secrets must never be stored in Lovable frontend code. Backend-only secrets include Supabase service-role key, ID.me client secret, Twilio token, license API key, Stripe secret/webhook secret, Postmark token, wallet certificates/private keys, Google Wallet private key, and any future PDF provider key.

Default degraded-mode rule:

```text
Fail safely. Do not issue or present credentials as valid when required trust signals are missing, failed, or unavailable.
```

Every launch-critical integration failure must preserve user-facing clarity, avoid unsafe issuance, write an event/audit record, give ops a way to inspect the failure, and trigger ops alerting where critical.

Admin/ops uses Supabase dashboard/views first. Ops must be able to inspect nurse profile/onboarding step, identity state, phone state, license lookup, data match, selfie storage, credential state, wallet state, subscription/payment state, share token/verification event state, audit history, and critical notification failures.

Manual intervention must write an audit event.

## 7. Launch Readiness, QA, and Open Decisions

PassTo is launch-ready only when:

- The launch-critical user journey works end to end.
- Supabase schema/RLS has been reviewed and approved.
- Required Edge Functions and backend routes are implemented.
- Wallet pass issuance works.
- Stripe subscription/payment flows work.
- Phone verification works or David has approved a fallback.
- Critical failure states are handled safely.
- Ops can inspect and recover stuck states.
- David explicitly approves production launch.

Required pre-launch gates include PRD approval, v4 migration SQL, Codex QA of v4 SQL, David migration approval, migration applied to intended Supabase project, RLS tests, Lovable backend endpoint wiring, ID.me readiness, Twilio readiness or fallback, license source readiness, Stripe readiness, wallet signing readiness, Postmark readiness, Terms/disclaimer readiness, and launch smoke test.

QA must cover account/auth, ID.me, Twilio, license lookup, data match, selfie upload, credential creation, wallet issuance, dashboard display, share-link creation, verifier flow, Stripe/webhooks, subscription lapse, RLS boundaries, and critical failure logging.

Security review must confirm Lovable has no service-role secrets, RLS prevents cross-nurse access, verifiers cannot browse data, raw tokens are not stored, token validation is backend-controlled, payment-gated actions are backend-controlled, Stripe webhooks are idempotent, audit/event tables are protected, selfie storage is protected, and temporary ID.me matching fields are minimized and cleared.

Launch smoke test:

```text
create nurse account
-> verify identity
-> verify phone
-> look up license
-> pass data match
-> upload selfie
-> issue credential
-> issue wallet pass
-> view dashboard
-> create share link
-> verifier views credential
-> subscription/payment state behaves correctly
-> ops can inspect events
```

Open decisions must be tracked in GitHub. No implementation task should proceed if it depends on an unresolved decision unless the task is explicitly discovery/recommendation work.

The PRD is ready for implementation sequencing when Sections 1-7 are approved, each section has an approved master task list, deferred scope is clearly marked, launch-critical scope is clearly marked, open decisions are listed and routed, and Claude/Codex can create implementation tasks without reinterpreting product scope.

## Related Section Files

The approved section files remain as supporting artifacts:

- `docs/prd/PRD_SECTION_02_USERS_GOALS_SCOPE.md`
- `docs/prd/PRD_SECTION_03_USER_JOURNEYS.md`
- `docs/prd/PRD_SECTION_04_DATA_RLS_BACKEND.md`
- `docs/prd/PRD_SECTION_05_FEATURE_REQUIREMENTS.md`
- `docs/prd/PRD_SECTION_06_INTEGRATIONS_FAILURE_OPS.md`
- `docs/prd/PRD_SECTION_07_LAUNCH_QA_DECISIONS.md`

## Explicit Non-Authorizations

This PRD approval does not authorize:

- Applying Supabase migration SQL.
- Production launch.
- Stripe live-mode changes.
- Wallet certificate/signing production changes.
- Deployment changes.

Those require separate explicit approvals.
