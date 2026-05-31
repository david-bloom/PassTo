# PassTo License Lookup Flow

**Status:** Baseline - Updated for proposed ID.me-first onboarding  
**Owner:** Codex  
**Last Updated:** 2026-05-31  

---

## Purpose

This document defines the MVP license lookup flow for retrieving and translating nurse licensing-board status into PassTo product state.

This flow is a baseline and does not approve implementation, vendor setup, or Supabase migration execution.

---

## Primary Actor

```text
Nurse
```

---

## High-Level Flow

```text
Nurse completes ID.me-first verification
        ↓
Nurse confirms profile/contact info
        ↓
Nurse starts license lookup at /license-info
        ↓
Nurse enters license lookup inputs
        ↓
PassTo queries source licensing authority / lookup provider
        ↓
PassTo stores source result
        ↓
PassTo translates source status into normalized status and wallet treatment
        ↓
PassTo binds lookup result to verified ID.me identity through data matching
        ↓
If eligible, PassTo creates or updates license and credential records
        ↓
PassTo updates dashboard and wallet pass state where applicable
```

---

## Required Inputs

Likely MVP inputs:

```text
license_number
license_state
license_type, if needed
nurse name or identity-matching information, if needed
```

Input requirements may vary by licensing source.

In the proposed ID.me-first flow, Lovable collects:

```text
license_number
license_state
license_type
```

The backend uses verified ID.me identity fields for matching. Lovable should not ask the nurse to manually re-enter identity fields for matching unless a later approved provider limitation requires it.

---

## Source Status Capture

PassTo must preserve source fidelity.

Use canonical fields:

```text
source_status_raw
source_status_display
normalized_status
status_intent
wallet_pass_treatment
status_checked_at
```

Raw source status must be displayed or available where appropriate so PassTo does not hide licensing-board wording.

---

## Status Translation

PassTo translates raw source statuses into product behavior through `license_status_mappings`.

Wallet treatment values:

```text
valid
caution
invalid
do_not_issue
```

Rules:

- Active license with 30 or more days until expiration: `valid`
- Active license with fewer than 30 days until expiration: `caution`
- Inactive / expired / suspended / revoked: `invalid`
- Raw source `unknown`: verification failure and `do_not_issue`

Raw source `unknown` should not issue or update a credential as valid.

---

## Success State

A successful license lookup may create or update:

```text
licenses
credentials
wallet_passes
refresh_events
audit_events
```

If the license is eligible, PassTo may proceed to credential/pass issuance or update.

If the license is caution/invalid/do-not-issue, PassTo must update product state accordingly and avoid an active-looking pass.

---

## Failure / Edge Cases

Handle:

- Source unavailable.
- No matching license found.
- Multiple possible matches.
- Raw source status unknown.
- Identity/license mismatch.
- Expired or inactive license.
- Lookup timeout.
- Provider error.

Do not silently issue credentials when lookup confidence is insufficient.

Do not ask for plan/payment before a blocking license lookup or identity/license match failure is resolved.

---

## Refresh Relationship

Initial license lookup and refresh share the same source-status translation model.

Refresh may be:

```text
on_demand
scheduled
system_status_change
```

Paid refresh does not begin until payment succeeds where payment is required.

---

## Data Records

Recommended tables:

```text
profiles
licenses
credentials
wallet_passes
license_status_mappings
refresh_events
jobs
audit_events
```

---

## Security Notes

- Source lookup credentials/secrets must remain server-side.
- Nurses can read only their own license/credential data.
- Service role should perform privileged lookup writes where needed.
- Source lookup failures should not expose internal provider details to users.

---

## Related Docs

```text
/docs/flows/ACCOUNT_CREATION.md
/docs/flows/ID_VERIFICATION.md
/docs/flows/IDME_FIRST_ONBOARDING.md
/docs/features/REFRESH.md
/docs/features/PASS_MANAGEMENT.md
/docs/architecture/DATA_MODEL.md
/docs/architecture/SECURITY_MODEL.md
/docs/architecture/NAMING_CONVENTIONS.md
```

---

## Open Items

- Final license lookup provider/API path.
- Exact source-specific mapping values.
- Identity/license matching rules.
- Manual review policy, if any.
