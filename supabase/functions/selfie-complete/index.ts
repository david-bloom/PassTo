/**
 * selfie-complete
 *
 * TASK-0047 — Selfie optional at MVP (David approved 2026-06-01)
 *
 * verify_jwt: true
 *
 * Called by Lovable from /upload-selfie when the nurse either:
 *   (a) Skips selfie (selfie_provided = false) — allowed since selfie is optional at MVP
 *   (b) Completes selfie upload and signals done (selfie_provided = true)
 *
 * Selfie file upload to Supabase Storage is handled separately by Lovable
 * using a pre-signed URL or direct upload. This function only advances
 * the onboarding step. Storage upload mechanics are out of scope for MVP.
 *
 * Gate: onboarding_step = 'selfie', account active.
 * Advances: selfie → pass.
 * Writes audit event recording whether selfie was provided or skipped.
 *
 * TASK: TASK-0047 (selfie-optional decision)
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

  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  // ── 2. Load and validate profile gate ─────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, onboarding_step, account_status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);
  if (profile.account_status !== "active")  return json({ error: "account_not_active" }, 403);
  if (profile.onboarding_step !== "selfie") return json({ error: "invalid_onboarding_step", onboarding_step: profile.onboarding_step }, 403);

  // ── 3. Parse body ──────────────────────────────────────────────────────────
  let selfie_provided = false;
  try {
    const body = await req.json();
    selfie_provided = body?.selfie_provided === true;
  } catch {
    // body optional — default to skip (selfie_provided = false)
  }

  // ── 4. Advance step: selfie → pass ─────────────────────────────────────────
  const now = new Date().toISOString();
  const updateFields: Record<string, unknown> = {
    onboarding_step: "pass",
    updated_at:      now,
  };
  if (selfie_provided) {
    updateFields.selfie_captured_at = now;
  }

  const { data: updatedRow, error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update(updateFields)
    .eq("id", profile.id)
    .eq("onboarding_step", "selfie")
    .select("id")
    .single();

  if (updateErr || !updatedRow) {
    console.error("selfie-complete: update failed or zero rows:", updateErr);
    return json({ error: "invalid_step_conflict" }, 409);
  }

  // ── 5. Audit ───────────────────────────────────────────────────────────────
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id:      profile.id,
    action:        selfie_provided ? "selfie.captured" : "selfie.skipped",
    resource_type: "profile",
    resource_id:   profile.id,
    change_after:  { onboarding_step: "pass", selfie_provided },
  });
  if (auditErr) console.error("selfie-complete: audit write failed (non-fatal):", auditErr);

  return json({ success: true, next_step: "pass", selfie_provided }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
