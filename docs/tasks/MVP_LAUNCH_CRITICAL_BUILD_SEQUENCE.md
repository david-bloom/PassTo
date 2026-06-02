# MVP Launch-Critical Build Sequence

**Status:** Draft Execution Baseline  
**Owner:** Codex  
**Created:** 2026-05-26  
**Updated:** 2026-05-27 — TASK-0018 cleanup  
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
6. Do not create `show_qr` verification tokens until David explicitly reopens Show QR scope, even though the v4 schema supports the token type.

## Launch-Critical Sequence

### Phase 0 — Planning and Approval Foundation

| Order | Work | Owner | Status |
|---|---|---|---|
| 0.1 | PRD Sections 1-7 approved | David | Done |
| 0.2 | Consolidated PRD created | Codex | Done |
| 0.3 | MVP implementation backlog created | Codex | Done |
| 0.4 | v4 migration SQL task created | Claude | Done |

### Phase 1 — Supabase Schema, RLS, and Storage Foundation

| Order | Work | Owner | Depends On | Status |
|---|---|---|---|---|
| 1.1 | Draft v4 Supabase migration SQL | Claude | TASK-0007 | Done |
| 1.2 | Draft RLS test plan | Claude | v4 SQL draft | Done |
| 1.3 | Codex QA review of v4 SQL/RLS | Codex | 1.1, 1.2 | Done |
| 1.4 | David migration approval | David | 1.3 | Done |
| 1.5 | Apply migration to approved Supabase project | Claude/Codex | 1.4 | Done |
| 1.6 | Create protected selfie Storage bucket/policies | Claude/Codex | 1.5 | Done — TASK-0020 |
| 1.7 | Apply R4 `licenses.normalized_status` Pending remediation | Codex | TASK-0018 | Done — `v4_passto_mvp_remediation_r4` |

### Phase 2 — Account and Profile Foundation

| Order | Work | Owner | Depends On | Status |
|---|---|---|---|---|
| 2.1 | Wire Lovable auth to approved Supabase project | Claude/Codex | Phase 1 | Ready |
| 2.2 | Profile creation/init flow | Claude/Codex | 2.1 | Ready |
| 2.3 | Onboarding step routing baseline | Claude/Codex | 2.2 | Ready |
| 2.4 | Account/auth QA | Codex | 2.1-2.3 | Ready |

### Phase 3 — Trust Gate Flow

| Order | Work | Owner | Depends On |
|---|---|---|---|
| 3.1 | ID.me Edge Function and Lovable callback wiring | Claude/Codex | Phase 2 |
| 3.2 | Twilio send/verify Edge Functions | Claude/Codex | Phase 2 |
| 3.3 | License lookup Edge Function | Claude/Codex | 3.1, 3.2, R4 complete |
| 3.4 | Data match Edge Function | Claude/Codex | 3.3 |
| 3.5 | Selfie capture and Supabase Storage upload | Claude/Codex | 3.4, 1.6 |
| 3.6 | Trust gate QA | Codex | 3.1-3.5 |

### Phase 4 — Credential and Wallet Issuance

| Order | Work | Owner | Depends On |
|---|---|---|---|
| 4.1 | TASK-0049 — Credential creation gate | Claude | Phase 3, TASK-0040, TASK-0047, selfie decision |
| 4.2 | TASK-0050 — Wallet signing/issuance route contract | Claude | TASK-0049 |
| 4.3 | TASK-0051 — Wallet pass provider state writes to Supabase | Claude | TASK-0050 |
| 4.4 | TASK-0052 — Success / PassReady status flow | Claude/Lovable | TASK-0049, TASK-0051 |
| 4.5 | TASK-0053 — Credential/wallet QA | Codex | TASK-0049 through TASK-0052 |

### Phase 5 — Dashboard and Share-Link Verification

| Order | Work | Owner | Depends On |
|---|---|---|---|
| 5.1 | TASK-0055 — Nurse dashboard launch-critical status view | Claude/Lovable | Phase 4 |
| 5.2 | TASK-0056 — Share-link token creation function | Claude | TASK-0055 |
| 5.3 | TASK-0057 — Verifier token validation function | Claude | TASK-0056 |
| 5.4 | TASK-0058 — `/v/{token}` verifier flow | Claude/Lovable | TASK-0057 |
| 5.5 | TASK-0059 — Share-link/verifier QA | Codex | TASK-0055 through TASK-0058 |

### Phase 6 — Stripe, Entitlements, and Lapse Behavior

| Order | Work | Owner | Depends On |
|---|---|---|---|
| 6.1 | TASK-0060 — Reconcile Stripe checkout end-to-end readiness | Claude/Codex | TASK-0040, Lovable payment route |
| 6.2 | TASK-0061 — Define subscription management and cancellation flow | Claude/Lovable | TASK-0040, TASK-0060 |
| 6.3 | TASK-0062 — Resolve Free-tier paid share-link entitlement policy | Claude/Codex | TASK-0056, TASK-0040 |
| 6.4 | TASK-0063 — Harden entitlement and lapse ops visibility | Claude/Codex | TASK-0040, TASK-0055, TASK-0061 |
| 6.5 | TASK-0064 — Codex QA Phase 6 Stripe, entitlements, and lapse behavior | Codex | TASK-0060 through TASK-0063 |

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

- Show QR. Schema supports `show_qr`, but no launch task may create or expose Show QR tokens until David reopens scope.
- PDF export.
- Scheduled automated refresh.
- Additional license flow.
- Lovable admin UI.
- Employer dashboard.
- Institutional billing.
- Deep analytics.

## Current Next Action

```text
Complete/review TASK-0021 — Phase 2 Profile Init and Onboarding Routing Spec.
```
