/**
 * demo-verifier-close
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: false (Public-token: verifier session)
 *
 * Reads and validates the demo_vs cookie, marks the matching
 * demo.verifier_sessions row closed_at = now(), and clears the cookie
 * via Set-Cookie: demo_vs=; Max-Age=0. Idempotent.
 *
 * Called by tab-close beacon and by an end-of-session reset path.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateBoot, corsHeaders, assertOriginAllowed } from "../_shared/demo-isolation.ts";
import {
  verifyVerifierSessionCookie,
  buildVerifierSessionCookieClear,
} from "../_shared/demo-verifier-cookie.ts";

validateBoot("demo-verifier-close");

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Tab-close beacons (sendBeacon) may omit Origin. Allow Origin-less
  // for graceful close behavior; the cookie is still validated.
  const reject = await assertOriginAllowed(req, { endpoint: "demo-verifier-close", allowMissingOrigin: true });
  if (reject) return reject;

  const claims = await verifyVerifierSessionCookie(req);
  const clearCookie = buildVerifierSessionCookieClear();

  if (!claims) {
    return new Response(JSON.stringify({ closed: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json", "Set-Cookie": clearCookie, "Cache-Control": "no-store" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, supabaseKey, { db: { schema: "demo" } });

  await admin
    .from("verifier_sessions")
    .update({ closed_at: new Date().toISOString() })
    .eq("verifier_session_id", claims.verifierSessionId)
    .is("closed_at", null);

  return new Response(JSON.stringify({ closed: true }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json", "Set-Cookie": clearCookie, "Cache-Control": "no-store" },
  });
});
