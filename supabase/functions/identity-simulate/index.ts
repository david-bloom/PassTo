/**
 * identity-simulate
 *
 * TASK-0074 Phase 3 — Provider Simulator: Identity
 *
 * verify_jwt: true
 * CORS: https://demo.passtodigital.com
 *
 * Called by Lovable after the participant completes the acknowledgment screen
 * on demo.passtodigital.com. Returns a synthetic IAL2 identity result for the
 * Avery Demo persona. Does NOT call ID.me and does not accept real credentials.
 *
 * Input:  { demo_session_id: string }
 * Output: { success: true, synthetic: true, identity: { ... } }
 *
 * Audit:  demo.identity_simulated (actor_id = profile.id)
 *
 * Gate checks:
 *   1. Valid JWT (authenticated session)
 *   2. Valid demo_session_id in demo_sessions table
 *   3. Environment guard (production project ref rejected at cold start)
 *
 * State writes (idempotent):
 *   - profiles.id_verification_status = 'verified'
 *   - profiles.id_verification_level  = 'IAL2'
 *   - profiles.onboarding_step        = 'license'  (only if currently 'identity')
 *
 * TASK: TASK-0074
 * Codex security review: required before deployment
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertDemoEnvironment } from "../_shared/demo-env-guard.ts";

assertDemoEnvironment();

const corsHeaders = {
  "Access-Control-Allow-Origin":  "https://demo.passtodigital.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")   return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")              ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")         ?? "";
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabaseAuth  = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  // ── 2. Load profile ────────────────────────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, account_status, onboarding_step")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);
  if (profile.account_status !== "active") return json({ error: "account_not_active" }, 403);

  // ── 3. Parse + validate request body ─────────────────────────────────────
  let body: { demo_session_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const { demo_session_id } = body;
  if (!demo_session_id) return json({ error: "demo_session_id_required" }, 400);

  // ── 4. Validate demo session ───────────────────────────────────────────────
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("demo_sessions")
    .select("id, demo_session_id, mode, persona")
    .eq("demo_session_id", demo_session_id)
    .maybeSingle();

  if (sessionErr || !session) return json({ error: "invalid_demo_session" }, 400);

  // ── 5. Load persona display data ───────────────────────────────────────────
  const { data: persona } = await supabaseAdmin
    .from("demo_personas")
    .select("first_name, last_name")
    .eq("persona_key", session.persona)
    .maybeSingle();

  const firstName = persona?.first_name ?? "Avery";
  const lastName  = persona?.last_name  ?? "Demo";
  const now       = new Date().toISOString();

  // ── 6. Audit before state write (fail-closed) ─────────────────────────────
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id:      profile.id,
    action:        "demo.identity_simulated",
    resource_type: "profile",
    resource_id:   profile.id,
    change_after: {
      demo_session_id,
      synthetic:      true,
      id_verification_level:  "IAL2",
      id_verification_status: "verified",
    },
  });
  if (auditErr) {
    console.error("identity-simulate: audit write failed:", auditErr.message);
    return json({ error: "server_error" }, 500);
  }

  // ── 7. Write synthetic IAL2 result to profile ─────────────────────────────
  // Idempotent: only advances from 'identity'; already-advanced steps are left.
  await supabaseAdmin
    .from("profiles")
    .update({
      id_verification_status: "verified",
      id_verification_level:  "IAL2",
      onboarding_step:        "license",
      updated_at:             now,
    })
    .eq("auth_user_id", user.id)
    .in("onboarding_step", ["identity"]);

  return json({
    success:   true,
    synthetic: true,
    identity: {
      first_name: firstName,
      last_name:  lastName,
      ial_level:  "IAL2",
      source:     "demo_simulator",
      note:       "SYNTHETIC — not a real identity verification result",
    },
  });
});
