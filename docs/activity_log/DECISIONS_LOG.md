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

---

## DECISION-0011 — MVP Migration-Blocking Decisions (See Canonical File)

**Date:** 2026-05-24  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** Claude Task 001-R  
**Area:** Product / Architecture / Security / Data / Pricing  

### Decision

Ten migration-blocking decisions approved by David. Full content in canonical file:

```text
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
```

### Summary of Approved Decisions

1. Data retention: 7 years for operational, audit, payment, and verification records.
2. Share-link verification token TTL: 72 hours or first successful use.
3. Show-QR token TTL: 45 minutes or first use.
4. Free-tier license entitlement: 1 license only, no additional license purchases in MVP.
5. Paid additional-license entitlement: Standard = 1 included + $4.99 each; Premier = 2 included + $4.99 each.
6. Subscription pricing: Standard = $9.99/month; Premier = $19.99/month.
7. PDF storage: Supabase Storage.
8. PDF records: tracked in `pdf_exports` table.
9. PDF access control: authenticated nurse access or short-lived signed URLs.
10. PDF disclaimer: static record with `disclaimer_version` field.

### Consequences

- Schema supports 7-year retention with `ON DELETE RESTRICT` on financial and PDF records.
- Token TTL behavior distinguishes share_link from show_qr.
- Free users cannot purchase additional licenses in MVP.
- Standard and Premier plans support paid additional-license purchases.

### Risks / Follow-ups

- PDF QR token TTL still requires confirmation if PDF QR remains in MVP.
- Terms of Use still requires final drafting.
- Legal counsel may modify the 7-year retention period.

---

## DECISION-0012 — Stack Migration: Airtable and Make Abandoned, Supabase and Vercel Adopted

**Date:** 2026-05-25  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0003  
**Area:** Architecture  

### Context

PassTo was originally built on Airtable (database) and Make/Integromat (orchestration). The business logic captured in those tools needed to be migrated to a more capable foundation.

### Decision

Airtable and Make are abandoned as execution platforms. All data moves to Supabase PostgreSQL with RLS. All orchestration logic moves to Supabase Edge Functions or Vercel server-side routes.

### Rationale

Supabase provides a production-grade relational database, row-level security, auth, storage, and Edge Functions in one platform. The Airtable/Make stack was not suitable for credential-grade security, token validation, or service-role operations.

### Consequences

- Do not write new specs, task files, or blueprints against Airtable or Make.
- All business logic from Make scenarios (S2–S13) must be re-specced for Supabase.
- The Airtable base (`appn3CMhqiH4ExTOP`) is abandoned.
- All future implementation tasks target Supabase + Vercel.

### Risks / Follow-ups

- Business logic from abandoned Make scenarios must be explicitly translated into Supabase task specs before implementation.
- Old Make webhook assumptions may still be embedded in the Lovable frontend and must be audited.

---

## DECISION-0013 — Platform Ownership Boundaries: Lovable / Supabase / Vercel

**Date:** 2026-05-25  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0004  
**Area:** Architecture  

### Context

With the stack confirmed, clear ownership boundaries were needed between Lovable (frontend), Supabase (backend/data), and Vercel (targeted API routes) to prevent future implementation drift.

### Decision

```text
Lovable owns the MVP user experience.
Supabase owns product data, auth/data security, RLS, and preferred backend orchestration.
Vercel owns backend/API routes only where Supabase Edge Functions are not the right fit.
```

Lovable remains the MVP frontend builder and website host unless David explicitly changes this.  
Supabase is the MVP system of record.  
Vercel is not the default frontend host. It is a targeted backend/API option.

Full canonical reference:

```text
/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md
```

### Rationale

Clear ownership prevents implementation tasks from placing secrets, trust decisions, or backend orchestration in the wrong layer — particularly in Lovable, which must not perform privileged operations.

### Consequences

- Every future implementation task must declare: frontend owner, data owner, backend owner, integrations touched, secrets involved, service-role required, RLS impact, user-visible routes affected.
- New Vercel routes require explicit justification before implementation.
- Lovable must not hold secrets or perform credential/payment/token trust decisions.

### Risks / Follow-ups

- Four open decisions remain on specific platform assignments: wallet signing, ID.me callback, Stripe webhooks, PDF generation.
- Selfie ownership (ID.me vs. PassTo-owned) requires clarification.
- Lovable backend invocation pattern (auth method for Edge Function calls) is not yet defined.

---

## DECISION-0014 — Subscription Pricing Confirmed

**Date:** 2026-05-26  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** TASK-0006 / DECISION-0011  
**Area:** Product / Pricing  

### Context

DECISION-0010 noted subscription pricing as a remaining follow-up. DECISION-0011 (approved 2026-05-24) included explicit pricing. This entry closes the open item from DECISION-0010.

### Decision

```text
Standard subscription: $9.99/month
Premier subscription: $19.99/month
```

### Rationale

Pricing was confirmed by David as part of the MVP migration-blocking decisions (DECISION-0011) and is incorporated in the v3 schema artifact and Supabase Schema and RLS Plan.

### Consequences

- S1-OD-02 in `PRD_SECTION_01_MASTER_TASK_LIST.md` is resolved.
- Stripe product setup can proceed using these prices once migration is approved.
- DECISION-0010 follow-up risk is closed.

### Risks / Follow-ups

- Annual plan, trial, and coupon/discount behavior remain unconfirmed for MVP.
