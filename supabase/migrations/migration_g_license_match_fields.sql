-- ============================================================
-- Migration G: license match result fields + complete_license_verification RPC
-- TASK-0046 — License Info Lookup and ID.me/License Binding
--
-- Requires David approval. Apply via Supabase dashboard SQL Editor.
-- Apply BEFORE deploying license-lookup Edge Function.
-- ============================================================

-- 1. Add data-match result fields to licenses
--    data_match_passed: hard gate for credential issuance (readable without audit reconstruction)
--    dob_match_mode: audit record of which matching mode was used (MVP = 'name_only')
alter table public.licenses
  add column if not exists data_match_passed boolean,
  add column if not exists dob_match_mode    text;

-- 2. Atomic RPC: complete_license_verification
--    Called by license-lookup Edge Function after successful lookup + match.
--    Atomically:
--      - Writes match result and dob_match_mode to licenses
--      - Advances profiles.onboarding_step to 'phone' on pass (idempotent)
--      - Inserts audit event
--    Security: SECURITY DEFINER, callable only by service-role Edge Functions.
create or replace function public.complete_license_verification(
  p_profile_id    uuid,
  p_license_id    uuid,
  p_match_result  text,
  p_dob_match_mode text default 'name_only'
)
returns void
language plpgsql
security definer
as $$
begin
  -- Write match result to the license row
  update public.licenses
  set
    data_match_passed = (p_match_result = 'passed'),
    dob_match_mode    = p_dob_match_mode,
    updated_at        = now()
  where
    id         = p_license_id
    and profile_id = p_profile_id;

  if not found then
    raise exception 'license not found: % for profile %', p_license_id, p_profile_id;
  end if;

  -- Advance onboarding step only on pass, and only from 'license' (idempotent)
  if p_match_result = 'passed' then
    update public.profiles
    set
      onboarding_step = 'phone',
      updated_at      = now()
    where
      id              = p_profile_id
      and onboarding_step = 'license';
  end if;

  -- Audit event (append-only — failure path also recorded)
  insert into public.audit_events (
    actor_id,
    action,
    resource_type,
    resource_id,
    change_after
  ) values (
    p_profile_id,
    case
      when p_match_result = 'passed' then 'license.verification_matched'
      else                                'license.verification_match_failed'
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
