# PRD Phase 4 Task List — Credential and Wallet Issuance

**Phase:** Phase 4 — Credential and Wallet Issuance  
**Status:** Created — Current task records reflected  
**Created:** 2026-06-02  
**Owner:** David Bloom  
**Execution Support:** Codex and Claude  
**Source:** `/docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md`, PRD Sections 3-6, `/docs/features/PASS_MANAGEMENT.md`

## Purpose

This task list converts Phase 4 of the MVP launch-critical build sequence into task records and keeps the Phase 4 inventory aligned with the individual task files.

Phase 4 begins only after the required trust gates are complete or explicitly approved as satisfied for the current MVP flow. It creates the credential, issues wallet passes, records provider state, exposes the final enrollment success/status surface, and sends the result to Codex QA.

This document does not authorize implementation, migration execution, wallet certificate setup, live wallet provider configuration, task Done decisions, issue closure, risk acceptance, or production launch.

## Phase 4 Sequence

| Phase Item | Task ID | Task | Owner | Status | Depends On |
|---|---|---|---|---|---|
| 4.1 | TASK-0049 | Implement Credential Creation Gate | Claude | Ready for Codex Re-QA — P2 remediated | Phase 3 trust gates, TASK-0040 payment entitlement state, selfie decision |
| 4.2 | TASK-0050 | Define Wallet Signing and Issuance Contract | Claude | Codex QA Complete — Ready for David Review | TASK-0049, wallet provider/certificate readiness |
| 4.3 | TASK-0051 | Persist Wallet Provider State to Supabase | Claude | Codex QA Complete — Ready for David Review | TASK-0050 |
| 4.4 | TASK-0052 | Implement Success / PassReady Credential Status Flow | Claude / Lovable | Codex QA Complete — Ready for David Review | TASK-0049, TASK-0051 |
| 4.5 | TASK-0053 | Codex QA Phase 4 Credential and Wallet Issuance | Codex | Codex QA Complete — Ready for David Review, with TASK-0049 re-QA status to reconcile | TASK-0049 through TASK-0052 |
| 4.6 | TASK-0072 | Configure and Verify Apple and Google Wallet Pass Issuance | Claude / Codex / David | Approved - Ready for Provider Configuration and Live Wallet QA | TASK-0049 through TASK-0053, wallet provider/certificate readiness |

## Relationship to Earlier Tasks

Earlier high-level tasks `TASK-0037` and `TASK-0038` described credential creation and wallet issuance at a broad Section 3 journey level. This Phase 4 task set supersedes those high-level slices for execution granularity.

Do not delete or rewrite `TASK-0037` / `TASK-0038`; keep them as historical planning context unless David explicitly asks to consolidate.

`TASK-0048` is already assigned to re-instrumenting the ID.me-first license lookup flow and is not part of Phase 4.

## Phase 4 Entry Criteria

- ID.me identity gate is live and QA-approved.
- License lookup and ID.me/license binding are live and QA-approved.
- Phone verification gate is live and QA-approved.
- Plan/payment path is approved and paid entitlement state comes from server-confirmed Stripe state.
- Selfie required/optional decision is documented.
- If selfie is required, selfie capture/storage gate is implemented and QA-approved.
- Direct route navigation cannot skip trust/payment gates.

## Phase 4 Exit Criteria

- Credential creation is backend-controlled and refuses missing or failed gates.
- Wallet issuance contract is documented and approved.
- Wallet pass provider results are persisted in `wallet_passes`.
- `/success` or PassReady equivalent shows credential/wallet status without pretending issuance succeeded when it has not.
- Credential/wallet failure states are visible to the nurse and inspectable by ops.
- Real Apple and Google wallet issuance is configured, deployed, and verified through TASK-0072 before production launch.
- Codex QA passes the full Phase 4 scope.

## Approval Boundary

David approval is required before Claude executes any Phase 4 task that changes live backend behavior, applies migrations, deploys functions/routes, configures wallet providers, touches certificates/private keys, marks tasks Done, closes tasks/issues, accepts risk, launches credential or wallet issuance, or changes production launch posture.

## Current Reconciliation Note

The Phase 4 tasks have been created as `TASK-0049` through `TASK-0053`.

The individual task files and activity log currently need one source-of-truth reconciliation before Phase 4 can be routed cleanly for David Done review:

- `TASK-0049` records P2 remediation complete and requests Codex re-QA.
- `TASK-0053` status says Codex QA Complete — Ready for David Review, but its task table still lists `TASK-0049` as Ready for Codex Re-QA.
- The activity log closeout also lists `TASK-0049` re-QA as the next required action before Phase 4 QA closure.

No Done decision, production launch, credential launch, wallet launch, provider setup, deployment, migration, or risk acceptance is granted by this inventory update.

## Wallet Provider Bring-Up Gap - 2026-06-05

David identified that real Apple and Google wallet pass issuance has not yet been fully rigged up.

`TASK-0050` created the wallet signing contract and source scaffolding, but real provider issuance was explicitly deferred pending Apple certificates, Google Wallet issuer/service-account setup, Vercel environment configuration, Supabase `wallet-issue` secrets, deployment, and end-to-end verification.

David approved `TASK-0072` on 2026-06-05. The task now tracks approved launch-critical provider bring-up and verification work; production launch approval remains separate.

Codex QA on 2026-06-15 blocked TASK-0072 on four P1 findings: `wallet-issue` type/runtime safety, missing durable end-to-end evidence for the documented test credential, duplicated Google Wallet class issuer prefix, and failure to reject `do_not_issue` pass treatment. See `docs/tasks/TASK-0072.md` for the remediation and re-QA gate.

Codex re-QA later on 2026-06-15 cleared the type-check, orchestration/persistence, and fail-closed findings. Final QA remains blocked because the persisted Google JWT predates the corrected Vercel deployment and still contains the duplicated issuer prefix, and because the deployed `/success` frontend integration has not been exercised through `success-status`.

Fresh post-deployment Google evidence subsequently cleared the class-ID gate. Final visual re-QA remains blocked because the authenticated backend-complete test nurse is redirected from both `/post-login` and `/success` to `/id-verification`, so the issued Apple and Google wallet actions never render.
