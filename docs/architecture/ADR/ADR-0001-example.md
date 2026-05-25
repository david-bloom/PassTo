# ADR-0001 — Example Architecture Decision Record

**Status:** Example  
**Date:** YYYY-MM-DD  
**Decision Owner:** Codex / David  
**Related Task:** TASK-0000  
**Area:** Architecture / Security / Data / Integration / Product  

---

## Context

Describe the situation that requires an architecture decision.

Include:

- Product need
- Technical constraint
- Security or data concern
- Integration dependency
- MVP tradeoff

---

## Decision

State the decision clearly.

Example:

```text
PassTo will store generated PDFs in Supabase Storage and track metadata in `pdf_exports`.
```

---

## Options Considered

### Option A — Name

Summary, benefits, and risks.

### Option B — Name

Summary, benefits, and risks.

### Option C — Name

Summary, benefits, and risks.

---

## Rationale

Explain why this decision was chosen.

Keep the explanation understandable for David as Product Owner while preserving enough technical detail for Claude implementation.

---

## Consequences

What changes because of this decision?

Include:

- Product impact
- Engineering impact
- Security impact
- Data impact
- Integration impact
- Future flexibility

---

## Risks

List known risks.

```text
Risk:
Mitigation:
Owner:
```

---

## Follow-Up Tasks

- TASK-0000 — Example follow-up

---

## Review / Approval

```text
Codex Architecture Review:
David Approval:
Claude Implementation Impact:
```

---

## Notes

This is an example/template ADR.

Real ADRs should be copied from this file into a new numbered file such as:

```text
ADR-0002-supabase-storage-for-pdfs.md
```
