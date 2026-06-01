/**
 * plan-select
 *
 * TASK-0047 — Reorder Phone, Plan, Payment, Selfie, and Success Backend Routing
 *
 * verify_jwt: true
 *
 * Called by Lovable from /account-select when the nurse selects a plan.
 *
 * Flow:
 *   1. Authenticate caller
 *   2. Validate gate: onboarding_step = 'plan', ID.me verified/IAL2, account active,
 *      phone written, primary license data_match_passed = true
 *   3. Validate plan name
 *   4. Write subscription_tier on profiles
 *   5. Advance onboarding_step:
 *      - free  → 'selfie'
 *      - paid  → 'payment'  (Stripe checkout handled by TASK-0040)
 *   6. Write audit event
 *   7. Return next_step to Lovable
 *
 * Stripe note:
 *   Paid-plan users are advanced to onboarding_step = 'payment'.
 *   Actual Stripe checkout and payment confirmation are TASK-0040 scope.
 *   Until TASK-0040 is implemented, paid-plan users will be gated at /payment.
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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_PLANS = new Set(["free", "standard", "premier"]);
const PAID_PLANS  = new Set(["standard", "premier"]);

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

  // ── 1. Authenticate caller ─────────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  // ── 2. Load and validate profile gate ─────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, onboarding_step, account_status, phone, id_verification_status, id_verification_level")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);

  if (profile.account_status !== "active")           return json({ error: "account_not_active" }, 403);
  if (profile.id_verification_status !== "verified") return json({ error: "identity_not_verified" }, 403);
  if (profile.id_verification_level !== "IAL2")      return json({ error: "insufficient_assurance_level" }, 403);
  if (profile.onboarding_step !== "plan")            return json({ error: "invalid_onboarding_step" }, 403);
  if (!profile.phone)                                return json({ error: "phone_not_verified" }, 403);

  // Require durable license match gate
  const { data: primaryLicense } = await supabaseAdmin
    .from("licenses")
    .select("data_match_passed")
    .eq("profile_id", profile.id)
    .eq("is_primary", true)
    .eq("data_match_passed", true)
    .maybeSingle();

  if (!primaryLicense) return json({ error: "license_not_verified" }, 403);

  // ── 3. Parse and validate plan ─────────────────────────────────────────────
  let plan_name: string;

  try {
    const body = await req.json();
    plan_name = (body?.plan_name ?? "").toString().trim().toLowerCase();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }

  if (!VALID_PLANS.has(plan_name)) {
    return json({ error: "invalid_plan" }, 400);
  }

  // ── 4. Determine next step ─────────────────────────────────────────────────
  const next_step = PAID_PLANS.has(plan_name) ? "payment" : "selfie";

  // ── 5. Write subscription_tier + advance onboarding step ──────────────────
  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: plan_name,
      onboarding_step:   next_step,
      updated_at:        new Date().toISOString(),
    })
    .eq("id", profile.id)
    .eq("onboarding_step", "plan"); // optimistic concurrency guard

  if (updateErr) {
    console.error("plan-select: profile update failed:", updateErr);
    return json({ error: "server_error" }, 500);
  }

  // ── 6. Audit event ─────────────────────────────────────────────────────────
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id:      profile.id,
    action:        "plan.selected",
    resource_type: "profile",
    resource_id:   profile.id,
    change_after:  {
      plan_name,
      onboarding_step: next_step,
    },
  });
  if (auditErr) console.error("plan-select: audit write failed (non-fatal):", auditErr);

  // ── 7. Return next step ────────────────────────────────────────────────────
  return json({ success: true, plan_name, next_step }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type":  "application/json",
      "Cache-Control": "no-store",
    },
  });
}
