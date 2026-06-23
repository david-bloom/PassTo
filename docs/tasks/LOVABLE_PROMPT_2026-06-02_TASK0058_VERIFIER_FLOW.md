# Lovable Prompt — TASK-0058 `/v/{token}` Verifier Flow

**Created:** 2026-06-02
**Owner:** Claude
**Related Task:** TASK-0058
**Related Docs:** `docs/design_system/README.md`, `docs/flows/VERIFIER_CREDENTIAL_VIEW.md`

---

## Prompt To Paste Into Lovable

Implement the PassTo `/v/:token` verifier route. This is a public page — no PassTo account required. Do not touch any other routes.

---

### What This Page Does

`/v/:token` is the **verifier credential view**. A nurse sends a share link to a verifier (e.g., a recruiter or employer). The verifier opens the link, fills in their name and email, accepts Terms, and sees the nurse's verified credential status.

The page must:
1. Extract the token from the URL
2. Show a verifier form (name, email, Terms, optional marketing consent)
3. On form submit, POST to the backend with the token + form data
4. Show the appropriate state based on the backend response — success or a specific failure
5. Never expose nurse PII, raw license numbers, internal IDs, or payment data

---

### Route

The token is a URL path parameter:

```
/v/:token
```

Example URL: `https://enroll.passtodigital.com/v/a3f9b2c1...`

Extract the token from the URL path on page load. Do not request it from the user.

---

### Page Load

On page load, show the verifier form immediately. Do not make a backend call until the verifier submits the form.

Show the PassTo logo/wordmark in the header. Keep the page minimal.

---

### Verifier Form

Show a clean form with:

**Required fields:**

1. **Name** — text input, label "Your name", placeholder "Jane Smith"
2. **Email** — email input, label "Your email", placeholder "jane@example.com"
3. **Terms checkbox** (required):
   ```
   [ ] I agree to PassTo's Terms of Use
   ```
   "Terms of Use" must be a link to `/terms` (opens in a new tab).

**Optional field:**

4. **Marketing checkbox**:
   ```
   [ ] PassTo may contact me with occasional product updates. I can unsubscribe at any time.
   ```

**Submit button:** "View Credential" — disabled until all required fields are filled and Terms checkbox is checked.

---

### On Form Submit — Backend Call

POST to `token-verify`:

```
POST /functions/v1/token-verify
Content-Type: application/json
(no Authorization header — this is a public endpoint)
```

Request body:
```json
{
  "token": "<token from URL>",
  "verifier_name": "<name field value>",
  "verifier_email": "<email field value>",
  "terms_accepted": true,
  "marketing_consent": <true or false>
}
```

Show a loading state ("Verifying…") while the call is in flight. Disable the form. Do not allow resubmission while loading.

---

### Response States

#### ✅ State 1 — Verified (HTTP 200, `verified: true`)

Show the credential view (see below). Do not show the form again.

#### ❌ State 2 — Token expired (`error: "token_expired"`)

```
This verification link has expired.
Ask the nurse to send you a new link.
```

#### ❌ State 3 — Token already used (`error: "token_used"`)

```
This verification link has already been used.
Ask the nurse to send you a new link.
```

#### ❌ State 4 — Token not valid (`error: "token_not_found"` / `"token_wrong_type"` / `"token_revoked"` / `"token_not_active"` / `"missing_token"` / no token in URL)

```
This verification link is not valid.
```

No further explanation. Do not hint at whether a token ever existed.

#### ❌ State 5 — Credential no longer active (`error: "credential_not_shareable"`)

```
This credential is no longer active.
The nurse's credential status has changed. Contact the nurse for current information.
```

#### ❌ State 6 — License status changed (`error: "license_not_active"`)

```
The nurse's license status has changed.
Contact the nurse for current information.
```

#### ❌ State 7 — Form validation errors (HTTP 400)

Show inline field errors:
- `missing_verifier_name` → "Please enter your name."
- `invalid_verifier_email` → "Please enter a valid email address."
- `terms_not_accepted` → "You must accept the Terms of Use to continue."

#### ❌ State 8 — Backend error (`error: "backend_read_error"` / HTTP 503 / network error)

```
Something went wrong. Please try again.
```

Show a "Try Again" button that re-enables the form.

---

### Credential View (State 1 — Success)

Show after `verified: true` response. Do not show the form.

**Header:**
```
Credential Verified
```
In Verified-400 green (`#2FB069`).

**Credential card:**

Show these fields from the response (only if not null):

| Label | Field |
|---|---|
| License Type | `license.type` (e.g., `RN`) |
| State | `license.state` (e.g., `TX`) |
| License Status | `license.normalized_status` (e.g., `Active`) — shown in Verified-400 green |
| License Expires | `license.expiration_date` (formatted month/year) |
| Credential Status | `credential.status` (e.g., `Active`) |
| Credential Issued | `credential.issued_at` (formatted month/year) |
| Status As Of | `license.current_as_of` (formatted as full date and time) |

**Do not show:**
- Nurse name
- Raw license number
- Any internal IDs
- Subscription or payment information
- Wallet pass links
- Raw API response data

**Disclaimer** (always shown, below the card):
```
This verification reflects information available to PassTo as of [license.current_as_of].
Licensing status may change. For official status, consult the applicable licensing authority.
```

Replace `[license.current_as_of]` with the formatted date/time from the response.

---

### Design

**Colors (PassTo design system):**
- Page background: `#FAF8F4` (Paper-050)
- Card body / primary text: `#0B1220` (Ink-900)
- Verified / green: `#2FB069` (Verified-400)
- Green text on light: `#14753F` (Verified-600)
- Error states: `#B42318` (Red-600)

**Fonts:**
- Display: Inter
- Body: Public Sans
- Credential detail values: IBM Plex Mono

**Layout:**
- Centered single-column, max-width ~480px
- PassTo logo/wordmark at top
- Keep it minimal and trustworthy — this is an operational view, not a marketing page
- Mobile-first; must be readable on a phone

---

### Do Not Implement

- Any direct Supabase database read or write from this page
- Any authentication or PassTo account requirement
- Show QR
- PDF export
- Employer dashboard
- Verifier account creation
- Any logic that reads or writes `verification_tokens`, `verifiers`, `verification_events`, `credentials`, or `licenses` directly from Lovable
- Repeated automatic resubmission (submit once; show Try Again for errors only)

---

### Refresh Behavior

If the verifier refreshes after seeing the credential view, the form shows again. On resubmission the backend will return `token_used`. Show State 3 ("already been used"). Do not attempt to cache or replay the successful response.
