# PassTo PRD Outline — Claude Review Draft

**Status:** Draft for Claude Review  
**Owner:** Codex  
**Reviewer:** Claude  
**Final Approver:** David  
**Created:** 2026-05-25  
**Updated:** 2026-05-25  

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

## Current MVP Platform Decision

David intends to retain Lovable for MVP to reduce cost of change.

For PRD and task planning purposes, assume:

```text
Lovable = MVP frontend builder / website host / app UI workspace
Supabase = system of record, auth/data/RLS foundation
Vercel = backend/API routes only where Lovable/Supabase Edge Functions are not sufficient or where existing signing/integration code requires it
Stripe = payments/subscriptions
Postmark = transactional email
PDFMonkey = PDF generation if retained for MVP
PassKit / Google Wallet = wallet integration if retained for MVP or Phase 1.1
```

This decision changes the PRD framing from “Vercel app frontend” to “Lovable-hosted MVP frontend with Supabase-backed data and controlled backend integrations.”

The PRD must clearly distinguish:

- Lovable-owned frontend pages and user flows.
- Supabase-owned data, auth, and RLS.
- Vercel/API-owned sensitive server-side operations, if needed.
- Third-party integration boundaries.

Claude should specifically review whether Lovable materially changes implementation sequencing, integration risk, authentication design, routing assumptions, or deployment responsibilities.

## Proposed PRD Structure

The full PRD should be created at:

```text
/docs/prd/PASS_TO_PRD.md
```

### 1. Product Summary

Define PassTo in plain language:

- What PassTo is.
- Who it serves.
- What problem it solves.
- What the MVP must prove.

### 2. Problem Statement

Describe the core market and workflow problem:

- Licensed professionals need a better way to present verified credentials.
- Verifiers need fast, trustworthy access to current credential status.
- Existing credential verification workflows are fragmented, slow, and often manual.

### 3. Target Users

Define primary and secondary user groups:

- Nurse / credential holder.
- Verifier / employer / reviewer.
- PassTo admin / operations user.
- Future institutional buyer or employer account.

### 4. MVP Goals

Define what MVP must accomplish:

- Allow a nurse to create and manage a PassTo credential profile.
- Keep Lovable as the MVP frontend/website host to reduce cost of change.
- Store license and credential data in Supabase.
- Allow a verifier to view a credential through a controlled share link or QR flow.
- Support basic subscription / tier-based feature access.
- Support refresh, notification, and PDF export behaviors at an MVP-safe level.
- Establish enough auditability and operational logging to support a commercial launch.

### 5. MVP Non-Goals

Explicitly define what is out of scope for the first build:

- Multi-state full automation unless separately approved.
- Enterprise employer dashboards unless separately approved.
- Fully automated licensing-source coverage for every profession/state.
- Complex compliance frameworks such as HIPAA or ISO certification.
- Deep analytics beyond launch-readiness operational reporting.
- Re-platforming the MVP frontend away from Lovable unless a blocking issue is identified.

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

The PRD should identify which journeys are implemented in Lovable UI and which require backend/API support.

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

### 8. Feature Tier Requirements

Translate the tier feature docs into PRD-level requirements:

- Free tier.
- Standard tier.
- Premier tier.
- Paid one-off actions, if approved.
- Upgrade gates.
- What happens when a subscription lapses.

Open issue: final pricing remains subject to David approval.

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

### 10. Platform and Integration Responsibilities

Define platform responsibilities and MVP expectations:

- Lovable: frontend app, website pages, MVP user flows, UI iteration, and hosted website experience.
- Supabase: database, auth/data foundation, RLS, storage if needed, and possibly Edge Functions/scheduled jobs.
- Vercel: backend/API routes only where needed for sensitive server-side integrations, signing flows, or capabilities not handled cleanly by Lovable/Supabase.
- Stripe: payments, subscriptions, checkout, webhook events.
- PassKit / Apple Wallet: wallet pass creation/update if included in MVP or Phase 1.1.
- Google Wallet: wallet pass creation/update if included in MVP or Phase 1.1.
- Postmark: transactional email.
- PDFMonkey: PDF export if retained.
- Licensing source / vendor API: license status lookup and refresh.
- Scheduled jobs or Supabase Edge Functions: refresh, expiry alerts, notification jobs, and operational maintenance.

The PRD should distinguish launch-critical integrations from post-MVP or phase-later integrations.

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
- Avoiding exposure of sensitive secrets or privileged operations inside Lovable frontend code.

The PRD should not attempt to write final RLS policies, but it must define the security intent clearly enough for a later schema/RLS task.

### 12. Admin and Operations Requirements

Define what David / PassTo operations need to manage MVP safely:

- View user/account records.
- View credential and license records.
- Inspect failed jobs.
- Review audit events.
- Retry or resolve failed operations where appropriate.
- Receive ops alerts.

The PRD should state whether admin/ops UI is built in Lovable for MVP or handled through Supabase/admin tooling during the earliest release.

### 13. Success Metrics

Define MVP success signals:

- User can complete onboarding through the Lovable-hosted frontend.
- Credential can be created and viewed.
- Verifier view works from share link / QR.
- Refresh behavior is reliable.
- Subscription gates work correctly.
- PDF export works if included in MVP.
- Critical failure paths generate useful operational visibility.

### 14. MVP Acceptance Criteria

Define PRD-level Done criteria:

- Product scope is explicit.
- MVP and non-MVP boundaries are clear.
- Lovable’s role in MVP frontend/hosting is explicit.
- User journeys are complete enough for task decomposition.
- Core data concepts are identified.
- Security and access-control intent is documented.
- Open questions are visible and do not block unnecessary work.
- Claude can convert PRD requirements into executable task specs after Codex review.

### 15. Open Questions

The PRD should preserve unresolved decisions, including:

- Final Standard and Premier subscription pricing.
- Whether wallet passes are MVP launch-critical or Phase 1.1.
- First supported licensing source and state/profession scope.
- Manual/admin fallback policy when automated verification is unavailable.
- Whether Free users can buy additional licenses in MVP.
- Exact PDF export provider implementation details.
- Final verifier disclaimer / Terms of Use language.
- Whether Vercel remains necessary for any MVP backend/API routes once Lovable + Supabase responsibilities are mapped.
- Whether admin/ops tooling is built in Lovable for MVP or deferred.

### 16. Post-MVP Backlog

Capture likely future work without allowing it to distort MVP:

- Employer/institution dashboards.
- Additional license types and states.
- Advanced verifier analytics.
- Deeper wallet pass lifecycle automation.
- More sophisticated notification preferences.
- Institutional billing.
- Broader compliance hardening.
- Possible frontend re-platforming only if MVP learning or operational risk justifies it.

## Proposed Companion Backlog Document

Codex recommends creating a companion backlog after the PRD structure is approved:

```text
/docs/tasks/MVP_TASK_BACKLOG.md
```

Suggested epic groups:

```text
EPIC-001 — Lovable MVP frontend and route map
EPIC-002 — Supabase foundation
EPIC-003 — Account and profile onboarding
EPIC-004 — License and credential records
EPIC-005 — Verifier credential view
EPIC-006 — Share links and QR codes
EPIC-007 — Refresh and status updates
EPIC-008 — Subscription gating
EPIC-009 — Notifications
EPIC-010 — PDF export
EPIC-011 — Wallet pass integration
EPIC-012 — Admin/ops tools
EPIC-013 — Backend/API integration boundaries
EPIC-014 — QA, security, and launch readiness
```

Claude should comment on whether these epic groups are sufficient, too broad, incorrectly ordered, or missing key implementation work.

## Codex Recommendation

Proceed in this order:

```text
TASK-0003 — Create PassTo PRD v0.1 and MVP Task Backlog
TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map
TASK-0005 — Create Supabase Schema and RLS Plan
TASK-0006 — Create MVP Build Sequence for Claude
```

Claude feedback on this outline should be reviewed before TASK-0003 is finalized.
