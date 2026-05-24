# PassTo Engineering Team Operating Charter — v1.4 Amendment

**Status:** Approved  
**Version:** v1.4 Amendment  
**Owner:** David  
**Approved Date:** 2026-05-24  
**Applies To:** `/docs/team_charter/TEAM_CHARTER.md` v1.3  

---

## Purpose

This amendment adds the approved v1.4 operating rules to the PassTo Engineering Team Operating Charter.

Until the main charter is consolidated, this amendment is part of the active PassTo operating charter and should be read with `/docs/team_charter/TEAM_CHARTER.md`.

---

## Version History Entry

Add to the charter version history:

| Version | Date | Approved By | Summary |
|---|---:|---|---|
| v1.4 | 2026-05-24 | David | Added Claude-direct assignment spec stubs, startup read scope, Class B Codex-unavailable exception, retrospective-review status, and PM-level MVP architecture guidance |

---

## PM-Level MVP Architecture Guidance

David’s technical skill level should be treated as that of a Product Manager: familiar with development terminology but not expected to write code.

Codex should focus on MVP architecture and explain decisions in clear product/technical language. Codex must not assume David will inspect or author code directly.

Codex should clearly separate:

- Product implications
- Operational risk
- Implementation complexity
- Security and data exposure risk
- Future optionality
- MVP tradeoffs

Codex must bias toward MVP simplicity unless a more complex approach prevents a clear near-term risk.

---

## 4.1 Claude-Direct Assignment — No Codex Spec Available

When David assigns a task directly to Claude and no Codex-authored spec exists, Claude must not begin execution immediately.

Claude must first draft a spec stub using the standard task metadata format in Section 6 of the main charter.

The spec stub must include, at minimum:

- Task ID
- Title
- Owner
- Status
- Product Goal
- Technical Scope
- Out of Scope
- Routes Affected
- Components Affected
- Database/Tables Affected
- Integrations Affected
- Security/RLS Impact
- Design System Impact
- Acceptance Criteria
- Known Risks / Issues

Claude must submit the spec stub to David for approval before executing.

The task status must be marked:

```text
Spec Drafted — Awaiting David Approval
```

David approval of a Claude-drafted spec stub authorizes Claude execution.

Codex reviews the implementation during QA as normal.

A Claude-drafted spec stub does not replace Codex ownership of the QA Plan. If no Codex-authored QA Plan exists at execution time, Claude must document the test steps taken and explicitly flag the missing Codex QA Plan in implementation notes.

Codex should perform retrospective QA and may require remediation if the implementation does not meet architecture, security, design-system, or Definition of Done standards.

---

## 9.2.1 Class B Code Work When Codex Is Unavailable

If Codex approval is required for Class B code-touching work and Codex is unavailable, David approval may substitute for Codex approval.

This exception applies only to Class B work as defined in Section 9.2 of the main charter.

Claude must document:

- Why Codex approval was unavailable
- Why the work qualifies as Class B
- What files were changed
- Why no product behavior, architecture, security, data model, integration, deployment, user experience, design standard, brand standard, customer-facing asset, or acceptance criterion was changed
- What tests or checks were performed
- That Codex retrospective review is required

The task status after execution should be:

```text
Ready for Codex Retrospective Review
```

Codex should perform retrospective review when next available and may require remediation.

This exception cannot be used for Class A work.

Class A work always requires David approval and must follow the normal task approval process.

---

## 17.3 Startup Read Scope

### Minimal Read — Required at the Start of Every Session

At the start of every PassTo session, Codex or Claude must review:

```text
/docs/team_charter/
/docs/tasks/
/docs/activity_log/ACTIVITY_LOG.md
```

The minimal read is sufficient for short continuation sessions where the current task is clear and no new product, architecture, security, data, design, or integration decision is being made.

### Full Read — Required for New or Higher-Impact Work

A full read is required for:

- First session in a new chat
- New feature work
- New flow work
- Architecture work
- Security/RLS work
- Data model work
- Integration work
- Production-impacting work
- Design-system-impacting work
- Work after a gap of more than a few days
- Any session where current context is uncertain

Full read includes:

```text
/docs/team_charter/
/docs/tasks/
/docs/activity_log/ACTIVITY_LOG.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/RISKS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
/docs/prd/
/docs/architecture/
/docs/features/
/docs/flows/
```

### Design System Read

The design system must always be reviewed before frontend, brand, marketing, notification, PDF, verifier-facing, dashboard, or customer-facing work:

```text
/docs/design_system/
```

### Default Rule

If there is any uncertainty about which read scope applies, perform the full read.

---

## Closeout Status Addition

Add the following status to the closeout status list in Section 22.4:

```text
Ready for Codex Retrospective Review
```

This status is used when Claude executes qualifying Class B work with David approval because Codex was unavailable.

---

## Consolidation Note

This amendment should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future documentation maintenance task.
