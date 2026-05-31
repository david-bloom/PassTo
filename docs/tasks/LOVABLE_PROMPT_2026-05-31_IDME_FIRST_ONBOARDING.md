# Lovable Prompt — ID.me-First PassTo Onboarding UX

**Created:** 2026-05-31  
**Owner:** Codex  
**Purpose:** Prompt for Lovable to update the enrollment UX to the proposed ID.me-first flow.  
**Related Docs:** `/docs/flows/IDME_FIRST_ONBOARDING.md`, `TASK-0045`, `TASK-0046`, `TASK-0047`  

---

## Prompt To Paste Into Lovable

Update the PassTo enrollment app to use an ID.me-first onboarding flow.

The current app starts at `/create-account`. Replace the primary nurse enrollment journey with this route sequence:

```text
/id-verification
/confirm-info
/license-info
/phone-check
/account-select
/payment
/upload-selfie
/success
```

Keep the UI polished, calm, mobile-first, and consistent with the existing PassTo visual style. Do not create a marketing landing page. The first screen should be the actual onboarding experience.

## Product Intent

The nurse is trying to get a verified digital nursing credential, not merely create an account.

Use this framing on the first screen:

```text
Get your digital nursing credential
Verify your identity with ID.me, then we’ll match it to your nursing license.
```

Primary CTA:

```text
Continue with ID.me
```

Do not lead with password creation.

## Global UX Requirements

- Use a simple progress indicator that matches the new flow.
- Suggested progress labels:
  - Identity
  - License
  - Phone
  - Plan
  - Photo
  - Done
- Make the progress indicator work on mobile without horizontal clipping.
- Do not say "under 2 minutes." Use softer copy such as "Most nurses finish in a few minutes."
- Show clear loading, success, retry, and support states.
- Never expose backend secrets, raw tokens, or provider internals.
- Do not let the UI imply a credential is issued before backend gates pass.
- Free plan should feel like a legitimate default, not a downgrade.

## Route Details

### `/id-verification`

Purpose: Start ID.me before account creation.

Content:

- Heading: `Get your digital nursing credential`
- Supporting copy: `Verify your identity with ID.me, then we’ll match it to your nursing license.`
- Helper copy: `PassTo uses ID.me for secure identity verification. You’ll confirm your details before we continue.`
- CTA: `Continue with ID.me`

Behavior:

- CTA starts the existing backend-owned ID.me authorization flow.
- Do not perform token exchange in Lovable.
- Do not store ID.me secrets client-side.
- If ID.me is unavailable, show retry/support.

### `/confirm-info`

Purpose: Confirm safe profile/contact fields returned by ID.me where available.

Fields:

- First name
- Last name
- Email
- Phone

Copy:

```text
Confirm your details
We’ll use this information to create your PassTo profile and keep you updated about your credential.
```

Behavior:

- Prefill values from backend status if available.
- Allow nurse to edit email/phone where appropriate.
- Phone is not considered verified here.
- CTA: `Continue to License`

### `/license-info`

Purpose: Collect primary license details and trigger backend license lookup.

Fields:

- License number
- License state
- License type

Copy:

```text
Find your nursing license
Enter your license details so PassTo can verify your status with the licensing source.
```

CTA:

```text
Find My License
```

Behavior:

- Call the approved backend function for license lookup.
- Show loading state: `Checking your license...`
- If lookup and ID.me/license match pass, continue to `/phone-check`.
- If lookup fails, show a retry/support state.
- If identity/license match fails, show a calm support state and do not route to plan/payment.

Do not ask for plan or payment before license lookup and matching succeed.

### `/phone-check`

Purpose: Verify phone possession through SMS.

Copy:

```text
Verify your phone
We’ll send a short code to confirm this number belongs to you.
```

Behavior:

- Show phone number from `/confirm-info`.
- Allow edit before sending code.
- CTA before send: `Send Code`
- Code entry CTA: `Verify Code`
- On success route to `/account-select`.
- On failure show retry/support.

Do not hide SMS verification inside plan selection.

### `/account-select`

Purpose: Let the nurse choose Free, Standard, or Premier after identity/license value is proven.

Copy:

```text
Choose your PassTo plan
Your identity and license are verified. Choose how you want to use your credential.
```

Use current approved pricing from the source of truth, not stale values. If the current app has different prices than the approved docs, flag the mismatch rather than inventing new pricing.

Behavior:

- Free routes directly to `/upload-selfie` unless backend requires another gate.
- Paid plans route to `/payment`.
- Do not activate paid entitlement from client-side state alone.

### `/payment`

Purpose: Complete paid plan checkout.

Behavior:

- Show selected plan.
- Offer approved payment methods.
- Use backend/Stripe flow.
- On success route to `/upload-selfie`.
- On cancel/failure route back to `/account-select` with clear message.

### `/upload-selfie`

Purpose: Add pass photo.

Copy:

```text
Add your pass photo
A photo helps make your digital credential recognizable.
```

Behavior:

- If selfie is optional, provide `Skip for Now`.
- If selfie is required by backend launch rules, remove skip and explain requirement.
- Upload through approved storage/backend path.
- On success route to `/success`.

### `/success`

Purpose: Final success state.

Copy:

```text
You’re all set
Your credential is being prepared. Add it to your wallet when it’s ready.
```

Show:

- Credential status.
- Apple Wallet button when available.
- Google Wallet button when available.
- Email backup message if wallet links were emailed.
- Support link.
- `Add another license` only if the selected plan allows it.

If wallet issuance is delayed, show:

```text
Your credential is verified. Wallet links are still being prepared, and we’ll email you when they’re ready.
```

## Route Guarding

Add UI route guards that respect backend onboarding state:

- `/confirm-info` requires completed ID.me backend status.
- `/license-info` requires confirmed profile/contact info.
- `/phone-check` requires successful license lookup and ID.me/license match.
- `/account-select` requires phone verification.
- `/payment` requires selected paid plan.
- `/upload-selfie` requires Free plan or paid entitlement confirmed.
- `/success` requires backend success/credential readiness state.

UI route guards are only for user experience. Backend remains the source of truth.

## Existing Routes

- Keep `/auth/idme/callback`, but update it to support the backend-owned ID.me-first flow.
- Replace or alias `/pass-ready` with `/success`.
- Do not use `/create-account` as the primary first screen for new nurse enrollment.
- If `/create-account` remains for compatibility, redirect new enrollment traffic to `/id-verification`.

## Do Not Implement

- Do not create a verifier flow.
- Do not create dashboard/share-link behavior.
- Do not implement Show QR.
- Do not implement PDF export.
- Do not expose secrets.
- Do not bypass backend trust gates with client-only state.

## Expected Output

Update the Lovable app pages, routes, progress indicator, copy, loading states, error states, and navigation for the ID.me-first onboarding flow. Preserve PassTo styling and make the experience feel trustworthy, fast, and nurse-focused.
