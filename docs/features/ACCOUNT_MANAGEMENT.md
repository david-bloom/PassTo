# PassTo Account Management

**Status:** Baseline  
**Source:** Team charter, Product Attributes docs, migration-blocking MVP decisions  
**Owner:** Codex  
**Last Updated:** 2026-05-25  

## Purpose

This document defines MVP account-management behavior for PassTo nurse accounts.

Account management covers the nurse account lifecycle after account creation, including profile access, account tier visibility, billing entry points, deletion/deactivation posture, and account-level safety rules.

## MVP Account Model

PassTo MVP is B2C for individual nurses.

MVP does not include:

- Organization accounts
- Employer accounts
- Facility admin accounts
- Multi-user organization membership
- Verifier accounts

Verifiers access credentials through short-lived one-time verification tokens and do not create PassTo accounts.

## Account Data

The nurse account should support:

- Authenticated identity
- Email
- Name
- Phone, if collected and verified
- ID.me verification reference/status
- Account tier
- Subscription/payment references
- License entitlement count
- Account status
- Created/updated timestamps

## Account Status

Recommended MVP account statuses:

```text
active
deactivated
deleted
suspended
```

Use `deleted` as a soft-delete/deactivated state for MVP, not an immediate hard delete.

## Account Deletion / Retention

Approved MVP retention rule:

```text
Retain operational, audit, payment, and verification records for 7 years unless legal counsel later changes this.
```

When a nurse requests deletion or account closure:

- Mark the account/profile as deleted or deactivated.
- Disable future login/access where appropriate.
- Stop future notifications.
- Revoke active verification tokens.
- Preserve payment, audit, verification, and operational records for the approved retention period.
- Avoid cascading hard deletes of operational records.

## Account Dashboard Requirements

The nurse dashboard should expose account-level information such as:

- Current plan/tier
- Included license entitlement
- Additional license eligibility
- Billing/subscription management entry point
- Primary credential/license status summary
- Verification/share history summary where allowed
- PDF/export history where allowed
- Notification preferences when implemented

## Access Control

Nurses may access their own account data.

Nurses must not access other nurses' account data.

Verifier private contact data must not be directly displayed to nurses unless explicitly approved.

Administrative/service-role operations must not be exposed to the client.

## Related Docs

```text
/docs/features/TIER_FEATURES.md
/docs/features/SUBSCRIPTION.md
/docs/features/SHARING.md
/docs/features/PASS_MANAGEMENT.md
/docs/architecture/NAMING_CONVENTIONS.md
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
```

## Open Items

- Final Terms of Use language.
- Account deletion UI copy.
- Whether user-facing account export is in or out of MVP.
