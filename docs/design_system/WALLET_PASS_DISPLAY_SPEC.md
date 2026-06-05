# Wallet Pass Display Specification

**Status:** David Approved
**Owner:** David Bloom
**Created:** 2026-06-05
**Approved:** 2026-06-05
**Related Tasks:** TASK-0050, TASK-0072
**Design References:** `docs/design_system/screenshots/`

## Purpose

This document defines the canonical information PassTo renders on Apple Wallet and Google Wallet passes.

The screenshots in `docs/design_system/screenshots/` are visual references, not the complete implementation contract. This spec is the source of truth for pass content, data sources, and fields that must not be rendered.

## Current Source State

The current signing code renders fields from `credentials.pass_template_data`, which is created by `credential-create`.

Current `pass_template_data` fields:

| Field | Current Source |
|---|---|
| `nurse_name` | `profiles.first_name + profiles.last_name` |
| `license_holder` | `licenses.first_name + licenses.last_name` |
| `license_type` | `licenses.license_type` |
| `license_state` | `licenses.state` |
| `license_number` | `licenses.license_number` |
| `normalized_status` | `licenses.normalized_status` |
| `status_intent` | `licenses.status_intent` |
| `wallet_pass_treatment` | `licenses.wallet_pass_treatment` |
| `issue_date` | `licenses.issue_date` |
| `expiration_date` | `licenses.expiration_date` |
| `status_checked_at` | `licenses.status_checked_at` |
| `lookup_source` | `licenses.lookup_source` |
| `verification_source_display` | derived display label from `licenses.lookup_source` |
| `credential_created` | credential creation timestamp |

The wallet pass design is implemented in the Apple PassKit payload in `api/sign-apple.js`. Google Wallet mirrors the same canonical content through `api/sign-google.js` text modules.

## Canonical Front-of-Pass Fields

These fields should be visible on the front of the wallet pass wherever the wallet platform supports equivalent fields.

| Display Element | Required | Data Source | Notes |
|---|---:|---|---|
| PassTo brand | Yes | static design asset / pass metadata | Use PassTo logo/wordmark assets. |
| Credential status badge | Yes | `licenses.normalized_status`, `licenses.status_intent`, `licenses.wallet_pass_treatment` | Examples: `VERIFIED`, `EXPIRING SOON`, `NOT VALID`, `REVOKED`. |
| License type label | Yes | `licenses.license_type` | Display user-readable license type such as Registered Nurse or Licensed Practical Nurse where available. |
| Nurse name | Yes | ID.me/profile name, cross-checked against license match | Display `profiles.first_name + profiles.last_name`; do not use browser-entered display name for credential identity. |
| Selfie/photo | Tier-dependent | approved selfie storage path / credential policy | Free: do not display selfie. Standard/Premier: display selfie only after selfie gate passes and storage access is approved. |
| Location | Optional for MVP | `licenses.state`; city requires approved source | Screenshots show city/state, but current canonical data only reliably supports state. Do not invent city. |
| License number | Yes | `licenses.license_number` | May be prefixed by `license_type` abbreviation if clear and non-duplicative. |
| License state | Yes | `licenses.state` | Prefer display name where available; state code acceptable if display-name mapping is not implemented. |
| Issue date | Optional for MVP | provider source field if available | Screenshots show issued date, but current provider persistence may not always include it. Omit rather than fabricate. |
| Expiration date | Yes when available | `licenses.expiration_date` | If null, show `Not provided by board` or omit depending on platform constraints. |
| Last verified timestamp | Yes | `licenses.status_checked_at` | Shows when PassTo last checked source status. |
| Verification source | Optional for MVP | `licenses.lookup_source` plus configured provider display name | Do not show raw API/provider payload. |

## Wallet Pass Status Mapping

| Product State | Source Condition | Display Treatment |
|---|---|---|
| Valid | `wallet_pass_treatment = valid` | Green/verified badge; no warning banner. |
| Expiring soon | Active license with fewer than 30 days until expiration, or `wallet_pass_treatment = caution` | Amber caution treatment; show expiration warning if supported. |
| Invalid / expired / suspended | `wallet_pass_treatment = invalid` | Red/error treatment; do not present as valid for employment. |
| Do not issue | `wallet_pass_treatment = do_not_issue` | Do not issue or update a valid-looking wallet pass. |

## Apple Wallet Field Mapping

Apple Wallet field names are constrained by PassKit layout. Use this mapping unless TASK-0072 documents a platform-specific deviation.

| Apple Field Area | PassTo Display |
|---|---|
| `logoText` / header branding | PassTo |
| `headerFields.status_badge` | Credential/license status |
| `primaryFields.name` | Nurse name, labeled by license type |
| `secondaryFields.license` | License number |
| `secondaryFields.state` | License state |
| `auxiliaryFields.issued` | License issue date, or credential creation date when license issue date is unavailable |
| `auxiliaryFields.expires` | Expiration date |
| `backFields.state` | License state |
| `backFields.type` | License type |
| `backFields.license` | License number |
| `backFields.last_verified` | Last verified timestamp |
| `backFields.source` | Licensing-board/provider display name, if available |
| `backFields.issuer` | PassTo issuer label |

## Google Wallet Field Mapping

Google Wallet generic pass layout should use this mapping unless TASK-0072 documents a platform-specific deviation.

| Google Field | PassTo Display |
|---|---|
| `cardTitle` | PassTo |
| `subheader` | Verified Nursing License |
| `header` | Nurse name |
| `textModulesData.license_type` | License type |
| `textModulesData.license_state` | License state |
| `textModulesData.license_number` | License number |
| `textModulesData.status` | Credential/license status |
| `textModulesData.issued` | License issue date, or credential creation date when license issue date is unavailable |
| `textModulesData.valid_through` | Expiration date |
| `textModulesData.last_verified` | Last verified timestamp |
| `textModulesData.source` | Licensing-board/provider display name, if available |

## Forbidden Fields

Do not render these fields on the wallet pass:

- DOB.
- SSN or partial SSN.
- Raw ID.me claims.
- Raw RapidAPI/Propelus payload.
- Internal Supabase IDs.
- Stripe/customer/payment IDs.
- Raw verification tokens.
- Permanent verification QR or barcode.
- Service/provider secrets.

## QR Boundary

The screenshot concepts currently show QR-like visual references. For MVP implementation, wallet passes must not embed a permanent QR or barcode that grants verifier access.

Verifier access must use a backend-created `share_link` or future approved `show_qr` token with short TTL and first-use behavior.

If a static QR-like image is used in marketing screenshots, it must be treated as illustrative only and not as implementation approval.

## Screenshot Reference Mapping

| Screenshot | Intended State | Implementation Notes |
|---|---|---|
| `pass-default.*` | Valid credential | Canonical fields: name, license type, license number, state, expiration, last verified. QR visual is not implementation-approved. |
| `pass-expiring.*` | Caution / expiring soon | Amber warning treatment. Requires expiration-date calculation. |
| `pass-revoked.*` | Invalid/revoked | Red warning treatment. For MVP, do not issue a valid-looking pass when known invalid. |
| `pass-blank.*` | Empty/loading/placeholder concept | Not a credential-state source of truth. |
| `pass-share-flow.*` | Sharing concept | Share flow is separate from wallet pass content. |

## Implementation Gap for TASK-0072

TASK-0072 should reconcile current implementation against this spec before real wallet-provider launch.

Current source-level status:

- `credential-create` includes status intent, wallet pass treatment, issue date, expiration date, last verified timestamp, lookup source, and a safe verification-source display label in `pass_template_data`.
- `sign-apple.js` builds the pass design in PassKit with status, name, license number, state, issued date, expiration date, last verified timestamp, source, and issuer fields.
- `sign-google.js` mirrors the same display information with Google Wallet generic object text modules.
- Current signing routes do not add QR/barcode fields.

Remaining gaps before TASK-0072 can pass:

- Apple and Google provider credentials/env vars are not yet configured and verified.
- Live Apple Wallet and Google Wallet rendering has not yet been tested on provider-generated passes.
- Selfie/photo rendering remains deferred unless David approves the tier-specific selfie source and storage access policy.
- City/location rendering remains deferred because current canonical data reliably supports state only.

## Approval

David approved this display specification as implementation truth for TASK-0072 on 2026-06-05.
