# PRD Section 4 — Data Model, RLS, and Backend Responsibilities

**Status:** Approved by David  
**Owner:** David Bloom  
**Drafting Support:** Codex and Claude  
**Created:** 2026-05-26  
**Updated:** 2026-05-27 — TASK-0018 cleanup  
**Associated Task List:** `/docs/tasks/PRD_SECTION_04_MASTER_TASK_LIST.md`  

## 4.1 Purpose

This section defines the MVP data, access-control, and backend responsibility model at a PRD level.

It does not define final SQL. Final migration SQL belongs to the Supabase migration task sequence and must be reviewed and explicitly approved before being applied.

## 4.2 Source of Truth

Supabase is the MVP system of record for PassTo.

Lovable owns the frontend experience but is not the source of truth for durable credential state. Vercel is a targeted backend/API layer only where Supabase Edge Functions are not the right fit.

The current connected PassTo Supabase project is:

```text
wvzjfxacykgsaffskgtr
```

## 4.3 MVP Data Concepts

The MVP data model must support the launch-critical product flow:

```text
account/profile
identity verification state
phone verification state
license lookup state
data matching state
selfie storage
credential state
wallet pass state
share-link verifier access
subscription/payment state
audit/event history
ops visibility
```

The schema must support these concepts without exposing privileged state directly to the frontend.

## 4.4 Canonical MVP Tables

The canonical MVP table set is:

| Table | Purpose | Launch Critical |
|---|---|---|
| `profiles` | Authenticated nurse profile and account state. Includes `stripe_customer_id` for the approved MVP Stripe customer mapping. | Yes |
| `licenses` | License records and source lookup/status data. | Yes |
| `credentials` | PassTo credential record derived from profile/license gates. | Yes |
| `wallet_passes` | Apple/Google/PassKit provider records. | Yes |
| `verification_tokens` | Hashed, short-lived verifier access tokens. | Yes |
| `verifiers` | Minimal verifier identity captured in verifier flow. | Yes |
| `verification_events` | Verifier access/view events. | Yes |
| `subscriptions` | Subscription/tier state. | Yes |
| `payments` | Payment and paid-action records. | Yes |
| `stripe_events` | Stripe webhook idempotency and processing records. | Yes |
| `notification_events` | Outbound notification attempts and results. | Yes |
| `license_lookups` | Initial and refresh license lookup attempts. | Yes / minimal at launch |
| `pdf_exports` | PDF export records. | Deferred with PDF export |
| `audit_events` | Append-only operational audit history. | Yes |
| `license_status_mappings` | Raw source status to PassTo status mapping. | Yes |

`stripe_customers` is not a separate MVP table. The accepted v4 design stores `stripe_customer_id` on `profiles` and duplicates provider identifiers where needed on `subscriptions` and `payments`. See `docs/architecture/ADR/ADR-0001-stripe-customer-mapping.md`.

The final migration may include deferred-supporting tables if they are low-risk and useful for future-proofing, but launch tasks must not treat deferred product features as launch blockers.

## 4.5 Storage Concepts

Supabase Storage owns protected product assets.

Launch-critical storage:

- Selfies.

Deferred or later storage:

- Generated PDFs.
- Wallet/provider assets if needed.

Selfies must be stored in a protected bucket. Lovable must not use unrestricted public storage for selfie assets.

## 4.6 RLS Principles

Supabase RLS must enforce product boundaries:

- Nurses can access only their own allowed account, license, credential, wallet, payment, subscription, and event data.
- Nurses cannot access other nurses' data.
- Verifiers cannot browse Supabase tables directly.
- Anonymous users cannot browse credential records.
- Privileged tables and actions are service-role-only.
- Payment-gated actions cannot be bypassed by client-side writes.
- Audit and verification history is retained and protected.

RLS must be tested before any migration is approved for production use.

## 4.7 Direct Frontend Access Rules

Lovable may use the Supabase publishable key and the logged-in user's JWT for user-scoped access.

Lovable may directly read/write only records that RLS explicitly allows for the current authenticated user.

Lovable must not:

- Use a Supabase `service_role` key.
- Directly write trust decisions.
- Directly create verification tokens.
- Directly write payment/subscription truth.
- Directly write audit authority.
- Directly validate verifier tokens.
- Directly decide whether a credential can be issued.

## 4.8 Service-Role-Only Operations

The following operations must happen inside Supabase Edge Functions or approved Vercel routes:

- ID.me token exchange and verification result handling.
- Twilio send/verify code.
- License lookup.
- Data matching.
- Credential creation.
- Wallet pass signing/issuance/update.
- Verification token creation.
- Verifier token validation.
- Verifier and verification event creation.
- Stripe checkout and webhook processing.
- Subscription and payment state updates.
- Audit event writes.
- License status mapping resolution.
- Selfie access operations that require privileged storage handling.

## 4.9 Edge Function Ownership

Supabase Edge Functions are the preferred backend orchestration layer.

Expected launch-critical Edge Functions include:

| Function | Purpose | Launch Critical |
|---|---|---|
| `idme-exchange` or `idme-callback` | Handle ID.me callback/token exchange and identity state. | Yes |
| `twilio-send-code` | Send phone verification code. | Yes |
| `twilio-verify-code` | Verify phone code. | Yes |
| `lookup-license` | Look up license source data. | Yes |
| `data-match` | Match identity data to license record. | Yes |
| `credential-issue` | Create credential after gates pass. | Yes |
| `token-create-share` | Create share-link verifier token. | Yes |
| `token-validate` | Validate verifier token and return safe credential view. | Yes |
| `stripe-checkout` | Start subscription/payment checkout. | Yes |
| `stripe-webhook` | Process Stripe webhook events idempotently. | Yes |
| `notification-send` | Send critical lifecycle notifications or ops alerts. | Yes / minimal |

Function names may change during implementation, but responsibility boundaries must remain.

## 4.10 Vercel Backend Ownership

Vercel should be used only where Supabase Edge Functions are not the right tool.

Vercel is preferred for wallet pass signing if Node-specific libraries, certificates, file handling, Apple Wallet signing, Google Wallet JWT signing, or existing working signing code make Vercel the simpler and safer path.

Vercel must write durable product state back to Supabase. It must not become a separate system of record.

## 4.11 Token and Verifier Rules

Verifier access uses short-lived tokens stored as hashes.

MVP launch token type:

```text
share_link
```

Schema-supported but implementation-deferred token type:

```text
show_qr
```

Deferred and not in the v4 token constraint:

```text
pdf_qr
```

The v4 schema allows `show_qr` because TASK-0007 OD-4 confirmed that any future Show QR flow must be form-gated and auditable. However, Show QR is not launch-critical. No Edge Function, Lovable route, or backend task may create `show_qr` tokens until David explicitly reopens that scope.

Share-link tokens must expire after the approved TTL or first successful use.

Raw tokens must be returned only once and never stored.

Verifier MVP form collects only:

```text
verifier_name
verifier_email
terms_acceptance
```

Verifier access does not require a PassTo account.

## 4.12 Audit and Event Requirements

Audit and event records are non-optional MVP infrastructure.

The system must write event/audit records for:

- Account creation.
- Identity verification result.
- Phone verification result.
- License lookup result.
- Data match result.
- Selfie capture result.
- Credential issuance result.
- Wallet pass issuance result.
- Share token creation.
- Verifier token use.
- Payment/subscription updates.
- Critical notification sends/failures.
- Admin/support intervention.

`audit_events.action` should use the resolved `resource.verb` namespace.

## 4.13 Subscription and Payment Data Rules

Subscription and payment truth must come from backend-confirmed Stripe state, not frontend state.

Stripe webhooks must be idempotent using `stripe_events`.

Subscription lapse downgrades the user to Free behavior while retaining credential, wallet, payment, verification, and audit records.

## 4.14 License Status Mapping

`license_status_mappings` is an MVP reference table.

It maps raw license source statuses to PassTo product meaning:

- Normalized status.
- Product intent.
- Wallet pass treatment.
- Whether credential issuance is allowed.
- Whether alerting is required.

This mapping should be auditable and reviewable rather than buried only inside Edge Function code.

## 4.15 Migration Approval Boundary

This PRD section does not authorize schema migration execution.

Migration execution requires:

- v4 migration SQL drafted from `TASK-0007`.
- RLS test plan.
- Codex review of v4 SQL.
- David explicit migration approval.

No migration should be applied to Supabase before that approval.

## 4.16 Section 4 Acceptance Criteria

Section 4 is complete when David confirms:

- Supabase source-of-truth model is correct.
- Canonical MVP table concepts are correct.
- RLS principles are correct.
- Frontend/direct access boundaries are correct.
- Service-role-only operation list is correct.
- Supabase Edge Function and Vercel boundaries are correct.
- Migration approval boundary is clear.
