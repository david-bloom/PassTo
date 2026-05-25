# PassTo Definition of Done

**Status:** Approved Baseline  
**Owner:** David  
**Last Updated:** 2026-05-25  
**Canonical Folder:** `/docs/team_charter/`  

---

## Purpose

This document defines what it means for PassTo work to be Done.

It is a companion to:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/team_charter/TASK_WORKFLOW.md
/docs/team_charter/AI_COLLABORATION_RULES.md
```

David is the final authority on whether a task is Done.

---

## Core Definition of Done

A task is Done only when all of the following are true:

1. Every acceptance criterion is completed or explicitly marked `Do Not Do` with David approval.
2. The implementation matches the approved technical scope.
3. Any deviation from the task spec is documented.
4. Routes, components, database changes, integrations, and design-system impacts are documented.
5. Security/RLS impact has been reviewed by Codex.
6. Design-system impact has been reviewed where applicable.
7. QA is complete and clean.
8. Known risks/issues are documented and accepted by David.
9. Claude has written the implementation summary when Claude executed the work.
10. Codex has completed QA / architectural review or retrospective review where explicitly permitted.
11. David has confirmed the task meets the Definition of Done.

---

## Confirmation Sequence

The normal close sequence is:

```text
Claude confirms implementation complete.
Codex confirms QA / architecture review complete.
David confirms Done.
```

David alone closes the task.

---

## Required Evidence Before Done

A task should not be marked Done unless the relevant task file, PR, issue, or closeout includes:

```text
Task ID
Approved scope
Acceptance criteria result
Implementation summary
Files changed
Routes/components/tables/integrations/assets changed
Tests run
Test results
Known deviations
Known risks/issues
Codex QA result
David Done decision
```

---

## QA Requirements

Codex QA must review:

- Scope compliance
- Architecture alignment
- Security/RLS impact
- Data model impact
- Integration impact
- Design-system impact, if relevant
- Acceptance criteria completion
- Test sufficiency
- Documentation completeness
- MVP simplicity and maintainability

If QA finds blockers, the task is not Done.

Use status:

```text
Needs Claude Remediation
```

or another appropriate blocked/paused status.

---

## Security / RLS Done Criteria

If a task has Security/RLS Impact of Medium or High, it is not Done until Codex completes a security/RLS review.

Security/RLS review must consider:

- Who can read data
- Who can write data
- Service-role-only boundaries
- Authenticated user boundaries
- Anonymous/public access paths
- Token handling
- Payment-gated actions
- Secrets and environment variables
- Production safety

---

## Design-System Done Criteria

If a task affects frontend, brand, marketing, notification, PDF, verifier-facing, dashboard, or customer-facing work, it is not Done until the design system has been reviewed.

Relevant source:

```text
/docs/design_system/
```

Any deviation from the design system must be documented and approved where required.

---

## Documentation Done Criteria

Documentation tasks are Done only when:

- The approved docs are created or updated in GitHub.
- The source-of-truth location is clear.
- Any approval or decision is recorded where appropriate.
- Any missing consolidation or follow-up work is documented.
- David confirms Done if required.

---

## PR Done Criteria

A pull request is not Done merely because it is opened or merged.

A PR-related task is Done only when:

- The PR references the relevant task ID.
- Claude has documented implementation and tests.
- Codex has completed QA.
- Required remediation is complete.
- David has made the Done decision.
- Merge authority is respected.

Claude may not self-approve or self-merge unless David explicitly delegates merge authority in writing.

---

## Migration / Production Done Criteria

No Supabase migration, deployment, Stripe live-mode change, PassKit production change, webhook change, environment-variable change, or production-impacting action is Done until:

- Codex QA is complete and clean.
- Production safety has been reviewed.
- Rollback or recovery path is documented where relevant.
- David explicitly approves execution.
- Execution results are documented.

---

## Risk Acceptance

Known risks do not disappear because the task is otherwise complete.

If a risk remains, it must be documented and either:

```text
Mitigated
Accepted by David
Deferred with explicit owner/date/context
```

Only David may accept product, business, security, data, production, or legal risk.

---

## Do Not Do

An acceptance criterion or task may be closed as `Do Not Do` only with David approval.

The reason should be documented.

---

## Not Done Conditions

A task is not Done if any of the following are true:

- Acceptance criteria are incomplete.
- Scope changed without approval.
- QA found blockers.
- Required tests were not run or not documented.
- Security/RLS impact is unresolved.
- Design-system impact is unresolved.
- Known risks are undocumented or unaccepted.
- Implementation exists only in chat.
- GitHub source-of-truth docs are missing.
- David has not made the Done decision.
