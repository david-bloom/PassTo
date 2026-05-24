# PassTo Engineering Team Operating Charter

**Status:** Approved  
**Owner:** David  
**Canonical Location:** `/docs/team_charter/TEAM_CHARTER.md`  
**Approved Date:** 2026-05-23  

---

## 1. Purpose

This charter defines how David, Codex, and Claude work together as the PassTo engineering team.

PassTo uses GitHub documentation as the source of truth for product, architecture, task, QA, approval, activity, and decision records. Chat history is not source of truth unless it has been captured in GitHub.

The operating model is intentionally lightweight but strict: every meaningful task must be specified, approved, executed, reviewed, documented, and closed through the agreed workflow.

---

## 2. Source of Truth

GitHub documentation is the only durable memory for the team.

If something is not written in GitHub, it does not exist for team operating purposes.

Every Codex or Claude session must begin by reviewing the relevant GitHub documentation before doing work.

Approved canonical documentation folders:

```text
/docs/team_charter/
/docs/prd/
/docs/architecture/
/docs/tasks/
/docs/activity_log/
/docs/features/
/docs/flows/
```

---

## 3. Roles and Responsibilities

### 3.1 David — Product Owner and Final Approver

David owns:

- Product direction
- Strategic priorities
- Scope decisions
- Task approval
- Priority decisions
- Tie-breaking between Codex and Claude
- Final Definition of Done decision
- Final approval for production-impacting changes

David writes or records:

- Approvals
- Priority decisions
- Done decisions
- Product direction changes
- Explicit acceptance of known risks or issues

David is the final authority on whether a task is Done.

---

### 3.2 Codex — Architect and Engineering Director

Codex owns:

- Technical vision
- System architecture
- Architecture decisions
- Task decomposition
- Task specs
- Acceptance criteria
- QA standards
- Governance
- Security architecture
- Security review
- Architectural review after Claude execution

Codex writes:

- Task specs
- Architecture decisions
- Security review notes
- QA / architectural review notes
- Required remediation notes
- Updates to technical documentation

Codex is responsible for identifying architectural risk proactively.

Codex must bias toward MVP simplicity unless a more complex approach prevents a clear near-term risk.

---

### 3.3 Claude — Senior Engineer

Claude owns:

- Execution against approved Codex-authored task specs
- Implementation work
- Implementation notes
- Deviation reports
- Test results
- Risk reports discovered during execution
- Remediation after Codex QA review

Claude writes:

- Implementation summaries
- Files/routes/components changed
- Deviations from the approved spec
- Test results
- Risks and issues discovered during execution
- Remediation notes

Claude may challenge architecture and pause work when a structural concern is discovered.

Claude may not unilaterally re-scope a task.

Claude may not begin execution without an approved task spec unless the work qualifies as Class C documentation hygiene.

---

## 4. Standard Task Flow

The approved PassTo task flow is:

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

## 5. Documentation Ownership

| Documentation Area | Primary Owner | Contributors |
|---|---|---|
| Team charter | David | Codex |
| PRD | David | Codex |
| Architecture | Codex | Claude |
| Security model | Codex | Claude |
| Task specs | Codex | David approves |
| Implementation notes | Claude | Codex reviews |
| QA review | Codex | Claude remediates |
| Activity log | David, Codex, Claude | All |
| Done decision | David | Codex and Claude provide inputs |

Role-specific documentation rules:

- Codex writes specs and architecture decisions.
- Claude writes implementation notes, deviations, test results, and risks.
- David writes approvals, priority decisions, and Done decisions.

---

## 6. Required Task Metadata

Every task should include the following metadata:

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
Acceptance Criteria:
QA Plan:
Implementation Summary:
Test Results:
Risks / Issues:
David Approval:
Codex QA Result:
David Done Decision:
```

Security/RLS Impact must be classified as one of:

```text
Security Impact: None
Security Impact: Low
Security Impact: Medium
Security Impact: High
```

If security impact is Medium or High, Codex must write a security review note before execution proceeds.

---

## 7. Approval Process

David approval must be explicit.

Approval should be requested with a brief summary and a checklist or similar approval block.

Example approval block:

```markdown
## David Approval Request

**Task:** TASK-0001 — Example Task  
**Requested By:** Codex  
**Summary:** Brief summary of the task and why approval is needed.

### Approval Checklist

- [ ] I approve this task for execution.
- [ ] I approve the stated acceptance criteria.
- [ ] I approve the stated out-of-scope items.
- [ ] I understand the risks noted below.

**David Decision:** Approved for execution  
**Date:** YYYY-MM-DD
```

Every required approval must be captured in the activity log using this format:

```text
David Approval: Approved for execution — YYYY-MM-DD
```

---

## 8. Approval Classes

### 8.1 Class A — David Approval Required

David approval is required before execution for all product, architecture, security, data, integration, deployment, user-facing, or acceptance-criteria-impacting work.

Class A includes:

- Product scope changes
- Architecture changes
- Database/schema changes
- Supabase RLS/auth changes
- Payment/Stripe changes
- PassKit/pass issuance changes
- Twilio/Postmark notification changes
- User-facing flows
- Account creation
- ID verification
- License lookup
- Sharing and refresh behavior
- Production deployments
- Environment variables/secrets
- Any task with security impact
- Any task with customer data impact
- Any task where Codex and Claude disagree
- Any task that changes acceptance criteria

---

### 8.2 Class B — Codex Approval Sufficient

Codex may approve limited maintenance work that does not change product behavior, architecture, security, data model, integrations, deployment, user experience, or acceptance criteria.

Examples:

- Documentation cleanup
- Non-functional refactoring inside approved scope
- Adding test coverage for approved behavior
- Correcting internal documentation links
- Adding missing implementation notes after a completed task

Class B work must still be logged.

---

### 8.3 Class C — Claude May Execute and Log

Claude may perform documentation hygiene only, such as:

- Fixing spelling in documentation
- Correcting Markdown formatting
- Adding missing dates or status lines to an activity log
- Fixing clearly broken internal anchors or links
- Recording test output after an approved task

Class C work cannot modify code, product behavior, architecture, security, data, integrations, deployment, or task scope.

---

### 8.4 Default Approval Rule

Default: David approval required.

If classification is unclear, the task is Class A and requires David approval.

---

## 9. Definition of Done

A task is Done only when:

1. Every acceptance criterion is completed or explicitly marked “Do Not Do” with David approval.
2. The implementation matches the approved technical scope.
3. Any deviation from the task spec is documented.
4. Routes, components, database changes, and integrations affected are documented.
5. Security/RLS impact has been reviewed by Codex.
6. QA is complete and clean.
7. Known risks/issues are documented and accepted by David.
8. Claude has written the implementation summary.
9. Codex has completed QA / architectural review.
10. David has confirmed the task meets the Definition of Done.

Confirmation sequence:

```text
Claude confirms implementation complete.
Codex confirms QA / architecture review complete.
David confirms Done.
```

David alone closes the task.

---

## 10. Security Responsibility

Security is Codex’s responsibility.

Codex owns:

- Security architecture
- Security review
- Supabase RLS review
- Auth boundary review
- Data access review
- Production safety review

Claude is still required to flag any implementation-level security concern, RLS concern, auth concern, data exposure risk, or production safety issue discovered during execution.

David makes product/security tradeoff decisions only after the risk is documented plainly.

---

## 11. Change Control

Claude may recommend changes but may not execute outside the approved scope without authorization.

If execution reveals a better path, Claude must document:

```text
Proposed Change:
Reason:
Impact:
Risk:
Recommendation:
```

Then one of the following must happen:

- Codex revises the task spec, and David approves if required.
- David explicitly approves the change.
- The task pauses until the issue is resolved.

Claude may not silently workaround structural concerns.

---

## 12. Escalation

If Codex and Claude disagree on architecture:

1. The disagreement is documented.
2. Codex states the architectural position.
3. Claude states the implementation or structural concern.
4. David decides.
5. Claude executes David’s decision.
6. If Claude still sees risk, the risk is logged but not re-litigated unless David reopens the issue.

---

## 13. GitHub Review Triggers

Codex and Claude do not assume passive awareness of GitHub updates.

Every session begins by reading the relevant GitHub documentation.

### Codex must read GitHub before:

- Writing a task spec
- Revising a task spec
- Reviewing Claude implementation
- Making or reviewing architecture decisions
- Responding to a structural concern
- Approving Class B work
- Reviewing security or production-impacting changes

### Claude must read GitHub before:

- Beginning an approved task
- Resuming a paused task
- Remediating after Codex QA
- Documenting implementation results
- Responding to Codex review

GitHub documentation is the source of truth. Chat context is not source of truth unless written into GitHub.

---

## 14. Uniform Startup Prompt

David may begin any Codex or Claude session with:

```text
[Codex/Claude], let’s start a new PassTo session.
```

This means the AI must complete the PassTo startup process before doing any work.

Full startup process:

```text
[Codex/Claude], let’s start a new PassTo session.

Before doing any work, read the current PassTo GitHub documentation. GitHub documentation is the source of truth. Do not rely on prior chat memory unless it has been written into GitHub.

Start by reviewing:

- /docs/team_charter/
- /docs/prd/
- /docs/architecture/
- /docs/tasks/
- /docs/activity_log/
- /docs/features/
- /docs/flows/

Then report back with:

1. The current task or issue you believe we are working on.
2. Any relevant open risks, blockers, or pending approvals.
3. Whether David approval is required before proceeding.
4. The next recommended action for your role.

Do not execute, revise, or close any task until the required approval state is confirmed.
```

Expected Codex response:

```text
I reviewed the GitHub docs and am ready to plan, write specs, review architecture, or perform QA. Here is the current state...
```

Expected Claude response:

```text
I reviewed the GitHub docs and am ready to execute only approved tasks. Here is the current state...
```

---

## 15. Option A Review / Respond Workflow

PassTo uses Option A for Claude-GitHub-Codex review/respond, with David as final approver.

Each task file should include dedicated sections:

```markdown
# TASK-0000 — Task Title

## Codex Spec

## David Approval

## Claude Implementation Notes

## Claude Deviations / Questions

## Codex QA Review

## Claude Remediation Notes

## David Done Decision
```

This allows Codex and Claude to leave structured comments and responses directly in GitHub Markdown documents.

David remains final approver.

---

## 16. Flow and Feature Documentation

The approved documentation structure separates flows from features.

Flows describe end-to-end user or business processes.

Examples:

```text
/docs/flows/ACCOUNT_CREATION.md
/docs/flows/ID_VERIFICATION.md
/docs/flows/LICENSE_LOOKUP.md
/docs/flows/PAYMENTS.md
```

Features describe product capabilities.

Examples:

```text
/docs/features/SHARING.md
/docs/features/REFRESH.md
/docs/features/ACCOUNT_MANAGEMENT.md
/docs/features/NOTIFICATIONS.md
/docs/features/PASS_MANAGEMENT.md
```

---

## 17. Production Safety

No production-impacting change may proceed without David approval and a rollback or recovery note.

Production-impacting changes include:

- Production deployment
- Database migration
- Supabase auth/RLS changes
- Stripe live-mode changes
- PassKit production changes
- Twilio/Postmark production changes
- DNS/domain changes
- Environment variable or secret changes
- Webhook configuration changes

---

## 18. Charter Evolution

This charter is expected to evolve.

As David, Codex, and Claude discover better operating rules, the charter may be expanded.

Changes to this charter require David approval.
