/**
 * license-simulate
 *
 * TASK-0074 Phase 3 — Provider Simulator: License Lookup
 *
 * verify_jwt: true
 * CORS: https://demo.passtodigital.com
 *
 * Accepts any 2–20 char alphanumeric license number and returns a synthetic
 * Active license record for the Avery Demo persona. The license number is
 * echoed into the synthetic record so the nurse sees what she typed.
 *
 * Reserved prefix 'FAIL' triggers a deterministic failure response for internal
 * testing. Do NOT expose FAIL prefix behavior during moderated nurse sessions.
 *
 * Input:  { license_number: string, demo_session_id: string }
 * Output: { success: true, synthetic: true, license: { ... } }
 *
 * Audit:  demo.license_simulated (actor_id = profile.id)
 *
 * State writes (idempotent via upsert):
 *   - Upserts a licenses row with data_match_passed=true, normalized_status='Active',
 *     status_intent='credential_valid', wallet_pass_treatment='valid'
 *   - Calls complete_license_verification RPC to advance onboarding_step: license → phone
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

const LICENSE_PATTERN = /^[a-zA-Z0-9]{2,20}$/;

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

  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  // ── 2. Load profile ────────────────────────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, account_status, id_verification_status, id_verification_level, onboarding_step")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile)                       return json({ error: "profile_not_found" }, 404);
  if (profile.account_status !== "active")          return json({ error: "account_not_active" }, 403);
  if (profile.id_verification_status !== "verified") return json({ error: "identity_not_verified" }, 403);
  if (profile.id_verification_level !== "IAL2")      return json({ error: "insufficient_assurance_level" }, 403);

  // ── 3. Parse + validate request body ─────────────────────────────────────
  let body: { license_number?: string; demo_session_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const { license_number, demo_session_id } = body;

  if (!license_number || !LICENSE_PATTERN.test(license_number)) {
    return json({ error: "license_number must be 2–20 alphanumeric characters" }, 400);
  }
  if (!demo_session_id) return json({ error: "demo_session_id_required" }, 400);

  // ── 4. Validate demo session ───────────────────────────────────────────────
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("demo_sessions")
    .select("id, demo_session_id, mode, persona")
    .eq("demo_session_id", demo_session_id)
    .maybeSingle();

  if (sessionErr || !session) return json({ error: "invalid_demo_session" }, 400);

  // ── 5. Load persona ────────────────────────────────────────────────────────
  const { data: persona } = await supabaseAdmin
    .from("demo_personas")
    .select("first_name, last_name, license_type, license_state")
    .eq("persona_key", session.persona)
    .maybeSingle();

  const firstName    = persona?.first_name   ?? "Avery";
  const lastName     = persona?.last_name    ?? "Demo";
  const licenseType  = persona?.license_type  ?? "RN";
  const licenseState = persona?.license_state ?? "NY";
  const now          = new Date().toISOString();

  // ── 6. FAIL prefix — deterministic failure for internal testing only ───────
  if (license_number.toUpperCase().startsWith("FAIL")) {
    await supabaseAdmin.from("audit_events").insert({
      actor_id:      profile.id,
      action:        "demo.license_simulated",
      resource_type: "license",
      resource_id:   profile.id,
      change_after:  { demo_session_id, synthetic: true, outcome: "simulated_failure" },
    }).catch(() => {});

    return json({
      success:   false,
      synthetic: true,
      error:     "license_not_found",
      note:      "SYNTHETIC — deterministic failure triggered by FAIL prefix (internal testing only)",
    }, 404);
  }

  // ── 7. Audit before state write (fail-closed) ─────────────────────────────
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id:      profile.id,
    action:        "demo.license_simulated",
    resource_type: "license",
    resource_id:   profile.id,
    change_after: {
      demo_session_id,
      synthetic:      true,
      license_number,          // safe to log — synthetic data
      outcome:        "passed",
    },
  });
  if (auditErr) {
    console.error("license-simulate: audit write failed:", auditErr.message);
    return json({ error: "server_error" }, 500);
  }

  // ── 8. Upsert synthetic license row ───────────────────────────────────────
  // Set all fields required by credential-create gates:
  //   data_match_passed = true, normalized_status = 'Active',
  //   status_intent = 'credential_valid', wallet_pass_treatment = 'valid'
  const expDate = new Date();
  expDate.setFullYear(expDate.getFullYear() + 2);
  const expirationDate = expDate.toISOString().split("T")[0];

  // Delete existing synthetic primary license first to ensure clean upsert
  await supabaseAdmin
    .from("licenses")
    .delete()
    .eq("profile_id", profile.id)
    .eq("is_primary", true)
    .eq("demo_synthetic", true);

  const { data: licenseRow, error: licenseErr } = await supabaseAdmin
    .from("licenses")
    .insert({
      profile_id:           profile.id,
      license_number,
      license_type:         licenseType,
      state:                licenseState,
      first_name:           firstName,
      last_name:            lastName,
      normalized_status:    "Active",
      status_intent:        "credential_valid",
      wallet_pass_treatment: "valid",
      data_match_passed:    true,
      dob_match_mode:       "demo_simulator",
      expiration_date:      expirationDate,
      is_primary:           true,
      demo_synthetic:       true,
      updated_at:           now,
    })
    .select("id")
    .single();

  if (licenseErr || !licenseRow) {
    console.error("license-simulate: license insert failed:", licenseErr?.message);
    return json({ error: "server_error" }, 500);
  }

  // ── 9. Advance onboarding: license → phone via RPC ────────────────────────
  // complete_license_verification is SECURITY DEFINER — callable by service role.
  const { error: rpcErr } = await supabaseAdmin.rpc("complete_license_verification", {
    p_profile_id:     profile.id,
    p_license_id:     licenseRow.id,
    p_match_result:   "passed",
    p_dob_match_mode: "demo_simulator",
  });

  if (rpcErr) {
    console.error("license-simulate: complete_license_verification RPC failed:", rpcErr.message);
    // License row was inserted. Attempt direct step advance as fallback.
    await supabaseAdmin
      .from("profiles")
      .update({ onboarding_step: "phone", updated_at: now })
      .eq("id", profile.id)
      .in("onboarding_step", ["license"]);
  }

  return json({
    success:   true,
    synthetic: true,
    license: {
      license_number,
      license_holder:  `${firstName} ${lastName}`,
      license_type:    licenseType,
      license_state:   licenseState,
      status:          "Active - Simulated",
      expiration_date: expirationDate,
      data_source:     "demo_simulator",
      note:            "SYNTHETIC — not a real license record",
    },
  });
});
