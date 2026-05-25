# PassTo Engineering Team Operating Charter — v1.8 Amendment

**Status:** Approved  
**Version:** v1.8 Amendment  
**Owner:** David  
**Approved Date:** 2026-05-24  
**Applies To:** `/docs/team_charter/TEAM_CHARTER.md` v1.3 and active amendments v1.4, v1.5, v1.6, and v1.7  

---

## Purpose

This amendment establishes the `C` / `c` handshake for the PassTo GitHub review loop.

The goal is to give David a very small control surface for moving work between Codex and Claude without manually copying every review note, finding, remediation item, or status update between tools.

`C` means the other agent has likely moved; the active agent must re-scan GitHub, find repo-visible work assigned to them, take their turn, and write the result back to GitHub.

GitHub remains the source of truth.

---

## Version History Entry

Add to the charter version history:

| Version | Date | Approved By | Summary |
|---|---:|---|---|
| v1.8 | 2026-05-24 | David | Added the `C` / `c` handshake for repo-visible Codex/Claude review loops |

---

## C Handshake

David may type `C` or `c` alone in a Codex or Claude session to trigger the GitHub review loop.

The `C` handshake means:

```text
The other agent may have moved. Re-scan GitHub now and take your turn in the repo-visible review loop.
```

The active agent must not answer from chat memory.

The active agent must inspect the relevant GitHub artifacts before responding.

Relevant GitHub artifacts may include:

- Issues
- Pull requests
- Task files
- Review files
- Activity logs
- Decision logs
- Approval logs
- Risk logs
- Linked implementation artifacts
- Label-routed items

---

## C in Codex

When David types `C` or `c` alone in a Codex session, it means:

```text
Codex, re-scan GitHub now for Claude’s latest work, review anything assigned to Codex, and respond in the repo-visible thread.
```

Codex must check for items labeled:

```text
assigned: codex
needs: codex-review
status: ready-for-codex-qa
status: blocked
```

Codex should inspect the actual implementation files, PRs, issues, task docs, and tests before responding.

Codex must compare Claude’s claims against repo-visible artifacts.

Codex must post review results back into the relevant GitHub issue, PR, or task file.

Codex may summarize the result in chat after the GitHub record is updated or inspected.

Codex must not approve migration, merge, deployment, Done, or Class A changes unless the normal approval requirements are met.

---

## C in Claude

When David types `C` or `c` alone in a Claude session, it means:

```text
Claude, Codex has likely replied. Pull or inspect the repo-visible review, act on every item, append your response to the same GitHub issue, PR, or task file, commit/push if needed, and report status.
```

Claude must check for items labeled:

```text
assigned: claude
needs: claude-response
needs: claude-remediation
status: blocked
```

Claude must inspect the relevant Codex review files, PR comments, issue comments, task docs, and labels before responding.

Claude must update the same GitHub issue, PR, or task file rather than relying on chat-only response.

Claude must not begin new unapproved Class A work.

Claude must not merge, deploy, apply production migrations, accept risks, or mark tasks Done unless the normal approval requirements are met.

---

## C Handshake Limits

The `C` handshake is a routing and review-loop trigger only.

It does not:

- Authorize new Class A work.
- Replace David approval.
- Replace Codex QA.
- Replace Claude implementation notes.
- Replace task metadata.
- Authorize merge.
- Authorize deployment.
- Authorize production migration.
- Authorize risk acceptance.
- Authorize Done decisions.

If the active agent discovers that the next action requires David approval, the item must be labeled:

```text
assigned: david
needs: david-approval
```

and the approval request must be written into the relevant GitHub issue, PR, or task file.

---

## Source-of-Truth Rule

`C` never means “continue from memory.”

`C` always means “read GitHub first.”

If a claim exists only in chat and not in GitHub, it is not sufficient for the `C` loop.

The active agent should ask for, create, or require a repo-visible artifact before treating work as ready for review.

---

## Recommended C Response Format

After a `C` handshake, the active agent should respond in chat with a short status summary:

```markdown
## C Handshake Result — [Codex/Claude]

**GitHub Checked:** Yes / No  
**Items Found:**  
**Action Taken:**  
**GitHub Updated:** Yes / No  
**Next Owner:** Codex / Claude / David  
**Next Required Action:**  
```

The durable details must live in GitHub.

---

## Relationship to Scheduled Triage

The `C` handshake complements scheduled GitHub triage.

Scheduled triage runs on a cadence.

`C` is David’s manual immediate trigger when he wants the active agent to take its next turn now.

Both mechanisms use the same GitHub labels and source-of-truth rules.

---

## Consolidation Note

This amendment should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future documentation maintenance task together with v1.4, v1.5, v1.6, and v1.7.
