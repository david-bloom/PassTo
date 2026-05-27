# PassTo Activity Log

This log records meaningful PassTo operating activity, approvals, closeouts, blockers, and handoffs.

---

## Session Update — 2026-05-27 — Claude

**Tasks:** TASK-0024 (Phase 3.1 spec), TASK-0024-CODEX-QA
**Status:** Both pushed to GitHub
**Summary:** Finalized TASK-0024 Phase 3.1 ID.me spec — marked all open dependencies resolved (sandbox confirmed, IDME_CLIENT_SECRET held by David, redirect URI whitelisted 2026-05-27, P2 deploy URL confirmed). Created TASK-0024-CODEX-QA with 39 verification checks across 9 areas: OAuth flow design, Edge Function process correctness, security boundary compliance, schema alignment, Lovable changes completeness, failure state coverage, audit event compliance, phase scope boundary, and implementation task completeness.

### Open After This Session
- TASK-0024-CODEX-QA: awaiting Codex review
- TASK-0025 (Phase 3.1 implementation): blocked on Codex QA approval + David approval

---

## Session Closeout — 2026-05-27 — Claude

**Task ID:** TASK-0022 — Implement Phase 2 Auth, Profile Init, and Onboarding Routing
**Status:** Complete
**Role:** Claude (QA support) + David (Lovable implementation)
**Summary:** Executed Phase 2 auth wiring across the P2 enrollment Lovable project. Replaced CreateAccount.tsx with v4 Supabase Auth signup, implemented email-confirmation flow with sessionStorage.pendingName pattern, added post-login name completion via update_own_profile_basic() RPC, implemented routeByOnboardingStep() reading profiles.onboarding_step, stubbed /id-verification and IdmeCallback.tsx for Phase 3.1, removed Airtable/Make dead code, and ran Phase 2.4 QA. All QA checks passed.

### Key Deviations from Spec
- Route `/verify-identity` corrected to `/id-verification` throughout (actual App.tsx route)
- IdmeCallback.tsx was already partially stubbed (null cast) — replaced with clean early return
- Old P2 Supabase project `ofpxczstptysqxoruiox` not found (deleted or Lovable-managed) — EF deletion moot
- profiles table cast required in routeByOnboardingStep() (generated types from old project; not regenerated in Phase 2)
- EnrollmentContext license fields (licenseNumber, licenseType, licenseState) remain as empty defaults — Phase 3.3 scope

### Phase 2.4 QA Results
- signup → /confirm-email routing: PASS
- handle_new_user() trigger fires, profiles row created: PASS
- post-login name completion via RPC: PASS
- routeByOnboardingStep() routes identity → /id-verification: PASS
- RLS isolation (anonymous query returns empty): PASS
- No enrollments insert, no sessionStorage.enrollmentId: PASS
- No Make webhook fires: PASS
- Direct UPDATE on profiles.onboarding_step/account_status blocked: PASS

### Deferred to Later Phases
- P1/P3 ENV var updates (2.2-1, 2.2-3): deferred — P2 active client already hardcoded to canonical project
- P2 VITE_WEBHOOK_IDME_CALLBACK removal (2.2-4): deferred
- Phase 3.1: ID.me OAuth wiring in IdVerification.tsx and IdmeCallback.tsx
- Phase 3.2: Twilio OTP, phone collection and verification
- Phase 3.3: Primary license collection page, license lookup Edge Function
- Pre-Phase-3.3: v4_passto_mvp_remediation_r4 (licenses.normalized_status CHECK expansion)

---

## Session Entry — 2026-05-27 — Claude

**Task ID:** TASK-0023 / TASK-0024
**Status:** TASK-0023 Complete; TASK-0024 Proposed
**Role:** Claude
**Summary:** Closed TASK-0023 (Phase 3 prep — all acceptance criteria met, Phase 2 blocker resolved). Created TASK-0024 — Phase 3.1 ID.me Edge Function and Callback Wiring Spec covering: idme-exchange Edge Function design, Lovable IdVerification.tsx and IdmeCallback.tsx changes, schema writes, audit event requirements, failure state routing, security boundaries, and open dependencies. TASK-0024 requires Codex QA before implementation.

### Open Dependencies Before TASK-0024 Implementation
- David must confirm sandbox vs production ID.me environment
- David must provide IDME_CLIENT_SECRET
- David must confirm redirect URI registered with ID.me

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

---

## Session Closeout — 2026-05-24 — Claude

**Task ID:** Claude Task 001 / Claude Task 001-R
**Status:** Remediation Complete — Awaiting Codex Re-Review
**Role:** Claude — Senior Engineer
**Summary:** Executed Claude Task 001 (Supabase MVP Schema Spike), set up GitHub authentication, committed the schema artifact, captured charter v1.7 (Claude PR Authority), addressed Codex QA review blockers in v2, then executed formal Task 001-R incorporating DECISION-0011 to produce the v3 definitive remediation artifact. All 10 Codex QA blockers resolved. Issue #1 routed back to Codex for re-review.

### Work Completed

- Read full GitHub documentation at session start (team charter, activity log, task files, feature docs, architecture docs, decisions log, approvals log).
- Executed Claude Task 001 — Supabase MVP Schema Spike. Produced v1 implementation artifact with 7 required sections (Migration SQL, RLS Policies, Schema Rationale, Challenge Log, Open Questions, Self-QA, Implementation Notes).
- Installed `gh` CLI (GitHub CLI v2.92.0) to enable autonomous GitHub operations.
- Committed v1 schema artifact to GitHub — resolved source-of-truth gap flagged by Codex.
- Captured charter v1.7 amendment (Claude GitHub PR Authority) to `/docs/team_charter/TEAM_CHARTER_V1_7_AMENDMENT.md`.
- Logged APPROVAL-0005 (charter v1.7) to `/docs/activity_log/APPROVALS_LOG.md`.
- Reviewed Codex QA review (Issue #1) — 10 blockers, "Changes Required," migration not approved.
- Produced v2 schema addressing all 10 Codex QA blockers. Committed to GitHub. Posted remediation response in Issue #1 format. Updated Issue #1 labels.
- Created Task 001-R task artifact (`/docs/tasks/2026-05-24-claude-task-001-R-schema-remediation.md`).
- Pulled DECISION-0011 from GitHub (committed by Codex/David with 10 approved migration-blocking decisions).
- Executed formal Task 001-R — produced v3 definitive remediation artifact incorporating DECISION-0011: `pdf_exports` table, `token_type` field (share_link/show_qr), 7-year retention enforcement, entitlement model, subscription pricing. Committed, pushed, posted Issue #1 comment in required format, confirmed labels.

### Files Created / Changed

- `docs/tasks/2026-05-24-claude-task-001-supabase-schema-implementation.md` — v2 revision (10 blockers addressed)
- `docs/tasks/2026-05-24-claude-task-001-supabase-schema-remediation.md` — v3 definitive remediation (DECISION-0011 incorporated) — **current schema source of truth**
- `docs/tasks/2026-05-24-claude-task-001-R-schema-remediation.md` — Task 001-R formal task artifact
- `docs/team_charter/TEAM_CHARTER_V1_7_AMENDMENT.md` — Claude GitHub PR Authority amendment
- `docs/activity_log/APPROVALS_LOG.md` — APPROVAL-0005 added

### Commits

- `a49a9e4` — Add Claude Task 001 schema implementation artifact (v1)
- `d636913` — Create Codex QA review for Claude Task 001
- `1233cb0` — Add charter v1.7 amendment — Claude GitHub PR authority
- `f5170f0` — Update v1.7 charter amendment for Claude PR authority
- `83a77a6` — Remediate Task 001 schema — address all 10 Codex QA blockers (v2)
- `76ce998` — Add Task 001-R artifact — schema remediation task record
- `f871685` — Add Task 001-R remediation artifact — v3 schema with DECISION-0011

### Decisions Made

- GitHub is source of truth for all task artifacts — Claude must commit before declaring work complete.
- `gh` CLI installed at `~/bin/gh` for autonomous GitHub push/comment/label operations.
- Charter v1.7 approved: Claude may create pull requests for approved tasks; may not merge or self-approve.
- DECISION-0011 approved: 7-year retention, two token TTLs (72h share_link / 45min show_qr), pdf_exports table, entitlement model, subscription pricing.
- v3 schema artifact is the current source of truth for the Supabase MVP migration design.

### Risks / Issues

- BLOCKER 10 fully resolved in schema but production migration still blocked pending Codex re-review and David final approval.
- `ON DELETE RESTRICT` on `purchases.profile_id` and `pdf_exports.profile_id` requires application to delete children before purging profiles after 7-year retention window.
- `verifiers.token_id NOT NULL UNIQUE` may need schema change if show_qr tokens have no form gate (open Codex question 4).
- PDF QR token type is unresolved (DECISION-0011 follow-up) — may require third `token_type` value.

### Outstanding Items — David

- TASK-0001: Final Done decision pending.
- TASK-0002: Final Done decision pending.
- Final migration approval (after Codex re-review clears remaining 5 architecture questions).

### Outstanding Items — Codex

- Issue #1: Re-review v3 remediation artifact (`f871685`).
- Define `audit_events.action` canonical namespace before migration.
- Decide `is_primary` designation implementation path.
- Confirm RLS testing approach.
- Confirm `verifiers` record behavior for `show_qr` tokens.
- Decide PDF QR token type (if MVP — requires `token_type` enum update).

### Next Recommended Action

Codex should re-review Issue #1 and the v3 artifact:

```text
/docs/tasks/2026-05-24-claude-task-001-supabase-schema-remediation.md
```

If all remaining architecture questions are resolved and QA passes, Codex should update Issue #1 labels to `assigned: david` / `needs: david-approval` for final migration approval.

### Handoff Notes

Next Claude session should begin with the full startup read:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/team_charter/TEAM_CHARTER_V1_4_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_5_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_6_AMENDMENT.md
/docs/team_charter/TEAM_CHARTER_V1_7_AMENDMENT.md
/docs/activity_log/ACTIVITY_LOG.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
/docs/tasks/2026-05-24-claude-task-001-supabase-schema-remediation.md
/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md
GitHub Issue #1
```

---

## Session Activity — 2026-05-25 — Codex

**Task ID:** TASK-0003 — Create PassTo PRD v0.1 and MVP Task Backlog  
**Status:** Ready for David Review  
**Role:** Codex / Engineering Director  
**Summary:** Created PassTo PRD v0.1 and MVP Task Backlog incorporating Claude PRD outline feedback directly and David’s Lovable-hosted MVP frontend decision.

### Work Completed

- Reviewed Claude comments embedded in `/docs/prd/PASS_TO_PRD_OUTLINE.md`.
- Created Codex response to Claude’s PRD outline review in `/docs/prd/CLAUDE_PRD_OUTLINE_REVIEW_RESPONSE.md`.
- Captured David approval for TASK-0003.
- Created `/docs/tasks/TASK-0003.md`.
- Created `/docs/prd/PASS_TO_PRD.md`.
- Created `/docs/tasks/MVP_TASK_BACKLOG.md`.
- Updated `/docs/activity_log/APPROVALS_LOG.md` with APPROVAL-0007.
- Updated this activity log.

### Files / Docs Changed

- `/docs/prd/PASS_TO_PRD_OUTLINE.md` — Claude comments present from review.
- `/docs/prd/CLAUDE_PRD_OUTLINE_REVIEW_RESPONSE.md`.
- `/docs/tasks/TASK-0003.md`.
- `/docs/prd/PASS_TO_PRD.md`.
- `/docs/tasks/MVP_TASK_BACKLOG.md`.
- `/docs/activity_log/APPROVALS_LOG.md`.
- `/docs/activity_log/ACTIVITY_LOG.md`.

### Decisions / Direction Captured

- Lovable is retained as the MVP frontend builder and website host.
- Supabase is the system of record and RLS/data foundation.
- Supabase Edge Functions are preferred for orchestration where practical.
- Vercel is retained only for backend/API routes where needed.
- Airtable and Make are abandoned as execution platforms.
- ID.me, Twilio, RapidAPI/Propelus, data matching, selfie capture, and wallet pass issuance are now represented in the PRD and backlog.
- Wallet pass is treated as core MVP unless David explicitly changes product definition.
- Degraded-mode and ops alert requirements are now PRD-level requirements.

### Risks / Issues

- Activity log references DECISION-0011, but the visible `/docs/activity_log/DECISIONS_LOG.md` currently stops at DECISION-0010. A cleanup task may be required.
- Final Standard/Premier subscription pricing has conflicting documentation signals: visible Decisions Log says still unconfirmed, while Claude schema activity references $9.99/$19.99.
- Twilio A2P 10DLC remains a launch-readiness blocker unless David approves fallback.
- Terms of Use and verifier disclaimer remain unresolved legal/product work.
- Final Supabase schema and RLS design remain subject to Codex review and David approval.

### Open Questions

- Should TASK-0004 be the Lovable/Supabase/Vercel responsibility map as recommended?
- Should Codex create a DECISION-0011 cleanup entry or locate the missing decision artifact first?
- Should Standard/Premier pricing be treated as approved at $9.99/$19.99 or still open until David reconfirms?
- Should admin/ops start with Supabase dashboard/views or a Lovable admin UI?

### Approval Needed

- David final Done decision for TASK-0003.
- David final pricing confirmation before Stripe setup.
- David launch fallback decision if Twilio A2P 10DLC is not ready.

### Next Recommended Action

Proceed with:

```text
TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map
```

Then:

```text
TASK-0005 — Create Supabase Schema and RLS Plan
TASK-0006 — Create MVP Build Sequence for Claude
```

### Handoff Notes

Next Codex or Claude session should read:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/activity_log/ACTIVITY_LOG.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
/docs/tasks/TASK-0003.md
/docs/prd/PASS_TO_PRD.md
/docs/tasks/MVP_TASK_BACKLOG.md
/docs/prd/CLAUDE_PRD_OUTLINE_REVIEW_RESPONSE.md
/docs/tasks/2026-05-24-claude-task-001-supabase-schema-remediation.md
```

---

## Session Activity — 2026-05-25 — Codex

**Task ID:** TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map  
**Status:** Ready for David Review  
**Role:** Codex / Engineering Director  
**Summary:** Created a documentation/architecture responsibility map defining what Lovable, Supabase, and Vercel each own for the PassTo MVP.

### Work Completed

- Captured David approval for TASK-0004.
- Created `/docs/tasks/TASK-0004.md`.
- Created `/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`.
- Updated `/docs/activity_log/APPROVALS_LOG.md` with APPROVAL-0008.
- Updated this activity log.

### Files / Docs Changed

- `/docs/tasks/TASK-0004.md`.
- `/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`.
- `/docs/activity_log/APPROVALS_LOG.md`.
- `/docs/activity_log/ACTIVITY_LOG.md`.

### Decisions / Direction Captured

- Lovable owns MVP frontend, website hosting, route experience, and UI iteration.
- Supabase owns system of record, auth/data foundation, RLS, storage where needed, Edge Functions where practical, event/audit persistence, and service-role-safe backend state.
- Vercel is retained only for backend/API routes where Supabase Edge Functions or Lovable are not the right fit.
- Vercel is not the default MVP frontend host.
- Lovable must not hold privileged secrets or make trust/payment/credential issuance decisions.
- Future implementation tasks must identify frontend owner, data owner, backend owner, integrations touched, secrets, service-role need, RLS impact, and affected routes.

### Risks / Issues

- Actual Lovable route inventory still needs audit.
- Supabase Edge Functions vs. Vercel route boundaries may change after provider SDK/runtime review.
- Existing Vercel wallet signing code needs explicit retain/rewrite decision.
- ID.me callback, Stripe webhook, PDF generation, and wallet pass signing ownership remain open until implementation planning.
- Admin/ops mechanism remains open: Supabase dashboard/views first vs. Lovable admin UI.

### Open Questions

- Should TASK-0005 be Supabase Schema and RLS Plan or Lovable Route/API Audit?
- Should existing Vercel wallet signing endpoints be retained for MVP?
- Should ID.me and Stripe webhook handling be Supabase Edge Functions or Vercel routes?
- Should admin/ops begin with Supabase dashboard/views only?

### Approval Needed

- David final Done decision for TASK-0004.
- David decision on next task priority.

### Next Recommended Action

Recommended next task:

```text
TASK-0005 — Create Supabase Schema and RLS Plan
```

Alternative if implementation sequencing risk feels higher:

```text
TASK-0005 — Audit Lovable MVP Routes and Backend Calls
```

### Handoff Notes

Next Codex or Claude session should read:

```text
/docs/team_charter/TEAM_CHARTER.md
/docs/activity_log/ACTIVITY_LOG.md
/docs/activity_log/DECISIONS_LOG.md
/docs/activity_log/APPROVALS_LOG.md
/docs/tasks/TASK-0004.md
/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md
/docs/prd/PASS_TO_PRD.md
/docs/tasks/MVP_TASK_BACKLOG.md
```

---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0018 — Claude QA Review: v4 Supabase Migration SQL and RLS
**Status:** Done — 2026-05-27
**Role:** Claude / QA Reviewer
**Summary:** Performed an independent Claude QA review of the complete v4 migration chain (base + R1/R2/R3) against TASK-0007 decisions, PRD Sections 1–7, launch-critical MVP scope, and Supabase security best practices. Result: Pass with Required Fix.

### Work Completed

- Read all source artifacts from GitHub: `V4_MIGRATION_SQL.md`, `CODEX_RESPONSE_TASK_0007_SCHEMA_QA.md`, `PRD_SECTION_04_DATA_RLS_BACKEND.md`, `CODEX_REVIEW_V4_MIGRATION_SQL.md`, `CODEX_QA_V4_MIGRATION_REVIEW.md`, `V4_MIGRATION_VERIFICATION.md`, `DECISION-0016-V4-MIGRATION-DIRECT-APPROVAL.md`, `PRD_SECTION_07_LAUNCH_QA_DECISIONS.md`, all related task files.
- Conducted fresh independent review of the complete final migration artifact.
- Identified one new P1 finding not caught by prior Codex QA.
- Documented all findings with file/table/policy references.
- Created `docs/tasks/TASK-0018.md` and pushed to GitHub (commit 780d1fd).
- No migration was applied.

### Key Finding — P1

`licenses.normalized_status` CHECK constraint was not updated by Remediation R3. `license_status_mappings.normalized_status` was expanded to 8 values including `'Pending'` (R3), but `licenses.normalized_status` still only allows 7 values. If the license lookup Edge Function reads `normalized_status = 'Pending'` from `license_status_mappings` and writes it to `licenses.normalized_status`, the database will throw a CHECK constraint violation. A new migration (`v4_passto_mvp_remediation_r4`) is required before Phase 3.3 (license lookup Edge Function) is built.

### Files / Docs Changed

- `docs/tasks/TASK-0018.md` — created

### Decisions / Direction Captured

- TASK-0018 QA verdict: Pass with Required Fix.
- Phase 2 (account/profile foundation) is unblocked.
- Pre-Phase-3 gate: apply `licenses.normalized_status` CHECK expansion before license lookup Edge Function is built.

### Risks / Issues

- P1: `licenses.normalized_status` CHECK mismatch with `license_status_mappings` — will cause runtime error in Phase 3.
- P2: TASK-0007 OD-7 deviation (`stripe_customers` drop) not documented as ADR.
- P2: PRD Section 4 inconsistencies (`stripe_customers` listed, `show_qr` marked deferred but in schema).
- P2: `V4_MIGRATION_VERIFICATION.md` Section 5 still shows pre-R3 seed counts.
- P3: Hard-delete cascade risk (accepted, documented in DECISION-0016).
- P3: Supabase Storage selfie bucket not yet created.

### Next Recommended Actions

```text
TASK-0019 — Phase 2: Profile Init and Onboarding Routing (Phase 2.2 + 2.3 + 2.4)
Pre-Phase-3 gate — v4_passto_mvp_remediation_r4: expand licenses.normalized_status CHECK to 8 values
```

### Handoff Notes

Next session should read:
```text
docs/tasks/TASK-0018.md
docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md
docs/prd/PRD_SECTION_04_DATA_RLS_BACKEND.md
docs/architecture/V4_MIGRATION_SQL.md
```

---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0019 — Supabase Storage Architecture Plan: Selfie Assets
**Status:** Done — 2026-05-27
**Role:** Claude / Architect
**Summary:** Created the complete Supabase Storage architecture specification for PassTo selfie assets. Reviewed against PRD Sections 3, 4, 5, 6, P2 enrollment pipeline spec, and TASK-0018 findings. No bucket, policy, or migration was applied. All 12 required deliverables produced.

### Work Completed

- Read source artifacts from GitHub: `PRD_SECTION_03_USER_JOURNEYS.md`, `PRD_SECTION_04_DATA_RLS_BACKEND.md`, `PRD_SECTION_05_FEATURE_REQUIREMENTS.md`, `PRD_SECTION_06_INTEGRATIONS_FAILURE_OPS.md`, `P2_ENROLLMENT_PIPELINE_MIGRATION_SPEC.md`, `SECURITY_MODEL.md`, `V4_MIGRATION_SQL.md`, `LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`, `TASK-0018.md`.
- Identified that `profiles` table has no `selfie_storage_path` or `selfie_captured_at` columns — both required before Phase 3.5.
- Confirmed bucket name `selfies` from P2 pipeline spec.
- Designed private bucket with path `{auth_user_id}/selfie.jpg`, overwrite-on-retry pattern.
- Specified two-step upload pattern: Lovable direct upload (user JWT + Storage RLS) + Edge Function backend confirmation (service-role profile field update, audit event write, onboarding step advance).
- Specified four Storage RLS policies: INSERT, UPDATE, SELECT (nurse-scoped to own path); no DELETE for authenticated users.
- Specified required schema migration `v4_passto_mvp_selfie_fields`: add `selfie_storage_path text` and `selfie_captured_at timestamptz` to `profiles` — service-role only writes.
- Documented 8 failure scenarios, 7 security risks with mitigations, 14 acceptance criteria.
- Created `docs/tasks/TASK-0019.md` and pushed to GitHub (commit d287c38).
- No Supabase bucket, policy, or migration was applied.

### Files / Docs Changed

- `docs/tasks/TASK-0019.md` — created

### Decisions / Direction Captured

- Selfie bucket name: `selfies` (already in P2 pipeline spec)
- Bucket: private; PRD Section 5.9 explicit requirement
- Path: `{auth_user_id}/selfie.jpg` using `auth.uid()` prefix (not `profiles.id`) — avoids join in Storage RLS
- Upload pattern: Lovable direct upload + mandatory Edge Function confirmation step
- `selfie_storage_path` must NOT be in `update_own_profile_basic()` RPC — nurse cannot self-attest
- No signed URLs approved for MVP selfies except short-TTL (≤60s) ops-only pattern
- Credential issuance gate: `selfie_storage_path IS NULL` blocks credential creation

### Risks / Issues

- `profiles` schema gap: `selfie_storage_path` and `selfie_captured_at` not yet in v4 schema — required before Phase 3.5
- Selfie purge process not yet defined — must be documented before production launch
- Upload BEFORE data match: Storage RLS cannot enforce enrollment gate; backend Edge Function must enforce `onboarding_step` check

### Next Recommended Actions

```
TASK-0020 — Implement Selfie Storage: Create selfies bucket, apply Storage RLS policies, apply v4_passto_mvp_selfie_fields migration
Gate: Codex QA review of TASK-0019 plan + David approval before TASK-0020 execution
Pre-Phase-3.3: Apply v4_passto_mvp_remediation_r4 (licenses.normalized_status CHECK expansion)
```

### Handoff Notes

Next session should read:
```
docs/tasks/TASK-0019.md
docs/architecture/V4_MIGRATION_SQL.md
docs/architecture/P2_ENROLLMENT_PIPELINE_MIGRATION_SPEC.md
```

---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0020 — Implement Selfie Storage Bucket, Policies, and Profile Fields
**Status:** Done — 2026-05-27
**Role:** Claude / Engineer
**Summary:** Implemented the selfie Storage foundation approved in TASK-0019. Created private `selfies` bucket, applied three exact-path Storage RLS policies, and applied schema migration `v4_passto_mvp_selfie_storage` adding `selfie_storage_path` and `selfie_captured_at` to `profiles`. All 13 verification checks passed. No deviations.

### Work Completed

- Confirmed clean baseline: no `selfies` bucket, no Storage policies, no selfie columns on `profiles`.
- Applied migration `v4_passto_mvp_selfie_storage` (version `20260527143033`) via Supabase MCP to `wvzjfxacykgsaffskgtr`.
- Migration scope: bucket INSERT, three Storage RLS policies (INSERT/UPDATE/SELECT), two `profiles` column additions with service-role comments.
- Ran full verification plan (13 checks) — all passed.
- Updated `docs/tasks/TASK-0020.md` on GitHub with execution results, checked acceptance criteria, marked Done.
- Updated `docs/activity_log/ACTIVITY_LOG.md`.

### Files / Docs Changed

- `docs/tasks/TASK-0020.md` — updated: status Done, acceptance criteria checked, execution results and verification table added

### Supabase Changes Applied

| Object | Type | Detail |
|---|---|---|
| `selfies` | Storage bucket | private, 10 MB, image/jpeg + image/png + image/webp |
| `nurse_upload_own_selfie` | Storage RLS policy | INSERT, exact-path, authenticated |
| `nurse_update_own_selfie` | Storage RLS policy | UPDATE (USING + WITH CHECK), exact-path, authenticated |
| `nurse_select_own_selfie` | Storage RLS policy | SELECT, exact-path, authenticated |
| `profiles.selfie_storage_path` | Schema column | text, nullable, service-role write only |
| `profiles.selfie_captured_at` | Schema column | timestamptz, nullable, service-role write only |

### Decisions / Direction Captured

- No authenticated DELETE policy on `selfies` — deletion via service-role only
- `selfie_storage_path` and `selfie_captured_at` are NOT in `update_own_profile_basic()` — confirmed
- Exact-path RLS (`name = auth.uid()::text || '/selfie.jpg'`) enforced — Codex QA correction applied

### Risks / Issues

- Selfie purge process still not defined — must be documented before production launch
- Backend confirmation step (Edge Function) must enforce `onboarding_step` gate before confirming selfie — not yet built
- Phase 3.5 Lovable implementation must handle HEIC/HEIF: convert to JPEG or show unsupported-format retry message

### Next Recommended Actions

```
TASK-0021 — Phase 2: Profile Init and Onboarding Routing
Pre-Phase-3.3: Apply v4_passto_mvp_remediation_r4 (licenses.normalized_status CHECK expansion)
Pre-Phase-3.5: Edge Function confirmation logic for selfie step (submit-enrollment)
```

### Handoff Notes

Next session should read:
```
docs/tasks/TASK-0020.md
docs/tasks/TASK-0019.md
docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md
```
---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0021 — Phase 2 Profile Init and Onboarding Routing Spec
**Status:** Done — 2026-05-27
**Role:** Claude / Engineer
**Summary:** Produced the implementation-ready Phase 2 specification for Lovable auth wiring, profile initialization, onboarding step routing, and Airtable/Make dead-code removal. No Supabase migrations, Edge Functions, or code deployed — spec only.

### Work Completed

- Read 11 source documents from `david-bloom/PassTo` including V4_MIGRATION_SQL.md, P2_ENROLLMENT_PIPELINE_MIGRATION_SPEC.md, MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md, PRD sections, and all prior tasks.
- Confirmed `handle_new_user()` trigger fully creates profiles row at signUp — no `profile-init` Edge Function needed for Phase 2.
- Documented correct UUID identity: `profiles.auth_user_id = auth.uid()` ≠ `profiles.id` — corrects stale P2 pipeline spec Note 2.
- Specified exact ENV var updates for P1/P2/P3 Lovable projects pointing at `wvzjfxacykgsaffskgtr`.
- Specified `update_own_profile_basic()` RPC call pattern for name/phone population post-signUp.
- Specified `routeByOnboardingStep()` router reading `profiles.onboarding_step`.
- Identified all Airtable/Make dead code to remove: `create-airtable-record` (P2), `sync-airtable` (P1), Airtable comment block (P3).
- Defined 14 ordered implementation tasks for TASK-0022.
- Defined 28-item Phase 2.4 QA checklist.
- Wrote complete spec to `docs/tasks/TASK-0021.md` on GitHub (commit 81b1ad819c308250d69cc070304f9be2ffff16a4).

### Files / Docs Changed

- `docs/tasks/TASK-0021.md` — updated: skeleton replaced with complete Phase 2 spec, status Done

### Decisions / Direction Captured

- `handle_new_user()` trigger is sufficient for Phase 2 row creation — no new Edge Function needed
- `profiles.auth_user_id` = `auth.uid()` (not `profiles.id`) — all Lovable identity references must use `authData.user.id`
- Stale `create-airtable-record` and `sync-airtable` are dead code; removal is Phase 2 scope
- `onboarding_step` remains backend-controlled only — Lovable must never write it directly
- Phase 2 is fully unblocked from R4 remediation (only Phase 3.3 needs R4)

### Risks / Issues

- Null-profile guard needed for legacy pre-v4 auth accounts — minimum viable guard defined in Section 6
- `update_own_profile_basic()` RPC failure on signUp is non-blocking (profiles row exists, name/phone null) but should be logged
- `profiles.id ≠ auth.uid()` discrepancy in P2_ENROLLMENT_PIPELINE_MIGRATION_SPEC.md Note 2 — documented, flagged for Phase 3 Edge Function implementers

### Next Recommended Actions

```
TASK-0022 — Implement Phase 2 Auth, Profile Init, and Onboarding Routing (14 tasks — David in Lovable)
Pre-Phase-3.3: Apply v4_passto_mvp_remediation_r4 (licenses.normalized_status CHECK expansion)
```

### Handoff Notes

Next session should read:
```
docs/tasks/TASK-0021.md
docs/tasks/TASK-0020.md
docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md
```
---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0022 — Implement Phase 2 Auth, Profile Init, and Onboarding Routing
**Status:** Proposed — pending Codex QA of TASK-0021 and David execution approval
**Role:** Claude / Engineer
**Summary:** Created TASK-0022 implementation task. Defines all 14 ordered steps for David to execute in Lovable P1/P2/P3: ENV var wiring to wvzjfxacykgsaffskgtr, signUp flow with update_own_profile_basic() RPC, onboarding router, null-profile guard, Airtable/Make dead code removal, and Phase 2.4 QA checklist. No Supabase changes applied.

### Work Completed

- Read TASK-0021.md, V4_MIGRATION_SQL.md, and MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md from GitHub before writing.
- Created docs/tasks/TASK-0022.md with full implementation scope, code reference, route map, error states, security boundaries, 28-item QA checklist, and acceptance criteria.
- Pushed to GitHub (commit bda969e3bc9a69ca3525ebc93e261d4f3e0e86b1).

### Files / Docs Changed

- `docs/tasks/TASK-0022.md` — created

### Decisions / Direction Captured

- TASK-0022 blocked on TASK-0021 Codex QA approval (no P1/P2 findings) and David execution approval
- Phase 2 requires no Supabase migrations — all work is Lovable config + code changes
- R4 remediation remains a separate pre-Phase-3.3 gate, not blocking Phase 2

### Next Recommended Actions

```
TASK-0021 Codex QA → David approval → TASK-0022 execution
Pre-Phase-3.3: Apply v4_passto_mvp_remediation_r4
```
---

## Session Activity — 2026-05-27 — Claude

**Task ID:** TASK-0021 / TASK-0022 — Codex QA corrections applied
**Status:** TASK-0021 updated; TASK-0022 updated; both pending David approval
**Role:** Claude / Engineer
**Summary:** Applied 6 Codex-required corrections to both TASK-0021 (Phase 2 spec) and TASK-0022 (implementation task). No Supabase changes applied.

### Corrections Applied

| # | Finding | Change in TASK-0021 | Change in TASK-0022 |
|---|---|---|---|
| CQ-1 | IdmeCallback.tsx Make calls must be blocked in Phase 2, not deferred | DQ-8: table updated; "In Phase 2 scope" statement added; step 2.2-4a added | Step 2.2-4a added; Out of Scope updated; acceptance criteria + QA checklist updated |
| CQ-2 | update_own_profile_basic() cannot run without active session | Section 4.1 signUp flow: added authData.session check; no-session path routes to /confirm-email | Code reference updated with same session check |
| CQ-3 | Null-profile recovery section was contradictory (referenced Edge Function then said out of scope) | DQ-6: retry/support only; no recovery Edge Function in Phase 2 | Error states table: null-profile and fetch error now separate rows with correct behavior |
| CQ-4 | Supabase env values must be verified at implementation time | Section 3.1: "Implementation note" added to verify from Supabase dashboard | ENV section header updated to say "verify before use" |
| CQ-5 | Profile fetch did not distinguish error from null | DQ-4: explicit separation of error vs null handling | Profile fetch pattern code updated |
| CQ-6 | Edge Function deletion did not require confirming no live callers first | Steps 2.2-12 and 2.2-13: dependency updated to "verify no live callers" | Same dependency update |

### Files Changed

- `docs/tasks/TASK-0021.md` — 6 corrections applied; Codex QA findings table added; status updated
- `docs/tasks/TASK-0022.md` — 6 corresponding implementation changes applied

### Next Recommended Actions

```
David approval of TASK-0022 → execute 15 implementation steps in Lovable
```

