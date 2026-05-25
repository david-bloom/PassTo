# PassTo PRD Outline — Claude Review Draft

**Status:** Draft for Claude Review
**Owner:** Codex
**Reviewer:** Claude
**Final Approver:** David
**Created:** 2026-05-25

---

> **CLAUDE REVIEW — SESSION DATE: 2026-05-25**
>
> Review complete. Comments are embedded inline below each section using `> CLAUDE:` blockquotes.
> Two architectural decisions were confirmed by David during this review session and are recorded here as closed items:
>
> - **Stack confirmed:** Airtable and Make are being abandoned. Supabase (database, RLS, Edge Functions) and Vercel (hosting) replace them.
> - **Frontend confirmed:** Lovable is retained as the UI layer, deployed to Vercel.
>
> These decisions resolve the critical stack ambiguity identified in the review. Supabase references throughout this document are now correct. Make and Airtable references are obsolete and should not appear in the full PRD.
>
> Remaining recommendations require Codex action before the full PRD is drafted. See each section below.

---

## Purpose

This document defines the proposed outline for the PassTo Product Requirements Document before the full PRD is written.

The goal is to confirm that Claude agrees with the PRD structure, identify missing product or engineering concerns, and capture Claude feedback before Codex drafts the full PRD.

This is not the final PRD.

## Review Protocol

Claude should add comments directly against this file or submit a review note that identifies:

1. **Agreement** — sections that are sufficient and should remain.
2. **Concerns** — sections that are unclear, incomplete, risky, or likely to cause implementation drift.
3. **Missing sections** — product, architecture, data, security, operational, or QA topics that should be added before the full PRD is drafted.
4. **Scope risks** — anything that appears too large, too vague, or too ambitious for MVP.
5. **Execution risks** — anything that may block Claude from writing or implementing future task specs cleanly.
6. **Recommended changes** — specific edits, additions, or deletions.

Claude should not rewrite the full PRD at this stage unless David explicitly asks. The intended output is actionable feedback for Codex review.

## Current Source Documents

The full PRD should synthesize the current canonical PassTo documents, including:

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

> **CLAUDE — EXECUTION RISK:** None of these 13 source documents exist yet. If Codex drafts the full PRD without them, it will be working from this outline alone rather than from canonical decisions, feature specs, and activity history. Either create these documents first, or treat the full PRD itself as the canonical source and state that explicitly. Do not imply the full PRD was synthesized from sources that do not exist.

## Proposed PRD Structure

The full PRD should be created at:

```text
/docs/prd/PASS_TO_PRD.md
```

---

### 1. Product Summary

Define PassTo in plain language:

- What PassTo is.
- Who it serves.
- What problem it solves.
- What the MVP must prove.

> **CLAUDE — AGREEMENT:** Correct scope and framing. The four bullets are the right orienting questions for Section 1.
>
> **CLAUDE — RECOMMENDED ADDITION:** Add a **Technical Context** subsection here (or as a standalone section before Section 1) that states the confirmed stack: Lovable (frontend, deployed to Vercel), Supabase (database, RLS, Edge Functions), and the no-code/low-code founder-maintainable constraint. This prevents Codex from drafting requirements against infrastructure David cannot operate, and prevents future Claude task specs from targeting the wrong layer.
>
> **CLAUDE — RECOMMENDED ADDITION:** Add a **Current Build State** subsection noting that PassTo is not a net-new product. Prior Make scenarios and Airtable schema have been abandoned; the business logic they encoded (identity verification, license lookup, data matching, audit requirements) carries forward and must be re-specced for Supabase. Lovable UI screens exist and are retained. Without this note, Codex will spec completed or in-progress work as net-new.

---

### 2. Problem Statement

Describe the core market and workflow problem:

- Licensed professionals need a better way to present verified credentials.
- Verifiers need fast, trustworthy access to current credential status.
- Existing credential verification workflows are fragmented, slow, and often manual.

> **CLAUDE — AGREEMENT:** Well-framed. The three bullets are accurate and sufficient for a PRD outline.

---

### 3. Target Users

Define primary and secondary user groups:

- Nurse / credential holder.
- Verifier / employer / reviewer.
- PassTo admin / operations user.
- Future institutional buyer or employer account.

> **CLAUDE — CONCERN:** "Future institutional buyer or employer account" is a post-MVP persona. Listing it alongside MVP personas risks scope expansion during full PRD drafting. **Recommended change:** Label it explicitly as `[Post-MVP]` or move it to Section 16 (Post-MVP Backlog).

---

### 4. MVP Goals

Define what MVP must accomplish:

- Allow a nurse to create and manage a PassTo credential profile.
- Store license and credential data in Supabase.
- Allow a verifier to view a credential through a controlled share link or QR flow.
- Support basic subscription / tier-based feature access.
- Support refresh, notification, and PDF export behaviors at an MVP-safe level.
- Establish enough auditability and operational logging to support a commercial launch.

> **CLAUDE — AGREEMENT:** Supabase reference is now correct (stack confirmed). Goals match the known product scope.
>
> **CLAUDE — MISSING:** Identity verification and data matching are not mentioned here. The onboarding flow is: account creation → ID.me identity verification → phone (Twilio) verification → license lookup → data matching → selfie. These steps are not incidental — data matching is a hard gate for credential issuance. Add a goal: "Verify nurse identity via ID.me and confirm license ownership via name-based data matching before credential issuance."

---

### 5. MVP Non-Goals

Explicitly define what is out of scope for the first build:

- Multi-state full automation unless separately approved.
- Enterprise employer dashboards unless separately approved.
- Fully automated licensing-source coverage for every profession/state.
- Complex compliance frameworks such as HIPAA or ISO certification.
- Deep analytics beyond launch-readiness operational reporting.

> **CLAUDE — AGREEMENT:** Well-judged exclusion list. Deferring enterprise dashboards, full HIPAA compliance, and deep analytics is correct.

---

### 6. User Journeys

Document key user journeys:

- Nurse onboarding.
- Credential creation.
- Credential dashboard review.
- Share link creation.
- QR scan / verifier view.
- Manual or scheduled credential refresh.
- Subscription upgrade or paid action.
- PDF export.
- Notification receipt.
- Admin troubleshooting.

> **CLAUDE — CONCERN:** The nurse onboarding journey is missing four distinct steps that are core product requirements, not implementation details:
>
> - **ID.me identity verification** (IAL2 required; IAL1 triggers a retry path)
> - **Phone verification via Twilio SMS**
> - **License lookup via RapidAPI**
> - **Data matching** (name normalization and word-boundary comparison against license record; hard gate for credential issuance — a failed match sets account to Flagged and blocks issuance)
> - **Selfie capture** (follows a successful data match)
>
> **Recommended change:** Expand "Nurse onboarding" into explicit sub-steps, or add each as a named journey. Without this, the full PRD will not spec these flows and task decomposition will miss them.
>
> **CLAUDE — RECOMMENDED ADDITION:** Add a **Failure state journeys** section covering: ID.me returns IAL1, data match fails, license lookup returns no result, wallet pass issuance fails, payment fails. These are user-facing states that require designed responses, not just error handling.

---

### 7. Core Feature Requirements

Summarize product requirements by feature area:

- Account/profile setup.
- License data capture.
- Credential record creation.
- Credential display.
- Share links and QR codes.
- Verifier credential view.
- Refresh and status updates.
- Subscription gating.
- Notifications.
- PDF export.
- Wallet pass integration.
- Audit and operational events.

> **CLAUDE — CONCERN:** Three feature areas are missing that are required for credential issuance to work:
>
> - **Identity verification** (ID.me IAL2 flow, assurance level routing, uniqueness check)
> - **Data matching** (name normalization, match/fail routing, account flagging, temp field cleanup, audit trail write)
> - **Selfie capture** (post-match step before credential issuance)
>
> **Recommended change:** Add these three as named feature areas before "Credential record creation," since credential creation cannot proceed without them.
>
> **CLAUDE — SCOPE RISK:** "Audit and operational events" is listed alongside user-facing features such as notifications and PDF export. Audit and operational events are infrastructure requirements, not a feature area. Listing them here creates a risk that they are treated as optional or descoped in a resource-constrained sprint. **Recommended change:** Remove audit/operational events from this feature list and move them to Section 11 (Security) or Section 12 (Admin/Ops) as a non-optional MVP infrastructure requirement.

---

### 8. Feature Tier Requirements

Translate the tier feature docs into PRD-level requirements:

- Free tier.
- Standard tier.
- Premier tier.
- Paid one-off actions, if approved.
- Upgrade gates.
- What happens when a subscription lapses.

> **CLAUDE — AGREEMENT:** Correct to include subscription lapse behavior as a PRD-level requirement. That edge case causes silent failures if not specced early.
>
> **CLAUDE — OPEN ISSUE (noted from outline):** Final Standard and Premier pricing is subject to David approval (SD-3). The full PRD should preserve this as an open item with a placeholder, not a resolved value.

---

### 9. Data Model Overview

Summarize the expected Supabase data model without replacing the future schema task.

Expected concepts include:

```text
accounts
profiles
nurses
licenses
credentials
verification_tokens
verifiers
verification_events
refresh_events
payments
subscriptions
stripe_events
pdf_exports
notification_events
jobs
audit_events
license_status_mappings
```

The PRD should describe why these entities exist and how product features depend on them.

Detailed schema and RLS policy implementation should remain a later task.

> **CLAUDE — AGREEMENT:** Correct to describe entities and their product purpose at PRD level without prescribing schema. Supabase is confirmed as the target.
>
> **CLAUDE — SCOPE RISK:** Seventeen entities is a large data model for a founder-operated MVP. The PRD should note which entities are launch-critical vs. which can be deferred or simplified. In particular, `jobs` as a standalone entity (vs. handled implicitly by Edge Functions), and `license_status_mappings` (currently seeded in a Make Data Store), should be confirmed as MVP-required before TASK-0004 begins.
>
> **CLAUDE — NOTE:** The existing Airtable schema (NURSES, LICENSES, CREDENTIALS, AUDIT_LOG, VERIFICATIONS, PAYMENTS, REFRESH_EVENTS tables) is abandoned. The business logic it encoded carries forward. TASK-0004 (Supabase schema and RLS plan) should reference the prior Airtable schema as a logic source, not a migration target.

---

### 10. Integrations

Define integration responsibilities and MVP expectations:

- Supabase.
- Vercel.
- Stripe.
- PassKit / Apple Wallet.
- Google Wallet.
- Postmark.
- PDFMonkey.
- Licensing source / vendor API.
- Scheduled jobs or Supabase Edge Functions.

The PRD should distinguish launch-critical integrations from post-MVP or phase-later integrations.

> **CLAUDE — CONCERN:** Three integrations that are active in the current build are missing:
>
> - **ID.me** — identity verification provider; central to the onboarding trust model; a full blueprint exists for this integration. Must be listed.
> - **Twilio** — SMS provider for phone verification; already provisioned; Twilio A2P 10DLC registration (TC-11) is a pre-launch blocker.
> - **RapidAPI** — nurse license lookup vendor; provides the license record used in data matching.
>
> **Recommended change:** Add ID.me, Twilio, and RapidAPI to the integrations list. The full PRD must describe what each integration does and which feature area depends on it.
>
> **CLAUDE — AGREEMENT:** "Supabase Edge Functions" is the correct orchestration answer now that Make is abandoned. The full PRD should confirm that all orchestration logic (verification callbacks, license lookup, credential issuance, scheduled refresh, expiry alerts) runs as Supabase Edge Functions.
>
> **CLAUDE — NOTE ON LOVABLE:** Lovable is the frontend (confirmed by David, 2026-05-25), deployed to Vercel. Existing Lovable screens make API calls that previously targeted Make webhook URLs. Those calls will now target Supabase Edge Function URLs. Task specs for any screen that calls a backend endpoint will need an endpoint update task alongside the Edge Function build task.

---

### 11. Security, Privacy, and Access Control

Document product-level requirements for:

- Supabase RLS expectations.
- Credential-holder access.
- Verifier-token access.
- Service-role jobs.
- Payment-gated actions.
- Auditability.
- Data minimization.
- Expiring and one-time verifier access tokens.

> **CLAUDE — AGREEMENT:** RLS language is now correct and appropriate with Supabase confirmed. The intent list is complete at outline level.
>
> **CLAUDE — NOTE:** The data matching step handles sensitive identity data (ID.me first name, last name, date of birth). The PRD's security section must specify that these fields are temporary, cleared immediately after matching (pass or fail), and never returned in any API response to the frontend. This was a hard constraint in the prior spec and must carry forward.

---

### 12. Admin and Operations Requirements

Define what David / PassTo operations need to manage MVP safely:

- View user/account records.
- View credential and license records.
- Inspect failed jobs.
- Review audit events.
- Retry or resolve failed operations where appropriate.
- Receive ops alerts.

> **CLAUDE — AGREEMENT:** Correct to include admin/ops requirements at PRD level.
>
> **CLAUDE — CONCERN:** "Inspect failed jobs" and "Retry or resolve failed operations" require a defined admin interface. With Make abandoned, there is no longer a built-in execution log UI. The full PRD must define what the admin tooling looks like — whether that is a Supabase dashboard view, a lightweight admin UI in Lovable, or a separate tool. This should not be left undefined until EPIC-011.
>
> **CLAUDE — CONCERN:** "Receive ops alerts" has no defined mechanism in the current blueprint set. The full PRD should specify at minimum what triggers an alert and what channel it uses (email via Postmark, or another mechanism).
>
> **CLAUDE — MISSING:** No section addresses degraded-mode behavior when an integration fails at runtime: RapidAPI is unreachable, Postmark delivery fails, PDFMonkey is unavailable, Stripe webhook is missed, ID.me returns an unexpected error. For MVP, a minimal policy must exist — even "fail loudly and notify ops via Postmark" is sufficient — because without it every integration task spec will be incomplete and Edge Functions will be written without defined failure handling. **Recommended addition:** Add a "Degraded Mode and Integration Failure Policy" subsection to Section 12, stating the default failure posture and the ops notification trigger for each critical integration path.

---

### 13. Success Metrics

Define MVP success signals:

- User can complete onboarding.
- Credential can be created and viewed.
- Verifier view works from share link / QR.
- Refresh behavior is reliable.
- Subscription gates work correctly.
- PDF export works if included in MVP.
- Critical failure paths generate useful operational visibility.

> **CLAUDE — CONCERN:** These are technical completion metrics, not business success metrics. The existing PRD v1.0 defined a clear business goal: 100 verified nurses within 90 days of launch. That metric is absent here.
>
> **Recommended change:** Add a business success metric to Section 13. The 90-day / 100-verified-nurse target (or David's current revised target) should appear alongside the technical metrics so the full PRD reflects both dimensions of MVP success.

---

### 14. MVP Acceptance Criteria

Define PRD-level Done criteria:

- Product scope is explicit.
- MVP and non-MVP boundaries are clear.
- User journeys are complete enough for task decomposition.
- Core data concepts are identified.
- Security and access-control intent is documented.
- Open questions are visible and do not block unnecessary work.
- Claude can convert PRD requirements into executable task specs after Codex review.

> **CLAUDE — AGREEMENT:** Appropriate meta-criteria for the PRD document itself. The final bullet ("Claude can convert PRD requirements into executable task specs") is the right quality bar and should be evaluated explicitly before TASK-0003 is closed.

---

### 15. Open Questions

The PRD should preserve unresolved decisions, including:

- Final Standard and Premier subscription pricing.
- Whether wallet passes are MVP launch-critical or Phase 1.1.
- First supported licensing source and state/profession scope.
- Manual/admin fallback policy when automated verification is unavailable.
- Whether Free users can buy additional licenses in MVP.
- Exact PDF export provider implementation details.
- Final verifier disclaimer / Terms of Use language.

> **CLAUDE — CONCERN:** Two items listed as open are already resolved and should be closed before the full PRD is drafted:
>
> - **"Whether wallet passes are MVP launch-critical or Phase 1.1"** — The PassTo product IS the wallet pass. Every existing blueprint defines the credential as a digital pass in Apple Wallet or Google Wallet. This is not open. Close it as a confirmed MVP requirement or document a decision to change the product definition.
>
> - **"First supported licensing source and state/profession scope"** — Resolved in Blueprint 05 (License Lookup, v1.4). RapidAPI is the confirmed vendor; coverage is determined by RapidAPI's nurse license API. This should be listed as a closed decision, not an open question.
>
> **CLAUDE — RECOMMENDED ADDITIONS:** The following are genuinely open and should be added to this list:
>
> - Final verifier token lifecycle: how long does a share link remain active, and under what conditions does it expire (72-hour expiry, first verified view, or both — the prior spec defined this but it is not reflected here).
> - Whether Passkit wallet pass templates are created before or after the Supabase schema task (TC-6 is a current pre-launch blocker).
> - Admin tooling mechanism for inspecting failed Edge Function jobs.
> - **TC-11: Twilio A2P 10DLC registration** — EIN pending from NYS. This directly affects whether SMS-based phone verification and notifications can go live at launch. If unresolved at launch date, the PRD must define a fallback (email-only notifications, manual phone verification, or soft-launch without SMS). This should be a named open question, not just a known blocker in the activity log.

---

### 16. Post-MVP Backlog

Capture likely future work without allowing it to distort MVP:

- Employer/institution dashboards.
- Additional license types and states.
- Advanced verifier analytics.
- Deeper wallet pass lifecycle automation.
- More sophisticated notification preferences.
- Institutional billing.
- Broader compliance hardening.

> **CLAUDE — AGREEMENT:** Well-scoped. All items are correctly deferred.

---

## Proposed Companion Backlog Document

Codex recommends creating a companion backlog after the PRD structure is approved:

```text
/docs/tasks/MVP_TASK_BACKLOG.md
```

Suggested epic groups:

```text
EPIC-001 — Supabase foundation
EPIC-002 — Account and profile onboarding
EPIC-003 — License and credential records
EPIC-004 — Verifier credential view
EPIC-005 — Share links and QR codes
EPIC-006 — Refresh and status updates
EPIC-007 — Subscription gating
EPIC-008 — Notifications
EPIC-009 — PDF export
EPIC-010 — Wallet pass integration
EPIC-011 — Admin/ops tools
EPIC-012 — QA, security, and launch readiness
```

> **CLAUDE — AGREEMENT:** The 12-group structure covers the right territory and the sequence is logical.
>
> **CLAUDE — SCOPE RISK:** EPIC-012 (QA, security, and launch readiness) combines at minimum four distinct workstreams: QA test coverage, RLS policy validation, security review, and launch readiness checklist (Twilio A2P 10DLC, Passkit templates, Stripe configuration, ID.me production credentials). Grouping these as a single epic may cause them to be underplanned. Consider splitting into EPIC-012 (QA and security) and EPIC-013 (launch readiness) during backlog creation.
>
> **CLAUDE — CONCERN — EPIC ORDERING:** EPIC-007 (Subscription gating) is sequenced after the feature epics it gates. Subscription gate logic touches account creation, credential display, share link generation, refresh, and PDF export. If gating is not defined before those epics are built, each feature will require retrofit. Recommend that subscription gating requirements be defined (not necessarily built) concurrently with EPIC-002, so later epics are built gate-aware from the start.
>
> **CLAUDE — MISSING EPIC:** There is no epic for **Identity verification and data matching** (ID.me callback, phone verification, license lookup, data matching, selfie capture). This is the critical onboarding path and a hard gate for credential issuance. It should appear as a named epic — suggested: **EPIC-002b — Identity verification and data matching** — between EPIC-002 (Account onboarding) and EPIC-003 (License and credential records).

---

## Codex Recommendation

Proceed in this order:

```text
TASK-0003 — Create PassTo PRD v0.1 and MVP Task Backlog
TASK-0004 — Create Supabase Schema and RLS Plan
TASK-0005 — Create MVP Build Sequence for Claude
```

Claude feedback on this outline should be reviewed before TASK-0003 is finalized.

> **CLAUDE — AGREEMENT:** Correct task sequence. TASK-0003 should not be finalized until the following are resolved:
>
> 1. Section 4, 6, 7, 10 updated to include ID.me, Twilio, and RapidAPI.
> 2. Section 15 open questions closed for wallet passes and RapidAPI scope.
> 3. Section 13 updated with a business success metric.
> 4. A missing epic added for identity verification and data matching.
> 5. Section 1 updated with confirmed stack (Supabase + Vercel + Lovable) and current build state note.
>
> Subject to those revisions, Claude is ready to review the full PRD (TASK-0003 output) and write executable task specs thereafter.
