# PRD Section 7 Master Task List

**PRD Section:** Section 7 - Launch Readiness, QA, and Open Decisions  
**Status:** Draft for David Review  
**Created:** 2026-05-26  
**Owner:** David Bloom  
**Execution Support:** Codex and Claude  

## Purpose

This task list converts Section 7 into launch readiness, QA, security, and decision-control work blocks.

## Launch Readiness Work Blocks

| Work Block | Status | Notes |
|---|---|---|
| PRD section approvals | Pending David review | Sections 2-7 draft unless approved. |
| v4 migration SQL draft | Pending TASK-0011 | Claude task. |
| Codex QA of v4 migration SQL | Pending | After TASK-0011. |
| David migration approval | Pending | Required before applying migration. |
| RLS/security tests | Pending | Required before launch. |
| Integration readiness checklist | Pending | ID.me, Twilio, RapidAPI/Propelus, Stripe, wallet, Postmark. |
| Apple/Google wallet issuance bring-up | Approved - ready for provider configuration and live wallet QA | TASK-0072. Required before real first-nurse wallet credential issuance. |
| Dev test personas and seed harness | David approved - executing | TASK-0044. Required for repeatable smoke testing and David hands-on review. |
| Launch smoke test | Pending | End-to-end first nurse flow. |
| Ops readiness | Pending | Supabase views/logs/alerts. |

## QA Work Blocks

| Work Block | Status |
|---|---|
| Account/auth QA | Pending |
| Identity verification QA | Pending |
| Phone verification QA | Pending |
| License lookup QA | Pending |
| Data match QA | Pending |
| Selfie upload QA | Pending |
| Credential/wallet QA | Pending |
| Dashboard QA | Pending |
| Share-link/verifier QA | Pending |
| Stripe/subscription QA | Pending |
| Account-status enforcement QA | Pending |
| Dev seeded-persona QA | Pending TASK-0044 execution |
| RLS boundary QA | Pending |
| Failure-state QA | Pending |

## Approved Numbering Note - 2026-05-29

Earlier Section 7 proposed task IDs (`TASK-0030` through `TASK-0034`) now collide with the corrected PRD Section 3 sequence (`TASK-0031` through `TASK-0043`) and must not be used for new work.

New Section 7 task files must use the next available confirmed task number. The dev test persona task is `TASK-0044`.

## Proposed / Drafted Tasks From Section 7

| Task ID | Task | Status | Notes |
|---|---|---|---|
| TASK-0044 | Create Dev Test Personas and Seed Harness. | David Approved - Executing | Dev-only seeded accounts for login, pass generation/display, share, verifier, refresh/status behavior, entitlement QA, suspended/closed account validation, and repeatable launch smoke testing. |
| TASK-0067 | Create MVP launch readiness checklist. | Spec Drafted - Awaiting David Approval | Consolidates PRD Section 7.2 and 7.3 gates into a launch approval checklist with owner, evidence, approval state, and next action. |
| TASK-0068 | Create MVP QA test plan. | Spec Drafted - Awaiting David Approval | Product + security QA matrix covering PRD Section 7.4 and 7.5. |
| TASK-0069 | Create production configuration checklist. | Spec Drafted - Awaiting David Approval | Env vars, redirects, webhooks, domains, provider modes, wallet signing, and seed-tool production guards. |
| TASK-0070 | Create launch smoke-test script. | Spec Drafted - Awaiting David Approval | Repeatable dev dry run and production-launch smoke-test script for the end-to-end first nurse flow. |
| TASK-0071 | Create open decision register cleanup. | Spec Drafted - Awaiting David Approval | Routes unresolved launch decisions and reconciles decision/approval source-of-truth docs without closing decisions prematurely. |
| TASK-0072 | Configure and Verify Apple and Google Wallet Pass Issuance. | Approved - Ready for Provider Configuration and Live Wallet QA | Closes the TASK-0050 real-provider deferral: Apple certs, Google issuer, Vercel env, Supabase secrets, deployment, and end-to-end wallet issuance verification. |

## Section 7 Review Checklist

- [ ] David confirms launch readiness definition is correct.
- [ ] David confirms pre-launch gates are correct.
- [ ] David confirms QA scope is correct.
- [ ] David confirms security review scope is correct.
- [ ] David confirms production configuration scope is correct.
- [ ] David confirms launch smoke test is correct.
- [ ] David confirms open decision control is sufficient.
- [ ] TASK-0044 dev test personas and seed harness execution/QA is complete.
