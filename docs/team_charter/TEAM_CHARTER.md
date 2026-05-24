# PassTo Engineering Team Operating Charter

**Status:** Approved  
**Version:** v1.3  
**Owner:** David  
**Canonical Location:** `/docs/team_charter/TEAM_CHARTER.md`  
**Initial Approved Date:** 2026-05-23  
**Last Approved Date:** 2026-05-23  

---

## Version History

| Version | Date | Approved By | Summary |
|---|---:|---|---|
| v1.0 | 2026-05-23 | David | Initial approved operating charter |
| v1.1 | 2026-05-23 | David | Clarified QA ownership, Class B boundaries, startup prompts, false-assumption escalation, task granularity, and blocked-approval protocol |
| v1.2 | 2026-05-23 | David | Added `/docs/design_system/` as a canonical folder and established design-system review rules for brand and user-facing work |
| v1.3 | 2026-05-23 | David | Added close-of-session trigger, closeout requirements, role-specific closeout responsibilities, task status values, and GitHub handoff rules |

---

## 1. Purpose

This charter defines how David, Codex, and Claude work together as the PassTo engineering team.

PassTo uses GitHub documentation as the source of truth for product, architecture, task, QA, approval, activity, design, brand, and decision records. Chat history is not source of truth unless it has been captured in GitHub.

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
/docs/design_system/
```

The PassTo Design System is the source of truth for brand, visual design, UI standards, and design assets.

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
- Final approval of design-system changes when they affect brand, UX, or customer-facing standards

David writes or records:

- Approvals
- Priority decisions
- Done decisions
- Product direction changes
- Explicit acceptance of known risks or issues

David is the final authority on whether a task is Done.

### 3.2 Codex — Architect and Engineering Director

Codex owns:

- Technical vision
- System architecture
- Architecture decisions
- Task decomposition
- Task specs
- Acceptance criteria
- QA plans
- QA standards
- Governance
- Security architecture
- Security review
- Architectural review after Claude execution
- Design System Impact classification in relevant task specs

Codex writes:

- Task specs
- Acceptance criteria
- QA plans
- Architecture decisions
- Security review notes
- QA / architectural review notes
- Required remediation notes
- Updates to technical documentation

Codex is responsible for identifying architectural risk proactively.

Codex must bias toward MVP simplicity unless a more complex approach prevents a clear near-term risk.

### 3.3 Claude — Senior Engineer

Claude owns:

- Execution against approved Codex-authored task specs
- Implementation work
- Implementation notes
- Deviation reports
- Test results
- Risk reports discovered during execution
- Remediation after Codex QA review
- Reviewing the design system before implementing frontend, brand, marketing, notification, or customer-facing changes

Claude writes:

- Implementation summaries
- Files/routes/components changed
- Deviations from the approved spec
- Test results
- Risks and issues discovered during execution
- Remediation notes
- Design-system deviations, if any

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
| Design system | David | Codex and Claude reference during user-facing work |
| Task specs | Codex | David approves |
| QA plans | Codex | Claude may recommend changes |
| Implementation notes | Claude | Codex reviews |
| QA review | Codex | Claude remediates |
| Activity log | David, Codex, Claude | All |
| Done decision | David | Codex and Claude provide inputs |

Role-specific documentation rules:

- Codex writes specs, acceptance criteria, QA plans, and architecture decisions.
- Codex identifies Design System Impact for frontend, brand, marketing, notification, and customer-facing tasks.
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

Security/RLS Impact must be classified as one of:

```text
Security Impact: None
Security Impact: Low
Security Impact: Medium
Security Impact: High
```

Design System Impact must be classified where relevant as one of:

```text
Design System Impact: None
Design System Impact: Low
Design System Impact: Medium
Design System Impact: High
Design Source: /docs/design_system/[file-or-asset-path]
```

If security impact is Medium or High, Codex must write a security review note before execution proceeds.

If Design System Impact is Medium or High, Codex must identify the relevant design source and any brand, UX, visual, or asset constraints before Claude executes.

### 6.1 QA Plan Ownership

Codex owns the QA Plan as part of the task spec.

Claude may recommend additions or corrections to the QA Plan before or during execution, but Claude may not replace the QA Plan without Codex revision and, where required, David approval.

At minimum, the QA Plan should identify:

- Manual QA steps
- Expected results
- Regression areas
- Error/failure cases
- Whether automated tests are required
- Any security, RLS, data, integration, or design-system checks required

Claude is responsible for documenting the actual Test Results after execution.

---

## 7. Task Granularity

PassTo work should be broken into tasks small enough to be executed, reviewed, and closed cleanly.

### 7.1 Epic

An epic is a large body of work made up of multiple tasks.

Examples:

- Account Creation
- Sharing Flow
- Payments
- License Lookup
- Notification System

Epics should live in `/docs/prd/`, `/docs/features/`, or `/docs/flows/`.

Epics are not directly executed by Claude.

### 7.2 Task

A task is a scoped unit of work that should usually be completable in a single focused Claude execution session.

A task should have:

- One clear product or technical goal
- One approved task spec
- One acceptance criteria set
- One QA plan
- One implementation summary
- One Codex QA review
- One David Done decision

If a task cannot be reasonably reviewed in one pass, Codex should split it.

### 7.3 Sub-task

A sub-task is a smaller implementation step inside an approved task.

Sub-tasks may be used by Claude for execution planning, but they do not replace the approved task spec.

If a sub-task changes scope, architecture, security, data, integrations, deployment, design standards, or acceptance criteria, it must be escalated.

---

## 8. Approval Process

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

## 9. Approval Classes

### 9.1 Class A — David Approval Required

David approval is required before execution for all product, architecture, security, data, integration, deployment, user-facing, design-system-impacting, or acceptance-criteria-impacting work.

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
- Any task that changes brand, visual standards, UI standards, or customer-facing design assets

### 9.2 Class B — Codex Approval Sufficient

Codex may approve limited maintenance work that does not change product behavior, architecture, security, data model, integrations, deployment, user experience, design standards, brand standards, customer-facing assets, or acceptance criteria.

Class B work must still be logged.

Documentation-only Class B examples:

- Documentation cleanup
- Correcting internal documentation links
- Adding missing implementation notes after a completed task
- Clarifying existing documentation without changing policy or scope

Code-touching Class B work requires explicit Codex approval before execution.

Code-touching Class B work may include only low-risk, non-functional maintenance inside already-approved scope, such as:

- Formatting
- Lint fixes
- Dead-code removal
- Comment cleanup
- Test-only additions for already-approved behavior
- Minor import cleanup where behavior is unchanged

Code-touching Class B work may not include:

- Function restructuring
- Logic changes
- Parameter renaming that affects callers
- API contract changes
- Route changes
- Database query changes
- Auth, RLS, or permission changes
- Error-handling behavior changes
- Dependency changes
- Brand, layout, typography, color, component, iconography, or image-asset changes
- Any change that could affect runtime behavior

If there is uncertainty about whether a code change is non-functional, the task is Class A and requires David approval.

### 9.3 Class C — Claude May Execute and Log

Claude may perform documentation hygiene only, such as:

- Fixing spelling in documentation
- Correcting Markdown formatting
- Adding missing dates or status lines to an activity log
- Fixing clearly broken internal anchors or links
- Recording test output after an approved task

Class C work cannot modify code, product behavior, architecture, security, data, integrations, deployment, design standards, brand standards, customer-facing assets, or task scope.

### 9.4 Default Approval Rule

Default: David approval required.

If classification is unclear, the task is Class A and requires David approval.

---

## 10. Definition of Done

A task is Done only when:

1. Every acceptance criterion is completed or explicitly marked “Do Not Do” with David approval.
2. The implementation matches the approved technical scope.
3. Any deviation from the task spec is documented.
4. Routes, components, database changes, integrations, and design-system impacts are documented.
5. Security/RLS impact has been reviewed by Codex.
6. Design-system impact has been reviewed where applicable.
7. QA is complete and clean.
8. Known risks/issues are documented and accepted by David.
9. Claude has written the implementation summary.
10. Codex has completed QA / architectural review.
11. David has confirmed the task meets the Definition of Done.

Confirmation sequence:

```text
Claude confirms implementation complete.
Codex confirms QA / architecture review complete.
David confirms Done.
```

David alone closes the task.

---

## 11. Security Responsibility

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

## 12. Change Control

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

Claude may not silently workaround structural concerns, design-system conflicts, or brand inconsistencies.

---

## 13. False Assumption Escalation

A false assumption is different from an improvement or scope change.

A false assumption exists when an approved spec, architecture note, task brief, product instruction, or design instruction is based on information that appears to be incorrect.

Examples:

- The spec assumes a table, route, API, dependency, or service exists when it does not.
- The spec assumes a third-party integration behaves a certain way, but documentation or implementation proves otherwise.
- The spec assumes an auth, RLS, data ownership, or payment behavior that is technically or commercially incorrect.
- The spec describes current app behavior inaccurately.
- The spec depends on an unavailable credential, environment variable, production setting, design asset, or brand standard.

When Claude discovers a false assumption, Claude must pause the task and document:

```text
False Assumption:
Evidence:
Impact:
Recommended Path:
Can any approved work continue safely? Yes/No
```

Codex must then review and either:

1. Correct the task spec,
2. Reclassify the task,
3. Escalate to David for decision, or
4. Cancel or split the task.

If the false assumption affects product behavior, architecture, security, data, integrations, deployment, design standards, brand standards, customer-facing assets, or acceptance criteria, David approval is required before execution resumes.

---

## 14. Escalation

If Codex and Claude disagree on architecture, implementation, security, design-system interpretation, or task scope:

1. The disagreement is documented.
2. Codex states the architectural, QA, security, or design-governance position.
3. Claude states the implementation or structural concern.
4. David decides.
5. Claude executes David’s decision.
6. If Claude still sees risk, the risk is logged but not re-litigated unless David reopens the issue.

---

## 15. GitHub Review Triggers

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
- Reviewing frontend, brand, marketing, notification, or customer-facing work

### Claude must read GitHub before:

- Beginning an approved task
- Resuming a paused task
- Remediating after Codex QA
- Documenting implementation results
- Responding to Codex review
- Implementing frontend, brand, marketing, notification, or customer-facing changes

GitHub documentation is the source of truth. Chat context is not source of truth unless written into GitHub.

---

## 16. Design System

The PassTo Design System is the source of truth for brand, visual design, UI standards, and design assets.

Canonical location:

```text
/docs/design_system/
```

The design system currently includes one primary design-system document and a library of supporting assets.

Frontend, user-facing, brand, marketing, notification, and customer-facing tasks must reference the design system before execution.

Codex must identify Design System Impact in relevant task specs:

```text
Design System Impact: None
Design System Impact: Low
Design System Impact: Medium
Design System Impact: High
Design Source: /docs/design_system/[file-or-asset-path]
```

Claude must review the PassTo Design System before implementing UI, brand, marketing, notification, or customer-facing changes.

Claude must document any deviations from the design system in implementation notes, including deviations involving:

- Brand
- Layout
- Typography
- Color
- Components
- Iconography
- Imagery or assets
- Customer-facing copy where tone or presentation is governed by the design system

If a design-system conflict affects user experience, brand standards, acceptance criteria, or implementation scope, the task must pause for Codex review and David approval where required.

---

## 17. Uniform Startup Prompt

David may begin any Codex or Claude session using either the short session trigger or the full startup prompt.

### 17.1 Session Trigger — Short

Use this when the AI already understands the PassTo operating model:

```text
[Codex/Claude], let’s start a new PassTo session.
```

The short trigger means the AI must perform the full startup process before doing any work.

### 17.2 Full Startup Prompt — Paste Into Chat

Use this when starting a fresh chat, reorienting an AI, onboarding a new tool, or when there is any risk that the AI does not know the PassTo operating model:

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
- /docs/design_system/

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

## 18. Option A Review / Respond Workflow

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

## 19. Flow and Feature Documentation

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

## 20. Production Safety

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

## 21. Blocked Approval Protocol

If work is blocked because David approval is required and David is unavailable, Codex and Claude must not proceed with Class A work.

When blocked on David approval:

1. The task status should be marked `Blocked — Awaiting David Approval`.
2. The approval request should be documented in the task file.
3. A summary should be added to the activity log.
4. Codex may queue the next recommended spec, risk note, or decision options.
5. Claude may only perform approved Class C documentation hygiene or stop work.
6. No production-impacting, security-impacting, data-impacting, integration-impacting, architecture-impacting, design-system-impacting, or user-facing work may proceed.

The session may close with a clear handoff note:

```text
Status: Blocked — Awaiting David Approval
Pending Decision:
Recommended Next Action:
Files Updated:
Risks:
```

If David later approves, the next Codex or Claude session must restart from GitHub using the uniform startup prompt.

---

## 22. Close of Session Protocol

Every Codex or Claude session must end with a written closeout when meaningful work occurred, a decision was made, a risk was identified, a task changed status, or the next step depends on future context.

The purpose of closeout is to preserve project memory in GitHub so the next session can restart cleanly from source-of-truth documentation.

### 22.1 Official Close Trigger

David may close any Codex or Claude session with:

```text
[Codex/Claude], close the PassTo session.
```

This means the active AI must:

1. Stop new work.
2. Summarize current state.
3. Update or prepare updates for the relevant GitHub docs.
4. Identify approvals, blockers, risks, and next steps.
5. End with a clean handoff.

### 22.2 Close of Session Triggers

A closeout is required when any of the following occur:

1. A task is completed.
2. A task is paused.
3. A task is blocked.
4. David approval is requested.
5. David approval is granted or denied.
6. Claude identifies a deviation, risk, blocker, false assumption, or structural concern.
7. Codex completes a spec, QA review, architecture review, or security review.
8. Claude completes implementation or remediation.
9. A production-impacting, security-impacting, data-impacting, design-system-impacting, or architecture-impacting issue is discovered.
10. The session is ending before the task is Done.
11. David explicitly says: “close the session,” “wrap up,” “pause here,” “document where we are,” or similar.

If there is uncertainty about whether closeout is required, closeout is required.

### 22.3 Required Closeout Metadata

Before ending a session, the active AI must update or prepare updates for the relevant GitHub documentation.

At minimum, closeout must include:

```text
Session Date:
Role:
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

### 22.4 Task Status at Closeout

Every active task must end the session with one clear status:

```text
Not Started
Spec Drafted
Awaiting David Approval
Approved for Execution
In Progress
Paused — Structural Concern
Paused — False Assumption
Blocked — Awaiting David Approval
Blocked — External Dependency
Ready for Codex QA
Codex QA Complete
Needs Claude Remediation
Ready for David Review
Done
Do Not Do
```

### 22.5 Codex Closeout Responsibilities

When Codex closes a session, Codex must document:

- Specs written or revised
- Acceptance criteria added or changed
- QA plan added or changed
- Architecture decisions made
- Security/RLS concerns
- Design System Impact, if relevant
- Open risks
- Required David approvals
- Recommended next task or decision

Codex closeout should be written to the relevant task file and, where appropriate, the activity log, decision log, or risk log.

### 22.6 Claude Closeout Responsibilities

When Claude closes a session, Claude must document:

- Implementation work completed
- Files, routes, components, tables, integrations, or assets affected
- Tests run
- Test results
- Deviations from the approved spec
- Risks or blockers discovered
- False assumptions discovered
- Remediation completed or still needed
- Whether the task is ready for Codex QA, David review, or blocked

Claude closeout should be written to the relevant task file and, where appropriate, the activity log or risk log.

### 22.7 David Closeout Responsibilities

When David closes a session, David should document or instruct Codex/Claude to document:

- Approval decisions
- Priority decisions
- Done / Not Done decisions
- Accepted risks
- Tasks marked “Do Not Do”
- Scope changes
- Next priority

David remains final approver for Done decisions and risk acceptance.

### 22.8 Closeout Location

Closeout notes should be written in the relevant task file under the appropriate section.

For example:

```markdown
## Session Closeout — YYYY-MM-DD — Codex

## Session Closeout — YYYY-MM-DD — Claude

## David Decision — YYYY-MM-DD
```

If the session affects more than one task, a summary must also be added to:

```text
/docs/activity_log/ACTIVITY_LOG.md
```

If the session creates or resolves a risk, update:

```text
/docs/activity_log/RISKS_LOG.md
```

If the session records an architectural or operating decision, update:

```text
/docs/activity_log/DECISIONS_LOG.md
```

If the session records an approval, update:

```text
/docs/activity_log/APPROVALS_LOG.md
```

### 22.9 Closeout Summary Format

Use this format:

```markdown
## Session Closeout — YYYY-MM-DD — [Codex/Claude/David]

**Task ID:**  
**Status:**  
**Role:**  
**Summary:**  

### Work Completed

-

### Files / Docs Changed

-

### Decisions Made

-

### Risks / Issues

-

### Open Questions

-

### Approval Needed

-

### Next Recommended Action

-

### Handoff Notes

-
```

### 22.10 Blocked Session Closeout

If a session ends blocked, use this format:

```markdown
## Blocked Session Closeout — YYYY-MM-DD

**Task ID:**  
**Status:** Blocked — [reason]  
**Blocked By:**  
**Approval Needed From:** David / Codex / External  
**Can Work Continue Safely?:** Yes / No  

### Pending Decision

-

### Work Completed Before Block

-

### Risk If Work Continues Without Approval

-

### Recommended Next Action

-
```

### 22.11 Closeout Rule

No meaningful work session should end with project state trapped only in chat.

If work, decisions, approvals, risks, implementation details, or blockers are not written to GitHub, they do not exist for future sessions.

---

## 23. Charter Evolution

This charter is expected to evolve.

As David, Codex, and Claude discover better operating rules, the charter may be expanded.

Changes to this charter require David approval.
