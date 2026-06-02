# PassTo Skills Guide

**Status:** Approved Shared Workflow  
**Owner:** David  
**Created:** 2026-06-02  
**Applies To:** Codex, Claude, and future PassTo agents  

---

## Purpose

This guide defines the PassTo skill equivalents that agents should use when working on GitHub docs, Supabase, Stripe, Lovable, QA, or handoffs.

Codex may have local skills installed, but GitHub is the shared source of truth for Claude and all agents. When local skills are unavailable, follow this guide directly.

---

## Skill Equivalent: PassTo GitHub

Use for:

- GitHub docs and task state.
- Issue comments.
- Activity logs.
- Approval records.
- QA notes.
- Handoff packets.
- Publishing source-of-truth updates.

Rules:

- GitHub docs are source of truth.
- Do not rely on chat memory unless recorded in GitHub.
- Read relevant task/flow/PRD docs before executing.
- Preserve task status and approval boundaries.
- Do not overwrite an existing task number without reading the remote file first.
- Update task docs, activity log, and issue comments together when appropriate.

Related docs:

```text
docs/team_charter/AGENT_OPERATING_MODEL.md
docs/team_charter/HANDOFF_PACKET_TEMPLATE.md
docs/team_charter/TASK_WORKFLOW.md
docs/team_charter/AI_COLLABORATION_RULES.md
```

---

## Skill Equivalent: PassTo Supabase

Use for:

- Schema.
- Migrations.
- RLS/grants.
- Edge Functions.
- Storage.
- Logs.
- Live QA.

Rules:

- Project ref: `wvzjfxacykgsaffskgtr`.
- Live Supabase state is the authority for deployed functions, migrations, grants, logs, and live configuration.
- Never apply migrations, deploy functions, change secrets, alter RLS, or modify live data without documented David approval.
- Compare live state to GitHub task claims.
- Record findings in task docs and activity log.

Standard checks:

- List migrations.
- List Edge Functions and versions.
- Read deployed function source.
- Check grants/RLS for trust-boundary functions/tables.
- Check logs for recent errors.

---

## Skill Equivalent: PassTo Stripe

Use for:

- Stripe checkout.
- Subscriptions.
- Webhooks.
- Payment state.
- Entitlement gates.
- TASK-0040.

Rules:

- Stripe secrets and webhook secrets stay backend-only.
- Paid entitlement activates only from server-confirmed Stripe state.
- Client plan selection, Stripe redirect URLs, and Lovable navigation do not prove payment.
- Webhooks must verify Stripe signatures and be idempotent through `stripe_events`.
- Persist subscription/payment truth in `subscriptions`, `payments`, and `stripe_events`.
- TASK-0040 is approved for test-mode MVP execution only unless David separately approves live-mode changes.

---

## Skill Equivalent: PassTo Lovable

Use for:

- Lovable prompts.
- Frontend route instructions.
- Onboarding UX.
- Client/backend wiring.
- User-facing copy/states.

Rules:

- Lovable is frontend only.
- Lovable may invoke approved backend functions with the user's JWT.
- Lovable must not use service-role keys or call provider APIs directly.
- Lovable must not write trust, payment, credential, wallet, or audit truth directly.
- Backend route/status functions own gates and redirects.
- UI route hiding is not a security boundary.

Forbidden Lovable direct writes include:

```text
profiles.onboarding_step
profiles.phone as verified
profiles.id_verification_status
profiles.id_verification_level
profiles.account_status
profiles.subscription_tier as entitlement
licenses.data_match_passed
credentials
wallet_passes provider truth
subscriptions
payments
stripe_events
audit_events security outcomes
verification_tokens
```

---

## Skill Equivalent: PassTo QA

Use when:

- Claude says a task is ready for QA.
- A remediation needs re-QA.
- A task may pass with deferrals.
- A release/launch dependency needs independent evidence review.

Rules:

- QA Agent proposes findings and verdict; main conductor owns final decision.
- QA Agent must not publish, close, mark passed, approve production, migrate, deploy, or alter live state.
- Findings should be ordered by severity.
- Separate blockers from deferrals and test gaps.
- QA pass does not equal production launch approval.

QA output should include:

1. Proposed verdict.
2. Blocking findings.
3. Non-blocking risks/test gaps.
4. Evidence reviewed.
5. Required remediation or next action.
6. Remaining approval boundaries.

