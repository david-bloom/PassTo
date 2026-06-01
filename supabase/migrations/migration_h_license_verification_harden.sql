-- ============================================================
-- Migration H: Harden complete_license_verification RPC
-- TASK-0046 remediation — Codex P1 security finding
--
-- Requires David approval. Apply via Supabase dashboard SQL Editor.
-- Apply BEFORE redeploying license-lookup Edge Function.
--
-- What this fixes:
--   P1: The original Migration G created complete_license_verification()
--       in public schema with default PUBLIC execute privileges, allowing
--       anon/authenticated callers to invoke it directly through PostgREST
--       and bypass all Edge Function trust gates.
--
-- What this does:
--   1. Recreates the function with locked search_path and full
--      server-side input/state validation.
--   2. Revokes execute from PUBLIC, anon, and authenticated.
--   3. Grants execute only to service_role.
-- ============================================================

-- Step 1: Recreate function with locked search_path + full validation.
--         CREATE OR REPLACE preserves object identity; REVOKE/GRANT follow.
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
  -- Only name_only is approved for MVP; block any other value.
  if p_dob_match_mode != 'name_only' then
    raise exception 'complete_license_verification: invalid p_dob_match_mode: %', p_dob_match_mode;
  end if;

  -- ── Validate profile state ───────────────────────────────────────────────────
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

  -- Pass transition requires the profile to still be at the license step.
  -- Fail outcomes may be recorded regardless of current step (e.g. re-attempt).
  if p_match_result = 'passed' and v_onboarding_step != 'license' then
    raise exception
      'complete_license_verification: pass transition requires onboarding_step = license, got: %',
      v_onboarding_step;
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

  -- ── On pass: validate current license status is issuable ─────────────────────
  -- The Edge Function must have already confirmed status before calling, but the
  -- RPC enforces this server-side as a hard gate — a bypassing caller cannot
  -- advance the step by calling the RPC directly with p_match_result = 'passed'
  -- on an inactive/expired/revoked license.
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

  -- ── Advance onboarding step (pass only) — fail closed ────────────────────────
  if p_match_result = 'passed' then
    update public.profiles
    set
      onboarding_step = 'phone',
      updated_at      = now()
    where id = p_profile_id
      and onboarding_step = 'license';

    get diagnostics v_updated_count = row_count;

    if v_updated_count = 0 then
      raise exception
        'complete_license_verification: onboarding step transition updated zero rows; '
        'profile may have moved off license step concurrently';
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
      'onboarding_step', case when p_match_result = 'passed' then 'phone' else 'license' end
    )
  );
end;
$$;

-- Step 2: Revoke execute from PUBLIC (covers all roles by default),
--         and explicitly from anon and authenticated.
revoke all on function public.complete_license_verification(uuid, uuid, text, text) from public;
revoke execute on function public.complete_license_verification(uuid, uuid, text, text) from anon;
revoke execute on function public.complete_license_verification(uuid, uuid, text, text) from authenticated;

-- Step 3: Grant execute only to service_role.
--         Edge Functions using the service_role key will continue to call it;
--         direct PostgREST calls from anon/authenticated clients cannot.
grant execute on function public.complete_license_verification(uuid, uuid, text, text) to service_role;
