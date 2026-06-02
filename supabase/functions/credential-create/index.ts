/**
 * credential-create
 *
 * TASK-0049 — Implement Credential Creation Gate
 *
 * verify_jwt: true
 *
 * Called by Lovable from /success on page load (or after selfie-complete advances
 * to 'pass') to create the PassTo credential record.
 *
 * Gate checks (all must pass):
 *   1. Account active
 *   2. ID.me verified at IAL2
 *   3. onboarding_step = 'pass' (or 'complete' — idempotent return of existing)
 *   4. Primary license data_match_passed = true AND normalized_status = 'Active'
 *   5. Phone verified (profiles.phone is set by phone-verify-otp)
 *   6. Payment gate: free plan OR active subscription row from Stripe webhook
 *
 * Behavior:
 *   - Idempotent: returns existing credential if already created for this profile/license.
 *   - Creates credential row with status = 'pending' and pass_template_data.
 *   - Advances onboarding_step: pass → complete (fail-closed row check).
 *   - Writes audit event BEFORE step advance (audit fail-closed).
 *   - Does NOT call PassKit or any wallet provider (TASK-0050).
 *
 * No migration required. credentials table exists from v4 schema.
 * RLS on credentials is SELECT-only for authenticated; service_role writes here.
 *
 * TASK: TASK-0049
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

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
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
    .select("id, first_name, last_name, email, phone, onboarding_step, account_status, id_verification_status, id_verification_level, subscription_tier")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);

  // ── 3. Gate: account + identity ───────────────────────────────────────────
  if (profile.account_status !== "active")           return json({ error: "account_not_active" }, 403);
  if (profile.id_verification_status !== "verified") return json({ error: "identity_not_verified" }, 403);
  if (profile.id_verification_level !== "IAL2")      return json({ error: "insufficient_assurance_level" }, 403);

  // ── 4. Gate: onboarding step ──────────────────────────────────────────────
  // Allow 'pass' (create) or 'complete' (idempotent return of existing)
  if (profile.onboarding_step !== "pass" && profile.onboarding_step !== "complete") {
    return json({ error: "invalid_onboarding_step", onboarding_step: profile.onboarding_step }, 403);
  }

  // ── 5. Gate: phone verified ───────────────────────────────────────────────
  if (!profile.phone) return json({ error: "phone_not_verified" }, 403);

  // ── 6. Load primary license + gate ────────────────────────────────────────
  const { data: license, error: licenseErr } = await supabaseAdmin
    .from("licenses")
    .select("id, license_type, license_number, state, first_name, last_name, normalized_status, status_intent, wallet_pass_treatment, expiration_date, data_match_passed")
    .eq("profile_id", profile.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (licenseErr || !license) return json({ error: "license_not_found" }, 403);
  if (!license.data_match_passed)                          return json({ error: "license_match_not_passed" }, 403);
  if (license.normalized_status !== "Active")              return json({ error: "license_not_active", normalized_status: license.normalized_status }, 403);
  if (license.status_intent !== "credential_valid")        return json({ error: "license_status_not_issuable" }, 403);
  if (!["valid", "caution"].includes(license.wallet_pass_treatment)) return json({ error: "license_wallet_treatment_not_issuable" }, 403);

  // ── 7. Gate: payment ──────────────────────────────────────────────────────
  // Free plan: no subscription required.
  // Paid plan: must have an active subscriptions row confirmed by Stripe webhook.
  if (profile.subscription_tier !== "free") {
    const { data: activeSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status, plan_name")
      .eq("profile_id", profile.id)
      .eq("status", "active")
      .maybeSingle();

    if (!activeSub) return json({ error: "subscription_not_confirmed" }, 403);
  }

  // ── 8. Idempotency: return existing credential if already created ──────────
  const { data: existing } = await supabaseAdmin
    .from("credentials")
    .select("id, status, pass_template_data, created_at")
    .eq("profile_id", profile.id)
    .eq("license_id", license.id)
    .maybeSingle();

  if (existing) {
    return json({
      credential_id:      existing.id,
      status:             existing.status,
      already_existed:    true,
      onboarding_step:    profile.onboarding_step,
    }, 200);
  }

  // ── 9. Build pass_template_data ───────────────────────────────────────────
  // Safe display fields for PassKit (TASK-0050). No raw provider payload.
  // Holder name from provider-verified license record (not browser input).
  const holderName = [license.first_name, license.last_name].filter(Boolean).join(" ") || null;
  const nurseName  = [profile.first_name,  profile.last_name].filter(Boolean).join(" ") || null;
  const now        = new Date().toISOString();

  const passTemplateData = {
    nurse_name:         nurseName,
    license_holder:     holderName,
    license_type:       license.license_type,
    license_state:      license.state,
    license_number:     license.license_number,
    normalized_status:  license.normalized_status,
    expiration_date:    license.expiration_date ?? null,
    credential_created: now,
  };

  // ── 10. Audit before step advance (fail-closed) ───────────────────────────
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id:      profile.id,
    action:        "credential.created",
    resource_type: "credential",
    resource_id:   profile.id,
    change_after:  {
      license_id:        license.id,
      license_type:      license.license_type,
      license_state:     license.state,
      normalized_status: license.normalized_status,
      onboarding_step:   "complete",
    },
  });

  if (auditErr) {
    console.error("credential-create: audit write failed — aborting:", auditErr.message);
    return json({ error: "server_error" }, 500);
  }

  // ── 11. Create credential row ─────────────────────────────────────────────
  const { data: newCredential, error: credErr } = await supabaseAdmin
    .from("credentials")
    .insert({
      profile_id:        profile.id,
      license_id:        license.id,
      status:            "pending",
      pass_template_data: passTemplateData,
      created_at:        now,
      updated_at:        now,
    })
    .select("id, status")
    .single();

  if (credErr || !newCredential) {
    // PostgreSQL unique constraint violation (23505) means a concurrent call
    // created the credential between our pre-insert check and this insert.
    // Return the existing row idempotently rather than a 500.
    if (credErr?.code === "23505") {
      const { data: raceWinner } = await supabaseAdmin
        .from("credentials")
        .select("id, status, pass_template_data, created_at")
        .eq("profile_id", profile.id)
        .eq("license_id", license.id)
        .maybeSingle();

      if (raceWinner) {
        console.warn("credential-create: unique constraint race — returning existing credential", raceWinner.id);
        return json({
          credential_id:   raceWinner.id,
          status:          raceWinner.status,
          already_existed: true,
          onboarding_step: profile.onboarding_step,
        }, 200);
      }
    }

    console.error("credential-create: insert failed:", credErr);
    await supabaseAdmin.from("audit_events").insert({
      actor_id:      profile.id,
      action:        "credential.creation_failed",
      resource_type: "credential",
      resource_id:   profile.id,
      change_after:  { error: credErr?.message ?? "insert_returned_no_row" },
    }).catch(() => {});
    return json({ error: "server_error" }, 500);
  }

  // ── 12. Advance onboarding step: pass → complete (fail-closed) ────────────
  const { data: stepRow, error: stepErr } = await supabaseAdmin
    .from("profiles")
    .update({ onboarding_step: "complete", updated_at: now })
    .eq("id", profile.id)
    .eq("onboarding_step", "pass")
    .select("id")
    .single();

  if (stepErr || !stepRow) {
    // Credential was created — do not roll back. Log the step conflict.
    // The nurse is functionally complete; step advance failure is recoverable.
    console.error("credential-create: step advance failed (credential created):", stepErr);
    return json({
      credential_id:   newCredential.id,
      status:          newCredential.status,
      already_existed: false,
      onboarding_step: "pass",
      warning:         "step_advance_failed",
    }, 200);
  }

  return json({
    credential_id:   newCredential.id,
    status:          newCredential.status,
    already_existed: false,
    onboarding_step: "complete",
  }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
