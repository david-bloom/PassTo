# PassTo Engineering Team Operating Charter — v1.11 Amendment

**Status:** Approved
**Version:** v1.11 Amendment
**Owner:** David
**Approved Date:** 2026-06-23
**Applies To:** `/docs/team_charter/TEAM_CHARTER.md` v1.3 and active amendments v1.4 through v1.10

---

## Purpose

This amendment ports the portable improvements adopted for Cramapple (see `david-bloom/Cramapple` `APPROVAL-0022`, `APPROVAL-0023`, `DECISION-0029`, `DECISION-0030`, and `docs/proposals/2026-06-23-kit-simplification-memo.md` in that repo) into PassTo's own existing structure and vocabulary — Class A/B/C, `C` Handshake, Codex-does-QA — rather than importing Cramapple's terminology wholesale. The diagnosis is the same one that motivated v1.8 (an undersized handshake trigger) and Class A's "if unclear, escalate" default: process machinery applied uniformly costs more than it should on routine work.

## 1. Replace the `C` / `c` Handshake with `SYNC`

**Problem (same root cause as v1.8 solved differently elsewhere):** a single character is too easy to fire by accident in normal chat, code, or a typo. A false trigger costs little; a missed deliberate one costs more, because the user believes a sync happened when it didn't.

**Change:** the handshake trigger is now `SYNC` (uppercase, standalone), replacing `C`/`c` everywhere in `AI_COLLABORATION_RULES.md`'s "C Handshake" section (`C in Codex`, `C in Claude`, `C Limits`). All behavior under that section — what Codex checks, what Claude checks, and the `C Limits` list of things the handshake does *not* authorize — is unchanged; only the trigger string changes. Rename the section "SYNC Handshake" going forward.

## 2. Class A's "if unclear, escalate" default gets a clarify-vs-gate split

**Problem:** `TASK_WORKFLOW.md`'s Class A definition ends with "Default rule: if classification is unclear, it is Class A." That conflates "I'm not sure what this is" with "this needs David's explicit approval" — most ambiguity just needs a one-line clarifying question, not a full Class A cycle.

**Change:** replace the blanket default with:
- ambiguous, reversible, and low blast radius → ask one clarifying question, proceed under Class C or B as appropriate;
- ambiguous and irreversible, or high blast radius (touches product, architecture, security, data, integrations, deployment, design standards, brand standards, customer-facing assets, or acceptance criteria) → Class A, unchanged.

This does not narrow what Class A actually covers — it only changes what happens when classification itself, not the underlying risk, is unclear.

## 3. Codex QA auto-triggers on Class A/B work

**Problem:** today, Claude sets a task to `Ready for Codex QA` and then David (or the `C`/`SYNC` handshake) is the thing that actually gets Codex to look at it. QA is available on request, not automatic.

**Change:** Claude setting status to `Ready for Codex QA` on Class A or Class B work *is* the trigger — Codex should treat that status, on its own, as a standing instruction to review, the same way the `SYNC` handshake already tells Codex to re-scan. Class C (documentation hygiene only) QA stays optional, at Codex's judgment, consistent with Class C's already-lighter approval weight.

## 4. Model and Effort Policy (new)

Match reasoning depth to risk, not to which agent is assigned, and keep this portable regardless of which underlying model Codex or Claude run on:

- **Fast/default tier** — drafting, routine edits, summaries, Class C work, straightforward Class B implementation.
- **Strongest available tier** — Codex QA verdicts, Class A classification calls, and any False Assumption / Structural Concern Rule judgment.
- **Deterministic scripts and tools** — prefer a script over narrated compliance wherever the check can be mechanical (see §5 below).

This is applied automatically by whichever agent is doing the work, not negotiated with David per call. Don't keep additional model/effort variants beyond this unless they earn their place with a measurable quality or cost win.

## 5. `scripts/verify-sync.sh`

Added (ported unchanged from Cramapple — it's already generic/portable, with no Cramapple-specific assumptions). Checks, instead of relying on a narrated "synced" claim:
- clean working tree,
- local `HEAD` equals the current branch's remote tracking ref (not necessarily `main` — in-progress work on a feature branch is fully sync-compliant on its own),
- the relevant paths are present in the diff of the latest pushed commit.

Use before reporting `Ready for Codex QA`, `Ready for David Review`, or closing out a `SYNC` response.

## Explicitly Not Changed In This Amendment

Two structural issues were found while preparing this amendment and are flagged rather than fixed here, because fixing either correctly requires more context than this pass had:

- **`TASK_WORKFLOW.md`'s 13-value status list was not collapsed**, unlike the equivalent change made in Cramapple. Several of PassTo's extra states (`Paused — Structural Concern`, `Paused — False Assumption`, `Blocked — Awaiting David Approval` vs. `Blocked — External Dependency`) are tied to the specifically-documented False Assumption / Structural Concern Rule and Guardrails sections in `AI_COLLABORATION_RULES.md` — collapsing them risks losing a real, incident-motivated distinction, not just trimming naming bloat. Worth a dedicated future pass that checks each status against what triggers it before merging any of them.
- **Two separate, non-identical `DECISIONS_LOG.md` files exist**: `docs/decisions/DECISIONS_LOG.md` (709 lines, created 2026-05-26 under TASK-0008) and `docs/activity_log/DECISIONS_LOG.md` (509 lines). This is a real source-of-truth violation — two competing logs for the same record type — but reconciling 1,200+ lines of decision history into one canonical file is a separate, higher-risk task that shouldn't be guessed at inside a process-simplification amendment. Recommend David decide which is canonical before any further decision gets logged to either.

## Risks / Follow-ups

- Same leading indicators as the Cramapple adoption are worth tracking here too: Class A escalations per week, Codex QA round-trips per task.
- The status-taxonomy and dual-log issues above are open, not resolved, by this amendment.
