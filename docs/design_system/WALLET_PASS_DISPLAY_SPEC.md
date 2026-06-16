# Wallet Pass Display Spec

**Status:** Baseline — Phase 9 Source Reconciliation (TASK-0074)
**Owner:** Claude / Codex
**Created:** 2026-06-16
**Source:** TASK-0073 decisions, sign-apple.js implementation, PRD Sections 1–7
**Applies To:** Apple Wallet pass, Google Wallet pass (production and demo variants)

---

## Purpose

This document defines the wallet pass display structure for PassTo Apple Wallet
and Google Wallet passes. It reconciles the display spec against TASK-0073
product decisions, particularly the removal of tier-dependent selfie display rules.

---

## Selfie / Photo Policy

**Selfie is required for all tiers.** David decision 2026-06-15 (TASK-0073).

Previous documentation that described selfie as optional or tier-gated is
superseded by this decision. Selfie is a required onboarding step and is
expected to be present on issued credentials regardless of subscription tier.

The selfie is NOT embedded in the wallet pass. The wallet pass does not carry
the selfie image. Selfie display is handled by the verifier view via
`verifier-selfie` backend delivery (see `SECURITY_MODEL.md`).

---

## Apple Wallet Pass Structure

Pass type: `generic`

| Field Group | Key | Label | Value Source |
|---|---|---|---|
| primaryFields | `name` | `NURSE` | `pass_template_data.nurse_name` |
| secondaryFields | `license` | `LICENSE #` | `pass_template_data.license_number` |
| secondaryFields | `type` | `TYPE` | `pass_template_data.license_type` |
| auxiliaryFields | `status` | `STATUS` | `pass_template_data.normalized_status` |
| auxiliaryFields | `expires` | `VALID THROUGH` | `pass_template_data.expiration_date` |
| backFields | `state` | `STATE` | `pass_template_data.license_state` |
| backFields | `issued` | `CREDENTIAL ISSUED` | `pass_template_data.credential_created` (date only) |
| backFields | `issuer` | `CREDENTIAL ISSUED BY` | `PassTo — passtodigital.com` (static) |

Serial number format (production): `passto-{credential_id}`

### Brand Tokens

| Property | Value | Token |
|---|---|---|
| backgroundColor | `rgb(11, 18, 32)` | Ink-900 `#0B1220` |
| foregroundColor | `rgb(255, 255, 255)` | White |
| labelColor | `rgb(47, 176, 105)` | Verified-400 `#2FB069` |

### Required Assets

All assets served from `api/assets/`:

```text
icon.png      (1x)
icon@2x.png   (2x)
logo.png      (1x)
logo@2x.png   (2x)
```

---

## Demo Wallet Pass Variant

Serial number format (demo): `demo-{credential_id}`

Demo passes differ from production in:

- `passTypeIdentifier`: uses `APPLE_DEMO_PASS_TYPE_ID` (separate from production)
- `primaryFields[0].label`: `DEMO` (not `NURSE`)
- `auxiliaryFields[0].value` (status): `Active - Simulated`
- `backFields[3]` (new): `IMPORTANT` label, `NOT A VALID PROFESSIONAL CREDENTIAL — SYNTHETIC DEMO DATA ONLY`
- `description`: `PassTo DEMO — Not a Valid Credential`
- `logoText`: `PassTo DEMO`
- Blob path: `demo-passes/{credential_id}/{serialNumber}.pkpass` (separate from production)

Demo passes are signed with the demo certificate only. They never use production
pass type identifiers, production certificates, or production Blob paths.

---

## Pass Template Data

`pass_template_data` JSONB on `credentials`:

```json
{
  "nurse_name":         "string — display name from profile",
  "license_holder":     "string — name from provider-verified license record",
  "license_type":       "string — e.g. RN, LVN",
  "license_state":      "string — e.g. NY",
  "license_number":     "string",
  "normalized_status":  "string — e.g. Active",
  "expiration_date":    "YYYY-MM-DD or null",
  "credential_created": "ISO 8601 timestamp"
}
```

The wallet pass reads only from `pass_template_data`. It does not make
additional Supabase queries at signing time to load raw provider data.

---

## Wallet Pass QR / Barcode

The production wallet pass does not embed a permanently valid verification QR.

Verification is initiated by the nurse via share link or show-QR from the app
dashboard. Those flows create short-lived one-time `verification_tokens`.

Show-QR is schema-supported (`token_type = 'show_qr'`) but implementation-deferred
from MVP. No launch task may create or expose `show_qr` tokens until David
explicitly reopens scope.

---

## Related Docs

```text
/docs/features/PASS_MANAGEMENT.md
/docs/architecture/SECURITY_MODEL.md
/docs/flows/VERIFIER_CREDENTIAL_VIEW.md
/api/sign-apple.js
/api/sign-apple-demo.js
/docs/tasks/TASK-0073.md
/docs/tasks/TASK-0074.md
```
