# PassTo Account Creation Flow

**Status:** Baseline - Superseded for proposed MVP enrollment by ID.me-first flow  
**Owner:** Codex  
**Last Updated:** 2026-05-31  

---

## Purpose

This document defines the MVP account creation flow for a nurse creating a PassTo account.

Account creation was the original entry point into identity verification, license lookup, tier selection, and credential/pass creation.

As of the proposed 2026-05-31 onboarding revision, MVP nurse enrollment should move toward an ID.me-first entry point documented in:

```text
/docs/flows/IDME_FIRST_ONBOARDING.md
```

Under that proposed flow, account creation/profile linking happens after ID.me returns safe identity/contact fields and the nurse confirms them.

This flow is a product/architecture baseline and does not approve implementation or production deployment.

---

## MVP Scope

PassTo MVP account creation is for individual nurses.

MVP does not include:

- Organization accounts
- Employer/facility admin accounts
- Multi-user organization memberships
- Verifier accounts

Verifiers do not create accounts in MVP. They access credential views through short-lived one-time verification tokens.

---

## Primary Actor

```text
Nurse
```

---

## Entry Points

Likely entry points:

```text
Marketing landing page
Sign up page
Upgrade/account creation CTA
Shared/verifier-driven nurse acquisition CTA, if later approved
```

---

## High-Level Flow

```text
Original account-first flow:

```text
Nurse starts sign-up
        ↓
Creates authenticated account
        ↓
Provides basic profile information
        ↓
Accepts Terms of Use / required policies
        ↓
Completes ID verification flow, where required
        ↓
Provides license lookup inputs
        ↓
PassTo performs license lookup
        ↓
System creates profile/license/credential records if eligible
        ↓
Nurse lands on dashboard
        ↓
Nurse may add wallet pass, share, refresh, export PDF, or upgrade based on tier
```

Proposed ID.me-first enrollment flow:

```text
Nurse starts ID.me verification
        ↓
PassTo receives verified identity/contact fields
        ↓
Nurse confirms first name, last name, email, and phone
        ↓
PassTo creates or links authenticated account/profile
        ↓
Nurse enters license info
        ↓
PassTo performs license lookup and data match
        ↓
Nurse verifies phone possession
        ↓
Nurse chooses plan and pays only if needed
        ↓
Nurse adds selfie if required/desired
        ↓
Nurse reaches success/wallet state
```

---

## Required Account Data

MVP account creation should collect only what is necessary for account setup, identity/license workflow, payments, and service delivery.

Likely account/profile fields:

```text
email
first_name
last_name
account_status
current_tier
terms_accepted_at
created_at
updated_at
```

In the proposed ID.me-first flow, `first_name`, `last_name`, `email`, and `phone` may be returned or prefilled from ID.me. The nurse should still confirm contact data, and phone must still pass Twilio possession verification before being treated as verified.

---

## Authentication

Supabase Auth is the expected auth boundary unless later changed.

Rules:

- Nurse accounts must be authenticated.
- Nurse can access only their own account data.
- Service-role operations must remain server-side.
- Verifier access is token-based and does not create auth accounts in MVP.

---

## Terms / Consent

Account creation should require acceptance of PassTo Terms of Use.

Terms of Use still requires final drafting.

Optional marketing consent should be separate from required Terms acceptance where used.

---

## Account Status

Recommended statuses:

```text
active
deactivated
deleted
suspended
```

MVP account deletion uses soft delete/deactivation.

Operational, audit, payment, and verification records are retained for 7 years unless legal counsel later changes this.

---

## Success State

A successful account creation flow results in:

- Authenticated nurse account.
- `profiles` record.
- Terms acceptance recorded.
- Nurse routed to license info, phone verification, plan selection, payment, selfie, or success depending on the ID.me-first onboarding state.
- Nurse routed to dashboard if required onboarding is complete.

---

## Failure / Edge Cases

Handle:

- Email already exists.
- Auth failure.
- Terms not accepted.
- ID verification failure.
- License lookup failure.
- Source status unknown.
- Payment or subscription setup failure where relevant.

Raw source `unknown` in license lookup is a verification failure and should not issue or update a credential as valid.

---

## Data Records

Recommended tables touched by or near this flow:

```text
profiles
licenses
credentials
subscriptions
payments
audit_events
```

---

## Related Docs

```text
/docs/flows/ID_VERIFICATION.md
/docs/flows/LICENSE_LOOKUP.md
/docs/flows/PAYMENTS.md
/docs/features/ACCOUNT_MANAGEMENT.md
/docs/features/TIER_FEATURES.md
/docs/architecture/SYSTEM_ARCHITECTURE.md
/docs/architecture/SECURITY_MODEL.md
/docs/architecture/DATA_MODEL.md
```

---

## Open Items

- Final account creation/linking screen sequence for ID.me-first onboarding.
- Final Terms of Use language.
- Exact auth provider configuration.
- Whether `/success` fully replaces `/pass-ready` or both are supported during migration.
