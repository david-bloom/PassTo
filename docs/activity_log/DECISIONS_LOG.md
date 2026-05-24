# PassTo Decisions Log

This log records product, architecture, operating, security, design-system, and workflow decisions that future sessions must treat as source of truth.

## Decision Format

```markdown
## DECISION-0000 — Decision Title

**Date:** YYYY-MM-DD  
**Decision Owner:** David / Codex  
**Status:** Proposed / Approved / Superseded  
**Related Task:** TASK-0000 / N/A  
**Area:** Product / Architecture / Security / Design / Operations / Integration  

### Context

What situation required a decision?

### Options Considered

1. Option A
2. Option B
3. Option C

### Decision

What was decided?

### Rationale

Why was this option chosen?

### Consequences

What changes because of this decision?

### Risks / Follow-ups

-
```

---

## DECISION-0001 — GitHub Documentation Is Source of Truth

**Date:** 2026-05-23  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** N/A  
**Area:** Operations  

### Context

PassTo uses multiple AI collaborators. Durable project memory must live outside individual chats.

### Decision

GitHub documentation is the source of truth for PassTo operating, product, architecture, task, QA, approval, activity, design, brand, and decision records.

### Rationale

Codex and Claude must restart each session from durable documentation rather than assumed memory.

### Consequences

If information is not written in GitHub, it does not exist for team operating purposes.

### Risks / Follow-ups

- Keep GitHub docs current after meaningful work.
- Ensure closeout is performed at the end of each session.
