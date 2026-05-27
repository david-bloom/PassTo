# PassTo Security Model

**Status:** Baseline — Not Implementation Approved  
**Owner:** Codex  
**Last Updated:** 2026-05-27  
**Related Task:** TASK-0005, TASK-0018  

---

## Purpose

This document defines PassTo MVP security principles at a Product Manager technical level.

It guides Supabase RLS, verifier access, payment-gated actions, token handling, production safety, and Codex QA.

This document does not approve implementation or migration execution.

---

## Security Goals

PassTo MVP security goals:

1. Nurses can access only their own account and credential data.
2. Verifiers can access credential data only through valid short-lived one-time tokens.
3. Anonymous users cannot browse credentials.
4. Payment-gated actions cannot be bypassed by client-side inserts.
5. Raw verifier access tokens are never stored.
6. Verifier private contact data is not displayed directly to nurses.
7. Stripe, jobs, and privileged operations use service-role/server-side paths.
8. Operational, audit, payment, and verification records are retained safely.
9. Biometric/selfie assets are stored only in protected private storage.

---

## Access Roles

### Nurse / Authenticated User

Can access their own account, licenses, credentials, wallet-pass status, tier, payment history, and allowed product history.

Cannot access other nurses' data.

Cannot directly create privileged records that require server validation, such as verification tokens for paid/tier-gated actions.

### Verifier / Anonymous External User

Does not have a PassTo account in MVP.

Can access verifier credential view only through a valid token.

Verifier access should be mediated by Vercel/API/service-role logic.

### Service Role / Server

Used for:

- Stripe webhooks
- Token validation
- Token creation after entitlement/payment validation
- Scheduled jobs
- PDF generation/storage workflows
- Wallet pass updates
- Admin/operational writes
- Selfie confirmation and protected asset operations

Service role must not be exposed to the client.

---

## Supabase RLS Principles

RLS must enforce:

```text
Nurse can read/write only own allowed account data.
Verifier cannot directly query credential tables.
Anonymous users cannot browse credentials.
Privileged tables are service-role-only unless explicitly exposed through safe views or APIs.
```

High-risk tables should not be broadly client-writable:

```text
verification_tokens
payments
subscriptions
stripe_events
jobs
audit_events
license_status_mappings
```

These should generally be written by server-side/service-role flows.

---

## Storage Security

Selfies are biometric PII and must be stored only in private Supabase Storage.

Approved MVP pattern:

```text
Bucket: selfies
Path: {auth_user_id}/selfie.jpg
Access: authenticated nurse exact-path INSERT/UPDATE/SELECT only
Delete: service-role only
```

Selfie paths on `profiles` are trust-gate fields. They must be written only by backend confirmation after upload validation. Nurses must not be able to self-attest `selfie_storage_path` through direct profile updates.

Long-lived signed URLs for selfies are not approved for MVP. If a support/ops use case later requires viewing a selfie outside the Supabase dashboard, use a backend-generated short-TTL signed URL only.

---

## Token Security

All live verifier access tokens are one-time and short-lived.

Token types:

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

`show_qr` is schema-supported but implementation-deferred. No launch task may create or expose `show_qr` tokens until David reopens scope.

PDF QR token TTL still requires confirmation if PDF QR is later reopened.

Store:

```text
token_hash
```

Do not store raw tokens.

Token statuses are mutually exclusive:

```text
active
used
expired
replaced
revoked
payment_failed
generation_failed
```

If a token is used, it remains `used` and does not later become `expired`.

---

## Payment-Gated Security

Free-tier share links, show-QR access, on-demand refresh, and PDF export are payment-gated where applicable.

Token creation and paid action creation must happen server-side after:

1. Authenticated nurse is confirmed.
2. Credential ownership is confirmed.
3. Tier entitlement is checked.
4. Payment success is confirmed where required.
5. Token TTL/status is set safely.

The client should not directly insert rows that bypass entitlement/payment rules.

---

## Verifier Privacy

Verifier form collects only:

```text
name
email
```

No verifier organization, title, phone, address, or extra notes in MVP.

Verifier email should not be directly displayed to the nurse.

If nurses need verification history, expose nurse-safe views or API responses that omit private verifier email unless later approved.

---

## PDF Security

Generated PDFs are stored in Supabase Storage.

PDF access uses:

```text
authenticated nurse access
or
short-lived signed URLs
```

PDFs must not be exposed through permanent public URLs.

PDFs are static records and must include the approved PDF disclaimer.

---

## Retention / Deletion Security

Approved MVP rule:

```text
Retain operational, audit, payment, and verification records for 7 years unless legal counsel later changes this.
```

Use soft delete/deactivation for accounts.

Normal account closure must use:

```text
profiles.deleted_at
```

Hard delete of `auth.users` is not an approved account-closure operation. It may cascade through profile-linked product records and destroy license, credential, token, verifier, and lookup history for accounts without payment/subscription RESTRICT protection.

Hard delete may only be used by a dedicated purge process after the approved retention window and with explicit operational approval. That future purge process must also handle protected Storage objects such as `selfies/{auth_user_id}/selfie.jpg`.

Do not cascade-delete operational records that are needed for payment, audit, support, verification, or legal traceability.

---

## Production Safety

Production-impacting changes require David approval.

Examples:

- Supabase migration execution
- RLS changes
- Auth changes
- Stripe live-mode changes
- PassKit production changes
- Postmark production changes
- Environment variable/secret changes
- Webhook changes
- Deployment changes

Production changes should include a rollback or recovery note where relevant.

---

## Codex Security QA Checklist

Before approving implementation, Codex should check:

- Are nurse data boundaries enforced?
- Are anonymous verifier paths token-gated?
- Are raw tokens avoided?
- Are payment-gated actions server-controlled?
- Is verifier email protected from nurse direct reads?
- Are service-role operations isolated from the client?
- Are Stripe webhooks idempotent?
- Are audit/payment/verification records retained safely?
- Are hard deletes avoided where retention is required?
- Are selfie/biometric assets private and exact-path scoped?

---

## Related Docs

```text
/docs/architecture/SYSTEM_ARCHITECTURE.md
/docs/architecture/DATA_MODEL.md
/docs/architecture/INTEGRATIONS.md
/docs/architecture/NAMING_CONVENTIONS.md
/docs/tasks/2026-05-24-claude-task-001-codex-qa-review.md
/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md
/docs/architecture/V4_REMEDIATION_R4_LICENSE_PENDING.md
```
