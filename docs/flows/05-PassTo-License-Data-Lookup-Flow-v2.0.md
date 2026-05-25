# PassTo — License Data Lookup Flow

**Version:** 2.0  
**Date:** May 25, 2026  
**Status:** Proposed — architecture-updated draft  
**Owner:** Codex — Engineering Director  
**Approver:** David — Product Owner  
**Supersedes:** prior Make/Airtable License Data Access blueprint  
**Target folder:** `/docs/flows/`

---

## 1. Codex Review Summary

The prior license lookup blueprint is strong as a product and business-rules artifact, but it is coupled to the old Make/Airtable implementation. This v2.0 document updates the flow for the current PassTo architecture: Vercel + Supabase, with license lookup performed through backend-controlled services and durable state stored in Supabase.

### Keep

- License data must come from a primary or trusted source.
- Routing model: direct state-board source where available; vendor source where direct access is not available.
- License number verbatim validation before accepting a returned record.
- Normalized status mapping.
- Coverage-gap handling distinct from temporary source outage.
- Active-license requirement for credential issuance.
- Refresh reuse for onboarding, on-demand refresh, scheduled refresh, and additional license activation.
- Revocation and QR-token invalidation if refresh detects non-active status.

### Replace

| Old assumption | Updated architecture decision |
|---|---|
| Make scenario `S4` performs lookup | Vercel backend service/API route performs lookup |
| Make Data Store stores routing/status maps | Supabase lookup tables store routing/status maps |
| Airtable `LICENSES` table is source of truth | Supabase `licenses` table is source of truth |
| Airtable `AUDIT_LOG` stores events | Supabase `audit_log` stores append-only events |
| Hardcoded Make routing logic | Data-driven routing in Supabase |
| Lovable webhook payloads | Frontend calls PassTo backend endpoints |
| Make retries | Backend retry policy with structured action status |

### Codex assessment

License lookup is a trust-critical subsystem. The dangerous failure mode is not an outage; it is accepting the wrong license record. License number validation, source attribution, auditability, and status normalization are non-negotiable.

---

## 2. User Objective

A PassTo credential is only as trustworthy as the license data behind it. The license lookup flow must:

1. Confirm that the submitted license exists.
2. Confirm whether the license is active and credential-eligible.
3. Capture the canonical data needed for wallet credential display.
4. Provide the holder name used for identity/license matching.
5. Support later refreshes against the same source.
6. Revoke or block credentials when license status is not active.

The nurse should not need to know which data source is used.

---

## 3. System Ownership

### Frontend — Vercel-hosted app

Responsibilities:

- Collect license number, license type, and state.
- Show loading, retry, not-found, coverage-gap, inactive-status, and success states.
- Never call third-party license APIs directly.
- Never store provider keys in the browser.

### Backend/API — Vercel

Responsibilities:

- Validate request and authenticated nurse.
- Read license-source routing from Supabase.
- Call direct board or vendor provider.
- Validate returned license number.
- Normalize status.
- Create or update `licenses`.
- Run or invoke data matching.
- Write audit events.
- Update onboarding or action status.
- Revoke credentials if a refresh discovers non-active status.

### Data/Auth/Storage — Supabase

Responsibilities:

- Store license records.
- Store source-routing configuration.
- Store status maps.
- Store source coverage and unavailable-state behavior.
- Store audit events.
- Enforce RLS so nurses can read their own license data but cannot alter verification results.

---

## 4. Supabase Data Model Requirements

Table names should align with the approved database blueprint. This flow requires these durable concepts.

## 4.1 `licenses`

Stores normalized license lookup result.

Required concepts:

- `id uuid primary key`
- `nurse_id uuid references nurses(id)`
- `license_number text not null`
- `license_number_normalized text not null`
- `license_type text not null`
- `state text not null`
- `status text not null`
- `raw_status text`
- `expiry_date date`
- `profession_code text`
- `holder_name text`
- `holder_dob date`
- `enforcement_actions jsonb`
- `compact_status boolean`
- `compact_eligible boolean`
- `source_type text not null` — `direct`, `vendor`, or `manual`
- `source_name text not null`
- `source_url text`
- `last_verified_at timestamptz`
- `primary_license boolean default false`
- `verification_payload jsonb` — optional raw/trimmed provider payload for support/debugging
- `created_at timestamptz`
- `updated_at timestamptz`

Codex decision: unlike the old blueprint, `holder_name` should be stored. It is part of the evidence chain for data matching and support review. If privacy concern rises later, store normalized/masked variant or encrypt sensitive fields.

## 4.2 `license_source_routes`

Controls routing by state and license type.

Required concepts:

- `state text not null`
- `license_type text`
- `route_type text not null` — `direct`, `vendor`, `unavailable`
- `provider_key text`
- `is_active boolean`
- `coverage_gap_message text`
- `updated_at timestamptz`

Routing should be data-driven. Adding a newly covered state must not require code changes unless the new provider has a new integration shape.

## 4.3 `license_providers`

Stores provider configuration metadata. Secrets stay in environment variables, not database rows.

Required concepts:

- `provider_key text primary key`
- `display_name text`
- `provider_type text` — `direct_board`, `vendor`
- `base_url text`
- `auth_env_key_name text`
- `host_env_key_name text`
- `supports_license_verify boolean`
- `supports_name_search boolean`
- `returns_dob boolean`
- `returns_compact_status boolean`
- `is_active boolean`

## 4.4 `license_status_map`

Maps provider-specific status strings to PassTo canonical statuses.

Required concepts:

- `provider_key text`
- `raw_status text`
- `normalized_status text`
- `credential_eligible boolean`
- `requires_manual_review boolean`
- `created_at timestamptz`

Canonical statuses:

- `active`
- `inactive`
- `suspended`
- `revoked`
- `pending_renewal`
- `registered`
- `other`

## 4.5 `license_lookup_attempts`

Tracks every lookup attempt, including failures.

Required concepts:

- `id uuid primary key`
- `nurse_id uuid`
- `license_id uuid nullable`
- `submitted_license_number text`
- `submitted_state text`
- `submitted_license_type text`
- `route_type text`
- `provider_key text`
- `attempt_status text` — `success`, `not_found`, `source_unavailable`, `coverage_gap`, `provider_error`, `missing_required_field`, `license_number_mismatch`
- `http_status int`
- `error_code text`
- `error_message text`
- `started_at timestamptz`
- `completed_at timestamptz`

Codex decision: this table is more operational than `audit_log`. Keep both. `license_lookup_attempts` supports debugging and metrics; `audit_log` supports product/security traceability.

## 4.6 `nlc_states`

Stores Nurse Licensure Compact reference data for display and future compact behavior.

Required concepts:

- `state text primary key`
- `is_nlc_member boolean`
- `effective_date date`
- `last_confirmed_at timestamptz`
- `source_url text`

RapidAPI-sourced licenses should leave compact status null unless the provider returns reliable compact data.

---

## 5. License Lookup Inputs

Required fields:

- `license_number`
- `license_type`
- `state`

Supported MVP license types:

- `RN`
- `LPN`
- `APRN`
- `NP`
- `CRNA`
- `CNM`
- `CNS`
- `CNA`
- `MA`
- `EMT`
- `Paramedic`
- `Dental`
- `Other`

Codex warning: the presence of non-nursing license types means the provider-routing model cannot be permanently nursing-only. For MVP, document which license types are supported by the selected vendor and block unsupported type/state combinations cleanly.

---

## 6. Flow Variants

## 6.1 MVP Onboarding Flow

Current architecture decision from prior onboarding work: license data may be collected during account creation and submitted after ID.me succeeds, while the nurse completes phone verification.

Flow:

1. Nurse enters license number, type, and state during signup/onboarding.
2. Frontend stores pending license inputs in session-safe app state until nurse profile exists.
3. After ID.me succeeds, frontend or backend starts license lookup.
4. License lookup runs in background.
5. Phone verification and license lookup may proceed in parallel.
6. Credential issuance gate is the synchronization point.
7. If lookup and data match pass, nurse advances to selfie/issuance when phone verification is complete.

Risk: background lookup can make errors less visible. The UI must still expose license lookup failure clearly before credential issuance.

## 6.2 Explicit `/enter-license` Flow

This remains a valid fallback flow and should be retained for:

- Returning nurses who need to retry a failed lookup.
- Additional license activation.
- Manual correction after not-found.
- Post-MVP expanded license management.

Flow:

1. Nurse lands on `/enter-license`.
2. Nurse submits license details.
3. Backend performs lookup.
4. On success: advance to data match/selfie or return to dashboard depending on context.
5. On failure: show specific retry/support/coverage message.

---

## 7. Routing Logic

Routing decision order:

1. Normalize state abbreviation.
2. Normalize license type.
3. Query `license_source_routes` for active route matching state + license type.
4. If no license-type-specific route exists, fall back to state-level route.
5. If no route exists, treat as unavailable.
6. If route is `direct`, call direct state board provider.
7. If route is `vendor`, call configured vendor provider.
8. If route is `unavailable`, return coverage gap.

Pseudo-rule:

```text
IF route_type = direct       → query direct board provider
IF route_type = vendor       → query vendor provider
IF route_type = unavailable  → return coverage_gap
IF no route found            → return coverage_gap
```

Coverage gap is not the same as temporary outage. Do not imply that retrying immediately will fix a coverage gap.

---

## 8. Provider Integration

## 8.1 Direct State Board Path

MVP status: no direct state board integrations are required for launch unless David explicitly adds one.

Behavior:

1. Read provider config from `license_providers`.
2. Use server-side environment variables for credentials.
3. Call state board API.
4. Validate returned license number.
5. Map provider response to canonical license fields.
6. Normalize status.
7. Store source type `direct` and official board name.

Direct provider integration must be implemented one state at a time. Do not create a fake universal direct-board adapter.

## 8.2 Vendor Path — RapidAPI Nurse License Verification

The old blueprint used RapidAPI `nurse-license-verification` as the vendor path and documented the synchronous `POST /verify` pattern.

Expected conceptual request:

```json
{
  "state": "TX",
  "license_number": "751234"
}
```

Expected conceptual response fields:

- `state`
- `license_number`
- `full_name`
- `license_type`
- `license_status`
- `issue_date`
- `expiration_date`
- `discipline`
- `source_url`

Codex warning: the exact vendor contract, covered states, pricing, and rate limits must be re-verified before implementation. Treat the old 31-state coverage list as historical until confirmed in the vendor dashboard/API tests.

Vendor field mapping:

| Vendor field | PassTo field | Requirement |
|---|---|---|
| `full_name` | `licenses.holder_name` | Required for data match |
| `license_number` | `licenses.license_number` | Required; verbatim validation |
| `license_type` | Compare/store as available | Optional if submitted type exists |
| `license_status` | `licenses.raw_status` + normalized `status` | Required |
| `expiration_date` | `licenses.expiry_date` | Optional |
| `discipline` | `licenses.enforcement_actions` | Optional |
| `source_url` | `licenses.source_url` | Optional but useful |

DOB handling: if provider does not return DOB, data matching falls back to name-only for that source. That fallback must be visible in audit metadata.

Compact handling: if provider does not return compact status, store null and omit compact display from pass payload.

---

## 9. License Number Verbatim Validation

Before accepting any provider response:

1. Strip non-alphanumeric characters from submitted license number.
2. Strip non-alphanumeric characters from returned license number.
3. Compare case-insensitively.
4. If mismatch: treat as `not_found` or `license_number_mismatch`.
5. Do not create or update a license record from a mismatched response.

This rule prevents false positives from sources that return near matches or name-collision results.

Codex decision: internally classify mismatch as `license_number_mismatch`; nurse-facing copy can still say not found.

---

## 10. Required vs Optional Fields

Required to accept a successful lookup:

- Holder name
- License number
- Raw license status

Required to create a credential-eligible license:

- Normalized status = `active`
- License number validated
- Nurse/license linkage
- State
- License type

Optional fields:

- Expiry date
- DOB
- Profession code
- Compact status
- Compact eligible
- Enforcement actions
- Source URL

If a required field is absent:

1. Treat response as invalid.
2. Do not create credential-eligible license.
3. Write `license_lookup_attempts.attempt_status = missing_required_field`.
4. Write audit event.
5. Show nurse a generic not-found/support message.

---

## 11. Status Normalization

Raw provider status must always be preserved. PassTo canonical status controls eligibility.

Seed mappings:

| Raw status | Normalized status | Credential eligible |
|---|---|---:|
| Active | active | Yes |
| Good Standing | active | Yes |
| Current | active | Yes |
| Delinquent | inactive | No |
| Expired | inactive | No |
| Disciplinary | suspended | No |
| Suspended | suspended | No |
| Revoked | revoked | No |
| Pending Renewal | pending_renewal | No for MVP |
| Unknown/unmapped | other | No |

Unrecognized raw statuses should not silently pass. Store `other`, block issuance, and flag for review.

---

## 12. Status Gating

After a license lookup succeeds:

```text
IF normalized status = active
  continue to data matching

ELSE
  store license result
  block credential issuance
  show non-active status message
  allow retry/refresh after nurse resolves status with board
```

Nurse-facing message:

> Your license status is currently [Status]. A PassTo credential requires an Active license.

The account may remain active even if credential issuance is blocked.

---

## 13. Data Matching Handoff

License lookup supplies:

- `holder_name`
- `holder_dob` when available
- source metadata
- whether DOB was unavailable from source

Data matching compares:

- ID.me full name against license holder name.
- ID.me DOB against license DOB where available.

Pass rule:

```text
name passes tolerance
AND (DOB matches OR DOB unavailable from source)
```

Audit metadata must indicate if data matching was name-only because DOB was unavailable.

Codex warning: name-only match is weaker. It is acceptable for MVP only because some vendor paths do not return DOB. Keep this visible for future risk review.

---

## 14. Lookup Failure Handling

| Failure | Internal status | Nurse message | Retry? |
|---|---|---|---|
| License not found | `not_found` | “We couldn't find this license. Please check your license number and state and try again.” | Nurse may retry |
| License number mismatch | `license_number_mismatch` | Same as not found | Nurse may retry |
| Coverage gap | `coverage_gap` | “License verification is not yet available for [State]. We're working to expand coverage.” | No immediate retry implied |
| Provider outage | `source_unavailable` | “License verification is temporarily unavailable. Please try again later.” | Yes |
| Missing required field | `missing_required_field` | Generic not-found/support message | Maybe support |
| Provider auth/rate error | `provider_error` | Temporary unavailable | Backend/support |

Limit nurse correction attempts to 3 per onboarding session before prompting support.

---

## 15. Refresh Reuse

The same lookup service is reused for:

- Initial onboarding.
- On-demand refresh.
- Scheduled refresh.
- Additional license activation.
- Admin-triggered recheck.

Refresh behavior:

1. Use existing `licenses.source_type`, `source_name`, state, and license number.
2. Query the same provider route unless route has been deactivated.
3. Update existing license record in place.
4. Preserve historical attempts in `license_lookup_attempts`.
5. Write audit event.

If refresh detects a status change from active to non-active:

1. Update `licenses.status`.
2. Set related active credential to revoked.
3. Set QR token expiry to a past timestamp.
4. Write revocation audit event.
5. Alert nurse.
6. Do not issue updated wallet pass.

---

## 16. Compact/NLC Handling

RapidAPI vendor path in the old blueprint did not return compact status. For MVP:

- Do not infer compact status from state alone.
- Store compact fields as null unless provider/source explicitly returns them.
- Keep `nlc_states` as reference data for future verifier display and direct-state integrations.
- Omit compact-state display from wallet pass when compact status is null.

Codex warning: NLC membership changes over time. Treat `nlc_states` as maintained reference data, not hardcoded application logic.

---

## 17. API Endpoints

Recommended backend endpoints:

| Endpoint | Method | Purpose |
|---|---:|---|
| `/api/licenses/lookup` | POST | Initial lookup or retry |
| `/api/licenses/refresh` | POST | On-demand/admin refresh |
| `/api/licenses/status` | GET | Lookup/action status for frontend |
| `/api/admin/license-routes` | GET/POST/PATCH | Admin-managed route table |
| `/api/admin/status-map` | GET/POST/PATCH | Admin-managed status mappings |

Do not expose provider credentials or raw provider errors to the frontend.

---

## 18. Security and RLS Requirements

- Nurses may read their own license records.
- Nurses may submit license lookup requests through backend only.
- Nurses may not directly insert/update verified license fields.
- Service role may write lookup results.
- Audit log should be append-only.
- Provider API keys must be environment variables.
- Raw provider payload storage should be minimized and should avoid unnecessary PII where possible.

---

## 19. Observability

Track at minimum:

- Lookup attempts by provider.
- Success rate by state.
- Not-found rate by state.
- Coverage gaps by state.
- Provider outage/rate-limit events.
- License-number mismatch count.
- Missing-required-field count.
- Average lookup latency.
- Active vs non-active returned statuses.
- Refresh revocations.

This matters commercially. Coverage gaps and provider failures directly affect activation conversion.

---

## 20. Acceptance Criteria

### Input and routing

- [ ] License number, license type, and state are required.
- [ ] Backend validates authenticated nurse before lookup.
- [ ] Routing is read from Supabase, not hardcoded.
- [ ] Covered vendor states route to configured vendor.
- [ ] Direct states route to direct provider when configured.
- [ ] Unavailable states return coverage gap immediately.
- [ ] Absent route defaults to coverage gap.
- [ ] Coverage gap message does not imply immediate retry will work.

### Provider handling

- [ ] Provider credentials are never exposed to frontend.
- [ ] Vendor lookup works for at least one verified test case.
- [ ] Direct-provider adapter can be added without rewriting core flow.
- [ ] Provider timeout/error returns source unavailable.
- [ ] Rate-limit/provider-auth errors are logged for support.

### Validation and normalization

- [ ] License number verbatim validation rejects mismatched responses.
- [ ] Required missing fields prevent license creation/update.
- [ ] Raw status is preserved exactly.
- [ ] Normalized status is written from `license_status_map`.
- [ ] Unrecognized raw status maps to `other` and blocks issuance.
- [ ] Non-active statuses block credential issuance with clear message.

### License records

- [ ] Successful lookup creates or updates `licenses`.
- [ ] Primary onboarding license is marked `primary_license = true`.
- [ ] Additional licenses are marked `primary_license = false`.
- [ ] `last_verified_at` is written.
- [ ] Source type/name are written.
- [ ] Holder name is stored for evidence/data matching.
- [ ] Compact fields are null unless source returns reliable compact data.

### Data matching and issuance

- [ ] License lookup hands holder name/DOB availability to data matching.
- [ ] Name-only match is flagged in audit metadata when DOB unavailable.
- [ ] Active license + passed data match can satisfy license component of issuance gate.
- [ ] Non-active license cannot satisfy issuance gate.

### Refresh and revocation

- [ ] Refresh updates existing license record in place.
- [ ] Refresh writes lookup attempt and audit event.
- [ ] Refresh detecting non-active status revokes credential.
- [ ] Revocation immediately expires current QR token.
- [ ] Nurse is alerted on revocation.

### Auditability

- [ ] Every lookup attempt is recorded in `license_lookup_attempts`.
- [ ] Every business-significant result is written to `audit_log`.
- [ ] Provider event/error metadata is sufficient for support debugging.

---

## 21. Open Decisions

| Decision | Recommendation | Priority |
|---|---|---:|
| Confirm current RapidAPI coverage | Re-test before build; treat old 31-state list as historical | High |
| Confirm RapidAPI pricing and rate limits | Required before production use | High |
| Decide whether to store raw provider payload | Store trimmed payload only; avoid unnecessary PII | Medium |
| Decide holder-name retention policy | Store for support/evidence; revisit privacy later | Medium |
| Define direct-board integration standard | Add only when a real direct API is confirmed | Medium |
| Confirm supported license types for MVP | Avoid pretending vendor supports all listed types | High |
| NLC/compact source of truth | Maintain as reference table; do not infer eligibility | Medium |

---

## 22. Recommended Claude Task Breakdown

Do not assign license lookup as one broad implementation task.

1. **FLOW-LICENSE-001 — License lookup schema**
   - Create/confirm `licenses`, `license_source_routes`, `license_providers`, `license_status_map`, `license_lookup_attempts`, and `nlc_states`.

2. **FLOW-LICENSE-002 — Routing and provider abstraction**
   - Implement data-driven routing and provider interface without hardcoded state lists.

3. **FLOW-LICENSE-003 — Vendor lookup integration**
   - Implement RapidAPI/vendor provider behind backend service; include timeout, retry, and error classification.

4. **FLOW-LICENSE-004 — Validation and status normalization**
   - Implement license-number validation, required-field validation, status mapping, and failure classification.

5. **FLOW-LICENSE-005 — License record persistence and audit**
   - Create/update license record, lookup attempts, and audit log events.

6. **FLOW-LICENSE-006 — Data matching handoff**
   - Pass holder name/DOB availability into data matching and record name-only fallback in audit metadata.

7. **FLOW-LICENSE-007 — Refresh and revocation**
   - Implement refresh reuse, status-change detection, credential revocation, and QR-token invalidation.

8. **FLOW-LICENSE-008 — Frontend states**
   - Implement loading, not-found, coverage-gap, source-unavailable, inactive-status, support, and retry UI.

---

## 23. Codex Notes

This document should sit under `/docs/flows/` as the canonical license-data flow. It should not be treated as a finished implementation spec until the current provider contract, coverage, price, and rate limits are re-verified.

The biggest architectural improvement over the old blueprint is moving routing and status decisions into Supabase tables. That keeps the product adaptable as providers change without rebuilding core onboarding logic.
