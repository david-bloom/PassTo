/**
 * demo-health-check
 *
 * TASK-0074 Phase 6 — Presenter Console Backend API
 *
 * verify_jwt: true
 * CORS: https://demo.passtodigital.com
 *
 * Returns the health status of all demo environment dependencies:
 * Twilio (SMS), wallet signing routes, Apple demo cert, and environment guard.
 * Called from the presenter console preflight checklist.
 *
 * Input:  {} (empty body)
 * Output: { health: { twilio, wallet_apple, wallet_google, apple_demo_cert, env_guard, all_ready } }
 *
 * TASK: TASK-0074
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

  // Check persona setup
  const { data: persona } = await supabaseAdmin
    .from("demo_personas")
    .select("auth_user_id, demo_email")
    .eq("persona_key", "avery_demo")
    .maybeSingle();

  const personaReady = !!(persona?.auth_user_id && persona?.demo_email);

  const twilioConfigured       = !!(Deno.env.get("TWILIO_ACCOUNT_SID") && Deno.env.get("TWILIO_AUTH_TOKEN") && Deno.env.get("TWILIO_PHONE_NUMBER"));
  const walletAppleConfigured  = !!(Deno.env.get("VERCEL_SIGN_APPLE_URL")  && Deno.env.get("WALLET_INTERNAL_SECRET"));
  const walletGoogleConfigured = !!(Deno.env.get("VERCEL_SIGN_GOOGLE_URL") && Deno.env.get("WALLET_INTERNAL_SECRET"));
  const appleDemoCert          = !!(Deno.env.get("APPLE_DEMO_PASS_TYPE_ID"));
  const supabaseUrl_           = Deno.env.get("SUPABASE_URL") ?? "";
  const envGuardPassed         = !supabaseUrl_.includes("wvzjfxacykgsaffskgtr");

  const allReady = personaReady && twilioConfigured && walletAppleConfigured && appleDemoCert && envGuardPassed;

  return json({
    health: {
      persona_configured:   personaReady,
      twilio_configured:    twilioConfigured,
      wallet_apple:         walletAppleConfigured,
      wallet_google:        walletGoogleConfigured,
      apple_demo_cert:      appleDemoCert,
      env_guard_passed:     envGuardPassed,
      all_ready:            allReady,
    },
  });
});
