/**
 * confirm-info-status — TASK-0054
 * GET — returns safe display payload for /confirm-info.
 * Gate: onboarding_step = 'confirm', data_match_passed = true.
 * Returns matched nurse identity + license + contact info.
 * No raw provider data, no discipline details.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://enroll.passtodigital.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email, phone, onboarding_step, account_status, id_verification_status, id_verification_level")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);
  if (profile.account_status !== "active")           return json({ error: "account_not_active" }, 403);
  if (profile.id_verification_status !== "verified") return json({ error: "identity_not_verified" }, 403);
  if (profile.id_verification_level !== "IAL2")      return json({ error: "insufficient_assurance_level" }, 403);
  if (profile.onboarding_step !== "confirm")         return json({ error: "invalid_onboarding_step", onboarding_step: profile.onboarding_step }, 403);

  // Require data_match_passed on primary license
  const { data: license } = await supabaseAdmin
    .from("licenses")
    .select("license_number, state, license_type, first_name, last_name, normalized_status, expiration_date, data_match_passed")
    .eq("profile_id", profile.id)
    .eq("is_primary", true)
    .eq("data_match_passed", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!license) return json({ error: "license_not_verified" }, 403);

  const holderName = [license.first_name, license.last_name].filter(Boolean).join(" ") || null;

  return json({
    id_me_verified_name: {
      first_name: profile.first_name ?? null,
      last_name:  profile.last_name  ?? null,
    },
    license: {
      license_number:    license.license_number,
      license_state:     license.state,
      license_type:      license.license_type,
      holder_name:       holderName,
      normalized_status: license.normalized_status,
      expiration_date:   license.expiration_date ?? null,
    },
    contact: {
      email:        profile.email        ?? null,
      phone:        profile.phone        ?? null,
      phone_source: profile.phone ? "profile" : "none",
    },
    phone_note: "You'll verify phone ownership via SMS on the next step.",
  }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
