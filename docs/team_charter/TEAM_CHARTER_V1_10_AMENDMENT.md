# PassTo Engineering Team Operating Charter - v1.10 Amendment

**Status:** Approved  
**Version:** v1.10 Amendment  
**Owner:** David  
**Approved Date:** 2026-06-03  
**Applies To:** `/docs/team_charter/TEAM_CHARTER.md` v1.3 and active amendments v1.4 through v1.9  

---

## Purpose

This amendment adds a required QA protocol for tasks where backend and frontend work are decoupled but must operate together through a contract.

It was created after TASK-0055 dashboard QA exposed a gap: backend gate behavior and frontend UI behavior were each reviewed, but the integrated deployed flow from backend response to frontend redirect was not explicitly tested.

---

## Version History Entry

Add to the charter version history:

| Version | Date | Approved By | Summary |
|---|---:|---|---|
| v1.10 | 2026-06-03 | David | Added contract integration gate QA requirements for decoupled backend/frontend work, backend-driven frontend routing, eligibility, entitlement, shareability, credential visibility, and cross-domain handoffs |

---

## QA Protocol Amendment: Contract Integration Gates

When a task has decoupled backend and frontend work, backend QA and frontend QA are not sufficient for task closeout.

If a backend response controls frontend routing, user eligibility, entitlement state, shareability, credential visibility, or cross-domain handoff, QA must include an integration test that exercises the backend response through the deployed frontend.

Required checks:

1. Verify the backend response contract directly.
2. Verify the frontend consumes that response correctly.
3. Verify the resulting user-visible behavior, including final URL/domain.
4. If the flow crosses domains, assert the exact destination host and path.
5. Keep the task in QA until this integration test passes.

Backend pass + deferred UI does not permit task completion. Frontend implementation after backend QA must trigger re-QA of the integrated flow.

Example:

An incomplete nurse visiting `https://app.passtodigital.com/dashboard` receives:

```json
{ "error": "onboarding_not_complete", "onboarding_step": "identity" }
```

Expected integrated behavior:

- App must not route to `https://app.passtodigital.com/id-verification`.
- App must route to the approved Enrollment handoff, such as `https://enroll.passtodigital.com/post-login`.
- Enrollment then routes the user to the correct enrollment step on the Enrollment domain.

---

## Status Language Rule

When a contract integration gate has not been exercised, QA status language must make the remaining gap explicit.

Use statuses or notes such as:

```text
Backend QA passed - frontend/integration QA required
Live UI visually verified - contract integration not yet verified
```

Do not use broad "verified", "QA complete", "ready for Done", or equivalent closeout language when a required backend-to-frontend contract integration test remains unrun.

---

## Consolidation Note

This amendment should be consolidated into `/docs/team_charter/TEAM_CHARTER.md`, `/docs/team_charter/TASK_WORKFLOW.md`, and `/docs/team_charter/DEFINITION_OF_DONE.md` in a future documentation maintenance task together with prior active amendments.
