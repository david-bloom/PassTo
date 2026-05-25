# PassTo PRD v0.1

**Status:** Draft Baseline — Ready for David Review  
**Owner:** Codex  
**Review Inputs:** Claude PRD Outline Review + Codex Response  
**Final Approver:** David  
**Created:** 2026-05-25  
**Related Task:** TASK-0003  

## 1. Product Summary

PassTo is a digital credential product for licensed nurses. It allows a nurse to verify identity, connect a nursing license, receive a wallet-based credential, and share controlled verification access with reviewers, employers, or other credential verifiers.

The MVP must prove that PassTo can:

- Onboard a nurse through identity, phone, license, and data-match gates.
- Issue a trustworthy digital credential backed by current license data.
- Allow a verifier to view credential status through controlled, short-lived access.
- Support a founder-maintainable commercial workflow using Lovable, Supabase, Stripe, and targeted integrations.

## 2. Technical Context and Current Build State

### Confirmed MVP Platform Direction

David intends to retain Lovable for MVP to reduce cost of change.

For PRD and task planning purposes:

```text
Lovable = MVP frontend builder and website host
Supabase = system of record, auth/data/RLS foundation, and preferred Edge Function orchestration layer
Vercel = backend/API hosting only where needed for sensitive integrations or existing signing/integration code
Stripe = payments and subscriptions
ID.me = identity verification
Twilio = phone verification / SMS, subject to A2P 10DLC readiness
RapidAPI / Propelus = nurse license lookup vendor
Postmark = transactional email and ops alerts
PDFMonkey = PDF generation if retained for MVP
PassKit / Apple Wallet / Google Wallet = wallet credential generation and lifecycle
```

Airtable and Make are abandoned as execution platforms. Prior Airtable/Make artifacts should be used only as business-logic references, not migration targets.

Existing Lovable screens and website work should be reused where practical. Any prior Lovable calls to Make webhooks should be remapped to Supabase Edge Function endpoints or other approved backend/API endpoints.

The MVP must remain founder-maintainable. Architecture should avoid unnecessary re-platforming, avoid overbuilding admin systems, and keep failure visibility strong enough for commercial launch.

## 3. Problem Statement

Licensed professionals need a faster, cleaner way to present verified credential status. Verifiers need trustworthy access to current credential information without slow manual lookup flows. Existing verification workflows are fragmented, inconsistent, and hard to operationalize for individual professionals.

PassTo solves this by pairing identity verification, license lookup, credential issuance, wallet presentation, and controlled verifier access into one guided product flow.

## 4. Target Users

### MVP Users

1. **Nurse / credential holder**  
   Creates an account, verifies identity, connects a license, receives a wallet credential, and shares verification access.

2. **Verifier / employer / reviewer**  
   Receives a link or scans a QR code, submits minimal verifier information, accepts terms, and views the nurse credential status.

3. **PassTo admin / operations user**  
   Monitors onboarding, verification, license lookup, credential issuance, refreshes, failed jobs, payments, notifications, and support issues.

### Post-MVP Users

1. **Institutional buyer / employer account**  
   Deferred from MVP unless David explicitly reopens enterprise scope.

## 5. MVP Goals

The MVP must:

- Allow a nurse to create and manage a PassTo credential profile.
- Keep Lovable as the MVP frontend/website host.
- Store license, credential, account, subscription, event, and verification data in Supabase.
- Verify nurse identity via ID.me.
- Verify phone ownership via Twilio where available.
- Look up nurse license data via RapidAPI / Propelus.
- Confirm license ownership through name-based data matching before credential issuance.
- Capture selfie after successful data matching.
- Issue a wallet credential as a core product requirement unless David explicitly changes product scope.
- Allow a verifier to view a credential through a controlled share link or QR flow.
- Support basic subscription and tier-based access.
- Support refresh, notification, and PDF export behaviors at an MVP-safe level.
- Establish auditability and operational logging sufficient for commercial launch.

## 6. MVP Non-Goals

The MVP does not include:

- Multi-state full automation unless separately approved.
- Enterprise employer dashboards.
- Institutional billing.
- Fully automated coverage for every profession/state.
- Complex compliance frameworks such as HIPAA or ISO certification.
- Deep analytics beyond launch-readiness operational reporting.
- Re-platforming the MVP frontend away from Lovable unless a blocking issue is identified.
- A polished internal admin application if Supabase dashboard/views are sufficient for first release.

## 7. Core User Journeys

### 7.1 Nurse Onboarding and Credential Issuance

Expected flow:

```text
Account creation
→ ID.me identity verification
→ Twilio phone verification, if available
→ License lookup via RapidAPI / Propelus
→ Name-based data matching
→ Selfie capture
→ Credential record creation
→ Wallet pass issuance
→ Dashboard access
```

Credential issuance must be blocked until required gates pass.

### 7.2 Identity Verification

A nurse must complete ID.me identity verification. IAL2 is the target level for credential issuance. If ID.me returns IAL1 or verification failure, the user should enter a retry or support path and credential issuance should remain blocked.

### 7.3 Phone Verification

Phone verification uses Twilio SMS where available. Twilio A2P 10DLC readiness is a launch-readiness dependency. If Twilio is unavailable at launch, David must approve a fallback such as email-only notification, manual verification, or a soft launch without SMS.

### 7.4 License Lookup

The MVP license lookup source is RapidAPI / Propelus unless David approves a replacement. The lookup should fetch the license record needed for status display and data matching.

### 7.5 Data Matching

Data matching is a hard credential-issuance gate. PassTo must compare normalized identity data against license record data. A failed match should block issuance, flag the account/credential state, write an audit event, and route the nurse to a clear remediation path.

Temporary identity fields used for matching must be minimized, cleared when no longer needed, and never returned in frontend API responses.

### 7.6 Selfie Capture

Selfie capture occurs after successful identity/license matching and before or during credential issuance, depending on implementation sequencing. The PRD treats selfie capture as part of the trust workflow, not a cosmetic feature.

### 7.7 Credential Dashboard

The nurse dashboard should show credential status, license status, current-as-of timestamp, subscription tier, available actions, and share/QR/PDF/refresh affordances based on entitlement.

### 7.8 Share Link and QR Verification

Nurses can create controlled verifier access via share link or show-QR flow. Verifier access uses one-time, short-lived tokens. Wallet passes do not carry a permanently valid verification QR.

### 7.9 Verifier Credential View

A verifier accesses `/v/{token}`, submits minimal verifier information, accepts Terms of Use, and views credential status with current-as-of disclosure. No verifier account is required.

### 7.10 Refresh

Refresh behavior updates license status and downstream credential treatment. Refresh may be manual, paid, tier-included, or scheduled depending on subscription tier.

### 7.11 Subscription Upgrade or Paid Action

Stripe supports subscriptions and paid actions. Gating rules must be defined before gated features are built to prevent retrofit.

### 7.12 PDF Export

PDF export creates a durable static verification artifact with current-as-of disclosure. PDF QR behavior remains subject to token lifecycle decisions.

### 7.13 Notifications

Notifications may include credential issuance, status changes, refresh results, expiry/caution notices, payment/subscription events, share-viewed events, PDF events, account/security notifications, and ops alerts.

### 7.14 Admin Troubleshooting

PassTo operations must be able to inspect account, license, credential, job, event, and payment state using Supabase dashboard/views first unless David approves a Lovable admin UI for MVP.

## 8. Failure-State Journeys

The MVP must define user-facing behavior and ops visibility for:

- ID.me returns IAL1.
- ID.me verification fails or returns unexpected data.
- Twilio SMS is unavailable or phone verification fails.
- RapidAPI / Propelus is unreachable.
- License lookup returns no result.
- Data match fails.
- Selfie capture fails or is abandoned.
- Wallet pass issuance fails.
- Payment fails.
- Stripe webhook is missed or delayed.
- Postmark delivery fails.
- PDFMonkey is unavailable or PDF generation fails.

Default failure posture: block unsafe credential issuance, preserve clear user messaging, write an event/audit record, and notify ops for critical failures.

## 9. Core Feature Requirements

### 9.1 Account and Profile Setup

Users can create an account and profile. Supabase Auth and profile records are expected foundations, subject to future schema/RLS approval.

### 9.2 Identity Verification

ID.me verification must support required assurance routing, deduplication where applicable, and a blocked/retry state when identity verification is insufficient.

### 9.3 Phone Verification

Phone verification should use Twilio SMS if A2P 10DLC readiness permits launch. The PRD requires a fallback decision if Twilio cannot be ready by launch.

### 9.4 License Lookup

PassTo must retrieve nurse license records from RapidAPI / Propelus and preserve enough source data to support status display, matching, auditability, and refresh.

### 9.5 Data Matching

Data matching must normalize and compare identity and license names. Failed matching blocks issuance and flags the account/credential state.

### 9.6 Selfie Capture

Selfie capture is required in the onboarding trust path unless David explicitly removes it from MVP.

### 9.7 Credential Record Creation

Credential records are created only after required gates pass. Credential status must reflect license status, wallet treatment, and current-as-of timestamp.

### 9.8 Wallet Pass Integration

Wallet pass is core MVP. PassKit, Apple Wallet, and Google Wallet implementation details may phase within MVP delivery, but the product definition assumes a wallet credential.

### 9.9 Credential Display

Credential display must show nurse-facing status, relevant license fields, credential validity treatment, current-as-of date/time, and available actions.

### 9.10 Share Links and QR Codes

Share and QR tokens are one-time and short-lived. Current known token assumptions from schema work include `share_link` = 72 hours and `show_qr` = 45 minutes, pending final confirmation in the schema/RLS task.

### 9.11 Verifier Credential View

Verifier view must be form-gated, terms-gated, minimal-data, and disclosure-complete.

### 9.12 Refresh and Status Updates

Refresh must update license status, credential treatment, wallet pass treatment, and notification triggers where applicable.

### 9.13 Subscription Gating

Subscription gates affect onboarding limits, license count, share links, QR behavior, refreshes, PDF exports, notifications, and wallet lifecycle behavior. Gating rules must be defined early.

### 9.14 Notifications

Notifications must cover user-facing lifecycle events and ops-facing critical failures.

### 9.15 PDF Export

PDF export must generate a durable static artifact with current-as-of disclosure. Exact provider behavior remains subject to implementation tasking.

### 9.16 Audit, Events, and Operational Logs

Audit and operational events are non-optional MVP infrastructure, not optional product features. They support troubleshooting, trust, abuse prevention, verification history, billing review, and launch operations.

## 10. Feature Tier Requirements

Known MVP pricing and entitlement assumptions from current documentation:

```text
Paid one-off share / refresh / PDF where applicable: $1.99
Additional license: $4.99
Free: 1 license included
Standard: 1 license included
Premier: 2 licenses included
```

The activity log references later schema work incorporating Standard at $9.99/month and Premier at $19.99/month, but the visible Decisions Log currently only confirms that Standard/Premier subscription prices still require final confirmation. This inconsistency must be resolved before Stripe product creation.

The PRD should preserve tier behavior at product level and defer exact Stripe configuration until pricing is reconciled and approved.

Subscription lapse behavior must be defined before implementation. At minimum, lapse behavior should determine:

- Whether existing credentials remain visible.
- Whether sharing/QR/PDF/refresh actions are blocked.
- Whether scheduled refreshes stop.
- Whether wallet pass status is affected.
- Whether additional licenses become inactive or remain readable.

## 11. Data Model Overview

The full schema remains subject to later Codex/Claude review and David approval. PRD-level expected data concepts include:

### Launch-Critical Concepts

```text
profiles
licenses
passes / credentials
wallet_passes
verification_tokens
verifiers
verification_events
subscriptions
purchases / payments
communication_events / notification_events
audit_events
```

### Likely MVP or Near-MVP Concepts

```text
refresh_events
pdf_exports
jobs or job-equivalent event tracking
license_status_mappings
```

### Notes

- Prior Airtable schema is abandoned as a platform but remains useful as business-logic source material.
- The PRD should not prescribe final SQL.
- Dashboard/product state should rely on purpose-built tables, not only an audit log.
- Audit events remain append-only operational/compliance/debug support.
- A later schema/RLS task must decide final table names, retention rules, RLS, service-role boundaries, enums, and migration readiness.

## 12. Platform and Integration Responsibilities

### Lovable

- Owns MVP frontend, website hosting, route experience, and UI iteration.
- Should reuse existing screens where practical.
- Must not contain privileged secrets or sensitive backend logic.
- Existing Make webhook calls must be replaced with approved backend endpoints.

### Supabase

- Owns system of record.
- Provides auth/data/RLS foundation.
- Preferred orchestration layer through Edge Functions where practical.
- Stores operational state and event records.

### Vercel

- Used only where needed for backend/API routes, existing signing code, or sensitive integrations not handled cleanly by Lovable/Supabase.
- Not assumed to host the MVP website unless David changes the Lovable hosting decision.

### Stripe

- Handles subscriptions, paid actions, checkout, payment events, and webhooks.

### ID.me

- Provides identity verification and assurance-level data.

### Twilio

- Provides phone verification/SMS. A2P 10DLC readiness is a named launch-readiness dependency.

### RapidAPI / Propelus

- Provides nurse license lookup records for license status and data matching.

### Postmark

- Provides transactional email and default ops alert channel.

### PDFMonkey

- Provides PDF export if retained.

### PassKit / Apple Wallet / Google Wallet

- Provide wallet credential generation and lifecycle.

## 13. Security, Privacy, and Access Control

Product-level requirements:

- Supabase RLS must prevent cross-user credential/profile/license access.
- Service-role operations must be isolated to trusted backend functions.
- Credential issuance must be blocked until identity, phone, license lookup, and data-match gates pass or approved fallback gates exist.
- Verifier tokens must be one-time and short-lived.
- Wallet passes must not expose a permanent verification QR.
- Verifier data collection must remain minimal.
- Payment-gated actions must not be bypassable from the frontend.
- Temporary ID.me identity fields used for matching must be cleared when no longer needed.
- Temporary identity data must never be returned to frontend responses.
- Failed data matching must write an event and block issuance.
- Audit/event logging is non-optional.

## 14. Admin and Operations Requirements

For MVP, admin/ops should default to Supabase dashboard/views unless David approves a Lovable admin UI.

Ops needs:

- View user/account records.
- View license and credential records.
- Inspect identity/license/matching failure states.
- Inspect Edge Function or backend/API failures.
- Inspect payment/subscription state.
- Inspect notification and delivery state.
- Review audit events.
- Retry or resolve failed operations where safe.
- Receive ops alerts.

Default ops alert mechanism: Postmark email for critical failures unless David approves another alert channel.

Critical alert triggers should include:

- ID.me unexpected errors.
- RapidAPI / Propelus unavailable.
- Data match failure threshold or suspicious mismatch.
- Wallet pass issuance failure.
- Stripe webhook failure.
- Postmark delivery failure for critical messages.
- PDF generation failure.
- Scheduled refresh failure.

## 15. Degraded-Mode and Integration Failure Policy

Default policy: fail safely, do not issue or update credentials as valid when required trust signals are unavailable, preserve user-facing clarity, write an event, and alert ops where critical.

| Integration | Failure posture |
|---|---|
| ID.me | Block credential issuance; route to retry/support; log event; alert ops for unexpected provider errors. |
| Twilio | Use approved fallback only; otherwise block phone verification-dependent launch path. |
| RapidAPI / Propelus | Do not issue new credential from unavailable lookup; allow retry; alert ops if provider unavailable. |
| Stripe | Block paid gated action until payment state confirmed; retry webhook handling where safe. |
| Postmark | Log delivery failure; alert ops if critical message cannot send. |
| PDFMonkey | Mark PDF job failed; allow retry; do not block core credential unless PDF is required for that action. |
| PassKit / Wallet | Credential record can exist, but wallet issuance must show failed/pending state and alert ops. |
| Supabase Edge Functions | Log failure, expose safe user message, and provide retry/admin inspection path. |

## 16. Success Metrics

### Business Success Metric

Target placeholder:

```text
100 verified nurses within 90 days of launch
```

This should be confirmed or revised by David before the PRD becomes final.

### Technical Success Metrics

- User can complete onboarding through Lovable-hosted frontend.
- ID.me identity verification path works.
- Phone verification path works or approved fallback is active.
- License lookup works through RapidAPI / Propelus.
- Data matching blocks mismatches and allows valid matches.
- Credential can be created and viewed.
- Wallet pass can be issued or queued with visible status.
- Verifier view works from share link / QR token.
- Refresh behavior is reliable.
- Subscription gates work correctly.
- PDF export works if retained for MVP.
- Critical failure paths generate useful operational visibility.

## 17. MVP Acceptance Criteria

The MVP product baseline is acceptable when:

- Product scope is explicit.
- MVP and non-MVP boundaries are clear.
- Lovable’s role in MVP frontend/hosting is explicit.
- Supabase, Edge Function, and Vercel responsibilities are clear enough for tasking.
- Identity, phone, license lookup, data matching, and selfie capture are included in the credential issuance path.
- Wallet credential is treated as core MVP unless David changes scope.
- User journeys are complete enough for task decomposition.
- Core data concepts are identified.
- Security and access-control intent is documented.
- Failure states and degraded mode are defined at product level.
- Open questions are visible and do not silently block work.
- Claude can convert PRD requirements into executable task specs after Codex review.

## 18. Open Questions and Decision Items

These must be resolved before or during implementation planning:

1. Final Standard and Premier subscription pricing, including reconciliation with the activity-log reference to $9.99/$19.99.
2. Final verifier token lifecycle for share links, show-QR, and PDF QR behavior.
3. Twilio A2P 10DLC readiness and fallback if unavailable.
4. Exact admin tooling mechanism: Supabase dashboard/views first vs. Lovable admin UI.
5. Exact degraded-mode behavior by integration and alert trigger thresholds.
6. Whether PassKit templates precede or follow Supabase schema task.
7. Final verifier disclaimer / Terms of Use language.
8. Whether Free users can buy additional licenses in MVP or whether additional licenses are hidden for Free.
9. Exact PDF export provider and PDF QR/token behavior.
10. Whether Vercel is needed for any MVP backend/API routes after Lovable + Supabase responsibilities are mapped.
11. DECISION-0011 documentation cleanup: activity log references DECISION-0011, but the visible Decisions Log currently stops at DECISION-0010.

## 19. Closed or Treated-as-Closed Decisions

Unless David reopens them:

- GitHub documentation is source of truth.
- Airtable and Make are abandoned as execution platforms.
- Lovable remains MVP frontend builder and website host.
- Supabase is the data/RLS foundation.
- RapidAPI / Propelus is the current MVP nurse license lookup path.
- Wallet pass is a core MVP product requirement.
- Verifier access uses one-time short-lived tokens.
- Wallet pass does not carry a permanently valid verification QR.
- Verifier form collects minimal information and requires Terms acceptance.

## 20. Post-MVP Backlog

Defer unless David explicitly reprioritizes:

- Employer/institution dashboards.
- Additional license types and states beyond MVP lookup coverage.
- Advanced verifier analytics.
- Deeper wallet pass lifecycle automation.
- More sophisticated notification preferences.
- Institutional billing.
- Broader compliance hardening.
- Possible frontend re-platforming only if MVP learning or operational risk justifies it.

## 21. Next Recommended Tasks

```text
TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map
TASK-0005 — Create Supabase Schema and RLS Plan
TASK-0006 — Create MVP Build Sequence for Claude
```

The responsibility map should come before detailed implementation tasking because it determines what Lovable owns, what Supabase owns, and what Vercel or third-party APIs still need to own.
