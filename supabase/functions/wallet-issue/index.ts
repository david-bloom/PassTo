/**
 * wallet-issue
 *
 * TASK-0050 — Wallet Signing and Issuance Contract
 *
 * verify_jwt: true
 *
 * Orchestrates Apple and Google Wallet issuance for an approved credential.
 * Called by Lovable from /success after credential-create succeeds.
 *
 * Gate: credential exists for this profile with status = 'pending' or 'active'.
 * Idempotent: returns existing wallet URLs if already issued.
 *
 * Calls Vercel sign-apple and sign-google routes with WALLET_INTERNAL_SECRET.
 * Writes wallet_passes rows. Updates credential status to 'active' on success.
 *
 * Required Supabase secrets:
 *   WALLET_INTERNAL_SECRET   — shared token for Vercel route authentication
 *   VERCEL_SIGN_APPLE_URL    — https://your-app.vercel.app/api/sign-apple
 *   VERCEL_SIGN_GOOGLE_URL   — https://your-app.vercel.app/api/sign-google
 *
 * Wallet pass contains no permanent QR code (per product decision).
 * PassKit/Apple certificate procurement is a separate David hard gate.
 *
 * TASK: TASK-0050
 * Codex QA: required before production use
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://enroll.passtodigital.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl      = Deno.env.get("SUPABASE_URL")             ?? "";
  const supabaseAnon     = Deno.env.get("SUPABASE_ANON_KEY")        ?? "";
  const supabaseKey      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const internalSecret   = Deno.env.get("WALLET_INTERNAL_SECRET")   ?? "";
  const signAppleUrl     = Deno.env.get("VERCEL_SIGN_APPLE_URL")    ?? "";
  const signGoogleUrl    = Deno.env.get("VERCEL_SIGN_GOOGLE_URL")   ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabaseAuth  = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  // ── 2. Load profile ────────────────────────────────────────────────────────
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, account_status, onboarding_step")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile)                            return json({ error: "profile_not_found" }, 404);
  if (profile.account_status !== "active") return json({ error: "account_not_active" }, 403);
  if (!["pass", "complete"].includes(profile.onboarding_step)) {
    return json({ error: "invalid_onboarding_step", onboarding_step: profile.onboarding_step }, 403);
  }

  // ── 3. Load credential ─────────────────────────────────────────────────────
  const { data: credential } = await supabaseAdmin
    .from("credentials")
    .select("id, status, issued_at")
    .eq("profile_id", profile.id)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!credential) return json({ error: "credential_not_found" }, 404);

  // ── 4. Idempotency: return existing wallet URLs if already issued ──────────
  if (credential.status === "active") {
    const { data: existingPasses } = await supabaseAdmin
      .from("wallet_passes")
      .select("provider, status, pass_url, external_pass_id")
      .eq("credential_id", credential.id)
      .eq("status", "issued");

    if (existingPasses && existingPasses.length > 0) {
      const apple  = existingPasses.find(p => p.provider === "apple_wallet");
      const google = existingPasses.find(p => p.provider === "google_wallet");

      return json({
        credential_id:   credential.id,
        credential_status: "active",
        already_issued:  true,
        apple:  apple  ? { status: "issued", pass_url:  apple.pass_url }              : { status: "not_available" },
        google: google ? { status: "issued", save_url: google.external_pass_id }      : { status: "not_available" },
      }, 200);
    }
  }

  // ── 5. Audit: wallet issuance started ─────────────────────────────────────
  await supabaseAdmin.from("audit_events").insert({
    actor_id: profile.id, action: "wallet.issue_started",
    resource_type: "credential", resource_id: credential.id,
    change_after: { credential_id: credential.id },
  }).catch(e => console.error("wallet.issue_started audit failed (non-fatal):", e.message));

  const now = new Date().toISOString();

  // ── 6. Ensure wallet_passes rows exist (pending) ───────────────────────────
  for (const provider of ["apple_wallet", "google_wallet"]) {
    await supabaseAdmin.from("wallet_passes").upsert({
      credential_id: credential.id,
      provider,
      status: "pending",
      updated_at: now,
    }, { onConflict: "credential_id,provider", ignoreDuplicates: false });
  }

  // ── 7. Call Vercel signing routes ──────────────────────────────────────────
  const authBearer = internalSecret ? `Bearer ${internalSecret}` : "";

  const [appleResult, googleResult] = await Promise.allSettled([
    callSigningRoute(signAppleUrl,  authBearer, credential.id),
    callSigningRoute(signGoogleUrl, authBearer, credential.id),
  ]);

  // ── 8. Process Apple result ────────────────────────────────────────────────
  const appleSuccess  = appleResult.status === "fulfilled"  && appleResult.value?.success;
  const googleSuccess = googleResult.status === "fulfilled" && googleResult.value?.success;

  if (appleSuccess) {
    const r = appleResult.value!;
    await supabaseAdmin.from("wallet_passes").update({
      status:         "issued",
      pass_url:       r.pass_url,
      serial_number:  r.serial_number,
      provider_response: { serial_number: r.serial_number },
      updated_at:     now,
    }).eq("credential_id", credential.id).eq("provider", "apple_wallet");

    await supabaseAdmin.from("audit_events").insert({
      actor_id: profile.id, action: "wallet.apple_issued",
      resource_type: "credential", resource_id: credential.id,
      change_after: { serial_number: r.serial_number },
    }).catch(e => console.error("wallet.apple_issued audit failed:", e.message));
  } else {
    const errMsg = appleResult.status === "fulfilled"
      ? (appleResult.value?.error ?? "provider_error")
      : (appleResult.reason?.message ?? "network_error");

    await supabaseAdmin.from("wallet_passes").update({
      status: "error",
      provider_response: { error: errMsg },
      updated_at: now,
    }).eq("credential_id", credential.id).eq("provider", "apple_wallet");

    await supabaseAdmin.from("audit_events").insert({
      actor_id: profile.id, action: "wallet.apple_failed",
      resource_type: "credential", resource_id: credential.id,
      change_after: { error: errMsg },
    }).catch(() => {});

    console.error("Apple wallet issuance failed:", errMsg);
  }

  // ── 9. Process Google result ───────────────────────────────────────────────
  if (googleSuccess) {
    const r = googleResult.value!;
    await supabaseAdmin.from("wallet_passes").update({
      status:            "issued",
      external_pass_id:  r.save_url,
      provider_response: { object_id: r.object_id },
      updated_at:        now,
    }).eq("credential_id", credential.id).eq("provider", "google_wallet");

    await supabaseAdmin.from("audit_events").insert({
      actor_id: profile.id, action: "wallet.google_issued",
      resource_type: "credential", resource_id: credential.id,
      change_after: { object_id: r.object_id },
    }).catch(e => console.error("wallet.google_issued audit failed:", e.message));
  } else {
    const errMsg = googleResult.status === "fulfilled"
      ? (googleResult.value?.error ?? "provider_error")
      : (googleResult.reason?.message ?? "network_error");

    await supabaseAdmin.from("wallet_passes").update({
      status: "error",
      provider_response: { error: errMsg },
      updated_at: now,
    }).eq("credential_id", credential.id).eq("provider", "google_wallet");

    await supabaseAdmin.from("audit_events").insert({
      actor_id: profile.id, action: "wallet.google_failed",
      resource_type: "credential", resource_id: credential.id,
      change_after: { error: errMsg },
    }).catch(() => {});

    console.error("Google wallet issuance failed:", errMsg);
  }

  // ── 10. Activate credential if at least one provider succeeded ─────────────
  const credentialStatus = (appleSuccess || googleSuccess) ? "active" : "pending";

  if (credentialStatus === "active") {
    await supabaseAdmin.from("credentials").update({
      status:    "active",
      issued_at: now,
      updated_at: now,
    }).eq("id", credential.id);

    await supabaseAdmin.from("audit_events").insert({
      actor_id: profile.id, action: "credential.activated",
      resource_type: "credential", resource_id: credential.id,
      change_after: { status: "active", issued_at: now },
    }).catch(() => {});
  }

  // ── 11. Return result ──────────────────────────────────────────────────────
  return json({
    credential_id:     credential.id,
    credential_status: credentialStatus,
    already_issued:    false,
    apple: appleSuccess && appleResult.status === "fulfilled"
      ? { status: "issued",  pass_url:  appleResult.value!.pass_url }
      : { status: "error",   error: appleResult.status === "fulfilled" ? appleResult.value?.error : "network_error" },
    google: googleSuccess && googleResult.status === "fulfilled"
      ? { status: "issued",  save_url: googleResult.value!.save_url }
      : { status: "error",   error: googleResult.status === "fulfilled" ? googleResult.value?.error : "network_error" },
  }, 200);
});

// ── Helper: call a Vercel signing route ────────────────────────────────────

async function callSigningRoute(
  url: string,
  authBearer: string,
  credentialId: string,
): Promise<Record<string, unknown>> {
  if (!url) throw new Error("signing_route_not_configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": authBearer,
      },
      body: JSON.stringify({ credential_id: credentialId }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`http_${res.status}: ${body.slice(0, 100)}`);
    }

    return await res.json() as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
