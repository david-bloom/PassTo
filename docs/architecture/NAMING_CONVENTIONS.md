# PassTo Naming Conventions

**Status:** Approved Baseline  
**Owner:** Codex  
**Last Updated:** 2026-05-25  

## Purpose

This document is the canonical naming reference for PassTo.

Codex and Claude must use these conventions when writing specs, schema drafts, implementation notes, PRs, migrations, docs, labels, and QA reviews.

If a naming rule conflicts with an approved task spec or a later David decision, the newer approved GitHub source controls.

---

## General Principles

Use names that are:

- Plain English
- MVP-oriented
- Consistent across docs, schema, code, and PRs
- Specific enough to avoid ambiguity
- Stable enough to survive future feature growth

Avoid:

- Airtable-era names when Supabase names are clearer
- Generic names like `data`, `record`, `object`, or `item`
- Vendor-specific names unless the object is truly vendor-specific
- Color names for product meaning
- Raw tokens or secrets in column names, logs, or docs

---

## Database Naming

Use lowercase `snake_case` for Supabase tables, columns, indexes, and SQL functions.

Table names should be plural nouns.

Examples:

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
notification_events
payments
subscriptions
stripe_events
jobs
audit_events
license_status_mappings
```

Use `id` as the primary key column.

Use foreign keys in the form:

```text
profile_id
license_id
credential_id
verification_token_id
payment_id
subscription_id
job_id
```

Use timestamps in the form:

```text
created_at
updated_at
deleted_at
verified_at
expires_at
used_at
revoked_at
replaced_at
completed_at
failed_at
```

---

## Canonical Product Entity Names

Use these names unless David approves a deviation:

| Concept | Canonical Name |
|---|---|
| Nurse user profile | `profile` / `profiles` |
| Nursing license | `license` / `licenses` |
| PassTo credential record | `credential` / `credentials` |
| Apple/Google wallet provider record | `wallet_pass` / `wallet_passes` |
| One-time verifier access token | `verification_token` / `verification_tokens` |
| External verifier | `verifier` / `verifiers` |
| Verifier view/access event | `verification_event` / `verification_events` |
| Credential refresh attempt | `refresh_event` / `refresh_events` |
| PDF export record | `pdf_export` / `pdf_exports` |
| Notification send record | `notification_event` / `notification_events` |
| Stripe payment or paid action | `payment` / `payments` |
| Stripe subscription | `subscription` / `subscriptions` |
| Background or async work item | `job` / `jobs` |
| Append-only operational log | `audit_event` / `audit_events` |

Avoid older or ambiguous names unless explicitly approved:

```text
pass_shares
pass_recipients
review_sessions
review_events
```

These may appear in legacy/spike docs, but new MVP schema work should use the canonical names above unless Codex and David approve otherwise.

---

## Token Naming

Use `verification_tokens` for all live verifier access tokens.

Token types:

```text
share_link
show_qr
pdf_qr
```

Token status values:

```text
active
used
expired
replaced
revoked
payment_failed
generation_failed
```

Token statuses are mutually exclusive.

If a token is used, it remains `used` and does not later become `expired`.

Store token hashes, not raw tokens.

Use:

```text
token_hash
```

Do not use:

```text
token
raw_token
share_token
verification_secret
```

unless the field is explicitly transient and never stored.

---

## Verifier Naming

Use `verifier` for the external person viewing a credential.

MVP verifier form collects only:

```text
verifier_name
verifier_email
```

Do not collect in MVP:

```text
verifier_organization
verifier_title
verifier_phone
verifier_address
verifier_notes
```

Verifier private contact data should not be directly readable by the nurse.

Use nurse-safe views, API responses, or separate private tables when needed.

---

## License Status Naming

Use these status fields:

```text
source_status_raw
source_status_display
normalized_status
status_intent
wallet_pass_treatment
status_checked_at
```

Use product-intent wallet treatment values:

```text
valid
caution
invalid
do_not_issue
```

Do not use color names as stored product meaning:

```text
green
yellow
red
grey
```

Color may be a UI/design-system mapping, but not the durable product state.

Raw source `unknown` is a verification failure and should not issue or update a credential as valid.

Active licenses with fewer than 30 days until expiration use:

```text
wallet_pass_treatment = caution
```

---

## Payment and Subscription Naming

Use `payments` for paid actions and payment records.

Use `subscriptions` for recurring plan state.

Use `stripe_events` for raw Stripe webhook/event tracking.

Paid action types should use names like:

```text
share_link
credential_refresh
pdf_export
additional_license
subscription_checkout
```

Plan names:

```text
free
standard
premier
```

MVP subscription prices:

```text
standard = 9.99/month
premier = 19.99/month
```

MVP usage prices:

```text
share_link = 1.99
credential_refresh = 1.99 where paid
pdf_export = 1.99 for Free
additional_license = 4.99
```

---

## PDF Naming

Use:

```text
pdf_exports
pdf_generated_at
pdf_storage_path
pdf_signed_url_expires_at
```

Generated PDFs are stored in Supabase Storage.

PDF records are tracked in `pdf_exports`.

PDF access is controlled by authenticated nurse access or short-lived signed URLs.

PDFs are static records and must include the approved static PDF disclaimer.

---

## Job and Event Naming

Use `jobs` for async/background work.

Job types may include:

```text
verification_token_create
credential_refresh
pdf_export
wallet_pass_update
notification_send
stripe_webhook_process
```

Job statuses:

```text
pending
processing
complete
failed
cancelled
refunded
```

Use event tables for product history, not only `audit_events`.

Examples:

```text
verification_events
refresh_events
notification_events
pdf_exports
stripe_events
audit_events
```

`audit_events` is append-only operational history. It is not the primary dashboard source of truth.

---

## Route Naming

Use clear, product-oriented routes.

Recommended route concepts:

```text
/dashboard
/share
/show-qr
/v/[token]
/upgrade
/account
```

API route names should describe the action:

```text
/api/verification-tokens
/api/credential-refresh
/api/pdf-exports
/api/webhooks/stripe
```

---

## File Naming

Documentation files use uppercase descriptive Markdown names where already established:

```text
TASK-0004.md
NAMING_CONVENTIONS.md
PRODUCT_ATTRIBUTES_ARCHITECTURE.md
VERIFIER_CREDENTIAL_VIEW.md
```

Task files use:

```text
/docs/tasks/TASK-0000.md
```

Claude/Codex review artifacts may use descriptive dated names when they are tied to one-off spike work:

```text
2026-05-24-claude-task-001-supabase-schema-implementation.md
2026-05-24-claude-task-001-codex-qa-review.md
```

---

## GitHub Label Naming

Use approved label names exactly:

```text
assigned: codex
assigned: claude
assigned: david
needs: codex-review
needs: claude-response
needs: david-approval
status: blocked
status: ready-for-review
status: ready-for-codex-qa
status: ready-for-david-review
```

Labels are routing aids only. Task files, PRs, issues, and logs remain source of truth.

---

## Naming Deviation Rule

Claude may challenge a naming convention if implementation evidence shows a better pattern.

Claude must document:

```text
Current Convention:
Proposed Deviation:
Reason:
Impact:
Risk:
Recommendation:
```

Codex must review the deviation.

David approval is required if the deviation affects product language, architecture, schema, routes, integrations, docs, or task acceptance criteria.
