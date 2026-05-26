# PRD Section 1 Master Task List

**PRD Section:** Section 1 — Product Summary, Technical Context, and Current Build State
**Status:** Approved by David
**Created:** 2026-05-26
**Owner:** David Bloom
**Execution Support:** Codex and Claude

## Purpose

This task list translates PRD Section 1 into execution controls. It separates completed foundation work from open decisions and future tasks so Codex and Claude can move quickly without duplicating work or treating unresolved decisions as settled.

## Completed Foundation Tasks

| Task | Status | Notes |
|---|---|---|
| Confirm PassTo product definition as a nurse-owned verified digital nursing license credential. | Done | Carried forward from vision/context documents. |
| Confirm travel nurses as the MVP beachhead segment. | Done | Carried forward from personas and strategic context. |
| Confirm verifier as the primary secondary user. | Done | Employer, staffing agency reviewer, facility administrator, or reviewer. |
| Confirm Lovable as frontend layer. | Done | Lovable UI retained. |
| Confirm Supabase as system of record. | Done | Replaces Airtable for MVP architecture. |
| Confirm Supabase Edge Functions as preferred backend orchestration. | Done | Replaces Make as default orchestration layer. |
| Confirm Vercel as targeted backend/API layer only. | Done | Used where Supabase Edge Functions are not the right fit. |
| Complete `TASK-0004` responsibility map. | Done | Platform ownership baseline accepted. |
| Complete `TASK-0006` Supabase Schema and RLS Plan. | Done | Accepted as planning baseline; migration SQL not yet authorized. |
| Complete `TASK-0007` schema/RLS open decision review. | Done | All 12 open decisions resolved; v4 migration SQL authorized for drafting only. |

## Open Decisions

| Decision ID | Decision | Status | Owner | Blocks |
|---|---|---|---|---|
| S1-OD-01 | Resolve `TASK-0006` open decisions `OD-1` through `OD-12`. | Resolved — TASK-0007 complete | Codex | v4 migration SQL drafting authorized |
| S1-OD-02 | Confirm final MVP Standard and Premier subscription pricing. | Resolved — DECISION-0011 and DECISION-0014: Standard $9.99/month, Premier $19.99/month | David | Subscription PRD section, Stripe setup |
| S1-OD-03 | Confirm wallet pass signing owner: Supabase or Vercel. | Open | David + Codex/Claude | Credential issuance tasks |
| S1-OD-04 | Confirm Stripe webhook owner: Supabase or Vercel. | Open | David + Codex/Claude | Payment tasks |
| S1-OD-05 | Confirm PDF generation owner: Supabase or Vercel. | Open | David + Codex/Claude | PDF export tasks |
| S1-OD-06 | Confirm launch fallback if Twilio A2P 10DLC approval is delayed. | Open | David | Launch readiness |

## Master Tasks Created From Section 1

| Task ID | Task | Status | Recommended Owner | Notes |
|---|---|---|---|---|
| TASK-0007 | Resolve `TASK-0006` schema/RLS open decisions before migration SQL. | Done — 2026-05-26 | Codex | Created `/docs/architecture/CODEX_RESPONSE_TASK_0007_SCHEMA_QA.md`; v4 migration SQL authorized for drafting only. |
| TASK-0008 | Convert accepted Section 1 foundation decisions into a canonical decisions log. | Done — David approved 2026-05-26 | Claude | Creates `/docs/decisions/DECISIONS_LOG.md`. FD-001–FD-024 recorded (24 total; log is active and updated each session). |
| TASK-0009 | Audit existing Lovable routes and backend calls against the responsibility map. | Done — David approved 2026-05-26 | Claude | All 3 Lovable projects audited. 5 critical findings. Canonical Supabase confirmed (`wvzjfxacykgsaffskgtr`). |
| TASK-0010 | Define MVP launch-critical vs. deferred foundation capabilities. | Done — David approved 2026-05-26 | Claude | 18 launch-critical, 8 deferred. All 6 open scope items resolved (FD-019–FD-024). See `/docs/prd/MVP_LAUNCH_SCOPE.md`. |

## Not In Scope For Section 1

- Detailed user journeys.
- Detailed Supabase table schemas.
- RLS policy SQL.
- Edge Function implementation specs.
- Lovable screen updates.
- Stripe product configuration.
- Wallet pass implementation.
- PDF template or provider implementation.
- Launch QA plan.

These belong in later PRD sections and their associated task lists.

## Section 1 Review Checklist

- [x] David confirms the product summary is accurate.
- [x] David confirms the MVP user and verifier framing is accurate.
- [x] David confirms the MVP proof point is accurate.
- [x] David confirms completed foundation decisions are correctly marked Done.
- [x] David confirms open decisions are correctly marked Open.
- [x] David confirms the proposed next tasks are correctly sequenced.

## David Approval

Approved — 2026-05-26.
