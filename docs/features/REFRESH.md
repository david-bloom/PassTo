# PassTo Refresh

**Status:** Draft  
**Source:** Product Attributes Blueprint v1.6 + David decisions  
**Owner:** Codex  
**Last Updated:** 2026-05-24  

## Purpose

This document defines on-demand and scheduled credential refresh behavior.

## Core Behavior

Refresh re-queries the primary source, updates license/credential state, and updates the wallet pass if appropriate.

Refresh does not automatically create a standing share link.

## Payment Rule

Paid refresh does not begin until payment succeeds.

Free and Standard:

- On-demand refresh costs $1.99.

Premier:

- On-demand refresh is included.

Apple Pay and Google Pay should be supported through Stripe where available.

## Refresh Types

```text
on_demand
scheduled
system_status_change
```

## Scheduled Refresh Cadence

Standard:

```text
Annual refresh
```

Premier:

```text
Monthly refresh
```

Free:

```text
No scheduled refresh
```

Scheduled refresh should evaluate each active license independently.

## Status Translation

Refresh must preserve raw source status and translate it into normalized product behavior.

Recommended fields:

```text
source_status_raw
source_status_display
normalized_status
status_intent
wallet_pass_treatment
status_checked_at
```

## Wallet Pass Treatment

Recommended values:

```text
valid
caution
invalid
do_not_issue
```

Rules:

- Active license with 30 or more days until expiration: `valid`
- Active license with fewer than 30 days until expiration: `caution`
- Inactive / expired / suspended / revoked: `invalid`
- Raw source `unknown`: verification failure, `do_not_issue`

Raw source `unknown` is not a valid license status. It is a failure and should not issue or update a credential as valid.

## Wallet Pass Updates

If license remains valid or caution:

- Update wallet pass state.

If license becomes inactive, expired, suspended, or revoked:

- Update stored license status.
- Update credential/wallet treatment.
- Wallet pass should be updated to show non-active/caution state if supported.
- Any active verification tokens should be revoked.

Do not leave an active-looking wallet pass when PassTo knows the license is not active.

## Recommended Tables

```text
licenses
credentials
refresh_events
verification_tokens
jobs
audit_events
license_status_mappings
```

## Job Handling

Long-running refresh should create a job record.

Recommended table:

```text
jobs
- id
- job_type: refresh
- status: pending / processing / complete / failed / refunded
- result_json
- error_message
```

Frontend may poll job status or later use realtime subscriptions.

## Open Items

- Exact refresh retry behavior.
- Exact status mapping table values by licensing source.
- PassKit update behavior for each wallet pass treatment.
