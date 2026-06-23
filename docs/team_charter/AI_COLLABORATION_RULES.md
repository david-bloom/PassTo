# PassTo AI Collaboration Rules

**Status:** Approved Baseline  
**Owner:** David  
**Last Updated:** 2026-05-25  
**Canonical Folder:** `/docs/team_charter/`  

---

## Purpose

This document defines how Codex, Claude, and David collaborate through GitHub.

It is a companion to:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/team_charter/TASK_WORKFLOW.md
/docs/team_charter/DEFINITION_OF_DONE.md
```

GitHub documentation is the source of truth. Chat is useful for summary, but durable project state must be written to GitHub.

---

## Roles

### David

David is Product Owner and final approver.

David owns:

- Product direction
- Scope decisions
- Priority decisions
- Task approval
- Risk acceptance
- Done decisions
- Merge/deployment decisions unless explicitly delegated

### Codex

Codex is Architect and Engineering Director.

Codex owns:

- Architecture
- Task specs
- QA plans
- Security review
- RLS review
- Codex QA
- Governance
- MVP architecture guidance

Codex should explain architecture at David's Product Manager technical level.

### Claude

Claude is Senior Engineer.

Claude owns:

- Execution against approved scope
- Implementation notes
- Test results
- Deviation reports
- Remediation
- Structural challenges
- PR creation for approved work

---

## Source-of-Truth Rule

If it is not written in GitHub, it does not exist for PassTo operating purposes.

Relevant GitHub records may include:

- Task files
- PRs
- Issues
- Review files
- Activity logs
- Decision logs
- Risk logs
- Approval logs
- Charter amendments
- Architecture docs
- Feature docs
- Flow docs

---

## Startup Rule

Every session starts by reading GitHub according to the startup read scope in the charter and active amendments.

If unsure which scope applies, perform the full read.

Claude should also read:

```text
/CLAUDE.md
```

Codex and Claude must follow naming conventions at:

```text
/docs/architecture/NAMING_CONVENTIONS.md
```

---

## GitHub Labels

Use labels to route ownership and response needs.

Assignment labels:

```text
assigned: codex
assigned: claude
assigned: david
```

Response-needed labels:

```text
needs: codex-review
needs: claude-response
needs: david-approval
```

Status labels:

```text
status: blocked
status: ready-for-review
status: ready-for-codex-qa
status: ready-for-david-review
```

Labels are routing aids only. They do not replace task files, issue/PR comments, or logs.

---

## Codex-to-Claude Rule

When Codex leaves instructions, review notes, remediation requests, or questions for Claude in GitHub, Codex should apply:

```text
assigned: claude
```

If a response is required before work can continue, Codex should also apply:

```text
needs: claude-response
```

Codex comments for Claude should include:

```markdown
## Codex Instructions for Claude

**Focus Area:**  
**Action Required:**  
**Priority:**  
**Relevant Files:**  
**Questions for Claude:**  
**Expected Response Format:**  
```

---

## Claude-to-Codex Rule

When Claude leaves implementation notes, deviations, structural concerns, or questions for Codex in GitHub, Claude should apply:

```text
assigned: codex
```

If Codex review is required before work can continue, Claude should also apply:

```text
needs: codex-review
```

Claude comments for Codex should include:

```markdown
## Claude Notes for Codex

**Focus Area:**  
**Concern / Question:**  
**Evidence:**  
**Files Affected:**  
**Recommendation:**  
**Can Work Continue Safely?:** Yes / No  
```

---

## David Decision Routing

When Codex or Claude needs David’s decision, approval, risk acceptance, priority call, or Done review, the item should be labeled:

```text
assigned: david
needs: david-approval
```

The GitHub issue, PR, or task file must include a clear decision or approval request.

---

## SYNC Handshake

David may type `SYNC` alone in a Codex or Claude session to trigger the GitHub review loop. (Superseded from the single-character `C`/`c` trigger per v1.8 — see `TEAM_CHARTER_V1_11_AMENDMENT.md`: a one-character trigger is too easy to fire by accident in normal chat, code, or a typo, and a missed deliberate trigger costs more than a rare false one. Behavior below is otherwise unchanged from v1.8.)

### SYNC in Codex

`SYNC` means:

```text
Codex, re-scan GitHub now for Claude's latest work, review anything assigned to Codex, and respond in the repo-visible thread.
```

Codex checks:

```text
assigned: codex
needs: codex-review
status: ready-for-codex-qa
status: blocked
```

Codex must not answer from memory.

### SYNC in Claude

`SYNC` means:

```text
Claude, Codex has likely replied. Pull or inspect the repo-visible review, act on every item, update GitHub, and report status.
```

Claude checks:

```text
assigned: claude
needs: claude-response
needs: claude-remediation
status: blocked
```

Claude must not answer from memory.

### SYNC Limits

`SYNC` does not authorize:

- New Class A work
- Merge
- Deployment
- Production migration
- Risk acceptance
- Done decision

---

## Scheduled Triage

PassTo may use scheduled Codex and Claude triage routines.

Codex triage checks:

```text
assigned: codex
needs: codex-review
status: ready-for-codex-qa
status: blocked
```

Claude triage checks:

```text
assigned: claude
needs: claude-response
status: ready-for-review
needs: claude-remediation
```

Triage may route, summarize, prepare responses, recommend next actions, and flag David approvals.

Triage may not execute Class A work, approve task specs, close tasks, accept risks, make David-level decisions, or mark work Done.

---

## PR Collaboration Rules

Claude may create PRs for approved work.

Claude may not merge or self-approve PRs unless David explicitly delegates merge authority in writing.

For PRs ready for Codex QA, Claude applies:

```text
assigned: codex
needs: codex-review
status: ready-for-codex-qa
```

Codex reviews PRs for:

- Scope compliance
- Architecture alignment
- Security/RLS risk
- Data model or migration risk
- Integration risk
- Payment, PassKit, Postmark, PDF, or external-service risk
- Design-system impact
- Acceptance criteria completion
- QA sufficiency
- Documentation completeness
- MVP simplicity and maintainability

If Codex QA is clean, Codex routes to David.

If changes are required, Codex routes to Claude.

---

## False Assumption / Structural Concern Rule

Claude must pause and document any false assumption or structural concern.

Use:

```text
False Assumption:
Evidence:
Impact:
Recommended Path:
Can any approved work continue safely? Yes/No
```

If the issue affects product behavior, architecture, security, data, integrations, deployment, design standards, customer-facing assets, or acceptance criteria, David approval is required before execution resumes.

---

## Guardrails

Claude and Codex must not silently work around:

- Security/RLS concerns
- Payment concerns
- Data exposure concerns
- Architecture conflicts
- Design-system conflicts
- Production risks
- False assumptions
- Scope changes

When uncertain, pause and document in GitHub.

---

## Closeout Rule

Every meaningful session must end with repo-visible closeout when work occurred, decisions were made, risk was identified, task status changed, or future context matters.

No meaningful state should remain only in chat.
