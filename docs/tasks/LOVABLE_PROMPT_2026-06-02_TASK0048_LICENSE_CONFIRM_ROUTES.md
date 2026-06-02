# Lovable Prompt — TASK-0048 License Lookup and Confirm-Info Routes

**Created:** 2026-06-02  
**Owner:** Claude  
**Related Task:** TASK-0048  
**Related Docs:** `/docs/flows/IDME_FIRST_ONBOARDING.md`

---

## Prompt To Paste Into Lovable

Update the PassTo enrollment app for the following three route changes. Do not touch any other routes.

---

### 1 — Update `/license-info`

The route already exists. Make these changes only:

**Make license number optional.**

Change the license number field from required to optional. Add helper text directly below the field:

```
Don't have your license number? Leave it blank and we'll search by name.
```

**Update the CTA label** from whatever it currently says to:

```
Find My License
```

**Update the loading state** shown after submit to:

```
Looking up your license…
```

**Wire to the backend.** On submit, call the Supabase Edge Function `license-lookup-start` (POST, requires auth):

Request body:
```json
{
  "license_state": "<state value>",
  "license_type": "<type value>",
  "license_number": "<number value or omit if blank>"
}
```

Handle these response shapes:

| Response | What to do |
|---|---|
| `{ "result": "needs_selection", "candidates": [...], "lookup_id": "..." }` | Navigate to `/license-checking`, pass `candidates` and `lookup_id` |
| `{ "success": true, "next_step": "confirm" }` | Navigate to `/confirm-info` |
| `{ "success": false, "message_code": "license_not_found" }` | Show inline: `We couldn't find a license matching those details. Check your state, type, and number, then try again.` |
| `{ "success": false, "message_code": "license_not_active" }` | Show inline: `Your license was found but is not currently active. Contact support if you believe this is an error.` |
| `{ "success": false, "message_code": "identity_license_mismatch" }` | Show inline: `The license details don't match your verified identity. Contact support for help.` |
| `{ "success": false, "message_code": "license_status_unavailable" }` | Show inline: `We weren't able to confirm your license status right now. Try again or contact support.` |
| `{ "success": false, "message_code": "license_type_mismatch" }` | Show inline: `The license type returned doesn't match what you selected. Check your details and try again.` |
| `{ "error": "max_attempts_reached" }` | Show: `You've reached the maximum number of lookup attempts. Please contact support.` Disable retry. |
| `{ "error": "source_unavailable" }` or network error | Show: `Our license source is temporarily unavailable. Please try again in a moment.` |

Do not navigate to `/confirm-info` or any other route unless the backend explicitly returns `next_step: "confirm"`.

---

### 2 — Create `/license-checking` (new page)

This page is only reached when the license number was omitted and the backend found multiple candidates. It lets the nurse identify and select their own record.

**Heading:**
```
We found a few matches
Select your license record to continue.
```

**Supporting copy:**
```
We searched by your name. Select the record that belongs to you.
```

**On page load**, call `license-lookup-status` (GET, requires auth). Response:
```json
{
  "result": "needs_selection",
  "candidates": [
    { "license_number": "751234", "license_type": "RN", "holder_name": "JANE A SMITH" },
    ...
  ],
  "lookup_id": "<uuid>"
}
```

If the call fails or returns no candidates, show:
```
Something went wrong retrieving your options. Go back and try again.
```
with a `Back` button to `/license-info`.

**Render each candidate as a selectable card** showing:
- Holder name
- License type
- License number (last 4 digits only for display, e.g. `···1234`)

Do not expose the full license number in the UI list.

**On selection**, call `license-lookup-select` (POST, requires auth):

Request body:
```json
{
  "lookup_id": "<lookup_id from status response>",
  "license_number": "<full license_number from selected candidate>"
}
```

Show loading state: `Verifying your selection…`

Handle responses:

| Response | What to do |
|---|---|
| `{ "success": true, "next_step": "confirm" }` | Navigate to `/confirm-info` |
| `{ "success": false, "message_code": "identity_license_mismatch" }` | Show: `This license record doesn't match your verified identity. Select a different record or contact support.` Let nurse try another candidate. |
| `{ "success": false, "message_code": "license_not_active" }` | Show: `This license is not currently active. Select a different record or contact support.` |
| `{ "error": "invalid_candidate_selection" }` | Show: `That selection is no longer valid. Go back and try again.` with `Back` to `/license-info`. |
| Network error | Show: `Something went wrong. Please try again.` |

**None found / wrong record link:**
```
None of these look right? Go back and enter your license number manually.
```
Link navigates to `/license-info`.

**Route guard:** If `onboarding_step` is not `license_checking`, redirect to the correct step's route.

---

### 3 — Update `/confirm-info`

The route already exists but currently shows fields from ID.me (name, email). Replace its content entirely with the new confirm-info design. This page now shows the matched license result and collects the phone number for OTP.

**On page load**, call `confirm-info-status` (GET, requires auth). Response:
```json
{
  "id_me_verified_name": { "first_name": "Jane", "last_name": "Smith" },
  "license": {
    "license_number": "751234",
    "license_state": "TX",
    "license_type": "RN",
    "holder_name": "JANE A SMITH",
    "normalized_status": "Active",
    "expiration_date": "2026-08-31"
  },
  "contact": {
    "email": "jane@example.com",
    "phone": "+15551234567",
    "phone_source": "id_me"
  },
  "phone_note": "You'll verify phone ownership via SMS on the next step."
}
```

**Layout — two sections:**

**Section 1 — Your verified identity and license**

Show as a read-only summary card. Label it:
```
Verified by ID.me and matched to your license
```

Display:
- Name: `{first_name} {last_name}` (from `id_me_verified_name`)
- License: `{license_type} — {license_state}` (e.g. `RN — TX`)
- License status: `{normalized_status}` — show in Verified-400 green (`#2FB069`) when Active
- Expires: `{expiration_date}` formatted as month/year (e.g. `Aug 2026`) — omit if null
- License holder: `{holder_name}` in smaller secondary text

Do not show the raw license number on this page.

**Section 2 — Phone for verification**

Heading:
```
Where should we send your verification code?
```

- Phone input field, prefilled with `contact.phone` if available
- If `phone_source` is `id_me`, show helper text below the field:
  ```
  This number came from ID.me. You can change it before continuing.
  ```
- If no phone prefill, leave field empty
- Show `phone_note` below the input as secondary text:
  ```
  You'll verify phone ownership via SMS on the next step.
  ```

**CTA:** `Continue`

**On submit**, call `confirm-info-complete` (POST, requires auth):

Request body:
```json
{ "confirmed_phone": "+15551234567" }
```

Phone must be in E.164 format. Validate format client-side before submitting. If invalid, show:
```
Please enter a valid phone number including country code (e.g. +1 555 123 4567).
```

Handle responses:

| Response | What to do |
|---|---|
| `{ "success": true, "next_step": "phone", "phone_intent": "..." }` | Store `phone_intent` in component state for prefill on `/phone-check`. Navigate to `/phone-check`. |
| `{ "error": "invalid_phone" }` | Show inline: `Please enter a valid phone number.` |
| `{ "error": "invalid_step_conflict" }` | Show: `Something went wrong. Please refresh and try again.` |
| Network error | Show: `Something went wrong. Please try again.` |

**Route guard:** If `onboarding_step` is not `confirm`, redirect to the correct step's route. If `confirm-info-status` returns 403 (license not verified), redirect to `/license-info`.

---

### 4 — Update `/phone-check`

No layout changes needed. One wiring update only:

Prefill the phone input with the `phone_intent` value carried from `/confirm-info` if available. If not available (e.g. direct navigation), leave the field empty.

---

### 5 — Update the progress indicator

The route sequence has changed. Update the progress steps to:

```
Identity → License → Confirm → Phone → Plan → (Payment) → Photo → Done
```

`/license-checking` is part of the License step — do not add it as a separate progress item.

---

### Do Not Change

- `/id-verification` — no changes
- `/phone-check` — phone prefill only (above)
- `/account-select`, `/payment`, `/upload-selfie`, `/success` — no changes
- Any auth, callback, or backend function logic not listed above
- PassTo visual style, colors, or fonts

---

### Forbidden Client Behaviors

- Do not write `onboarding_step` directly from Lovable
- Do not navigate to `/confirm-info` without a backend `next_step: "confirm"` response
- Do not navigate to `/phone-check` without a backend `next_step: "phone"` response
- Do not store license numbers, ID.me tokens, or provider payloads in client state beyond what is needed for the current page render
- Do not expose full license numbers in the candidate selection list
