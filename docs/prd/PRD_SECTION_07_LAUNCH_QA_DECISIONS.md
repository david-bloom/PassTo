# PRD Section 7 — Launch Readiness, QA, and Open Decisions

**Status:** Draft for David Review  
**Owner:** David Bloom  
**Drafting Support:** Codex and Claude  
**Created:** 2026-05-26  
**Associated Task List:** `/docs/tasks/PRD_SECTION_07_MASTER_TASK_LIST.md`  

## 7.1 Purpose

This section defines what must be true before PassTo can launch with a first production nurse.

It covers launch readiness, QA, security review, migration approval, production configuration, and remaining decision control.

## 7.2 Launch Readiness Definition

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

## 7.3 Required Pre-Launch Gates

| Gate | Required Before Launch |
|---|---|
| PRD sections approved | Yes |
| v4 Supabase migration SQL drafted | Yes |
| Codex QA of v4 migration SQL | Yes |
| David migration approval | Yes |
| Migration applied to intended Supabase project | Yes |
| RLS tests completed | Yes |
| Lovable connected to approved backend endpoints | Yes |
| ID.me production readiness | Yes |
| Twilio production readiness or approved fallback | Yes |
| RapidAPI / Propelus readiness | Yes |
| Stripe checkout/webhook readiness | Yes |
| Wallet pass signing readiness | Yes |
| Postmark critical alert readiness | Yes |
| Terms/disclaimer readiness | Yes |
| Launch smoke test passed | Yes |

## 7.4 QA Scope

QA must cover:

- Account creation.
- Login/session persistence.
- ID.me success/failure.
- Twilio success/failure.
- License lookup success/failure.
- Data match pass/fail.
- Selfie upload success/failure.
- Credential creation.
- Wallet pass issuance.
- Dashboard display.
- Share-link creation.
- Verifier token validation.
- Verifier form and Terms acceptance.
- Stripe checkout and webhook handling.
- Subscription lapse behavior.
- RLS access boundaries.
- Critical failure logging and ops visibility.

## 7.5 Security Review Scope

Security review must confirm:

- Lovable contains no service-role secrets.
- RLS prevents cross-nurse data access.
- Verifiers cannot browse credential data.
- Raw tokens are not stored.
- Token validation is backend-controlled.
- Payment-gated actions are backend-controlled.
- Stripe webhooks are idempotent.
- Audit/event tables are not broadly client-writable.
- Selfie storage is protected.
- Temporary ID.me matching fields are minimized and cleared.

## 7.6 Production Configuration Scope

Production readiness must include:

- Supabase project selected and confirmed.
- Environment variables configured.
- Auth redirect URLs configured.
- Edge Function secrets configured.
- Stripe live/test mode separation understood.
- Stripe webhook endpoint configured.
- ID.me redirect/callback configured.
- Twilio A2P 10DLC readiness confirmed or fallback approved.
- Wallet signing certs/keys configured.
- Domain routing confirmed.
- Postmark sender/domain readiness confirmed.

## 7.7 Launch Smoke Test

Before launch, PassTo must pass a smoke test:

```text
create nurse account
→ verify identity
→ verify phone
→ look up license
→ pass data match
→ upload selfie
→ issue credential
→ issue wallet pass
→ view dashboard
→ create share link
→ verifier views credential
→ subscription/payment state behaves correctly
→ ops can inspect events
```

## 7.8 Open Decision Control

Open decisions must be tracked in GitHub.

No implementation task should proceed if it depends on an unresolved decision unless the task is explicitly a discovery or recommendation task.

Current high-priority decision areas:

- v4 migration SQL approval.
- Production vs. dev Supabase project usage.
- Wallet signing implementation details.
- Twilio production readiness/fallback.
- Terms of Use and verifier disclosure language.
- Exact launch smoke-test data and test nurse.

## 7.9 Done Definition for PRD

The PRD is ready for implementation sequencing when:

- Sections 1 through 7 are approved.
- Each section has an approved master task list.
- Deferred scope is clearly marked.
- Launch-critical scope is clearly marked.
- Open decisions are listed and routed.
- Claude/Codex can create implementation tasks without reinterpreting product scope.

## 7.10 Section 7 Acceptance Criteria

Section 7 is complete when David confirms:

- Launch readiness definition is correct.
- Pre-launch gates are correct.
- QA scope is correct.
- Security review scope is correct.
- Production configuration scope is correct.
- Launch smoke test is correct.
- Open decision control is sufficient.
