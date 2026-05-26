# DECISION-0016 — Direct David Approval of V4 Migration After Claude Review

**Date:** 2026-05-26  
**Decision Owner:** David Bloom  
**Status:** Approved  
**Recorded By:** Codex  
**Related Artifacts:**  
- `docs/architecture/V4_MIGRATION_SQL.md`  
- `docs/architecture/V4_MIGRATION_VERIFICATION.md`  
- `docs/architecture/CODEX_QA_V4_MIGRATION_REVIEW.md`  

---

## Decision

David approved the v4 Supabase migration directly with Claude after Claude completed the v4 migration and verification work.

This approval supersedes the Codex QA hold recorded in:

```text
docs/architecture/CODEX_QA_V4_MIGRATION_REVIEW.md
```

Codex did not approve the v4 migration artifacts in that review. Codex recorded `Changes Required` based on documentation/schema-risk findings. David has elected to proceed based on direct approval with Claude.

---

## Context

Codex QA identified concerns in the v4 migration documentation and schema posture, including:

- The main SQL artifact did not appear to include remediation migrations R1/R2 inline.
- The verification report and SQL seed data appeared inconsistent for `license_status_mappings`.
- The `verification_tokens` revoke policy appeared broader than ideal.
- Some cascade delete paths appeared potentially inconsistent with the 7-year retention goal.
- `show_qr` remained in schema while deferred in the PRD.
- `stripe_customers` was removed despite the prior TASK-0007 recommendation to retain it.

David reviewed/approved directly with Claude and accepted proceeding despite the Codex QA hold.

---

## Approval Scope

This decision records David approval of the v4 migration path as handled with Claude.

This approval does not automatically approve:

- Production launch.
- Stripe live-mode changes.
- Wallet certificate/signing production changes.
- Lovable production cutover.
- Public launch.

Those remain separate approvals.

---

## Required Documentation Follow-Up

To keep the record clean, Claude or Codex should update the active task/status files to show:

```text
V4 migration: Approved directly by David with Claude
Codex QA: Changes Required / superseded by David direct approval
```

The Codex QA review should remain in the repo as a risk record, not be deleted or rewritten.

---

## Risk Acceptance

David accepts the risk of proceeding despite the Codex QA findings documented in `CODEX_QA_V4_MIGRATION_REVIEW.md`.

Any future issue arising from those findings should reference this decision record.
