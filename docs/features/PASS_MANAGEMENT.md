# PassTo Pass Management

**Status:** Baseline  
**Source:** Product Attributes docs, naming conventions, Codex QA findings  
**Owner:** Codex  
**Last Updated:** 2026-05-25  

## Purpose

This document defines MVP pass-management behavior for PassTo wallet passes and credential display state.

Pass management covers the PassTo credential record, wallet pass issuance/update behavior, and how license status affects what the wallet pass shows.

## Core Rule

The wallet pass displays credential state.

The wallet pass itself does not carry a permanently valid verification QR.

The nurse initiates sharing or “show QR,” which creates a short-lived one-time verification token.

## Pass / Credential Model

Use canonical naming:

```text
credentials
wallet_passes
licenses
verification_tokens
```

`credentials` represent PassTo's credential record tied to a nurse/license.

`wallet_passes` represent the Apple/Google/PassKit provider record.

`licenses` hold source licensing-board data and status translation fields.

## Wallet Pass Treatment

Use product-intent values:

```text
valid
caution
invalid
do_not_issue
```

Do not store durable wallet meaning as color values like `green`, `yellow`, `red`, or `grey`.

Color belongs to UI/design-system mapping, not the core product state.

## Status Translation

Pass management depends on license status fields:

```text
source_status_raw
source_status_display
normalized_status
status_intent
wallet_pass_treatment
status_checked_at
```

Rules:

- Active license with 30 or more days until expiration: `wallet_pass_treatment = valid`
- Active license with fewer than 30 days until expiration: `wallet_pass_treatment = caution`
- Inactive / expired / suspended / revoked: `wallet_pass_treatment = invalid`
- Raw source `unknown`: verification failure; `wallet_pass_treatment = do_not_issue`

Raw source `unknown` should not issue or update a credential as valid.

## Wallet Pass Updates

When refresh or source lookup changes license status:

- Update license status fields.
- Update credential state.
- Update wallet pass treatment.
- Push/update the wallet pass where supported.
- Revoke active verification tokens if credential should no longer be shown.

Do not leave an active-looking wallet pass when PassTo knows the license is inactive, expired, suspended, revoked, or otherwise not valid.

## QR / Sharing Boundary

Do not embed a permanently valid verification QR in the wallet pass.

A nurse may trigger:

```text
share_link
show_qr
```

Both create one-time short-lived verification tokens.

Show-QR token TTL:

```text
45 minutes or first use, whichever comes first
```

Share-link token TTL:

```text
72 hours or first successful use, whichever comes first
```

## Tier Impact

**Selfie is required for all tiers.** David decision recorded 2026-06-15 (TASK-0073/TASK-0074):
selfie is a required step in the onboarding flow regardless of subscription tier.
Previous tier-dependent selfie display rules are superseded.

Free:

- One license only.
- Selfie required and displayed on credential.
- Share-link included (72h TTL, one-time use).
- Show-QR is schema-supported but deferred from MVP.

Standard:

- One included license.
- Selfie required and displayed on credential.
- Share-link and show-QR included (show-QR deferred from MVP).

Premier:

- Two included licenses.
- Selfie required and displayed on credential.
- Share-link and show-QR included (show-QR deferred from MVP).

## Recommended Tables

```text
profiles
licenses
credentials
wallet_passes
verification_tokens
refresh_events
audit_events
```

## Related Docs

```text
/docs/features/SHARING.md
/docs/features/REFRESH.md
/docs/features/TIER_FEATURES.md
/docs/architecture/NAMING_CONVENTIONS.md
/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md
```

## Open Items

- Exact PassKit update payloads.
- Whether Apple and Google wallet records are separate rows or provider variants.
- Final wallet pass visual mapping in the design system.
