# PassTo Activity Log

This log records meaningful PassTo operating activity, approvals, closeouts, blockers, and handoffs.

---

## Session Closeout — 2026-05-23 — Codex

**Task ID:** N/A — Operating Charter / Documentation System Setup  
**Status:** Done  
**Role:** Codex / Engineering Director  
**Summary:** Created and iteratively updated the PassTo Engineering Team Operating Charter and design-system documentation structure. Established GitHub as the source of truth for AI-team collaboration, task governance, design-system references, startup protocol, and close-of-session protocol.

### Work Completed

- Created `/docs/team_charter/TEAM_CHARTER.md`.
- Updated the charter through v1.3.
- Captured approved canonical documentation folders.
- Captured Option A Claude-GitHub-Codex review/respond workflow with David as final approver.
- Captured Definition of Done and task metadata requirements.
- Added approval classes and GitHub review triggers.
- Added false-assumption escalation and task granularity rules.
- Added blocked approval protocol.
- Added `/docs/design_system/` as a canonical folder.
- Added design-system impact requirements to task metadata and governance rules.
- Created `/docs/design_system/README.md`.
- Updated `/docs/design_system/README.md` to reflect actual asset structure:
  - `/docs/design_system/logos/`
  - `/docs/design_system/screenshots/`
- Added close-of-session protocol to the charter as v1.3.

### Files / Docs Changed

- `/docs/team_charter/TEAM_CHARTER.md`
- `/docs/design_system/README.md`
- `/docs/activity_log/ACTIVITY_LOG.md`

### Decisions Made

- GitHub documentation is the PassTo source of truth.
- Canonical documentation folders are:
  - `/docs/team_charter/`
  - `/docs/prd/`
  - `/docs/architecture/`
  - `/docs/tasks/`
  - `/docs/activity_log/`
  - `/docs/features/`
  - `/docs/flows/`
  - `/docs/design_system/`
- Official startup trigger:
  - `[Codex/Claude], let’s start a new PassTo session.`
- Official close trigger:
  - `[Codex/Claude], close the PassTo session.`
- David remains final approver.
- Codex owns security architecture, specs, QA plans, and architectural review.
- Claude owns execution, implementation notes, deviations, test results, and risk reporting.

### Risks / Issues

- The supporting activity-log files referenced by the charter may still need to be created:
  - `/docs/activity_log/DECISIONS_LOG.md`
  - `/docs/activity_log/RISKS_LOG.md`
  - `/docs/activity_log/APPROVALS_LOG.md`
- The canonical folders may need README files for easier navigation and AI startup review.
- Future sessions must avoid relying on this chat unless the relevant context has been written into GitHub.

### Open Questions

- Should Codex create initial templates for task specs, decision logs, risk logs, and approval logs?
- Should the design-system asset inventory be indexed with exact filenames for easier task references?

### Approval Needed

- No approval needed for this closeout entry.
- Future creation of additional templates may require David approval depending on scope.

### Next Recommended Action

Codex should next create the foundational templates for:

- `/docs/tasks/TASK_TEMPLATE.md`
- `/docs/activity_log/DECISIONS_LOG.md`
- `/docs/activity_log/RISKS_LOG.md`
- `/docs/activity_log/APPROVALS_LOG.md`
- README files for the canonical documentation folders

### Handoff Notes

Next session should begin with:

```text
Codex, let’s start a new PassTo session.
```

Codex should read `/docs/team_charter/TEAM_CHARTER.md`, `/docs/activity_log/ACTIVITY_LOG.md`, and `/docs/design_system/README.md` before recommending next work.

---

## Session Closeout — 2026-05-24 — Codex

**Task ID:** TASK-0001 — Create Foundational Documentation Templates  
**Status:** Ready for David Review  
**Role:** Codex / Engineering Director  
**Summary:** Created foundational task, decision, risk, approval, and folder-navigation documentation templates. Corrected the architecture documentation path so the approved `/docs/architecture/` canonical folder can exist.

### Work Completed

- Created `/docs/tasks/TASK-0001.md`.
- Created `/docs/tasks/TASK_TEMPLATE.md`.
- Created `/docs/activity_log/DECISIONS_LOG.md`.
- Created `/docs/activity_log/RISKS_LOG.md`.
- Created `/docs/activity_log/APPROVALS_LOG.md`.
- Created README files for:
  - `/docs/team_charter/README.md`
  - `/docs/prd/README.md`
  - `/docs/architecture/README.md`
  - `/docs/tasks/README.md`
  - `/docs/activity_log/README.md`
  - `/docs/features/README.md`
  - `/docs/flows/README.md`
- Removed an empty file at `/docs/architecture` that blocked creation of the approved `/docs/architecture/` folder.
- Packaged local copies of the foundational templates.

### Files / Docs Changed

- `/docs/tasks/TASK-0001.md`
- `/docs/tasks/TASK_TEMPLATE.md`
- `/docs/activity_log/DECISIONS_LOG.md`
- `/docs/activity_log/RISKS_LOG.md`
- `/docs/activity_log/APPROVALS_LOG.md`
- `/docs/team_charter/README.md`
- `/docs/prd/README.md`
- `/docs/architecture/README.md`
- `/docs/tasks/README.md`
- `/docs/activity_log/README.md`
- `/docs/features/README.md`
- `/docs/flows/README.md`
- Deleted empty blocking file: `/docs/architecture`

### Decisions Made

- TASK-0001 was approved by David for execution.
- Foundational documentation templates should live inside their canonical folders.
- `/docs/architecture` must be a folder, not an empty file.

### Risks / Issues

- Design-system asset inventory is not yet indexed by exact filename.
- Product, architecture, feature, and flow docs still need substantive content beyond README entry points.

### Open Questions

- Should Codex next create a design-system asset inventory using exact filenames from `/docs/design_system/logos/` and `/docs/design_system/screenshots/`?
- Should the next task focus on PRD/MVP scope or system architecture?

### Approval Needed

- David final Done decision for TASK-0001.

### Next Recommended Action

David should review TASK-0001 and decide Done / Not Done.

Recommended next task after Done:

```text
TASK-0002 — Create PassTo PRD and MVP Scope Baseline
```

Alternative next task:

```text
TASK-0002 — Create Design-System Asset Inventory
```

### Handoff Notes

Next Codex session should begin from:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/tasks/TASK-0001.md
/docs/activity_log/ACTIVITY_LOG.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/RISKS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
```

---

## Session Closeout — 2026-05-24 — Codex

**Task ID:** TASK-0002 — Decompose Product Attributes Blueprint into Canonical Feature Docs  
**Status:** Ready for David Review  
**Role:** Codex / Engineering Director  
**Summary:** Decomposed the Product Attributes Blueprint v1.6 into canonical feature, flow, and architecture documents aligned with the Supabase/Vercel architecture direction. Logged product decisions confirmed by David.

### Work Completed

- Created `/docs/tasks/TASK-0002.md`.
- Created `/docs/features/TIER_FEATURES.md`.
- Created `/docs/features/SHARING.md`.
- Created `/docs/features/REFRESH.md`.
- Created `/docs/features/PDF_EXPORT.md`.
- Created `/docs/features/SUBSCRIPTIONS.md`.
- Created `/docs/features/NOTIFICATIONS.md`.
- Created `/docs/flows/VERIFIER_CREDENTIAL_VIEW.md`.
- Created `/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md`.
- Updated `/docs/activity_log/DECISIONS_LOG.md` with product and architecture decisions.
- Updated `/docs/activity_log/APPROVALS_LOG.md` with TASK-0002 approval.

### Files / Docs Changed

- `/docs/tasks/TASK-0002.md`
- `/docs/features/TIER_FEATURES.md`
- `/docs/features/SHARING.md`
- `/docs/features/REFRESH.md`
- `/docs/features/PDF_EXPORT.md`
- `/docs/features/SUBSCRIPTIONS.md`
- `/docs/features/NOTIFICATIONS.md`
- `/docs/flows/VERIFIER_CREDENTIAL_VIEW.md`
- `/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md`
- `/docs/activity_log/DECISIONS_LOG.md`
- `/docs/activity_log/APPROVALS_LOG.md`
- `/docs/activity_log/ACTIVITY_LOG.md`

### Decisions Made

- Product Attributes Blueprint v1.6 should be decomposed into canonical docs.
- Notifications replaces expiry-alerts as the broader feature scope.
- Sharing and verifier credential view remain separate docs.
- Verifier access uses one-time short-lived tokens.
- Wallet pass does not carry a permanent verification QR.
- Product attribute architecture moves away from Airtable/Make assumptions.
- Status translation system is required.
- Verifier form, disclaimers, and consent copy are confirmed.
- MVP usage pricing and license entitlements are confirmed.

### Risks / Issues

- Final Terms of Use still requires legal/product drafting.
- Subscription pricing remains unconfirmed unless separately approved.
- Exact Supabase schema and RLS policies require a later task.
- Design-system asset inventory remains a separate possible task.
- TASK-0001 and TASK-0002 both still need David final Done decision.

### Open Questions

- Should the next task be Supabase schema/RLS design or PRD/MVP scope baseline?
- Should Free users be allowed to buy additional licenses in MVP, or should additional license be hidden for Free?
- What are final Standard and Premier subscription prices?

### Approval Needed

- David final Done decision for TASK-0002.
- David final Done decision for TASK-0001 remains pending.

### Next Recommended Action

David should review TASK-0002 and decide Done / Not Done.

Recommended next task:

```text
TASK-0003 — Create Supabase Product Attributes Schema and RLS Plan
```

Alternative next task:

```text
TASK-0003 — Create PassTo PRD and MVP Scope Baseline
```

### Handoff Notes

Next Codex session should begin from:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/tasks/TASK-0002.md
/docs/features/TIER_FEATURES.md
/docs/features/SHARING.md
/docs/features/REFRESH.md
/docs/features/PDF_EXPORT.md
/docs/features/SUBSCRIPTIONS.md
/docs/features/NOTIFICATIONS.md
/docs/flows/VERIFIER_CREDENTIAL_VIEW.md
/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
/docs/activity_log/ACTIVITY_LOG.md
```

---

## Session Closeout — 2026-05-24 — Codex

**Task ID:** Session Closeout  
**Status:** Closed  
**Role:** Codex / Engineering Director  
**Summary:** Closed the PassTo session after completing TASK-0002 documentation decomposition and logging the related product decisions, approval, and activity closeout.

### Work Completed

- Confirmed session close request from David.
- Preserved the completed TASK-0002 state in the activity log.
- Confirmed next-session handoff path.

### Files / Docs Changed

- `/docs/activity_log/ACTIVITY_LOG.md`

### Decisions Made

- No new product or architecture decisions were made during closeout.

### Risks / Issues

- TASK-0001 still needs David final Done decision.
- TASK-0002 still needs David final Done decision.
- Final Terms of Use still requires legal/product drafting.
- Subscription pricing remains unconfirmed unless separately approved.
- Exact Supabase schema and RLS policies require a later task.

### Open Questions

- Should TASK-0003 be Supabase schema/RLS design or PRD/MVP scope baseline?
- Should Free users be allowed to buy additional licenses in MVP, or should additional license be hidden for Free?
- What are final Standard and Premier subscription prices?

### Approval Needed

- David final Done decision for TASK-0001.
- David final Done decision for TASK-0002.

### Next Recommended Action

David should decide Done / Not Done for TASK-0001 and TASK-0002.

Then proceed with:

```text
TASK-0003 — Create Supabase Product Attributes Schema and RLS Plan
```

Alternative:

```text
TASK-0003 — Create PassTo PRD and MVP Scope Baseline
```

### Handoff Notes

Next session should begin with:

```text
Codex, let’s start a new PassTo session.
```

Codex should read:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/activity_log/ACTIVITY_LOG.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
/docs/tasks/TASK-0001.md
/docs/tasks/TASK-0002.md
/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md
/docs/features/TIER_FEATURES.md
/docs/features/SHARING.md
/docs/features/REFRESH.md
/docs/features/PDF_EXPORT.md
/docs/features/SUBSCRIPTIONS.md
/docs/features/NOTIFICATIONS.md
/docs/flows/VERIFIER_CREDENTIAL_VIEW.md
```
