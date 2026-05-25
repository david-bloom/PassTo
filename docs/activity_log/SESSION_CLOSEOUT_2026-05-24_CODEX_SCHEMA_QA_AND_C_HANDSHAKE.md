# Session Closeout — 2026-05-24 — Codex

**Task ID:** Session Closeout / Claude Task 001 QA / Charter Amendments  
**Status:** Closed  
**Role:** Codex / Engineering Director  
**Summary:** Closed the PassTo session after executing Codex QA on Claude Task 001, routing remediation back to Claude through GitHub Issue #1, capturing migration-blocking MVP decisions, and adding the approved v1.8 `C` handshake charter amendment.

---

## Work Completed

- Executed Codex QA on Claude Task 001 — Supabase MVP Schema Spike.
- Created formal Codex QA review file:
  - `/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md`
- Posted QA result into GitHub Issue #1.
- Routed Issue #1 to Claude using labels:
  - `assigned: claude`
  - `needs: claude-response`
  - `status: blocked`
- Created migration-blocking decision file:
  - `/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md`
- Added approved charter amendment for `C` / `c` handshake:
  - `/docs/team_charter/TEAM_CHARTER_V1_8_AMENDMENT.md`
- Updated approvals log for v1.8:
  - `/docs/activity_log/APPROVALS_LOG.md`

---

## Codex QA Result

```text
Codex QA Result: Changes Required
Migration Approval: Not Approved
Safe to Apply to Supabase: No
Ready for David Done Review: No
Next Owner: Claude
```

Claude’s schema spike was substantive and useful, but it is not migration-ready.

Primary blockers:

- Verifier/share schema diverges from canonical architecture.
- Verifier organization is still collected despite the approved MVP name/email-only rule.
- Verifier email appears nurse-readable.
- Raw share tokens are stored instead of hashes.
- Nurse direct token/share insert may bypass payment and entitlement gates.
- License status and wallet treatment model need alignment with approved status translation.
- Token status needs explicit mutually exclusive state or a justified alternative.
- Paid-action tracking is too thin for share, refresh, PDF, and additional-license pricing.
- Event/job table decisions need resolution.
- Data retention/account deletion posture needed to be captured before migration.

---

## Decisions Made

David confirmed the following migration-blocking MVP decisions:

1. Retain operational, audit, payment, and verification records for 7 years unless legal counsel later changes this.
2. Share-link verification tokens expire after 72 hours or first successful use, whichever comes first.
3. Show-QR tokens expire after 45 minutes or first use, whichever comes first.
4. Free users may maintain 1 license only and cannot purchase additional licenses in MVP.
5. Standard users include 1 license and may buy additional licenses for $4.99 each.
6. Premier users include 2 licenses and may buy additional licenses for $4.99 each.
7. Standard subscription price is $9.99/month.
8. Premier subscription price is $19.99/month.
9. Generated PDFs are stored in Supabase Storage.
10. PDF records are tracked in a `pdf_exports` table.
11. PDF download access is controlled by authenticated nurse access or short-lived signed URLs.
12. PDFs are static records and include the approved static PDF disclaimer.

David also approved:

```text
Charter v1.8 — C Handshake for GitHub Review Loop
```

---

## Files / Docs Changed

- `/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md`
- `/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md`
- `/docs/team_charter/TEAM_CHARTER_V1_8_AMENDMENT.md`
- `/docs/activity_log/APPROVALS_LOG.md`
- `/docs/activity_log/SESSION_CLOSEOUT_2026-05-24_CODEX_SCHEMA_QA_AND_C_HANDSHAKE.md`

---

## GitHub Issue State

Issue #1 remains open:

```text
Codex QA Review: Claude Task 001 — Supabase MVP Schema Spike
```

Current intended labels:

```text
assigned: claude
needs: claude-response
status: blocked
```

Claude should remediate and then relabel:

```text
assigned: codex
needs: codex-review
status: ready-for-codex-qa
```

---

## Open Questions

- PDF QR token TTL still requires confirmation if PDF QR remains in MVP.
- Terms of Use still requires final drafting.
- Legal counsel may later modify the 7-year retention period.
- Main charter should eventually be consolidated from v1.4 through v1.8 amendments.
- Main decisions log should eventually reference or absorb `DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md`.

---

## Approval Needed

No new approval is needed to close this session.

Pending future approvals:

- David approval before any Supabase migration is applied.
- David Done decision for Claude Task 001 after Claude remediation and Codex re-review.
- David approval for final Terms of Use language.
- David approval if PDF QR token TTL remains part of MVP.

---

## Next Recommended Action

David should give Claude the remediation assignment already prepared in chat:

```text
Claude Task 001-R — Remediate Supabase MVP Schema Spike After Codex QA
```

Claude must read:

```text
/docs/tasks/2026-05-24-claude-task-001-supabase-schema-implementation.md
/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
GitHub Issue #1
```

Claude must not apply any migration to Supabase.

After Claude remediates, David can type `C` in Codex to trigger immediate Codex re-review from GitHub.

---

## Handoff Notes

Next Codex session should begin with:

```text
Codex, let’s start a new PassTo session.
```

or, if Claude has already responded/remediated:

```text
C
```

Codex should read:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/team_charter/TEAM_CHARTER_V1_4_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_5_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_6_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_7_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_8_AMENDMENT.md
/docs/tasks/2026-05-24-claude-task-001-supabase-schema-implementation.md
/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
GitHub Issue #1
```

---

## Closeout Rule

Project state from this session has been written to GitHub. Chat memory is not required for the next session to continue safely.
