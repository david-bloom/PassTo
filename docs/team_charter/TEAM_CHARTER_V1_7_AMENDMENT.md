# PassTo Engineering Team Operating Charter — v1.7 Amendment

**Status:** Approved
**Version:** v1.7 Amendment
**Owner:** David
**Approved Date:** 2026-05-24
**Applies To:** `/docs/team_charter/TEAM_CHARTER.md` v1.3 and all prior amendments (v1.4–v1.6)

---

## Purpose

This amendment establishes Claude's authority to create GitHub pull requests for approved work, and defines the PR content requirements, routing label requirements, Codex PR review scope, and merge authority rules.

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
| v1.7 | 2026-05-24 | David | Added Claude GitHub PR authority, PR content requirements, routing labels, Codex PR review scope, and merge authority rules |

---

## Claude GitHub PR Authority

Claude may create pull requests for approved tasks, approved remediation work, and approved Class B work.

Claude may not merge pull requests.

Claude may not self-approve pull requests.

Claude may not treat a pull request as Done without Codex QA and David Done decision.

---

## Claude PR Requirements

Claude PRs must reference:

- Task ID
- Approved task spec
- Acceptance criteria
- Implementation summary
- Files / routes / components changed
- Tests run
- Test results
- Deviations, if any
- Risks / issues, if any

---

## Claude PR Routing Labels

Claude must apply the following labels when opening a PR for approved, in-scope work:

```text
assigned: codex
needs: codex-review
status: ready-for-codex-qa
```

If Claude opens a PR for work that lacks approved scope, the PR must be marked **draft** and labeled:

```text
assigned: david
needs: david-approval
status: blocked
```

---

## Codex PR Review Scope

Codex reviews Claude PRs for:

- Scope compliance
- Architecture alignment
- Security / RLS risk
- Data / integration risk
- Design-system impact
- Acceptance criteria completion
- QA sufficiency

After Codex review, Claude remediates if required.

---

## Post-Codex QA Routing

Once Codex QA is complete, the PR may be labeled:

```text
assigned: david
status: ready-for-david-review
```

---

## Merge Authority

David remains final approver for Done and merge decisions unless David explicitly delegates merge authority.

Claude may not merge pull requests.

Claude may not self-approve pull requests.

---

## Consolidation Note

This amendment should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future documentation maintenance task together with v1.4, v1.5, and v1.6.
