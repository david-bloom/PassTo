# PassTo Engineering Team Operating Charter — v1.6 Amendment

**Status:** Approved  
**Version:** v1.6 Amendment  
**Owner:** David  
**Approved Date:** 2026-05-24  
**Applies To:** `/docs/team_charter/TEAM_CHARTER.md` v1.3, `/docs/team_charter/TEAM_CHARTER_V1_4_AMENDMENT.md`, and `/docs/team_charter/TEAM_CHARTER_V1_5_AMENDMENT.md`  

---

## Purpose

This amendment establishes scheduled GitHub triage agents for Codex and Claude.

The goal is to reduce delay between GitHub updates and AI response without making David the message courier between Codex and Claude.

Scheduled triage improves routing and awareness. It does not reduce David’s authority as Product Owner and final approver.

Until the main charter is consolidated, this amendment is part of the active PassTo operating charter and should be read with:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/team_charter/TEAM_CHARTER_V1_4_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_5_AMENDMENT.md
```

---

## Version History Entry

Add to the charter version history:

| Version | Date | Approved By | Summary |
|---|---:|---|---|
| v1.6 | 2026-05-24 | David | Added scheduled GitHub triage agents for Codex and Claude to identify actionable labeled items, reduce routing delay, and preserve David approval authority |

---

## Scheduled GitHub Triage Agents

PassTo may use scheduled Codex and Claude triage routines to reduce delay between GitHub updates and AI response.

GitHub labels are the routing mechanism. Task files, issue/PR comments, and activity logs remain the durable source of truth.

Scheduled triage agents may:

- Route attention to the correct role.
- Summarize actionable GitHub items.
- Identify blockers and risks.
- Prepare recommended responses.
- Recommend next actions.
- Flag items requiring David approval.

Scheduled triage agents may not:

- Execute Class A work.
- Approve task specs.
- Close tasks.
- Accept risks on David’s behalf.
- Make product scope decisions.
- Make architecture decisions that require David approval.
- Make security/data/integration/deployment decisions that require David approval.
- Mark work Done.

---

## Codex Triage Routine

Codex triage should scan GitHub for items labeled:

```text
assigned: codex
needs: codex-review
status: ready-for-codex-qa
status: blocked
```

Codex triage should produce a short actionable summary containing:

1. Items needing Codex action.
2. Blockers or risks.
3. Claude questions requiring architecture, QA, or security response.
4. Items needing David approval.
5. Recommended Codex next action.

Codex triage should not execute work unless the work is already approved and permitted under the charter.

If Codex identifies Class A work, Codex must route it to David for approval.

---

## Claude Triage Routine

Claude triage should scan GitHub for items labeled:

```text
assigned: claude
needs: claude-response
status: ready-for-review
needs: claude-remediation
```

Claude triage should produce a short actionable summary containing:

1. Items needing Claude action.
2. Codex review notes requiring response.
3. Remediation requests.
4. Blockers, deviations, false assumptions, or structural concerns.
5. Items needing David approval.
6. Recommended Claude next action.

Claude triage should not begin execution unless the task is approved and permitted under the charter.

If Claude identifies a structural concern, false assumption, or Class A scope issue, Claude must pause and document the concern under the normal escalation rules.

---

## David Triage Routing

When either Codex or Claude identifies an item requiring David’s decision, approval, risk acceptance, priority call, or Done review, the item should be labeled:

```text
assigned: david
needs: david-approval
```

The relevant task file, issue, PR, or comment must include a clear approval or decision request.

David remains final approver for:

- Class A work.
- Product scope changes.
- Architecture changes requiring approval.
- Security, data, integration, deployment, or production-impacting decisions.
- Risk acceptance.
- Done decisions.

---

## Recommended Cadence

During active MVP build periods, recommended triage cadence is:

```text
Codex triage: weekday morning and afternoon
Claude triage: weekday morning and afternoon
David triage: once daily, or when `needs: david-approval` exists
```

If work is moving quickly, Codex and Claude triage may run every 2–3 hours during working hours.

Cadence may be adjusted by David based on project pace.

---

## Triage Output Format

Scheduled triage output should use this format:

```markdown
## Scheduled Triage — YYYY-MM-DD — [Codex/Claude]

**Role:**  
**Scope Checked:**  
**Labels Checked:**  
**Summary:**  

### Actionable Items

-

### Blockers / Risks

-

### Items Requiring David Approval

-

### Recommended Next Action

-

### Notes

-
```

If the triage identifies a blocking issue, the issue or task should also use the blocked-session or blocked-task closeout format from the main charter where appropriate.

---

## Label Hygiene for Triage

Triage routines should respect the label-routing rules in the v1.5 amendment.

Labels should be updated when ownership or status changes.

Examples:

- Remove `needs: claude-response` after Claude responds.
- Remove `needs: codex-review` after Codex review is complete.
- Remove `needs: david-approval` after David approval or rejection is captured.
- Move from `assigned: claude` to `assigned: codex` when implementation is ready for Codex QA.
- Move from `assigned: codex` to `assigned: david` when Codex QA is complete and David Done review is needed.

Labels must not be used as the only record of project state.

Task files, issue/PR comments, and activity logs remain source of truth.

---

## Consolidation Note

This amendment should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future documentation maintenance task together with v1.4 and v1.5.
