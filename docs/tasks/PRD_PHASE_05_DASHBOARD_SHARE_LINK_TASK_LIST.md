# PRD Phase 5 Task List — Dashboard and Share-Link Verification

**Phase:** Phase 5 — Dashboard and Share-Link Verification  
**Status:** Execution and QA Evidence Reconciled — Awaiting David Review  
**Created:** 2026-06-02  
**Owner:** David Bloom  
**Execution Support:** Codex and Claude  
**Source:** `/docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md`, PRD Sections 3-6, `/docs/features/SHARING.md`, `/docs/flows/VERIFIER_CREDENTIAL_VIEW.md`

## Purpose

This task list converts Phase 5 of the MVP launch-critical build sequence into approval-ready task records.

Phase 5 begins after Phase 4 credential/wallet status is ready enough for downstream dashboard and verifier work. It creates the nurse dashboard status surface, backend-controlled share-link creation, verifier token validation, the `/v/{token}` verifier flow, and Codex QA for the full share-link/verifier scope.

This document does not authorize implementation, migration execution, deployment, Stripe live-mode changes, Show QR, PDF export, employer dashboard scope, task Done decisions, issue closure, risk acceptance, or production launch.

## Phase 5 Sequence

| Phase Item | Task ID | Task | Owner | Status | Depends On |
|---|---|---|---|---|---|
| 5.1 | TASK-0055 | Implement Nurse Dashboard Launch-Critical Status View | Claude / Lovable | Live UI QA Verified — Awaiting David Review | Phase 4, TASK-0052 |
| 5.2 | TASK-0056 | Implement Share-Link Token Creation Function | Claude | Live E2E Exercised — Awaiting David Review | TASK-0055, TASK-0040 entitlement state |
| 5.3 | TASK-0057 | Implement Verifier Token Validation Function | Claude | Live Verifier Flow Exercised — Awaiting David Review | TASK-0056 |
| 5.4 | TASK-0058 | Implement `/v/{token}` Verifier Flow | Claude / Lovable | Live UI QA Verified — Awaiting David Review | TASK-0057 |
| 5.5 | TASK-0059 | Codex QA Phase 5 Dashboard and Share-Link Verification | Codex | QA Evidence Recorded — Awaiting David Review | TASK-0055 through TASK-0058 |

## Relationship to Earlier Tasks

Earlier high-level tasks described dashboard and verifier slices at a broad Section 3 journey level:

- `TASK-0039` — Implement Nurse Dashboard Launch-Critical Status and Actions
- `TASK-0041` — Implement Share-Link Token Creation Journey
- `TASK-0042` — Implement Verifier Token Validation and Credential View

This Phase 5 task set supersedes those high-level drafts for execution granularity. Do not delete or rewrite the earlier tasks unless David explicitly asks to consolidate historical planning records.

## Phase 5 Entry Criteria

- Phase 4 credential creation and success/status behavior are QA-ready or explicitly accepted for Phase 5 dependency use.
- Credential and wallet state are readable from backend-owned status endpoints.
- Stripe entitlement state is server-confirmed for share-link gating.
- Show QR and PDF export remain deferred.
- Lovable does not directly create verification tokens, validate tokens, write verifier records, or write verification events.

## Phase 5 Exit Criteria

- Nurse dashboard shows launch-critical credential, license, wallet, subscription, and share-link states without exposing deferred features as launch blockers.
- Share-link creation is backend-controlled, entitlement-gated, ownership-checked, one-time, and short-lived.
- Raw share tokens are returned once and never stored.
- Verifier token validation is backend-controlled and returns safe display data only after required form and Terms acceptance.
- `/v/{token}` handles valid, expired, used, revoked, malformed, and unknown tokens safely.
- Verifier and verification event records are written in backend-owned state.
- Codex QA passes the full Phase 5 scope or records blockers/deferrals.


## Status Reconciliation - 2026-06-03 - Codex

Phase 5 execution and QA evidence have been recorded in the individual task files, 'docs/activity_log/ACTIVITY_LOG.md', and 'docs/activity_log/QA_FINDINGS_LOG.md'. The phase inventory now reflects the current state as awaiting David review rather than awaiting initial execution approval.

No Phase 5 task is marked Done by this reconciliation.

## Approval Boundary

David approval is required before Claude executes any Phase 5 task that changes live backend behavior, deploys functions/routes, applies migrations, changes entitlement/payment behavior, changes production posture, marks tasks Done, closes tasks/issues, accepts risk, or moves deferred Show QR/PDF/employer-dashboard features into launch scope.
