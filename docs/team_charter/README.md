# PassTo Team Charter

## Purpose

This folder contains the operating rules for the PassTo AI team, including roles, responsibilities, startup protocol, closeout protocol, Definition of Done, approval classes, and collaboration governance.

## Primary Document

```text
/docs/team_charter/TEAM_CHARTER.md
```

## Usage

Codex and Claude should review this folder at the start of each PassTo session.

## Active Amendments

```text
/docs/team_charter/TEAM_CHARTER_V1_11_AMENDMENT.md
```

v1.11 replaces the `C`/`c` handshake with `SYNC`; replaces Class A's "if unclear, escalate" default with a clarify-vs-gate split based on reversibility and blast radius; makes Codex QA auto-trigger on Class A/B work reaching `Ready for Codex QA` instead of waiting on a separate request; adds a Model and Effort Policy; and adds `scripts/verify-sync.sh` to replace narrated sync claims with an actual check. It also flags, without fixing, two pre-existing structural issues found while preparing it: the 13-value status list in `TASK_WORKFLOW.md`, and two non-identical `DECISIONS_LOG.md` files (`docs/decisions/` and `docs/activity_log/`).

v1.10 adds required contract integration QA gates for decoupled backend/frontend work and backend-driven routing, eligibility, entitlement, shareability, credential visibility, and cross-domain handoff behavior.
