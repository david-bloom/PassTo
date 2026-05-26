# PRD Section 3 Master Task List

**PRD Section:** Section 3 — End-to-End MVP User Journeys  
**Status:** Draft for David Review  
**Created:** 2026-05-26  
**Owner:** David Bloom  
**Execution Support:** Codex and Claude  

## Purpose

This task list translates PRD Section 3 user journeys into future implementation work blocks. It keeps launch-critical journeys separate from deferred journeys.

## Completed Journey Decisions

| Decision | Status | Notes |
|---|---|---|
| License lookup is separate from ID.me exchange. | Done | Dedicated backend operation/function. |
| Wallet pass issuance triggers automatically at end of enrollment. | Done | User-facing status appears in PassReady; frontend does not decide issuance. |
| Selfie storage is Supabase Storage. | Done | Protected bucket/policy required. |
| Show QR journey is deferred. | Done | Do not include as launch-critical implementation. |
| PDF export journey is deferred. | Done | Do not include as launch-critical implementation. |
| Verifier MVP flow uses minimal name/email + Terms acceptance. | Done | No verifier account required. |

## Launch-Critical Journey Work Blocks

| Work Block | Status | Notes |
|---|---|---|
| Account creation journey | Pending implementation task | Supabase Auth + profile creation. |
| Identity verification journey | Pending implementation task | ID.me callback/exchange backend-owned. |
| Phone verification journey | Pending implementation task | Twilio SMS; launch-critical. |
| License lookup journey | Pending implementation task | Dedicated backend function. |
| Data matching journey | Pending implementation task | Hard credential issuance gate. |
| Selfie capture journey | Pending implementation task | Supabase Storage. |
| Credential creation journey | Pending implementation task | Backend only after gates pass. |
| Wallet pass issuance journey | Pending implementation task | Automatic at end of enrollment. |
| Nurse dashboard journey | Pending implementation task | Launch-critical actions only. |
| Share link journey | Pending implementation task | Token creation backend-owned. |
| Verifier credential view journey | Pending implementation task | Token validation + verifier/event records. |
| Subscription/entitlement journey | Pending implementation task | Server-side gating. |
| Admin/ops journey | Pending implementation task | Supabase dashboard/views first. |

## Deferred Journey Work Blocks

| Work Block | Status | Notes |
|---|---|---|
| Show QR journey | Deferred | David must reopen before implementation. |
| PDF export journey | Deferred | David must reopen before implementation. |
| Scheduled automated refresh journey | Deferred | David must reopen before implementation. |
| Additional license journey | Deferred | David must reopen before implementation. |
| Employer dashboard journey | Deferred | Post-MVP. |
| Lovable admin UI journey | Deferred | Supabase dashboard/views first. |

## Proposed Next Tasks From Section 3

| Task ID | Task | Status | Notes |
|---|---|---|---|
| TASK-0014 | Create launch-critical MVP journey implementation sequence. | Proposed | Turns Section 3 journeys into ordered build tasks. |
| TASK-0015 | Create account-to-wallet enrollment flow task bundle. | Proposed | Account, ID.me, phone, lookup, data match, selfie, credential, wallet. |
| TASK-0016 | Create verifier share-link flow task bundle. | Proposed | Share token, verifier form, token validation, credential view, audit/event writes. |
| TASK-0017 | Create dashboard launch-scope task bundle. | Proposed | Dashboard status/actions excluding deferred Show QR and PDF. |

## Not In Scope For Section 3

- Migration SQL.
- Detailed Edge Function code.
- Lovable UI implementation.
- Stripe product setup.
- Wallet certificate setup.
- Detailed test cases.

These belong in implementation task specs after the journeys are approved.

## Section 3 Review Checklist

- [ ] David confirms launch-critical journey map is correct.
- [ ] David confirms account creation journey is correct.
- [ ] David confirms ID.me identity journey is correct.
- [ ] David confirms phone verification journey is correct.
- [ ] David confirms license lookup journey is correct.
- [ ] David confirms data matching journey is correct.
- [ ] David confirms selfie capture journey is correct.
- [ ] David confirms credential/wallet issuance journey is correct.
- [ ] David confirms dashboard journey is correct.
- [ ] David confirms share-link/verifier journey is correct.
- [ ] David confirms deferred journeys are correctly excluded.
