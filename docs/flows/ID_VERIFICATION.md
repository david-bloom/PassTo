# PassTo ID Verification Flow

**Status:** Baseline  
**Owner:** Codex  
**Last Updated:** 2026-05-25  

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
```

Avoid storing unnecessary sensitive identity documents directly unless a later approved architecture requires it.

---

## Success State

A successful ID verification flow results in:

- Nurse profile marked verified.
- Verification timestamp recorded.
- Provider/reference ID stored.
- Nurse may proceed to license lookup, credential creation, or dashboard depending on flow state.

---

## Failure / Edge Cases

Handle:

- Verification abandoned.
- Verification failed.
- Verification expired.
- Provider unavailable.
- Mismatch between identity and license lookup result.
- Manual review needed.

If there is a mismatch between verified identity and license result, credential issuance should pause for review or David-approved rules.

---

## Security / Privacy Notes

- Do not expose provider secrets client-side.
- Do not store unnecessary sensitive identity artifacts.
- Identity verification status should be readable only by the nurse and service/admin paths as approved.
- Any manual review path requires explicit tasking before implementation.

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
/docs/flows/LICENSE_LOOKUP.md
/docs/features/ACCOUNT_MANAGEMENT.md
/docs/architecture/SECURITY_MODEL.md
/docs/architecture/DATA_MODEL.md
```

---

## Open Items

- Final ID verification provider/path.
- Whether ID verification must complete before license lookup.
- Manual review policy, if any.
- Exact user-facing copy for failed/incomplete verification.
