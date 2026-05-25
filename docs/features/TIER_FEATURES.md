# PassTo Tier Features

**Status:** Ready for Tasking  
**Source:** Product Attributes Blueprint v1.6 + David decisions  
**Owner:** Codex  
**Last Updated:** 2026-05-25  

## Purpose

This document defines PassTo MVP tier behavior and pricing rules for Free, Standard, and Premier accounts.

## MVP Tier Summary

| Capability | Free | Standard | Premier |
|---|---:|---:|---:|
| Subscription price | $0 | $9.99/month | $19.99/month |
| Included licenses | 1 | 1 | 2 |
| Additional licenses | Not available in MVP | $4.99 each | $4.99 each after 2 included |
| Nurse-sent share link | $1.99 | Included | Included |
| Show QR for verifier scan | $1.99 | Included | Included |
| On-demand refresh | $1.99 | $1.99 | Included |
| Scheduled refresh | None | Annual | Monthly |
| Expiry/status notifications | No | Yes | Yes |
| PDF export | $1.99 | Included | Included |
| Selfie on credential | No | Yes | Yes |

## Confirmed MVP Pricing

```text
Free: $0/month
Standard: $9.99/month
Premier: $19.99/month
Share link: $1.99 for Free tier
Show QR: $1.99 for Free tier
On-demand refresh: $1.99 where paid
PDF export: $1.99 for Free tier
Additional license: $4.99 for paid tiers where allowed
```

## License Entitlement

Confirmed MVP rule:

```text
Free: 1 license only; additional license purchase not available in MVP
Standard: 1 license included; additional licenses $4.99 each
Premier: 2 licenses included; additional licenses $4.99 each
```

## Tier-Gated Behavior

### Free

Free includes a core credential and pay-per-use actions.

Free users may:

- Maintain one license credential.
- Pay $1.99 for a share link / one-time verifier access.
- Pay $1.99 for show-QR verifier access.
- Pay $1.99 for on-demand refresh.
- Pay $1.99 for PDF export.

Free users do not receive:

- Additional license purchases in MVP.
- Scheduled refresh.
- Expiry/status notifications.
- Included PDF export.
- Selfie display on credential.

### Standard

Standard includes the primary credential and a stronger maintenance experience.

Standard users receive:

- One included license.
- Free share links / verifier QR access.
- Annual scheduled refresh.
- Expiry/status notifications.
- Included PDF export.
- Selfie display on credential.

Standard users pay:

- $1.99 for on-demand refresh.
- $4.99 for each additional license.

### Premier

Premier includes the highest refresh cadence and additional license entitlement.

Premier users receive:

- Two included licenses.
- Free share links / verifier QR access.
- Included on-demand refresh.
- Monthly scheduled refresh.
- Expiry/status notifications.
- Included PDF export.
- Selfie display on credential.

Premier users pay:

- $4.99 for each additional license after two included licenses.

## Dashboard Requirements

The dashboard must show:

- Credential status.
- Source licensing-board status.
- License number and state.
- License expiry date.
- Account tier.
- Included license entitlement.
- Paid additional-license eligibility.
- Last verified date.
- Action buttons based on tier.
- Share / verification / refresh / PDF history as supported by product-specific event tables.

## Related Docs

```text
/docs/features/SUBSCRIPTION.md
/docs/features/ACCOUNT_MANAGEMENT.md
/docs/features/PASS_MANAGEMENT.md
/docs/features/SHARING.md
/docs/features/REFRESH.md
/docs/features/PDF_EXPORT.md
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
```

## Open Items

- Annual subscription pricing, if any.
- Trial behavior, if any.
- Coupon/discount behavior, if any.
