# PRD Section 4 Master Task List

**PRD Section:** Section 4 — Data Model, RLS, and Backend Responsibilities  
**Status:** Draft for David Review  
**Created:** 2026-05-26  
**Owner:** David Bloom  
**Execution Support:** Codex and Claude  

## Purpose

This task list translates PRD Section 4 into execution controls for schema, RLS, storage, Edge Functions, and backend ownership.

It explicitly does not authorize migration execution.

## Completed Decisions

| Decision | Status | Notes |
|---|---|---|
| Supabase is system of record. | Done | Confirmed in Section 1. |
| Current connected Supabase project ref is `wvzjfxacykgsaffskgtr`. | Done | Confirmed by David/Lovable setup. |
| Canonical table name is `credentials`, not `passes`. | Done | TASK-0007 OD-6. |
| Canonical table name is `subscriptions`, not `stripe_subscriptions`. | Done | TASK-0007 OD-7. |
| Canonical table name is `payments`, not `purchases`. | Done | TASK-0007 OD-8. |
| Canonical table name is `notification_events`, not `communication_events`. | Done | TASK-0007 OD-9. |
| Add `stripe_events` for webhook idempotency. | Done | TASK-0007 OD-10. |
| Add `license_status_mappings` as DB reference table. | Done | TASK-0007 OD-12. |
| Selfies stored in protected Supabase Storage. | Done | Section 2 decision. |
| Lovable uses publishable key + user JWT only. | Done | Service role stays backend-only. |

## Open / Pending Execution Items

| Item | Status | Blocks |
|---|---|---|
| Draft v4 migration SQL. | Pending TASK-0011 | Schema creation |
| Review v4 migration SQL. | Pending after TASK-0011 | David migration approval |
| Create RLS test plan. | Pending TASK-0011 | Migration approval |
| Create Supabase Storage policy for selfies. | Pending implementation task | Selfie launch flow |
| Define exact Edge Function names/contracts. | Pending implementation task | Lovable integration |
| Define Vercel wallet signing contract. | Pending implementation task | Wallet issuance |

## Launch-Critical Backend Work Blocks

| Work Block | Status | Likely Owner |
|---|---|---|
| Supabase schema migration v4 draft | Pending | Claude |
| Codex QA of v4 migration SQL | Pending | Codex |
| David migration approval | Pending | David |
| RLS policy implementation and tests | Pending | Claude/Codex |
| Selfie Storage bucket/policies | Pending | Claude/Codex |
| ID.me Edge Function | Pending | Claude/Codex |
| Twilio Edge Functions | Pending | Claude/Codex |
| License lookup Edge Function | Pending | Claude/Codex |
| Data match Edge Function | Pending | Claude/Codex |
| Credential issue Edge Function | Pending | Claude/Codex |
| Wallet signing Vercel route or approved backend route | Pending | Claude/Codex |
| Share token creation/validation functions | Pending | Claude/Codex |
| Stripe checkout/webhook functions | Pending | Claude/Codex |
| Audit/event writes | Pending | Claude/Codex |

## Proposed Next Tasks From Section 4

| Task ID | Task | Status | Notes |
|---|---|---|---|
| TASK-0011 | Draft v4 Supabase Migration SQL from TASK-0007 decisions. | Next / not yet created | Must not apply migration. |
| TASK-0018 | Codex QA review of v4 migration SQL and RLS test plan. | Proposed | Runs after TASK-0011. |
| TASK-0019 | Create Supabase Storage plan for selfie assets. | Proposed | Protected bucket, policies, access pattern. |
| TASK-0020 | Define launch-critical Edge Function contracts. | Proposed | Function inputs/outputs, service-role behavior, Lovable invocation pattern. |
| TASK-0021 | Define wallet signing integration contract. | Proposed | Vercel/Supabase boundary and state writes. |

## Not In Scope For Section 4

- Applying migration SQL.
- Writing Edge Function code.
- Writing Vercel signing code.
- Lovable UI changes.
- Stripe live configuration.
- Wallet certificate setup.

## Section 4 Review Checklist

- [ ] David confirms Supabase source-of-truth model is correct.
- [ ] David confirms canonical MVP table concepts are correct.
- [ ] David confirms RLS principles are correct.
- [ ] David confirms frontend/direct access boundaries are correct.
- [ ] David confirms service-role-only operation list is correct.
- [ ] David confirms Supabase Edge Function and Vercel boundaries are correct.
- [ ] David confirms migration approval boundary is clear.
