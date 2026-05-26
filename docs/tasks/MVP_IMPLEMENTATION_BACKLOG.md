# MVP Implementation Backlog

**Status:** Draft Execution Backlog  
**Owner:** Codex  
**Created:** 2026-05-26  
**Source:** Approved consolidated PRD and PRD section master task lists  

## Purpose

This backlog turns the approved PRD into executable work blocks.

It is organized around launch-critical implementation. Deferred items are tracked separately and should not be assigned for launch unless David explicitly reopens scope.

## Backlog Rules

- Launch-critical work comes first.
- Migration execution requires David approval.
- Lovable uses publishable key + user JWT only.
- Service-role operations happen only inside Supabase Edge Functions or approved Vercel routes.
- Deferred scope stays deferred.

## Immediate Next Tasks

| Task ID | Title | Owner | Status | Notes |
|---|---|---|---|---|
| TASK-0011 | Draft v4 Supabase Migration SQL From TASK-0007 Decisions | Claude | Ready to create/execute | Must not apply migration. Include RLS test plan. |
| TASK-0018 | Codex QA Review of v4 Migration SQL and RLS Test Plan | Codex | Pending | Runs after TASK-0011. |
| TASK-0019 | Create Supabase Storage Plan for Selfie Assets | Claude/Codex | Proposed | Protected bucket, policies, access pattern. |
| TASK-0020 | Define Launch-Critical Edge Function Contracts | Claude/Codex | Proposed | Inputs, outputs, service-role behavior, Lovable invocation. |
| TASK-0021 | Define Wallet Signing Integration Contract | Claude/Codex | Proposed | Vercel/Supabase boundary and state writes. |

## Phase 1 — Supabase Foundation

| Backlog ID | Work Item | Status | Depends On |
|---|---|---|---|
| BL-001 | Draft v4 schema migration SQL | Ready for TASK-0011 | TASK-0007 |
| BL-002 | Draft RLS policy set | Ready for TASK-0011 | BL-001 |
| BL-003 | Draft RLS test plan | Ready for TASK-0011 | BL-002 |
| BL-004 | Codex QA of migration/RLS | Pending | BL-001 to BL-003 |
| BL-005 | David migration approval | Pending | BL-004 |
| BL-006 | Apply migration to approved Supabase project | Pending | BL-005 |
| BL-007 | Configure selfie Storage bucket/policies | Proposed | BL-006 |

## Phase 2 — Account and Profile

| Backlog ID | Work Item | Status | Depends On |
|---|---|---|---|
| BL-008 | Connect Lovable auth/profile flow to approved Supabase backend | Proposed | Phase 1 |
| BL-009 | Profile creation/init behavior | Proposed | BL-008 |
| BL-010 | Onboarding step routing | Proposed | BL-009 |
| BL-011 | Account/auth QA | Proposed | BL-008 to BL-010 |

## Phase 3 — Trust Gates

| Backlog ID | Work Item | Status | Depends On |
|---|---|---|---|
| BL-012 | ID.me callback/exchange Edge Function | Proposed | Phase 2 |
| BL-013 | ID.me Lovable callback UI wiring | Proposed | BL-012 |
| BL-014 | Twilio send-code Edge Function | Proposed | Phase 2 |
| BL-015 | Twilio verify-code Edge Function | Proposed | BL-014 |
| BL-016 | License lookup Edge Function | Proposed | BL-012, BL-015 |
| BL-017 | Data match Edge Function | Proposed | BL-016 |
| BL-018 | Selfie capture and upload flow | Proposed | BL-017, BL-007 |
| BL-019 | Trust gate QA | Proposed | BL-012 to BL-018 |

## Phase 4 — Credential and Wallet

| Backlog ID | Work Item | Status | Depends On |
|---|---|---|---|
| BL-020 | Credential creation Edge Function | Proposed | Phase 3 |
| BL-021 | Wallet signing route contract | Proposed | BL-020 |
| BL-022 | Wallet pass issuance integration | Proposed | BL-021 |
| BL-023 | Wallet provider state persistence | Proposed | BL-022 |
| BL-024 | PassReady status flow | Proposed | BL-020 to BL-023 |
| BL-025 | Credential/wallet QA | Proposed | BL-020 to BL-024 |

## Phase 5 — Dashboard and Verification

| Backlog ID | Work Item | Status | Depends On |
|---|---|---|---|
| BL-026 | Nurse dashboard launch status view | Proposed | Phase 4 |
| BL-027 | Share-link token creation function | Proposed | BL-026 |
| BL-028 | Verifier token validation function | Proposed | BL-027 |
| BL-029 | Verifier `/v/{token}` UI flow | Proposed | BL-028 |
| BL-030 | Verifier/event record writes | Proposed | BL-028 |
| BL-031 | Share-link/verifier QA | Proposed | BL-027 to BL-030 |

## Phase 6 — Payments and Entitlements

| Backlog ID | Work Item | Status | Depends On |
|---|---|---|---|
| BL-032 | Stripe checkout function | Proposed | Phase 1 |
| BL-033 | Stripe webhook with idempotency | Proposed | BL-032 |
| BL-034 | Subscription state persistence | Proposed | BL-033 |
| BL-035 | Entitlement gating checks | Proposed | BL-034 |
| BL-036 | Subscription lapse downgrade behavior | Proposed | BL-034 |
| BL-037 | Stripe/subscription QA | Proposed | BL-032 to BL-036 |

## Phase 7 — Ops, Failure States, and Launch QA

| Backlog ID | Work Item | Status | Depends On |
|---|---|---|---|
| BL-038 | Ops visibility views/dashboard requirements | Proposed | Core tables live |
| BL-039 | Critical ops alerting via Postmark | Proposed | Events available |
| BL-040 | Failure-state implementation matrix | Proposed | Feature flow specs |
| BL-041 | RLS boundary QA | Proposed | Migration applied |
| BL-042 | End-to-end launch smoke test script | Proposed | Launch flows implemented |
| BL-043 | Production configuration checklist | Proposed | Integrations ready |
| BL-044 | David launch approval package | Proposed | BL-041 to BL-043 |

## Deferred Backlog

| Item | Status | Reopen Condition |
|---|---|---|
| Show QR | Deferred | David explicitly reopens. |
| PDF export | Deferred | David explicitly reopens. |
| Scheduled automated refresh | Deferred | David explicitly reopens. |
| Additional license flow | Deferred | David explicitly reopens. |
| Lovable admin UI | Deferred | David explicitly reopens. |
| Employer dashboard | Deferred | Post-MVP. |
| Institutional billing | Deferred | Post-MVP. |
| Deep analytics | Deferred | Post-MVP. |

## Current Critical Path

```text
TASK-0011 -> TASK-0018 -> David migration approval -> apply migration -> auth/profile -> trust gates -> credential/wallet -> dashboard/share/verifier -> Stripe/entitlements -> ops/QA -> launch approval
```
