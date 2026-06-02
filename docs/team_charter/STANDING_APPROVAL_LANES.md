# PassTo Standing Approval Lanes

**Status:** Approved Shared Workflow  
**Owner:** David  
**Created:** 2026-06-02  
**Approval Source:** David approval in chat: "all suggestions approved"  
**Applies To:** Codex, Claude, Lovable handoffs, side agents, and QA agents  

---

## Purpose

This document reduces David bottlenecks by defining which recurring work is pre-approved, which work may be batch-approved, and which work remains a hard David approval gate.

This document does not approve any individual task execution beyond the standing lanes below.

---

## Lane 1 — Standing Approvals

The following work is approved without a separate David review, as long as it stays within the documented scope and does not trigger a hard gate:

- Reading and syncing GitHub docs.
- Creating draft task specs.
- Creating handoff packets.
- Writing Lovable prompts.
- Updating the activity log with non-execution status.
- Running read-only GitHub checks.
- Running read-only Supabase checks.
- Spawning read-only side agents.
- Drafting implementation plans, QA plans, remediation instructions, and review checklists.
- Publishing documentation-only workflow updates that record already-approved operating rules.

Standing approvals do not authorize code implementation, migrations, deployments, secret changes, provider configuration, QA pass decisions, task closure, Done decisions, risk acceptance, or production launch.

---

## Lane 2 — Batch Approvals

David may approve a bounded work package instead of approving every micro-step.

Recommended format:

```text
Decision:
Scope:
Approved:
Not approved:
Applies to:
Expires / review trigger:
```

Example:

```text
Decision: TASK-0048 approved for implementation prep.
Approved: source edits, docs updates, draft Migration J, draft Edge Functions.
Not approved: applying Migration J, deploying functions, production launch.
Applies to: TASK-0048 only.
Review trigger: before migration application or deployment.
```

Agents must record batch approvals in GitHub before downstream work depends on them.

---

## Lane 3 — Hard Gates

David approval is still required before:

- Applying migrations.
- Deploying live Edge Functions.
- Changing Supabase secrets.
- Changing RLS policies or live privilege grants.
- Changing Stripe live-mode configuration.
- Creating or changing live Stripe products/prices.
- Handling wallet certificates, private keys, or provider production configuration.
- Launching credential issuance.
- Launching wallet issuance.
- Production launch.
- Risk acceptance.
- Marking a task Done.
- Closing a task or issue as complete.
- Moving deferred features into launch-critical scope.

If classification is unclear, treat it as a hard gate.

---

## Agent Operating Rules

- The main conductor owns final approval-boundary interpretation.
- Side agents and QA agents may propose findings but may not approve, close, mark passed, or publish final decisions.
- Any David approval from chat must be recorded in GitHub before downstream agents rely on it.
- A QA pass does not approve production launch.
- A task spec does not approve execution unless the task explicitly records execution approval.

---

## Relationship to Existing Workflow

This document complements:

```text
docs/team_charter/TASK_WORKFLOW.md
docs/team_charter/AI_COLLABORATION_RULES.md
docs/team_charter/AGENT_OPERATING_MODEL.md
docs/team_charter/HANDOFF_PACKET_TEMPLATE.md
docs/team_charter/PASSTO_SKILLS_GUIDE.md
```

