# PRD Phase 6 Task List - Stripe, Entitlements, and Lapse Behavior

**Phase:** Phase 6 - Stripe, Entitlements, and Lapse Behavior  
**Status:** Created - Awaiting David Approval for Execution  
**Created:** 2026-06-02  
**Owner:** David Bloom  
**Execution Support:** Codex and Claude  
**Source:** `/docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md`, `TASK-0040`, PRD Sections 5-7, `/docs/flows/PAYMENTS.md`, `/docs/features/SUBSCRIPTIONS.md`

## Purpose

This task list converts Phase 6 of the MVP launch-critical build sequence into approval-ready task records.

Core Stripe checkout, webhook idempotency, subscription persistence, entitlement counts, and lapse behavior were pulled forward and completed in `TASK-0040`. Phase 6 therefore focuses on reconciling the remaining launch-readiness gaps: real Lovable checkout testing, subscription management/cancellation behavior, Free-tier paid action implementation, entitlement/lapse ops visibility, and QA closure.

This document does not authorize implementation, migration execution, Stripe live-mode changes, live product/price changes, secret changes, deployments, production launch, task Done decisions, issue closure, or risk acceptance.

## Phase 6 Sequence

| Phase Item | Task ID | Task | Owner | Status | Depends On |
|---|---|---|---|---|---|
| 6.1 | TASK-0060 | Reconcile Stripe Checkout End-to-End Readiness | Claude / Codex | Spec Drafted - Awaiting David Approval | TASK-0040, Lovable payment route |
| 6.2 | TASK-0061 | Define Subscription Management and Cancellation Flow | Claude / Lovable | Spec Drafted - Awaiting David Approval | TASK-0040, TASK-0060 |
| 6.3 | TASK-0062 | Resolve Free-Tier Paid Action Entitlement Policy | Claude / Codex | Policy Decision Recorded - Awaiting Execution Approval | TASK-0056, TASK-0040 |
| 6.4 | TASK-0063 | Harden Entitlement and Lapse Ops Visibility | Claude / Codex | Spec Drafted - Awaiting David Approval | TASK-0040, TASK-0055, TASK-0061 |
| 6.5 | TASK-0064 | Codex QA Phase 6 Stripe, Entitlements, and Lapse Behavior | Codex | Spec Drafted - Awaiting David Approval | TASK-0060 through TASK-0063 |

## Relationship to TASK-0040

`TASK-0040` remains the completed implementation task for Stripe subscription state and entitlement gating. It already covered Stripe checkout/session creation, Stripe webhook signature verification, `stripe_events` idempotency, `subscriptions` and `payments` persistence, entitlement counts, subscription lapse downgrade behavior, and Stripe test-mode replay.

Phase 6 must not duplicate or overwrite that work. It should close the documented pre-production gap and resolve the remaining product/ops decisions around paid actions and subscription management.

## Phase 6 Entry Criteria

- `TASK-0040` is Complete / Passed - David Approved.
- Stripe test-mode secrets and webhook setup exist in the approved Supabase project for test-mode QA.
- Lovable can route a nurse to the payment step or a test path can safely create the payment-step state.
- Phase 5 share-link behavior is clear enough to reconcile Free-tier paid action policy.

## Phase 6 Exit Criteria

- A real Lovable test checkout verifies subscription persistence, payment persistence, webhook metadata, and payment-step advancement.
- Subscription management and cancellation behavior are documented for MVP, including customer portal or approved alternative.
- Free-tier share link, Show QR, on-demand refresh, and PDF export are reconciled as $1.99 paid actions and either implemented or explicitly deferred by David.
- Entitlement and lapse states are inspectable by ops and visible enough to prevent unsafe paid-action access.
- Codex QA records pass/block/deferral findings across Phase 6.

## Approval Boundary

David approval is required before Claude executes any Phase 6 task that changes live backend behavior, deploys functions/routes, applies migrations, changes Stripe configuration, changes secrets, changes production posture, marks tasks Done, closes tasks/issues, accepts risk, or moves deferred paid actions into launch scope.

## Policy Decision - 2026-06-04

David confirmed the Free-tier paid action policy for TASK-0062:

```text
Free tier can share, generate QR code, refresh, and PDF export for $1.99.
```

This records the product/pricing decision only. It does not approve implementation, migrations, deployments, Stripe live-mode changes, live Stripe products/prices, Lovable UI changes, production launch, task Done, issue closure, or risk acceptance.
