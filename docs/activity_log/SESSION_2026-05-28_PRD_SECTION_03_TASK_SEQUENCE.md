# Session Activity — 2026-05-28 — Codex

**Task ID:** PRD Section 3 Claude Execution Sequence
**Status:** Spec Drafted — Awaiting David Approval
**Role:** Codex / Engineering Director
**Summary:** Converted PRD Section 3 launch-critical user journeys into an ordered Claude execution sequence and created task specs `TASK-0018` through `TASK-0030`.

## Work Completed

- Updated `/docs/tasks/PRD_SECTION_03_MASTER_TASK_LIST.md` with a Claude execution sequence.
- Created individual Claude task specs for the Section 3 journey implementation path:
  - `TASK-0018` — Account profile foundation and onboarding routing.
  - `TASK-0019` — ID.me backend exchange and callback wiring.
  - `TASK-0020` — Twilio phone verification.
  - `TASK-0021` — License lookup journey.
  - `TASK-0022` — Data matching journey.
  - `TASK-0023` — Selfie capture and protected Supabase Storage upload.
  - `TASK-0024` — Credential creation gate.
  - `TASK-0025` — Automatic wallet pass issuance and PassReady flow.
  - `TASK-0026` — Nurse dashboard launch-critical status and actions.
  - `TASK-0027` — Share-link token creation journey.
  - `TASK-0028` — Verifier token validation and credential view.
  - `TASK-0029` — Stripe subscription state and entitlement gating.
  - `TASK-0030` — Admin/ops visibility and journey failure-state coverage.

## Files / Docs Changed

- `/docs/tasks/PRD_SECTION_03_MASTER_TASK_LIST.md`
- `/docs/tasks/TASK-0018.md`
- `/docs/tasks/TASK-0019.md`
- `/docs/tasks/TASK-0020.md`
- `/docs/tasks/TASK-0021.md`
- `/docs/tasks/TASK-0022.md`
- `/docs/tasks/TASK-0023.md`
- `/docs/tasks/TASK-0024.md`
- `/docs/tasks/TASK-0025.md`
- `/docs/tasks/TASK-0026.md`
- `/docs/tasks/TASK-0027.md`
- `/docs/tasks/TASK-0028.md`
- `/docs/tasks/TASK-0029.md`
- `/docs/tasks/TASK-0030.md`
- `/docs/activity_log/SESSION_2026-05-28_PRD_SECTION_03_TASK_SEQUENCE.md`

## Decisions / Direction Captured

- Claude should execute Section 3 implementation tasks in the sequence recorded in `/docs/tasks/PRD_SECTION_03_MASTER_TASK_LIST.md`.
- Each task remains Class A implementation work and is not approved for execution until David approval is recorded.
- Deferred journeys remain out of launch scope unless David explicitly reopens them.

## Risks / Issues

- The local workspace is not currently recognized as a Git checkout by `git status`; GitHub upload was handled through GitHub file updates rather than local git.
- The broader backlog files may still contain stale references to earlier task numbers from before TASK-0011 through TASK-0017 were completed.

## Approval Needed

- David approval is required before Claude executes `TASK-0018` through `TASK-0030`.

## Next Recommended Action

David should review the Section 3 execution sequence. If approved, record approval for `TASK-0018` first or for the full ordered sequence, then trigger Claude with `C` when ready.

## Handoff Notes

Claude should read:

```text
/docs/tasks/PRD_SECTION_03_MASTER_TASK_LIST.md
/docs/tasks/TASK-0018.md
/docs/tasks/TASK-0019.md
/docs/tasks/TASK-0020.md
/docs/tasks/TASK-0021.md
/docs/tasks/TASK-0022.md
/docs/tasks/TASK-0023.md
/docs/tasks/TASK-0024.md
/docs/tasks/TASK-0025.md
/docs/tasks/TASK-0026.md
/docs/tasks/TASK-0027.md
/docs/tasks/TASK-0028.md
/docs/tasks/TASK-0029.md
/docs/tasks/TASK-0030.md
```
