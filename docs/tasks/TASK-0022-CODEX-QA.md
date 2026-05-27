# TASK-0022-CODEX-QA — Codex QA Review: Phase 2 Auth, Profile Init, and Onboarding Routing Implementation

**Task ID:** TASK-0022-CODEX-QA  
**Title:** Codex QA Review of TASK-0022 Phase 2 Implementation  
**Assigned To:** Codex  
**Requested By:** Claude / David  
**Status:** Ready for Codex QA  
**Created Date:** 2026-05-27  
**Related Task:** TASK-0022 — Implement Phase 2 Auth, Profile Init, and Onboarding Routing  

---

## Purpose

Review the TASK-0022 Phase 2 implementation for correctness, security boundary compliance, and phase scope integrity before David approves Phase 3.1 tasking.

TASK-0022 was a **Lovable implementation task** — no Supabase migrations, Edge Function deployments, bucket changes, or RLS modifications were made. All changes were frontend Lovable code in the P2 enrollment project (and minor dead-code removal in P3).

The implementation spec lives at:

```text
docs/tasks/TASK-0022.md
```

The Phase 2 architecture spec lives at:

```text
docs/tasks/TASK-0021.md
```

Read both files in full before reviewing.

---

## Context for Codex

Phase 2 wired the P2 enrollment Lovable project to the canonical Supabase project `wvzjfxacykgsaffskgtr`. Key changes made:

1. **`CreateAccount.tsx`** — fully replaced with v4 Supabase Auth signup form. Email confirmation is ON for `wvzjfxacykgsaffskgtr`, so `authData.session` is null after signUp. The implementation stores first/last name in `sessionStorage.pendingName` and routes to `/confirm-email`.

2. **`Login.tsx`** — post-login name completion added: reads `sessionStorage.pendingName`, calls `update_own_profile_basic()` with `p_first_name` and `p_last_name` only, clears storage. Then calls `routeByOnboardingStep()`.

3. **`routeByOnboardingStep()`** — implemented inline in `Login.tsx`. Fetches `profiles.onboarding_step` and `profiles.account_status` via `.maybeSingle()`, handles error/null/status guards, routes by step value.

4. **`IdVerification.tsx`** — stubbed for Phase 3.1. `useEnrollment()` removed from component body. `handleVerify()` is a no-op. Button disabled. Exports (`IDME_AUTHORIZE_URL`, `IDME_STORAGE_KEY`, `persistIdmePending`) preserved for `IdmeCallback.tsx` import compatibility.

5. **`IdmeCallback.tsx`** — Make webhook `fetch()` replaced with clean stub (no `null as any` crash). Hardcoded Make URL removed as fallback default.

6. **`AccessGateModal.tsx` (P3)** — dead `// Skip Airtable sync for now` comment removed.

### Known deviations from TASK-0021 spec

| Deviation | Reason | Acceptable? |
|---|---|---|
| Router uses `/id-verification` not `/verify-identity` | `/verify-identity` does not exist in App.tsx; `/id-verification` is the actual route | Yes — spec had wrong route name |
| `profiles` query cast in `routeByOnboardingStep()` | Generated types come from old Lovable-managed project; not regenerated in Phase 2 | Yes — Phase 3 types regen |
| `CreateAccount.tsx` may include a phone input | Lovable reconstructed JSX; `p_phone` was explicitly removed from RPC call | Yes — if present, phone is dead UI only |
| Old P2 Supabase project `ofpxczstptysqxoruiox` not found | Deleted or Lovable-managed; EF deletion moot since caller was removed | Yes — caller gone |

---

## Claims to Verify

Codex should verify each of the following against the actual Lovable source files. Read each file named before responding.

### A. `CreateAccount.tsx` — signup form replacement

1. Does the file call `supabase.auth.signUp()` and not insert into any table directly?
2. Is there any reference to `enrollments`, `sessionStorage.enrollmentId`, or Airtable record IDs (`rec...`) anywhere in the file?
3. When `authData.session` is null (expected path): is `sessionStorage.setItem("pendingName", ...)` called with `firstName` and `lastName`, and does the router navigate to `/confirm-email`?
4. When `authData.session` is present (unexpected path): is `update_own_profile_basic()` called with only `p_first_name` and `p_last_name` (no `p_phone`)? Does it then navigate to `/id-verification`?
5. If a phone input exists in the form, is `p_phone` absent from the `supabase.rpc()` call?
6. Does the file import from `@/integrations/passto-supabase/client` (the correct client), not `@/integrations/supabase/client` (the dead auto-generated one)?

### B. `Login.tsx` — post-login name completion and routing

7. After `signInWithPassword()` succeeds, is `sessionStorage.getItem("pendingName")` read before any navigation?
8. Is `update_own_profile_basic()` called with only `p_first_name` and `p_last_name` (no `p_phone` or other params)?
9. Is `sessionStorage.removeItem("pendingName")` called after the RPC, regardless of whether the RPC succeeds or fails?
10. Is `routeByOnboardingStep()` called after the pendingName block, replacing any hardcoded `navigate()` call?
11. Does the file import from `@/integrations/passto-supabase/client`?

### C. `routeByOnboardingStep()` — onboarding router

12. Does the profiles query use `.maybeSingle()` (not `.single()`)?
13. Are `error` and `null profile` handled as **separate states**? Specifically:
    - `error` present → show toast or retry UI, do NOT navigate
    - `error null, profile null` → navigate to `/account-recovery`
14. Are `account_status` guards present for `'suspended'` and `'closed'` before the `onboarding_step` switch?
15. Does the `switch` map `'identity'` to `/id-verification` (not `/verify-identity`)?
16. Is there a `default:` case that falls back to `/id-verification`?
17. Are all five `onboarding_step` values covered: `identity`, `phone`, `license`, `pass`, `complete`?

### D. `IdVerification.tsx` — Phase 3.1 stub

18. Is `useEnrollment()` removed from inside the component function body (no `const { data } = useEnrollment()` inside the component)?
19. Is `handleVerify()` a no-op — does it NOT call `window.location.href = IDME_AUTHORIZE_URL`?
20. Is the "Verify with ID.me" button disabled?
21. Are all three exports still present at module level: `IDME_AUTHORIZE_URL`, `IDME_STORAGE_KEY`, `persistIdmePending`? (Required by `IdmeCallback.tsx` imports.)

### E. `IdmeCallback.tsx` — Phase 3.1 stub

22. Is there any `fetch()` call to a Make webhook URL anywhere in the file?
23. Is there a hardcoded Make webhook URL (`hook.us2.make.com/...`) as a fallback value in any variable assignment?
24. Is the `await (null as any)` pattern gone? The async IIFE that previously contained it should be replaced by a clean stub (immediate `setStatus("error")` or equivalent).
25. Does the file still compile without errors despite the stub? (TypeScript build clean.)

### F. `AccessGateModal.tsx` (P3) — dead code removal

26. Is the `// Skip Airtable sync for now` comment removed?
27. Is the `setTimeout(() => { setLoading(false); onAccessGranted(...) }, 500)` logic still intact and functioning?

### G. Security boundaries

28. Is there any call to `supabase.from('profiles').update(...)` anywhere in P2 Lovable code? (Should not exist — no authenticated UPDATE RLS policy.)
29. Is there any attempt to write `onboarding_step`, `account_status`, `id_verification_status`, or `selfie_storage_path` from Lovable client code?
30. Is the service-role key absent from all Lovable source files and ENV vars?
31. Is `@/integrations/supabase/client` (the dead auto-generated client) imported by any active auth flow file? If yes, flag as P2.

### H. Phase scope boundary

32. Is there any actual ID.me OAuth launch (`window.location.href = IDME_AUTHORIZE_URL`) reachable in normal Phase 2 flow?
33. Is there any Twilio or SMS code in the P2 project?
34. Is there any license lookup call or `licenses` table write in the P2 project?
35. Is there any `submit-enrollment` Edge Function call that was added or modified in Phase 2?

### I. Routing completeness

36. Does App.tsx have a route at `/confirm-email` that renders the confirm-email page added in 2.2-6?
37. Does App.tsx have a route at `/account-recovery`? If not, what happens when `routeByOnboardingStep()` navigates there?
38. Does App.tsx have routes at `/account-suspended` and `/account-closed`? If not, flag as P3 risk (nurses with these statuses would hit a 404).

---

## Review Output Format

Use P1/P2/P3 severity (same convention as TASK-0021-CODEX-QA):

- **P1** — Blocking. Implementation is wrong and will break or compromise security in production. Must be corrected before Phase 3.1 is started.
- **P2** — Significant. Error or gap that will cause a Phase 3 integration problem or technical debt. Should be corrected soon.
- **P3** — Note. Observation, edge case, or future-phase risk that does not block Phase 3.1.

For each finding:

```
[P1/P2/P3] <Short title>
Section: <File or component reference>
Finding: <What is wrong or missing>
Correction: <What should be changed>
```

If a claim is verified correct, no finding is needed.

End with:

```
Verdict: [Approved / Approved with required fixes / Blocked — requires rework]
Phase 3.1 unblocked: [Yes / No — pending fix to items X, Y]
```

---

## Out of Scope for This QA

- Reviewing TASK-0021 spec (that QA was TASK-0021-CODEX-QA)
- Reviewing Supabase schema (unchanged in Phase 2)
- Phase 3 design review (ID.me, Twilio, license lookup)
- TASK-0018 R4 remediation
- P1/P3 ENV var updates (2.2-1, 2.2-3) — deferred, not blocking Phase 3.1
- P2 Make/webhook ENV var removal (2.2-4) — deferred, webhook call already removed from code
