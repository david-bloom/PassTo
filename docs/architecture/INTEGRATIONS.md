# PassTo Integrations

**Status:** Baseline  
**Owner:** Codex  
**Last Updated:** 2026-05-25  
**Related Task:** TASK-0005  

---

## Purpose

This document defines PassTo MVP third-party integrations and what each integration owns.

It is a planning reference for future implementation specs and QA.

This document does not approve live production setup.

---

## Integration Summary

MVP integration set:

```text
Supabase
Vercel
Stripe
PassKit / wallet pass provider path
Postmark
PDFMonkey
Supabase Storage
GitHub
Licensing source / vendor APIs
```

---

## Supabase

Supabase owns:

- Postgres database
- Row Level Security
- Auth/session model where used
- Storage for generated PDFs
- Service-role server operations

Key docs:

```text
/docs/architecture/DATA_MODEL.md
/docs/architecture/SECURITY_MODEL.md
```

Production migrations require Codex QA and David approval.

---

## Vercel

Vercel owns:

- Web app hosting
- Frontend routes
- Server/API routes
- Token validation routes
- Payment/entitlement-gated action routes
- Stripe webhook endpoint where applicable

Vercel routes must enforce business rules before creating sensitive or paid records.

Examples:

```text
/v/[token]
/api/verification-tokens
/api/credential-refresh
/api/pdf-exports
/api/webhooks/stripe
```

---

## Stripe

Stripe owns:

- Subscriptions
- Paid share/show-QR actions where applicable
- Paid refresh where applicable
- Paid PDF export where applicable
- Additional license purchases
- Customer Portal
- Webhooks

Confirmed MVP pricing:

```text
Standard: $9.99/month
Premier: $19.99/month
Share link for Free: $1.99
Show QR for Free: $1.99
Paid refresh: $1.99
PDF export for Free: $1.99
Additional license for paid tiers: $4.99
```

Recommended tables:

```text
payments
subscriptions
stripe_events
audit_events
```

Stripe webhooks must be idempotent.

---

## PassKit / Wallet Pass Provider Path

PassKit/wallet provider path owns:

- Wallet pass creation
- Wallet pass updates
- Provider pass identifiers
- Push/update mechanism where supported

PassTo owns:

- Credential state
- License status translation
- Wallet pass treatment
- Whether a pass should be valid, caution, invalid, or not issued

Wallet pass treatment values:

```text
valid
caution
invalid
do_not_issue
```

Do not put a permanently valid verification QR in the wallet pass.

---

## Postmark

Postmark owns outbound transactional email.

Likely MVP email categories:

- Account emails
- Payment receipts/failures where not handled by Stripe UX
- Expiry/status notifications
- Refresh success/failure notices
- Share/view notifications if included

Recommended table:

```text
notification_events
```

---

## PDFMonkey

PDFMonkey owns PDF generation.

PassTo provides template data and receives/generated PDF output.

PDFs are static records and must include approved PDF disclaimer copy.

Generated PDFs are stored in Supabase Storage and tracked in `pdf_exports`.

---

## Supabase Storage

Supabase Storage owns generated PDF storage.

Access rule:

```text
Authenticated nurse access or short-lived signed URLs.
```

No permanent public URLs for generated credential PDFs.

---

## GitHub

GitHub owns project source of truth:

- Docs
- Tasks
- Issues
- PRs
- Reviews
- Labels
- Activity/decision/risk/approval logs

Codex and Claude use GitHub labels and the `C` handshake for review-loop routing.

---

## Licensing Source / Vendor APIs

The licensing source owns raw license lookup results.

PassTo must store:

```text
source_status_raw
source_status_display
normalized_status
status_intent
wallet_pass_treatment
status_checked_at
```

Raw source `unknown` is a verification failure and should not issue or update a credential as valid.

---

## Integration Guardrails

- Do not expose service-role keys client-side.
- Do not create paid/gated records from direct client inserts.
- Do not trust webhook requests without provider signature validation.
- Do not store raw verifier tokens.
- Do not use permanent public PDF URLs.
- Do not apply live integration changes without required approval.

---

## Open Items

- Exact PassKit provider configuration and payloads.
- Final license lookup vendor/API implementation path.
- Stripe product/price IDs after setup.
- Postmark template list and sender domains.
- PDFMonkey template IDs and final PDF design.
- PDF QR token TTL if PDF QR remains in MVP.

---

## Related Docs

```text
/docs/architecture/SYSTEM_ARCHITECTURE.md
/docs/architecture/DATA_MODEL.md
/docs/architecture/SECURITY_MODEL.md
/docs/features/
/docs/flows/
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
```
