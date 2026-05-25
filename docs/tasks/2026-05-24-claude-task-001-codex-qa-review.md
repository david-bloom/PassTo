# Codex QA Review — Claude Task 001 — Supabase MVP Schema Spike

**Reviewed By:** Codex — Architect & Engineering Director  
**Review Date:** 2026-05-24  
**Artifact Reviewed:** `/docs/tasks/2026-05-24-claude-task-001-supabase-schema-implementation.md`  
**Related Issue:** #1 — Codex QA Review: Claude Task 001 — Supabase MVP Schema Spike  
**QA Result:** Changes Required  
**Migration Approval:** Not Approved  
**Recommended Status:** Needs Claude Remediation  

---

## Executive QA Summary

Claude successfully produced a substantive schema spike artifact and corrected the prior source-of-truth gap by committing the implementation artifact to GitHub.

The artifact is strong as a first engineering spike. It includes a migration SQL draft, RLS policy plan, schema rationale, challenge log, open questions, and self-QA.

However, Codex does not approve this migration for execution yet.

There are blocking issues that must be remediated before the schema can become the MVP migration baseline.

The largest concerns are:

1. The verifier/share schema diverges from the approved product architecture.
2. Verifier data collection includes organization despite the approved MVP rule of name/email only.
3. Verifier email appears nurse-readable through RLS, conflicting with approved privacy behavior.
4. Share tokens are stored as raw tokens instead of token hashes.
5. Share creation is nurse-client insertable, which risks bypassing payment and entitlement gates.
6. License status and wallet treatment values do not match the approved status translation model.
7. Account deletion/data retention remains unresolved and blocks production migration.
8. Payment tracking for paid refresh/PDF/share actions is under-modeled for confirmed MVP pricing.

---

## QA Decision

```text
Result: Changes Required
Migration Execution: Not Approved
Task Status: Needs Claude Remediation
David Approval Needed Before Migration: Yes
```

Claude may revise the schema artifact. Claude may not apply this migration to Supabase.

---

## Positive Findings

### 1. Claude committed the required source-of-truth artifact

The implementation artifact exists in GitHub and is reviewable.

This resolves the prior process blocker where Claude's work existed only in chat.

### 2. `licenses` table addition is correct

Codex agrees that `licenses` is MVP-critical.

PassTo cannot function without a durable license table storing source lookup results and status translation fields.

### 3. Removing `organizations` and `organization_members` is directionally correct for MVP

Codex agrees with removing organization-centric tables from MVP.

PassTo MVP is individual-nurse B2C. Verifiers do not have accounts.

### 4. Service-role verifier access is directionally correct

Codex agrees that verifiers should not receive broad Supabase anon-role access.

Verifier credential access should be mediated through Vercel/API/service-role validation of short-lived tokens.

### 5. Challenge log is useful

Claude properly identified several issues requiring Codex or David decisions.

This is exactly the right behavior for a senior engineer challenge log.

---

## Blocking Issues Requiring Remediation

### BLOCKER 1 — Verifier/share schema diverges from approved architecture

**Finding**

Claude modeled verifier access as:

```text
pass_shares
pass_recipients
review_sessions
review_events
```

The approved product-attributes architecture uses these conceptual entities:

```text
verification_tokens
verifiers
verification_events
```

**Why this matters**

The current schema may work technically, but it creates naming and conceptual drift from the canonical docs created in TASK-0002.

PassTo needs consistent vocabulary before database migration.

**Required remediation**

Claude must do one of the following:

1. Rename/restructure the schema to align with the canonical architecture:

```text
verification_tokens
verifiers
verification_events
```

or

2. Propose a deliberate architecture change explaining why `pass_shares`, `pass_recipients`, `review_sessions`, and `review_events` are better MVP names/entities.

If option 2 is chosen, Codex and David must approve the terminology change before migration.

**Codex recommendation**

Use canonical names from TASK-0002 unless there is a strong implementation reason not to.

---

### BLOCKER 2 — Verifier organization is collected despite approved MVP rule

**Finding**

The schema includes:

```sql
verifier_organization text
```

inside `pass_recipients`.

**Approved product rule**

Verifier entry form collects only:

```text
Name
Email
```

No organization, title, phone, address, or extra verifier information is collected in MVP.

**Required remediation**

Remove `verifier_organization` from the MVP schema.

If organization is desired later, it should be a future enhancement requiring David approval.

---

### BLOCKER 3 — Verifier email appears nurse-readable

**Finding**

RLS allows nurses to select their own `pass_recipients` records, which include `verifier_email`.

**Approved product rule**

Verifier email is not displayed to the nurse.

**Why this matters**

Table-level RLS cannot hide a specific column if the nurse can select the row through normal client queries.

**Required remediation**

Use one of these patterns:

1. Do not allow nurse direct SELECT on the verifier table. Expose only safe derived fields through an API/view.
2. Split verifier private contact fields into a separate service-role-only table.
3. Create a nurse-safe view that excludes `verifier_email` and grant/select through that path only.

**Codex recommendation**

For MVP simplicity: keep verifier private fields service-role-only, and expose nurse-safe verification history through a dedicated API response or view.

---

### BLOCKER 4 — Raw share tokens are stored in the database

**Finding**

The schema stores:

```sql
share_token text not null unique default encode(gen_random_bytes(32), 'hex')
```

**Why this matters**

A verifier token grants access to credential information. Treat it as a secret.

If raw tokens are stored, database leakage exposes active verifier access.

**Required remediation**

Store a token hash, not the raw token.

Recommended pattern:

```text
token_hash
expires_at
used_at
revoked_at
status
```

The raw token should be generated by the server, returned once to the nurse/share flow, and never stored directly.

---

### BLOCKER 5 — Nurse direct insert into share tokens risks bypassing payment/entitlement gates

**Finding**

The RLS policy allows nurses to insert their own `pass_shares` records.

**Why this matters**

Share creation is tier- and payment-gated:

- Free share access costs $1.99.
- Standard/Premier include sharing.
- Token generation must occur only after payment/entitlement validation.

If the client can insert share rows directly, it may bypass the business rules unless all checks are enforced elsewhere.

**Required remediation**

Remove direct nurse INSERT for share/token creation.

Token creation should happen through a Vercel/API/service-role route that validates:

- Authenticated nurse.
- Credential ownership.
- Tier entitlement.
- Payment success where required.
- TTL.
- One-time token state.

Nurses may read safe share history, but should not directly insert raw token rows.

---

### BLOCKER 6 — License status model does not match approved status translation system

**Finding**

Claude uses:

```text
raw_status
normalized_status
display_status
wallet_treatment
```

with values like:

```text
Active / Inactive / Expired / Surrendered / Revoked / Suspended / Unknown
green / yellow / red / grey
```

**Approved direction**

PassTo needs:

```text
source_status_raw
source_status_display
normalized_status
status_intent
wallet_pass_treatment
status_checked_at
```

and wallet treatment should express product intent, not color names:

```text
valid
caution
invalid
do_not_issue
```

**Required remediation**

Rename and normalize the status fields to match the approved model.

Raw source `unknown` must be treated as a verification failure and should not issue or update a credential as valid.

Active licenses with fewer than 30 days until expiration should receive `wallet_pass_treatment = caution`.

---

### BLOCKER 7 — Token status is under-modeled

**Finding**

The schema uses:

```text
is_active
used_at
revoked_at
expires_at
```

but does not have the approved mutually exclusive token status field.

**Approved rule**

Token statuses are mutually exclusive:

```text
active
used
expired
replaced
revoked
payment_failed
generation_failed
```

If a token is used, it remains `used` and does not later become `expired`.

**Required remediation**

Add an explicit token status field or document why derived status is preferable.

Codex recommendation: use explicit `status` plus timestamps for auditability.

---

### BLOCKER 8 — Paid action tracking is insufficient for MVP pricing

**Finding**

The schema links `stripe_payment_intent_id` to `pass_shares`, but paid refresh and PDF export are confirmed MVP actions and are not modeled with dedicated payment/action tracking.

**Confirmed MVP pricing**

- Share link: $1.99 where paid.
- On-demand refresh: $1.99 where paid.
- PDF export: $1.99 for Free.
- Additional license: $4.99.

**Required remediation**

Add or propose a generic paid-action table before migration.

Codex recommendation:

```text
purchases
- id
- profile_id
- action_type: share_token / refresh / pdf_export / additional_license
- stripe_payment_intent_id
- amount_cents
- status
- related_entity_type
- related_entity_id
- created_at
```

This avoids one-off payment fields scattered across product tables.

---

### BLOCKER 9 — PDF export and refresh event tables are missing or deferred

**Finding**

The canonical TASK-0002 architecture called out:

```text
pdf_exports
refresh_events
notification_events
jobs
```

Claude modeled some adjacent concepts, but not these core event/job tables.

**Required remediation**

Claude should explicitly decide and document which of these are MVP migration tables and which are deferred:

- `pdf_exports`
- `refresh_events`
- `notification_events`
- `jobs`

Codex recommendation:

At minimum, include `refresh_events` and `purchases` for MVP. Include `jobs` if refresh/PDF generation will be asynchronous. PDF exports can be modeled through `purchases` plus storage reference if we want to stay lean.

---

### BLOCKER 10 — Data retention/account deletion policy blocks production migration

**Finding**

Claude correctly flagged account deletion/data retention as an open blocker.

Current schema uses cascading deletes in many places.

**Why this matters**

Credential verification records, verifier access events, audit events, and payment records may need retention even if a nurse account is closed.

**Required remediation**

David must choose an MVP retention posture before production migration.

Codex recommendation for MVP:

- Do not hard-delete accounts immediately.
- Use `deleted_at` / deactivated status on profiles.
- Retain audit/payment/verification records for a defined period.
- Remove or anonymize unnecessary personal data when deletion is requested, subject to legal/product policy.

This does not need a perfect enterprise retention framework, but we need a conscious MVP policy.

---

## Non-Blocking Issues / Improvements

### N1 — `profiles` insert policy may not be needed

If profiles are created by a trigger from `auth.users`, direct authenticated insert may be unnecessary.

Codex recommends relying on the trigger and service role unless there is a clear app need for client-side profile insert.

### N2 — `updated_at` fields need triggers or service update discipline

Many tables include `updated_at`, but the migration does not define an auto-update trigger.

Either add a generic `set_updated_at()` trigger or document that application/service updates must maintain it.

### N3 — `wallet_passes` needs provider uniqueness

If one pass can have Apple and Google wallet records, add:

```sql
unique(pass_id, provider)
```

If only one wallet record is allowed, add:

```sql
unique(pass_id)
```

Claude flagged this; Codex agrees it needs a decision before implementation.

### N4 — `stripe_subscriptions.plan_name` nullable may create ambiguous entitlement state

Consider defaulting new/no-subscription users to Free in application logic or schema.

Do not rely on nullable plan state for entitlement enforcement without a clear fallback.

### N5 — `email` should likely be `citext` or normalized

For uniqueness, lookups, and safer comparisons, use normalized lowercase email or Postgres `citext` if enabled.

This is not a migration blocker but should be considered.

---

## Required Claude Remediation Checklist

Claude should revise the artifact and respond with:

```markdown
## Claude Remediation Response — Task 001

### Changes Made

- 

### Blocking Issues Addressed

- [ ] BLOCKER 1 — Verifier/share schema naming alignment
- [ ] BLOCKER 2 — Remove verifier organization
- [ ] BLOCKER 3 — Prevent nurse access to verifier email
- [ ] BLOCKER 4 — Store token hashes, not raw tokens
- [ ] BLOCKER 5 — Move share/token creation behind service route
- [ ] BLOCKER 6 — Align license status fields and wallet treatment values
- [ ] BLOCKER 7 — Add explicit mutually exclusive token status or justify derived status
- [ ] BLOCKER 8 — Add/justify paid action tracking
- [ ] BLOCKER 9 — Resolve MVP event/job tables
- [ ] BLOCKER 10 — Flag data retention decision for David before migration

### Updated Files

- 

### Remaining Questions

- 

### Can Codex Re-Review?

Yes / No
```

---

## David Decisions Needed

Before migration execution, David must decide:

1. MVP data retention/account deletion posture.
2. Whether Free users may buy additional licenses in MVP or additional licenses are hidden for Free.
3. Final Standard/Premier subscription prices before Stripe setup.
4. Token TTL for live verifier access tokens.
5. Whether MVP needs dedicated `pdf_exports`, `refresh_events`, and `jobs`, or whether a leaner paid-action/event model is sufficient.

Codex can recommend defaults for these in a follow-up architecture decision brief.

---

## Codex Recommendation

Claude should remediate the schema artifact before any migration PR or Supabase execution.

Recommended next status:

```text
Needs Claude Remediation
```

Recommended issue labels:

```text
assigned: claude
needs: claude-response
status: blocked
```

Do not apply the current SQL to Supabase.

---

## Final QA Result

```text
Codex QA Result: Changes Required
Migration Approval: Not Approved
Safe to Apply to Supabase: No
Ready for David Done Review: No
Next Owner: Claude
```
