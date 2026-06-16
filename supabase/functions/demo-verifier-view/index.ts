/**
 * demo-verifier-view
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: false (Public-token: share token)
 *
 * Atomically:
 *   1. Hashes the raw share token.
 *   2. Looks up demo.share_tokens; rejects if not found, revoked,
 *      expired, or already consumed.
 *   3. Marks share_tokens.first_used_at = now().
 *   4. Inserts demo.verifier_sessions row (15-min TTL by default).
 *   5. Writes verifier_session_id back to share_tokens.
 *   6. Inserts a freshly minted demo.selfie_access_tokens row with
 *      caller_context='verifier' and verifier_session_id set.
 *   7. Returns the safe-display projection + the one-time selfie URL
 *      (containing only the raw selfie token; never the share token).
 *   8. Sets the demo_vs HttpOnly/Secure/SameSite=Strict cookie.
 *
 * Same-origin requirement: this endpoint must be reachable at
 * https://demo.passtodigital.com/functions/v1/demo-verifier-view per
 * the Environment Isolation Manifest (Pattern A or Pattern B).
 *
 * TODO Stage A:
 *   - Implement the safe-display projection from demo.sessions +
 *     demo.entitlements + demo.audit_simulator (license/identity rows).
 *   - Rate limiting (per-IP).
 *   - Wire up the demo.audit_verifier_view row.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateBoot, corsHeaders, assertOriginAllowed, manifest } from "../_shared/demo-isolation.ts";
import { hashToken, generateOpaqueToken } from "../_shared/demo-auth.ts";
import { buildVerifierSessionCookie } from "../_shared/demo-verifier-cookie.ts";

validateBoot("demo-verifier-view");

const VERIFIER_SESSION_TTL_SECONDS = manifest.allowed.verifier_session_ttl_seconds ?? 900;
const SELFIE_TOKEN_TTL_SECONDS = manifest.allowed.selfie_access_token_ttl_seconds ?? 60;

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const reject = await assertOriginAllowed(req, { endpoint: "demo-verifier-view" });
  if (reject) return reject;

  const { share_token } = await req.json().catch(() => ({}));
  if (!share_token || typeof share_token !== "string") {
    return json({ error: "missing_share_token" }, 400, cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, supabaseKey, { db: { schema: "demo" } });

  const shareTokenHash = await hashToken(share_token);
  const rawSelfieToken = generateOpaqueToken();
  const selfieTokenHash = await hashToken(rawSelfieToken);

  // CR-S1-04: single SECURITY DEFINER call replaces the inline
  // multi-step share-token consume + verifier-session mint + selfie-
  // token mint. The procedure uses SELECT FOR UPDATE so concurrent
  // verifier opens serialize and the loser receives
  // `share_token_already_used`. See
  // migration_demo_002_verifier_atomics.sql.
  const { data: rpcRes, error: rpcErr } = await admin.rpc(
    "consume_share_and_mint_verifier",
    {
      p_share_token_hash:      shareTokenHash,
      p_verifier_session_ttl:  VERIFIER_SESSION_TTL_SECONDS,
      p_selfie_token_hash:     selfieTokenHash,
      p_selfie_token_ttl:      SELFIE_TOKEN_TTL_SECONDS,
    },
  );

  if (rpcErr || !rpcRes) {
    console.error("consume_share_and_mint_verifier_failed", rpcErr);
    return json({ error: "verifier_open_failed" }, 500, cors);
  }
  const result = rpcRes as {
    ok: boolean;
    error?: string;
    verifier_session_id?: string;
    demo_session_id?: string;
    verifier_session_expires_at?: string;
  };
  if (!result.ok) {
    const error = result.error ?? "verifier_open_failed";
    const status = error === "share_token_not_found"
      ? 404
      : error === "share_token_revoked" || error === "share_token_expired" || error === "share_token_already_used"
      ? 410
      : 500;
    return json({ error }, status, cors);
  }

  const verifierExpiresAt = new Date(result.verifier_session_expires_at!);
  const verifierSessionId = result.verifier_session_id!;

  const selfieUrl =
    `${manifest.allowed.verifier_endpoint_origin}` +
    `${manifest.allowed.verifier_endpoint_path_prefix}view-selfie` +
    `?st=${rawSelfieToken}`;

  // TODO Stage A: safe_display projection from session + entitlements +
  // audit_simulator. Until then, return a minimal placeholder.
  const safeDisplay = {
    first_name: "Avery",
    last_name: "Demo",
    license_status: "Active - Simulated",
    current_as_of: new Date().toISOString(),
    demo_label: "DEMO - NOT A VALID PROFESSIONAL CREDENTIAL",
  };

  const cookie = await buildVerifierSessionCookie({
    verifierSessionId,
    expiresAtUnix: Math.floor(verifierExpiresAt.getTime() / 1000),
  });

  return new Response(JSON.stringify({
    safe_display: safeDisplay,
    selfie_url: selfieUrl,
    verifier_session_expires_at: verifierExpiresAt.toISOString(),
  }), {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
      "Cache-Control": "no-store",
    },
  });
});

function json(b: unknown, s: number, c: HeadersInit) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...c, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
