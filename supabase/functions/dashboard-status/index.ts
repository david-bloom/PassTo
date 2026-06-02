/**
 * dashboard-status
 *
 * TASK-0055 — Implement Nurse Dashboard Launch-Critical Status View
 *
 * verify_jwt: true
 *
 * Called by Lovable from /dashboard to get server-derived credential, license,
 * wallet, and subscription state for display. Status surface only — does not
 * issue credentials, advance onboarding, or mutate any table.
 *
 * Gate: onboarding_step must be in ["pass", "complete"].
 *
 * TASK: TASK-0055
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
  if (req.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabaseAuth  = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  // ── 2. Load profile + gate ─────────────────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, onboarding_step, account_status, subscription_tier")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);
  if (profile.account_status !== "active") return json({ error: "account_not_active" }, 403);
  if (!TERMINAL_STEPS.has(profile.onboarding_step)) {
    return json({
      error: "onboarding_not_complete",
      onboarding_step: profile.onboarding_step,
    }, 403);
  }

  // ── 3. Load subscription state — fail closed on read error ────────────────
  const { data: activeSub, error: subReadErr } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_name, status, license_entitlement_count")
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subReadErr) {
    console.error("dashboard-status: subscriptions read failed:", subReadErr.message);
    return json({ error: "backend_read_error" }, 503);
  }

  // ── 4. Load primary license — fail closed on read error ───────────────────
  const { data: license, error: licReadErr } = await supabaseAdmin
    .from("licenses")
    .select("license_type, state, normalized_status, status_intent, expiration_date, status_checked_at, data_match_passed")
    .eq("profile_id", profile.id)
    .eq("is_primary", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (licReadErr) {
    console.error("dashboard-status: licenses read failed:", licReadErr.message);
    return json({ error: "backend_read_error" }, 503);
  }

  // ── 5. Load credential — fail closed on read error ────────────────────────
  const { data: credential, error: credReadErr } = await supabaseAdmin
    .from("credentials")
    .select("id, status, issued_at, expires_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (credReadErr) {
    console.error("dashboard-status: credential read failed:", credReadErr.message);
    return json({ error: "backend_read_error" }, 503);
  }

  // ── 6. Load per-provider wallet state — fail closed on read error ──────────
  type WalletPassRow = {
    provider: string;
    status: string;
    pass_url: string | null;
    external_pass_id: string | null;
  };
  let applePass:  WalletPassRow | null = null;
  let googlePass: WalletPassRow | null = null;

  if (credential) {
    const { data: passes, error: passReadErr } = await supabaseAdmin
      .from("wallet_passes")
      .select("provider, status, pass_url, external_pass_id")
      .eq("credential_id", credential.id);

    if (passReadErr) {
      console.error("dashboard-status: wallet_passes read failed:", passReadErr.message);
      return json({ error: "backend_read_error" }, 503);
    }

    for (const p of (passes ?? [])) {
      if (p.provider === "apple_wallet")  applePass  = p as WalletPassRow;
      if (p.provider === "google_wallet") googlePass = p as WalletPassRow;
    }
  }

  const appleState = applePass
    ? {
        status:   applePass.status,
        pass_url: applePass.status === "issued" ? applePass.pass_url : null,
      }
    : { status: "not_attempted", pass_url: null };

  const googleState = googlePass
    ? {
        status:   googlePass.status,
        save_url: googlePass.status === "issued" ? googlePass.external_pass_id : null,
      }
    : { status: "not_attempted", save_url: null };

  const anyIssued = applePass?.status === "issued" || googlePass?.status === "issued";

  // ── 7. Derive add-license entitlement ─────────────────────────────────────
  const canAddLicense =
    activeSub !== null && (activeSub.license_entitlement_count ?? 0) > 1;

  // ── 8. Return status payload ───────────────────────────────────────────────
  return json({
    onboarding_step: profile.onboarding_step,
    account_status:  profile.account_status,

    // Subscription
    subscription_tier:      profile.subscription_tier,
    subscription_status:    activeSub?.status    ?? null,
    subscription_plan_name: activeSub?.plan_name ?? null,

    // License (primary)
    license_type:              license?.license_type      ?? null,
    license_state:             license?.state             ?? null,
    license_normalized_status: license?.normalized_status ?? null,
    license_status_intent:     license?.status_intent     ?? null,
    license_expiration_date:   license?.expiration_date   ?? null,
    license_current_as_of:     license?.status_checked_at ?? null,
    license_data_match_passed: license?.data_match_passed ?? false,

    // Credential
    credential_status:     credential?.status    ?? "none",
    credential_issued_at:  credential?.issued_at ?? null,
    credential_expires_at: credential?.expires_at ?? null,

    // Per-provider wallet state
    wallet: {
      apple:      appleState,
      google:     googleState,
      any_issued: anyIssued,
    },

    // Share-link — not yet implemented (TASK-0056)
    share_link_eligible: false,
    share_link_reason:   "not_implemented",

    // Add-license entitlement
    can_add_license: canAddLicense,
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
