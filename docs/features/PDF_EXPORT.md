# PassTo PDF Export

**Status:** Complete Product / GA Reference - PRD Deferred for MVP
**Source:** Product Attributes Blueprint v1.6 + David decisions  
**Owner:** Codex  
**Last Updated:** 2026-06-04

## Purpose

This document defines PDF credential/report export behavior for PassTo's complete product / General Availability model.

The approved PRD defers PDF export from MVP launch scope. This document must not be treated as MVP implementation approval unless David separately reopens PDF export for MVP.

## Core Rule

A PDF is durable but static.

PDFs are records of the credential state at the time of generation. They do not update after generation.

All PDFs must disclose:

```text
This PDF is a static record generated on [date/time]. It reflects information available to PassTo at that time. Licensing status may change after generation.
```

## Payment Rules

Free:

- PDF export costs $1.99.
- PDF generation does not begin until payment succeeds.

Standard and Premier:

- PDF export is included.

## Storage Rule

Approved MVP rule:

```text
Generated PDFs are stored in Supabase Storage.
PDF records are tracked in a `pdf_exports` table.
PDF download access is controlled by authenticated nurse access or short-lived signed URLs.
```

PDFs must not be exposed through permanent public URLs.

## PDF Content

PDF should include:

- PassTo branding.
- Nurse full name.
- License number.
- License type.
- State.
- Source licensing-board status display.
- Expiry date.
- Last verified date/time.
- PDF generated date/time.
- Static PDF disclaimer.
- Trust indicators, where applicable.
- QR code where applicable.

Standard and Premier may include selfie. Free does not.

## PDF QR Rule

PDF QR links to a short-lived verification token if PDF QR remains part of MVP.

A PDF itself is durable/static, but its QR code is not a permanently valid verification route.

If the verifier needs a durable record, the PDF itself is the record.

## Provider

PDFMonkey remains the planned PDF generation provider for MVP unless later replaced.

Supabase Storage is the approved storage destination for generated PDFs.

## Recommended Tables

```text
pdf_exports
payments
jobs
verification_tokens
audit_events
```

Recommended `pdf_exports` fields include:

```text
id
profile_id
credential_id
license_id
payment_id
storage_path
pdf_generated_at
signed_url_expires_at
created_at
updated_at
```

## Related Docs

```text
/docs/features/TIER_FEATURES.md
/docs/features/SUBSCRIPTION.md
/docs/features/PASS_MANAGEMENT.md
/docs/architecture/NAMING_CONVENTIONS.md
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
```

## Open Items

- Final PDF template path and template variable names.
- PDF QR token TTL if PDF QR remains in MVP.
- Final PDF visual template from design system.
