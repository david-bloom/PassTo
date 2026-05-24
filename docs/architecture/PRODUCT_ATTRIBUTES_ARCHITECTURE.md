# Product Attributes Architecture

**Status:** Draft  
**Source:** Product Attributes Blueprint v1.6 + David decisions  
**Owner:** Codex  
**Last Updated:** 2026-05-24  

## Purpose

This document translates the Product Attributes Blueprint from the prior Airtable/Make-oriented model into the new Supabase/Vercel-oriented architecture.

## Architecture Direction

Replace Airtable-specific and Make-specific execution assumptions with:

```text
Supabase Postgres
Supabase RLS
Vercel app/API routes
Stripe webhooks
PassKit integration
Postmark integration
PDFMonkey integration
Scheduled jobs / Supabase Edge Functions where appropriate
```

## Concept Mapping

| Old Blueprint Concept | New Architecture Concept |
|---|---|
| Airtable CREDENTIALS | `credentials` table |
| Airtable LICENSES | `licenses` table |
| Airtable AUDIT_LOG | `audit_events` plus purpose-built event tables |
| Make S7 Token Generation | API route / server action creating `verification_tokens` |
| Make S8 Token Validation | `/v/{token}` server validation |
| Make S8b Log Verification | Verification event write |
| Make S9 On-Demand Refresh | Refresh job / server action |
| Make S10 Scheduled Refresh | Scheduled job / Edge Function |
| Make S11 Stripe Webhook | Stripe webhook endpoint |
| Make S12 Expiry Alerts | Notification scheduled job |
| Make S13 Dashboard Fetch | Supabase queries / dashboard API |
| Make S_PDF | PDF export API/job |

## Recommended Core Tables

```text
accounts
profiles
nurses
licenses
credentials
verification_tokens
verifiers
verification_events
refresh_events
payments
subscriptions
stripe_events
pdf_exports
notification_events
jobs
audit_events
license_status_mappings
```

## Token Architecture

Do not store verifier access tokens directly on `credentials`.

Use `verification_tokens`.

Token types:

```text
share_link
qr_scan
pdf_qr
```

All live verifier access tokens are one-time and short-lived.

## Status Translation Architecture

Recommended status fields:

```text
source_status_raw
source_status_display
normalized_status
status_intent
wallet_pass_treatment
status_checked_at
```

Recommended mapping table:

```text
license_status_mappings
- id
- source_type
- source_name
- raw_status
- source_status_display
- normalized_status
- status_intent
- wallet_pass_treatment
- credential_issuance_allowed
- requires_alert
```

Raw source `unknown` is a verification failure and should not issue or update a credential as valid.

Active licenses with fewer than 30 days until expiration should receive wallet pass treatment `caution`.

## Dashboard Data Sources

Dashboard should not reconstruct product state from `audit_events`.

Use purpose-built tables:

```text
verification_tokens
verification_events
refresh_events
payments
subscriptions
notification_events
pdf_exports
credentials
licenses
```

Keep `audit_events` as an append-only operational/compliance/debug trail.

## Job Status

Replace old webhook status pseudo-fields with a `jobs` table.

Recommended job types:

```text
share_link
qr_scan
refresh
pdf_export
pass_update
notification_send
```

Recommended statuses:

```text
pending
processing
complete
failed
refunded
cancelled
```

## RLS / Access Principles

Future schema work should define RLS around these principles:

- Nurse can read own dashboard data.
- Nurse can create verification tokens only for own credential.
- Verifier can access credential view only through a valid token.
- Anonymous users cannot browse credentials.
- Stripe webhook uses service role only.
- Scheduled jobs use service role only.
- Verifier email is not displayed to nurse.
- Audit/event records are not broadly readable.

## Open Items

- Final Supabase schema.
- RLS policies.
- Stripe webhook implementation route.
- Scheduled job mechanism.
- Exact PassKit update payloads.
- Legal Terms of Use page.
