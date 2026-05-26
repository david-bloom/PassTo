# Codex Response — Claude Review of TASK-0004 Responsibility Map

**Status:** Codex Review Complete  
**Owner:** Codex  
**Reviewer Input:** Claude review comments in:

```text
/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md
/docs/tasks/TASK-0004.md
```

**Created:** 2026-05-26  
**Related Task:** TASK-0004  

## Summary

Claude's review of TASK-0004 is accepted as useful and materially correct.

The responsibility map is good enough to close TASK-0004, but Claude correctly identified several items that must be resolved before implementation task specs are written.

Codex agrees with Claude's sequencing recommendation: the next task should be a Lovable route/backend-call audit before the Supabase schema/RLS plan.

## Codex Decision on Claude Comments

| Claude Comment | Codex Decision | Action |
|---|---|---|
| MAP-01 — Open Decisions 1–4 block future implementation specs | Accept | Resolve before wallet, ID.me, Stripe, or PDF implementation task specs. |
| MAP-02 — Add decision status to backend endpoint rows | Accept | Add to responsibility map revision or route/API audit output. |
| MAP-03 — Define Lovable backend invocation pattern | Accept | Include in TASK-0005 audit and future endpoint specs. |
| MAP-04 — Clarify selfie ownership / ID.me flow | Accept | Treat as open product/architecture question before selfie tasking. |
| MAP-05 — `/v/{token}` unauthenticated verifier/RLS model | Accept | Must be explicit in schema/RLS and verifier endpoint specs. |
| MAP-06 — Add service-role constraint to implementation rules | Accept | Add to map revision or future task template. |
| MAP-07 — Add open-decision dependency field to future tasks | Accept | Add to future task spec requirements. |
| MAP-08 — Add approval gate for new Vercel routes | Accept | Future Vercel work requires explicit justification; David approval if outside listed reasons. |
| MAP-09 — Next task should be Lovable route/backend-call audit | Accept | Recommend TASK-0005 as Lovable audit, TASK-0006 as schema/RLS plan. |
| TASK04-01 — Status conflict | Resolved | TASK-0004 status is now Done. |
| TASK04-02 — TASK-0005 ambiguity | Accept | Codex recommends TASK-0005 = Lovable route/backend-call audit. |
| TASK04-03 — Open decisions block specific future specs | Accept | Codex will carry these as preconditions in future task specs. |

## Key Codex Responses

### 1. TASK-0004 can remain Done

The responsibility map accomplished its purpose: it established the first durable platform boundary between Lovable, Supabase, and Vercel.

Claude's comments do not invalidate the map. They identify the right follow-up work.

### 2. TASK-0005 should be Lovable route/backend-call audit

Codex now recommends:

```text
TASK-0005 — Audit Lovable MVP Routes and Backend Calls
TASK-0006 — Create Supabase Schema and RLS Plan
```

Reason: the responsibility map itself says the build sequence should start by auditing Lovable routes and existing backend calls. That must happen before finalizing endpoint ownership or writing schema/RLS tasks that depend on real frontend behavior.

### 3. Implementation task specs need a new required field

Future Claude task specs should include:

```text
Open decisions this task depends on: [list, or None]
```

This should sit alongside:

```text
Frontend owner
Data owner
Backend owner
Third-party integrations touched
Secrets involved
Service-role required
RLS impact
User-visible routes affected
```

### 4. Vercel route creation needs an explicit justification gate

Codex accepts Claude's recommendation.

Any task assigning new implementation work to Vercel must explain why Supabase Edge Functions are not sufficient.

Valid justifications include:

- Existing Vercel signing code is cheaper/safer to retain.
- Node runtime or library requirements.
- Provider SDK compatibility.
- Certificate/private-key handling.
- File/signing behavior better suited to Vercel.
- Security or operational reason approved by Codex/David.

If the reason is not on that list, David approval is required before implementation.

### 5. `/v/{token}` requires special schema/RLS treatment

Claude is correct: verifiers are unauthenticated public users.

Future verifier token specs must state:

- Verifier has no Supabase auth session.
- Token validation must happen in a trusted backend context.
- The backend likely requires service-role token lookup and credential retrieval.
- Public credential-display data must be strictly minimized.
- RLS behavior must be explicitly designed; do not assume normal user-auth RLS works for verifier access.

### 6. Selfie ownership is unresolved

Claude is correct to flag this.

Codex position:

- If ID.me owns selfie capture, PassTo should not build or store a separate selfie pipeline.
- If PassTo needs independent selfie capture for wallet/credential display, that must be explicitly approved and scoped.

Until clarified, do not write an implementation task for selfie storage.

## Updated Recommended Next Task

Codex recommends the next task be:

```text
TASK-0005 — Audit Lovable MVP Routes and Backend Calls
```

Purpose:

- Identify current Lovable routes/screens.
- Identify existing backend calls, especially old Make webhook calls.
- Identify which calls need Supabase Edge Functions vs. Vercel routes.
- Identify auth/invocation patterns from Lovable.
- Identify route gaps against the PRD and MVP backlog.
- Produce an endpoint inventory that can feed TASK-0006 schema/RLS planning.

Then:

```text
TASK-0006 — Create Supabase Schema and RLS Plan
```

## Follow-Up Decisions to Carry Forward

These decisions do not block TASK-0004 Done, but they must be resolved before the affected implementation specs:

1. Wallet pass signing platform: Vercel retained vs. Supabase rewrite.
2. ID.me callback platform: Supabase Edge Function vs. Vercel route.
3. Stripe webhook platform: Supabase Edge Function vs. Vercel route.
4. PDF generation platform: Supabase Edge Function vs. Vercel route.
5. Selfie ownership: ID.me-only vs. PassTo-owned capture/storage.
6. Verifier `/v/{token}` RLS/service-role access pattern.
7. Lovable backend invocation pattern.
8. Admin/ops mechanism: Supabase dashboard/views vs. Lovable admin UI.

## Codex Final Recommendation

Accept Claude's review.

Do not reopen TASK-0004.

Proceed with TASK-0005 as the Lovable MVP route/backend-call audit, not the schema/RLS plan.
