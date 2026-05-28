# PRD Section 3 Master Task List

**PRD Section:** Section 3 — End-to-End MVP User Journeys  
**Status:** Execution Task Sequence Drafted — Awaiting David Approval  
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

## Claude Execution Sequence From Section 3

These task specs translate PRD Section 3 into an ordered Claude execution queue. Each task is Class A implementation work and remains `Spec Drafted — Awaiting David Approval` until David explicitly approves execution.

Claude must execute these in order unless David or Codex records an approved sequencing change in GitHub.

| Sequence | Task ID | Task | Status | Depends On | Notes |
|---:|---|---|---|---|---|
| 1 | TASK-0018 | Implement Account Profile Foundation and Onboarding Routing | Spec Drafted — Awaiting David Approval | TASK-0016, TASK-0017 | Account creation, profile init, onboarding routing. |
| 2 | TASK-0019 | Implement ID.me Identity Verification Backend Exchange and Callback Wiring | Spec Drafted — Awaiting David Approval | TASK-0018, TASK-0011 | Backend-owned ID.me exchange and IAL2 gate. |
| 3 | TASK-0020 | Implement Twilio Phone Verification Journey | Spec Drafted — Awaiting David Approval | TASK-0018, TASK-0019 | SMS send/verify gate. |
| 4 | TASK-0021 | Implement License Lookup Journey | Spec Drafted — Awaiting David Approval | TASK-0019, TASK-0020, FLOW-LICENSE-002 | Dedicated backend lookup function. |
| 5 | TASK-0022 | Implement Data Matching Journey | Spec Drafted — Awaiting David Approval | TASK-0019, TASK-0021, FLOW-LICENSE-003 | Hard credential issuance gate. |
| 6 | TASK-0023 | Implement Selfie Capture and Protected Supabase Storage Upload | Spec Drafted — Awaiting David Approval | TASK-0022 | Protected selfie storage and upload. |
| 7 | TASK-0024 | Implement Credential Creation Gate | Spec Drafted — Awaiting David Approval | TASK-0019, TASK-0020, TASK-0021, TASK-0022, TASK-0023 | Credential created only after all gates pass. |
| 8 | TASK-0025 | Implement Automatic Wallet Pass Issuance and PassReady Flow | Spec Drafted — Awaiting David Approval | TASK-0024, TASK-0011 | Automatic wallet issuance after credential creation. |
| 9 | TASK-0026 | Implement Nurse Dashboard Launch-Critical Status and Actions | Spec Drafted — Awaiting David Approval | TASK-0025 | Status dashboard; no deferred Show QR/PDF blockers. |
| 10 | TASK-0029 | Implement Stripe Subscription State and Entitlement Gating | Spec Drafted — Awaiting David Approval | TASK-0018 | Server-side paid action gating. |
| 11 | TASK-0027 | Implement Share-Link Token Creation Journey | Spec Drafted — Awaiting David Approval | TASK-0026, TASK-0029 | Entitled token creation; raw token returned once. |
| 12 | TASK-0028 | Implement Verifier Token Validation and Credential View | Spec Drafted — Awaiting David Approval | TASK-0027 | `/v/{token}` verifier flow. |
| 13 | TASK-0030 | Implement Admin/Ops Visibility and Journey Failure-State Coverage | Spec Drafted — Awaiting David Approval | TASK-0018 through TASK-0029 | Supabase ops visibility and failure-state coverage. |

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
