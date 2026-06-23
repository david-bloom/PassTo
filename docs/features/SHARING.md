# PassTo Sharing

**Status:** Complete Product / GA Reference with PRD-Controlled MVP Scope
**Source:** Product Attributes Blueprint v1.6 + David decisions  
**Owner:** Codex  
**Last Updated:** 2026-06-04

## Purpose

This document defines nurse-initiated sharing behavior for PassTo credentials.

The approved PRD remains the source of truth for MVP launch scope. Share-link verifier access is launch-critical in the PRD; Show QR and PDF QR behavior are complete-product / GA references unless separately reopened for MVP.

## Core Rule

All live verifier access tokens are one-time and short-lived.

A nurse may create verifier access in two ways:

1. Send a share link.
2. Show a QR code for verifier scan.

Both mechanisms create a short-lived one-time verification token.

## Wallet Pass QR Rule

The wallet pass itself does not carry a permanently valid verification QR.

The nurse initiates sharing or “show QR,” which creates a short-lived one-time verification token.

## Token Types

Recommended token types:

```text
share_link
qr_scan
pdf_qr
```

## Token Status

Token statuses are mutually exclusive.

Recommended status enum:

```text
active
used
expired
replaced
revoked
payment_failed
generation_failed
```

Status precedence:

```text
used > replaced > revoked > expired > active
```

If a token is used, it remains `used`. It does not later become `expired`.

## Token Lifecycle

A token is valid only when:

- Status is `active`.
- `expires_at` is in the future.
- Associated credential is allowed to be shown.
- Associated license status mapping allows verification display.
- Token has not been used.

A token becomes:

- `used` after successful verifier access.
- `expired` if time expires before use.
- `replaced` if superseded before use.
- `revoked` if the credential is no longer eligible for verification.
- `generation_failed` if token creation fails after request.
- `payment_failed` if a paid token request fails payment.

## Payment Rules

These payment rules describe complete-product / GA tier behavior. MVP implementation must follow the PRD unless David separately reopens GA paid-action scope.

Free tier:

- Share link / verifier access token requires $1.99 payment.
- Token generation does not proceed until payment succeeds.

Standard and Premier:

- Share link / verifier access token is included.

## Token Storage

Do not overload `credentials` with the current share token.

Recommended table:

```text
verification_tokens
- id
- credential_id
- token_hash
- token_type
- status
- expires_at
- used_at
- replaced_at
- revoked_at
- created_at
- created_by_user_id
- payment_id
```

Raw tokens should not be stored if avoidable. Store token hashes.

## Share History

Dashboard share history should come from `verification_tokens`, not from a generic audit log.

`audit_events` may keep an append-only trail, but product history should use purpose-built tables.

## Current-As-Of Disclaimer

All live verifier views must disclose:

```text
This verification reflects information available to PassTo as of [date/time]. Licensing status may change after this verification. For official status, consult the applicable licensing authority.
```

## Out of Scope

- Persistent public credential pages.
- Permanent wallet pass QR verification.
- Multi-use verifier links.
- Verifier organization collection.
