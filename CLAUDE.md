# CLAUDE.md — PassTo Claude Startup Instructions

This file gives Claude Code the minimum startup instructions for working on PassTo.

GitHub documentation is the source of truth. Chat memory is not source of truth unless written into GitHub.

---

## Required Startup Rule

Before executing work, Claude must read the relevant PassTo GitHub docs.

At minimum, read:

```text
/docs/team_charter/
/docs/tasks/
/docs/activity_log/ACTIVITY_LOG.md
```

For new feature, flow, architecture, security, data, integration, production-impacting, or uncertain work, perform the full read defined in the active charter and amendments.

Always read the design system before frontend, brand, marketing, notification, PDF, verifier-facing, dashboard, or customer-facing work:

```text
/docs/design_system/
```

---

## Active Operating Docs

Claude must follow:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/team_charter/TEAM_CHARTER_V1_4_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_5_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_6_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_7_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_8_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_9_AMENDMENT.md
```

If a charter amendment conflicts with an older charter section, the newer approved amendment controls until consolidation.

---

## Naming Conventions

Claude must follow the canonical naming conventions:

```text
/docs/architecture/NAMING_CONVENTIONS.md
```

Do not invent new table, status, token, event, job, route, or label names when a canonical name exists.

If implementation evidence suggests a better name, document the proposed deviation and wait for Codex/David review where required.

---

## Task Execution Rules

Claude may execute only:

- Approved tasks.
- Approved remediation work.
- Approved Class B work.
- Approved Claude-direct spec-stub work.
- Class C documentation hygiene allowed by the charter.

Claude must not execute unapproved Class A work.

Claude must not apply Supabase migrations, production changes, Stripe live-mode changes, PassKit production changes, environment variable changes, or deployment changes without required approvals.

---

## Pull Request Rules

Claude may create PRs for approved work.

Claude may not merge PRs unless David explicitly delegates merge authority in writing.

Claude may not self-approve PRs.

Claude PRs must include:

- Task ID
- Approved spec or approved remediation request
- Acceptance criteria
- Implementation summary
- Files/routes/components/tables/integrations/assets changed
- Tests run
- Test results
- Deviations
- Risks/issues
- Security/RLS impact
- Design-system impact, if any

For PRs ready for Codex QA, apply:

```text
assigned: codex
needs: codex-review
status: ready-for-codex-qa
```

---

## GitHub Label Routing

Use labels as routing signals:

```text
assigned: codex
assigned: claude
assigned: david
needs: codex-review
needs: claude-response
needs: david-approval
status: blocked
status: ready-for-review
status: ready-for-codex-qa
status: ready-for-david-review
```

Labels do not replace task files, issue/PR comments, or activity logs.

---

## C Handshake

If David types `C` or `c` alone in Claude, Claude must:

1. Re-scan GitHub.
2. Look for repo-visible Codex feedback or items assigned to Claude.
3. Read the relevant issue, PR, task, and review files.
4. Act on every item allowed by the charter.
5. Update the same GitHub issue, PR, or task file.
6. Commit/push if needed.
7. Report status.

`C` never means continue from memory.

`C` does not authorize new Class A work, merge, deployment, migration, risk acceptance, or Done decisions.

---

## Current High-Priority Context

Claude Task 001 is in remediation after Codex QA.

Before working on that task, read:

```text
/docs/tasks/2026-05-24-claude-task-001-supabase-schema-implementation.md
/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
GitHub Issue #1
```

Do not apply any migration to Supabase until Codex QA and David approval are complete.

---

## Guardrail

When uncertain, pause and ask through GitHub.

Do not silently work around architecture, security, data, integration, payment, production, or design-system concerns.
