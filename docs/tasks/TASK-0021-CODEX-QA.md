# TASK-0021-CODEX-QA — Codex QA Review: Phase 2 Profile Init and Onboarding Routing Spec

**Task ID:** TASK-0021-CODEX-QA  
**Title:** Codex QA Review of TASK-0021 Phase 2 Spec  
**Assigned To:** Codex  
**Requested By:** Claude / David  
**Status:** Ready for Codex QA  
**Created Date:** 2026-05-27  
**Related Task:** TASK-0021 — Phase 2 Profile Init and Onboarding Routing Spec  

---

## Purpose

Review the TASK-0021 Phase 2 specification for correctness before David approves it and TASK-0022 (implementation) is created.

TASK-0021 is a **spec-only task** — no Supabase migrations, Edge Functions, bucket changes, or Lovable code was deployed. The spec defines what David will build in TASK-0022 inside Lovable.

The spec lives at:

```text
docs/tasks/TASK-0021.md
```

Read that file in full before reviewing.

---

## Context for Codex

PassTo Phase 2 wires the three Lovable projects (P1 website, P2 enrollment, P3 app) to the canonical Supabase project `wvzjfxacykgsaffskgtr`. It also initializes nurse profiles via the `handle_new_user()` trigger and `update_own_profile_basic()` RPC, replaces the stale Airtable record ID with the Supabase UUID, implements onboarding step routing, and removes Airtable/Make dead code from the enrollment flow.

No trust gates are wired in Phase 2. `onboarding_step` advancement remains backend-only.

The v4 schema is the ground truth. The migration SQL source is at:

```text
docs/architecture/V4_MIGRATION_SQL.md
```

Cross-reference it for anything related to trigger behavior, RPC parameters, RLS policies, or column constraints.

---

## Spec Claims to Verify

Codex should verify each of the following claims in TASK-0021.md against the actual v4 schema. Flag any that are incorrect, incomplete, or carry Phase 3 implementation risk.

### A. Trigger and profile creation

1. Does `handle_new_user()` in V4_MIGRATION_SQL.md match the spec's description in Section 1 (DQ-1)? Specifically:
   - Does it insert `auth_user_id` and `email` only?
   - Does it use `ON CONFLICT (auth_user_id) DO NOTHING`?
   - Does it fire on `auth.users INSERT`?
2. Does the trigger set all the defaults claimed in DQ-1 (`onboarding_step = 'identity'`, `account_status = 'active'`, `subscription_tier = 'free'`, `id_verification_status = 'unverified'`)? Or do those come from column `DEFAULT` clauses rather than explicit trigger inserts?
3. Is the spec's conclusion correct that no `profile-init` Edge Function is needed for Phase 2?

### B. `profiles.id` vs `profiles.auth_user_id`

4. Does the v4 schema confirm that `profiles.id` is a separate `gen_random_uuid()` PK and NOT a FK to `auth.users(id)`?
5. Does the `nurse_select_own_profile` RLS policy in V4_MIGRATION_SQL.md use `auth_user_id = (select auth.uid())` — confirming `auth_user_id` (not `profiles.id`) is the auth-linked column?
6. Is Section 4.4 usage guide correct? Specifically: is it true that `supabase.auth.getUser().data.user.id` equals `profiles.auth_user_id` and that `profiles.id` is a different UUID?

### C. `update_own_profile_basic()` RPC

7. Does the RPC signature in V4_MIGRATION_SQL.md match the call shown in Section 4.1? Specifically, does the actual RPC accept `p_first_name`, `p_last_name`, and `p_phone` as parameters?
8. Does the spec correctly state the full list of fields the RPC updates? (first_name, last_name, phone, display_name, preferred_name, notification_preferences — and nothing else)
9. Is the RPC marked `SECURITY DEFINER`? Does it respect the correct invoker identity so a nurse can only update their own row?

### D. Onboarding routing

10. Are the five `onboarding_step` values (`identity`, `phone`, `license`, `pass`, `complete`) correct per the v4 CHECK constraint in V4_MIGRATION_SQL.md? Are there any additional values the router should handle?
11. Is the `routeByOnboardingStep()` pseudocode in Section 5.2 architecturally sound? Any race conditions, auth-timing issues, or missing states?
12. The spec says Phase 2 routes `license` → `/license-lookup` and the sub-step progression within Phase 3.3-3.5 is tracked elsewhere. Is that model correct, or does the v4 schema track a sub-step that Phase 2 routing should be aware of?

### E. Airtable and Make dead code identification

13. Is the list of dead code in DQ-8 (Section 1, and implementation tasks 2.2-4 through 2.2-13) complete? Are there any other Airtable or Make references in the P1/P2/P3 projects that Phase 2 should remove but the spec missed?
14. The spec defers Make webhook removal from `IdmeCallback.tsx` to Phase 3.1. Is that boundary correct — does Phase 2 work correctly if `IdmeCallback.tsx` still calls Make, given P2 is pointing at the new Supabase?

### F. RLS and security boundaries

15. Section 7.3 states there is no INSERT or UPDATE policy for the `authenticated` role directly on `profiles`. Does V4_MIGRATION_SQL.md confirm this? (OD-11 pattern)
16. Are there any other Lovable-reachable operations in Section 7.1 that should be flagged as risky or incorrect?
17. Is Section 7.2 (forbidden actions) complete? Are there trust-gate fields or operations missing from the "must not do" list?

### G. ENV and Supabase client

18. Are the three ENV var values in Section 3.1 correct for `wvzjfxacykgsaffskgtr`? (URL, publishable key, anon key)
19. Is the recommendation to use the publishable key format over the anon JWT reasonable for Lovable projects?

### H. Null-profile guard

20. Is the null-profile guard described in Section 6 sufficient for Phase 2? Is a full recovery Edge Function truly out of TASK-0022 scope, or does Phase 2 require one to be safe for production use?

### I. Implementation task completeness

21. Are the 14 implementation tasks in Section 8 complete and correctly ordered? Are there any dependencies that are wrong, missing tasks, or tasks that are out of Phase 2 scope?

### J. QA checklist

22. Are there any gaps in the 28-item Phase 2.4 QA checklist (Section 9) that would leave a Phase 2 regression undetected? Specifically: are the RLS isolation checks, routing checks, and dead-code-removal checks sufficient?

---

## Review Output Format

Return your findings using P1/P2/P3 severity (same convention as TASK-0019 Codex QA):

- **P1** — Blocking. Spec is wrong and TASK-0022 implementation will break or compromise security if executed as written. Must be corrected in TASK-0021.md before TASK-0022 is created.
- **P2** — Significant. Spec has an error or gap that will cause a Phase 2 implementation problem or create technical debt. Should be corrected before TASK-0022.
- **P3** — Note. Observation, edge case, or future-phase risk that does not block TASK-0022 but should be documented.

For each finding:

```
[P1/P2/P3] <Short title>
Section: <TASK-0021.md section reference>
Finding: <What is wrong or missing>
Correction: <What TASK-0021.md should say instead, or what should be added>
```

If a spec claim is verified correct, no finding is needed — only flag issues.

End with a summary verdict:

```
Verdict: [Approved / Approved with required fixes / Blocked — requires rework]
TASK-0022 unblocked: [Yes / No — pending fix to items X, Y]
```

---

## Out of Scope for This QA

- Reviewing any Lovable implementation code (none exists yet)
- Reviewing Supabase schema beyond what is needed to verify spec claims
- Phase 3 design review (trust gates, ID.me, Twilio, license lookup, selfie)
- TASK-0018 R4 remediation
- TASK-0020 bucket/policy review (completed and verified in TASK-0020)
