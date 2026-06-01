-- ============================================================
-- Migration E (revised): onboarding_attempts additions
-- TASK-0045 — ID.me-first onboarding — P1 remediation
--
-- The table was created in an earlier partial migration.
-- This migration adds the missing security/state fields.
--
-- Requires David approval. Apply via Supabase dashboard SQL Editor.
-- Apply BEFORE deploying idme-verification-start, idme-exchange-v2 v3, create-account v2.
-- ============================================================

-- 1. Add PKCE / state fields (nullable to support existing rows)
--    New rows created by idme-verification-start will always set both.
alter table public.onboarding_attempts
  add column if not exists state_hash               text,
  add column if not exists code_verifier_ciphertext text,
  add column if not exists consumed_at              timestamptz;

-- 2. Update state CHECK to add 'account_creating'
--    Drop existing constraint by its likely name; adjust name if the migration errors.
alter table public.onboarding_attempts
  drop constraint if exists onboarding_attempts_state_check;

alter table public.onboarding_attempts
  add constraint onboarding_attempts_state_check
  check (state in (
    'started',          -- created by idme-verification-start; PKCE fields set
    'id_verified',      -- idme-exchange-v2 succeeded; identity fields populated
    'account_creating', -- create-account atomically claimed; Auth user creation in progress
    'linked',           -- Auth user + profile created and linked to this attempt
    'abandoned',        -- exchange or account creation failed; attempt invalidated
    'expired'           -- attempt reached expires_at without completion
  ));

-- 3. Drop the existing partial unique index; recreate with expiry guard
--    The old index allowed rows whose expires_at had passed to block new attempts.
drop index if exists public.onboarding_attempts_active_subject_idx;
drop index if exists public.onboarding_attempts_active_idme_subject_idx;

create unique index onboarding_attempts_active_idme_subject_idx
  on public.onboarding_attempts (idme_subject)
  where
    state not in ('linked', 'abandoned', 'expired')
    and idme_subject is not null
    and expires_at > now();

-- 4. Expiry cleanup function
--    Run manually or schedule. Marks stale non-terminal attempts as expired.
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
