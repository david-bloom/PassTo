# PRD Section 2 Master Task List

**PRD Section:** Section 2 — Users, MVP Goals, and Scope Boundaries  
**Status:** Draft for David Review  
**Created:** 2026-05-26  
**Owner:** David Bloom  
**Execution Support:** Codex and Claude  

## Purpose

This task list translates PRD Section 2 into execution controls. It separates launch-critical work from deferred work so Claude and Codex do not accidentally assign post-MVP capabilities as launch blockers.

## Completed Decisions

| Decision | Status | Notes |
|---|---|---|
| Primary MVP user is nurse credential holder, with travel nurses as beachhead. | Done | From PRD Section 1 and prior persona docs. |
| Primary secondary user is verifier/employer/reviewer. | Done | Lightweight verifier flow only. |
| Institutional buyer/employer account is post-MVP. | Done | Do not include in MVP task specs. |
| Show QR is deferred. | Done | Not launch-critical. |
| PDF export is deferred. | Done | Not launch-critical. |
| Wallet pass issuance is launch-critical. | Done | Core product promise. |
| Twilio phone verification is launch-critical. | Done | Required trust gate. |
| Selfie storage is Supabase Storage. | Done | PassTo owns selfie asset, not ID.me. |
| Subscription lapse downgrades account to Free behavior. | Done | Credentials retained; paid-tier actions blocked. |
| `passtodigital.com` routes to P1. | Done | Confirmed by David. |

## Launch-Critical Work Blocks

| Work Block | Status | Likely Owner |
|---|---|---|
| Account creation and Supabase Auth | Pending implementation task | Claude/Codex |
| ID.me identity verification | Pending implementation task | Claude/Codex |
| Twilio phone verification | Pending implementation task | Claude/Codex |
| License lookup | Pending implementation task | Claude/Codex |
| Data matching | Pending implementation task | Claude/Codex |
| Selfie capture and Supabase Storage | Pending implementation task | Claude/Codex |
| Credential record creation | Pending implementation task | Claude/Codex |
| Wallet pass issuance | Pending implementation task | Claude/Codex |
| Nurse dashboard | Pending implementation task | Claude/Codex |
| Share-link verifier access | Pending implementation task | Claude/Codex |
| Stripe subscriptions and entitlement gating | Pending implementation task | Claude/Codex |
| Audit/events/RLS/security baseline | Pending implementation task | Claude/Codex |
| Supabase dashboard/views for ops visibility | Pending implementation task | Claude/Codex |

## Deferred Work Blocks

| Work Block | Status | Notes |
|---|---|---|
| Show QR | Deferred | Do not assign for launch unless David reopens. |
| PDF export | Deferred | Do not assign for launch unless David reopens. |
| Scheduled automated refresh | Deferred | Manual or simpler launch behavior first. |
| Additional license flow | Deferred | Single-license launch acceptable. |
| Lovable admin UI | Deferred | Supabase dashboard/views first. |
| Employer dashboards | Deferred | Post-MVP. |
| Institutional billing | Deferred | Post-MVP. |
| Deep analytics | Deferred | Post-MVP. |

## Proposed Next Tasks From Section 2

| Task ID | Task | Status | Notes |
|---|---|---|---|
| TASK-0011 | Draft v4 Supabase Migration SQL from TASK-0007 decisions. | Next / not yet created | Must not apply migration. |
| TASK-0012 | Create launch-critical implementation sequence from PRD Section 2. | Proposed | Turns work blocks into ordered build tasks. |
| TASK-0013 | Create deferred-scope register for post-MVP capabilities. | Proposed | Prevents deferred items from reappearing as launch blockers. |

## Not In Scope For Section 2

- Detailed user journeys.
- Detailed route specs.
- Migration SQL.
- Edge Function implementation.
- Lovable screen changes.
- Stripe configuration.
- Wallet signing implementation.

These belong in later PRD sections and implementation tasks.

## Section 2 Review Checklist

- [ ] David confirms MVP users are correct.
- [ ] David confirms MVP goals are correct.
- [ ] David confirms launch-critical capabilities are correct.
- [ ] David confirms deferred capabilities are correct.
- [ ] David confirms subscription lapse behavior is correct.
- [ ] David confirms confirmed scope decisions are accurately recorded.
