# PRD Section 5 — Feature Requirements

**Status:** Draft for David Review  
**Owner:** David Bloom  
**Drafting Support:** Codex and Claude  
**Created:** 2026-05-26  
**Associated Task List:** `/docs/tasks/PRD_SECTION_05_MASTER_TASK_LIST.md`  

## 5.1 Purpose

This section defines the product-level feature requirements for the PassTo MVP.

It separates launch-critical features from deferred features so implementation tasks can be assigned without accidentally expanding the first release.

## 5.2 Launch-Critical Feature Set

The launch-critical MVP feature set is:

| Feature | Launch Status |
|---|---|
| Account creation and authentication | Launch-critical |
| Nurse profile setup | Launch-critical |
| ID.me identity verification | Launch-critical |
| Twilio phone verification | Launch-critical |
| License lookup | Launch-critical |
| Data matching | Launch-critical |
| Selfie capture and storage | Launch-critical |
| Credential creation | Launch-critical |
| Wallet pass issuance | Launch-critical |
| Nurse dashboard | Launch-critical |
| Share-link creation | Launch-critical |
| Verifier credential view | Launch-critical |
| Stripe subscriptions and entitlement gating | Launch-critical |
| Audit/event logging | Launch-critical |
| Ops visibility | Launch-critical |
| Critical notifications / ops alerts | Launch-critical minimal |

## 5.3 Account Creation and Authentication

PassTo must let a nurse create an account and authenticate.

Requirements:

- Supabase Auth is the authentication backend.
- Lovable owns the account creation and login UI.
- A `profiles` record is created or initialized for each nurse.
- Account creation does not itself authorize credential issuance.
- Authenticated users can access only their own allowed data.
- Account creation and auth events are logged where appropriate.

## 5.4 Nurse Profile Setup

PassTo must maintain a nurse profile used across onboarding, credential state, subscription state, and dashboard display.

Requirements:

- Profile stores required account and identity state.
- Nurse-editable profile fields are limited to approved self-service fields.
- Trust fields such as identity status, onboarding step, and account status are backend-controlled.
- Profile state supports routing the nurse to the correct onboarding/dashboard step.

## 5.5 ID.me Identity Verification

PassTo must verify the nurse's identity through ID.me.

Requirements:

- ID.me flow is started from Lovable.
- Token exchange and verification result handling happen in a trusted backend context.
- IAL2 is required for credential issuance.
- IAL1, failed verification, or unexpected provider response blocks issuance.
- ID.me identity data used for matching must be minimized and cleared when no longer needed.
- Lovable must not receive ID.me secrets or temporary sensitive matching fields.
- Identity verification result is written to profile/audit state.

## 5.6 Twilio Phone Verification

PassTo must verify phone possession through Twilio SMS.

Requirements:

- Lovable collects or confirms the phone number.
- Backend sends and verifies Twilio code.
- Phone verification is required before credential issuance.
- Twilio A2P 10DLC readiness is a launch-critical dependency.
- If Twilio cannot be production-ready, David must approve a fallback before launch.
- Phone verification results are logged.

## 5.7 License Lookup

PassTo must look up the nurse's license through the approved license source.

Requirements:

- Lovable collects required license lookup fields.
- License lookup runs through a dedicated backend function.
- Backend calls the approved source, currently RapidAPI / Propelus unless changed.
- Source response is stored enough to support display, matching, audit, and refresh.
- Lookup failure blocks credential issuance.
- Lookup result is logged.

## 5.8 Data Matching

PassTo must confirm that the verified identity belongs to the license record.

Requirements:

- Data matching runs backend-side.
- Matching is deterministic and conservative.
- A successful match allows progression to selfie capture and credential issuance.
- A failed match blocks issuance and routes to remediation/support.
- Temporary matching fields are cleared when no longer needed.
- Data match result is logged.

## 5.9 Selfie Capture and Storage

PassTo must capture and store a selfie after successful data matching.

Requirements:

- Lovable owns selfie capture UI.
- Selfie storage is PassTo-owned in protected Supabase Storage.
- Selfie storage must not be public/unrestricted.
- Selfie capture failure provides retry/support path.
- Credential issuance remains blocked until selfie capture succeeds.
- Selfie result is logged.

## 5.10 Credential Creation

PassTo must create a credential record only after required trust gates pass.

Requirements:

- Credential creation is backend-controlled.
- Required gates are identity, phone, license lookup, data match, and selfie.
- Credential includes or links to current license status and current-as-of information.
- Credential state supports dashboard display and verifier display.
- Credential creation result is logged.

## 5.11 Wallet Pass Issuance

PassTo must issue a wallet pass as a launch-critical feature.

Requirements:

- Wallet pass issuance starts automatically at the end of enrollment after all gates pass.
- PassReady or equivalent Lovable screen shows issuance status.
- Wallet signing may use Vercel if Node-specific libraries, certificates, or wallet provider SDKs require it.
- Wallet provider state is written back to Supabase.
- Wallet issuance failure produces a visible user state and ops visibility.
- Wallet issuance result is logged.

## 5.12 Nurse Dashboard

PassTo must provide a nurse dashboard after credential creation.

Requirements:

- Dashboard shows credential status.
- Dashboard shows license status and current-as-of timestamp.
- Dashboard shows wallet pass readiness/status.
- Dashboard shows subscription/tier state.
- Dashboard exposes launch-critical actions only.
- Deferred actions such as Show QR and PDF export should not appear as launch blockers.
- Dashboard reads must respect RLS and user ownership.

## 5.13 Share-Link Creation

PassTo must let a nurse create a controlled share link.

Requirements:

- Share-link creation is backend-controlled.
- Backend checks authentication, credential ownership, entitlement, and payment state where applicable.
- Token is stored only as a hash.
- Raw token is returned once.
- Share link is short-lived and one-time use.
- Share-link creation is logged.

## 5.14 Verifier Credential View

PassTo must let a verifier inspect credential status through a controlled tokenized flow.

Requirements:

- Verifier opens `/v/{token}`.
- Backend validates token.
- Verifier submits name and email.
- Verifier accepts Terms of Use.
- Backend writes verifier and verification event records.
- Verifier sees safe credential status, license status, and current-as-of disclosure.
- Verifier cannot browse credential data outside the tokenized flow.
- Token use is logged.

## 5.15 Stripe Subscriptions and Entitlement Gating

PassTo must support subscription and entitlement gating.

Requirements:

- Stripe handles checkout and subscription events.
- Backend records Stripe customer, subscription, payment, and webhook event state.
- Stripe webhook processing is idempotent using `stripe_events`.
- Entitlement checks happen backend-side.
- Frontend hiding/showing actions is not authoritative.
- Subscription lapse downgrades the account to Free behavior.
- Existing credential and wallet records are retained after lapse.

## 5.16 Audit and Event Logging

PassTo must maintain audit and event records for critical actions.

Requirements:

- Audit/events are non-optional launch infrastructure.
- `audit_events.action` follows `resource.verb` naming.
- Events support troubleshooting, support, verification history, security review, billing review, and launch operations.
- Audit/event tables are not broadly client-writable.

## 5.17 Ops Visibility

PassTo must support basic operational visibility at launch.

Requirements:

- Supabase dashboard/views are sufficient for launch unless David approves a Lovable admin UI.
- Ops can inspect account, license, credential, payment, subscription, wallet, verifier, and event state.
- Ops can identify where a nurse is blocked in onboarding.
- Critical failure paths should produce visible events and, where needed, ops alerts.

## 5.18 Critical Notifications and Ops Alerts

PassTo must support minimal launch-critical notifications or ops alerts.

Requirements:

- Critical lifecycle or failure events should be recorded in `notification_events` where relevant.
- Postmark is the preferred email/ops alert provider unless changed.
- Launch-critical notifications should be limited to those needed for trust, support, payment, or failure visibility.
- Expanded notification preferences and marketing-style notification systems are deferred.

## 5.19 Deferred Features

The following are deferred from launch-critical implementation:

| Feature | Status |
|---|---|
| Show QR | Deferred |
| PDF export | Deferred |
| Scheduled automated refresh | Deferred |
| Additional license purchase/use | Deferred |
| Employer dashboard | Deferred |
| Lovable admin UI | Deferred |
| Deep analytics | Deferred |
| Institutional billing | Deferred |

Deferred features should not be included in launch implementation tasks unless David explicitly reopens them.

## 5.20 Section 5 Acceptance Criteria

Section 5 is complete when David confirms:

- Launch-critical feature set is correct.
- Deferred feature set is correct.
- Feature requirements are product-level and not over-specified as implementation.
- Features align with Sections 2, 3, and 4.
- Feature requirements are clear enough for Claude/Codex task creation.
