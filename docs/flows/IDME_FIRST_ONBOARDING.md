# PassTo ID.me-First Onboarding Flow

**Status:** Approved and Implemented — TASK-0048  
**Owner:** Codex / Claude  
**Created:** 2026-05-31  
**Updated:** 2026-06-02  
**Applies To:** MVP nurse enrollment flow  

---

## Purpose

This document defines the proposed ID.me-first onboarding workflow for the PassTo MVP nurse enrollment experience.

The goal is to make onboarding feel like a credential issuance journey rather than a generic account signup form:

```text
Verify who I am
        ↓
Enter my license
        ↓
Confirm PassTo found and matched it
        ↓
Choose how I want to use the credential
        ↓
Finish payment/photo
        ↓
Get my digital credential
```

This document does not approve implementation, production deployment, Supabase migrations, ID.me configuration changes, Stripe changes, or Lovable publishing by itself.

---

## Product Rationale

Starting with ID.me reduces friction from password-first account creation and better matches the nurse's mental model.

The nurse is not trying to "create an account." The nurse is trying to prove identity, prove license ownership, and receive a digital nursing credential.

The first screen should therefore position the workflow as:

```text
Get your digital nursing credential.
Verify your identity with ID.me, then we will match it to your nursing license.
```

Primary CTA:

```text
Continue with ID.me
```

---

## Route Sequence (Implemented — TASK-0048; Lovable UI Updated 2026-06-02)

```text
/id-verification
        ↓
/license-info
        ↓
/license-checking   (search fallback only — skipped when license number provided)
        ↓
/confirm-info       (review info, confirm phone, complete SMS OTP inline)
        ↓
/account-select
        ↓
/payment
        ↓
/upload-selfie
        ↓
/success
```

License lookup and identity binding happen **before** `/confirm-info`. The nurse sees matched identity, license, and contact data on `/confirm-info`, confirms the phone number to use, receives the Twilio OTP from that same page, and enters the OTP inline. The backend still advances through separate `confirm` and `phone` trust states; the Lovable UI combines them into one visible page.

### Route Responsibilities

| Route | `onboarding_step` | Purpose | Backend Responsibility |
|---|---|---|---|
| `/id-verification` | `identity` | Start ID.me before account/password creation. | Create or resume an onboarding attempt; exchange ID.me result server-side; store verified identity fields. |
| `/license-info` | `license` | Collect license number (optional), state, and type. Start lookup. | `license-lookup-start`: POST /verify (fast path) or POST /search (name fallback); bind to ID.me identity via RPC. |
| `/license-checking` | `license_checking` | Show candidates when search returns multiple results. Nurse selects. | `license-lookup-status` (GET candidates); `license-lookup-select` (POST selection → POST /verify → bind). Entered only on multi-candidate search result. |
| `/confirm-info` | `confirm` → `phone` | Show matched identity + license + contact info; nurse confirms phone; same page sends and verifies Twilio OTP inline. | `confirm-info-status` (GET display payload); `confirm-info-complete` (POST phone intent → advance to `phone`); then `phone-send-otp` and `phone-verify-otp`; write verified phone only after Twilio success. |
| `/phone-check` | `phone` | Backend state / legacy route only. Lovable should not show it as a separate breadcrumb step in the current UX. | If retained as a direct URL fallback, use the same `phone-send-otp` and `phone-verify-otp` gates. |
| `/account-select` | `plan` | Choose Free, Standard, or Premier. | `account-select-status`, `plan-select`; subscription_tier records intent only, not confirmed entitlement. |
| `/payment` | `payment` | Complete payment for paid plans only. | `stripe-checkout-create`; webhook confirms final payment/subscription state. |
| `/upload-selfie` | `selfie` | Optional pass photo. | `selfie-status`; backend confirmation required after upload. |
| `/success` | `pass` / `complete` | Show credential and wallet status. | `success-status`; read-only status surface. |

### `license_checking` Step Semantics

`license_checking` is entered **only** when:
- The nurse did not supply a license number, AND
- RapidAPI `/search` returned multiple candidates requiring selection.

It is NOT entered for:
- The `/verify` fast path (resolves synchronously, advances directly to `confirm`).
- Search that returns zero results (nurse stays at `license` for retry).
- Search that returns exactly one result (resolved via `/verify` then advances to `confirm`).

### Combined Confirm + OTP UX on `/confirm-info`

`confirm-info-status` returns `contact.phone` from `profiles.phone` (if set by a prior ID.me session or manual entry). This phone may prefill the `/confirm-info` input field in Lovable.

Phone prefill does NOT skip Twilio OTP. When the nurse clicks Confirm:

1. Lovable calls `confirm-info-complete`.
2. The backend records phone intent only and advances `onboarding_step` from `confirm` to `phone`.
3. Lovable immediately calls `phone-send-otp` from the same `/confirm-info` page.
4. The same page switches to OTP entry state.
5. Lovable calls `phone-verify-otp`.
6. On OTP success, Lovable routes to `/account-select`.

The Confirm click alone must not route to `/account-select`. OTP success is the gate.

### Breadcrumb Rules

The top breadcrumb/progress indicator should show one combined confirmation step for this portion of onboarding, such as `Confirm Info`, not separate visible `Confirm Info` and `Phone Verification` steps.

`Payment` and `Photo` should appear only when the current selected plan flow requires them. Free/basic flows should not show skipped paid/photo steps as upcoming breadcrumb items.

---

## ID.me Result Handling

ID.me may return or allow PassTo to derive:

```text
first_name
last_name
email
phone
id_me_subject
id_verification_level
```

Rules:

- ID.me secrets remain server-side.
- Lovable must not exchange ID.me tokens directly.
- Lovable must not make trust decisions from ID.me responses.
- Email and phone returned by ID.me may prefill `/confirm-info`.
- Phone returned by ID.me does not replace Twilio possession verification.
- Temporary identity fields used for matching should not be exposed to the client beyond safe confirmation fields.

---

## Account Creation / Linking Model

The ID.me-first flow requires a safe pre-account onboarding attempt.

Recommended backend model:

```text
onboarding_attempt created before or during ID.me start
        ↓
ID.me callback validates state and PKCE
        ↓
backend stores verified identity result against attempt
        ↓
nurse confirms contact info
        ↓
backend creates or links Supabase Auth user/profile
        ↓
profile proceeds through license, phone, plan, payment, selfie, success
```

If the schema does not support `onboarding_attempts`, Claude should propose the smallest safe equivalent before implementation.

Security requirements:

- ID.me state/PKCE must be validated server-side.
- ID.me subject must not be linkable to multiple active profiles unless an approved account recovery/linking rule exists.
- Existing account detection must not leak whether an email belongs to another user.
- Service-role writes must stay in Edge Functions or trusted backend routes.

---

## License Binding Point

The ID.me identity and license lookup result should be bound immediately after `/license-info`, before plan selection or payment.

This is the moment PassTo proves product value:

```text
Identity verified
License found
License belongs to this nurse
Credential can be created after remaining gates
```

If license lookup fails or data matching fails:

- Do not ask for payment.
- Do not create an active credential.
- Show retry/support state.
- Write audit/failure events.

---

## Phone Verification Placement

Phone verification should be its own visible state on `/confirm-info`, immediately after the nurse confirms matched identity/license/contact information.

Do not hide SMS verification inside `/account-select`. Phone verification is a trust/security gate, not a plan-selection action. The backend `phone` state remains separate even though Lovable shows the OTP form on the same `/confirm-info` page.

Rules:

- Prefill phone from ID.me only if available.
- Allow nurse to correct phone before OTP send.
- Clicking Confirm triggers OTP send but does not mark phone verified.
- Twilio success is required before writing `profiles.phone` as verified.
- Route to `/account-select` only after `phone-verify-otp` succeeds.
- If SMS cannot be delivered, show retry/support state.

---

## Plan / Payment Placement

Plan selection should occur after identity/license value has been demonstrated.

Rules:

- Free should be the default safe path.
- Paid plan selection should route to `/payment`.
- Free plan should skip `/payment`.
- Payment success must be confirmed server-side, not trusted from client navigation.
- Pricing and plan names must match `/docs/flows/PAYMENTS.md` and tier feature docs.

---

## Success State

The final route should be `/success`, replacing or superseding the older `/pass-ready` naming in new UX work.

The page should show:

- Credential status.
- Wallet pass readiness.
- Apple Wallet and Google Wallet actions when available.
- Email backup message if wallet links were also sent by email.
- Add another license only when the selected plan allows it.
- Clear support path if wallet issuance is delayed.

---

## Open Decisions

- Whether `/upload-selfie` is optional or required for launch credential issuance (David decision pending — TASK-0047).
- Whether `/success` fully replaces `/pass-ready` or aliases it during migration (David decision pending — TASK-0047).
- Whether the "I don't have my license number" search fallback should be hidden for license types where RapidAPI /search coverage is unconfirmed.
- Retry limit enforcement server-side: current implementation caps at 3 lookup attempts per onboarding session via `license_lookups` row count. David should confirm if different.
- Exact support copy for ID.me/license mismatch and name mismatch cases.
- LVN / CN alias map: RapidAPI may return these types; current MVP uses exact uppercase match only. David approval required before launch if LVN/CN coverage is needed.

## Resolved Decisions

- ID.me-verified phone may prefill `/confirm-info`, but it does not skip Twilio OTP.
- Lovable may combine info confirmation and OTP send/verify on the visible `/confirm-info` page.
- Backend trust states remain separate: `confirm-info-complete` advances to `phone`; `phone-send-otp` sends the code; `phone-verify-otp` verifies possession and advances to `plan`.

## Implementation Notes (TASK-0048, 2026-06-02)

Route sequence and backend gate chain implemented. See TASK-0048 for full implementation detail.

**Migration J** (applied 2026-06-02): extends `license_lookups`, adds `license_checking`/`confirm` to `onboarding_step` CHECK constraint, updates `complete_license_verification()` RPC to advance to `confirm` instead of `phone`.

**New Edge Functions** (deployed 2026-06-02): `license-lookup-start`, `license-lookup-status`, `license-lookup-select`, `confirm-info-status`, `confirm-info-complete`.

**Existing functions unchanged**: `phone-send-otp`, `phone-verify-otp`, `account-select-status`, `plan-select`, `payment-status`, `selfie-status`, `success-status`.

---

## Related Docs

```text
/docs/flows/ACCOUNT_CREATION.md
/docs/flows/ID_VERIFICATION.md
/docs/flows/LICENSE_LOOKUP.md
/docs/flows/PAYMENTS.md
/docs/prd/PRD_SECTION_03_USER_JOURNEYS.md
/docs/tasks/TASK-0045.md
/docs/tasks/TASK-0046.md
/docs/tasks/TASK-0047.md
```
