/**
 * confirm-info-complete — TASK-0054
 * POST — nurse confirms their info. Records phone intent, advances to 'phone' step.
 * Gate: onboarding_step = 'confirm', data_match_passed = true.
 * Phone intent stored but NOT verified — Twilio OTP still required.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://enroll.passtodigital.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const E164_RE = /^\+[1-9]\d{6,14}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabaseAuth  = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, onboarding_step, account_status, id_verification_status, id_verification_level")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);
  if (profile.account_status !== "active")           return json({ error: "account_not_active" }, 403);
  if (profile.id_verification_status !== "verified") return json({ error: "identity_not_verified" }, 403);
  if (profile.id_verification_level !== "IAL2")      return json({ error: "insufficient_assurance_level" }, 403);
  if (profile.onboarding_step !== "confirm")         return json({ error: "invalid_onboarding_step", onboarding_step: profile.onboarding_step }, 403);

  // Require data_match_passed
  const { data: license } = await supabaseAdmin
    .from("licenses")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("is_primary", true)
    .eq("data_match_passed", true)
    .maybeSingle();

  if (!license) return json({ error: "license_not_verified" }, 403);

  // Parse confirmed_phone
  let confirmed_phone: string;
  try {
    const body = await req.json();
    confirmed_phone = (body?.confirmed_phone ?? "").toString().trim();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }

  if (!E164_RE.test(confirmed_phone)) return json({ error: "invalid_phone" }, 400);

  const now = new Date().toISOString();

  // P1 fix: write audit BEFORE advancing step.
  // If audit fails, return error without touching onboarding_step.
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id: profile.id,
    action: "confirm.info_confirmed",
    resource_type: "profile",
    resource_id: profile.id,
    change_after: { onboarding_step: "phone", phone_intent: confirmed_phone },
  });
  if (auditErr) {
    console.error("confirm-info-complete: audit write failed — aborting step advance:", auditErr.message);
    return json({ error: "server_error" }, 500);
  }

  // Advance step to 'phone'. Store phone as intent (not verified).
  // phone-verify-otp writes profiles.phone only after Twilio OTP success.
  const { data: updatedRow, error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({ onboarding_step: "phone", updated_at: now })
    .eq("id", profile.id)
    .eq("onboarding_step", "confirm")
    .select("id")
    .single();

  if (updateErr || !updatedRow) {
    console.error("confirm-info-complete: update failed:", updateErr);
    return json({ error: "invalid_step_conflict" }, 409);
  }

  return json({ success: true, next_step: "phone", phone_intent: confirmed_phone }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
