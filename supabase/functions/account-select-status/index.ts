/**
 * account-select-status
 *
 * TASK-0047 — Reorder Phone, Plan, Payment, Selfie, and Success Backend Routing
 *
 * verify_jwt: true
 *
 * Called by Lovable on /account-select page load to verify the nurse is allowed
 * to be on this route and to fetch server-derived plan context.
 *
 * Gate: onboarding_step = 'plan', account active, ID.me verified/IAL2,
 *       phone present (Twilio verified), primary license data_match_passed = true.
 *
 * Returns 403 if any gate fails — Lovable must redirect to the appropriate step.
 * Direct URL navigation to /account-select without meeting these conditions is blocked.
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
    .select("id, onboarding_step, account_status, phone, id_verification_status, id_verification_level, subscription_tier")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);

  if (profile.account_status !== "active")           return json({ error: "account_not_active" }, 403);
  if (profile.id_verification_status !== "verified") return json({ error: "identity_not_verified" }, 403);
  if (profile.id_verification_level !== "IAL2")      return json({ error: "insufficient_assurance_level" }, 403);
  if (!profile.phone)                                return json({ error: "phone_not_verified" }, 403);
  if (profile.onboarding_step !== "plan")            return json({ error: "invalid_onboarding_step", onboarding_step: profile.onboarding_step }, 403);

  const { data: primaryLicense } = await supabaseAdmin
    .from("licenses")
    .select("data_match_passed")
    .eq("profile_id", profile.id)
    .eq("is_primary", true)
    .eq("data_match_passed", true)
    .maybeSingle();

  if (!primaryLicense) return json({ error: "license_not_verified" }, 403);

  return json({
    onboarding_step:   profile.onboarding_step,
    selected_plan:     profile.subscription_tier,
    eligible:          true,
  }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
