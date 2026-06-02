# Lovable Prompt — TASK-0052 Success / PassReady Credential Status Flow

**Created:** 2026-06-02  
**Owner:** Claude  
**Related Task:** TASK-0052  
**Related Docs:** `docs/architecture/WALLET_SIGNING_CONTRACT.md`

---

## Prompt To Paste Into Lovable

Update the PassTo `/success` page for Phase 4 credential and wallet issuance. Do not touch any other routes.

---

### What This Page Does

`/success` is a **status surface**. It shows the nurse what happened with their credential and wallet passes. It does not generate certificates, sign wallet passes, or make trust decisions. All of that happens in the backend.

The page must:
1. Call the backend to trigger credential creation and wallet issuance if not already done
2. Show the correct state based on what the backend reports
3. Never pretend a wallet pass is ready when the backend says it is not

---

### On Page Load — Backend Call Sequence

**Step 1:** Call `success-status` (GET, requires auth):

```
GET /functions/v1/success-status
Authorization: Bearer <supabase session token>
```

This returns the current credential and wallet state. Use the response to decide what to show and whether more calls are needed.

**Step 2:** Based on the response:

| `credential_status` | `wallet.any_issued` | Action |
|---|---|---|
| `"none"` | — | Call `credential-create` POST, then `wallet-issue` POST (see below) |
| `"pending"` | `false` | Call `wallet-issue` POST |
| `"active"` | `true` | Show success — no further calls needed |
| `"active"` | `false` | Show "credential ready, wallet pending" — no retry unless nurse taps retry |
| `"suspended"` / `"revoked"` / `"expired"` | — | Show support state |

**Step 3 — `credential-create`** (POST, requires auth):

```
POST /functions/v1/credential-create
Authorization: Bearer <supabase session token>
Content-Type: application/json
(empty body)
```

On success (`credential_id` returned) → immediately call `wallet-issue`.

**Step 4 — `wallet-issue`** (POST, requires auth):

```
POST /functions/v1/wallet-issue
Authorization: Bearer <supabase session token>
Content-Type: application/json
(empty body)
```

`wallet-issue` may take up to 30 seconds. Show a loading state while it runs.

**Step 5 — Re-call `success-status` after wallet-issue** to get updated wallet URLs.

**Important:** Do not navigate to `/success` or show wallet buttons from Stripe return URL alone. Always confirm via `success-status` before showing wallet actions.

---

### States to Show

#### State 1 — Wallet Issued (Both or One Provider)

Show when `wallet.any_issued = true`.

**Heading:**
```
Your credential is ready
```

**Supporting copy:**
```
Your nursing license has been verified and your digital credential is active.
```

**Show Apple Wallet button** if `wallet.apple.status = "issued"` AND `wallet.apple.pass_url` is not null:
- Label: `Add to Apple Wallet`
- Action: open `wallet.apple.pass_url` in a new tab
- Use official Apple Wallet badge styling

**Show Google Wallet button** if `wallet.google.status = "issued"` AND `wallet.google.save_url` is not null:
- Label: `Add to Google Wallet`
- Action: open `wallet.google.save_url` in a new tab
- Use official Google Wallet badge styling

**Show email backup copy** below the wallet buttons:
```
We also sent wallet links to your email as a backup.
```

**Show credential summary card** (read-only):
- License type and state (e.g. `RN — Texas`)
- Status: `Active` (in Verified-400 green `#2FB069`)
- Expires: month/year from `credential_expires_at` if available

Do not show the raw license number on this page.

---

#### State 2 — Credential Ready, Wallet Preparing

Show when `credential_status = "active"` AND `wallet.any_issued = false`.

**Heading:**
```
Your credential is verified
```

**Supporting copy:**
```
Your digital wallet passes are being prepared. This usually takes a moment — check back soon or refresh this page.
```

Show a **Refresh** button. On tap, re-call `success-status`.

Do not show wallet action buttons. Do not show Apple/Google badges.

If Apple and Google both show `status = "error"`:
```
We had trouble preparing your wallet passes. Our team has been notified and will follow up by email. Your credential is still verified.
```
Add a support link or email address.

---

#### State 3 — Loading / Credential Being Created

Show when `credential-create` or `wallet-issue` is in progress.

**Heading:**
```
Setting up your credential…
```

Show a spinner or loading animation. No wallet buttons. No credential summary.

---

#### State 4 — Credential Not Ready / Blocked

Show when `success-status` returns `403` or `credential_status = "none"` after `credential-create` also fails.

**Heading:**
```
Something went wrong
```

**Copy:**
```
We weren't able to complete your credential right now. Please contact support and we'll get this sorted out quickly.
```

Add a support contact link.

---

#### State 5 — Credential Suspended / Revoked / Expired

Show when `credential_status` is `"suspended"`, `"revoked"`, or `"expired"`.

**Heading:**
```
Your credential is no longer active
```

**Copy:**
```
Your credential status has changed. Please contact support for help.
```

---

### Route Guard

On page load, call `success-status` immediately. If the response is:
- `403 onboarding_not_complete` with `onboarding_step` not in `["pass", "complete"]` → redirect the nurse to the correct step
- `401 unauthorized` → redirect to sign-in

Do not show any credential or wallet content before `success-status` responds.

---

### Do Not Show on This Page

- "Add another license" — out of scope for this Phase 4 surface
- Share-link or verify button — out of scope
- Show QR — out of scope
- PDF export — out of scope
- Subscription or billing details
- Raw license number
- Internal credential IDs

---

### Progress Indicator

Mark the final step (`Done`) as complete when `credential_status = "active"`.

If still pending, keep the final step as in-progress (spinner or partial fill) rather than showing a checkmark.

---

### Error Handling

| Error | What to Show |
|---|---|
| `credential-create` returns `403 license_not_active` | "Your license status has changed. Please contact support." |
| `credential-create` returns `403 subscription_not_confirmed` | "Your payment hasn't been confirmed yet. Wait a moment and refresh." |
| `credential-create` returns `409` or `already_existed: true` | Continue to `wallet-issue` — not an error |
| `wallet-issue` returns with both providers `error` | Show State 2 error variant above |
| Any network error | "Something went wrong. Please refresh or contact support." |

---

### `/pass-ready` Redirect

David approved: `/pass-ready` redirects to `/success`.

In `App.tsx` (or wherever routes are defined), add:

```
/pass-ready → redirect to /success (301 or equivalent client-side redirect)
```

The `/pass-ready` route should not render any content of its own — it redirects immediately.

---

### Do Not Implement

- Any logic that marks credential or wallet complete from client-side state alone
- Any direct Supabase database writes from Lovable
- Any Stripe return URL as proof of payment
- Wallet signing or certificate handling in Lovable
