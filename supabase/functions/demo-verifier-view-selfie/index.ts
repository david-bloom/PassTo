/**
 * demo-verifier-view-selfie
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: false (Public-token: selfie token + verifier session)
 *
 * Implements the streaming-proxy half of the verifier selfie path.
 *   1. Validates the demo_vs verifier-session cookie. Without a valid
 *      cookie, the request is rejected before any token work.
 *   2. Hashes the raw selfie token from ?st=.
 *   3. Looks up demo.selfie_access_tokens; rejects if not found,
 *      expired, already consumed, or in the wrong caller_context.
 *   4. Verifies the selfie token is bound to the SAME verifier session
 *      identified by the cookie (claims.verifierSessionId ===
 *      sel.verifier_session_id). Per CR-S1-03 this closes the gap
 *      where a leaked selfie URL could be redeemed without the
 *      HttpOnly cookie.
 *   5. Verifies the verifier session row is still active (expires_at
 *      > now(), closed_at IS NULL).
 *   6. Atomically marks consumed_at = now() BEFORE streaming.
 *   7. Streams the selfie image bytes from Supabase storage server-to-
 *      server with Cache-Control: no-store and Content-Disposition: inline.
 *
 * The Supabase storage URL is never returned to the client.
 *
 * TODO Stage A:
 *   - Atomic SECURITY DEFINER stored procedure for the consume step.
 *   - Storage object path resolution (bucket: demo-selfies, key by
 *     session_id + selfie_id).
 *   - If selfie is missing/deleted, return placeholder safe response
 *     (frontend renders "Selfie not provided" label from
 *     demo-verifier-view's safe_display response, not from this image
 *     endpoint).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateBoot, corsHeaders, assertOriginAllowed } from "../_shared/demo-isolation.ts";
import { hashToken } from "../_shared/demo-auth.ts";
import { verifyVerifierSessionCookie } from "../_shared/demo-verifier-cookie.ts";

validateBoot("demo-verifier-view-selfie");

serve(async (req) => {
  const cors = corsHeaders(req, ["GET", "OPTIONS"]);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // The verifier <img src=...> is a same-origin GET. The browser does
  // not send Origin on top-level navigations but typically does on
  // <img> subresource fetches; we still require it because this is a
  // credentialed cookie-bearing call.
  const reject = await assertOriginAllowed(req, { endpoint: "demo-verifier-view-selfie" });
  if (reject) return reject;

  // CR-S1-03: verifier-session cookie is required and must match the
  // selfie token's verifier_session_id. A leaked one-time selfie URL
  // cannot be redeemed without also presenting the HttpOnly cookie.
  const cookieClaims = await verifyVerifierSessionCookie(req);
  if (!cookieClaims) {
    return json({ error: "verifier_session_cookie_required" }, 401, cors);
  }

  const url = new URL(req.url);
  const rawToken = url.searchParams.get("st");
  if (!rawToken) return json({ error: "missing_selfie_token" }, 400, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, supabaseKey, { db: { schema: "demo" } });

  const tokenHash = await hashToken(rawToken);

  const { data: sel } = await admin
    .from("selfie_access_tokens")
    .select("token_hash, session_id, verifier_session_id, expires_at, consumed_at, caller_context")
    .eq("token_hash", tokenHash)
    .single();

  if (!sel) return json({ error: "selfie_token_not_found" }, 404, cors);
  if (sel.caller_context !== "verifier") {
    return json({ error: "selfie_token_wrong_context" }, 403, cors);
  }
  if (sel.consumed_at) return json({ error: "selfie_token_consumed" }, 410, cors);
  if (new Date(sel.expires_at) <= new Date()) {
    return json({ error: "selfie_token_expired" }, 410, cors);
  }
  if (!sel.verifier_session_id) {
    return json({ error: "selfie_token_unbound" }, 403, cors);
  }

  // CR-S1-03: bind selfie token to the cookie's verifier session.
  if (cookieClaims.verifierSessionId !== sel.verifier_session_id) {
    return json({ error: "verifier_session_mismatch" }, 403, cors);
  }

  const { data: vs } = await admin
    .from("verifier_sessions")
    .select("verifier_session_id, expires_at, closed_at")
    .eq("verifier_session_id", sel.verifier_session_id)
    .single();
  if (!vs) return json({ error: "verifier_session_not_found" }, 403, cors);
  if (vs.closed_at) return json({ error: "verifier_session_closed" }, 410, cors);
  if (new Date(vs.expires_at) <= new Date()) {
    return json({ error: "verifier_session_expired" }, 410, cors);
  }

  // Atomic-ish consume: only mark consumed if still NULL. The Stage A
  // migration replaces this with a single SECURITY DEFINER procedure.
  const { error: consumeErr, count } = await admin
    .from("selfie_access_tokens")
    .update({ consumed_at: new Date().toISOString(), consumed_via: "verifier_view_selfie" }, { count: "exact" })
    .eq("token_hash", tokenHash)
    .is("consumed_at", null);
  if (consumeErr || (count ?? 0) === 0) {
    return json({ error: "selfie_token_consume_failed" }, 410, cors);
  }

  // TODO Stage A: resolve storage path for sel.session_id and stream
  // bytes. Until then, return a 501 sentinel.
  return json({ error: "not_implemented_stage_a" }, 501, cors);
});

function json(b: unknown, s: number, c: HeadersInit) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...c, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
