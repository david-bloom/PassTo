# PassTo Notifications

**Status:** Baseline  
**Source:** Product Attributes Blueprint v1.6 + David decisions  
**Owner:** Codex  
**Last Updated:** 2026-05-24  

## Purpose

This document defines PassTo notification categories. It replaces a narrow expiry-alert-only document because PassTo notifications include more than expiry alerts.

## Notification Categories

MVP / likely notifications include:

- License expiry alerts.
- License status change alerts.
- Refresh success/failure alerts.
- Payment failure alerts.
- Subscription/chargeback alerts.
- Share viewed notifications.
- PDF generated/downloaded notifications.
- Account/security notifications.
- Operational/admin alerts.

## Expiry Alert Rules

The prior blueprint defined expiry alert intervals:

```text
90 / 60 / 30 / 14 / 7 days before expiry
```

Standard and Premier receive expiry alerts.

Free does not receive scheduled expiry alerts.

## Provider

Postmark remains the planned email provider for MVP based on the existing blueprint.

## Deduplication

Do not use a single multi-select field in Supabase.

Recommended table:

```text
notification_events
- id
- account_id
- nurse_id
- license_id
- notification_type
- interval
- status
- sent_at
- provider
- provider_message_id
```

Each interval should be sent at most once per license.

## Open Items

- Full notification matrix by tier.
- Email templates.
- SMS usage decision.
- User notification preferences.
- Admin alert routing.
