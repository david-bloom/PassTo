# FLOW-LICENSE-002 — License Lookup Backend Service

**Status:** Proposed  
**Owner:** Codex  
**Executor:** Claude  
**Approver:** David  
**Area:** Vercel Backend / Supabase Integration  
**Depends on:** FLOW-LICENSE-001 — License Lookup Schema  
**Source flow:** `/docs/flows/05-PassTo-License-Data-Lookup-Flow-v2.0.md`  
**Created:** May 25, 2026

---

## 1. Objective

Build the backend license lookup service that accepts authenticated PassTo license lookup requests, routes them to the correct provider, validates the returned record, normalizes license status, persists the result in Supabase, records lookup attempts, and returns a safe frontend response.

This task should implement the core backend service and endpoint structure. It should not implement frontend UI, scheduled refresh jobs, Stripe payment behavior, or PassKit credential issuance.

---

## 2. Context

PassTo must verify license data before issuing a credential. The previous architecture used Make S4 and Airtable. The new architecture uses:

- Vercel backend routes/server actions for orchestration.
- Supabase as source of truth.
- Supabase route/status/provider tables for configuration.
- Third-party provider calls from server-side code only.

The primary safety requirement is preventing false-positive license matches.

---

## 3. Scope

### In scope

- Implement `/api/licenses/lookup` or equivalent backend action.
- Validate authenticated nurse/session.
- Validate request body.
- Read route from Supabase.
- Return coverage gap for unavailable states.
- Implement provider abstraction.
- Implement initial vendor provider adapter for RapidAPI-style license verification, behind environment variables.
- Validate returned license number against submitted license number.
- Validate required provider fields.
- Normalize raw status using `license_status_map`.
- Create/update `licenses` row.
- Create `license_lookup_attempts` row for every attempt.
- Write business-relevant `audit_log` events where the table exists.
- Return safe frontend response.

### Out of scope

- Frontend screens and copy.
- Scheduled refresh worker.
- On-demand refresh payment gating.
- Additional license activation payment flow.
- PassKit credential issuance.
- Full data-matching implementation, unless an existing service already exists and can be safely invoked.
- Admin UI for route/status-map management.

---

## 4. Endpoint Contract

Recommended endpoint:

`POST /api/licenses/lookup`

Request body:

```json
{
  "license_number": "751234",
  "license_type": "RN",
  "state": "TX",
  "context": "onboarding"
}
```

Allowed `context` values:

- `onboarding`
- `retry`
- `additional_license`
- `admin_recheck`

Response examples:

### Success, active

```json
{
  "success": true,
  "status": "active",
  "license_id": "uuid",
  "credential_eligible": true,
  "next_step": "data_matching"
}
```

### Success, non-active

```json
{
  "success": true,
  "status": "inactive",
  "license_id": "uuid",
  "credential_eligible": false,
  "message_code": "license_not_active"
}
```

### Not found

```json
{
  "success": false,
  "error": "not_found",
  "message_code": "license_not_found"
}
```

### Coverage gap

```json
{
  "success": false,
  "error": "coverage_gap",
  "message_code": "license_coverage_gap"
}
```

### Temporary provider issue

```json
{
  "success": false,
  "error": "source_unavailable",
  "message_code": "license_source_unavailable"
}
```

Do not return raw provider payloads to the frontend.

---

## 5. Request Validation

The backend must validate:

- User is authenticated.
- Authenticated user maps to a `nurses` row.
- `license_number` is present.
- `license_type` is present and allowed.
- `state` is present and normalizable to a US state/DC abbreviation.
- `context` is allowed or defaults to `onboarding`.

Normalize:

- `state` to uppercase two-character code.
- `license_number_normalized` by stripping non-alphanumeric characters and uppercasing.

Reject invalid request with safe 400 response.

---

## 6. Routing Behavior

Routing decision order:

1. Query `license_source_routes` for active route matching `(state, license_type)`.
2. If no match, query active state-level route where `license_type is null`.
3. If no match, treat as coverage gap.
4. If route is `unavailable`, return coverage gap.
5. If route is `vendor`, call configured vendor provider.
6. If route is `direct`, call configured direct provider.

Do not hardcode the old 31-state RapidAPI coverage list in code.

---

## 7. Provider Abstraction

Create a small provider interface, for example:

```ts
interface LicenseLookupProvider {
  verify(input: {
    state: string;
    licenseNumber: string;
    licenseType: string;
  }): Promise<ProviderLicenseResult>;
}
```

Canonical provider result should include:

- `found`
- `licenseNumber`
- `holderName`
- `licenseType`
- `rawStatus`
- `expiryDate`
- `holderDob`
- `professionCode`
- `enforcementActions`
- `compactStatus`
- `compactEligible`
- `sourceUrl`
- `rawPayload`

Provider-specific parsing should be isolated from core persistence logic.

---

## 8. Vendor Provider — RapidAPI-Style Adapter

Implement behind environment variables:

- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`

Expected pattern:

- `POST /verify`
- Request contains state and license number.
- Response is synchronous.

Important implementation rules:

- Set a clear timeout.
- Classify provider HTTP failures as `source_unavailable` or `provider_error`.
- Do not expose provider auth/rate-limit details to nurse.
- Record operational details in `license_lookup_attempts`.
- Treat vendor contract and coverage as configurable; do not assume the old coverage list is current.

---

## 9. License Number Validation

Before accepting any returned record:

1. Normalize submitted license number.
2. Normalize returned license number.
3. Compare case-insensitively.
4. If mismatch:
   - Do not create/update `licenses`.
   - Record `license_lookup_attempts.attempt_status = license_number_mismatch`.
   - Return nurse-facing `not_found` response.

This is a hard safety gate.

---

## 10. Required Field Validation

Required provider fields for successful lookup:

- Holder name.
- Returned license number.
- Raw status.

If any are missing:

- Do not create/update credential-eligible license.
- Record `attempt_status = missing_required_field`.
- Return safe not-found/support response.

Optional fields:

- Expiry date.
- Holder DOB.
- Profession code.
- Enforcement actions.
- Compact status.
- Compact eligible.
- Source URL.

Missing optional fields must not crash the endpoint.

---

## 11. Status Normalization

Lookup raw status in `license_status_map` by provider key and raw status.

Behavior:

- If mapping exists, use mapped `normalized_status` and `credential_eligible`.
- If no mapping exists, set normalized status to `other`, credential eligible false, and flag for review if supported.
- Preserve `raw_status` exactly as provider returned it.

Do not allow unknown raw statuses to pass as active.

---

## 12. Persistence Rules

### On successful lookup

Create or update `licenses`.

Rules:

- For onboarding context, create/update the nurse’s primary license.
- For additional license context, create a non-primary license unless caller explicitly identifies an existing license.
- Use normalized license number.
- Store source type/name/provider metadata.
- Store holder name for data-match evidence.
- Store trimmed raw payload only if approved by existing schema and privacy posture.
- Set `last_verified_at = now()`.

### On failed lookup

Do not create a `licenses` row for:

- `not_found`
- `license_number_mismatch`
- `missing_required_field`
- `coverage_gap`
- `source_unavailable`

Always create a `license_lookup_attempts` row.

---

## 13. Audit Logging

Where the `audit_log` table exists, write business-significant events:

- Successful lookup: `license_looked_up`, entity type `license`.
- Not found/failure: `license_looked_up`, entity type `nurse`, new value matching failure class.
- Non-active returned status: include normalized status.
- Missing required field: include failure class.

Operational details belong in `license_lookup_attempts`, not only in audit log.

---

## 14. Data Matching Handoff

If an existing data-matching service already exists, call it after successful active lookup.

If data matching does not yet exist:

- Return `next_step = data_matching_pending` or equivalent.
- Do not fake a passed match.
- Record enough data for the later data-matching task: holder name, DOB availability, provider/source.

Name-only match risk must be preserved in metadata when provider does not return DOB.

---

## 15. Error Classification

Use these internal classes:

- `success`
- `not_found`
- `source_unavailable`
- `coverage_gap`
- `provider_error`
- `missing_required_field`
- `license_number_mismatch`

Frontend-facing errors should be safe and user-comprehensible.

Do not leak:

- API keys.
- Provider stack traces.
- Raw provider error payloads.
- Internal SQL errors.

---

## 16. Retry Policy

Recommended MVP retry behavior:

- Provider timeout/5xx: retry up to 2 additional times with short backoff.
- Provider 401/403: do not retry; classify as provider configuration error.
- Provider 429: do not hammer provider; classify as source unavailable/rate limited and log.
- Coverage gap: no retry.
- Not found: no backend retry; nurse may correct and resubmit.

---

## 17. Tests

Add tests for:

- Unauthenticated request rejected.
- Missing fields rejected.
- State normalization works.
- Route-specific lookup chosen before state-level fallback.
- No route returns coverage gap.
- Unavailable route returns coverage gap.
- Provider success creates license row.
- Provider not found creates attempt but no license row.
- License number mismatch creates attempt but no license row.
- Missing required field creates attempt but no license row.
- Unknown raw status maps to `other` and blocks eligibility.
- Active mapped status returns credential eligible.
- Non-active mapped status returns credential ineligible.
- Provider failure classified safely.

Use mocked provider responses. Do not call live RapidAPI in unit tests.

---

## 18. Acceptance Criteria

- [ ] Authenticated nurse can submit a license lookup request.
- [ ] Unauthenticated request is rejected.
- [ ] Request body validation prevents missing license number/type/state.
- [ ] Backend reads route from Supabase.
- [ ] Code does not hardcode old RapidAPI coverage list.
- [ ] Coverage gap returns safe frontend response.
- [ ] Vendor provider adapter is isolated behind provider interface.
- [ ] Provider credentials are read from environment variables only.
- [ ] Provider success is parsed into canonical provider result.
- [ ] Returned license number must match submitted license number.
- [ ] Mismatched license number does not create/update license.
- [ ] Missing holder name/license number/status does not create/update license.
- [ ] Raw status is preserved exactly.
- [ ] Normalized status is read from `license_status_map`.
- [ ] Unknown status maps to `other` and is not credential eligible.
- [ ] Successful lookup creates or updates `licenses`.
- [ ] Failed lookup creates `license_lookup_attempts`.
- [ ] Business-significant result writes `audit_log` where available.
- [ ] Endpoint returns safe responses without leaking provider/internal errors.
- [ ] Unit tests cover success, coverage gap, not found, mismatch, missing required field, unknown status, and provider failure.

---

## 19. Definition of Done

This task is done when:

1. Backend endpoint/action exists and is wired to Supabase.
2. Provider abstraction exists.
3. Vendor adapter exists behind environment variables.
4. Lookup routing is data-driven from Supabase.
5. License number validation is enforced before persistence.
6. Status normalization is enforced before eligibility decisions.
7. `licenses`, `license_lookup_attempts`, and audit behavior work as specified.
8. Tests pass without live provider calls.
9. Claude documents any unresolved provider-contract assumptions, especially RapidAPI coverage, price, and rate limits.

---

## 20. Notes for Claude

Do not optimize for a happy-path demo by bypassing the hard gates. This feature is a trust boundary. A slow or failed lookup is acceptable; a false positive is not.

If existing repo conventions conflict with endpoint names in this spec, follow the repo convention and document the mapping.
