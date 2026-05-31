# PassTo ID Verification Flow

**Status:** Baseline - Updated for proposed ID.me-first onboarding  
**Owner:** Codex  
**Last Updated:** 2026-05-31  

---

## Purpose

This document defines the MVP ID verification flow for confirming that the nurse account holder is the person associated with the PassTo credential workflow.

This flow is a baseline and does not approve implementation or vendor configuration.

---

## Primary Actor

```text
Nurse
```

---

## High-Level Flow

```text
Proposed ID.me-first flow:

```text
Nurse starts onboarding at /id-verification
        ↓
Backend creates or resumes safe onboarding attempt
        ↓
Nurse completes identity verification through ID.me
        ↓
PassTo receives verification result server-side
        ↓
System records verified identity fields against attempt/profile
        ↓
Nurse confirms safe contact/profile fields
        ↓
If verified, nurse proceeds to license info
        ↓
If failed or incomplete, nurse sees retry/support path
```

Original account-first flow:

```text
Nurse creates or accesses account
        ↓
Nurse starts ID verification
        ↓
Nurse completes identity verification through approved provider/path
        ↓
PassTo receives verification result
        ↓
System records verification status/reference
        ↓
If verified, nurse may proceed to license lookup / credential creation
        ↓
If failed or incomplete, nurse sees retry/support path
```

---

## ID Verification Goals

ID verification should help PassTo:

- Reduce fraudulent credential creation.
- Confirm the nurse account is controlled by a real person.
- Connect account workflow to license lookup and credential issuance.
- Avoid issuing credentials when identity verification is incomplete or failed.
- Prefill safe nurse profile/contact fields before account/profile linking where ID.me provides them.

---

## Status Values

Recommended ID verification statuses:

```text
not_started
pending
verified
failed
expired
manual_review
```

---

## Data Captured

PassTo should store only the verification metadata needed for product operation, support, and audit.

Recommended fields:

```text
identity_verification_status
identity_verification_provider
identity_verification_reference_id
identity_verified_at
identity_verification_failed_at
id_me_subject
id_verification_level
```

Avoid storing unnecessary sensitive identity documents directly unless a later approved architecture requires it.

---

## Success State

A successful ID verification flow results in:

- Nurse profile marked verified.
- Verification timestamp recorded.
- Provider/reference ID stored.
- Nurse may confirm contact/profile fields and proceed to license info depending on flow state.

---

## Failure / Edge Cases

Handle:

- Verification abandoned.
- Verification failed.
- Verification expired.
- Provider unavailable.
- Mismatch between identity and license lookup result.
- Manual review needed.
- Existing account/profile already linked to the same ID.me subject.
- Attempt to reuse one ID.me subject across multiple active profiles.

If there is a mismatch between verified identity and license result, credential issuance should pause for review or David-approved rules.

---

## Security / Privacy Notes

- Do not expose provider secrets client-side.
- Do not store unnecessary sensitive identity artifacts.
- Identity verification status should be readable only by the nurse and service/admin paths as approved.
- Any manual review path requires explicit tasking before implementation.
- ID.me-first onboarding requires state/PKCE validation before account/profile linking.
- Email and phone returned by ID.me are not enough by themselves to prove account control or phone possession.

---

## Data Records

Recommended tables touched by or near this flow:

```text
profiles
licenses
credentials
audit_events
jobs
```

---

## Related Docs

```text
/docs/flows/ACCOUNT_CREATION.md
/docs/flows/IDME_FIRST_ONBOARDING.md
/docs/flows/LICENSE_LOOKUP.md
/docs/features/ACCOUNT_MANAGEMENT.md
/docs/architecture/SECURITY_MODEL.md
/docs/architecture/DATA_MODEL.md
```

---

## Open Items

- Final ID verification provider/path.
- Final `onboarding_attempts` or equivalent temporary state model.
- Final account/profile linking rules after ID.me-first callback.
- Manual review policy, if any.
- Exact user-facing copy for failed/incomplete verification.
