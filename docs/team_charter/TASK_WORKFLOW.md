# PassTo Task Workflow

**Status:** Approved Baseline  
**Owner:** David  
**Last Updated:** 2026-05-25  
**Canonical Folder:** `/docs/team_charter/`  

---

## Purpose

This document defines the standard PassTo task workflow for David, Codex, and Claude.

It is a companion to:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/team_charter/DEFINITION_OF_DONE.md
/docs/team_charter/AI_COLLABORATION_RULES.md
```

The charter remains the highest-level governance document. This file makes the task workflow easier to find and reuse.

---

## Standard Task Flow

The standard PassTo task flow is:

1. David sets direction or identifies a need.
2. Codex writes the task spec.
3. David approves the task spec.
4. Claude executes the approved scope.
5. Claude documents the result.
6. Codex performs QA / architectural review.
7. Claude remediates if needed.
8. David reviews against acceptance criteria.
9. Task closes.

No execution begins until the task has an approved task ID and David approval is recorded when required.

---

## Task Ownership

### David

David owns:

- Product direction
- Scope decisions
- Priority decisions
- Task approval
- Risk acceptance
- Final Done decision

### Codex

Codex owns:

- Architecture
- Task specs
- Acceptance criteria
- QA plans
- Security review
- Architectural review
- Codex QA review

### Claude

Claude owns:

- Execution against approved scope
- Implementation notes
- Deviations
- Test results
- Remediation
- Structural challenge escalation

---

## Required Task Metadata

Every task should include:

```text
Task ID:
Title:
Owner:
Status:
Priority:
Created Date:
Approved Date:
Product Goal:
Technical Scope:
Out of Scope:
Routes Affected:
Components Affected:
Database/Tables Affected:
Integrations Affected:
Security/RLS Impact:
Design System Impact:
Design Source:
Acceptance Criteria:
QA Plan:
Implementation Summary:
Test Results:
Risks / Issues:
David Approval:
Codex QA Result:
David Done Decision:
```

---

## Task Status Values

Use one clear status at all times:

```text
Not Started
Spec Drafted
Spec Drafted — Awaiting David Approval
Awaiting David Approval
Approved for Execution
In Progress
Paused — Structural Concern
Paused — False Assumption
Blocked — Awaiting David Approval
Blocked — External Dependency
Ready for Codex QA
Codex QA Complete
Ready for Codex Retrospective Review
Needs Claude Remediation
Ready for David Review
Done
Do Not Do
```

---

## Approval Classes

### Class A — David Approval Required

Class A includes product, architecture, security, data, integration, deployment, design-system-impacting, customer-facing, or acceptance-criteria-impacting work.

Default rule (revised per `TEAM_CHARTER_V1_11_AMENDMENT.md`): if classification is ambiguous, reversible, and low blast radius, ask one clarifying question and proceed under Class B or C as appropriate — do not automatically escalate to Class A. If classification is ambiguous *and* irreversible or high blast radius (touches product, architecture, security, data, integrations, deployment, design standards, brand standards, customer-facing assets, or acceptance criteria), it is Class A. This narrows when uncertainty itself triggers David's review — it does not narrow what Class A covers when the risk is actually present.

### Class B — Codex Approval Sufficient

Class B is limited maintenance work that does not change product behavior, architecture, security, data model, integrations, deployment, user experience, design standards, brand standards, customer-facing assets, or acceptance criteria.

Code-touching Class B work requires Codex approval unless the approved Codex-unavailable exception applies.

### Class C — Claude May Execute and Log

Class C is documentation hygiene only.

Class C cannot modify code, product behavior, architecture, security, data, integrations, deployment, design standards, brand standards, customer-facing assets, or task scope.

---

## Claude-Direct Assignment

When David assigns a task directly to Claude and no Codex-authored spec exists, Claude must not begin execution immediately.

Claude must first draft a spec stub using the standard task metadata format.

The task status must be:

```text
Spec Drafted — Awaiting David Approval
```

David approval of a Claude-drafted spec stub authorizes Claude execution.

Codex reviews the implementation during QA as normal.

A Claude-drafted spec stub does not replace Codex ownership of the QA Plan. If no Codex-authored QA Plan exists at execution time, Claude must document test steps taken and explicitly flag the missing QA Plan in implementation notes.

---

## GitHub Issue / PR Workflow

For implementation work, Claude may create GitHub PRs only for approved work.

Claude PRs must include:

- Task ID
- Approved task spec or approved spec stub
- Acceptance criteria
- Implementation summary
- Files/routes/components/tables/integrations/assets changed
- Tests run
- Test results
- Deviations, if any
- Risks/issues, if any
- Security/RLS impact, if any
- Design-system impact, if any

For PRs ready for Codex QA, Claude must apply:

```text
assigned: codex
needs: codex-review
status: ready-for-codex-qa
```

Claude may not merge or self-approve PRs unless David explicitly delegates merge authority in writing.

---

## Review / Remediation Loop

When Codex completes QA:

- If clean, Codex routes the task to David for review.
- If changes are required, Codex routes the task to Claude for remediation.

When Claude remediates:

- Claude responds in the same GitHub issue, PR, or task file.
- Claude updates relevant files.
- Claude documents tests run and results.
- Claude relabels the item for Codex re-review.

---

## Closeout

Every meaningful work session must end with a repo-visible closeout when work occurred, decisions were made, risks were identified, task status changed, or future context matters.

Closeout must identify:

```text
Task ID:
Task Status:
Work Completed:
Files / Docs Changed:
Open Questions:
Risks / Issues:
Decisions Made:
David Approval Needed:
Next Recommended Action:
Handoff Notes:
```

No meaningful task state should exist only in chat.
