/**
 * success-status
 *
 * TASK-0047 — Reorder Phone, Plan, Payment, Selfie, and Success Backend Routing
 *
 * verify_jwt: true
 *
 * Called by Lovable from /success to get server-derived credential and wallet status.
 * This is a status surface only — it does not issue credentials or advance onboarding.
 *
 * Flow:
 *   1. Authenticate caller
 *   2. Validate gate: onboarding_step in ['pass', 'complete'], account active
 *   3. Read credential status from credentials table
 *   4. Read wallet pass status from wallet_passes table
 *   5. Return server-derived status object
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

const TERMINAL_STEPS = new Set(["pass", "complete"]);

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

  // ── 2. Load profile and validate gate ─────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, onboarding_step, account_status, subscription_tier")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);

  if (profile.account_status !== "active") return json({ error: "account_not_active" }, 403);

  if (!TERMINAL_STEPS.has(profile.onboarding_step)) {
    return json({ error: "onboarding_not_complete", onboarding_step: profile.onboarding_step }, 403);
  }

  // ── 3. Read credential status ──────────────────────────────────────────────
  const { data: credential } = await supabaseAdmin
    .from("credentials")
    .select("id, status, issued_at, expires_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── 4. Read wallet pass status ─────────────────────────────────────────────
  let walletPass: { status: string; pass_url: string | null; provider: string } | null = null;

  if (credential) {
    const { data: wp } = await supabaseAdmin
      .from("wallet_passes")
      .select("status, pass_url, provider")
      .eq("credential_id", credential.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (wp) walletPass = wp;
  }

  // ── 5. Derive display status ───────────────────────────────────────────────
  // credential_status: issued | pending | failed | none
  // wallet_status:     ready | pending | failed | none
  const credentialStatus = credential?.status ?? "none";
  const walletStatus     = walletPass?.status  ?? "none";

  // add_another_license is only available when subscription_tier supports it.
  // Standard and Premier allow multiple licenses; Free does not.
  const canAddLicense = profile.subscription_tier === "standard" ||
                        profile.subscription_tier === "premier";

  return json({
    onboarding_step:   profile.onboarding_step,
    subscription_tier: profile.subscription_tier,
    credential_status: credentialStatus,
    credential_id:     credential?.id ?? null,
    credential_issued_at: credential?.issued_at ?? null,
    credential_expires_at: credential?.expires_at ?? null,
    wallet_status:     walletStatus,
    wallet_pass_url:   walletPass?.pass_url ?? null,
    wallet_provider:   walletPass?.provider ?? null,
    can_add_license:   canAddLicense,
  }, 200);
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
