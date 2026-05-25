# PassTo Payments Flow

**Status:** Baseline  
**Owner:** Codex  
**Last Updated:** 2026-05-25  

---

## Purpose

This document defines the MVP payments flow for PassTo subscriptions and paid actions.

This flow is a baseline and does not approve Stripe live setup or production payment execution.

---

## Payment Provider

PassTo MVP uses Stripe for:

- Standard subscription
- Premier subscription
- Free-tier share link payment
- Free-tier show-QR payment
- Paid on-demand refresh where applicable
- Free-tier PDF export payment
- Additional license purchases for paid tiers

---

## Confirmed MVP Prices

```text
Standard subscription: $9.99/month
Premier subscription: $19.99/month
Share link for Free: $1.99
Show QR for Free: $1.99
On-demand refresh where paid: $1.99
PDF export for Free: $1.99
Additional license for paid tiers: $4.99
```

---

## Subscription Flow

```text
Nurse selects Standard or Premier
        ↓
PassTo creates Stripe checkout/customer portal flow
        ↓
Nurse completes checkout
        ↓
Stripe sends webhook
        ↓
Server validates webhook signature
        ↓
PassTo records stripe_event
        ↓
PassTo updates subscription/payment state
        ↓
Dashboard reflects new tier and entitlements
```

---

## Paid Action Flow

Paid actions include:

```text
share_link
show_qr
credential_refresh
pdf_export
additional_license
```

Flow:

```text
Nurse requests paid action
        ↓
Server checks authentication and ownership
        ↓
Server checks tier entitlement
        ↓
If payment required, Stripe checkout/payment is created
        ↓
Payment succeeds
        ↓
Stripe webhook confirms payment
        ↓
Server creates the gated object or starts the gated job
        ↓
Payment/action/event records are stored
```

Paid refresh, PDF export, and verification-token generation should not begin until payment succeeds where payment is required.

---

## Payment-Gated Guardrail

The client should not directly insert rows that create paid/gated access.

Examples that should be server-controlled:

```text
verification_tokens
payments
subscriptions
stripe_events
jobs
pdf_exports where payment-gated
refresh_events where payment-gated
```

---

## Data Records

Recommended tables:

```text
payments
subscriptions
stripe_events
verification_tokens
refresh_events
pdf_exports
jobs
audit_events
```

`stripe_events` should support idempotency so duplicate Stripe webhooks do not duplicate paid actions.

---

## Refund / Dispute Flow

On relevant refund, dispute, or chargeback:

- Record Stripe event.
- Update payment state.
- Downgrade or suspend paid benefits where appropriate.
- Revoke active gated tokens where needed.
- Create audit event.
- Show clear dashboard/account message if relevant.

---

## Cancellation Flow

Subscription cancellation should use Stripe Customer Portal unless later changed.

Default MVP rule:

```text
Downgrade to Free at period end unless David changes this.
```

---

## Security Notes

- Stripe webhook signature validation is required.
- Stripe secrets must remain server-side.
- Service role should process webhook-driven state changes.
- Payment-gated actions must not be client-insertable without server validation.
- Do not trust client-side payment success alone; use webhook/server confirmation.

---

## Related Docs

```text
/docs/features/SUBSCRIPTION.md
/docs/features/TIER_FEATURES.md
/docs/features/SHARING.md
/docs/features/REFRESH.md
/docs/features/PDF_EXPORT.md
/docs/architecture/INTEGRATIONS.md
/docs/architecture/SECURITY_MODEL.md
/docs/architecture/DATA_MODEL.md
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
```

---

## Open Items

- Stripe product IDs and price IDs.
- Annual plan decision, if any.
- Trial behavior, if any.
- Coupon/discount behavior, if any.
- Refund policy and user-facing copy.
