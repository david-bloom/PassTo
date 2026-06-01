# PassTo Approvals Log

This log records David approvals, rejections, Done decisions, and risk acceptances.

## Approval Format

```markdown
## APPROVAL-0000 — Approval Title

**Date:** YYYY-MM-DD  
**Approved By:** David  
**Related Task:** TASK-0000 / N/A  
**Decision:** Approved / Rejected / Approved with Notes / Done / Not Done / Do Not Do  

### Summary

What was approved or rejected?

### Approval Checklist

- [ ] I approve this task for execution.
- [ ] I approve the stated acceptance criteria.
- [ ] I approve the stated out-of-scope items.
- [ ] I understand the risks noted below.

### Notes

-
```

---

## APPROVAL-0009 — TASK-0046 Migration H Approved

**Date:** 2026-06-01  
**Approved By:** David  
**Related Task:** TASK-0046  
**Decision:** Approved with Notes  

### Summary

David approved applying Migration H for TASK-0046:

```text
I approve Migration H
```

Migration H hardens `public.complete_license_verification(...)` by recreating the RPC with locked `search_path`, server-side validation, revoked public/anon/authenticated execute grants, and `service_role`-only execute.

David also corrected the RapidAPI provider contract: RapidAPI documentation says `POST /verify` returns a full structured license record with `status`, issue date, expiration date, and discipline data when exposed by the state board. David provided this example response:

```json
{
  "state": "TX",
  "license_number": "751234",
  "full_name": "JANE A SMITH",
  "license_type": "RN",
  "license_status": "Active",
  "issue_date": "2015-06-12",
  "expiration_date": "2026-08-31",
  "discipline": [],
  "source_url": "https://www.bon.texas.gov/..."
}
```

### Approval Checklist

- [x] I approve applying `supabase/migrations/migration_h_license_verification_harden.sql`.
- [x] I understand Migration H changes live RPC privileges and validation.
- [x] I understand `license-lookup` still requires a source update before redeploy because the current checked-in function expects a `results[]` response shape and does not read top-level `license_status`.
- [x] I understand live Codex re-QA is still required after Migration H application and `license-lookup` redeployment.

### Notes

- Migration H approval does not by itself approve redeploying the current `license-lookup` source as-is.
- Claude should update `license-lookup` to use the documented RapidAPI `POST /verify` response shape and `license_status` field before redeploy.
- The prior Codex open blocker "provider does not return status" is superseded by David's provider-contract correction, but the implementation must be reconciled to that contract.

---

## APPROVAL-0001 — TASK-0001 Approved for Execution

**Date:** 2026-05-24  
**Approved By:** David  
**Related Task:** TASK-0001  
**Decision:** Approved  

### Summary

David confirmed TASK-0001 — Create Foundational Documentation Templates.

### Approval Checklist

- [x] I approve this task for execution.
- [x] I approve the creation of foundational documentation templates and supporting logs.
- [x] I understand this is documentation-governance work only.

### Notes

Approval captured from David’s confirmation: “TASK-0001 — Create Foundational Documentation Templates CONFIRMED.”

---

## APPROVAL-0002 — TASK-0002 Approved for Execution

**Date:** 2026-05-24  
**Approved By:** David  
**Related Task:** TASK-0002  
**Decision:** Approved  

### Summary

David confirmed TASK-0002 — Decompose Product Attributes Blueprint into Canonical Feature Docs.

### Approval Checklist

- [x] I approve this task for execution.
- [x] I approve decomposing the Product Attributes Blueprint into canonical feature, flow, and architecture docs.
- [x] I understand this is documentation and architecture-planning work only.

### Notes

Approval captured from David’s confirmation: “TASK-0002 — Decompose Product Attributes Blueprint into Canonical Feature Docs CONFIRMED.”

---

## APPROVAL-0003 — Charter v1.4 Amendment Approved

**Date:** 2026-05-24  
**Approved By:** David  
**Related Task:** N/A — Charter Amendment  
**Decision:** Approved  

### Summary

David approved the v1.4 charter update covering Claude-direct assignment spec stubs, minimal/full startup read scope, David substitution for Codex on Class B code-touching work when Codex is unavailable, the `Ready for Codex Retrospective Review` status, and PM-level MVP architecture guidance.

### Approval Checklist

- [x] I approve Claude-direct assignment spec stubs.
- [x] I approve minimal vs full startup read scope.
- [x] I approve David substitution for Codex approval on Class B code-touching work when Codex is unavailable.
- [x] I approve adding Ready for Codex Retrospective Review as a task status.
- [x] I approve updating the charter to v1.4.

### Notes

The main charter full-file replacement was blocked by the GitHub connector safety layer. The approved v1.4 rules were captured in `/docs/team_charter/TEAM_CHARTER_V1_4_AMENDMENT.md` and should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future maintenance task.

---

## APPROVAL-0004 — Charter v1.5 Amendment Approved

**Date:** 2026-05-24  
**Approved By:** David  
**Related Task:** N/A — Charter Amendment  
**Decision:** Approved  

### Summary

David approved the v1.5 charter update establishing GitHub label-based routing for Codex, Claude, and David because Claude does not have a GitHub username.

### Approval Checklist

- [x] I approve GitHub label-based routing instead of `@mentions` for Claude.
- [x] I approve assignment labels: `assigned: codex`, `assigned: claude`, `assigned: david`.
- [x] I approve response-needed labels: `needs: codex-review`, `needs: claude-response`, `needs: david-approval`.
- [x] I approve status labels: `status: blocked`, `status: ready-for-review`, `status: ready-for-codex-qa`, `status: ready-for-david-review`.
- [x] I approve adding this rule to the active charter as v1.5.

### Notes

The approved v1.5 rules were captured in `/docs/team_charter/TEAM_CHARTER_V1_5_AMENDMENT.md` and should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future maintenance task.

---

## APPROVAL-0005 — Charter v1.7 Amendment Approved

**Date:** 2026-05-24
**Approved By:** David
**Related Task:** N/A — Charter Amendment
**Decision:** Approved

### Summary

David approved the v1.7 charter update establishing Claude's authority to create GitHub pull requests for approved tasks, approved remediation work, and approved Class B work. Defines PR content requirements, routing label requirements, Codex PR review scope, and merge authority rules.

### Approval Checklist

- [x] I approve Claude PR creation authority for approved tasks, remediation, and Class B work.
- [x] I approve the required PR content fields (Task ID, spec, criteria, summary, files, tests, deviations, risks).
- [x] I approve routing labels: `assigned: codex`, `needs: codex-review`, `status: ready-for-codex-qa` for approved work.
- [x] I approve draft PR + `assigned: david` / `needs: david-approval` / `status: blocked` for unapproved-scope work.
- [x] I approve Codex PR review scope (scope, architecture, security/RLS, data/integration, design-system, criteria, QA).
- [x] I confirm Claude may not merge or self-approve PRs.
- [x] I confirm David remains final approver for Done and merge decisions.

### Notes

v1.6 was already committed (scheduled triage agents). This amendment is captured as v1.7 in `/docs/team_charter/TEAM_CHARTER_V1_7_AMENDMENT.md` and should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future maintenance task.

---

## APPROVAL-0006 — Charter v1.8 Amendment Approved

**Date:** 2026-05-24  
**Approved By:** David  
**Related Task:** N/A — Charter Amendment  
**Decision:** Approved  

### Summary

David approved the v1.8 charter update establishing the `C` / `c` handshake for the repo-visible Codex/Claude review loop.

### Approval Checklist

- [x] I approve `C` / `c` as David’s manual immediate trigger for the GitHub review loop.
- [x] I approve that `C` in Codex means Codex must re-scan GitHub, review items assigned to Codex, and respond in the repo-visible thread.
- [x] I approve that `C` in Claude means Claude must inspect repo-visible Codex feedback, act on every item, update GitHub, and report status.
- [x] I approve that `C` never means continue from memory and always means read GitHub first.
- [x] I approve that `C` does not authorize new Class A work, merge, deployment, migration, risk acceptance, or Done decisions.

### Notes

The approved v1.8 rules were captured in `/docs/team_charter/TEAM_CHARTER_V1_8_AMENDMENT.md` and should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future maintenance task.

---

## APPROVAL-0007 — TASK-0003 Approved for Execution

**Date:** 2026-05-25  
**Approved By:** David  
**Related Task:** TASK-0003  
**Decision:** Approved  

### Summary

David approved TASK-0003 — Create PassTo PRD v0.1 and MVP Task Backlog, incorporating Claude feedback directly.

### Approval Checklist

- [x] I approve this task for execution.
- [x] I approve creating `/docs/prd/PASS_TO_PRD.md`.
- [x] I approve creating `/docs/tasks/MVP_TASK_BACKLOG.md`.
- [x] I approve incorporating Claude PRD outline feedback directly.
- [x] I understand this is documentation and planning work only, not implementation authorization.

### Notes

Approval captured from David’s confirmation: “TASK-0003 — Create PassTo PRD v0.1 and MVP Task Backlog, incorporating Claude feedback directly APPROVED.”

---

## APPROVAL-0008 — TASK-0004 Approved for Execution

**Date:** 2026-05-25  
**Approved By:** David  
**Related Task:** TASK-0004  
**Decision:** Approved  

### Summary

David approved TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map as a documentation/architecture task.

### Approval Checklist

- [x] I approve this task for execution.
- [x] I approve creating `/docs/tasks/TASK-0004.md`.
- [x] I approve creating `/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`.
- [x] I approve defining Lovable, Supabase, and Vercel MVP responsibility boundaries.
- [x] I understand this is documentation and architecture-planning work only, not implementation authorization.

### Notes

Approval captured from David’s confirmation: “TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map Approved” and follow-up instruction: “restart creating TASK-0004 as a documentation/architecture task, then add the responsibility map that defines what Lovable, Supabase, and Vercel each own for MVP.”
