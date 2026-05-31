# PassTo ID.me-First Onboarding Flow

**Status:** Proposed Baseline - Awaiting David Approval  
**Owner:** Codex  
**Created:** 2026-05-31  
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

## Proposed Route Sequence

```text
/id-verification
        ↓
/confirm-info
        ↓
/license-info
        ↓
/phone-check
        ↓
/account-select
        ↓
/payment
        ↓
/upload-selfie
        ↓
/success
```

### Route Responsibilities

| Route | Purpose | Backend Responsibility |
|---|---|---|
| `/id-verification` | Start ID.me before account/password creation. | Create or resume an onboarding attempt; exchange ID.me result server-side; store temporary verified identity fields. |
| `/confirm-info` | Let nurse confirm first name, last name, email, and phone returned by ID.me where available. | Create or link Supabase Auth/profile state safely; do not trust unverified phone as possession proof. |
| `/license-info` | Collect license number, license state, and license type. | Run license lookup and bind lookup result to verified ID.me identity through backend data matching. |
| `/phone-check` | Verify phone possession with SMS. | Send and verify Twilio OTP; write verified phone only after Twilio success. |
| `/account-select` | Choose Free, Standard, or Premier after PassTo has demonstrated value. | Display server-derived plan options and entitlement implications. |
| `/payment` | Complete payment only for paid plans. | Create Stripe checkout/payment flow; webhook confirms final payment/subscription state. |
| `/upload-selfie` | Optional or required pass photo, depending on final launch scope. | Store selfie in protected Supabase Storage or skip if optional. |
| `/success` | Show success state and next actions. | Show credential/pass status; provide wallet links when ready; offer add-another-license only when plan allows. |

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

Phone verification should be its own route: `/phone-check`.

Do not hide SMS verification inside `/account-select`. Phone verification is a trust/security gate, not a plan-selection action.

Rules:

- Prefill phone from ID.me only if available.
- Allow nurse to correct phone before OTP send.
- Twilio success is required before writing `profiles.phone` as verified.
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

- Whether `/upload-selfie` is optional or required for launch credential issuance.
- Whether `onboarding_attempts` should be a new table or represented through an existing safe temporary state.
- Exact account creation/linking method after ID.me-first callback.
- Exact support copy for ID.me/license mismatch.
- Whether `/success` fully replaces `/pass-ready` or aliases it during migration.

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
