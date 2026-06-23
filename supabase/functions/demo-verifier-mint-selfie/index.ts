/**
 * demo-verifier-mint-selfie
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: false (Public-token: verifier session)
 *
 * Reads the demo_vs cookie, HMAC-validates it, joins demo.verifier_sessions,
 * rejects unless the row is active, then mints a fresh
 * demo.selfie_access_tokens row scoped to the verifier session and
 * returns the one-time selfie URL. Used when the verifier page re-renders
 * the selfie image within the bounded verifier session.
 *
 * Never accepts the raw share token.
 *
 * TODO Stage A:
 *   - Per-session rate limit (small N per minute) to prevent token grinding.
 *   - Audit row for cookie-authorized mints.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateBoot, corsHeaders, assertOriginAllowed, manifest } from "../_shared/demo-isolation.ts";
import { hashToken, generateOpaqueToken } from "../_shared/demo-auth.ts";
import { verifyVerifierSessionCookie } from "../_shared/demo-verifier-cookie.ts";

validateBoot("demo-verifier-mint-selfie");

const SELFIE_TOKEN_TTL_SECONDS = manifest.allowed.selfie_access_token_ttl_seconds ?? 60;

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const reject = await assertOriginAllowed(req, { endpoint: "demo-verifier-mint-selfie" });
  if (reject) return reject;

  const claims = await verifyVerifierSessionCookie(req);
  if (!claims) return json({ error: "verifier_session_invalid" }, 401, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, supabaseKey, { db: { schema: "demo" } });

  const { data: vs } = await admin
    .from("verifier_sessions")
    .select("verifier_session_id, demo_session_id, expires_at, closed_at")
    .eq("verifier_session_id", claims.verifierSessionId)
    .single();

  if (!vs) return json({ error: "verifier_session_not_found" }, 401, cors);
  if (vs.closed_at) return json({ error: "verifier_session_closed" }, 410, cors);
  if (new Date(vs.expires_at) <= new Date()) {
    return json({ error: "verifier_session_expired" }, 410, cors);
  }

  const rawSelfieToken = generateOpaqueToken();
  const tokenHash = await hashToken(rawSelfieToken);
  const expiresAt = new Date(Date.now() + SELFIE_TOKEN_TTL_SECONDS * 1000).toISOString();

  const { error: insertErr } = await admin
    .from("selfie_access_tokens")
    .insert({
      token_hash: tokenHash,
      session_id: vs.demo_session_id,
      verifier_session_id: vs.verifier_session_id,
      caller_context: "verifier",
      expires_at: expiresAt,
    });
  if (insertErr) return json({ error: "selfie_token_insert_failed" }, 500, cors);

  const selfieUrl =
    `${manifest.allowed.verifier_endpoint_origin}` +
    `${manifest.allowed.verifier_endpoint_path_prefix}view-selfie` +
    `?st=${rawSelfieToken}`;

  return json({ selfie_url: selfieUrl, expires_at: expiresAt }, 200, cors);
});

function json(b: unknown, s: number, c: HeadersInit) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...c, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
