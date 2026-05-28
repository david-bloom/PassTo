# Session Activity — 2026-05-28 — Codex

**Task ID:** PRD Section 3 Claude Execution Sequence
**Status:** Spec Drafted — Awaiting David Approval
**Role:** Codex / Engineering Director
**Summary:** Converted PRD Section 3 launch-critical user journeys into an ordered Claude execution sequence. Initial numbering accidentally collided with existing confirmed tasks; this record has been corrected so the Section 3 journey specs are `TASK-0031` through `TASK-0043`.

## Work Completed

- Updated `/docs/tasks/PRD_SECTION_03_MASTER_TASK_LIST.md` with a corrected Claude execution sequence.
- Restored the original GitHub versions of `TASK-0018` through `TASK-0026` from history.
- Removed the misnumbered Section 3 journey files `TASK-0027` through `TASK-0030`.
- Created individual Claude task specs for the Section 3 journey implementation path:
  - `TASK-0031` — Account profile foundation and onboarding routing.
  - `TASK-0032` — ID.me backend exchange and callback wiring.
  - `TASK-0033` — Twilio phone verification.
  - `TASK-0034` — License lookup journey.
  - `TASK-0035` — Data matching journey.
  - `TASK-0036` — Selfie capture and protected Supabase Storage upload.
  - `TASK-0037` — Credential creation gate.
  - `TASK-0038` — Automatic wallet pass issuance and PassReady flow.
  - `TASK-0039` — Nurse dashboard launch-critical status and actions.
  - `TASK-0040` — Stripe subscription state and entitlement gating.
  - `TASK-0041` — Share-link token creation journey.
  - `TASK-0042` — Verifier token validation and credential view.
  - `TASK-0043` — Admin/ops visibility and journey failure-state coverage.

## Files / Docs Changed

- `/docs/tasks/PRD_SECTION_03_MASTER_TASK_LIST.md`
- `/docs/tasks/TASK-0031.md`
- `/docs/tasks/TASK-0032.md`
- `/docs/tasks/TASK-0033.md`
- `/docs/tasks/TASK-0034.md`
- `/docs/tasks/TASK-0035.md`
- `/docs/tasks/TASK-0036.md`
- `/docs/tasks/TASK-0037.md`
- `/docs/tasks/TASK-0038.md`
- `/docs/tasks/TASK-0039.md`
- `/docs/tasks/TASK-0040.md`
- `/docs/tasks/TASK-0041.md`
- `/docs/tasks/TASK-0042.md`
- `/docs/tasks/TASK-0043.md`
- `/docs/activity_log/SESSION_2026-05-28_PRD_SECTION_03_TASK_SEQUENCE.md`

## Decisions / Direction Captured

- Claude should execute Section 3 implementation tasks in the sequence recorded in `/docs/tasks/PRD_SECTION_03_MASTER_TASK_LIST.md`.
- The corrected task range is `TASK-0031` through `TASK-0043`.
- Existing `TASK-0018` through `TASK-0026` retain their original GitHub history and meaning.
- Each new Section 3 task remains Class A implementation work and is not approved for execution until David approval is recorded.
- Deferred journeys remain out of launch scope unless David explicitly reopens them.

## Risks / Issues

- The first Section 3 sequence draft used task IDs that collided with existing confirmed tasks. This has been corrected in GitHub.
- The local workspace is not currently recognized as a Git checkout by `git status`; GitHub repair was handled through GitHub file updates rather than local git.
- Broader backlog files may still contain stale references to earlier task numbers from before TASK-0011 through TASK-0026 were completed.

## Approval Needed

- David approval is required before Claude executes `TASK-0031` through `TASK-0043`.

## Next Recommended Action

David should review the corrected Section 3 execution sequence. If approved, record approval for `TASK-0031` first or for the full ordered sequence, then trigger Claude with `C` when ready.

## Handoff Notes

Claude should read:

```text
/docs/tasks/PRD_SECTION_03_MASTER_TASK_LIST.md
/docs/tasks/TASK-0031.md
/docs/tasks/TASK-0032.md
/docs/tasks/TASK-0033.md
/docs/tasks/TASK-0034.md
/docs/tasks/TASK-0035.md
/docs/tasks/TASK-0036.md
/docs/tasks/TASK-0037.md
/docs/tasks/TASK-0038.md
/docs/tasks/TASK-0039.md
/docs/tasks/TASK-0040.md
/docs/tasks/TASK-0041.md
/docs/tasks/TASK-0042.md
/docs/tasks/TASK-0043.md
```
