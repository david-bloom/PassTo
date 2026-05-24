# PassTo Claude Task 001 — Supabase MVP Schema Spike

Date: 2026-05-24
Status: Assigned
Owner: Claude
Approver: David
Reviewer: Codex
Task Type: Architecture / Database / Migration Design
Target Session Length: One focused working session

## Purpose

Test the PassTo team operating charter by giving Claude one executable database task with clear boundaries, deliverables, challenge authority, and QA review expectations.

This task is not the full PassTo database build. It is the first controlled Supabase schema spike needed before production migration execution.

## Working Session Scope

Claude should produce a first-pass Supabase/Postgres MVP schema package for PassTo that is complete enough for Codex review, but not yet applied to production without David approval.

The scope is limited to:

1. Core account ownership model
2. MVP pass/share/review model
3. External integration reference tables
4. Minimal audit trail
5. RLS policy draft and access-boundary notes
6. Challenge log

The output should be SQL-first and reviewable.

## Explicit Non-Scope

Claude must not implement the full product backend in this session.

Claude must not include:

- Full admin dashboard schema
- Advanced analytics/event warehouse
- Referral system
- Template marketplace
- Enterprise multi-brand permissions
- Notification preference center
- Complex lifecycle automation engine
- Full archival/versioning system beyond basic audit events
- Vendor-internal Stripe, PassKit, Twilio, or Postmark schemas
- Edge functions
- Seed data beyond minimal examples if needed for testing
- Production migration execution without Codex review and David approval

## Required Inputs

Claude should work from the following PassTo assumptions:

- Supabase is the database/backend core.
- Vercel is the frontend/deployment layer.
- Stripe handles payments and subscription state.
- PassKit likely handles wallet pass infrastructure.
- Postmark and/or Twilio handle outbound communications.
- David is Product Owner and final approver.
- Codex owns architecture, task specification, QA, and governance.
- Claude executes approved specs and is expected to challenge weak architecture or unclear scope.

## Required Deliverables

Claude must return five sections.

### 1. Migration SQL Draft

A single SQL migration draft that creates the MVP schema foundation.

Expected table candidates:

- `profiles`
- `organizations`
- `organization_members`
- `passes`
- `pass_recipients`
- `pass_shares`
- `review_sessions`
- `review_events`
- `stripe_customers`
- `stripe_subscriptions`
- `wallet_passes`
- `communication_events`
- `audit_events`

Claude may challenge this table list, but must explicitly explain any removal, rename, or addition.

The SQL should include:

- Primary keys
- Foreign keys
- Required indexes
- Appropriate uniqueness constraints
- Basic check constraints or enums where useful
- `created_at` and `updated_at` timestamps where appropriate
- `gen_random_uuid()` UUID primary keys unless a better Supabase-native choice is justified
- Explicit comments for non-obvious design choices

### 2. RLS Policy Draft

Claude must include an RLS plan or draft SQL that distinguishes:

- Authenticated account/organization users
- Organization membership access
- Public share/review access
- Service-role-only integration writes

Claude should enable RLS on sensitive business tables in the draft unless intentionally deferred with explanation.

### 3. Schema Rationale

Claude must explain:

- Why each table exists
- What each table owns
- Which tables are MVP-critical versus integration placeholders
- How the public review/share flow avoids exposing owner account data
- How vendor references are modeled without over-copying external vendor internals

### 4. Challenge Log

Claude must explicitly challenge the assignment where needed.

Required format:

| Concern | Severity | Recommendation | Requires David Decision? |
|---|---:|---|---|

Claude should flag over-complexity, missing concepts, weak access boundaries, or future migration risk.

### 5. Open Questions

Claude must list open questions for David/Codex, separated into:

- Blocking before migration execution
- Non-blocking before MVP build
- Later product decisions

## Acceptance Criteria

The task is complete only when:

- SQL is syntactically plausible for Supabase/Postgres.
- Every proposed table has a clear owner/purpose.
- Every core relationship has a foreign key or an explicit reason for avoiding one.
- Public share/review flows are modeled without exposing account-private data.
- Stripe, PassKit, Postmark, and Twilio are referenced but not over-modeled.
- RLS is addressed table-by-table.
- Claude documents assumptions and unresolved questions.
- Claude stays inside MVP scope or clearly labels any proposed expansion.
- Codex can review the output without needing to infer hidden decisions.

## QA Instructions for Codex After Claude Returns Work

Codex will review against this checklist:

### Schema correctness

- Does the migration avoid Airtable-style weak typing?
- Are primary keys, foreign keys, uniqueness constraints, and indexes credible?
- Are nullable fields intentional?
- Are status fields constrained?
- Is timestamp behavior consistent?

### Supabase fit

- Does the schema align with `auth.users` without duplicating auth?
- Are RLS boundaries credible?
- Are service-role-only writes identified for webhooks/integrations?
- Are public token/share flows handled safely?

### MVP discipline

- Did Claude avoid building future enterprise features too early?
- Are integration tables thin references rather than vendor mirrors?
- Is the schema stable enough to evolve without early over-engineering?

### Security/privacy

- Can a public reviewer access only what they need?
- Can an organization member only access organization-owned data?
- Are audit and communication records protected?
- Are tokens/secrets avoided or safely represented?

### Operating charter compliance

- Did Claude challenge unclear or risky requirements?
- Did Claude avoid unapproved rescoping?
- Did Claude return a challenge log and open questions?
- Is David clearly reserved as final approver?

## Required Claude Response Format

Claude should respond using this structure:

1. Summary
2. Migration SQL Draft
3. RLS Policy Draft / Plan
4. Schema Rationale
5. Challenge Log
6. Open Questions
7. Self-QA Against Acceptance Criteria

## Assignment Text to Claude

Claude, execute PassTo Task 001: Supabase MVP Schema Spike.

Your job is to produce a reviewable Supabase/Postgres schema package, not to build the entire backend. Stay inside MVP foundation scope. You have standing authority to challenge architecture, table scope, RLS assumptions, or future migration risk, but you may not independently expand MVP scope without labeling it as a recommendation.

Return the seven required sections exactly. Codex will QA your output against the acceptance criteria and David remains final approver.
