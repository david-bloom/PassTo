/**
 * demo-session-create
 *
 * TASK-0074 Phase 4 — Demo Session Management
 *
 * verify_jwt: true
 * CORS: https://demo.passtodigital.com
 *
 * Called by the presenter from /demo-console to start a fresh demo session.
 * Resets Avery Demo's profile to a clean onboarding state, revokes prior share
 * links, clears participant phone, and issues a new magic link for the participant.
 *
 * Input:  { mode: 'demo' | 'uat' }
 * Output: {
 *   success: true,
 *   demo_session_id: string,
 *   magic_link: string,          // participant login link (one-time use)
 *   health: { ... }              // provider/wallet/SMS readiness
 * }
 *
 * Audit: demo.session_created
 *
 * Requires Phase 1 setup: demo_personas.auth_user_id must be set for avery_demo.
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

  // ── 1. Authenticate presenter ─────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  // ── 2. Parse + validate request body ─────────────────────────────────────
  let body: { mode?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const mode = body.mode ?? "demo";
  if (!["demo", "uat"].includes(mode)) {
    return json({ error: "mode must be 'demo' or 'uat'" }, 400);
  }

  // ── 3. Load Avery Demo persona + profile ──────────────────────────────────
  const { data: persona } = await supabaseAdmin
    .from("demo_personas")
    .select("auth_user_id, demo_email, first_name, last_name")
    .eq("persona_key", "avery_demo")
    .maybeSingle();

  if (!persona?.auth_user_id || !persona?.demo_email) {
    return json({
      error:  "avery_demo_not_configured",
      detail: "Phase 1 setup incomplete — set demo_personas.auth_user_id and demo_email for avery_demo",
    }, 503);
  }

  const { data: avatarProfile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, auth_user_id")
    .eq("auth_user_id", persona.auth_user_id)
    .maybeSingle();

  if (profileErr || !avatarProfile) {
    return json({ error: "avery_demo_profile_not_found" }, 404);
  }

  const now = new Date().toISOString();

  // ── 4. Create demo session record (immutable mode) ────────────────────────
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("demo_sessions")
    .insert({ mode, created_by: user.id })
    .select("demo_session_id")
    .single();

  if (sessionErr || !session) {
    console.error("demo-session-create: session insert failed:", sessionErr?.message);
    return json({ error: "server_error" }, 500);
  }

  const demo_session_id = session.demo_session_id;

  // ── 5. Audit before state resets (fail-closed) ────────────────────────────
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id:      avatarProfile.id,
    action:        "demo.session_created",
    resource_type: "demo_session",
    resource_id:   avatarProfile.id,
    change_after: {
      demo_session_id,
      mode,
      presenter_auth_user_id: user.id,
      synthetic: true,
    },
  });
  if (auditErr) {
    console.error("demo-session-create: audit write failed:", auditErr.message);
    return json({ error: "server_error" }, 500);
  }

  // ── 6. Reset Avery Demo profile to clean onboarding state ─────────────────
  await supabaseAdmin
    .from("profiles")
    .update({
      phone:                  null,
      phone_verified_at:      null,
      id_verification_status: null,
      id_verification_level:  null,
      onboarding_step:        "identity",
      subscription_tier:      "free",
      selfie_storage_path:    null,
      selfie_captured_at:     null,
      updated_at:             now,
    })
    .eq("id", avatarProfile.id);

  // ── 7. Revoke prior active share links for Avery Demo ─────────────────────
  await supabaseAdmin
    .from("verification_tokens")
    .update({ status: "revoked", updated_at: now })
    .eq("profile_id", avatarProfile.id)
    .eq("status", "active");

  // ── 8. Cancel prior credentials ───────────────────────────────────────────
  await supabaseAdmin
    .from("credentials")
    .update({ status: "revoked", updated_at: now })
    .eq("profile_id", avatarProfile.id)
    .in("status", ["pending", "active"]);

  // ── 9. Revoke prior synthetic subscriptions ───────────────────────────────
  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "canceled", updated_at: now })
    .eq("profile_id", avatarProfile.id)
    .not("demo_session_id", "is", null)
    .eq("status", "active");

  // ── 10. Delete synthetic primary license ──────────────────────────────────
  await supabaseAdmin
    .from("licenses")
    .delete()
    .eq("profile_id", avatarProfile.id)
    .eq("is_primary", true)
    .eq("demo_synthetic", true);

  // ── 11. Assign Standard entitlement for this session ─────────────────────
  const { error: subErr } = await supabaseAdmin.from("subscriptions").insert({
    profile_id:                avatarProfile.id,
    plan_name:                 "standard",
    status:                    "active",
    license_entitlement_count: 1,
    demo_session_id,
    created_at: now,
    updated_at: now,
  });

  if (subErr) {
    console.error("demo-session-create: subscription insert failed:", subErr.message);
    return json({ error: "server_error" }, 500);
  }

  await supabaseAdmin
    .from("profiles")
    .update({ subscription_tier: "standard", updated_at: now })
    .eq("id", avatarProfile.id);

  // ── 12. Generate magic link for participant ───────────────────────────────
  // One-time use; participant logs in as Avery Demo for this session.
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type:  "magiclink",
    email: persona.demo_email,
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error("demo-session-create: magic link generation failed:", linkErr?.message);
    return json({ error: "magic_link_failed", detail: linkErr?.message }, 500);
  }

  // ── 13. Health check ──────────────────────────────────────────────────────
  const health = buildHealthStatus();

  return json({
    success:        true,
    demo_session_id,
    mode,
    magic_link:     linkData.properties.action_link,
    persona:        { first_name: persona.first_name, last_name: persona.last_name },
    health,
  });
});

function buildHealthStatus(): Record<string, unknown> {
  const twilio    = !!(Deno.env.get("TWILIO_ACCOUNT_SID") && Deno.env.get("TWILIO_AUTH_TOKEN"));
  const walletUrl = !!(Deno.env.get("VERCEL_SIGN_APPLE_URL") && Deno.env.get("VERCEL_SIGN_GOOGLE_URL"));
  const appleDemo = !!(Deno.env.get("APPLE_DEMO_PASS_TYPE_ID"));

  return {
    twilio_configured:       twilio,
    wallet_routes_configured: walletUrl,
    apple_demo_cert:         appleDemo,
    all_ready:               twilio && walletUrl && appleDemo,
  };
}
