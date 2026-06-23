# Lovable Prompt — TASK-0055 Nurse Dashboard Launch-Critical Status View

**Created:** 2026-06-02
**Owner:** Claude
**Related Task:** TASK-0055
**Related Docs:** `docs/design_system/README.md`

---

## Prompt To Paste Into Lovable

Update the PassTo `/dashboard` page. Do not touch any other routes.

---

### What This Page Does

`/dashboard` is the nurse's **post-enrollment status surface**. It shows credential, license, wallet pass, and subscription state. It does not issue credentials, sign wallet passes, or make trust decisions — all of that happens in the backend.

The dashboard must:
1. Call the backend on load to get current state
2. Show the correct status for each section based on what the backend reports
3. Never mark anything as ready when the backend says it is not
4. Hide all deferred features — they must not appear as launch blockers

---

### On Page Load — Backend Call

Call `dashboard-status` (GET, requires auth):

```
GET /functions/v1/dashboard-status
Authorization: Bearer <supabase session token>
```

Show a loading state while the call is in flight. Do not render any status section before the response arrives.

---

### Route Guard

Based on the `dashboard-status` response:

| Response | Action |
|---|---|
| `401 unauthorized` | Redirect to sign-in |
| `403 account_not_active` | Show "Your account is not active. Please contact support." |
| `403 onboarding_not_complete` with `onboarding_step` | Redirect the nurse to the correct onboarding step (use the same step-to-route logic as the rest of the onboarding flow) |
| `404 profile_not_found` | Redirect to sign-in |
| `503 backend_read_error` | Show "Something went wrong. Please refresh or contact support." |
| `200` | Render the dashboard normally |

Do not show any dashboard content before `dashboard-status` responds.

---

### Page Layout

Use a clean status card layout. This is an **operational status page**, not a marketing page.

**Colors (PassTo design system):**
- Page background: `#FAF8F4` (Paper-050)
- Card body / primary text: `#0B1220` (Ink-900)
- Active / verified / green accent: `#2FB069` (Verified-400)
- Darker green for text on light background: `#14753F` (Verified-600)
- Expiring / caution: `#C8830C` (Amber-500)
- Revoked / expired / error: `#B42318` (Red-600)

**Fonts:**
- Display: Inter
- Body: Public Sans
- Credential details: IBM Plex Mono

**Page heading:**

```
Your Credential
```

No marketing language. No taglines.

---

### Section 1 — Credential Status Card

Show based on `credential_status`:

| `credential_status` | Heading | Color |
|---|---|---|
| `"active"` | "Credential Active" | Verified-400 green |
| `"pending"` | "Credential Pending" | Amber-500 |
| `"suspended"` | "Credential Suspended" | Red-600 |
| `"revoked"` | "Credential Revoked" | Red-600 |
| `"expired"` | "Credential Expired" | Red-600 |
| `"none"` | "Credential Not Ready" | Amber-500 |
| anything else | "Credential Status Unknown" | Amber-500 |

When `credential_status = "active"`, also show (in IBM Plex Mono):
- Issued: formatted `credential_issued_at` date (month year)
- Expires: formatted `credential_expires_at` date (month year), if not null

Do **not** show the internal credential ID.

When `credential_status` is `"suspended"`, `"revoked"`, or `"expired"`, show:
```
Please contact support for help with your credential.
```
with a support contact link.

---

### Section 2 — License Status Card

Show based on `license_normalized_status`:

| `license_normalized_status` | Display Label | Color |
|---|---|---|
| `"Active"` | "License Verified — Active" | Verified-400 green |
| `"Expired"` | "License Expired" | Red-600 |
| `"Inactive"` | "License Inactive" | Red-600 |
| `"Suspended"` | "License Suspended" | Red-600 |
| `"Revoked"` | "License Revoked" | Red-600 |
| `"Surrendered"` | "License Surrendered" | Red-600 |
| `"Pending"` | "License Pending Renewal" | Amber-500 |
| `"Unknown"` | "License Status Unknown" | Amber-500 |
| `null` | "License Not Found" | Amber-500 |

Always show (when data is available):
- License type: `license_type` (e.g. `RN`)
- State: `license_state` (e.g. `TX`)
- Current as of: formatted `license_current_as_of` timestamp, labeled "Status as of [date]"

Do **not** show the raw license number on the dashboard.

When `license_normalized_status` is anything other than `"Active"`, show:
```
Your license status has changed. If this is unexpected, contact support.
```

---

### Section 3 — Wallet Passes Card

Show based on `wallet.any_issued`, `wallet.apple.status`, `wallet.google.status`:

**Both or one provider issued** (`wallet.any_issued = true`):

Show "Wallet Passes Ready" in Verified-400 green.

Show **Add to Apple Wallet** button if `wallet.apple.status = "issued"` AND `wallet.apple.pass_url` is not null:
- Label: `Add to Apple Wallet`
- Action: open `wallet.apple.pass_url` in a new tab
- Use official Apple Wallet badge styling

Show **Add to Google Wallet** button if `wallet.google.status = "issued"` AND `wallet.google.save_url` is not null:
- Label: `Add to Google Wallet`
- Action: open `wallet.google.save_url` in a new tab
- Use official Google Wallet badge styling

**Wallet pending / not attempted** (`wallet.any_issued = false` AND no errors):

Show "Wallet Passes Preparing" in Amber-500.
```
Your wallet passes are still being prepared. Check back soon or refresh this page.
```
Show a **Refresh** button. On tap, re-call `dashboard-status`.

**Wallet error** (`wallet.apple.status = "error"` AND `wallet.google.status = "error"`):

Show "Wallet Pass Error" in Amber-500.
```
We had trouble preparing your wallet passes. Our team has been notified. Your credential is still active.
```
Show a support contact link.

Do **not** show Apple/Google wallet badges when passes are not issued.

---

### Section 4 — Subscription Card

Show based on `subscription_tier` and `subscription_status`:

| Condition | Display |
|---|---|
| `subscription_status = "active"` | Plan name from `subscription_plan_name`, labeled "Active Plan" |
| `subscription_tier = "free"` AND no active subscription | "Free Plan" |
| `subscription_tier` is a paid plan AND `subscription_status` is null | "Plan pending confirmation" in Amber-500 |
| Any other case | "Subscription status unavailable" |

Do **not** show billing details, payment dates, invoice amounts, or Stripe IDs.

---

### Section 5 — Share Credential

**Always show this section, but always disabled.**

Show a button or row labeled:
```
Share Credential — Coming Soon
```

Style it as disabled (grayed out, non-interactive). No click action.

Below it, show:
```
Shareable credential links will be available soon.
```

Do **not** call any share-link endpoint. Do **not** try to create a token. The backend's `share_link_eligible: false` confirms this is not yet available.

---

### Do Not Show on This Page

These features are deferred and must **not** appear on the dashboard as active controls or as launch blockers:

- **Show QR** — do not show a QR code or QR button
- **PDF export** — do not show a "Download PDF" or export button
- **Add another license** — do not show an add-license prompt, even if `can_add_license = true`
- **Employer dashboard** — do not show employer-facing content
- **Raw license number** — do not display the nurse's license number
- **Internal credential IDs** — do not display
- **Billing or payment history** — do not display

If any of these exist in the current dashboard UI, remove them or replace them with a non-blocking "coming soon" label at most.

---

### Error Handling

| Error | What to Show |
|---|---|
| `dashboard-status` returns `503` | "Something went wrong. Please refresh or contact support." |
| Any network error during load | "Something went wrong. Please refresh." with a Refresh button |
| Refresh on wallet pending fails | Show the same "Wallet Passes Preparing" message — do not loop indefinitely |

---

### Do Not Implement

- Any logic that marks credential, wallet, or subscription state from client-side data alone
- Any direct Supabase database writes from the dashboard
- Any share-link token creation — this is TASK-0056
- Any QR code generation
- Any PDF export
- Stripe return URL as proof of payment
- Wallet signing or certificate handling

---

### PassTo Branding Notes

- Page background: `#FAF8F4`
- Use card components with `#0B1220` body text
- Green indicators use `#2FB069`; green text on light backgrounds uses `#14753F`
- Status badges use the appropriate color per the tables above
- Keep layout minimal and scannable — nurses use this page to confirm status, not explore features
