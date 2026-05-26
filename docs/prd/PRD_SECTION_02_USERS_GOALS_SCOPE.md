# PRD Section 2 — Users, MVP Goals, and Scope Boundaries

**Status:** Draft for David Review  
**Owner:** David Bloom  
**Drafting Support:** Codex and Claude  
**Created:** 2026-05-26  
**Associated Task List:** `/docs/tasks/PRD_SECTION_02_MASTER_TASK_LIST.md`  

## 2.1 Purpose

This section defines who PassTo serves in the MVP, what the MVP must prove, what is launch-critical, and what is intentionally deferred.

The goal is to prevent implementation tasks from expanding beyond the MVP while keeping the core PassTo promise intact: a nurse can complete enrollment, receive a trustworthy wallet credential, and let a verifier inspect credential status through controlled access.

## 2.2 MVP Users

### Nurse Credential Holder

The primary MVP user is the nurse credential holder, with travel nurses as the beachhead segment.

The nurse creates an account, verifies identity, verifies phone possession, connects a license, passes data matching, captures a selfie, receives a wallet credential, and manages credential actions from the dashboard.

### Verifier / Employer / Reviewer

The primary secondary user is the verifier: an employer, staffing agency reviewer, facility administrator, or other reviewer who needs to confirm that a nurse's credential is valid and current.

The verifier does not need a PassTo account in MVP. Verifier access is controlled through short-lived tokenized flows.

### PassTo Admin / Operations User

The admin/operations user is David or an approved PassTo support operator.

For MVP, admin/ops visibility should default to Supabase dashboard/views and logs. A Lovable admin UI is not launch-critical unless separately approved.

### Post-MVP User

Institutional buyers, employer accounts, employer dashboards, multi-user teams, and enterprise workflows are post-MVP unless David explicitly reopens that scope.

## 2.3 MVP Goals

The MVP must:

- Let a nurse create a PassTo account and profile.
- Verify nurse identity through ID.me at the required assurance level.
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

## 2.4 Launch-Critical Capabilities

The following are launch-critical for the first production nurse:

| Capability | Status |
|---|---|
| Account creation and Supabase Auth | Launch-critical |
| ID.me identity verification | Launch-critical |
| Twilio phone verification | Launch-critical |
| License lookup | Launch-critical |
| Data matching | Launch-critical |
| Selfie capture and storage | Launch-critical |
| Credential record creation | Launch-critical |
| Wallet pass issuance | Launch-critical |
| Nurse dashboard | Launch-critical |
| Share-link verifier access | Launch-critical |
| Stripe subscriptions and entitlement gating | Launch-critical |
| Audit/events/RLS/security baseline | Launch-critical |
| Ops visibility through Supabase | Launch-critical |

## 2.5 Deferred Capabilities

The following are deferred from launch-critical MVP:

| Capability | Decision |
|---|---|
| Show QR | Deferred |
| PDF export | Deferred |
| Scheduled automated refresh | Deferred unless separately approved |
| Additional license flow | Deferred unless separately approved |
| Lovable admin UI | Deferred |
| Employer dashboard | Deferred |
| Institutional billing | Deferred |
| Deep analytics | Deferred |

Deferred does not mean rejected. It means the capability should not block first launch and should not be assigned as implementation work until David explicitly prioritizes it.

## 2.6 Confirmed Scope Decisions

| Decision | Status |
|---|---|
| Show QR is deferred from launch-critical MVP. | Confirmed |
| PDF export is deferred from launch-critical MVP. | Confirmed |
| Wallet pass issuance is launch-critical. | Confirmed |
| Twilio phone verification is launch-critical. | Confirmed |
| Selfie storage is owned by PassTo using Supabase Storage. | Confirmed |
| Subscription lapse downgrades the user to Free behavior. | Confirmed |
| `passtodigital.com` currently routes to P1. | Confirmed |

## 2.7 Subscription Lapse Behavior

When a subscription lapses, PassTo should downgrade the account to Free-tier behavior rather than deleting or revoking existing credential records.

On lapse:

- The nurse's credential remains visible to the nurse.
- Existing credential and wallet records are retained.
- The wallet pass is not revoked solely because of subscription lapse.
- Paid-tier-only actions are blocked.
- New paid-tier share, QR, PDF, refresh, or additional-license actions are blocked unless allowed under Free-tier rules.
- Existing active share tokens remain valid until normal expiry unless fraud, reversal, or abuse requires revocation.
- Audit/payment/subscription events are retained.

## 2.8 Technical Scope Boundaries

Lovable remains the frontend layer. Lovable may call approved Supabase Edge Functions using the publishable key and the logged-in user's JWT.

Lovable must not contain service-role secrets. Privileged operations must happen inside Supabase Edge Functions or approved Vercel routes.

Selfies are stored in protected Supabase Storage, not ID.me.

Wallet pass signing is launch-critical, but final platform ownership remains implementation-specific: Vercel is preferred where Node-specific signing, certificates, or wallet provider libraries require it.

## 2.9 Non-Goals

The MVP does not include:

- Employer/institution dashboards.
- Institutional billing.
- Multi-state full automation.
- Deep analytics.
- Full compliance frameworks such as HIPAA or ISO certification.
- Full admin application if Supabase dashboard/views are sufficient.
- PDF export at launch.
- Show QR at launch.

## 2.10 Section 2 Acceptance Criteria

Section 2 is complete when David confirms:

- MVP users are correct.
- MVP goals are correct.
- Launch-critical capabilities are correct.
- Deferred capabilities are correct.
- Subscription lapse behavior is correct.
- Confirmed scope decisions are accurately recorded.
