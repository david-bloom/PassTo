# PassTo System Architecture

**Status:** Baseline  
**Owner:** Codex  
**Last Updated:** 2026-05-25  
**Related Task:** TASK-0005  

---

## Purpose

This document describes the MVP system architecture for PassTo at a Product Manager technical level.

It explains the major system parts, what each part owns, and where future implementation work should fit.

This document does not approve production deployment or Supabase migration execution.

---

## MVP Architecture Summary

PassTo MVP uses:

```text
Frontend / App: Vercel-hosted web app
Database: Supabase Postgres
Auth / RLS: Supabase Auth and Row Level Security
Payments: Stripe
Wallet Passes: PassKit / Apple Wallet / Google Wallet path
Email: Postmark
PDF Generation: PDFMonkey
PDF Storage: Supabase Storage
Project Source of Truth: GitHub documentation and PR/issue workflow
```

The architecture goal is MVP simplicity with enough structure to avoid data, payment, verifier-access, and security mistakes.

---

## High-Level System Flow

```text
Nurse signs up / logs in
        ↓
Nurse verifies identity / license data is collected
        ↓
PassTo stores profile, license, credential, tier, and payment state in Supabase
        ↓
PassTo issues or updates wallet pass state through PassKit path
        ↓
Nurse can refresh, share, show QR, or export PDF based on tier/payment rules
        ↓
Verifier access uses short-lived one-time verification tokens
        ↓
Events, payments, refreshes, PDFs, and audit records are stored for operational history
```

---

## Major Components

### Vercel Web App

Owns:

- Nurse dashboard
- Account/tier UI
- Sharing/show-QR UI
- Verifier landing/view route
- Upgrade/payment entry points
- API routes/server actions

Vercel routes must enforce business rules before creating paid or sensitive objects.

Examples:

```text
/share
/show-qr
/v/[token]
/dashboard
/upgrade
/account
```

### Supabase Postgres

Owns durable product state:

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

Supabase is the main source for application state.

### Supabase Auth and RLS

Owns authenticated nurse access boundaries.

Core rule:

```text
A nurse can access only their own account/dashboard data.
Anonymous users cannot browse credentials.
Verifier access must go through validated token flows.
```

### Stripe

Owns payment processing and subscription state.

PassTo records Stripe results in Supabase tables such as:

```text
payments
subscriptions
stripe_events
```

Stripe webhooks must be handled server-side with idempotency.

### PassKit / Wallet Pass Integration

Owns wallet pass generation/update path.

PassTo owns the product state and wallet treatment value.

PassKit receives the appropriate pass update based on PassTo state.

### Postmark

Owns outbound transactional email.

Notification sends should be tracked in `notification_events`.

### PDFMonkey and Supabase Storage

PDFMonkey generates PDFs.

Generated PDFs are stored in Supabase Storage and tracked in `pdf_exports`.

PDF access uses authenticated nurse access or short-lived signed URLs.

---

## Verifier Access Architecture

Verifier access must be tokenized and short-lived.

Approved token types:

```text
share_link
show_qr
pdf_qr
```

Approved TTLs:

```text
share_link: 72 hours or first successful use
show_qr: 45 minutes or first use
```

PDF QR TTL still requires confirmation if PDF QR remains in MVP.

Tokens are stored as hashes, not raw tokens.

Verifier access is mediated by Vercel/API/service-role logic, not broad direct anonymous Supabase reads.

---

## Product State vs Audit State

Dashboard and product behavior should use purpose-built tables.

Examples:

```text
verification_tokens
verification_events
refresh_events
payments
subscriptions
pdf_exports
notification_events
credentials
licenses
```

`audit_events` is append-only operational history. It is not the main dashboard source of truth.

---

## MVP Safety Rules

- Do not apply Supabase migrations until Codex QA and David approval are complete.
- Do not expose raw verification tokens.
- Do not let nurses directly create paid/gated token rows from the client.
- Do not expose verifier email to nurses by default.
- Do not store durable wallet state as colors.
- Do not use hard deletes for records that must be retained.
- Do not introduce organization accounts in MVP unless David approves.

---

## Related Docs

```text
/docs/architecture/DATA_MODEL.md
/docs/architecture/SECURITY_MODEL.md
/docs/architecture/INTEGRATIONS.md
/docs/architecture/NAMING_CONVENTIONS.md
/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md
/docs/features/
/docs/flows/
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
```

---

## Open Items

- Final Supabase migration SQL after Claude remediation and Codex re-review.
- Exact PassKit update payloads.
- Final Terms of Use.
- PDF QR token TTL if PDF QR remains in MVP.
- Final production deployment and rollback process.
