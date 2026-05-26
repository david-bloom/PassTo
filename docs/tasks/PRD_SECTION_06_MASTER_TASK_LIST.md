# PRD Section 6 Master Task List

**PRD Section:** Section 6 — Integrations, Failure States, and Admin/Ops  
**Status:** Draft for David Review  
**Created:** 2026-05-26  
**Owner:** David Bloom  
**Execution Support:** Codex and Claude  

## Purpose

This task list converts Section 6 into integration, failure handling, and ops work controls.

## Launch-Critical Integration Work Blocks

| Work Block | Status | Notes |
|---|---|---|
| Supabase Auth integration | Pending implementation task | Auth backend. |
| Supabase DB/RLS integration | Pending migration approval | System of record. |
| Supabase Storage for selfies | Pending implementation task | Protected bucket/policies. |
| ID.me integration | Pending implementation task | Backend token exchange/result handling. |
| Twilio integration | Pending implementation task | Phone verification; launch-critical. |
| RapidAPI / Propelus integration | Pending implementation task | License lookup. |
| Stripe integration | Pending implementation task | Checkout/webhooks/idempotency. |
| Wallet integration | Pending implementation task | Vercel likely for signing. |
| Postmark ops alerts | Pending implementation task | Minimal critical alerts. |

## Failure Handling Work Blocks

| Work Block | Status | Notes |
|---|---|---|
| ID.me failure states | Pending implementation task | IAL1, fail, unexpected response. |
| Twilio failure states | Pending implementation task | Launch fallback requires David approval if needed. |
| License lookup failure states | Pending implementation task | No result, provider unavailable. |
| Data match failure state | Pending implementation task | Block issuance, support intervention. |
| Selfie upload failure state | Pending implementation task | Retry/support. |
| Credential/wallet failure states | Pending implementation task | Ops alert/recovery path. |
| Stripe failure/idempotency states | Pending implementation task | `stripe_events`. |
| Notification failure states | Pending implementation task | Log and alert critical failures. |

## Proposed Next Tasks From Section 6

| Task ID | Task | Status | Notes |
|---|---|---|---|
| TASK-0026 | Create integration readiness checklist. | Proposed | Provider credentials, env vars, webhooks, domains. |
| TASK-0027 | Create failure-state implementation matrix. | Proposed | Maps each failure to UI, backend, event, alert. |
| TASK-0028 | Create MVP ops dashboard/view requirements. | Proposed | Supabase dashboard/views first. |
| TASK-0029 | Create critical ops alerting plan. | Proposed | Postmark-first minimal alerts. |

## Deferred Integration Work Blocks

| Work Block | Status |
|---|---|
| PDFMonkey/PDF generation | Deferred |
| Show QR token flow | Deferred |
| Scheduled refresh automation | Deferred |
| Employer/institution systems | Deferred |
| Deep analytics | Deferred |

## Section 6 Review Checklist

- [ ] David confirms launch-critical integrations are correct.
- [ ] David confirms deferred integrations are correct.
- [ ] David confirms secret-handling rules are correct.
- [ ] David confirms failure-state behavior is correct.
- [ ] David confirms admin/ops requirements are sufficient.
- [ ] David confirms ops alerting approach is sufficient.
