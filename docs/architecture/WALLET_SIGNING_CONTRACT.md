# PassTo Wallet Signing and Issuance Contract

**Task:** TASK-0050  
**Status:** Approved and Implemented  
**Created:** 2026-06-02  
**Owner:** Claude / David  

---

## 1. Signing Boundary Decision

### Apple Wallet — Vercel Route

Apple pass signing requires:
- A `.pkpass` ZIP file containing `pass.json`, `manifest.json`, `signature`, and image assets
- PKCS#7 signing with the Apple Wallet certificate and private key
- The `passkit-generator` Node.js library for ZIP generation and signing

**Decision: Vercel route (`api/sign-apple.js`)**  
Deno (Supabase Edge Functions) does not natively support ZIP generation or PEM certificate parsing in the form required by `passkit-generator`. The existing Vercel route is the correct location. Certificates are loaded from Vercel environment variables as base64-encoded PEM.

### Google Wallet — Vercel Route

Google Wallet issuance requires:
- RS256 JWT signing with a Google service account private key
- The `jsonwebtoken` Node.js library

**Decision: Vercel route (`api/sign-google.js`)**  
JWT RS256 signing with a Google service account is technically possible in Deno via Web Crypto API, but keeping both providers in Vercel simplifies secret management and deployment. The existing route is the correct location.

### Orchestration — Supabase Edge Function

**`wallet-issue`** is a new Supabase Edge Function that:
- Is called by Lovable from `/success` after `credential-create` succeeds
- Loads credential and license data from the database (no raw data from the client)
- Validates credential state before calling Vercel routes
- Calls both Vercel routes with an internal service token
- Writes results to `wallet_passes`
- Updates `credentials.status` to `active` when at least one provider issues successfully

Lovable never calls the Vercel signing routes directly. The Edge Function is the sole caller.

---

## 2. Internal Authentication Between Edge Function and Vercel Routes

A shared secret `WALLET_INTERNAL_SECRET` is used:
- Set as a Supabase Edge Function secret: `WALLET_INTERNAL_SECRET`
- Set as a Vercel environment variable: `WALLET_INTERNAL_SECRET`
- Sent as `Authorization: Bearer <secret>` from the Edge Function to each Vercel route
- Vercel routes reject any request without a matching `Authorization` header

This prevents direct client calls to the Vercel signing routes.

---

## 3. Request/Response Contract

### `wallet-issue` (Supabase Edge Function)

**Caller:** Lovable `/success` page  
**Method:** POST  
**Auth:** `verify_jwt: true`  
**Gate:** `onboarding_step = 'pass'` or `'complete'`, credential exists with `status = 'pending'` or `'active'`

**Request body:** (none required — credential resolved from authenticated profile)

**Response (success):**
```json
{
  "credential_id": "<uuid>",
  "credential_status": "active",
  "apple": {
    "status": "issued",
    "pass_url": "https://blob.vercel-storage.com/passes/..."
  },
  "google": {
    "status": "issued",
    "save_url": "https://pay.google.com/gp/v/save/..."
  }
}
```

**Response (partial — one provider failed):**
```json
{
  "credential_id": "<uuid>",
  "credential_status": "active",
  "apple":  { "status": "issued", "pass_url": "..." },
  "google": { "status": "error",  "error": "provider_unavailable" }
}
```

**Response (all providers failed):**
```json
{
  "credential_id": "<uuid>",
  "credential_status": "pending",
  "apple":  { "status": "error", "error": "provider_unavailable" },
  "google": { "status": "error", "error": "provider_unavailable" }
}
```

**Response (credential already active — idempotent return):**
```json
{
  "credential_id": "<uuid>",
  "credential_status": "active",
  "apple":  { "status": "issued", "pass_url": "..." },
  "google": { "status": "issued", "save_url": "..." },
  "already_issued": true
}
```

### Vercel `api/sign-apple.js`

**Caller:** `wallet-issue` Edge Function only  
**Method:** POST  
**Auth:** `Authorization: Bearer <WALLET_INTERNAL_SECRET>`

**Request body:**
```json
{ "credential_id": "<uuid>" }
```

The route loads all pass data from Supabase using the service role key. No nurse data is accepted from the request body.

**Response (success):**
```json
{
  "success": true,
  "pass_url": "https://blob.vercel-storage.com/passes/<id>/<serial>.pkpass",
  "serial_number": "passto-<credential_id>"
}
```

**Response (failure):**
```json
{ "success": false, "error": "<message>" }
```

### Vercel `api/sign-google.js`

**Caller:** `wallet-issue` Edge Function only  
**Method:** POST  
**Auth:** `Authorization: Bearer <WALLET_INTERNAL_SECRET>`

**Request body:**
```json
{ "credential_id": "<uuid>" }
```

**Response (success):**
```json
{
  "success": true,
  "save_url": "https://pay.google.com/gp/v/save/<jwt>",
  "object_id": "<issuer_id>.<object_id>"
}
```

---

## 4. Credential Payload — Safe Display Fields

The Vercel signing routes load from Supabase using `credential.pass_template_data` (set by `credential-create`). The fields used for pass display:

| Field | Source | Apple | Google |
|---|---|---|---|
| `nurse_name` | `profiles.first_name + last_name` (ID.me-verified) | primaryFields.name | header |
| `license_type` | `licenses.license_type` (provider-returned) | secondaryFields.type | textModulesData.license_type |
| `license_state` | `licenses.state` | backFields.state | textModulesData.state |
| `license_number` | `licenses.license_number` | secondaryFields.license | textModulesData.license_number |
| `normalized_status` | `licenses.normalized_status` | auxiliaryFields.status | textModulesData.status |
| `expiration_date` | `licenses.expiration_date` | auxiliaryFields.expires | textModulesData.valid_through |
| `credential_created` | `credentials.created_at` | backFields.issued | — |

**What is NOT in the pass:**
- Raw RapidAPI payload
- Discipline data
- DOB
- Internal Supabase IDs
- Permanent verification QR (see Section 5)

---

## 5. No Permanent QR in Wallet Pass

The original `sign-google.js` embedded a `barcode` field. This is removed in the revised contract.

Per PRD decision: wallet pass does not carry a permanent verification QR. Verifier access is via share-link tokens (TASK-0041 / TASK-0042 scope), not a QR embedded in the pass itself.

---

## 6. `wallet_passes` Row Lifecycle

| Event | `status` | `pass_url` / `external_pass_id` |
|---|---|---|
| Before issuance | `pending` | null |
| Provider call started | `pending` | null |
| Provider success | `issued` | set |
| Provider failure | `error` | null |
| Pass voided (future) | `voided` | retained |

One row per `(credential_id, provider)` — unique constraint enforced by schema.

On retry: if `wallet_passes.status = 'error'`, update the existing row rather than insert a new one.

---

## 7. Credentials Status Lifecycle

| Condition | `credentials.status` |
|---|---|
| Created by `credential-create` | `pending` |
| At least one wallet provider issued | `active` |
| All wallet providers failed | remains `pending` |
| License revoked/expired (future) | `suspended` or `revoked` |

`credentials.issued_at` is set when status advances to `active`.

---

## 8. Audit Events

| Event | Action | Written by |
|---|---|---|
| Wallet issuance started | `wallet.issue_started` | `wallet-issue` |
| Apple pass issued | `wallet.apple_issued` | `wallet-issue` |
| Apple pass failed | `wallet.apple_failed` | `wallet-issue` |
| Google pass issued | `wallet.google_issued` | `wallet-issue` |
| Google pass failed | `wallet.google_failed` | `wallet-issue` |
| Credential activated | `credential.activated` | `wallet-issue` |

All audit events written by the `wallet-issue` Edge Function after provider calls complete. Audit failure is logged but not fatal (the wallet URL has already been issued).

---

## 9. Retry and Idempotency

- If `wallet_passes.status = 'issued'` for a provider, the Edge Function returns the existing URL without calling the provider again.
- If `wallet_passes.status = 'error'`, the route re-calls the provider and updates the existing row.
- Apple: `serial_number` is `passto-<credential_id>` (deterministic from credential ID, not timestamp). A re-signed pass with the same serial number updates the pass in the nurse's wallet on next sync.
- Google: `object_id` is `passto_<credential_id>` (deterministic). Re-issuance using the same object ID is idempotent via Google Wallet API.

---

## 10. Required Secrets

**Supabase Edge Function secrets** (set via `npx supabase secrets set`):

| Secret | Description |
|---|---|
| `WALLET_INTERNAL_SECRET` | Shared token authenticating Edge Function → Vercel calls |
| `VERCEL_SIGN_APPLE_URL` | Full URL of deployed `api/sign-apple.js` Vercel route |
| `VERCEL_SIGN_GOOGLE_URL` | Full URL of deployed `api/sign-google.js` Vercel route |
| `SUPABASE_SERVICE_ROLE_KEY` | Already set |

**Vercel environment variables** (set in Vercel dashboard):

| Variable | Description | Hard Gate |
|---|---|---|
| `WALLET_INTERNAL_SECRET` | Same shared token | No (generate any secure random string) |
| `APPLE_WWDR_PEM_BASE64` | Apple WWDR intermediate certificate, base64 | **David must procure** |
| `APPLE_CERT_PEM_BASE64` | Apple Wallet signing certificate, base64 | **David must procure** |
| `APPLE_KEY_PEM_BASE64` | Apple Wallet private key, base64 | **David must procure** |
| `APPLE_CERT_PASSWORD` | Private key passphrase (if any) | **David must procure** |
| `APPLE_PASS_TYPE_ID` | Pass type identifier (`pass.com.passto...`) | **David must register** |
| `APPLE_TEAM_ID` | Apple Developer Team ID | **David must provide** |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Wallet service account JSON | **David must procure** |
| `GOOGLE_WALLET_ISSUER_ID` | Google Wallet issuer ID | **David must register** |
| `GOOGLE_WALLET_CLASS_ID` | Google Wallet class ID | **David must register** |
| `PASSTO_LOGO_URL` | Publicly accessible PassTo logo URL | Low — use existing asset |
| `SUPABASE_URL` | Supabase project URL | Already known |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Already known |

**Apple and Google certificate/key/account procurement are hard gates requiring David approval before production use.**

---

## 11. Blocked-Provider Fallback

If Apple Wallet issuance fails and Google succeeds (or vice versa), the credential is still activated (`status = 'active'`). The `/success` page shows the available wallet action and omits the unavailable one.

If both providers fail, the credential remains `pending`. The `/success` page shows a "We're preparing your credential — check back soon" message. Ops can inspect `wallet_passes` rows with `status = 'error'` for manual retry.

---

## 12. What Is Not Implemented in This Task

- Production certificate/key procurement (Apple Developer Program, Google Wallet issuer)
- Wallet pass refresh/revocation automation (future task)
- Permanent QR in pass (blocked by product decision)
- Show QR feature (post-MVP)
- PDF export (post-MVP)
