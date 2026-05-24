# PassTo PDF Export

**Status:** Draft  
**Source:** Product Attributes Blueprint v1.6 + David decisions  
**Owner:** Codex  
**Last Updated:** 2026-05-24  

## Purpose

This document defines PDF credential/report export behavior.

## Core Rule

A PDF is durable but static.

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

## PDF Content

PDF should include:

- PassTo branding.
- Nurse full name.
- License number.
- License type.
- State.
- Raw licensing-board status display.
- Expiry date.
- Last verified date/time.
- PDF generated date/time.
- Current-as-of disclaimer.
- Trust indicators, where applicable.
- QR code where applicable.

Standard and Premier may include selfie. Free does not.

## PDF QR Rule

PDF QR links to a short-lived token.

A PDF itself is durable/static, but its QR code is not a permanently valid verification route.

If verifier needs a durable record, the PDF itself is the record.

## Provider

PDFMonkey remains the planned PDF provider for MVP based on the existing blueprint.

## Recommended Tables

```text
pdf_exports
payments
jobs
verification_tokens
audit_events
```

## Open Items

- Final PDF template path and template variable names.
- Exact PDF storage/download URL policy.
- Expiration duration for PDF QR tokens.
