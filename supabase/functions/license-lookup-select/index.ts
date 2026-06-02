/**
 * license-lookup-select — TASK-0054
 * POST — nurse selects a candidate from multi-match search results.
 * Resolves via /verify then applies full TASK-0046 validation.
 * Gate: onboarding_step = 'license_checking', IAL2, active.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://enroll.passtodigital.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RAPIDAPI_VERIFY_URL = "https://nurse-license-verification.p.rapidapi.com/verify";
const RAPIDAPI_HOST       = "nurse-license-verification.p.rapidapi.com";

const STATUS_FALLBACK: Record<string, { normalized: string; intent: string; treatment: string }> = {
  "Unknown":         { normalized: "Unknown",    intent: "verification_failure", treatment: "do_not_issue" },
  "Active":          { normalized: "Active",      intent: "credential_valid",     treatment: "valid" },
  "ACTIVE":          { normalized: "Active",      intent: "credential_valid",     treatment: "valid" },
  "Current":         { normalized: "Active",      intent: "credential_valid",     treatment: "valid" },
  "Clear":           { normalized: "Active",      intent: "credential_valid",     treatment: "valid" },
  "Inactive":        { normalized: "Inactive",    intent: "credential_invalid",   treatment: "invalid" },
  "Expired":         { normalized: "Expired",     intent: "credential_invalid",   treatment: "invalid" },
  "Lapsed":          { normalized: "Expired",     intent: "credential_invalid",   treatment: "invalid" },
  "Suspended":       { normalized: "Suspended",   intent: "credential_invalid",   treatment: "invalid" },
  "Revoked":         { normalized: "Revoked",     intent: "credential_invalid",   treatment: "invalid" },
  "Surrendered":     { normalized: "Surrendered", intent: "credential_invalid",   treatment: "invalid" },
  "Pending":         { normalized: "Pending",     intent: "credential_invalid",   treatment: "invalid" },
  "Pending Renewal": { normalized: "Pending",     intent: "credential_invalid",   treatment: "invalid" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const rapidApiKey  = Deno.env.get("RAPIDAPI_KEY") ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabaseAuth  = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, onboarding_step, account_status, id_verification_status, id_verification_level")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile)                                      return json({ error: "profile_not_found" }, 404);
  if (profile.account_status !== "active")           return json({ error: "account_not_active" }, 403);
  if (profile.id_verification_status !== "verified") return json({ error: "identity_not_verified" }, 403);
  if (profile.id_verification_level !== "IAL2")      return json({ error: "insufficient_assurance_level" }, 403);
  if (profile.onboarding_step !== "license_checking") return json({ error: "invalid_onboarding_step" }, 403);

  let lookup_id: string;
  let selected_license_number: string;
  try {
    const body = await req.json();
    lookup_id = body?.lookup_id ?? "";
    selected_license_number = normLicNum(body?.license_number ?? "");
  } catch {
    return json({ error: "invalid_input" }, 400);
  }
  if (!lookup_id || !selected_license_number) return json({ error: "invalid_input" }, 400);

  // Validate lookup belongs to this profile and is in needs_selection state
  const { data: lookup } = await supabaseAdmin
    .from("license_lookups")
    .select("id, submitted_state, submitted_license_type, result")
    .eq("id", lookup_id)
    .eq("profile_id", profile.id)
    .eq("result", "needs_selection")
    .maybeSingle();

  if (!lookup) return json({ error: "lookup_not_found_or_invalid" }, 404);

  const licenseState = lookup.submitted_state ?? "";
  const licenseType  = lookup.submitted_license_type ?? "";
  if (!rapidApiKey) return json({ error: "source_unavailable" }, 503);

  // Resolve via /verify
  let providerRecord: Record<string, unknown> | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(RAPIDAPI_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-RapidAPI-Key": rapidApiKey, "X-RapidAPI-Host": RAPIDAPI_HOST },
        body: JSON.stringify({ license_number: selected_license_number, state: licenseState }),
        signal: controller.signal,
      });
    } finally { clearTimeout(timeout); }
    if (res.status === 404) { providerRecord = null; }
    else if (!res.ok) { throw new Error(`provider_http_${res.status}`); }
    else { providerRecord = await res.json() as Record<string, unknown>; }
  } catch (e) {
    console.error("/verify failed in select:", (e as Error).message);
    await supabaseAdmin.from("license_lookups").update({ result: "provider_error", completed_at: new Date().toISOString(), error_message: (e as Error).message }).eq("id", lookup_id);
    // Revert step to license for retry
    await supabaseAdmin.from("profiles").update({ onboarding_step: "license", updated_at: new Date().toISOString() }).eq("id", profile.id).eq("onboarding_step", "license_checking");
    return json({ error: "source_unavailable", message_code: "license_source_unavailable" }, 200);
  }

  if (!providerRecord) {
    await supabaseAdmin.from("license_lookups").update({ result: "not_found", completed_at: new Date().toISOString() }).eq("id", lookup_id);
    await supabaseAdmin.from("profiles").update({ onboarding_step: "license", updated_at: new Date().toISOString() }).eq("id", profile.id).eq("onboarding_step", "license_checking");
    return json({ success: false, error: "not_found", message_code: "license_not_found" }, 200);
  }

  // Full TASK-0046 validation: number match, holder name, type, status
  const returnedNum = normLicNum(String(providerRecord.license_number ?? ""));
  if (returnedNum !== selected_license_number) {
    await failAndRevert(supabaseAdmin, lookup_id, profile.id, "license_number_mismatch", "number mismatch on select verify");
    return json({ success: false, error: "not_found", message_code: "license_not_found" }, 200);
  }

  const fullName  = String(providerRecord.full_name ?? "").trim();
  let holderFirst: string | null = null;
  let holderLast:  string | null = null;
  const ci = fullName.indexOf(",");
  if (ci >= 0) {
    holderLast  = fullName.slice(0, ci).trim() || null;
    holderFirst = (fullName.slice(ci + 1).trim().split(/\s+/)[0]) || null;
  } else if (fullName) {
    const parts = fullName.split(/\s+/);
    if (parts.length >= 2) { holderFirst = parts[0]; holderLast = parts[parts.length - 1]; }
  }
  if (!holderFirst || !holderLast) {
    await failAndRevert(supabaseAdmin, lookup_id, profile.id, "missing_required_field", "missing holder name");
    return json({ success: false, error: "missing_required_field", message_code: "license_lookup_incomplete" }, 200);
  }

  const providerType = providerRecord.license_type ? String(providerRecord.license_type).trim().toUpperCase() : null;
  if (!providerType) {
    await failAndRevert(supabaseAdmin, lookup_id, profile.id, "missing_required_field", "missing license type");
    return json({ success: false, error: "missing_required_field", message_code: "license_lookup_incomplete" }, 200);
  }
  if (providerType !== licenseType) {
    await failAndRevert(supabaseAdmin, lookup_id, profile.id, "license_type_mismatch", `submitted ${licenseType} provider ${providerType}`);
    return json({ success: false, error: "license_type_mismatch", message_code: "license_type_mismatch" }, 200);
  }

  const rawStatus = providerRecord.license_status ? String(providerRecord.license_status) : "Unknown";
  const st = STATUS_FALLBACK[rawStatus] ?? { normalized: "Unknown", intent: "verification_failure", treatment: "do_not_issue" };
  const eligible = st.normalized === "Active" && st.intent === "credential_valid";

  const now = new Date().toISOString();
  const allowlistedPayload = { provider: "rapidapi", endpoint: RAPIDAPI_VERIFY_URL, query_state: licenseState, matched: true, matched_license_type: providerType };

  // Persist license row
  const { data: existingLicense } = await supabaseAdmin.from("licenses").select("id").eq("profile_id", profile.id).eq("state", licenseState).eq("license_type", licenseType).eq("license_number", selected_license_number).maybeSingle();
  let licenseId: string;
  if (existingLicense) {
    await supabaseAdmin.from("licenses").update({ first_name: holderFirst, last_name: holderLast, source_status_raw: rawStatus, source_status_display: st.normalized, normalized_status: st.normalized, status_intent: st.intent, wallet_pass_treatment: st.treatment, expiration_date: providerRecord.expiration_date ? String(providerRecord.expiration_date) : null, lookup_source: "rapidapi", lookup_response: allowlistedPayload, status_checked_at: now, data_match_passed: false, dob_match_mode: null, updated_at: now }).eq("id", existingLicense.id);
    licenseId = existingLicense.id;
  } else {
    const { data: nl, error: nie } = await supabaseAdmin.from("licenses").insert({ profile_id: profile.id, state: licenseState, license_type: providerType, license_number: selected_license_number, first_name: holderFirst, last_name: holderLast, source_status_raw: rawStatus, source_status_display: st.normalized, normalized_status: st.normalized, status_intent: st.intent, wallet_pass_treatment: st.treatment, expiration_date: providerRecord.expiration_date ? String(providerRecord.expiration_date) : null, is_primary: true, lookup_source: "rapidapi", lookup_response: allowlistedPayload, status_checked_at: now }).select("id").single();
    if (nie || !nl) return json({ error: "server_error" }, 500);
    licenseId = nl.id;
  }

  await supabaseAdmin.from("license_lookups").update({ license_id: licenseId, submitted_license_number: selected_license_number }).eq("id", lookup_id);

  if (!eligible) {
    await supabaseAdmin.from("license_lookups").update({ result: `status_ineligible:${st.normalized}`, completed_at: now }).eq("id", lookup_id);
    await supabaseAdmin.from("profiles").update({ onboarding_step: "license", updated_at: now }).eq("id", profile.id).eq("onboarding_step", "license_checking");
    return json({ success: false, credential_eligible: false, normalized_status: st.normalized, message_code: rawStatus === "Unknown" ? "license_status_unavailable" : "license_not_active" }, 200);
  }

  // Name match
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z\s\-]/g,"").replace(/-/g," ").replace(/\s+/g," ").trim().split(" ").filter(Boolean);
  const iF = norm(profile.first_name); const iL = norm(profile.last_name);
  const lF = norm(holderFirst);        const lL = norm(holderLast);
  let matchResult = "passed";
  if (!iF.length || !iL.length) matchResult = "blocked_missing_idme";
  else if (!lF.length || !lL.length) matchResult = "blocked_missing_license_holder";
  else if (iF[0] !== lF[0] || iL[iL.length-1] !== lL[lL.length-1]) matchResult = "blocked_name_mismatch";

  const { error: rpcErr } = await supabaseAdmin.rpc("complete_license_verification", { p_profile_id: profile.id, p_license_id: licenseId, p_match_result: matchResult, p_dob_match_mode: "name_only" });
  if (rpcErr) {
    console.error("RPC failed on select:", rpcErr);
    return json({ error: "server_error" }, 500);
  }

  await supabaseAdmin.from("license_lookups").update({ result: matchResult === "passed" ? "success" : "failed", completed_at: now }).eq("id", lookup_id);

  if (matchResult !== "passed") {
    await supabaseAdmin.from("profiles").update({ onboarding_step: "license", updated_at: now }).eq("id", profile.id).in("onboarding_step", ["license_checking","phone","confirm"]);
    return json({ success: false, credential_eligible: false, error: matchResult, message_code: "identity_license_mismatch" }, 200);
  }

  // Correct step to 'confirm' (RPC sets 'phone'; TASK-0054 requires 'confirm' first)
  await supabaseAdmin.from("profiles").update({ onboarding_step: "confirm", updated_at: now }).eq("id", profile.id).in("onboarding_step", ["phone","confirm","license_checking"]);

  return json({ success: true, credential_eligible: true, next_step: "confirm" }, 200);
});

async function failAndRevert(admin: ReturnType<typeof createClient>, lookupId: string, profileId: string, result: string, errorMsg: string) {
  const now = new Date().toISOString();
  await admin.from("license_lookups").update({ result, completed_at: now, error_message: errorMsg }).eq("id", lookupId);
  await admin.from("profiles").update({ onboarding_step: "license", updated_at: now }).eq("id", profileId).eq("onboarding_step", "license_checking");
}

function normLicNum(n: string): string { return n.replace(/[^A-Z0-9]/gi,"").toUpperCase(); }

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
