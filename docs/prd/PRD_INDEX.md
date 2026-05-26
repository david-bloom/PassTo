# PassTo PRD Index

**Status:** Active PRD Source Map  
**Owner:** David Bloom  
**Maintained By:** Codex and Claude  
**Created:** 2026-05-26  

## Purpose

This file defines where the PassTo PRD is maintained in GitHub.

The active PRD process is section-based: each PRD section is drafted, reviewed, approved, and paired with a master task list.

GitHub is the source of truth for PRD work.

## Active Section-Based PRD Files

| Section | File | Status | Associated Task List |
|---|---|---|---|
| Section 1 — Product Summary, Technical Context, and Current Build State | `docs/prd/PASS_TO_PRD.md` Section 1 / local section baseline | Approved by David | `docs/tasks/PRD_SECTION_01_MASTER_TASK_LIST.md` |
| Section 2 — Users, MVP Goals, and Scope Boundaries | `docs/prd/PRD_SECTION_02_USERS_GOALS_SCOPE.md` | Draft for David Review | `docs/tasks/PRD_SECTION_02_MASTER_TASK_LIST.md` |
| Section 3 — End-to-End MVP User Journeys | `docs/prd/PRD_SECTION_03_USER_JOURNEYS.md` | Draft for David Review | `docs/tasks/PRD_SECTION_03_MASTER_TASK_LIST.md` |
| Section 4 — Data Model, RLS, and Backend Responsibilities | `docs/prd/PRD_SECTION_04_DATA_RLS_BACKEND.md` | Draft for David Review | `docs/tasks/PRD_SECTION_04_MASTER_TASK_LIST.md` |
| Section 5 — Feature Requirements | `docs/prd/PRD_SECTION_05_FEATURE_REQUIREMENTS.md` | Draft for David Review | `docs/tasks/PRD_SECTION_05_MASTER_TASK_LIST.md` |
| Section 6 — Integrations, Failure States, and Admin/Ops | `docs/prd/PRD_SECTION_06_INTEGRATIONS_FAILURE_OPS.md` | Draft for David Review | `docs/tasks/PRD_SECTION_06_MASTER_TASK_LIST.md` |
| Section 7 — Launch Readiness, QA, and Open Decisions | `docs/prd/PRD_SECTION_07_LAUNCH_QA_DECISIONS.md` | Draft for David Review | `docs/tasks/PRD_SECTION_07_MASTER_TASK_LIST.md` |

## Existing Full PRD Draft

| File | Status | Notes |
|---|---|---|
| `docs/prd/PASS_TO_PRD.md` | Older full draft / baseline reference | Do not treat as final until reconciled with approved section files. |

## Maintenance Rule

New PRD work should be added as section-specific files first, then reconciled into the full PRD after David approval.

Do not overwrite the full `PASS_TO_PRD.md` with section drafts until David approves consolidation.

## Current Section Workflow

1. Draft section-specific PRD file.
2. Draft matching `PRD_SECTION_XX_MASTER_TASK_LIST.md`.
3. David reviews and approves checklist.
4. Mark section and task list approved.
5. Update this index.
6. Reconcile approved sections into the full PRD when David requests consolidation.

## Current PRD Status

```text
Section 1: Approved by David
Sections 2-7: Draft for David Review
```

## Next PRD Step

```text
David review and approval of Sections 2-7, then consolidation into full PASS_TO_PRD.md when requested.
```
