# PassTo — Account Creation, Onboarding & Payments Flow

**Version:** 2.0  
**Date:** May 25, 2026  
**Status:** Proposed — architecture-updated draft  
**Owner:** Codex — Engineering Director  
**Approver:** David — Product Owner  
**Supersedes:** prior Make/Airtable onboarding and payments blueprint  
**Target folder:** `/docs/flows/`

---

## 1. Codex Review Summary

The previous onboarding/payments blueprint remains valuable as a product-flow artifact, but it is tightly coupled to the old Make/Airtable implementation. This v2.0 document updates the flow for the approved PassTo direction: Vercel + Supabase, with Stripe, ID.me, Twilio, PassKit, and license-verification providers integrated through backend-controlled routes.

### Keep

- First-session objective: nurse moves from signup to verified wallet credential in one continuous guided flow.
- Hard issuance gate: no wallet credential until identity, phone, license, data match, selfie, and active-license checks pass.
- Onboarding resume model.
- Stripe metadata routing.
- Stripe webhook idempotency.
- Tier-gated feature model.
- Audit-log discipline.
- Retry/failure handling for external systems.

### Replace

| Old assumption | Updated architecture decision |
|---|---|
| Airtable is source of truth | Supabase Postgres is source of truth |
| Make scenarios orchestrate workflow | Vercel API routes/server actions orchestrate workflow |
| Airtable attachment stores selfie | Supabase Storage stores selfie object; DB stores metadata/path |
| Make Data Store holds maps | Supabase lookup/reference tables hold maps |
| Make polling webhooks hold async status | Supabase `action_status` holds async state |
| Airtable audit table | Supabase `audit_log` append-only table |
| Airtable record IDs in Stripe metadata | Supabase UUIDs in Stripe metadata |

### Codex assessment

This flow is MVP-critical and should not be built as one large feature. The risk is state management across multiple external providers: ID.me, Twilio, license lookup, Stripe, PassKit, and Supabase. Every state transition must be explicit, idempotent, resumable, and auditable.

---

## 2. User Objective

A travel nurse discovers PassTo and must be able to go from first visit to a live, verified wallet credential in a single session.

The flow has three objectives:

1. **Account creation:** collect the minimum information required to create an authenticated account and start verification.
2. **Onboarding:** verify identity, confirm phone possession, look up license, match data, capture selfie, and issue wallet credential.
3. **Payments:** support subscriptions, one-time paid actions, and additional-license activation through Stripe without PassTo storing card data.

The system must never issue a wallet credential until all issuance gate conditions are satisfied.

---

## 3. System Ownership

### Frontend — Vercel-hosted app

Responsibilities:

- Render signup, onboarding, dashboard, upgrade, payment return, and credential-ready screens.
- Maintain Supabase Auth session.
- Call PassTo backend endpoints only.
- Display loading, timeout, retry, and resume states.

### Backend/API — Vercel API routes/server actions

Responsibilities:

- ID.me OAuth start/callback.
- Twilio SMS code send/resend/verify.
- License lookup orchestration.
- Data matching.
- Stripe Checkout creation and webhook handling.
- PassKit credential issuance.
- PDF export orchestration.
- Privileged Supabase writes.

### Data/Auth/Storage — Supabase

Responsibilities:

- Supabase Auth for user identity.
- Supabase Postgres as durable source of truth.
- Supabase Storage for selfies and generated artifacts.
- RLS for user-facing access; privileged transitions happen server-side.

---

## 4. Core Supabase Tables

Table names should be reconciled against the approved database blueprint, but this flow requires these durable concepts.

### `nurses`

Stores authenticated nurse profile, account tier, verification statuses, onboarding state, and Stripe customer linkage.

Key fields:

- `id uuid primary key`
- `auth_user_id uuid unique not null`
- `first_name`, `last_name`, `email`, `phone`
- `account_tier` default `free`
- `account_status` default `active`
- `onboarding_step` default `pending_idme`
- `credential_issuance_status` default `not_attempted`
- `idme_verification_status`
- `idme_verification_id unique`
- `idme_assurance_level`
- `idme_verified_at`
- `idme_full_name_temp`
- `idme_dob_temp`
- `phone_verification_status`
- `match_result`
- `stripe_customer_id`

### `phone_verification_codes`

Do not store raw SMS codes in `nurses`. Store hashed codes separately.

Key fields:

- `nurse_id`
- `code_hash`
- `expires_at`
- `attempt_count`
- `resend_count`
- `blocked_until`
- `consumed_at`

### `licenses`

Stores normalized license lookup results.

Key fields:

- `nurse_id`
- `license_number`
- `license_type`
- `state`
- `status`
- `raw_status`
- `expiry_date`
- `compact_status`
- `compact_eligible`
- `source_type`
- `source_name`
- `last_verified_at`
- `primary_license`
- `profession_code`
- `license_holder_name`
- `license_holder_dob`

### `selfies`

Stores selfie metadata; image object lives in Supabase Storage.

Key fields:

- `nurse_id`
- `storage_bucket`
- `storage_path`
- `capture_method = live_camera`

### `credentials`

Stores wallet credential state.

Key fields:

- `nurse_id`
- `license_id`
- `pass_type` — `apple` or `google`
- `pass_template_id`
- `credential_status`
- `current_qr_token`
- `qr_token_expires_at`
- `device_push_token`
- `pass_url`
- `issued_at`
- `last_updated_at`

### `payments`

Stores succeeded financial transactions only.

Key fields:

- `nurse_id`
- `stripe_customer_id`
- `stripe_checkout_session_id unique`
- `stripe_payment_intent_id unique`
- `stripe_subscription_id`
- `payment_type`
- `transaction_amount_cents`
- `currency`
- `status`
- `product_name`

### `payment_events`

Stores Stripe webhook events for idempotency.

Key fields:

- `stripe_event_id unique`
- `event_type`
- `processed_at`
- `processing_status`
- `error_message`

### `action_status`

Tracks async credential/payment-dependent actions.

Key fields:

- `nurse_id`
- `action_type` — `credential_issuance`, `share_link`, `pdf_export`, `refresh`, `license_activation`
- `status` — `pending`, `payment_required`, `processing`, `complete`, `failed`, `refunded`
- `result_url`
- `stripe_checkout_session_id`
- `error_code`
- `error_message`

### `audit_log`

Append-only business event log.

Key fields:

- `event_type`
- `entity_type`
- `entity_id`
- `actor_type` — `system`, `nurse`, `admin`, `webhook`
- `actor_id`
- `changed_field`
- `old_value`
- `new_value`
- `ip_address`
- `metadata jsonb`

---

## 5. Onboarding State Machine

Canonical `nurses.onboarding_step` values:

1. `pending_idme`
2. `pending_phone`
3. `pending_license`
4. `pending_selfie`
5. `pending_issuance`
6. `complete`

Exception/error states should be represented by status fields and `action_status`, not by endlessly expanding onboarding steps.

Examples:

- IAL1 only: `onboarding_step = pending_idme`, `idme_verification_status = ial1_only`.
- Too many SMS attempts: stay at `pending_phone`; code record has `blocked_until`.
- Credential issuance failed: `onboarding_step = pending_issuance`, `credential_issuance_status = failed`.
- Data match failed: `account_status = flagged`, `match_result = failed`.

---

## 6. Functional Flow

## 6.1 Account Creation

Fields:

- First name
- Last name
- Email address
- Phone number
- Password
- Confirm password

Backend behavior:

1. User signs up through Supabase Auth.
2. Backend creates matching `nurses` profile.
3. Defaults: Free tier, Active status, `pending_idme`, `not_attempted` issuance.
4. Write `audit_log.event_type = account_created`.
5. Route immediately to ID.me verification.

Engineering decision: do not add an email-confirmation gate before ID.me unless David later decides fraud risk outweighs conversion.

## 6.2 Identity Verification — ID.me

Required result: IAL2 or equivalent government-verified assurance. IAL1/self-attested is insufficient.

Flow:

1. `/verify-identity` starts OAuth.
2. ID.me redirects to `/auth/idme/callback?code=...`.
3. Vercel callback exchanges auth code for token.
4. Backend fetches attributes.
5. Backend checks `idme_verification_id` uniqueness.
6. Duplicate identity on another account is blocked.
7. Store ID.me verification fields and temporary match fields.
8. If IAL2: generate SMS code and set `pending_phone`.
9. If IAL1: remain/return to `pending_idme` with retry path.
10. Write `audit_log.event_type = id_verified`.

Frontend timeout: show retry option after 30 seconds. Retry reuses same Supabase user and nurse record.

## 6.3 Phone Verification

Flow:

1. Backend creates six-digit code after IAL2.
2. Store only `code_hash`, expiry, attempts, and resend limits.
3. Send SMS through Twilio.
4. Nurse enters code at `/verify-phone`.
5. Backend validates.
6. On success: mark phone verified, consume code, set `pending_license`, and write `phone_verified` audit event.

Limits:

- Code expiry: 10 minutes.
- Max entry attempts: 5.
- Resend visible after 60 seconds.
- Max resends: 3.
- After resend exhaustion: block sends for 60 minutes.

## 6.4 License Lookup

Fields:

- License number
- License type
- State

Flow:

1. Nurse submits license details.
2. Backend checks Supabase source-routing table.
3. Use direct board API if available; otherwise approved vendor source.
4. Normalize returned status through lookup table.
5. Create/update `licenses` record.
6. Run data matching.
7. If active license and data match pass: set `pending_selfie`.
8. Write `license_looked_up` and `data_matched` audit events.

Failure behavior:

- Not found: allow up to 3 correction attempts, then support prompt.
- Inactive/suspended/revoked: store returned license, block issuance, explain active-license requirement.
- Source unavailable: no charge; show retry/support path.

## 6.5 Data Matching

Inputs:

- ID.me full name temp field.
- ID.me DOB temp field.
- License holder name.
- License holder DOB where available.

Pass rule:

- Full name matches within defined tolerance; and
- DOB matches, or DOB is unavailable from source.

Failure rule:

- `nurses.account_status = flagged`
- `nurses.match_result = failed`
- block issuance
- write `data_matched` audit event with `new_value = failed`
- show manual-review/support message

Codex warning: name matching needs unit tests. Do not let Claude invent fuzzy matching casually.

## 6.6 Selfie Capture

Flow:

1. Nurse captures live photo in browser.
2. Camera roll upload remains blocked for MVP unless David accepts the fraud/conversion tradeoff.
3. Nurse previews and confirms.
4. Frontend uploads through backend-controlled secure upload flow.
5. Store image in Supabase Storage.
6. Create `selfies` metadata row.
7. Set `pending_issuance` and `credential_issuance_status = pending`.
8. Start credential issuance.

Tier behavior:

- Free: selfie captured but not displayed on wallet pass.
- Standard/Premier: selfie displayed on wallet pass.

## 6.7 Credential Issuance

Issuance gate requires all six:

1. Phone verification status = verified.
2. ID.me assurance level = IAL2.
3. ID.me verification status = verified.
4. Active primary license exists.
5. `audit_log` contains data match passed for this nurse.
6. Selfie record exists.

Flow:

1. Backend checks gate.
2. Fetch nurse, primary license, selfie, and tier.
3. Generate QR token and 72-hour expiry.
4. Assemble PassKit payload.
5. Include selfie only for Standard/Premier.
6. Create Apple or Google wallet pass based on device type or explicit choice.
7. Create `credentials` record.
8. Set issuance complete and onboarding complete.
9. Write `credential_issued` audit event.
10. Return wallet add URL.

Failure handling:

- Retry PassKit call up to 3 times.
- After failure set `credential_issuance_status = failed` and `action_status.status = failed`.
- Retry button re-checks gate before reissuing.

Revocation rule: when a credential is revoked, immediately set QR token expiry to a past timestamp.

---

## 7. Payments

## 7.1 Working Product Model

| Product | Price | Billing |
|---|---:|---|
| Standard | $9.99 | Monthly subscription |
| Premier | $19.99 | Monthly subscription |
| Share link | $1.99 | One-time |
| On-demand refresh | $1.99 | One-time |
| PDF export | $1.99 | One-time |
| Additional license activation | $4.99 | One-time |

Codex recommendation: confirm pricing before creating durable Stripe Prices.

## 7.2 Stripe Metadata Routing

Every Checkout session must include:

- `nurse_id`
- `payment_type`
- `action_status_id` when payment unlocks an async action

Allowed `payment_type` values:

- `subscription_standard`
- `subscription_premier`
- `share_link`
- `refresh`
- `pdf_export`
- `license_activation`

Invalid or missing metadata must be logged and ignored.

## 7.3 Stripe Webhook Handler

Endpoint: `/api/webhooks/stripe`.

Required behavior:

1. Verify Stripe signature.
2. Insert `stripe_event_id` into `payment_events`.
3. If duplicate, skip and return success.
4. Read metadata.
5. Route by payment type.
6. Update Supabase safely.
7. Create `payments` row for succeeded payments only.
8. Write audit event.
9. Update `action_status` if applicable.

Minimum events:

- `checkout.session.completed`
- `customer.subscription.deleted`
- `charge.dispute.created`
- `charge.refunded`

Recommended pre-launch additions:

- `invoice.payment_failed`
- `customer.subscription.updated`
- `payment_intent.payment_failed` for diagnostics only

## 7.4 Subscription Upgrade

1. Nurse taps upgrade.
2. Backend creates Checkout session.
3. Stripe returns to success/cancel page.
4. Webhook confirms payment.
5. Backend updates `nurses.account_tier`.
6. Backend creates `payments` row.
7. Backend writes `tier_changed` audit event.
8. Dashboard reflects tier on reload.

Disputes/refunds downgrade to Free immediately for MVP.

## 7.5 Microtransactions

### Share link

Free tier requires $1.99. Backend creates `action_status` and Checkout session. Webhook confirms payment, generates share token/link, updates action status, and frontend polls until complete. Standard/Premier generate link directly.

### PDF export

Free tier requires $1.99. Standard/Premier generate immediately. Paid Free-tier export waits for confirmed payment before PDF generation/download.

### On-demand refresh

Free/Standard pay $1.99. Premier includes refresh. Refresh must not update credential data unless source verification succeeds.

## 7.6 Failed Post-Payment Action

If Stripe succeeds but PassTo cannot complete paid action:

1. Mark action failed.
2. Attempt automatic refund.
3. If refund succeeds, mark refunded and audit.
4. If refund fails, write escalation audit event for manual review.

---

## 8. Tier-Gated Feature Logic

| Feature | Free | Standard | Premier |
|---|---|---|---|
| Secure share link | $1.99 per link | Included | Included |
| On-demand refresh | $1.99 | $1.99 | Included |
| PDF export | $1.99 | Included | Included |
| Profile photo on wallet pass | Not displayed | Included | Included |
| License expiry alerts | Not included | Included | Included |
| Scheduled refresh | Not included | Annual | Monthly |
| OIG/SAM monitoring | Not included | Not included | Coming soon / post-MVP |
| Included licenses | 1 primary | 1 | 2 |
| Add license | Not available | $4.99 after first | $4.99 after second |

---

## 9. Frontend Routes

| Route | Purpose | Backend calls |
|---|---|---|
| `/signup` | Account creation | Supabase Auth + profile creation |
| `/login` | Login and resume routing | Supabase session/profile read |
| `/verify-identity` | Start ID.me | `/api/idme/start` |
| `/auth/idme/callback` | ID.me callback UI | `/api/idme/callback` |
| `/verify-phone` | Code entry/resend | `/api/phone/verify`, `/api/phone/resend` |
| `/enter-license` | License lookup | `/api/licenses/lookup` |
| `/take-selfie` | Live selfie capture | `/api/selfies/upload-url`, `/api/selfies/complete` |
| `/issuing-credential` | Poll/retry issuance | `/api/credentials/status`, `/api/credentials/issue` |
| `/credential-ready` | Wallet add page | Uses pass URL |
| `/dashboard` | Nurse dashboard | Profile/license/credential/payment APIs |
| `/billing/upgrade` | Plan upgrade | `/api/stripe/checkout` |
| `/billing/success` | Stripe return | Poll profile/action status |
| `/billing/cancel` | Stripe cancel | No state change |

---

## 10. Backend Endpoints

| Endpoint | Method | Purpose |
|---|---:|---|
| `/api/idme/start` | POST | Create ID.me auth URL/state |
| `/api/idme/callback` | POST | Exchange code, fetch attributes, advance onboarding |
| `/api/phone/resend` | POST | Resend phone code within limits |
| `/api/phone/verify` | POST | Verify submitted SMS code |
| `/api/licenses/lookup` | POST | Lookup license, normalize status, run data match |
| `/api/selfies/upload-url` | POST | Create secure upload target |
| `/api/selfies/complete` | POST | Confirm selfie upload and start issuance |
| `/api/credentials/issue` | POST | Run gate and PassKit call |
| `/api/credentials/status` | GET | Return issuance status/pass URL |
| `/api/share/create` | POST | Create share link or Checkout session |
| `/api/pdf/export` | POST | Create PDF or Checkout session |
| `/api/stripe/checkout` | POST | Create Checkout session |
| `/api/webhooks/stripe` | POST | Stripe webhook processor |
| `/api/actions/status` | GET | Poll async action status |

---

## 11. Acceptance Criteria

### Onboarding

- [ ] Nurse can create account on mobile browser in under 60 seconds.
- [ ] Duplicate email cannot create duplicate nurse profile.
- [ ] `onboarding_step = pending_idme` on account creation.
- [ ] `credential_issuance_status = not_attempted` on account creation.
- [ ] ID.me OAuth redirect works.
- [ ] ID.me callback timeout/retry UI works.
- [ ] IAL1 blocks issuance and allows retry.
- [ ] IAL2 advances to phone verification.
- [ ] Duplicate ID.me identity is blocked.
- [ ] SMS sends only after IAL2.
- [ ] SMS code is hashed, not stored raw.
- [ ] Wrong code increments attempt count.
- [ ] Expired code blocks verification.
- [ ] Resend limits are enforced.
- [ ] Phone verification advances to license entry.
- [ ] License lookup creates/updates license record.
- [ ] Inactive/suspended/revoked license blocks issuance.
- [ ] Data match pass advances to selfie.
- [ ] Data match fail flags account and blocks issuance.
- [ ] Selfie captured live on iOS Safari and Android Chrome.
- [ ] Selfie stored in Supabase Storage.
- [ ] Issuance checks all six gate conditions.
- [ ] PassKit wallet pass issued for Apple and Google paths.
- [ ] Credential failure shows retry button.
- [ ] Retry re-checks gate and succeeds without repeating onboarding.
- [ ] Revoked credential invalidates active QR token.

### Payments

- [ ] Stripe Checkout opens for Standard and Premier upgrades.
- [ ] Stripe webhook signature is verified.
- [ ] Webhook idempotency prevents duplicate processing.
- [ ] Metadata routes subscription and one-time actions correctly.
- [ ] Successful subscription updates account tier.
- [ ] Failed payments do not create `payments` rows.
- [ ] Free share link requires $1.99 and waits for confirmed payment.
- [ ] Standard/Premier share link is generated without payment.
- [ ] Free PDF export requires $1.99.
- [ ] Standard/Premier PDF export is included.
- [ ] Auto-refund is attempted if paid action cannot complete after payment.
- [ ] Dispute/refund downgrades account to Free immediately for MVP.

### Auditability

- [ ] `audit_log` records account creation, ID verification, phone verification, license lookup, data match, credential issue, tier change, payment processing, token generation, refund, and revocation.
- [ ] External webhook events are traceable by provider event ID.

---

## 12. Open Decisions

| Decision | Recommendation | Priority |
|---|---|---:|
| Final subscription pricing | Confirm before Stripe product setup | High |
| ID.me service-provider setup | Start early; can block launch | High |
| Twilio A2P 10DLC | Start when EIN/business docs are ready | High |
| PassKit templates | Create Apple and Google templates before build | High |
| License lookup strategy | Build routing abstraction; do not hardcode source logic | High |
| IAL1 retry policy | 3 retries, then support/manual review | Medium |
| PDF generation mechanism | Treat as implementation detail after output spec | Medium |
| Email confirmation gate | Defer for conversion unless fraud increases | Medium |

---

## 13. Recommended Claude Task Breakdown

Do not assign this as one implementation task.

1. **FLOW-001 — Supabase onboarding state tables**  
   Create/confirm schema for `nurses`, `phone_verification_codes`, `licenses`, `selfies`, `credentials`, `payments`, `payment_events`, `action_status`, and `audit_log`.

2. **FLOW-002 — Signup and onboarding resume routing**  
   Build auth/profile creation and route users based on `onboarding_step` plus exception statuses.

3. **FLOW-003 — ID.me callback service**  
   Implement OAuth callback, uniqueness check, IAL2 gate, temp match fields, and audit event.

4. **FLOW-004 — Phone verification service**  
   Implement hashed SMS codes, Twilio send/resend, attempt limits, expiry, and verification transition.

5. **FLOW-005 — License lookup and data match**  
   Implement license lookup abstraction, normalized status mapping, license record creation, and tested data-matching utility.

6. **FLOW-006 — Selfie capture and storage**  
   Implement live camera capture, Supabase Storage upload, selfie metadata record, and transition to issuance.

7. **FLOW-007 — Credential issuance gate and PassKit integration**  
   Implement hard issuance gate, PassKit payload creation, Apple/Google path, retry, status polling, and revocation invalidation.

8. **FLOW-008 — Stripe checkout and webhook core**  
   Implement Checkout creation, metadata routing, webhook signature verification, idempotency, `payments`, `payment_events`, and tier changes.

9. **FLOW-009 — Paid actions**  
   Implement share link, PDF export, refresh, action status polling, and post-payment failure refund path.

---

## 14. Codex Notes

This document is suitable for the PassTo flow documentation library. It is not yet a build spec. The next step should be to convert the recommended Claude tasks into task files under `/docs/tasks/` with acceptance criteria and Definition of Done.

The most important architectural correction is removing automation-tool state from the flow. Supabase should hold durable state; Vercel should perform orchestration; Stripe/ID.me/Twilio/PassKit should remain external providers with auditable, idempotent boundaries.
