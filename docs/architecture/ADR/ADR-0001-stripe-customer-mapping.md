# ADR-0001 — Stripe Customer Mapping for MVP

**Status:** Accepted  
**Date:** 2026-05-27  
**Related:** TASK-0007 OD-7, TASK-0018 P2 finding, DECISION-0016  

## Context

TASK-0007 OD-7 originally instructed PassTo to retain a separate `stripe_customers` provider-mapping table while renaming `stripe_subscriptions` to `subscriptions`.

During v4 migration drafting and approval, the implemented MVP schema simplified this design:

- `stripe_customers` was not created as a separate table.
- `profiles.stripe_customer_id` stores the Stripe customer identifier.
- `subscriptions` stores subscription state and includes Stripe provider identifiers needed for webhook reconciliation.
- `payments` stores payment records and provider references.
- `stripe_events` stores webhook event payloads and idempotency state.

This was flagged as a P2 deviation in Codex/Claude QA and accepted for MVP through David's direct migration approval path.

## Decision

For MVP, PassTo will not use a separate `stripe_customers` table.

The approved MVP pattern is:

```text
profiles.stripe_customer_id
subscriptions.stripe_customer_id / stripe_subscription_id
payments Stripe provider references
stripe_events for webhook idempotency
```

`subscriptions` remains PassTo product subscription state. Stripe remains the provider source for webhook-confirmed payment/subscription events, but Supabase remains PassTo's product source of truth.

## Rationale

This simplifies the founder-operated MVP data model without losing required launch functionality:

- One fewer table to maintain.
- Customer lookup can start from the nurse profile.
- Subscription and payment records still carry provider identifiers.
- Stripe webhook idempotency is preserved through `stripe_events`.
- Future Stripe/provider complexity can be added later if real operational need appears.

## Trade-Offs

Accepted trade-offs:

- Less normalized provider modeling.
- If PassTo later supports multiple payment providers, a provider-mapping table may need to be introduced.
- If multiple Stripe customers per profile ever become possible, this design must be revisited.

Rejected for MVP:

- Separate `stripe_customers` table solely for theoretical future flexibility.

## Consequences

Implementation tasks should not reference `stripe_customers` as an MVP table.

Stripe-related tasks should use:

- `profiles.stripe_customer_id`
- `subscriptions`
- `payments`
- `stripe_events`

Any future task that proposes reintroducing `stripe_customers` must include a concrete operational reason and a migration plan.
