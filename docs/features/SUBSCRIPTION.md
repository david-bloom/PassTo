# PassTo Subscription

**Status:** Complete Product / GA Reference with PRD-Controlled MVP Scope
**Source:** Product Attributes Blueprint v1.6 + David decisions  
**Owner:** Codex  
**Last Updated:** 2026-06-04

## Purpose

This document defines subscription and tier-management behavior for PassTo's complete product / General Availability model.

This file is the canonical subscription feature doc. The earlier plural file `/docs/features/SUBSCRIPTIONS.md` should be treated as legacy unless later consolidated.

The approved PRD remains the source of truth for MVP launch scope. Usage pricing in this document is a GA/product-complete reference unless the PRD or a task approval explicitly includes the capability in MVP.

## Tier Names

```text
free
standard
premier
```

User-facing display:

```text
Free
Standard
Premier
```

## Confirmed Subscription Pricing

```text
Free: $0/month
Standard: $9.99/month
Premier: $19.99/month
```

## GA Usage Pricing

```text
Share link for Free: $1.99
Show QR for Free: $1.99
Paid on-demand refresh: $1.99
Free-tier PDF export: $1.99
Additional license for paid tiers: $4.99
```

## License Entitlements

```text
Free: 1 license only; additional license purchase not available in MVP
Standard: 1 license included; additional licenses $4.99 each
Premier: 2 licenses included; additional licenses $4.99 each
```

## Upgrade Behavior

A nurse may upgrade from dashboard or an upgrade page.

Stripe should receive metadata sufficient to route the webhook:

```text
profile_id
payment_type
target_tier
```

If the implementation uses a separate account object, `account_id` may also be included.

## Cancellation Behavior

Cancellation should use Stripe Customer Portal unless later changed.

MVP downgrade timing:

```text
Downgrade to Free at period end unless David changes this.
```

## Payment / Webhook Records

Use canonical tables:

```text
payments
subscriptions
stripe_events
audit_events
```

Stripe webhook handling should be idempotent.

`stripe_events` should record processed Stripe event IDs so duplicate webhooks do not create duplicate payments or subscription changes.

## Dispute / Refund Behavior

On relevant dispute or refund events:

- Downgrade to Free where appropriate.
- Suspend paid-tier benefits where appropriate.
- Create payment/subscription/audit records.
- Show clear dashboard message.

## Related Docs

```text
/docs/features/TIER_FEATURES.md
/docs/features/ACCOUNT_MANAGEMENT.md
/docs/features/PDF_EXPORT.md
/docs/features/REFRESH.md
/docs/features/SHARING.md
/docs/architecture/NAMING_CONVENTIONS.md
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
```

## Open Items

- Annual plan availability.
- Trial behavior.
- Coupon/discount behavior.
- Whether downgrade preserves scheduled refresh history.
- Final Stripe product/price IDs after Stripe setup.
