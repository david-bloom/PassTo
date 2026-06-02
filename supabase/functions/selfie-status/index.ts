/**
 * selfie-status
 *
 * TASK-0047 — Reorder Phone, Plan, Payment, Selfie, and Success Backend Routing
 *
 * verify_jwt: true
 *
 * Called by Lovable on /upload-selfie page load to verify the nurse is allowed
 * to be on this route.
 *
 * Gate: onboarding_step = 'selfie', account active.
 * For free plan: step is reached directly from plan-select.
 * For paid plans: step is reached after TASK-0040 Stripe payment confirmation.
 *
 * Returns server-derived selfie state. Selfie upload mechanics (Supabase Storage
 * write and step advance to 'pass') are deferred pending David approval of
 * selfie requirement at MVP.
 *
 * TASK: TASK-0047
 * Codex QA: required before production use
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://enroll.passtodigital.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, onboarding_step, account_status, subscription_tier, selfie_captured_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);

  if (profile.account_status !== "active")  return json({ error: "account_not_active" }, 403);
  if (profile.onboarding_step !== "selfie") return json({ error: "invalid_onboarding_step", onboarding_step: profile.onboarding_step }, 403);

  return json({
    onboarding_step:    profile.onboarding_step,
    subscription_tier:  profile.subscription_tier,
    selfie_captured:    profile.selfie_captured_at !== null,
    selfie_captured_at: profile.selfie_captured_at ?? null,
  }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
