/**
 * demo-verifier-view-selfie
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: false (Public-token: selfie token + verifier session)
 *
 * Implements the streaming-proxy half of the verifier selfie path.
 *   1. Hashes the raw selfie token from ?st=.
 *   2. Looks up demo.selfie_access_tokens; rejects if not found,
 *      expired, or already consumed.
 *   3. Verifies the token is bound to an active demo.verifier_sessions
 *      row (expires_at > now(), closed_at IS NULL).
 *   4. Atomically marks consumed_at = now() BEFORE streaming.
 *   5. Streams the selfie image bytes from Supabase storage server-to-
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
import { validateBoot, corsHeaders } from "../_shared/demo-isolation.ts";
import { hashToken } from "../_shared/demo-auth.ts";

validateBoot("demo-verifier-view-selfie");

serve(async (req) => {
  const cors = corsHeaders(req, ["GET", "OPTIONS"]);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

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
