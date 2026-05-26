# PassTo MVP Launch Scope — Launch-Critical vs. Deferred

**Document:** MVP_LAUNCH_SCOPE.md
**Task:** TASK-0010
**Status:** Ready for David Review
**Created:** 2026-05-26
**Owner:** David + Claude
**Final Approver:** David

---

## Purpose

This document defines what must be working before PassTo serves its first production nurse, and what can follow initial launch. It exists to prevent scope creep from silently expanding the MVP and to give implementation tasks a clear go/no-go gate.

**Rule:** If a capability is not listed as Launch-Critical, it is deferred. No capability moves from Deferred to Launch-Critical without explicit David decision recorded in the decisions log.

---

## LAUNCH-CRITICAL CAPABILITIES

These must be fully working, tested, and operationally visible before any production nurse uses the product.

---

### LC-1 — Account Creation and Authentication

- Nurse creates an account (email + password via Supabase Auth)
- Login, logout, password reset, update password
- `profiles` record created on signup
- Supabase RLS enforced from day one

---

### LC-2 — ID.me Identity Verification (IAL2)

- Nurse completes ID.me OAuth flow
- IAL2 assurance level confirmed before credential issuance is allowed
- IAL1 or failure routes nurse to retry or support path — credential issuance blocked
- `idme_subject` stored; deduplication enforced
- Auth code exchange handled server-side (Supabase Edge Function or Vercel) — not client-side
- Production ID.me credentials (`api.id.me`, not `api.idmelabs.com`) configured before launch

---

### LC-3 — Phone Verification (Twilio SMS — Hard Launch Gate)

- Nurse verifies phone ownership via Twilio SMS OTP
- A2P 10DLC registration approved before launch — no exceptions per FD-018
- Failure state: clear user message, retry path, ops alert

---

### LC-4 — License Lookup (RapidAPI / Propelus)

- PassTo retrieves nurse license record from RapidAPI / Propelus
- License record includes: license number, status, expiry, issuing state, name fields
- Source data preserved in `license_lookups` table for audit and matching
- Lookup failure routes to clear user message and ops alert

---

### LC-5 — Data Matching (Hard Credential Issuance Gate)

- Normalized comparison of identity data (from ID.me) against license record (from RapidAPI)
- Failed match blocks credential issuance, flags account/credential state, writes audit event
- Nurse routed to clear remediation path on failure
- Temporary identity fields used for matching cleared after use

---

### LC-6 — Selfie Capture

- Selfie captured after successful identity/license matching
- Required in the onboarding trust path per PRD Section 1
- Stored per selfie ownership decision (pending — see Deferred / open items)

---

### LC-7 — Credential Record Creation

- `credentials` record created only after all gates pass (ID.me IAL2, phone, license lookup, data match, selfie)
- Credential status reflects license status and current-as-of timestamp
- Wallet pass treatment determined by credential status

---

### LC-8 — Wallet Pass Issuance (Apple + Google)

- Apple Wallet pass generated via Vercel `api/sign-apple.js` (FD-015)
- Google Wallet pass generated via Vercel `api/sign-google.js` (FD-015)
- `wallet_passes` record created; pass URL returned to nurse
- Issuance failure writes audit event and notifies ops
- Wallet pass is core MVP — not optional per PRD Section 1

---

### LC-9 — Nurse Credential Dashboard

- Nurse sees: credential status, license status, current-as-of timestamp, subscription tier
- Available actions shown based on subscription entitlement
- Share link and QR actions visible to entitled tiers

---

### LC-10 — Share Link (72-Hour Token)

- Nurse generates a share link token (`verification_tokens` table, `share_link` type)
- Token TTL: 72 hours or first successful use (FD-011)
- Token hash stored only — raw token never persisted
- Verifier accesses `/v/{token}` without a PassTo account

---

### LC-11 — Verifier Credential View (`/v/{token}`)

- Verifier submits minimal information (name, organization, purpose)
- Verifier accepts Terms of Use
- `verifiers` record created; `verification_events` record written
- Credential status displayed with current-as-of disclosure
- Expired or used token shows clear message
- No verifier account required

---

### LC-12 — Stripe Subscriptions (Standard + Premier)

- Standard: $9.99/month, Premier: $19.99/month (FD-012)
- Subscription creation, renewal, cancellation via Stripe
- Stripe webhooks handled by Supabase Edge Function (FD-016)
- `stripe_events` idempotency table prevents duplicate webhook processing
- `subscriptions` and `payments` records maintained

---

### LC-13 — Subscription Entitlement Gating

- Free tier: 1 license, no additional license purchase, no share link (or limited share)
- Standard: 1 license included, additional at $4.99 each
- Premier: 2 licenses included, additional at $4.99 each
- Gating enforced server-side (Edge Function or RLS), not client-side only
- Subscription lapse behavior defined before implementation (see Deferred / open)

---

### LC-14 — Audit Events

- Non-optional MVP infrastructure per PRD Section 1
- `audit_events` table records all security-relevant operations
- `audit_events.action` namespace defined before migration (OD-1, TASK-0007)
- Covers: credential issuance, token creation/use/expiry, verification views, payment events, account events, matching failures

---

### LC-15 — Data Retention and RLS

- 7-year retention enforced via `ON DELETE RESTRICT` on `payments.profile_id` and `pdf_exports.profile_id` (FD-011)
- Soft delete via `deleted_at` on `profiles`
- RLS policies tested before migration applied (OD-3, TASK-0007)
- Nurse UPDATE policy on `profiles` scoped to safe columns only (OD-11, TASK-0007)

---

### LC-16 — Failure State Coverage (All 12 PRD Failure Journeys)

All failure states from PRD Section 8 must have defined user-facing behavior and ops visibility before launch:

1. ID.me returns IAL1 → blocked, retry path
2. ID.me verification fails or unexpected data → blocked, support path
3. Twilio SMS unavailable or OTP fails → retry path (or blocked — Twilio is a hard gate)
4. RapidAPI / Propelus unreachable → blocked, ops alert
5. License lookup returns no result → blocked, remediation path
6. Data match fails → blocked, audit event, remediation path
7. Selfie capture fails or abandoned → retry path
8. Wallet pass issuance fails → audit event, ops alert
9. Payment fails → user message, subscription state updated
10. Stripe webhook missed or delayed → idempotency table handles retry
11. Postmark delivery fails → ops alert, fallback logging
12. PDFMonkey unavailable → ops alert (only if PDF is launch-critical — see Deferred)

---

### LC-17 — Transactional Email (Postmark — Core Events Only)

Required at launch for:
- Account creation confirmation
- Credential issued notification
- Verification completion (ID.me result)
- Payment confirmation / failure
- Critical ops alerts (issuance failures, matching failures, webhook failures)

Extended notification coverage (share-viewed, PDF events, refresh events) is Deferred.

---

### LC-18 — Ops Visibility (Supabase Dashboard)

- PassTo operations can inspect: account, license, credential, job, event, and payment state
- Supabase dashboard + views used as the admin tool at launch per PRD Section 1
- No Lovable admin UI required at launch — Supabase dashboard is sufficient

---

## DEFERRED CAPABILITIES

These are real product features but are not required for the first production nurse. Each requires an explicit David decision before moving to Launch-Critical.

---

### D-1 — Show QR (45-Minute Token)

Nurse shows a one-time QR code for in-person verification. Short-lived (`show_qr` token, 45 minutes or first use). Share link (LC-10) covers remote verification at launch. Show QR is the in-person companion — defer to Phase 1B.

**OD-4** (verifier form gate for show_qr) must be resolved by Codex (TASK-0007) before this can be implemented regardless.

---

### D-2 — PDF Export

Static durable verification artifact with current-as-of disclosure. PDFMonkey via Supabase Edge Function (FD-017). `pdf_exports` table and Supabase Storage already in schema. Useful but not the core credential delivery mechanism.

**PDF QR token type (OD-5)** is also deferred with this capability.

---

### D-3 — Scheduled / Automated Refresh

Automatic license status refresh on a schedule or tier-based interval. Manual refresh triggered by nurse is sufficient at launch. Scheduled jobs require additional ops complexity.

---

### D-4 — Additional License (Second License Flow)

P2 Lovable project has a `/second-license` route. Additional license purchase at $4.99 per FD-011. Single license covers the travel nurse beachhead at launch. Defer additional license purchase and management.

---

### D-5 — Extended Notifications

Defer until post-launch:
- Share link viewed notification to nurse
- PDF export complete notification
- Refresh result notification
- Scheduled credential expiry / caution notices
- Share token expiry reminder

Core lifecycle notifications (LC-17) ship at launch.

---

### D-6 — Annual Plan, Trial, Coupon / Discount Behavior

Monthly Standard and Premier confirmed (FD-012). Annual plan, free trial, and coupon/discount behavior not confirmed for MVP. Defer to post-launch pricing iteration.

---

### D-7 — Admin Lovable UI

Supabase dashboard is sufficient for MVP operations per PRD Section 1. A Lovable-built admin UI is a post-launch quality-of-life improvement.

---

### D-8 — Wallet Pass Lifecycle Management (Refresh, Revoke, Replace)

Pass issuance (LC-8) ships at launch. Full wallet pass lifecycle — refresh on license status change, revocation on lapse, replacement on re-issue — is a Phase 1B capability requiring additional implementation scope.

---

## EXPLICITLY OUT OF MVP SCOPE

These are confirmed non-goals from PRD Section 1 and do not require a decision to stay out of scope.

- Enterprise employer dashboards
- Institutional billing or multi-tenant accounts
- Multi-state full automation
- HIPAA or ISO compliance frameworks
- Deep analytics beyond launch-readiness operational reporting
- Complex admin systems beyond Supabase dashboard

---

## OPEN SCOPE ITEMS (Require David Decision Before Implementation)

These items have ambiguity that must be resolved before the relevant implementation task is assigned.

| Item | Question | Blocks |
|---|---|---|
| Selfie storage owner | Does PassTo own the selfie (stored in Supabase Storage) or does ID.me own it? | LC-6 implementation |
| Subscription lapse behavior | On lapse: do credentials remain visible? Are share/QR/PDF/refresh blocked? Are wallet passes affected? Are additional licenses frozen? | LC-13 implementation |
| Lovable backend invocation pattern | How does Lovable call Supabase Edge Functions that require service-role auth? Auth method not yet defined. | All Edge Function wiring in Lovable |
| `passtodigital.com` domain routing | Which Lovable project (P1 or P3) currently serves `passtodigital.com`? | Routing and deployment planning |
| Show QR verifier form gate | Does show_qr path require a verifier form gate (OD-4)? | D-1 (if promoted to launch-critical) |
| `license_status_mappings` | DB reference table or Edge Function logic (OD-12)? | v4 migration SQL |

---

## Launch-Critical Summary (18 Capabilities)

| ID | Capability | Primary Owner |
|---|---|---|
| LC-1 | Account creation and auth | Supabase Auth + Lovable |
| LC-2 | ID.me identity verification (IAL2) | Supabase Edge Function / Vercel |
| LC-3 | Phone verification — Twilio (hard gate) | Supabase Edge Function |
| LC-4 | License lookup — RapidAPI/Propelus | Supabase Edge Function |
| LC-5 | Data matching | Supabase Edge Function |
| LC-6 | Selfie capture | Lovable + Supabase Storage |
| LC-7 | Credential record creation | Supabase Edge Function |
| LC-8 | Wallet pass issuance — Apple + Google | Vercel (FD-015) |
| LC-9 | Nurse credential dashboard | Lovable + Supabase |
| LC-10 | Share link (72-hour token) | Supabase Edge Function |
| LC-11 | Verifier credential view | Lovable + Supabase Edge Function |
| LC-12 | Stripe subscriptions | Stripe + Supabase Edge Function (FD-016) |
| LC-13 | Subscription entitlement gating | Supabase Edge Function + RLS |
| LC-14 | Audit events | Supabase (all layers) |
| LC-15 | Data retention and RLS | Supabase schema |
| LC-16 | Failure state coverage (all 12) | All layers |
| LC-17 | Transactional email — core events | Postmark + Supabase Edge Function |
| LC-18 | Ops visibility | Supabase dashboard |
