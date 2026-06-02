/**
 * payment-status
 *
 * TASK-0047 — Reorder Phone, Plan, Payment, Selfie, and Success Backend Routing
 *
 * verify_jwt: true
 *
 * Called by Lovable on /payment page load to verify the nurse is allowed to be
 * on this route and to surface the current payment confirmation state.
 *
 * Gate: onboarding_step = 'payment', account active, subscription_tier != 'free'.
 *
 * Returns 403 if any gate fails — Lovable must redirect.
 * payment_confirmed is always false until TASK-0040 Stripe webhook confirmation
 * writes an active row to the subscriptions table.
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
    .select("id, onboarding_step, account_status, subscription_tier")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);

  if (profile.account_status !== "active")  return json({ error: "account_not_active" }, 403);
  if (profile.onboarding_step !== "payment") return json({ error: "invalid_onboarding_step", onboarding_step: profile.onboarding_step }, 403);
  if (profile.subscription_tier === "free") return json({ error: "free_plan_no_payment" }, 403);

  // Check for Stripe-confirmed subscription (written by TASK-0040 webhook).
  // payment_confirmed = true means the nurse can advance past /payment.
  const { data: activeSub } = await supabaseAdmin
    .from("subscriptions")
    .select("id, plan_name, status")
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  return json({
    onboarding_step:    profile.onboarding_step,
    selected_plan:      profile.subscription_tier,
    payment_confirmed:  activeSub !== null,
    stripe_status:      activeSub?.status ?? null,
  }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
