# PRD Section 6 — Integrations, Failure States, and Admin/Ops

**Status:** Draft for David Review  
**Owner:** David Bloom  
**Drafting Support:** Codex and Claude  
**Created:** 2026-05-26  
**Associated Task List:** `/docs/tasks/PRD_SECTION_06_MASTER_TASK_LIST.md`  

## 6.1 Purpose

This section defines PassTo's launch-critical integrations, degraded-mode behavior, and admin/operations requirements.

The goal is to make every external dependency explicit before implementation tasks are assigned.

## 6.2 Launch-Critical Integrations

| Integration | MVP Role | Launch Status | Owner Boundary |
|---|---|---|---|
| Supabase Auth | Nurse authentication. | Launch-critical | Supabase backend, Lovable UI. |
| Supabase Database | System of record. | Launch-critical | Supabase. |
| Supabase RLS | Data access control. | Launch-critical | Supabase. |
| Supabase Edge Functions | Preferred backend orchestration. | Launch-critical | Supabase. |
| Supabase Storage | Protected selfie storage. | Launch-critical | Supabase. |
| ID.me | Identity verification. | Launch-critical | Backend handles token exchange/result. |
| Twilio | Phone verification. | Launch-critical | Backend sends/verifies SMS. |
| RapidAPI | License lookup. | Launch-critical | Backend calls vendor. |
| Stripe | Subscriptions, checkout, payment events. | Launch-critical | Backend owns payment truth. |
| PassKit / Apple Wallet / Google Wallet | Wallet credential issuance. | Launch-critical | Vercel likely for signing; Supabase stores state. |
| Postmark | Critical email/ops alerts. | Launch-critical minimal | Backend sends/logs. |

## 6.3 Deferred Integrations

| Integration / Capability | Status | Notes |
|---|---|---|
| PDFMonkey / PDF generation | Deferred | PDF export is deferred from launch-critical MVP. |
| Show QR token flow | Deferred | Not launch-critical. |
| Scheduled refresh automation | Deferred | Manual/minimal status handling first. |
| Employer/institution account systems | Deferred | Post-MVP. |
| Deep analytics tooling | Deferred | Post-MVP. |

## 6.4 Integration Secret Rules

Secrets must never be stored in Lovable frontend code.

Backend-only secrets include:

- Supabase `service_role` key.
- ID.me client secret.
- Twilio auth token.
- RapidAPI / Propelus API key.
- Stripe secret key and webhook secret.
- Postmark server token.
- Wallet signing certificates/private keys.
- Google Wallet service account private key.
- PDF provider API keys if PDF is later reopened.

Lovable may use only publishable/browser-safe keys and authenticated user sessions.

## 6.5 Degraded-Mode Policy

Default degraded-mode rule:

```text
Fail safely. Do not issue or present credentials as valid when required trust signals are missing, failed, or unavailable.
```

Every launch-critical integration failure must:

- Preserve user-facing clarity.
- Avoid unsafe credential issuance.
- Write an event/audit record.
- Give ops a way to inspect the failure.
- Trigger ops alerting where failure is critical.

## 6.6 Failure State Requirements

| Failure State | Required Behavior |
|---|---|
| ID.me returns IAL1 | Block issuance; route to retry/support; log event. |
| ID.me fails or returns unexpected data | Block issuance; log event; alert ops if unexpected/provider issue. |
| Twilio unavailable | Block production phone-dependent launch unless David approves fallback. |
| Phone verification fails | Allow retry within safe limits; keep issuance blocked. |
| License lookup unavailable | Block issuance; allow retry; log event; alert ops for provider outage. |
| License lookup returns no result | Block issuance; route to support/remediation; log event. |
| Data match fails | Block issuance; flag account/credential state; log event; support intervention required. |
| Selfie capture/upload fails | Allow retry; keep issuance blocked; log event. |
| Credential creation fails | Show failed/pending state; log event; ops inspection required. |
| Wallet pass issuance fails | Credential state may exist, but wallet status is failed/pending; alert ops. |
| Stripe checkout fails | Do not grant paid entitlement; log event; allow retry. |
| Stripe webhook fails or duplicates | Use `stripe_events` idempotency; retry safely; alert ops if unresolved. |
| Postmark send fails | Log notification failure; alert ops for critical messages. |
| Supabase Edge Function fails | Return safe user message; log event; expose ops inspection path. |

## 6.7 Admin/Ops Requirements

For MVP, admin/ops uses Supabase dashboard/views first.

Ops must be able to inspect:

- Nurse profile and onboarding step.
- Identity verification state.
- Phone verification state.
- License lookup result.
- Data match result.
- Selfie storage state.
- Credential state.
- Wallet pass state.
- Subscription/payment state.
- Share token and verification event state.
- Audit/event history.
- Critical notification failures.

## 6.8 Ops Alerting

Launch-critical ops alerts should be minimal and practical.

Alert-worthy events include:

- ID.me unexpected/provider failure.
- License lookup provider outage.
- Repeated data match failures above a defined threshold.
- Credential issuance failure.
- Wallet pass issuance failure.
- Stripe webhook processing failure.
- Critical notification failure.
- Supabase Edge Function repeated failures.

Postmark is the preferred alert channel unless David approves another channel.

## 6.9 Support and Recovery

MVP support should prioritize clear state inspection and safe manual recovery over elaborate admin tooling.

Recovery paths should exist for:

- Stuck onboarding.
- Failed identity callback.
- Failed phone verification.
- Failed license lookup.
- Failed selfie upload.
- Failed credential creation.
- Failed wallet issuance.
- Stripe/payment mismatch.

Any manual intervention must write an audit event.

## 6.10 Section 6 Acceptance Criteria

Section 6 is complete when David confirms:

- Launch-critical integrations are correct.
- Deferred integrations are correct.
- Secret-handling rules are correct.
- Failure-state behavior is correct.
- Admin/ops requirements are sufficient for MVP.
- Ops alerting approach is sufficient for MVP.
