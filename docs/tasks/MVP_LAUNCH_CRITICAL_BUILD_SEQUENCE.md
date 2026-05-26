# MVP Launch-Critical Build Sequence

**Status:** Draft Execution Baseline  
**Owner:** Codex  
**Created:** 2026-05-26  
**Source:** Approved PRD Sections 1-7  

## Purpose

This file defines the recommended build order for PassTo MVP launch-critical work.

The sequence is designed to keep implementation moving while preserving the approved trust gates, backend ownership boundaries, and deferred scope.

## Build Principles

1. Build the data/security foundation before feature migration.
2. Keep Lovable as frontend and Supabase as source of truth.
3. Use Edge Functions for privileged operations unless Vercel is explicitly better.
4. Do not move deferred features into launch work.
5. Do not apply migrations or production changes without David approval.

## Launch-Critical Sequence

### Phase 0 — Planning and Approval Foundation

| Order | Work | Owner | Status |
|---|---|---|---|
| 0.1 | PRD Sections 1-7 approved | David | Done |
| 0.2 | Consolidated PRD created | Codex | Done |
| 0.3 | MVP implementation backlog created | Codex | Done |
| 0.4 | v4 migration SQL task created | Claude | Pending |

### Phase 1 — Supabase Schema, RLS, and Storage Foundation

| Order | Work | Owner | Depends On |
|---|---|---|---|
| 1.1 | Draft v4 Supabase migration SQL | Claude | TASK-0007 |
| 1.2 | Draft RLS test plan | Claude | v4 SQL draft |
| 1.3 | Codex QA review of v4 SQL/RLS | Codex | 1.1, 1.2 |
| 1.4 | David migration approval | David | 1.3 |
| 1.5 | Apply migration to approved Supabase project | Claude/Codex | 1.4 |
| 1.6 | Create protected selfie Storage bucket/policies | Claude/Codex | 1.5 |

### Phase 2 — Account and Profile Foundation

| Order | Work | Owner | Depends On |
|---|---|---|---|
| 2.1 | Wire Lovable auth to approved Supabase project | Claude/Codex | Phase 1 |
| 2.2 | Profile creation/init flow | Claude/Codex | 2.1 |
| 2.3 | Onboarding step routing baseline | Claude/Codex | 2.2 |
| 2.4 | Account/auth QA | Codex | 2.1-2.3 |

### Phase 3 — Trust Gate Flow

| Order | Work | Owner | Depends On |
|---|---|---|---|
| 3.1 | ID.me Edge Function and Lovable callback wiring | Claude/Codex | Phase 2 |
| 3.2 | Twilio send/verify Edge Functions | Claude/Codex | Phase 2 |
| 3.3 | License lookup Edge Function | Claude/Codex | 3.1, 3.2 |
| 3.4 | Data match Edge Function | Claude/Codex | 3.3 |
| 3.5 | Selfie capture and Supabase Storage upload | Claude/Codex | 3.4, 1.6 |
| 3.6 | Trust gate QA | Codex | 3.1-3.5 |

### Phase 4 — Credential and Wallet Issuance

| Order | Work | Owner | Depends On |
|---|---|---|---|
| 4.1 | Credential creation Edge Function | Claude/Codex | Phase 3 |
| 4.2 | Wallet signing/issuance route contract | Claude/Codex | 4.1 |
| 4.3 | Wallet pass provider state writes to Supabase | Claude/Codex | 4.2 |
| 4.4 | PassReady status flow | Claude/Codex | 4.1-4.3 |
| 4.5 | Credential/wallet QA | Codex | 4.1-4.4 |

### Phase 5 — Dashboard and Share-Link Verification

| Order | Work | Owner | Depends On |
|---|---|---|---|
| 5.1 | Nurse dashboard launch-critical status view | Claude/Codex | Phase 4 |
| 5.2 | Share-link token creation function | Claude/Codex | 5.1 |
| 5.3 | Verifier token validation function | Claude/Codex | 5.2 |
| 5.4 | `/v/{token}` verifier flow | Claude/Codex | 5.3 |
| 5.5 | Share-link/verifier QA | Codex | 5.2-5.4 |

### Phase 6 — Stripe, Entitlements, and Lapse Behavior

| Order | Work | Owner | Depends On |
|---|---|---|---|
| 6.1 | Stripe checkout function | Claude/Codex | Phase 1 |
| 6.2 | Stripe webhook function with `stripe_events` idempotency | Claude/Codex | 6.1 |
| 6.3 | Entitlement gate checks for launch-critical actions | Claude/Codex | 6.2 |
| 6.4 | Subscription lapse downgrade behavior | Claude/Codex | 6.2 |
| 6.5 | Stripe/subscription QA | Codex | 6.1-6.4 |

### Phase 7 — Ops, Alerts, QA, and Launch Readiness

| Order | Work | Owner | Depends On |
|---|---|---|---|
| 7.1 | Supabase ops views/dashboard requirements | Claude/Codex | Core tables live |
| 7.2 | Critical Postmark ops alerts | Claude/Codex | Core events live |
| 7.3 | Failure-state implementation matrix | Claude/Codex | Feature flows implemented |
| 7.4 | Full RLS boundary QA | Codex | Core schema/RLS live |
| 7.5 | End-to-end smoke test | Codex + David | Phases 1-7 |
| 7.6 | David production launch approval | David | 7.5 |

## Deferred Work Not in Launch Sequence

- Show QR.
- PDF export.
- Scheduled automated refresh.
- Additional license flow.
- Lovable admin UI.
- Employer dashboard.
- Institutional billing.
- Deep analytics.

## Current Next Action

```text
Create/execute TASK-0011 — Draft v4 Supabase Migration SQL From TASK-0007 Decisions.
```
