-- ============================================================
-- Migration J: License lookup search mode + onboarding step
-- constraint + complete_license_verification() RPC update
--
-- TASK-0048 — Re-instrument ID.me-First License Lookup Flow
-- David approved 2026-06-02
--
-- Apply via Supabase dashboard SQL Editor BEFORE deploying
-- license-lookup-start, license-lookup-select, confirm-info-status,
-- confirm-info-complete, or license-lookup-status.
--
-- Part 1: Extend license_lookups with search-mode tracking columns.
-- Part 2: Add 'license_checking' and 'confirm' to profiles.onboarding_step
--         CHECK constraint (drops and recreates with full step set).
-- Part 3: Update complete_license_verification() RPC to:
--   - Accept 'license' OR 'license_checking' as valid source steps.
--   - Advance onboarding_step to 'confirm' instead of 'phone'.
--   - Preserve all Migration H security hardening (search_path,
--     revoke public/anon/authenticated, grant service_role only).
-- ============================================================


-- ── Part 1: Extend license_lookups ───────────────────────────────────────────

alter table public.license_lookups
  add column if not exists submitted_license_number text,
  add column if not exists submitted_state           text,
  add column if not exists submitted_license_type    text,
  add column if not exists search_mode               text,
  add column if not exists candidate_data            jsonb,
  add column if not exists completed_at              timestamptz;

-- Fix stale default on lookup_source (was 'propelus', now set by Edge Function)
alter table public.license_lookups
  alter column lookup_source set default null;

comment on column public.license_lookups.submitted_license_number
  is 'Null when search_mode = search (nurse did not provide license number).';
comment on column public.license_lookups.submitted_state
  is 'State submitted by nurse on /license-info.';
comment on column public.license_lookups.submitted_license_type
  is 'License type submitted by nurse on /license-info.';
comment on column public.license_lookups.search_mode
  is 'verify = POST /verify with license_number; search = POST /search with name+state.';
comment on column public.license_lookups.candidate_data
  is 'Allowlisted candidate list from /search when multiple results returned. Null for verify mode.';
comment on column public.license_lookups.completed_at
  is 'Timestamp when lookup resolved (success, failed, not_found, needs_selection).';


-- ── Part 2: Extend profiles.onboarding_step CHECK constraint ─────────────────
--
-- Adds 'license_checking' and 'confirm' to the valid step set.
-- Also adds 'plan', 'payment', 'selfie' which are required by TASK-0047
-- and may not be in the original v4 CHECK constraint on all deployments.
-- Safe to run even if constraint already includes some of these values —
-- DROP + ADD replaces the full constraint definition.

alter table public.profiles
  drop constraint if exists profiles_onboarding_step_check;

alter table public.profiles
  add constraint profiles_onboarding_step_check check (
    onboarding_step in (
      'identity',
      'license',
      'license_checking',
      'confirm',
      'phone',
      'plan',
      'payment',
      'selfie',
      'pass',
      'complete'
    )
  );


-- ── Part 3: Update complete_license_verification() RPC ───────────────────────
--
-- Changes from Migration H version:
--   1. Pass transition now accepts onboarding_step IN ('license', 'license_checking').
--      'license_checking' is the step when a nurse selects a search candidate.
--   2. On pass: advances onboarding_step to 'confirm' (was 'phone' in Migration H).
--      The new flow requires a /confirm-info review before /phone-check.
--   3. Audit event records 'confirm' as the new step on pass (was 'phone').
--   4. All other Migration H security hardening is preserved unchanged:
--      locked search_path, full server-side invariant validation, service_role only.

create or replace function public.complete_license_verification(
  p_profile_id     uuid,
  p_license_id     uuid,
  p_match_result   text,
  p_dob_match_mode text default 'name_only'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_status         text;
  v_id_verification_status text;
  v_id_verification_level  text;
  v_onboarding_step        text;
  v_normalized_status      text;
  v_status_intent          text;
  v_wallet_treatment       text;
  v_updated_count          integer;
begin
  -- ── Validate p_match_result ──────────────────────────────────────────────────
  if p_match_result not in (
    'passed',
    'blocked_name_mismatch',
    'blocked_missing_idme',
    'blocked_missing_license_holder'
  ) then
    raise exception 'complete_license_verification: invalid p_match_result: %', p_match_result;
  end if;

  -- ── Validate p_dob_match_mode ────────────────────────────────────────────────
  if p_dob_match_mode != 'name_only' then
    raise exception 'complete_license_verification: invalid p_dob_match_mode: %', p_dob_match_mode;
  end if;

  -- ── Load and validate profile ────────────────────────────────────────────────
  select account_status, id_verification_status, id_verification_level, onboarding_step
  into v_account_status, v_id_verification_status, v_id_verification_level, v_onboarding_step
  from public.profiles
  where id = p_profile_id;

  if not found then
    raise exception 'complete_license_verification: profile not found: %', p_profile_id;
  end if;

  if v_account_status != 'active' then
    raise exception 'complete_license_verification: profile account_status is not active: %',
      v_account_status;
  end if;

  if v_id_verification_status != 'verified' then
    raise exception 'complete_license_verification: profile id_verification_status is not verified: %',
      v_id_verification_status;
  end if;

  if v_id_verification_level != 'IAL2' then
    raise exception 'complete_license_verification: profile id_verification_level is not IAL2: %',
      v_id_verification_level;
  end if;

  -- Pass transition requires the profile to be at 'license' (verify path)
  -- or 'license_checking' (search candidate selection path).
  -- Fail outcomes may be recorded regardless of current step (e.g. re-attempt).
  if p_match_result = 'passed' and v_onboarding_step not in ('license', 'license_checking') then
    raise exception
      'complete_license_verification: pass transition requires onboarding_step in '
      '(license, license_checking), got: %', v_onboarding_step;
  end if;

  -- ── Validate license ownership ───────────────────────────────────────────────
  select normalized_status, status_intent, wallet_pass_treatment
  into v_normalized_status, v_status_intent, v_wallet_treatment
  from public.licenses
  where id = p_license_id
    and profile_id = p_profile_id;

  if not found then
    raise exception
      'complete_license_verification: license % not found or does not belong to profile %',
      p_license_id, p_profile_id;
  end if;

  -- ── On pass: enforce license is currently issuable ───────────────────────────
  if p_match_result = 'passed' then
    if v_normalized_status != 'Active' then
      raise exception
        'complete_license_verification: license normalized_status is not Active: %',
        v_normalized_status;
    end if;

    if v_status_intent != 'credential_valid' then
      raise exception
        'complete_license_verification: license status_intent is not credential_valid: %',
        v_status_intent;
    end if;

    if v_wallet_treatment not in ('valid', 'caution') then
      raise exception
        'complete_license_verification: license wallet_pass_treatment is not issuable: %',
        v_wallet_treatment;
    end if;
  end if;

  -- ── Write match result to license row ────────────────────────────────────────
  update public.licenses
  set
    data_match_passed = (p_match_result = 'passed'),
    dob_match_mode    = p_dob_match_mode,
    updated_at        = now()
  where id = p_license_id
    and profile_id = p_profile_id;

  -- ── Advance onboarding step on pass ──────────────────────────────────────────
  -- Advances to 'confirm' (changed from 'phone' in Migration H).
  -- The nurse must review matched identity + license on /confirm-info
  -- before proceeding to Twilio OTP on /phone-check.
  if p_match_result = 'passed' then
    update public.profiles
    set
      onboarding_step = 'confirm',
      updated_at      = now()
    where id = p_profile_id
      and onboarding_step in ('license', 'license_checking');

    get diagnostics v_updated_count = row_count;

    if v_updated_count = 0 then
      raise exception
        'complete_license_verification: onboarding step transition updated zero rows; '
        'profile may have moved off license/license_checking step concurrently';
    end if;
  end if;

  -- ── Audit event ──────────────────────────────────────────────────────────────
  insert into public.audit_events (
    actor_id,
    action,
    resource_type,
    resource_id,
    change_after
  ) values (
    p_profile_id,
    case
      when p_match_result = 'passed'
        then 'license.verification_matched'
      else
        'license.verification_match_failed'
    end,
    'license',
    p_license_id,
    jsonb_build_object(
      'match_result',    p_match_result,
      'dob_match_mode',  p_dob_match_mode,
      'onboarding_step', case when p_match_result = 'passed' then 'confirm' else v_onboarding_step end
    )
  );
end;
$$;

-- Preserve Migration H security grants: service_role only
revoke all      on function public.complete_license_verification(uuid, uuid, text, text) from public;
revoke execute  on function public.complete_license_verification(uuid, uuid, text, text) from anon;
revoke execute  on function public.complete_license_verification(uuid, uuid, text, text) from authenticated;
grant  execute  on function public.complete_license_verification(uuid, uuid, text, text) to service_role;
