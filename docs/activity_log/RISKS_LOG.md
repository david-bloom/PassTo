# PassTo Risks Log

This log records known risks, unresolved issues, accepted risks, and follow-up concerns.

## Risk Format

```markdown
## RISK-0000 — Risk Title

**Date Opened:** YYYY-MM-DD  
**Status:** Open / Accepted / Mitigated / Closed  
**Owner:** Codex / Claude / David  
**Severity:** Low / Medium / High / Critical  
**Related Task:** TASK-0000 / N/A  
**Area:** Product / Architecture / Security / Data / Design / Deployment / Integration  

### Risk

Describe the risk plainly.

### Impact

What could happen if this risk is not addressed?

### Mitigation / Recommendation

What should be done?

### David Acceptance

Accepted / Not Accepted / Pending

### Closeout Notes

-
```

---

## RISK-0001 — Supporting Documentation May Drift If Templates Are Not Used

**Date Opened:** 2026-05-24  
**Status:** Mitigated  
**Owner:** Codex  
**Severity:** Medium  
**Related Task:** TASK-0001  
**Area:** Operations  

### Risk

Without standard templates, Codex and Claude could document tasks, approvals, decisions, risks, and closeouts inconsistently.

### Impact

Future sessions may restart from incomplete or inconsistent documentation.

### Mitigation / Recommendation

Create foundational task, decision, risk, approval, and README templates.

### David Acceptance

Mitigated by TASK-0001 approval.

### Closeout Notes

Foundational templates created as part of TASK-0001.
