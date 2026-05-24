# PassTo Subscriptions

**Status:** Baseline  
**Source:** Product Attributes Blueprint v1.6 + David decisions  
**Owner:** Codex  
**Last Updated:** 2026-05-24  

## Purpose

This document defines subscription and tier-management behavior.

## Tier Names

```text
Free
Standard
Premier
```

## Confirmed Usage Pricing

- Share link / verifier access for Free: $1.99.
- Paid on-demand refresh: $1.99.
- Free-tier PDF export: $1.99.
- Additional license: $4.99.

## Subscription Pricing

The prior blueprint listed `$9.99 / $19.99` as working assumptions.

Final Standard and Premier subscription prices are not confirmed in this document unless David separately approves them.

## Upgrade Behavior

User upgrades from dashboard or upgrade page.

Stripe should receive metadata sufficient to route the webhook:

```text
account_id
nurse_id
payment_type
target_tier
```

## Cancellation Behavior

Cancellation should use Stripe Customer Portal.

Downgrade timing should follow the product rule:

- Downgrade to Free at period end unless David changes this.

## Dispute / Refund Behavior

On relevant dispute or refund events:

- Downgrade to Free where appropriate.
- Suspend paid-tier benefits where appropriate.
- Create payment/subscription/audit records.
- Show clear dashboard message.

## Recommended Tables

```text
subscriptions
payments
stripe_events
audit_events
accounts
nurses
```

## Open Items

- Final monthly subscription prices.
- Annual plan availability.
- Trial behavior.
- Coupon/discount behavior.
- Whether downgrade preserves scheduled refresh history.
