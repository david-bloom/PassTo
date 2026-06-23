-- TASK-0074 / APPROVAL-0037 / Stage 1 / CR-S1-04 remediation
--
-- Atomic share-token consume + verifier-session mint + first selfie-token
-- mint, in a single SECURITY DEFINER plpgsql function. Eliminates the
-- race condition where two concurrent verifier opens could both insert
-- a verifier_sessions row before share_tokens.first_used_at was set.
--
-- The procedure uses SELECT ... FOR UPDATE on the share_tokens row so
-- concurrent callers serialize. The losing caller observes
-- first_used_at IS NOT NULL after the row lock releases and returns
-- the `share_token_already_used` error.
--
-- The function returns a jsonb result tagged with `ok: true|false`. On
-- success: `verifier_session_id`, `demo_session_id`,
-- `verifier_session_expires_at`. On failure: `error` (one of
-- `share_token_not_found`, `share_token_revoked`,
-- `share_token_expired`, `share_token_already_used`,
-- `verifier_session_insert_failed`, `selfie_token_insert_failed`).
--
-- All inserts and the share-token update happen inside the implicit
-- function transaction; PostgreSQL guarantees atomicity. The caller
-- (demo-verifier-view Edge Function) supplies the freshly-generated
-- selfie token hash; the raw selfie token is held only in the Edge
-- Function's memory and returned in the response URL.

set client_min_messages = warning;
set search_path = public;

create or replace function demo.consume_share_and_mint_verifier(
  p_share_token_hash       bytea,
  p_verifier_session_ttl   int,
  p_selfie_token_hash      bytea,
  p_selfie_token_ttl       int,
  p_ip_hash                bytea default null,
  p_ua_fingerprint         text  default null
) returns jsonb
language plpgsql
security definer
set search_path = demo, public
as $$
declare
  v_share          demo.share_tokens%rowtype;
  v_now            timestamptz := now();
  v_vs_expires_at  timestamptz;
  v_st_expires_at  timestamptz;
  v_vs_id          uuid;
begin
  if p_verifier_session_ttl is null or p_verifier_session_ttl <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_verifier_session_ttl');
  end if;
  if p_selfie_token_ttl is null or p_selfie_token_ttl <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_selfie_token_ttl');
  end if;
  if p_share_token_hash is null or octet_length(p_share_token_hash) = 0 then
    return jsonb_build_object('ok', false, 'error', 'missing_share_token_hash');
  end if;
  if p_selfie_token_hash is null or octet_length(p_selfie_token_hash) = 0 then
    return jsonb_build_object('ok', false, 'error', 'missing_selfie_token_hash');
  end if;

  -- Serialize concurrent callers on this share-token row.
  select * into v_share
    from demo.share_tokens
   where token_hash = p_share_token_hash
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'share_token_not_found');
  end if;

  if v_share.revoked_at is not null then
    return jsonb_build_object('ok', false, 'error', 'share_token_revoked');
  end if;

  if v_share.expires_at <= v_now then
    return jsonb_build_object('ok', false, 'error', 'share_token_expired');
  end if;

  if v_share.first_used_at is not null then
    return jsonb_build_object('ok', false, 'error', 'share_token_already_used');
  end if;

  v_vs_expires_at := v_now + make_interval(secs => p_verifier_session_ttl);
  v_st_expires_at := v_now + make_interval(secs => p_selfie_token_ttl);

  insert into demo.verifier_sessions
    (demo_session_id, share_token_hash, opened_at, expires_at, ip_hash, ua_fingerprint)
  values
    (v_share.session_id, p_share_token_hash, v_now, v_vs_expires_at, p_ip_hash, p_ua_fingerprint)
  returning verifier_session_id into v_vs_id;

  update demo.share_tokens
     set first_used_at      = v_now,
         verifier_session_id = v_vs_id
   where token_hash = p_share_token_hash;

  insert into demo.selfie_access_tokens
    (token_hash, session_id, verifier_session_id, caller_context, issued_at, expires_at)
  values
    (p_selfie_token_hash, v_share.session_id, v_vs_id, 'verifier', v_now, v_st_expires_at);

  return jsonb_build_object(
    'ok',                              true,
    'verifier_session_id',             v_vs_id,
    'demo_session_id',                 v_share.session_id,
    'verifier_session_expires_at',     v_vs_expires_at,
    'selfie_token_expires_at',         v_st_expires_at
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'token_collision');
  when others then
    return jsonb_build_object(
      'ok', false,
      'error', 'unexpected_error',
      'sqlstate', SQLSTATE,
      'sqlerrm', SQLERRM
    );
end $$;

-- CR2-S1-01: revoke default PUBLIC execute before granting service_role.
-- Postgres grants EXECUTE on functions to PUBLIC by default. For a
-- SECURITY DEFINER ledger-mutating RPC, that default is unsafe: anon
-- and authenticated callers must not be able to invoke this function
-- directly through PostgREST and bypass the Edge Function's origin,
-- cookie, and audit path.
revoke all on function demo.consume_share_and_mint_verifier(
  bytea, int, bytea, int, bytea, text
) from public;
revoke all on function demo.consume_share_and_mint_verifier(
  bytea, int, bytea, int, bytea, text
) from anon;
revoke all on function demo.consume_share_and_mint_verifier(
  bytea, int, bytea, int, bytea, text
) from authenticated;
grant execute on function demo.consume_share_and_mint_verifier(
  bytea, int, bytea, int, bytea, text
) to service_role;

-- Document the intended caller.
comment on function demo.consume_share_and_mint_verifier(
  bytea, int, bytea, int, bytea, text
) is
  'Atomic share-token consume + verifier-session mint + first selfie-token '
  'mint, called by the demo-verifier-view Edge Function. SELECT FOR UPDATE '
  'on demo.share_tokens serializes concurrent callers; the loser receives '
  'share_token_already_used after the lock releases. Returns jsonb with ok '
  'flag and either the new verifier-session identifiers or an error code.';
