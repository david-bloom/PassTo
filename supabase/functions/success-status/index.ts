/**
 * success-status
 *
 * TASK-0047 — initial implementation
 * TASK-0051 — updated: per-provider wallet state (Apple + Google separate rows)
 *
 * verify_jwt: true
 *
 * Called by Lovable from /success to get server-derived credential and wallet status.
 * Status surface only — does not issue credentials or advance onboarding.
 *
 * Returns separate Apple and Google wallet states from wallet_passes table.
 * wallet_passes has unique(credential_id, provider) — one row per provider.
 *
 * TASK: TASK-0051
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

  // ── 3. Load credential — fail closed on read error ────────────────────────
  const { data: credential, error: credReadErr } = await supabaseAdmin
    .from("credentials")
    .select("id, status, issued_at, expires_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (credReadErr) {
    console.error("success-status: credential read failed:", credReadErr.message);
    return json({ error: "backend_read_error" }, 503);
  }

  // ── 4. Load per-provider wallet state — fail closed on read error ──────────
  type WalletPassRow = { provider: string; status: string; pass_url: string | null; external_pass_id: string | null };
  let applePass:  WalletPassRow | null = null;
  let googlePass: WalletPassRow | null = null;

  if (credential) {
    const { data: passes, error: passReadErr } = await supabaseAdmin
      .from("wallet_passes")
      .select("provider, status, pass_url, external_pass_id")
      .eq("credential_id", credential.id);

    if (passReadErr) {
      console.error("success-status: wallet_passes read failed:", passReadErr.message);
      return json({ error: "backend_read_error" }, 503);
    }

    for (const p of (passes ?? [])) {
      if (p.provider === "apple_wallet")  applePass  = p as WalletPassRow;
      if (p.provider === "google_wallet") googlePass = p as WalletPassRow;
    }
  }

  // ── 5. Derive safe wallet display state ────────────────────────────────────

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

  // ── 6. Entitlement reader — fail closed on read error ─────────────────────
  const { data: activeSub, error: subReadErr } = await supabaseAdmin
    .from("subscriptions")
    .select("license_entitlement_count")
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .gt("license_entitlement_count", 1)
    .maybeSingle();

  if (subReadErr) {
    console.error("success-status: subscriptions read failed:", subReadErr.message);
    return json({ error: "backend_read_error" }, 503);
  }

  const canAddLicense = activeSub !== null;

  // ── 7. Return status payload ───────────────────────────────────────────────
  return json({
    onboarding_step:       profile.onboarding_step,
    subscription_tier:     profile.subscription_tier,

    // Credential
    credential_status:     credential?.status    ?? "none",
    credential_id:         credential?.id        ?? null,
    credential_issued_at:  credential?.issued_at ?? null,
    credential_expires_at: credential?.expires_at ?? null,

    // Per-provider wallet state (TASK-0051)
    wallet: {
      apple:  appleState,
      google: googleState,
      any_issued: anyIssued,
    },

    // Legacy fields — status-gated; prefer wallet.apple / wallet.google going forward
    wallet_status:    applePass?.status  ?? googlePass?.status  ?? "none",
    wallet_pass_url:  (applePass?.status  === "issued" ? applePass.pass_url  : null)
                   ?? (googlePass?.status === "issued" ? googlePass.external_pass_id : null)
                   ?? null,
    wallet_provider:  applePass?.status  === "issued" ? "apple_wallet"
                    : googlePass?.status === "issued" ? "google_wallet"
                    : null,

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
