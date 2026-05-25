# FLOW-LICENSE-001 — License Lookup Schema

**Status:** Proposed  
**Owner:** Codex  
**Executor:** Claude  
**Approver:** David  
**Area:** Supabase / Database  
**Source flow:** `/docs/flows/05-PassTo-License-Data-Lookup-Flow-v2.0.md`  
**Created:** May 25, 2026

---

## 1. Objective

Create the Supabase schema needed to support PassTo license lookup, provider routing, status normalization, lookup attempt logging, and compact/NLC reference data.

This task creates durable database foundations only. It does **not** implement provider API calls, frontend screens, or credential issuance.

---

## 2. Context

PassTo must verify professional license data before issuing a wallet credential. The old Make/Airtable blueprint stored routing logic in Make Data Store and license records in Airtable. The updated architecture moves durable state into Supabase and keeps external API orchestration in Vercel backend code.

This schema must support:

- Initial onboarding license lookup.
- Retry after lookup failure.
- Additional license activation.
- On-demand refresh.
- Scheduled refresh.
- Admin-triggered recheck.
- Credential revocation when a previously active license becomes non-active.

---

## 3. Scope

### In scope

Create or update Supabase tables for:

1. `licenses`
2. `license_source_routes`
3. `license_providers`
4. `license_status_map`
5. `license_lookup_attempts`
6. `nlc_states`

Also include:

- Primary keys.
- Foreign keys.
- Useful indexes.
- Check constraints where appropriate.
- RLS policy stubs or implemented policies consistent with existing PassTo auth patterns.
- Seed data for canonical license statuses and initial provider metadata if safe.

### Out of scope

- Calling RapidAPI or any state board API.
- Implementing Vercel API routes.
- Implementing frontend screens.
- Implementing data-matching logic.
- Implementing credential revocation logic.
- Creating Stripe/payment behavior.

---

## 4. Required Tables

## 4.1 `licenses`

Stores normalized license lookup results.

Required columns:

- `id uuid primary key default gen_random_uuid()`
- `nurse_id uuid not null references nurses(id)`
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
- `source_type text not null`
- `source_name text not null`
- `source_url text`
- `last_verified_at timestamptz`
- `primary_license boolean not null default false`
- `verification_payload jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Required constraints:

- `status` limited to canonical statuses: `active`, `inactive`, `suspended`, `revoked`, `pending_renewal`, `registered`, `other`.
- `source_type` limited to `direct`, `vendor`, `manual`.
- `state` should be uppercase two-character state/DC code.

Required indexes:

- `(nurse_id)`
- `(nurse_id, primary_license)`
- `(state, license_type)`
- `(license_number_normalized, state)`
- `(status)`

Recommended unique/partial index:

- Only one primary license per nurse where `primary_license = true`.

## 4.2 `license_source_routes`

Controls routing by state and license type.

Required columns:

- `id uuid primary key default gen_random_uuid()`
- `state text not null`
- `license_type text`
- `route_type text not null`
- `provider_key text`
- `is_active boolean not null default true`
- `coverage_gap_message text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Required constraints:

- `route_type` limited to `direct`, `vendor`, `unavailable`.
- `state` uppercase two-character state/DC code.

Required indexes:

- `(state, license_type)`
- `(state)`
- `(route_type)`
- `(provider_key)`

Uniqueness:

- Unique active route per `(state, license_type)` when `license_type is not null`.
- Unique active state-level route per `state` when `license_type is null`.

## 4.3 `license_providers`

Stores non-secret provider metadata.

Required columns:

- `provider_key text primary key`
- `display_name text not null`
- `provider_type text not null`
- `base_url text`
- `auth_env_key_name text`
- `host_env_key_name text`
- `supports_license_verify boolean not null default true`
- `supports_name_search boolean not null default false`
- `returns_dob boolean not null default false`
- `returns_compact_status boolean not null default false`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Required constraints:

- `provider_type` limited to `direct_board`, `vendor`.

Security rule:

- Do not store actual API keys in this table.

## 4.4 `license_status_map`

Maps raw provider statuses to PassTo canonical statuses.

Required columns:

- `id uuid primary key default gen_random_uuid()`
- `provider_key text references license_providers(provider_key)`
- `raw_status text not null`
- `normalized_status text not null`
- `credential_eligible boolean not null default false`
- `requires_manual_review boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Required constraints:

- `normalized_status` limited to canonical statuses.

Required indexes:

- `(provider_key, raw_status)`
- `(normalized_status)`
- `(credential_eligible)`

Uniqueness:

- Unique `(provider_key, raw_status)`.

Seed mappings:

- `Active` → `active`, eligible true
- `Good Standing` → `active`, eligible true
- `Current` → `active`, eligible true
- `Delinquent` → `inactive`, eligible false
- `Expired` → `inactive`, eligible false
- `Disciplinary` → `suspended`, eligible false
- `Suspended` → `suspended`, eligible false
- `Revoked` → `revoked`, eligible false
- `Pending Renewal` → `pending_renewal`, eligible false

## 4.5 `license_lookup_attempts`

Operational log for every lookup attempt.

Required columns:

- `id uuid primary key default gen_random_uuid()`
- `nurse_id uuid not null references nurses(id)`
- `license_id uuid references licenses(id)`
- `submitted_license_number text not null`
- `submitted_state text not null`
- `submitted_license_type text not null`
- `route_type text`
- `provider_key text`
- `attempt_status text not null`
- `http_status int`
- `error_code text`
- `error_message text`
- `started_at timestamptz not null default now()`
- `completed_at timestamptz`
- `created_at timestamptz not null default now()`

Required constraints:

- `attempt_status` limited to `success`, `not_found`, `source_unavailable`, `coverage_gap`, `provider_error`, `missing_required_field`, `license_number_mismatch`.

Required indexes:

- `(nurse_id)`
- `(license_id)`
- `(submitted_state)`
- `(provider_key)`
- `(attempt_status)`
- `(created_at)`

## 4.6 `nlc_states`

Reference table for Nurse Licensure Compact state membership.

Required columns:

- `state text primary key`
- `is_nlc_member boolean not null default false`
- `effective_date date`
- `last_confirmed_at timestamptz`
- `source_url text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Do not hardcode NLC behavior in application code. Use this table as reference data.

---

## 5. RLS Requirements

Implement policies consistent with the existing PassTo auth model.

Minimum expected behavior:

- Nurses can read their own `licenses` rows.
- Nurses cannot directly insert, update, or delete verified license rows.
- Nurses should not directly access `license_lookup_attempts` unless a narrow read policy is intentionally approved.
- Route/provider/status/NLC tables are readable by service role and optionally admin only.
- Route/provider/status/NLC tables are not writable by nurses.
- Backend service role performs trusted writes.

If existing auth helpers or role tables are not yet available, include policy placeholders and document the dependency.

---

## 6. Migration Requirements

- Use a Supabase migration file.
- Migration name should be descriptive, for example: `create_license_lookup_schema`.
- DDL must be idempotent where practical.
- Do not hardcode generated UUIDs in seed data.
- Do not store provider secrets.
- Include comments where schema decisions are non-obvious.

---

## 7. Acceptance Criteria

- [ ] All six required tables exist.
- [ ] `licenses` supports normalized license records with source attribution.
- [ ] `license_source_routes` supports state-level and license-type-specific routing.
- [ ] `license_providers` stores non-secret provider metadata only.
- [ ] `license_status_map` maps raw provider strings to canonical statuses.
- [ ] `license_lookup_attempts` can record success and all defined failure classes.
- [ ] `nlc_states` exists as maintained reference data.
- [ ] Canonical status constraints prevent invalid status values.
- [ ] Source type constraints prevent invalid source types.
- [ ] Attempt status constraints prevent invalid attempt states.
- [ ] Useful indexes are present for lookup, routing, support, and refresh paths.
- [ ] Only one primary license per nurse is allowed.
- [ ] RLS prevents nurses from writing verified license results directly.
- [ ] Provider secrets are not stored in the database.
- [ ] Seed data includes initial status mappings.
- [ ] Migration runs successfully on a clean Supabase database.

---

## 8. Definition of Done

This task is done when:

1. Migration exists in the repo.
2. Migration applies cleanly.
3. Tables, constraints, indexes, and RLS behavior are verified.
4. Seed status mappings are present.
5. No provider secrets are stored in Supabase.
6. Claude documents any deviations or blockers in the task result.
7. David/Codex can use the schema as the foundation for backend license lookup work.

---

## 9. Notes for Claude

Be conservative with schema changes. If an existing table from the broader PassTo database blueprint conflicts with this task, do not fork the model silently. Flag the conflict and propose the smallest adjustment.

The most important design principle: users can submit lookup requests, but only trusted backend code can write verified license results.
