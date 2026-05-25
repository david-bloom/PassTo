# PassTo Data Model

**Status:** Baseline — Not Migration Approved  
**Owner:** Codex  
**Last Updated:** 2026-05-25  
**Related Task:** TASK-0005  

---

## Purpose

This document defines the baseline MVP data model for PassTo.

It is a planning reference for Codex specs, Claude implementation, Supabase schema work, and QA review.

This document does not approve migration execution.

Supabase migration approval still requires:

```text
Claude remediation
Codex re-review
David approval
```

---

## Naming Rule

All data model work must follow:

```text
/docs/architecture/NAMING_CONVENTIONS.md
```

Use canonical table names unless David approves a deviation.

---

## Recommended Core Tables

Baseline MVP tables:

```text
profiles
licenses
credentials
wallet_passes
verification_tokens
verifiers
verification_events
refresh_events
pdf_exports
payments
subscriptions
stripe_events
notification_events
jobs
audit_events
license_status_mappings
```

Tables may be split or deferred only with Codex review and David approval where scope is affected.

---

## Table Responsibilities

### profiles

Represents the authenticated nurse account/profile.

Owns:

- User identity link
- Name/email
- Account status
- Tier reference or current tier state
- Soft-delete/deactivation status

### licenses

Represents a nurse license and source lookup state.

Owns:

```text
license_number
license_state
license_type
expiration_date
source_status_raw
source_status_display
normalized_status
status_intent
wallet_pass_treatment
status_checked_at
```

### credentials

Represents the PassTo credential derived from a nurse/license.

Owns:

- Credential state
- Display eligibility
- Current-as-of timestamps
- Link between profile/license and wallet pass behavior

### wallet_passes

Represents Apple/Google/PassKit provider records.

Owns:

- Provider
- Provider pass ID
- Current provider status
- Last update metadata

### verification_tokens

Represents one-time short-lived verifier access tokens.

Owns:

```text
token_hash
token_type
status
expires_at
used_at
revoked_at
replaced_at
payment_id
```

Raw tokens must not be stored.

Token types:

```text
share_link
show_qr
pdf_qr
```

Token statuses:

```text
active
used
expired
replaced
revoked
payment_failed
generation_failed
```

### verifiers

Represents an external verifier.

MVP verifier form collects only:

```text
verifier_name
verifier_email
```

Verifier private contact data should not be directly visible to nurses.

### verification_events

Represents successful or attempted verifier access.

Owns:

- Verification token reference
- Verifier reference
- Credential/license reference
- Viewed-at timestamp
- Current-as-of timestamp
- Terms acceptance
- Optional marketing consent

### refresh_events

Represents credential/license refresh attempts.

Owns:

- Refresh type
- Payment reference when paid
- Status
- Started/completed timestamps
- Result summary
- Error details where needed

### pdf_exports

Represents generated PDFs.

Owns:

```text
profile_id
credential_id
license_id
payment_id
storage_path
pdf_generated_at
signed_url_expires_at
```

Generated PDFs are stored in Supabase Storage.

### payments

Represents payment and paid-action records.

Paid action types include:

```text
share_link
show_qr
credential_refresh
pdf_export
additional_license
subscription_checkout
```

### subscriptions

Represents recurring subscription state.

Plans:

```text
free
standard
premier
```

Confirmed prices:

```text
standard = $9.99/month
premier = $19.99/month
```

### stripe_events

Stores raw or normalized Stripe webhook processing records.

Used for idempotency and auditability.

### notification_events

Represents outbound notification send attempts.

Examples:

- Expiry alerts
- Status change alerts
- Refresh results
- Payment failures
- Subscription events

### jobs

Represents async/background work.

Job statuses:

```text
pending
processing
complete
failed
cancelled
refunded
```

### audit_events

Append-only operational history.

Not the primary dashboard source of truth.

### license_status_mappings

Maps raw source licensing-board statuses to PassTo product meaning.

Owns:

```text
source_type
source_name
raw_status
source_status_display
normalized_status
status_intent
wallet_pass_treatment
credential_issuance_allowed
requires_alert
```

---

## Key Relationships

```text
profiles 1 → many licenses
profiles 1 → many credentials
licenses 1 → many credentials
credentials 1 → many wallet_passes
credentials 1 → many verification_tokens
verification_tokens 1 → 0/1 verification_events
verifiers 1 → many verification_events
profiles 1 → many payments
profiles 1 → many pdf_exports
profiles 1 → many refresh_events
profiles 1 → many notification_events
```

---

## Retention Rule

Approved MVP rule:

```text
Retain operational, audit, payment, and verification records for 7 years unless legal counsel later changes this.
```

Use soft delete/deactivation for accounts rather than immediate cascading hard delete of operational records.

---

## Tier / Entitlement Rules

```text
Free: 1 license only; no additional license purchases in MVP
Standard: 1 included license; additional licenses $4.99 each
Premier: 2 included licenses; additional licenses $4.99 each
```

---

## Not Yet Migration Approved

This data model is the baseline reference.

Do not apply a Supabase migration until:

- Claude remediates Task 001.
- Codex re-reviews the migration artifact.
- David approves migration execution.

---

## Related Docs

```text
/docs/architecture/SYSTEM_ARCHITECTURE.md
/docs/architecture/SECURITY_MODEL.md
/docs/architecture/NAMING_CONVENTIONS.md
/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md
```
