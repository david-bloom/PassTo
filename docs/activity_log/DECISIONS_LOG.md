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

---

## DECISION-0002 — Product Attributes Blueprint Decomposed into Canonical Docs

**Date:** 2026-05-24  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0002  
**Area:** Product / Operations  

### Context

The Product Attributes Blueprint v1.6 contained tier features, sharing, refresh, PDF export, subscriptions, notifications, verifier flow, and Airtable/Make implementation details in one large document.

### Decision

Decompose the blueprint into canonical feature, flow, and architecture documents.

### Rationale

Smaller canonical documents are easier for Codex to task from, easier for Claude to execute against, and easier for David to review.

### Consequences

The Product Attributes Blueprint remains source material, but future execution should reference the canonical GitHub docs created under TASK-0002.

### Risks / Follow-ups

- Feature docs remain Draft/Baseline unless explicitly marked Ready for Tasking.
- Implementation tasks still require David approval.

---

## DECISION-0003 — Notifications Replaces Expiry Alerts as Feature Scope

**Date:** 2026-05-24  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0002  
**Area:** Product  

### Context

Expiry alerts are only one notification type PassTo will need.

### Decision

Create `/docs/features/NOTIFICATIONS.md` rather than a narrow expiry-alerts-only document.

### Rationale

The notification system must account for expiry alerts, status changes, refresh results, payment events, subscription events, share-viewed events, PDF events, account/security notifications, and operational/admin alerts.

### Consequences

Expiry alerts are treated as one category inside the broader notifications feature.

### Risks / Follow-ups

- Full notification matrix by tier remains to be defined.

---

## DECISION-0004 — Sharing and Verifier Credential View Remain Separate Docs

**Date:** 2026-05-24  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0002  
**Area:** Product / Architecture  

### Context

Sharing and verifier credential view are connected but represent different product concerns.

### Decision

Keep sharing as a feature doc and verifier credential view as a flow doc.

### Rationale

Sharing is nurse-side token creation and entitlement logic. Verifier credential view is the external verifier access flow.

### Consequences

Relevant docs:

```text
/docs/features/SHARING.md
/docs/flows/VERIFIER_CREDENTIAL_VIEW.md
```

### Risks / Follow-ups

- Task specs that touch token behavior must reference both docs.

---

## DECISION-0005 — Verifier Access Uses One-Time Short-Lived Tokens

**Date:** 2026-05-24  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0002  
**Area:** Product / Security  

### Context

Verifier access can occur through a nurse-sent link, nurse-generated QR code, or PDF QR code.

### Decision

All live verifier access tokens are one-time and short-lived. A PDF is durable but static. All live views and PDFs must disclose current-as-of date/time.

### Rationale

This limits stale credential access and keeps the PDF as the durable record.

### Consequences

Token status is mutually exclusive. If a token is used, it remains `used` and does not later become `expired`.

### Risks / Follow-ups

- Exact token expiration duration must be set in implementation task specs.

---

## DECISION-0006 — Wallet Pass Does Not Carry Permanent Verification QR

**Date:** 2026-05-24  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0002  
**Area:** Product / Security / Architecture  

### Context

A permanent QR on the wallet pass could provide stale or persistent verifier access.

### Decision

The wallet pass itself does not carry a permanently valid verification QR. The nurse initiates sharing or “show QR,” which creates a short-lived one-time verification token.

### Rationale

Verification access should be nurse-controlled and time-limited.

### Consequences

Wallet pass displays credential state; verifier access is tokenized separately.

### Risks / Follow-ups

- UX for “show QR” must be specified in a later task.

---

## DECISION-0007 — Product Attribute Architecture Moves Away from Airtable/Make Assumptions

**Date:** 2026-05-24  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0002  
**Area:** Architecture  

### Context

The original blueprint used Airtable tables, Make scenarios, and webhook-status fields.

### Decision

Translate the product attributes model to Supabase/Vercel architecture: Supabase Postgres/RLS, Vercel app/API routes, Stripe webhooks, jobs table, PassKit, Postmark, and PDFMonkey.

### Rationale

The new architecture needs durable relational state, explicit access policies, and purpose-built event tables.

### Consequences

`audit_events` is not the dashboard source of truth. Purpose-built tables should drive product state.

### Risks / Follow-ups

- Exact Supabase schema and RLS policies require a later task.

---

## DECISION-0008 — Status Translation System Required

**Date:** 2026-05-24  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0002  
**Area:** Product / Architecture  

### Context

Licensing boards may return varied raw status strings. PassTo must display board status while also making product and wallet-pass decisions.

### Decision

PassTo stores source raw status, source display status, normalized status, and wallet pass treatment.

### Rationale

This preserves source fidelity while allowing consistent product behavior.

### Consequences

Raw source `unknown` is a verification failure and should not issue or update a credential as valid. Active licenses with fewer than 30 days until expiration receive wallet pass treatment `caution`.

### Risks / Follow-ups

- Status mapping values must be defined by source before implementation.

---

## DECISION-0009 — Verifier Form, Disclaimers, and Consent

**Date:** 2026-05-24  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0002  
**Area:** Product / Legal / Privacy  

### Context

The verifier flow needs clear data collection, disclaimer, and consent behavior.

### Decision

Verifier form collects only name and email. The verifier must agree to PassTo’s Terms of Use. Marketing contact is optional. Live verifier pages and PDFs use approved current-as-of disclaimers.

### Rationale

This keeps verifier data collection minimal while supporting verification records and responsible communication.

### Consequences

No verifier organization, title, phone, address, or extra information is collected in MVP.

### Risks / Follow-ups

- Terms of Use page still needs final drafting.

---

## DECISION-0010 — MVP Pricing and License Entitlements Confirmed

**Date:** 2026-05-24  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0002  
**Area:** Product / Pricing  

### Context

The Product Attributes Blueprint contained some working assumptions and one conflict around additional-license entitlements.

### Decision

MVP usage pricing is confirmed: $1.99 share/refresh/PDF where paid and $4.99 additional license. License entitlements are Free = 1 license, Standard = 1 license included, Premier = 2 licenses included.

### Rationale

These values are sufficient for MVP documentation and later Stripe product/payment setup.

### Consequences

Additional licenses are $4.99 each beyond included entitlement.

### Risks / Follow-ups

- Standard and Premier subscription prices still require final confirmation before Stripe product creation.
