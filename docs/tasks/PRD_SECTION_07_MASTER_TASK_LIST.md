# PRD Section 7 Master Task List

**PRD Section:** Section 7 — Launch Readiness, QA, and Open Decisions  
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
| RLS boundary QA | Pending |
| Failure-state QA | Pending |

## Proposed Next Tasks From Section 7

| Task ID | Task | Status | Notes |
|---|---|---|---|
| TASK-0030 | Create MVP launch readiness checklist. | Proposed | Consolidates gates. |
| TASK-0031 | Create MVP QA test plan. | Proposed | Product + security QA. |
| TASK-0032 | Create production configuration checklist. | Proposed | Env vars, redirects, webhooks, domains. |
| TASK-0033 | Create launch smoke-test script. | Proposed | End-to-end test flow. |
| TASK-0034 | Create open decision register cleanup. | Proposed | Close/route remaining decisions. |

## Section 7 Review Checklist

- [ ] David confirms launch readiness definition is correct.
- [ ] David confirms pre-launch gates are correct.
- [ ] David confirms QA scope is correct.
- [ ] David confirms security review scope is correct.
- [ ] David confirms production configuration scope is correct.
- [ ] David confirms launch smoke test is correct.
- [ ] David confirms open decision control is sufficient.
