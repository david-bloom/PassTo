-- ============================================================
-- Migration I: Fix complete_phone_verification step transition
-- and harden against direct PostgREST bypass
-- TASK-0047 — David approved 2026-06-01
--
-- P1-A: Advances onboarding_step to 'license' (old flow).
--        Must advance to 'plan' for ID.me-first flow.
-- P1-B: PUBLIC execute grants allow anon/authenticated to
--        call this RPC directly through PostgREST, bypassing
--        Twilio verification entirely.
-- ============================================================

create or replace function public.complete_phone_verification(
  p_profile_id uuid,
  p_phone      text
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
  v_data_match_passed      boolean;
  v_updated_count          integer;
begin
  -- Validate phone format (E.164)
  if p_phone is null or p_phone !~ '^\+[1-9]\d{6,14}$' then
    raise exception 'complete_phone_verification: invalid phone format';
  end if;

  -- Validate profile state
  select account_status, id_verification_status, id_verification_level, onboarding_step
  into v_account_status, v_id_verification_status, v_id_verification_level, v_onboarding_step
  from public.profiles
  where id = p_profile_id;

  if not found then
    raise exception 'complete_phone_verification: profile not found: %', p_profile_id;
  end if;

  if v_account_status != 'active' then
    raise exception 'complete_phone_verification: account_status is not active: %', v_account_status;
  end if;

  if v_id_verification_status != 'verified' then
    raise exception 'complete_phone_verification: id_verification_status is not verified: %', v_id_verification_status;
  end if;

  if v_id_verification_level != 'IAL2' then
    raise exception 'complete_phone_verification: id_verification_level is not IAL2: %', v_id_verification_level;
  end if;

  if v_onboarding_step != 'phone' then
    raise exception 'complete_phone_verification: requires onboarding_step = phone, got: %', v_onboarding_step;
  end if;

  -- Require durable license match gate
  select l.data_match_passed
  into v_data_match_passed
  from public.licenses l
  where l.profile_id = p_profile_id
    and l.is_primary = true
  order by l.updated_at desc
  limit 1;

  if v_data_match_passed is null or v_data_match_passed = false then
    raise exception 'complete_phone_verification: license data_match_passed is not true for profile: %', p_profile_id;
  end if;

  -- Advance step: phone → plan
  update public.profiles
  set
    phone           = p_phone,
    onboarding_step = 'plan',
    updated_at      = now()
  where id = p_profile_id
    and onboarding_step = 'phone';

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception
      'complete_phone_verification: step transition updated zero rows; '
      'profile may have moved off phone step concurrently';
  end if;

  -- Audit
  insert into public.audit_events (actor_id, action, resource_type, resource_id, change_after)
  values (
    p_profile_id,
    'phone.verified',
    'profile',
    p_profile_id,
    jsonb_build_object('onboarding_step', 'plan', 'phone_written', true)
  );
end;
$$;

-- Revoke public execute; grant only service_role
revoke all on function public.complete_phone_verification(uuid, text) from public;
revoke execute on function public.complete_phone_verification(uuid, text) from anon;
revoke execute on function public.complete_phone_verification(uuid, text) from authenticated;
grant execute on function public.complete_phone_verification(uuid, text) to service_role;
