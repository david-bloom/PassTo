# PassTo Engineering Team Operating Charter — v1.5 Amendment

**Status:** Approved  
**Version:** v1.5 Amendment  
**Owner:** David  
**Approved Date:** 2026-05-24  
**Applies To:** `/docs/team_charter/TEAM_CHARTER.md` v1.3 and `/docs/team_charter/TEAM_CHARTER_V1_4_AMENDMENT.md`  

---

## Purpose

This amendment establishes GitHub label-based routing for Codex, Claude, and David.

Because Claude does not have a GitHub username, GitHub labels should be used instead of `@mentions` to indicate ownership, response needs, and review focus.

Until the main charter is consolidated, this amendment is part of the active PassTo operating charter and should be read with:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/team_charter/TEAM_CHARTER_V1_4_AMENDMENT.md
```

---

## Version History Entry

Add to the charter version history:

| Version | Date | Approved By | Summary |
|---|---:|---|---|
| v1.5 | 2026-05-24 | David | Added GitHub label-based routing for Codex, Claude, and David assignments, review needs, and approval needs |

---

## GitHub Labels for AI Team Assignment

Because Claude does not have a GitHub username, Codex, Claude, and David should use GitHub labels to route attention and response ownership.

Labels are routing aids only. They do not replace task status, task metadata, task files, activity-log updates, or approval records.

The durable source of truth remains the relevant GitHub documentation file.

---

## Approved Assignment Labels

Use these labels to indicate who should focus on an issue, PR, or task thread:

```text
assigned: codex
assigned: claude
assigned: david
```

### Usage

- Use `assigned: codex` when Codex owns the next action, review, spec, architecture decision, or QA pass.
- Use `assigned: claude` when Claude owns the next action, implementation response, remediation, or engineering challenge.
- Use `assigned: david` when David owns the next decision, approval, priority call, or Done decision.

---

## Approved Response-Needed Labels

Use these labels when a specific role needs to respond before work continues:

```text
needs: codex-review
needs: claude-response
needs: david-approval
```

### Usage

- Use `needs: codex-review` when Claude needs Codex review, QA, architecture decision, or remediation guidance.
- Use `needs: claude-response` when Codex needs Claude to respond to review notes, implementation questions, or remediation requests.
- Use `needs: david-approval` when Codex or Claude needs David approval, product direction, risk acceptance, or Done decision.

---

## Approved Status Labels

Use these labels to make issue/PR/task state easier to filter:

```text
status: blocked
status: ready-for-review
status: ready-for-codex-qa
status: ready-for-david-review
```

### Usage

- Use `status: blocked` when work cannot continue safely.
- Use `status: ready-for-review` when a general review is needed.
- Use `status: ready-for-codex-qa` when implementation is ready for Codex QA or architectural review.
- Use `status: ready-for-david-review` when work is ready for David review or Done decision.

---

## Codex-to-Claude Routing Rule

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

## Claude-to-Codex Routing Rule

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

## David Decision Routing Rule

When Codex or Claude needs David’s decision, approval, risk acceptance, or Done review, the item should be labeled:

```text
assigned: david
needs: david-approval
```

The related task file or comment should include a clear David Approval Request or David Done Decision block.

---

## Label Hygiene

Labels should be updated when ownership or status changes.

Examples:

- Remove `needs: claude-response` after Claude responds.
- Remove `needs: codex-review` after Codex review is complete.
- Remove `needs: david-approval` after David approval or rejection is captured.
- Move from `assigned: claude` to `assigned: codex` when implementation is ready for Codex QA.
- Move from `assigned: codex` to `assigned: david` when Codex QA is complete and David Done review is needed.

Labels must not be used as the only record of project state.

Task files and activity logs remain source of truth.

---

## Consolidation Note

This amendment should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future documentation maintenance task.
