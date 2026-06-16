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
import { validateBoot, corsHeaders, manifest } from "../_shared/demo-isolation.ts";
import { hashToken, generateOpaqueToken } from "../_shared/demo-auth.ts";
import { buildVerifierSessionCookie } from "../_shared/demo-verifier-cookie.ts";

validateBoot("demo-verifier-view");

const VERIFIER_SESSION_TTL_SECONDS = manifest.allowed.verifier_session_ttl_seconds ?? 900;
const SELFIE_TOKEN_TTL_SECONDS = manifest.allowed.selfie_access_token_ttl_seconds ?? 60;

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { share_token } = await req.json().catch(() => ({}));
  if (!share_token || typeof share_token !== "string") {
    return json({ error: "missing_share_token" }, 400, cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, supabaseKey, { db: { schema: "demo" } });

  const tokenHash = await hashToken(share_token);

  // Atomic share-token consume + verifier-session mint + selfie-token mint.
  // Implemented as a single SECURITY DEFINER plpgsql function in a later
  // migration; the skeleton stages the steps inline for review and will
  // be migrated to the atomic stored procedure in Stage A.
  const { data: shareRow } = await admin
    .from("share_tokens")
    .select("token_hash, session_id, expires_at, first_used_at, revoked_at")
    .eq("token_hash", tokenHash)
    .single();

  if (!shareRow) return json({ error: "share_token_not_found" }, 404, cors);
  if (shareRow.revoked_at) return json({ error: "share_token_revoked" }, 410, cors);
  if (new Date(shareRow.expires_at) <= new Date()) {
    return json({ error: "share_token_expired" }, 410, cors);
  }
  if (shareRow.first_used_at) {
    return json({ error: "share_token_already_used" }, 410, cors);
  }

  const verifierExpiresAt = new Date(Date.now() + VERIFIER_SESSION_TTL_SECONDS * 1000);
  const { data: vs, error: vsErr } = await admin
    .from("verifier_sessions")
    .insert({
      demo_session_id: shareRow.session_id,
      share_token_hash: tokenHash,
      expires_at: verifierExpiresAt.toISOString(),
    })
    .select("verifier_session_id")
    .single();
  if (vsErr || !vs) return json({ error: "verifier_session_insert_failed" }, 500, cors);

  const { error: updErr } = await admin
    .from("share_tokens")
    .update({
      first_used_at: new Date().toISOString(),
      verifier_session_id: vs.verifier_session_id,
    })
    .eq("token_hash", tokenHash)
    .is("first_used_at", null);
  if (updErr) return json({ error: "share_token_consume_failed" }, 500, cors);

  const rawSelfieToken = generateOpaqueToken();
  const selfieTokenHash = await hashToken(rawSelfieToken);
  const selfieExpiresAt = new Date(Date.now() + SELFIE_TOKEN_TTL_SECONDS * 1000);

  const { error: selfieErr } = await admin
    .from("selfie_access_tokens")
    .insert({
      token_hash: selfieTokenHash,
      session_id: shareRow.session_id,
      verifier_session_id: vs.verifier_session_id,
      caller_context: "verifier",
      expires_at: selfieExpiresAt.toISOString(),
    });
  if (selfieErr) return json({ error: "selfie_token_insert_failed" }, 500, cors);

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
    verifierSessionId: vs.verifier_session_id,
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
