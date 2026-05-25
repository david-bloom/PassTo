# PassTo Engineering Team Operating Charter — v1.7 Amendment

**Status:** Approved  
**Version:** v1.7 Amendment  
**Owner:** David  
**Approved Date:** 2026-05-24  
**Applies To:** `/docs/team_charter/TEAM_CHARTER.md` v1.3 and active amendments v1.4, v1.5, and v1.6  

---

## Purpose

This amendment establishes Claude's GitHub pull request authority.

Claude now has access to create pull requests in GitHub. This improves engineering execution and handoff, but it does not change Codex QA responsibility or David's final approval authority.

Until the main charter is consolidated, this amendment is part of the active PassTo operating charter and should be read with:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/team_charter/TEAM_CHARTER_V1_4_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_5_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_6_AMENDMENT.md
```

---

## Version History Entry

Add to the charter version history:

| Version | Date | Approved By | Summary |
|---|---:|---|---|
| v1.7 | 2026-05-24 | David | Added Claude GitHub pull request authority, PR labeling rules, Codex QA requirements, and David merge/Done approval authority |

---

## Claude GitHub Pull Request Authority

Claude may create pull requests for:

- Approved tasks.
- Approved remediation work.
- Approved Class B work.
- Approved Claude-direct spec-stub work.

Claude may not create pull requests for unapproved Class A work except as a draft PR clearly marked blocked and awaiting David approval.

Claude may not merge pull requests unless David explicitly grants merge authority in writing.

Claude may not self-approve pull requests.

Claude may not treat a pull request as Done without Codex QA and David Done decision.

---

## Required Claude PR Content

Every Claude-created PR must reference or include:

- Task ID.
- Approved task spec or approved spec stub.
- Acceptance criteria.
- Implementation summary.
- Files, routes, components, database tables, integrations, or assets changed.
- Tests run.
- Test results.
- Deviations from the approved spec, if any.
- Risks or issues, if any.
- Design-system impact, if any.
- Security/RLS impact, if any.

Claude should keep PR descriptions written for David's Product Manager technical level: clear enough for David to understand product impact, QA status, risks, and approval needs without reading code.

---

## Required Claude PR Labels

For PRs ready for Codex QA, Claude must apply:

```text
assigned: codex
needs: codex-review
status: ready-for-codex-qa
```

If Claude opens a draft PR for work that lacks approved scope, Claude must mark the PR as draft and apply:

```text
assigned: david
needs: david-approval
status: blocked
```

If Claude opens a PR that is blocked by an architecture, security, data, integration, design-system, or false-assumption concern, Claude must apply:

```text
assigned: codex
needs: codex-review
status: blocked
```

Labels are routing aids only. The PR description, task file, and activity log remain the durable source of truth.

---

## Codex PR Review Responsibility

Codex reviews Claude PRs for:

- Scope compliance.
- Architecture alignment.
- Security/RLS risk.
- Data model or migration risk.
- Integration risk.
- Payment, PassKit, Postmark, PDF, or external-service risk.
- Design-system impact.
- Acceptance criteria completion.
- QA sufficiency.
- Documentation completeness.
- MVP simplicity and maintainability.

Codex may require Claude remediation before the PR is ready for David review.

After Codex QA is complete and clean, Codex should update labels to:

```text
assigned: david
status: ready-for-david-review
```

If David approval is required, Codex should also apply:

```text
needs: david-approval
```

---

## Claude Remediation After Codex PR Review

If Codex requests remediation, Claude must:

- Respond in the PR or linked task file.
- Make only the requested or approved changes.
- Document files changed.
- Re-run relevant tests/checks.
- Update implementation notes and test results.
- Re-label the PR for Codex QA when ready.

If remediation reveals a false assumption, scope issue, or structural concern, Claude must pause and escalate under the normal charter rules.

---

## David PR Authority

David remains final approver for:

- Done decisions.
- Class A approval.
- Product scope decisions.
- Risk acceptance.
- Merge decisions unless explicitly delegated.

A PR may not be considered Done until David confirms the Done decision under the charter Definition of Done.

If David explicitly delegates merge authority for a specific PR or class of PRs, the delegation must be documented in the PR, task file, or approvals log.

---

## PR Closeout

When a PR is closed or merged, the related task file and activity log should be updated where appropriate.

The closeout should include:

- PR link or number.
- Task ID.
- Final status.
- Summary of work completed.
- Codex QA result.
- David Done decision.
- Any follow-up tasks.

---

## Consolidation Note

This amendment should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future documentation maintenance task together with v1.4, v1.5, and v1.6.
