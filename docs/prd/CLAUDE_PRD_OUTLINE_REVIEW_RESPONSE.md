# Codex Response — Claude Review of PassTo PRD Outline

**Status:** Codex Review Complete  
**Owner:** Codex  
**Reviewer Input:** Claude comments in `/docs/prd/PASS_TO_PRD_OUTLINE.md`  
**Final Approver:** David  
**Created:** 2026-05-25  

## Summary

Claude's review is useful and should materially improve the PRD before TASK-0003 begins.

Most comments should be accepted. Several are especially important because they prevent implementation drift around identity verification, license lookup, data matching, failure states, admin operations, and launch blockers.

One Claude comment is factually incorrect and should not block PRD drafting: Claude states that the listed canonical source documents do not exist. They do exist in the repository and remain valid source material for the PRD.

## Codex Position

Proceed with the full PRD only after updating the PRD outline and TASK-0003 brief to reflect the accepted Claude feedback below.

## Important Correction

### Source documents existence

**Claude comment:** The 13 listed source documents do not exist.

**Codex response:** Reject / correct.

The canonical docs do exist and should remain PRD source material:

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

**Action:** Do not remove the source document list from the PRD outline. Add a note that Codex confirmed these docs exist.

## Platform Clarification Needed

### Lovable hosting vs. Vercel hosting

Claude's review states:

```text
Lovable is retained as the UI layer, deployed to Vercel.
```

David's latest instruction states:

```text
Lovable is hosting the website for MVP.
```

**Codex response:** Treat David's latest instruction as controlling unless David later clarifies otherwise.

For PRD purposes, assume:

```text
Lovable = MVP frontend builder and website host
Supabase = database, auth/data foundation, RLS, Edge Functions where appropriate
Vercel = backend/API hosting only where needed, not the default frontend host
Stripe = payments/subscriptions
Postmark = transactional email
Twilio = SMS / phone verification, subject to A2P 10DLC readiness
ID.me = identity verification
RapidAPI = nurse license lookup vendor
PDFMonkey = PDF generation if retained
PassKit / Google Wallet = wallet credential generation and lifecycle
```

**Action:** The PRD must include a platform responsibility map and explicitly prevent frontend/backend boundary confusion.

## Claude Feedback Decision Matrix

| Area | Claude Feedback | Codex Decision | PRD Action |
|---|---|---|---|
| Section 1 — Product Summary | Add technical context and current build state | Accept | Add stack context, founder-maintainable constraint, Lovable retention, abandoned Airtable/Make note |
| Section 3 — Target Users | Move future institutional buyer to post-MVP | Accept | Label institutional/employer buyer as post-MVP |
| Section 4 — MVP Goals | Add identity verification and license ownership matching | Accept | Add ID.me, phone verification, RapidAPI lookup, data matching, selfie gating |
| Section 6 — User Journeys | Expand onboarding and add failure states | Accept | Break onboarding into sub-journeys and add failure-state journeys |
| Section 7 — Core Features | Add identity verification, data matching, selfie capture | Accept | Add as named feature areas before credential issuance |
| Section 7 — Audit events | Move audit from optional feature list to infrastructure/security/ops | Accept | Reclassify as non-optional infrastructure requirement |
| Section 8 — Feature Tiers | Preserve pricing as open item | Accept | Keep final prices open unless David approves |
| Section 9 — Data Model | Mark launch-critical vs. deferrable entities | Accept | Add MVP-critical / deferred data concept classification |
| Section 9 — Airtable | Use prior Airtable schema as logic source, not migration target | Accept | Explicitly state no Airtable migration; carry forward business logic only |
| Section 10 — Integrations | Add ID.me, Twilio, RapidAPI | Accept | Add all three integrations and dependencies |
| Section 10 — Orchestration | Use Supabase Edge Functions for orchestration | Accept with nuance | Prefer Supabase Edge Functions; use Vercel only where needed |
| Section 10 — Lovable endpoints | Replace old Make webhook calls with Supabase Edge Function URLs | Accept | Add endpoint migration task requirement |
| Section 11 — Security | Temporary ID.me sensitive fields cleared after matching | Accept | Add hard requirement: do not persist or expose temporary identity fields beyond matching need |
| Section 12 — Admin/Ops | Define admin tooling mechanism | Accept | Add explicit MVP admin/ops approach |
| Section 12 — Ops alerts | Define trigger/channel | Accept | Add Postmark/email alert defaults unless another channel approved |
| Section 12 — Degraded mode | Add integration failure policy | Accept | Add degraded-mode policy by critical integration |
| Section 13 — Success Metrics | Add business metric, e.g. 100 verified nurses in 90 days | Accept but requires David confirmation | Use as placeholder unless David revises target |
| Section 15 — Wallet passes | Claude says wallet passes are not open | Accept as product-definition assumption | Treat Apple/Google wallet pass as MVP requirement unless David explicitly changes scope |
| Section 15 — RapidAPI scope | Claude says source/scope are closed | Accept with verification note | Treat RapidAPI nurse lookup as current MVP source; confirm exact coverage in implementation task |
| Section 15 — Token lifecycle | Add token expiration/open policy | Accept | Add open decision or carry forward 72-hour/first-view rule if already approved |
| Section 15 — Twilio A2P | Add TC-11 as open launch blocker | Accept | Add launch-readiness blocker and fallback decision |
| Companion backlog | Split QA/security and launch readiness | Accept | Separate epics |
| Companion backlog | Subscription gating defined earlier | Accept | Define gating rules before gated features are built |
| Companion backlog | Add identity verification/data matching epic | Accept | Add dedicated epic between onboarding and credential records |

## Required PRD Outline Changes

The PRD outline should be updated before drafting `/docs/prd/PASS_TO_PRD.md`.

### Add section: Technical Context and Current Build State

Required content:

- Lovable is retained as MVP frontend builder and website host.
- Supabase is the MVP database/auth/RLS foundation.
- Supabase Edge Functions are preferred for backend orchestration.
- Vercel is retained only for backend/API routes where needed.
- Airtable and Make are abandoned as execution platforms.
- Prior Airtable/Make artifacts should be used only as business-logic references.
- Existing Lovable screens should be reused where practical.
- MVP must remain founder-maintainable and avoid unnecessary re-platforming.

### Update MVP Goals

Add:

```text
Verify nurse identity via ID.me, verify phone ownership via Twilio where available, look up nurse license data via RapidAPI, and confirm license ownership through name-based data matching before credential issuance.
```

### Update User Journeys

Nurse onboarding should include:

```text
account creation
ID.me identity verification
Twilio phone verification
license lookup via RapidAPI
data matching
selfie capture
credential issuance
wallet pass creation
```

Add failure-state journeys for:

```text
ID.me returns IAL1 or verification failure
Twilio verification unavailable or failed
RapidAPI lookup unavailable or no result
Data match fails
Selfie capture fails or is abandoned
Wallet pass issuance fails
Payment fails
Postmark delivery fails
PDF generation fails
```

### Update Core Feature Requirements

Add feature areas:

```text
Identity verification
Phone verification
License lookup
Data matching
Selfie capture
Credential issuance gatekeeping
```

Move audit/event logging out of optional product features and into non-optional infrastructure/security/admin requirements.

### Update Integrations

The PRD integration list should include:

```text
Lovable
Supabase
Supabase Edge Functions
Vercel, if needed for backend/API routes
Stripe
ID.me
Twilio
RapidAPI
Postmark
PDFMonkey
PassKit / Apple Wallet
Google Wallet
```

### Update Security Section

Add requirements:

- Temporary identity fields from ID.me are used only for matching.
- Temporary identity fields are cleared immediately after matching decision.
- Temporary identity fields are never returned to frontend responses.
- Failed data matching flags account/credential issuance state and writes an audit event.
- Credential issuance is blocked until required identity, phone, license, and match gates pass.

### Update Admin/Ops Section

Add:

- Initial admin tooling mechanism: Supabase dashboard/views first, unless David approves a Lovable admin UI for MVP.
- Ops alert default: Postmark email alerts for critical failures.
- Failed Edge Function visibility must be defined before implementation.
- Degraded-mode behavior must be defined for every critical integration.

### Update Success Metrics

Add both technical and business success metrics.

Business metric placeholder:

```text
Target: 100 verified nurses within 90 days of launch, subject to David confirmation.
```

### Update Open Questions

Remove from open unless David reopens:

```text
Whether wallet passes are MVP launch-critical
First supported licensing source and state/profession scope
```

Add or preserve:

```text
Final Standard and Premier pricing
Final verifier token lifecycle
Twilio A2P 10DLC readiness and fallback if unavailable
Exact admin tooling mechanism
Exact degraded-mode policy by integration
Whether PassKit templates precede or follow Supabase schema task
Final verifier disclaimer / Terms of Use language
Whether Free users can buy additional licenses in MVP
Exact PDF export provider details
```

## Revised Backlog Epic Recommendation

Replace the prior epic list with:

```text
EPIC-001 — Lovable MVP frontend and route map
EPIC-002 — Supabase foundation
EPIC-003 — Account and profile onboarding
EPIC-004 — Identity verification, phone verification, license lookup, and data matching
EPIC-005 — License and credential records
EPIC-006 — Wallet pass issuance and lifecycle
EPIC-007 — Verifier credential view
EPIC-008 — Share links and QR codes
EPIC-009 — Subscription gating and Stripe integration
EPIC-010 — Refresh and status updates
EPIC-011 — Notifications and ops alerts
EPIC-012 — PDF export
EPIC-013 — Admin/ops tools
EPIC-014 — QA and security validation
EPIC-015 — Launch readiness
```

Important sequencing note:

Subscription gating requirements should be defined early, no later than EPIC-003/EPIC-004, even if Stripe implementation is completed later. Otherwise gated features will require avoidable retrofit.

## Revised Task Sequence Recommendation

Proceed in this order:

```text
TASK-0003 — Revise PRD Outline Based on Claude Feedback
TASK-0004 — Create PassTo PRD v0.1 and MVP Task Backlog
TASK-0005 — Create Lovable/Supabase/Vercel Responsibility Map
TASK-0006 — Create Supabase Schema and RLS Plan
TASK-0007 — Create MVP Build Sequence for Claude
```

Alternative if David wants speed:

```text
TASK-0003 — Create PassTo PRD v0.1 and MVP Task Backlog, incorporating Claude feedback directly
TASK-0004 — Create Lovable/Supabase/Vercel Responsibility Map
TASK-0005 — Create Supabase Schema and RLS Plan
TASK-0006 — Create MVP Build Sequence for Claude
```

Codex recommends the faster alternative only if David accepts this response as sufficient review of Claude feedback.

## Codex Final Recommendation

Accept Claude's feedback with the corrections above.

Do not draft the full PRD from the old outline as-is.

The full PRD should now center on:

```text
Lovable-hosted MVP frontend
Supabase-backed product/data/security foundation
Supabase Edge Function orchestration where practical
Vercel only where needed
ID.me identity verification
Twilio phone verification
RapidAPI license lookup
Data matching as a hard credential issuance gate
Wallet pass as a core MVP requirement
Founder-maintainable execution
```
