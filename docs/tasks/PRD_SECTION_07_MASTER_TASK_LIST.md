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
| Dev test personas and seed harness | Spec drafted - awaiting David approval | TASK-0044. Required for repeatable smoke testing and David hands-on review. |
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
| Dev seeded-persona QA | Spec drafted - awaiting David approval |
| RLS boundary QA | Pending |
| Failure-state QA | Pending |

## Approved Numbering Note - 2026-05-29

Earlier Section 7 proposed task IDs (`TASK-0030` through `TASK-0034`) now collide with the corrected PRD Section 3 sequence (`TASK-0031` through `TASK-0043`) and must not be used for new work.

New Section 7 task files must use the next available confirmed task number. The dev test persona task is `TASK-0044`.

## Proposed / Drafted Tasks From Section 7

| Task ID | Task | Status | Notes |
|---|---|---|---|
| TASK-0044 | Create Dev Test Personas and Seed Harness. | Spec Drafted - Awaiting David Approval | Dev-only seeded accounts for login, pass generation/display, share, verifier, refresh/status behavior, entitlement QA, suspended/closed account validation, and repeatable launch smoke testing. |
| TBD | Create MVP launch readiness checklist. | Proposed | Consolidates gates. Must receive a new non-colliding task ID before execution. |
| TBD | Create MVP QA test plan. | Proposed | Product + security QA. Must receive a new non-colliding task ID before execution. |
| TBD | Create production configuration checklist. | Proposed | Env vars, redirects, webhooks, domains. Must receive a new non-colliding task ID before execution. |
| TBD | Create launch smoke-test script. | Proposed | End-to-end test flow. Must receive a new non-colliding task ID before execution. |
| TBD | Create open decision register cleanup. | Proposed | Close/route remaining decisions. Must receive a new non-colliding task ID before execution. |

## Section 7 Review Checklist

- [ ] David confirms launch readiness definition is correct.
- [ ] David confirms pre-launch gates are correct.
- [ ] David confirms QA scope is correct.
- [ ] David confirms security review scope is correct.
- [ ] David confirms production configuration scope is correct.
- [ ] David confirms launch smoke test is correct.
- [ ] David confirms open decision control is sufficient.
- [ ] David approves or revises TASK-0044 dev test personas and seed harness before Claude executes it.
