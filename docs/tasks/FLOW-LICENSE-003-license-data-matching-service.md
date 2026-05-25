# FLOW-LICENSE-003 — License Data Matching Service

**Status:** Proposed  
**Owner:** Codex  
**Executor:** Claude  
**Approver:** David  
**Area:** Backend / Verification Logic / Supabase  
**Depends on:** FLOW-LICENSE-001, FLOW-LICENSE-002  
**Source flows:**  
- `/docs/flows/05-PassTo-License-Data-Lookup-Flow-v2.0.md`  
- `/docs/flows/02-PassTo-Onboarding-Payments-Flow-v2.0.md`  
**Created:** May 25, 2026

---

## 1. Objective

Build the backend data-matching service that compares the nurse identity verified through ID.me against the license-holder identity returned by the license lookup provider.

This is a hard credential-issuance gate. A PassTo wallet credential must not be issued unless the identity/license match passes or a future approved manual-review override exists.

---

## 2. Context

PassTo verifies two separate things before issuing a credential:

1. The nurse’s identity through ID.me.
2. The nurse’s professional license through a state board or trusted vendor.

Data matching proves those two records belong to the same person.

The old Make/Airtable design performed this inside Make S4. The updated architecture requires backend-owned matching logic, Supabase-persisted match results, and audit visibility.

This service must be deterministic, testable, conservative, and explicitly auditable.

---

## 3. Scope

### In scope

- Implement reusable backend data-matching utility/service.
- Compare ID.me full name against license holder name.
- Compare ID.me DOB against license DOB when available.
- Support name-only fallback when license DOB is unavailable.
- Store match result on the nurse record or approved verification state table.
- Write audit event for match pass/fail.
- Return structured result to license lookup/onboarding flow.
- Include unit tests for expected name and DOB cases.

### Out of scope

- ID.me OAuth integration.
- License lookup provider integration.
- Manual-review admin workflow.
- Credential issuance/PassKit integration.
- UI screens.
- Changing the license lookup schema unless a missing field is discovered and documented.

---

## 4. Inputs

The service requires:

### From ID.me / `nurses`

- `idme_full_name_temp` or equivalent verified full-name field.
- `idme_dob_temp` or equivalent verified DOB field.
- `idme_assurance_level`.
- `idme_verification_status`.

### From `licenses`

- `holder_name`.
- `holder_dob` when available.
- `source_type`.
- `source_name` or `provider_key`.
- `license_id`.

### From caller

- `nurse_id`.
- `license_id`.
- `context`, such as `onboarding`, `retry`, `additional_license`, or `refresh`.

---

## 5. Hard Preconditions

The service must not return `passed` unless:

- Nurse exists.
- License exists and belongs to nurse.
- ID.me verification status is verified.
- ID.me assurance level is IAL2 or approved equivalent.
- ID.me full name is present.
- License holder name is present.

If any precondition fails, return structured failure and do not mark match as passed.

---

## 6. Matching Rules

## 6.1 Name normalization

Normalize both names before comparison:

- Trim whitespace.
- Convert to uppercase or lowercase consistently.
- Collapse repeated spaces.
- Remove punctuation that does not materially affect identity comparison.
- Treat hyphenated surnames carefully.
- Preserve meaningful name components for comparison.

Examples:

- `Jane A. Smith` and `JANE A SMITH` should pass.
- `Jane Smith` and `Jane A Smith` should pass.
- `Jane Smith-Jones` and `Jane Smith Jones` should be evaluated as likely pass.
- `Jane Smith` and `Janet Smith` should not automatically pass.
- `Jane Smith` and `Mary Smith` should fail.

## 6.2 Name comparison tolerance

MVP tolerance should be conservative.

Pass examples:

- Exact normalized full-name match.
- First name + last name match, middle name or middle initial differs/is absent.
- Hyphen/space/punctuation variation in surname where tokens remain consistent.

Fail examples:

- Different first name.
- Different last name.
- Reordered names unless explicitly handled safely.
- Nicknames unless an approved nickname map exists.

Codex decision: do not introduce broad fuzzy matching libraries or loose similarity thresholds without explicit test coverage. The false-positive risk is worse than a support escalation.

## 6.3 DOB comparison

If license DOB is available:

- DOB must match ID.me DOB exactly after date normalization.
- If DOB differs, match fails even if name matches.

If license DOB is unavailable:

- Match may pass on conservative name match alone.
- Result metadata must record `dob_match_mode = unavailable_name_only`.
- Audit log must show that the match was name-only.

If ID.me DOB is missing:

- Do not pass the match unless David/Codex later approve an exception path.

---

## 7. Match Result Values

Use explicit result values:

- `passed`
- `failed`
- `blocked_missing_idme`
- `blocked_missing_license_holder`
- `blocked_low_assurance`
- `blocked_dob_mismatch`
- `blocked_name_mismatch`
- `manual_review_required` — reserved for future use unless manual review exists

Do not overload null/empty states to mean a match decision.

---

## 8. Persistence Rules

On match pass:

- Set nurse match result to `passed` or write equivalent verification-state row.
- Preserve enough metadata to understand whether DOB was matched or unavailable.
- Write `audit_log.event_type = data_matched` with `new_value = passed`.

On match fail:

- Set nurse match result to `failed` or equivalent.
- Set nurse account status to `flagged` if this matches existing schema rules.
- Block credential issuance.
- Write `audit_log.event_type = data_matched` with failure value.

After matching:

- Temporary ID.me fields may be cleared only if the system has stored sufficient durable evidence/result metadata for audit/support.
- Do not clear fields before the audit event and match result have been written.

---

## 9. Recommended Result Payload

Internal service return shape:

```json
{
  "success": true,
  "match_result": "passed",
  "name_match": true,
  "dob_match": true,
  "dob_match_mode": "exact",
  "manual_review_required": false,
  "reason_code": null
}
```

Name-only pass example:

```json
{
  "success": true,
  "match_result": "passed",
  "name_match": true,
  "dob_match": null,
  "dob_match_mode": "unavailable_name_only",
  "manual_review_required": false,
  "reason_code": "license_dob_unavailable"
}
```

Fail example:

```json
{
  "success": false,
  "match_result": "failed",
  "name_match": false,
  "dob_match": null,
  "dob_match_mode": "not_evaluated",
  "manual_review_required": true,
  "reason_code": "name_mismatch"
}
```

---

## 10. Integration Points

## 10.1 License lookup service

After successful active license lookup, `FLOW-LICENSE-002` should invoke this matching service or return `data_matching_pending` until this service exists.

## 10.2 Credential issuance gate

Credential issuance must verify that data matching passed before issuing a wallet pass.

The authoritative gate should be one of:

- A durable match result field; or
- An append-only `audit_log` event proving `data_matched = passed`; or
- A dedicated verification-state table if the approved database architecture includes one.

Codex preference: use both a durable current-state field for fast checks and audit log for evidence.

## 10.3 Onboarding routing

If match passes:

- Continue toward selfie/credential issuance once other gates are satisfied.

If match fails:

- Block issuance.
- Show support/manual-review message.
- Do not allow repeated blind retries without changed input or support action.

---

## 11. Security and Privacy

- Do not expose ID.me DOB or license DOB to the frontend unless explicitly required.
- Do not log sensitive DOB values in plaintext application logs.
- Audit metadata may record whether DOB matched, not necessarily the DOB itself.
- Avoid storing excessive raw identity payloads.
- If temporary ID.me fields are cleared, ensure match result and audit evidence remain durable.

---

## 12. Tests

Add unit tests for name normalization and match decisions.

Required test cases:

### Name pass cases

- Exact match: `Jane Smith` vs `Jane Smith`.
- Case variation: `Jane Smith` vs `JANE SMITH`.
- Middle initial present only on one side.
- Middle name present only on one side.
- Punctuation variation.
- Hyphenated surname variation where tokens align.

### Name fail cases

- Different first name.
- Different last name.
- Similar but not same first name, for example `Jane` vs `Janet`.
- Same last name but different first name.
- Missing holder name.
- Missing ID.me name.

### DOB cases

- DOB exact match passes when name passes.
- DOB mismatch fails even when name passes.
- License DOB unavailable allows conservative name-only pass.
- ID.me DOB missing blocks pass.

### Integration behavior

- Low assurance level blocks pass.
- Failed match flags nurse/account according to schema.
- Passed match writes audit event.
- Name-only pass writes metadata indicating DOB unavailable.

---

## 13. Acceptance Criteria

- [ ] Reusable data-matching service exists.
- [ ] Service validates nurse/license ownership.
- [ ] Service blocks matching if ID.me is not verified at IAL2/equivalent.
- [ ] Service normalizes names consistently.
- [ ] Service allows conservative middle-name/middle-initial differences.
- [ ] Service handles hyphen/punctuation variation safely.
- [ ] Service does not allow broad unsafe fuzzy matches.
- [ ] DOB must match exactly when license DOB is available.
- [ ] Name-only match is allowed only when license DOB is unavailable.
- [ ] Name-only match is marked in metadata/audit.
- [ ] Missing ID.me DOB blocks pass unless license DOB is unavailable and a documented exception is approved.
- [ ] Match pass writes durable match result.
- [ ] Match fail writes durable failed result and blocks issuance.
- [ ] Audit event is written for pass and fail.
- [ ] Sensitive DOB values are not leaked to frontend or logs.
- [ ] Unit tests cover required name and DOB cases.

---

## 14. Definition of Done

This task is done when:

1. Data-matching service is implemented and callable by backend flows.
2. Match result values are explicit and not ambiguous.
3. Name and DOB matching rules are covered by tests.
4. Match results persist to Supabase according to approved schema.
5. Audit event is written for pass/fail.
6. Credential issuance can use the match result as a hard gate.
7. Claude documents any schema conflicts or required follow-up changes.

---

## 15. Notes for Claude

Do not solve this by using a loose string-similarity threshold. That creates a false-positive risk. Start with deterministic normalization and conservative token comparison.

If you believe a fuzzy library is necessary, pause and propose the rule, threshold, and test matrix before implementation.
