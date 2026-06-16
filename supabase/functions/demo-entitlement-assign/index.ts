/**
 * demo-entitlement-assign
 *
 * TASK-0074 Phase 4 — Demo Session Management
 *
 * verify_jwt: true
 * CORS: https://demo.passtodigital.com
 *
 * Assigns a server-controlled Standard tier entitlement to the current session
 * without Stripe. Called from the presenter console early in the demo session
 * so that credential-create passes its payment gate.
 *
 * Input:  { demo_session_id: string }
 * Output: { success: true, plan_name: 'standard' }
 *
 * State writes:
 *   - profiles.subscription_tier = 'standard'
 *   - Inserts synthetic subscriptions row: plan_name='standard', status='active',
 *     demo_session_id=<session_id>, no Stripe IDs
 *   - Prior synthetic subscriptions rows for this profile are revoked
 *
 * Audit: demo.entitlement_assigned
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

  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  let body: { demo_session_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const { demo_session_id } = body;
  if (!demo_session_id) return json({ error: "demo_session_id_required" }, 400);

  // Validate demo session
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("demo_sessions")
    .select("id, demo_session_id")
    .eq("demo_session_id", demo_session_id)
    .maybeSingle();

  if (sessionErr || !session) return json({ error: "invalid_demo_session" }, 400);

  // Load Avery Demo profile (the persona's fixed account)
  const { data: persona } = await supabaseAdmin
    .from("demo_personas")
    .select("auth_user_id")
    .eq("persona_key", "avery_demo")
    .maybeSingle();

  if (!persona?.auth_user_id) {
    return json({ error: "avery_demo_not_configured", detail: "Phase 1 setup incomplete — auth_user_id not set in demo_personas" }, 503);
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", persona.auth_user_id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "avery_demo_profile_not_found" }, 404);

  const now = new Date().toISOString();

  // Audit before state write (fail-closed)
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id:      profile.id,
    action:        "demo.entitlement_assigned",
    resource_type: "subscription",
    resource_id:   profile.id,
    change_after: {
      demo_session_id,
      plan_name:   "standard",
      synthetic:   true,
    },
  });
  if (auditErr) {
    console.error("demo-entitlement-assign: audit write failed:", auditErr.message);
    return json({ error: "server_error" }, 500);
  }

  // Revoke prior synthetic subscriptions for this profile
  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "canceled", updated_at: now })
    .eq("profile_id", profile.id)
    .not("demo_session_id", "is", null)
    .eq("status", "active");

  // Insert synthetic Standard subscription
  const { error: subErr } = await supabaseAdmin.from("subscriptions").insert({
    profile_id:                profile.id,
    plan_name:                 "standard",
    status:                    "active",
    license_entitlement_count: 1,
    demo_session_id,
    // No stripe_customer_id or stripe_subscription_id — synthetic demo row
    created_at: now,
    updated_at: now,
  });

  if (subErr) {
    console.error("demo-entitlement-assign: subscription insert failed:", subErr.message);
    return json({ error: "server_error" }, 500);
  }

  // Update profile subscription_tier
  await supabaseAdmin
    .from("profiles")
    .update({ subscription_tier: "standard", updated_at: now })
    .eq("id", profile.id);

  return json({ success: true, plan_name: "standard", synthetic: true });
});
