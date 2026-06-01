-- ============================================================
-- Migration E v3 (supersedes v2 — v2 was never applied)
-- onboarding_attempts: add PKCE/state fields, fix nullability,
-- fix partial index, add state-aware constraints, revoke excess grants
--
-- TASK-0045 — ID.me-first onboarding — P1 remediation
-- Requires David approval. Apply via Supabase dashboard SQL Editor.
-- Apply BEFORE deploying idme-verification-start, idme-exchange-v2,
-- and create-account from the remediated GitHub source.
-- ============================================================

-- 1. Add missing columns (nullable — pre-exchange rows won't have all fields)
alter table public.onboarding_attempts
  add column if not exists state_hash               text,
  add column if not exists code_verifier_ciphertext text,
  add column if not exists consumed_at              timestamptz;

-- 2. Relax NOT NULL on idme_subject and id_verification_level.
--    idme-verification-start inserts a 'started' row BEFORE calling ID.me,
--    so neither field is known yet at insert time.
alter table public.onboarding_attempts
  alter column idme_subject          drop not null,
  alter column id_verification_level drop not null;

-- 3. Update the state CHECK constraint to add 'account_creating'.
alter table public.onboarding_attempts
  drop constraint if exists onboarding_attempts_state_check;

alter table public.onboarding_attempts
  add constraint onboarding_attempts_state_check
  check (state in (
    'started',          -- created by idme-verification-start; PKCE fields set
    'id_verified',      -- exchange succeeded; identity fields populated
    'account_creating', -- create-account atomically claimed this attempt
    'linked',           -- Auth user + profile created and linked
    'abandoned',        -- exchange or account creation failed
    'expired'           -- reached expires_at without completion
  ));

-- 4. State-aware field constraints.
--    started: must have state_hash + code_verifier_ciphertext (set by start fn)
--    id_verified / account_creating / linked: must have idme_subject + id_verification_level
--    linked: must have profile_id
alter table public.onboarding_attempts
  drop constraint if exists onboarding_attempts_started_fields_check,
  drop constraint if exists onboarding_attempts_verified_fields_check,
  drop constraint if exists onboarding_attempts_linked_fields_check;

alter table public.onboarding_attempts
  add constraint onboarding_attempts_started_fields_check
    check (
      state != 'started' or (
        state_hash is not null and code_verifier_ciphertext is not null
      )
    ),
  add constraint onboarding_attempts_verified_fields_check
    check (
      state not in ('id_verified', 'account_creating', 'linked') or (
        idme_subject is not null and id_verification_level is not null
      )
    ),
  add constraint onboarding_attempts_linked_fields_check
    check (
      state != 'linked' or profile_id is not null
    );

-- 5. Drop the old partial unique index (may have the wrong predicate).
drop index if exists public.onboarding_attempts_active_subject_idx;
drop index if exists public.onboarding_attempts_active_idme_subject_idx;

-- 6. Recreate partial unique index on durable state ONLY.
--    expires_at > now() is NOT valid in Postgres index predicates
--    (now() is not immutable). Use explicit state transitions to handle
--    expiry: call cleanup_expired_onboarding_attempts() before inserting
--    a new attempt for the same subject.
create unique index if not exists onboarding_attempts_active_idme_subject_idx
  on public.onboarding_attempts (idme_subject)
  where
    state not in ('linked', 'abandoned', 'expired')
    and idme_subject is not null;

-- 7. Revoke excess grants. RLS is already enabled and has no client policies,
--    but defense-in-depth: anon and authenticated should not hold any explicit
--    privileges on this table.
revoke all on public.onboarding_attempts from anon;
revoke all on public.onboarding_attempts from authenticated;

-- 8. Expiry cleanup function (idempotent — safe to call repeatedly).
create or replace function public.cleanup_expired_onboarding_attempts()
returns integer
language plpgsql
security definer
as $$
declare
  n integer;
begin
  update public.onboarding_attempts
  set state = 'expired', updated_at = now()
  where
    state in ('started', 'id_verified', 'account_creating')
    and expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;
