# Developer Brief — ID.me OAuth Integration in Bubble
## PassTo — Phase 7.3

---

## Overview

PassTo is a verified digital nursing license credential stored in Apple/Google Wallet. Nurses enroll via a Bubble SPA at `app.passto.com`. The ID.me OAuth step verifies the nurse's identity at IAL2 (government ID level) and confirms their nurse community membership before a credential is issued.

Your job is to wire up the ID.me OAuth flow in Bubble, handle the callback, and pass the verified identity data to a Make webhook that runs the rest of the enrollment automation.

---

## What's Already Built

| Component | Status | Notes |
|---|---|---|
| Bubble enrollment app | ✅ Done | 5-page flow at app.passto.com |
| Make Scenario A | ✅ Done | Webhook-triggered; handles NYSED verification, Airtable, Postmark |
| Airtable database | ✅ Done | Nurses, Licenses, Credentials tables configured |
| Postmark email templates | ✅ Done | "Credential Ready" + ops alert |
| Pass Signing Service | 🔲 Separate task | Node.js/Vercel — covered in DEVELOPER_SETUP.md |

---

## Bubble App Pages

| Page | Route | Purpose |
|---|---|---|
| Enrollment form | `/enroll` | Nurse fills name, email, license number, type, state |
| Identity verification | `/verify-identity` | Launches ID.me OAuth |
| Verification in progress | `/verification-complete` | Handles OAuth callback; fires Make webhook |
| Pass ready | `/pass-ready` | Static confirmation — "Check your email" |
| Error | `/verification-error` | Shows if verification or license check fails |

---

## ID.me OAuth Flow — Step by Step

### Step 1 — Nurse clicks "Verify with ID.me" on `/verify-identity`

Bubble redirects the nurse to the ID.me authorization URL:

```
https://sandbox.id.me/oauth/authorize
  ?client_id=YOUR_SANDBOX_CLIENT_ID
  &redirect_uri=https://app.passto.com/verification-complete
  &response_type=code
  &scope=openid+identity+email+nurse
  &state=RANDOM_CSRF_TOKEN
```

- `scope` — request identity, email, and nurse community group attributes
- `state` — generate a random string, store in Bubble session state, verify on callback to prevent CSRF
- For production: replace `sandbox.id.me` with `api.id.me`

### Step 2 — Nurse completes ID.me verification

ID.me handles the identity verification UI (government ID scan + selfie for new users; login for returning users). PassTo has no visibility into this step.

### Step 3 — ID.me redirects back to `/verification-complete`

ID.me redirects to:
```
https://app.passto.com/verification-complete?code=AUTH_CODE&state=STATE
```

Bubble must:
1. Verify the `state` parameter matches what was stored in Step 1
2. Extract the `code` parameter from the URL

### Step 4 — Exchange auth code for access token

Make a server-side POST to ID.me token endpoint:

```
POST https://sandbox.id.me/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=https://app.passto.com/verification-complete
&client_id=YOUR_SANDBOX_CLIENT_ID
&client_secret=YOUR_SANDBOX_CLIENT_SECRET
```

Response:
```json
{
  "access_token": "ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 300
}
```

### Step 5 — Fetch nurse attributes from ID.me

```
GET https://sandbox.id.me/api/public/v3/attributes.json
Authorization: Bearer ACCESS_TOKEN
```

Response:
```json
{
  "status": [
    {
      "group": "nurse",
      "subgroup": "Registered Nurse",
      "verified": true,
      "id": "uuid-string"
    }
  ],
  "attributes": [
    { "handle": "fname", "value": "Rebecca" },
    { "handle": "lname", "value": "Segarra" },
    { "handle": "email", "value": "nurse@example.com" },
    { "handle": "uuid", "value": "unique-id-string" },
    { "handle": "ial", "value": "2" }
  ]
}
```

### Step 6 — Validate the response

Before proceeding, check:
- `ial` = `"2"` — identity verified at IAL2
- `status[0].group` = `"nurse"` — confirmed nurse community member
- `status[0].verified` = `true`

If any check fails → navigate to `/verification-error`.

### Step 7 — Fire Make webhook

POST to the Make webhook URL with the combined form data (from `/enroll`) + ID.me attributes:

```
POST MAKE_WEBHOOK_URL
Content-Type: application/json

{
  "firstName": "Rebecca",
  "lastName": "Segarra",
  "email": "nurse@example.com",
  "licenseNumber": "831106",
  "professionCode": "022",
  "idmeVerified": true,
  "idmeSubject": "uuid-from-idme",
  "subscriptionTier": "Free"
}
```

**professionCode mapping:**
- Registered Nurse → `022`
- Licensed Practical Nurse → `010`

Make responds immediately with `{ "success": true }`.

### Step 8 — Navigate to `/pass-ready`

On `success: true` from Make → navigate to `/pass-ready`.
On any error → navigate to `/verification-error`.

---

## Bubble Implementation Notes

### Storing form data across pages
The enrollment form data collected on `/enroll` (name, email, license number, type, state) must be available on `/verification-complete` to include in the Make webhook payload. Use one of:
- **Bubble URL parameters** — pass data forward as query params through the OAuth redirect (note: ID.me preserves the `state` param but not custom params)
- **Bubble session storage** — store form data in a custom state or Bubble's local storage before redirecting to ID.me; retrieve on callback
- **Recommended:** Store in a temporary Airtable record or Bubble's `current user` data store on form submit, retrieve by session on callback

### API calls in Bubble
The token exchange (Step 4) and attributes fetch (Step 5) involve your client secret — **do not make these calls from Bubble's front-end API connector directly** as the client secret would be exposed in browser network requests.

**Options:**
1. Use a lightweight Vercel serverless function as a proxy (can be added to the existing signing service repo) — Bubble calls your Vercel endpoint, which makes the ID.me calls server-side
2. Use Bubble's backend workflows (if on a plan that supports them) — runs server-side

**Recommended:** Add a `/idme-callback` endpoint to the Vercel signing service that accepts the auth code and returns the validated attributes. Bubble calls this endpoint instead of ID.me directly.

### PKCE (optional for sandbox, recommended for production)
Add PKCE to the authorization request for additional security:
- Generate a `code_verifier` (random string, 43–128 chars)
- Hash it: `code_challenge = BASE64URL(SHA256(code_verifier))`
- Add to authorization URL: `&code_challenge=HASH&code_challenge_method=S256`
- Include `code_verifier` in the token exchange request

---

## Vercel Proxy Endpoint (Recommended Addition)

Add this endpoint to the existing `passto-signing-service` Vercel project:

**`api/idme-callback.js`**

Accepts: `{ code, redirectUri }`
Does:
1. Exchanges code for access token with ID.me
2. Fetches attributes from ID.me
3. Validates IAL2 + nurse group membership
4. Returns validated attributes to Bubble

Returns:
```json
{
  "success": true,
  "firstName": "Rebecca",
  "lastName": "Segarra",
  "email": "nurse@example.com",
  "idmeSubject": "uuid-string",
  "ial": "2",
  "group": "nurse",
  "subgroup": "Registered Nurse"
}
```

Or on failure:
```json
{
  "success": false,
  "reason": "ial_insufficient"
}
```

---

## Environment Variables to Add to Vercel

| Variable | Value |
|---|---|
| `IDME_CLIENT_ID` | From ID.me sandbox dashboard |
| `IDME_CLIENT_SECRET` | From ID.me sandbox dashboard |
| `IDME_REDIRECT_URI` | `https://app.passto.com/verification-complete` |
| `IDME_BASE_URL` | `https://sandbox.id.me` (swap to `https://api.id.me` for production) |

---

## Make Webhook URL

```
PROVIDE TO DEVELOPER — copy from Make → Scenario A → Module 1 → Webhook URL
```

---

## Sandbox Test Credentials

- ID.me sandbox dashboard: `https://developers.id.me`
- Use sandbox test accounts to simulate IAL2-verified nurses
- Test nurse identity: use the pre-verified test accounts provided in the sandbox

---

## Files Handoff Checklist

| Item | Location |
|---|---|
| Signing service code | `/passto-signing-service/` |
| Make blueprint | `make-scenario-a-blueprint.json` |
| Postmark templates | `email-template-credential-ready.html`, `email-template-ops-alert.html` |
| Apple cert (.p12 + password) | Secure vault — request from David |
| Apple WWDR cert | Secure vault — request from David |
| Google service account JSON | Secure vault — request from David |
| ID.me sandbox credentials | Request from David |
| Vercel project | Share access via Vercel dashboard |
| Bubble app | Share access via Bubble dashboard |
| Airtable base | Share access via Airtable |

---

## Questions / Contact

David Bloom — david@passto.com
