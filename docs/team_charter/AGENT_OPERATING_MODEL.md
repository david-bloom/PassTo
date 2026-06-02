# PassTo Agent Operating Model

**Status:** Approved Shared Workflow  
**Owner:** David  
**Created:** 2026-06-02  
**Applies To:** Codex, Claude, Lovable handoffs, and delegated side-agent work  

---

## Purpose

This document defines how PassTo uses a main conductor plus focused side agents to move faster without losing source-of-truth discipline, approval boundaries, or QA integrity.

GitHub remains the source of truth. Chat memory is not durable project state unless it has been written into GitHub.

---

## Default Pattern

For active work blocks with meaningful parallelizable work, use:

```text
Main Conductor
  + Source / Live-State Agent
  + QA Agent or UX / Prompt Agent
```

The main conductor owns the final decision. Side agents provide evidence and proposed findings.

---

## Main Conductor

The main conductor owns:

- Reading current GitHub source-of-truth docs first.
- Confirming approval state before execution.
- Creating or updating the handoff packet.
- Assigning narrow, non-overlapping scopes to side agents.
- Integrating side-agent findings.
- Resolving conflicts between findings.
- Publishing final task, activity log, issue, or QA updates to GitHub.
- Keeping David approval boundaries explicit.

The conductor must not delegate the immediate critical-path decision if the next step depends on it right away.

---

## Source / Live-State Agent

Use this side agent for backend, source, schema, live deployment, or implementation evidence.

Typical scope:

- Supabase schema and migration impact.
- Edge Function source and deployed version checks.
- RLS/grants review.
- Stripe implementation surface.
- GitHub task/source review.
- File/function impact map.

The Source / Live-State Agent must not:

- Apply migrations.
- Deploy functions.
- Change secrets.
- Publish GitHub updates.
- Close tasks.
- Mark QA passed.
- Approve production use.

---

## QA Agent

Use this side agent when Claude says a task is ready for QA, when remediation needs re-QA, or when Codex wants an independent skeptical pass before publishing findings.

The QA Agent is a reviewer, not the final decision-maker.

The QA Agent should:

- Read task acceptance criteria.
- Read implementation or remediation notes.
- Review assigned source/live evidence.
- Identify P1/P2/P3 findings.
- Separate blockers from deferrals and test gaps.
- Draft a proposed verdict.

The QA Agent must not:

- Publish GitHub updates.
- Close tasks or issues.
- Mark QA passed as final.
- Approve production use.
- Apply migrations, deploy functions, change secrets, or alter live state.

---

## UX / Prompt Agent

Use this side agent for Lovable prompts, frontend route behavior, user-facing copy, or design-system risks.

The UX / Prompt Agent should:

- Preserve PassTo design and route conventions.
- Keep Lovable frontend-only.
- Reference backend contracts from GitHub docs.
- Identify forbidden client writes.
- Draft route/page states, copy, and QA cases.

The UX / Prompt Agent must not invent backend contracts or imply deployment approval.

---

## When To Use This Model

Use it for:

- Tasks with independent backend and UX surfaces.
- QA where source review and live-state checks can run in parallel.
- Stripe/payment work with both provider and Supabase entitlement concerns.
- Wallet/credential work with backend, signing, UX, and QA surfaces.

Do not use it for:

- Simple one-file edits.
- One-step approvals.
- Work where agents would edit the same files.
- Production-impacting actions before David approval is recorded.

---

## Current Recommended Splits

### TASK-0048 — ID.me-First License Lookup Re-Instrumentation

- Main Conductor: approval state, task source, final Claude handoff.
- Source / Live-State Agent: Migration J, lookup functions, RapidAPI `/verify` and `/search`, direct route gates.
- UX / Prompt Agent: Lovable route sequence, `/license-checking`, `/confirm-info`, candidate display, route-gate QA.
- QA Agent after execution: verify approval/application, deployed functions, direct route gates, provider failure handling, and Lovable behavior.

Approval boundary: not approved for execution until David approves Migration J, new/deployed functions, and flow-doc updates.

### TASK-0040 — Stripe Subscription State and Entitlement Gating

- Main Conductor: approval boundary, GitHub status, final QA/publishing.
- Source / Live-State Agent: Stripe checkout/webhook/subscription implementation and Supabase persistence.
- QA Agent: test-mode checkout, duplicate webhook, failed payment, cancellation/lapse, entitlement readers.

Approval boundary: approved for test-mode MVP execution only. No live-mode cutover, live pricing/product changes, production launch, credential/wallet launch, or undocumented production-impacting config.

### Phase 4 — Credential and Wallet Issuance

- Main Conductor: phase sequencing and entry criteria.
- Source / Live-State Agent: credential creation and wallet provider-state backend impact.
- UX / Prompt Agent: wallet signing contract, `/success` truthfulness, failure states.
- QA Agent after execution: credential gate refusal, provider state persistence, `/success` status, RLS/direct-write boundaries.

Approval boundary: draft only. David approval required before implementation, migrations, deployments, wallet provider config, certificate/private-key handling, credential/wallet launch, or production posture change.

---

## Anti-Patterns

- Asking both side agents to review the whole task.
- Treating a side-agent finding as final without conductor review.
- Letting QA Agent publish or mark QA passed.
- Treating QA pass as launch approval.
- Treating task creation as execution approval.
- Relying on chat-only memory.
- Giving agents overlapping write scopes.
- Skipping the handoff packet when another agent must continue work.

