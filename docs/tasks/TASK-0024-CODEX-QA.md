# TASK-0024-CODEX-QA — Codex QA Review: Phase 3.1 ID.me Edge Function and Callback Wiring Spec

**Task ID:** TASK-0024-CODEX-QA  
**Title:** Codex QA Review of TASK-0024 Phase 3.1 ID.me Spec  
**Assigned To:** Codex  
**Requested By:** Claude / David  
**Status:** Revised — re-review requested after P1 fixes 2026-05-27  
**Created Date:** 2026-05-27  
**Related Task:** TASK-0024 — Phase 3.1 ID.me Edge Function and Callback Wiring Spec  

---

## Purpose

Review the TASK-0024 Phase 3.1 spec for correctness, security boundary compliance, and implementation readiness before David approves Phase 3.1 implementation (TASK-0025).

TASK-0024 is a **spec task only** — no Edge Function has been deployed, no Lovable changes have been made, no migrations have been applied, no secrets have been set. This QA reviews the spec design, not an implementation.

The spec lives at:

```text
docs/tasks/TASK-0024.md
```

Read it in full before reviewing. The Phase 2 state it builds on lives at:

```text
docs/tasks/TASK-0022.md
```

The trust-gate sequence context lives at:

```text
docs/tasks/TASK-0023.md
```

The v4 schema reference lives at:

```text
docs/architecture/V4_MIGRATION_SQL.md
```

---

## Context for Codex

Phase 3.1 adds ID.me identity verification as the first trust gate in the enrollment pipeline. Key design decisions in the spec:

1. **Server-side code exchange**: The ID.me OAuth code is exchanged server-side in a Supabase Edge Function (`idme-exchange`), never in the browser. The `IDME_CLIENT_SECRET` stays in Supabase Edge Function secrets.

2. **JWT-authenticated invocation**: `IdmeCallback.tsx` calls `supabase.functions.invoke("idme-exchange", { body: { code } })`. The Supabase client automatically attaches the user JWT in the Authorization header. The Edge Function uses this to identify the nurse.

3. **Service-role writes**: All `profiles` field updates (trust-gate fields) and `audit_events` writes are performed by the Edge Function using the Supabase service-role key, never by Lovable client code.

4. **IAL2+TEFCA requirement**: Verification must reach IAL2 assurance level with TEFCA scope. IAL1-only results must be treated as failures.

5. **Sandbox confirmed**: The spec targets `api.idmelabs.com` (sandbox). Client ID `8c31c52383e4d0d1b4ac2486281bac1f` and redirect URI `https://enroll.passtodigital.com/auth/idme/callback` are confirmed.

6. **No new migrations needed**: All four `profiles` fields (`id_verification_status`, `id_verification_level`, `id_me_subject`, `onboarding_step`) exist in the v4 schema.

### Known design choices Codex should assess

| Choice | Reason | Question for Codex |
|---|---|---|
| `id_me_subject` extracted from attributes endpoint, not from token JWT | Spec says "uuid or sub field from attributes response" — exact field name not pinned | Is the field name for the ID.me unique subject identifier confirmed? |
| IAL level determined from attributes response field `attributes.ial` | ID.me attributes API structure assumed | Verify this matches actual ID.me sandbox attributes response format |
| Duplicate identity check done before profile update in step 8 | Prevents two profiles from sharing an ID.me identity | Is this sufficient, or does a UNIQUE constraint on `profiles.id_me_subject` also need to be confirmed in schema? |
| `onboarding_step` advancement to `'phone'` happens in same Edge Function update | Atomic write | Is this consistent with the step constraint in v4 schema? |

---

## Claims to Verify

Codex should verify each of the following against the spec and the source documents. Read each referenced file before responding.

### Revision history

This QA task was originally created with TASK-0024. After Codex returned two P1 findings, TASK-0024 was revised on 2026-05-27:

- **P1 closed: PKCE + state added.** The spec now requires state generation, PKCE code_verifier/challenge, state validation in `IdmeCallback.tsx`, `code_verifier` passed to `idme-exchange`, and `code_verifier` included in the token exchange POST. New checks A5–A8 below verify the resolution.
- **P1 closed: Route canonical statement added.** The spec now explicitly states `/id-verification` is confirmed canonical from Phase 2 App.tsx audit, and `/verify-identity` references are stale. Check A9 below verifies this.

---

### A. OAuth flow design

1. Does the spec's authorization URL construction match the ID.me sandbox OAuth 2.0 authorize endpoint?
2. Is `scope=tefca` the correct scope value for IAL2 nurse identity verification at ID.me? (Cross-check against ID.me sandbox documentation or PRD_SECTION_06.)
3. Does the callback flow correctly describe when `?code=` appears in the redirect URL? Does the spec handle `?error=access_denied` (nurse cancellation)?
4. Is the token exchange request body correct: `grant_type=authorization_code`, `code`, `client_id`, `client_secret`, `redirect_uri`, `code_verifier`? Is the endpoint POST with `application/x-www-form-urlencoded` body?
5. Does the spec require `state` to be included in the authorization URL? Is the generation mechanism (`crypto.randomUUID()`) appropriate?
6. Does the spec require `code_challenge` and `code_challenge_method=S256` in the authorization URL? Is the PKCE implementation (`crypto.subtle.digest('SHA-256', ...)` + base64url encode) correct?
7. Does the spec require the returned `?state=` to be validated against `sessionStorage('idme_state')` before calling the Edge Function? Is the state mismatch treated as a security error that blocks all downstream calls?
8. Does the spec require `code_verifier` to be passed in the `idme-exchange` request body and included in the ID.me token exchange POST?
9. Does the spec explicitly state that `/id-verification` is the confirmed canonical route from the Phase 2 App.tsx audit, and that `/verify-identity` references in older docs are stale?

### B. Edge Function process correctness

5. In step 2 of the Edge Function process, the JWT is described as extracted and passed to `supabaseAdmin.auth.getUser(jwt)`. Is there a description of how the JWT is extracted from the incoming request? (Should be from `Authorization: Bearer <token>` header.)
6. In step 3, `profiles` is queried `.eq('auth_user_id', user.id)`. Is `user.id` from `getUser()` the same type/value as `profiles.auth_user_id`? (Should be `uuid` matching `auth.uid()`.)
7. In step 5, the attributes endpoint is called with `Authorization: Bearer <access_token>`. Is the `access_token` the token returned from the ID.me token exchange (step 4), not the user's Supabase JWT?
8. In step 6, IAL is checked as `attributes.ial < 2`. Is the IAL level returned as a numeric field in the ID.me attributes response, or as a string? Is the field path `attributes.ial` correct for the sandbox response?
9. Is the `id_me_subject` (step 7) the stable, unique, per-user identifier from ID.me? What is the exact field name in the attributes response? Is it `uuid`, `sub`, or another field?
10. Does the spec describe what happens if the `id_me_subject` extraction fails (field absent from attributes response)? If not, flag as a gap.
11. In step 9, the profile update includes `onboarding_step = 'phone'`. Is `'phone'` a valid value in the `onboarding_step` CHECK constraint in the v4 schema?

### C. Security boundary compliance

12. Does the spec prevent the browser from ever receiving or processing the ID.me access token or attributes response? Verify the flow: browser sends only the auth `code` to the Edge Function body; the Edge Function handles all downstream ID.me API calls.
13. Is `IDME_CLIENT_SECRET` kept out of all Lovable Vite env vars? The spec lists only `VITE_IDME_CLIENT_ID`, `VITE_IDME_BASE_URL`, `VITE_IDME_REDIRECT_URI` as browser-side env vars — is this list complete and correct? Is `VITE_IDME_CLIENT_ID` safe to expose client-side?
14. Does the spec prohibit any direct `profiles` UPDATE from Lovable client code for Phase 3.1 fields? Does it rely only on the Edge Function (service-role) for all trust-gate writes?
15. Is the session check in `IdmeCallback.tsx` (`supabase.auth.getSession()`) sufficient as a pre-flight before calling the Edge Function? Could a nurse replace another nurse's profile if they shared a callback URL? (The Edge Function uses the JWT `user.id` to identify which profile to update — is this binding confirmed?)

### D. Schema alignment

16. Does `profiles.id_verification_status` exist in the v4 schema, and does it support values `'verified'` and `'failed'`? What is the CHECK constraint?
17. Does `profiles.id_verification_level` exist, and does it support values `'IAL2'` and `'IAL1'`? What is the CHECK constraint?
18. Does `profiles.id_me_subject` exist? What is the column type? Is it `text` or `uuid`? Is there a UNIQUE constraint? (If not, the duplicate check in step 8 requires a query, not a constraint violation — is the spec's approach correct?)
19. Does `profiles.onboarding_step` support the value `'phone'`? List all valid values from the CHECK constraint.
20. Does `audit_events` exist with the expected columns: `action`, `actor_id`, `resource_type`, `resource_id`, `change_after`? Is `action` constrained by a `resource.verb` CHECK? Do `identity.verification_completed` and `identity.verification_failed` satisfy that constraint?

### E. Lovable changes completeness

21. `IdVerification.tsx`: The spec replaces the hardcoded `IDME_AUTHORIZE_URL` constant with `buildIdmeAuthorizeUrl()`. Does the spec provide a backward-compatibility note for `IdmeCallback.tsx`'s import of `IDME_AUTHORIZE_URL`? Is the proposed migration path clear?
22. `IdmeCallback.tsx`: The spec adds a `ranRef` guard to prevent double-firing in React strict mode. Is `ranRef` already present in the Phase 2 stub, or does it need to be added? If it needs to be added, is the spec clear about this?
23. `IdmeCallback.tsx`: The spec adds a 30-second timeout using `window.setTimeout`. Is there a corresponding `setStatus("timeout")` state and UI render path in the existing component, or does a `"timeout"` status need to be added?
24. Does the spec cover what happens if `supabase.functions.invoke` throws (network error, CORS, Edge Function crash returning non-2xx)? The `data`/`error` destructuring from `invoke` — is the catch block in the spec sufficient?
25. Does the spec describe the UI state during the Edge Function call (loading spinner, disabled restart button)? If the current component already has a loading state, is it correctly wired?

### F. Failure state coverage

26. Does the spec cover the case where ID.me returns `?error=access_denied` in the callback URL (nurse declined or cancelled at ID.me)? The spec handles missing `code`, but does it handle an `error` param being present?
27. Does the spec cover what happens if the `idme-exchange` Edge Function returns HTTP 401? (JWT expired between redirect and callback.) The Lovable code should handle this as a session-expired case, not a generic error.
28. Does the spec cover what happens if the `idme-exchange` Edge Function returns HTTP 404? (`profile_not_found` — nurse exists in auth.users but trigger failed to create profile.) Is there a support routing path?
29. Does the spec correctly distinguish between "retry with same code" (impossible — codes are single-use) and "restart" (new authorization)? Is `restart()` clearly described as a new authorization flow, not a retry?

### G. Audit event compliance

30. Is `identity.verification_completed` a valid `resource.verb` pattern under OD-1? (Resource = `identity`, verb = `verification_completed` — is compound verb allowed, or must it be a single word like `identity.verified`?)
31. Is `identity.verification_failed` a valid `resource.verb` pattern under OD-1?
32. Does the spec require writing `actor_id` as `profile.id` (the UUID PK from the `profiles` table), not `auth_user_id`? Confirm this matches the `audit_events` schema's `actor_id` column definition.

### H. Phase scope boundary

33. Does the spec contain any Twilio, SMS, or phone verification logic? (Phase 3.2 — must not appear in Phase 3.1.)
34. Does the spec contain any license lookup, `licenses` table writes, or RapidAPI/Propelus calls? (Phase 3.3 — must not appear in Phase 3.1.)
35. Does the spec contain any selfie upload, storage path writes, or Pass issuance? (Phase 3.4/3.5 — must not appear in Phase 3.1.)
36. Does the spec contain any migration, RLS change, bucket change, or Storage policy change? (Out of scope for Phase 3.1.)

### I. Implementation task completeness

37. Does the implementation task list (steps 3.1-1 through 3.1-7) cover all work needed: Edge Function deployment, secret setting, Lovable env vars, Lovable code changes, QA?
38. Is the dependency chain in the implementation task list correct? Specifically: can step 3.1-5 (Lovable IdVerification.tsx update) start before 3.1-3 (Edge Function deployed), or does it depend only on 3.1-4 (env vars set)?
39. Are the Supabase Edge Function secrets listed exhaustively? Should `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` be explicitly confirmed as auto-available, or does the spec need a note that these do NOT need to be set manually?

---

## Review Output Format

Use P1/P2/P3 severity:

- **P1** — Blocking. The spec has a design error, security gap, or missing information that would cause incorrect or unsafe implementation. Must be resolved before Phase 3.1 implementation begins.
- **P2** — Significant. Gap or ambiguity that would cause an implementation problem or integration issue. Should be resolved in the spec before implementation.
- **P3** — Note. Edge case, future-phase risk, or improvement that does not block Phase 3.1 implementation.

For each finding:

```
[P1/P2/P3] <Short title>
Section: <Spec section or check reference>
Finding: <What is wrong, missing, or ambiguous>
Correction: <What should be added or changed in the spec>
```

If a claim is verified correct, no finding is needed.

End with:

```
Verdict: [Approved / Approved with required fixes / Blocked — requires rework]
Phase 3.1 implementation unblocked: [Yes / No — pending fix to items X, Y]
```

---

## Out of Scope for This QA

- Reviewing TASK-0022 Phase 2 implementation (that QA was TASK-0022-CODEX-QA)
- Reviewing v4 schema design choices (those were TASK-0018/0020/0021)
- Phase 3.2 Twilio spec review
- Phase 3.3 license lookup spec review
- ID.me production credential setup
- Twilio A2P 10DLC setup
- Stripe implementation
- Credential/wallet issuance
- Dashboard or verifier flows
