# PRD Section 5 Master Task List

**PRD Section:** Section 5 — Feature Requirements  
**Status:** Draft for David Review  
**Created:** 2026-05-26  
**Owner:** David Bloom  
**Execution Support:** Codex and Claude  

## Purpose

This task list converts Section 5 feature requirements into launch-critical and deferred execution controls.

It is not an implementation plan yet. Implementation tasks should be created only after the feature requirements are approved.

## Launch-Critical Feature Work Blocks

| Feature | Status | Notes |
|---|---|---|
| Account creation and authentication | Pending implementation task | Supabase Auth + Lovable UI. |
| Nurse profile setup | Pending implementation task | Backend-controlled trust fields. |
| ID.me identity verification | Pending implementation task | IAL2 required. |
| Twilio phone verification | Pending implementation task | Launch-critical. |
| License lookup | Pending implementation task | Dedicated backend function. |
| Data matching | Pending implementation task | Hard issuance gate. |
| Selfie capture and storage | Pending implementation task | Supabase Storage. |
| Credential creation | Pending implementation task | Backend-controlled after gates pass. |
| Wallet pass issuance | Pending implementation task | Automatic after enrollment. |
| Nurse dashboard | Pending implementation task | Launch-critical actions only. |
| Share-link creation | Pending implementation task | Token hash, one-time use. |
| Verifier credential view | Pending implementation task | `/v/{token}` flow. |
| Stripe subscriptions and entitlement gating | Pending implementation task | Server-side gating. |
| Audit and event logging | Pending implementation task | Non-optional infrastructure. |
| Ops visibility | Pending implementation task | Supabase dashboard/views first. |
| Critical notifications / ops alerts | Pending implementation task | Minimal launch scope. |

## Deferred Feature Work Blocks

| Feature | Status | Notes |
|---|---|---|
| Show QR | Deferred | Do not assign for launch. |
| PDF export | Deferred | Do not assign for launch. |
| Scheduled automated refresh | Deferred | Do not assign for launch. |
| Additional license purchase/use | Deferred | Do not assign for launch. |
| Employer dashboard | Deferred | Post-MVP. |
| Lovable admin UI | Deferred | Supabase dashboard/views first. |
| Deep analytics | Deferred | Post-MVP. |
| Institutional billing | Deferred | Post-MVP. |

## Proposed Next Tasks From Section 5

| Task ID | Task | Status | Notes |
|---|---|---|---|
| TASK-0022 | Create launch-critical feature implementation backlog. | Proposed | Converts Section 5 features into buildable tasks. |
| TASK-0023 | Create feature dependency map. | Proposed | Defines sequencing across auth, verification, schema, wallet, Stripe, dashboard. |
| TASK-0024 | Create deferred feature register. | Proposed | Keeps Show QR, PDF, refresh, extra license, admin UI, analytics out of launch. |
| TASK-0025 | Create launch feature acceptance test outline. | Proposed | Product-level acceptance checks before QA test cases. |

## Not In Scope For Section 5

- Writing code.
- Writing SQL.
- Applying migrations.
- Creating Edge Functions.
- Editing Lovable screens.
- Configuring Stripe products.
- Configuring wallet certificates.

## Section 5 Review Checklist

- [ ] David confirms launch-critical feature set is correct.
- [ ] David confirms deferred feature set is correct.
- [ ] David confirms feature requirements are product-level and not over-specified.
- [ ] David confirms features align with Sections 2, 3, and 4.
- [ ] David confirms feature requirements are ready for task creation.
