# PassTo Tier Features

**Status:** Ready for Tasking  
**Source:** Product Attributes Blueprint v1.6 + David decisions  
**Owner:** Codex  
**Last Updated:** 2026-05-24  

## Purpose

This document defines PassTo MVP tier behavior and pricing rules for Free, Standard, and Premier accounts.

## MVP Tier Summary

| Capability | Free | Standard | Premier |
|---|---:|---:|---:|
| Included licenses | 1 | 1 | 2 |
| Additional licenses | Not included / confirm UX | $4.99 each | $4.99 each after 2 included |
| Nurse-sent share link | $1.99 | Included | Included |
| Show QR for verifier scan | $1.99 or same share entitlement | Included | Included |
| On-demand refresh | $1.99 | $1.99 | Included |
| Scheduled refresh | None | Annual | Monthly |
| Expiry/status notifications | No | Yes | Yes |
| PDF export | $1.99 | Included | Included |
| Selfie on credential | No | Yes | Yes |

## Confirmed MVP Pricing

- Share link: $1.99 for Free tier.
- On-demand refresh: $1.99 where paid.
- PDF export: $1.99 for Free tier.
- Additional license: $4.99.
- Subscription prices remain separate from these confirmed usage prices unless David separately approves final subscription pricing.

## License Entitlement

Confirmed MVP rule:

```text
Free: 1 license
Standard: 1 license included; additional licenses $4.99 each
Premier: 2 licenses included; additional licenses $4.99 each
```

## Tier-Gated Behavior

### Free

Free includes a core credential and pay-per-use actions.

Free users may:

- Maintain one license credential.
- Pay $1.99 for a share link / one-time verifier access.
- Pay $1.99 for on-demand refresh.
- Pay $1.99 for PDF export.

Free users do not receive:

- Scheduled refresh.
- Expiry/status notifications.
- Included PDF export.
- Included additional licenses.
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
- Raw licensing-board status.
- License number and state.
- License expiry date.
- Account tier.
- Last verified date.
- Action buttons based on tier.
- Share / verification / refresh / PDF history as supported by product-specific event tables.

## Open Items

- Confirm final Standard and Premier subscription price points before Stripe product creation.
- Confirm whether Free users may add extra paid licenses in MVP or whether additional license is entirely hidden for Free.
