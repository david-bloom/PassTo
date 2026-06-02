/**
 * license-lookup-start
 *
 * TASK-0054 — Re-instrument ID.me-First License Lookup Flow
 *
 * verify_jwt: true
 *
 * Starts a license lookup from /license-info. Handles two paths:
 *   - Verify path (license_number provided): POST /verify → synchronous result
 *   - Search path (no license_number): POST /search by name → resolve via /verify
 *
 * On success → advances onboarding_step to 'confirm'.
 * On needs_selection (multi-candidate search) → advances to 'license_checking'.
 * On failure → stays at 'license' for retry.
 *
 * 3-attempt limit enforced server-side (counts license_lookups rows for this profile).
 * Search fallback blocked server-side for unsupported license types.
 *
 * Required secrets: RAPIDAPI_KEY
 *
 * TASK: TASK-0054
 * Codex QA: required before production use
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://enroll.passtodigital.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RAPIDAPI_VERIFY_URL = "https://nurse-license-verification.p.rapidapi.com/verify";
const RAPIDAPI_SEARCH_URL = "https://nurse-license-verification.p.rapidapi.com/search";
const RAPIDAPI_HOST       = "nurse-license-verification.p.rapidapi.com";

const VALID_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC","PR","VI","GU","MP","AS",
]);

const VALID_LICENSE_TYPES = new Set([
  "RN","LPN","APRN","NP","CRNA","CNM","CNS","CNA","MA","EMT","PARAMEDIC","DENTAL","OTHER",
]);

// License types for which the name-search fallback is supported.
// Types not in this set return search_not_supported_for_type.
const SEARCH_SUPPORTED_TYPES = new Set(["RN","LPN","APRN","NP","CRNA","CNM","CNS","CNA"]);

const MAX_ATTEMPTS = 3;

const STATUS_FALLBACK: Record<string, { normalized: string; intent: string; treatment: string }> = {
  "Unknown":         { normalized: "Unknown",    intent: "verification_failure", treatment: "do_not_issue" },
  "Active":          { normalized: "Active",      intent: "credential_valid",     treatment: "valid" },
  "ACTIVE":          { normalized: "Active",      intent: "credential_valid",     treatment: "valid" },
  "Current":         { normalized: "Active",      intent: "credential_valid",     treatment: "valid" },
  "Clear":           { normalized: "Active",      intent: "credential_valid",     treatment: "valid" },
  "Inactive":        { normalized: "Inactive",    intent: "credential_invalid",   treatment: "invalid" },
  "INACTIVE":        { normalized: "Inactive",    intent: "credential_invalid",   treatment: "invalid" },
  "Expired":         { normalized: "Expired",     intent: "credential_invalid",   treatment: "invalid" },
  "EXPIRED":         { normalized: "Expired",     intent: "credential_invalid",   treatment: "invalid" },
  "Lapsed":          { normalized: "Expired",     intent: "credential_invalid",   treatment: "invalid" },
  "Suspended":       { normalized: "Suspended",   intent: "credential_invalid",   treatment: "invalid" },
  "SUSPENDED":       { normalized: "Suspended",   intent: "credential_invalid",   treatment: "invalid" },
  "Revoked":         { normalized: "Revoked",     intent: "credential_invalid",   treatment: "invalid" },
  "REVOKED":         { normalized: "Revoked",     intent: "credential_invalid",   treatment: "invalid" },
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

  // ── 1. Authenticate ──────────────────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  // ── 2. Load profile + gate ───────────────────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, onboarding_step, account_status, id_verification_status, id_verification_level")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);
  if (profile.account_status !== "active")           return json({ error: "account_not_active" }, 403);
  if (profile.id_verification_status !== "verified") return json({ error: "identity_not_verified" }, 403);
  if (profile.id_verification_level !== "IAL2")      return json({ error: "insufficient_assurance_level" }, 403);
  if (profile.onboarding_step !== "license")         return json({ error: "invalid_onboarding_step" }, 403);
  if (!profile.first_name || !profile.last_name)     return json({ error: "profile_missing_verified_name" }, 403);

  // ── 3. Check attempt limit ───────────────────────────────────────────────────
  const { count: attemptCount } = await supabaseAdmin
    .from("license_lookups")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("triggered_by", "onboarding");

  if ((attemptCount ?? 0) >= MAX_ATTEMPTS) {
    await writeAudit(supabaseAdmin, profile.id, "license.max_attempts_reached", {});
    return json({ error: "max_attempts_reached", message_code: "contact_support" }, 403);
  }

  // ── 4. Parse body ────────────────────────────────────────────────────────────
  let license_number: string | null;
  let license_state: string;
  let license_type: string;

  try {
    const body = await req.json();
    license_number = body?.license_number ? body.license_number.toString().trim() : null;
    license_state  = (body?.license_state  ?? "").toString().trim().toUpperCase();
    license_type   = (body?.license_type   ?? "").toString().trim().toUpperCase();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }

  if (!VALID_STATES.has(license_state))       return json({ error: "invalid_state" }, 400);
  if (!VALID_LICENSE_TYPES.has(license_type)) return json({ error: "invalid_license_type" }, 400);

  const search_mode: "verify" | "search" = license_number ? "verify" : "search";
  const licenseNumberNorm = license_number ? normalizeLicenseNumber(license_number) : null;

  // ── 5. Block search for unsupported types ────────────────────────────────────
  if (search_mode === "search" && !SEARCH_SUPPORTED_TYPES.has(license_type)) {
    return json({ error: "search_not_supported_for_type", message_code: "license_number_required_for_type" }, 400);
  }

  if (!rapidApiKey) {
    console.error("RAPIDAPI_KEY not configured");
    return json({ error: "source_unavailable", message_code: "license_source_unavailable" }, 503);
  }

  // ── 6. Create lookup record ──────────────────────────────────────────────────
  const { data: lookupRow, error: lookupInsertErr } = await supabaseAdmin
    .from("license_lookups")
    .insert({
      profile_id:              profile.id,
      triggered_by:            "onboarding",
      result:                  "pending",
      lookup_source:           "rapidapi",
      search_mode,
      submitted_license_number: licenseNumberNorm,
      submitted_state:          license_state,
      submitted_license_type:   license_type,
    })
    .select("id")
    .single();

  if (lookupInsertErr || !lookupRow) {
    console.error("Failed to create lookup record:", lookupInsertErr);
    return json({ error: "server_error" }, 500);
  }

  await writeAudit(supabaseAdmin, profile.id, "license.lookup_started", { search_mode, license_state, license_type });

  // ── 7. Execute lookup ────────────────────────────────────────────────────────
  if (search_mode === "verify") {
    return await runVerify(
      supabaseAdmin, rapidApiKey, profile, lookupRow.id,
      licenseNumberNorm!, license_state, license_type, license_number!,
    );
  } else {
    return await runSearch(
      supabaseAdmin, rapidApiKey, profile, lookupRow.id,
      license_state, license_type,
    );
  }
});

// ── Verify path ───────────────────────────────────────────────────────────────

async function runVerify(
  admin: ReturnType<typeof createClient>,
  apiKey: string,
  profile: Record<string, unknown>,
  lookupId: string,
  licenseNumberNorm: string,
  licenseState: string,
  licenseType: string,
  licenseNumberRaw: string,
): Promise<Response> {
  let providerRecord: Record<string, unknown> | null;

  try {
    providerRecord = await callRapidApiVerify(apiKey, licenseNumberNorm, licenseState);
  } catch (e) {
    const msg = (e as Error).message;
    console.error("RapidAPI /verify failed:", msg);
    await failLookup(admin, lookupId, profile.id as string, "provider_error", msg);
    return json({ error: "source_unavailable", message_code: "license_source_unavailable" }, 200);
  }

  return await processVerifyResult(
    admin, profile, lookupId, providerRecord,
    licenseNumberNorm, licenseState, licenseType, licenseNumberRaw,
  );
}

// ── Search path ───────────────────────────────────────────────────────────────

async function runSearch(
  admin: ReturnType<typeof createClient>,
  apiKey: string,
  profile: Record<string, unknown>,
  lookupId: string,
  licenseState: string,
  licenseType: string,
): Promise<Response> {
  let results: Array<Record<string, unknown>>;

  try {
    results = await callRapidApiSearch(apiKey, profile.last_name as string, licenseState);
  } catch (e) {
    console.error("RapidAPI /search failed:", (e as Error).message);
    await failLookup(admin, lookupId, profile.id as string, "provider_error", (e as Error).message);
    return json({ error: "source_unavailable", message_code: "license_source_unavailable" }, 200);
  }

  if (!results.length) {
    await failLookup(admin, lookupId, profile.id as string, "not_found", "search_zero_results");
    await writeAudit(admin, profile.id as string, "license.not_found", { search_mode: "search", license_state: licenseState });
    return json({ success: false, error: "not_found", message_code: "license_not_found" }, 200);
  }

  if (results.length === 1) {
    // Single result — resolve via /verify before binding
    const candidate = results[0];
    const resolvedNumber = normalizeLicenseNumber(String(candidate.license_number ?? ""));
    if (!resolvedNumber) {
      await failLookup(admin, lookupId, profile.id as string, "failed", "search_missing_license_number");
      return json({ success: false, error: "missing_required_field", message_code: "license_lookup_incomplete" }, 200);
    }

    let providerRecord: Record<string, unknown> | null;
    try {
      const rapidApiKey = Deno.env.get("RAPIDAPI_KEY") ?? "";
      providerRecord = await callRapidApiVerify(rapidApiKey, resolvedNumber, licenseState);
    } catch (e) {
      await failLookup(admin, lookupId, profile.id as string, "provider_error", (e as Error).message);
      return json({ error: "source_unavailable", message_code: "license_source_unavailable" }, 200);
    }

    // Update lookup record with the resolved license number
    await admin.from("license_lookups").update({ submitted_license_number: resolvedNumber }).eq("id", lookupId);

    return await processVerifyResult(
      admin, profile, lookupId, providerRecord,
      resolvedNumber, licenseState, licenseType, resolvedNumber,
    );
  }

  // Multiple results — return candidates for nurse selection
  const candidates = results.slice(0, 10).map((r) => ({
    license_number: String(r.license_number ?? ""),
    license_type:   String(r.license_type   ?? ""),
    holder_name:    String(r.full_name       ?? ""),  // full name per David's decision
  })).filter(c => c.license_number);

  // Store allowlisted candidates and advance to license_checking
  await admin.from("license_lookups")
    .update({ result: "needs_selection", candidate_data: candidates, completed_at: new Date().toISOString() })
    .eq("id", lookupId);

  await admin.from("profiles")
    .update({ onboarding_step: "license_checking", updated_at: new Date().toISOString() })
    .eq("id", profile.id)
    .eq("onboarding_step", "license");

  await writeAudit(admin, profile.id as string, "license.search_needs_selection",
    { candidate_count: candidates.length, lookup_id: lookupId });

  return json({ result: "needs_selection", candidates, lookup_id: lookupId }, 200);
}

// ── Process /verify result ────────────────────────────────────────────────────

async function processVerifyResult(
  admin: ReturnType<typeof createClient>,
  profile: Record<string, unknown>,
  lookupId: string,
  providerRecord: Record<string, unknown> | null,
  licenseNumberNorm: string,
  licenseState: string,
  licenseType: string,
  licenseNumberRaw: string,
): Promise<Response> {
  const profileId = profile.id as string;
  const now = new Date().toISOString();

  if (!providerRecord) {
    await failLookup(admin, lookupId, profileId, "not_found", "verify_no_record");
    return json({ success: false, error: "not_found", message_code: "license_not_found" }, 200);
  }

  // License number match
  const returnedNumber = normalizeLicenseNumber(String(providerRecord.license_number ?? ""));
  if (returnedNumber !== licenseNumberNorm) {
    await failLookup(admin, lookupId, profileId, "license_number_mismatch", `expected ${licenseNumberNorm} got ${returnedNumber}`);
    return json({ success: false, error: "not_found", message_code: "license_not_found" }, 200);
  }

  // Holder name
  const fullName = String(providerRecord.full_name ?? "").trim();
  let holderFirstName: string | null = null;
  let holderLastName:  string | null = null;
  const commaIdx = fullName.indexOf(",");
  if (commaIdx >= 0) {
    holderLastName  = fullName.slice(0, commaIdx).trim() || null;
    const firstPart = fullName.slice(commaIdx + 1).trim().split(/\s+/);
    holderFirstName = firstPart[0] || null;
  } else if (fullName) {
    const parts = fullName.split(/\s+/);
    if (parts.length >= 2) { holderFirstName = parts[0]; holderLastName = parts[parts.length - 1]; }
  }

  if (!holderFirstName || !holderLastName) {
    await failLookup(admin, lookupId, profileId, "missing_required_field", "missing_holder_name");
    return json({ success: false, error: "missing_required_field", message_code: "license_lookup_incomplete" }, 200);
  }

  // License type binding (exact uppercase match)
  const providerLicenseType = providerRecord.license_type
    ? String(providerRecord.license_type).trim().toUpperCase()
    : null;

  if (!providerLicenseType) {
    await failLookup(admin, lookupId, profileId, "missing_required_field", "missing_license_type");
    return json({ success: false, error: "missing_required_field", message_code: "license_lookup_incomplete" }, 200);
  }
  if (providerLicenseType !== licenseType) {
    await failLookup(admin, lookupId, profileId, "license_type_mismatch",
      `submitted ${licenseType} provider ${providerLicenseType}`);
    return json({ success: false, error: "license_type_mismatch", message_code: "license_type_mismatch" }, 200);
  }

  // Status normalization
  const rawStatus = providerRecord.license_status ? String(providerRecord.license_status) : "Unknown";
  const statusResult = resolveStatus(rawStatus);

  const credentialEligible =
    statusResult.normalized === "Active" &&
    statusResult.intent === "credential_valid" &&
    (statusResult.treatment === "valid" || statusResult.treatment === "caution");

  // Persist license row
  const { data: existingLicense } = await admin
    .from("licenses")
    .select("id")
    .eq("profile_id", profileId)
    .eq("state", licenseState)
    .eq("license_type", licenseType)
    .eq("license_number", licenseNumberRaw)
    .maybeSingle();

  let licenseId: string;
  const allowlistedPayload = {
    provider: "rapidapi", endpoint: RAPIDAPI_VERIFY_URL, query_state: licenseState,
    matched: true, matched_license_type: providerLicenseType,
  };

  if (existingLicense) {
    await admin.from("licenses").update({
      first_name: holderFirstName, last_name: holderLastName,
      source_status_raw: rawStatus, source_status_display: statusResult.normalized,
      normalized_status: statusResult.normalized, status_intent: statusResult.intent,
      wallet_pass_treatment: statusResult.treatment,
      expiration_date: providerRecord.expiration_date ? String(providerRecord.expiration_date) : null,
      lookup_source: "rapidapi", lookup_response: allowlistedPayload,
      status_checked_at: now, data_match_passed: false, dob_match_mode: null, updated_at: now,
    }).eq("id", existingLicense.id);
    licenseId = existingLicense.id;
  } else {
    const { data: newLicense, error: insertErr } = await admin.from("licenses").insert({
      profile_id: profileId, state: licenseState,
      license_type: providerLicenseType, license_number: licenseNumberRaw,
      first_name: holderFirstName, last_name: holderLastName,
      source_status_raw: rawStatus, source_status_display: statusResult.normalized,
      normalized_status: statusResult.normalized, status_intent: statusResult.intent,
      wallet_pass_treatment: statusResult.treatment,
      expiration_date: providerRecord.expiration_date ? String(providerRecord.expiration_date) : null,
      is_primary: true, lookup_source: "rapidapi",
      lookup_response: allowlistedPayload, status_checked_at: now,
    }).select("id").single();
    if (insertErr || !newLicense) {
      console.error("License insert failed:", insertErr);
      return json({ error: "server_error" }, 500);
    }
    licenseId = newLicense.id;
  }

  // Update lookup record with license_id
  await admin.from("license_lookups").update({ license_id: licenseId }).eq("id", lookupId);

  if (!credentialEligible) {
    await failLookup(admin, lookupId, profileId, `status_ineligible:${statusResult.normalized}`, rawStatus, licenseId);
    return json({
      success: false, credential_eligible: false,
      normalized_status: statusResult.normalized,
      message_code: rawStatus === "Unknown" ? "license_status_unavailable" : "license_not_active",
    }, 200);
  }

  // Name match (dob_match_mode = name_only)
  const matchResult = matchNames(
    profile.first_name as string, profile.last_name as string,
    holderFirstName, holderLastName,
  );

  // Call complete_license_verification() RPC
  const { error: rpcErr } = await admin.rpc("complete_license_verification", {
    p_profile_id: profileId, p_license_id: licenseId,
    p_match_result: matchResult, p_dob_match_mode: "name_only",
  });

  if (rpcErr) {
    console.error("complete_license_verification RPC failed:", rpcErr);
    // Record the match failure in the lookup
    await admin.from("license_lookups")
      .update({ result: "failed", completed_at: now, error_message: `rpc_failed: ${rpcErr.message}` })
      .eq("id", lookupId);
    return json({ error: "server_error" }, 500);
  }

  // Mark lookup successful
  await admin.from("license_lookups")
    .update({ result: matchResult === "passed" ? "success" : "failed", completed_at: now })
    .eq("id", lookupId);

  if (matchResult !== "passed") {
    return json({
      success: false, credential_eligible: false,
      error: matchResult, message_code: "identity_license_mismatch",
    }, 200);
  }

  // RPC advanced step to 'confirm' via complete_license_verification
  // (RPC currently advances to 'phone' — we need to advance to 'confirm' instead.
  //  For TASK-0054, we override by updating the step to 'confirm' after the RPC.)
  await admin.from("profiles")
    .update({ onboarding_step: "confirm", updated_at: now })
    .eq("id", profileId)
    .in("onboarding_step", ["phone", "confirm"]); // RPC may have set 'phone'; correct to 'confirm'

  await writeAudit(admin, profileId, "license.lookup_success",
    { lookup_id: lookupId, license_id: licenseId, normalized_status: statusResult.normalized, match_result: matchResult });

  return json({ success: true, credential_eligible: true, next_step: "confirm" }, 200);
}

// ── RapidAPI calls ────────────────────────────────────────────────────────────

async function callRapidApiVerify(
  apiKey: string,
  licenseNumber: string,
  state: string,
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(RAPIDAPI_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": RAPIDAPI_HOST },
      body: JSON.stringify({ license_number: licenseNumber, state }),
      signal: controller.signal,
    });
  } finally { clearTimeout(timeout); }

  if (res.status === 404) return null;
  if (res.status === 429) throw new Error("provider_rate_limited");
  if (res.status === 401 || res.status === 403) throw new Error("provider_auth_error");
  if (!res.ok) throw new Error(`provider_http_${res.status}`);

  const data = await res.json() as Record<string, unknown>;
  if (!data || typeof data !== "object") return null;
  return data;
}

async function callRapidApiSearch(
  apiKey: string,
  nurseLastName: string,
  state: string,
): Promise<Array<Record<string, unknown>>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(RAPIDAPI_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": RAPIDAPI_HOST },
      body: JSON.stringify({ state, query: nurseLastName }),
      signal: controller.signal,
    });
  } finally { clearTimeout(timeout); }

  if (res.status === 404) return [];
  if (res.status === 429) throw new Error("provider_rate_limited");
  if (res.status === 401 || res.status === 403) throw new Error("provider_auth_error");
  if (!res.ok) throw new Error(`provider_http_${res.status}`);

  const data = await res.json() as Record<string, unknown>;
  return Array.isArray(data.results) ? data.results as Array<Record<string, unknown>> : [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveStatus(rawStatus: string): { normalized: string; intent: string; treatment: string } {
  const fb = STATUS_FALLBACK[rawStatus];
  if (fb) return { normalized: fb.normalized, intent: fb.intent, treatment: fb.treatment };
  return { normalized: "Unknown", intent: "verification_failure", treatment: "do_not_issue" };
}

function matchNames(idmeFirst: string, idmeLast: string, licFirst: string, licLast: string): string {
  const norm = (s: string) =>
    s.toUpperCase().replace(/[^A-Z\s\-]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const iF = norm(idmeFirst); const iL = norm(idmeLast);
  const lF = norm(licFirst);  const lL = norm(licLast);
  if (!iF.length || !iL.length) return "blocked_missing_idme";
  if (!lF.length || !lL.length) return "blocked_missing_license_holder";
  if (iF[0] !== lF[0]) return "blocked_name_mismatch";
  if (iL[iL.length - 1] !== lL[lL.length - 1]) return "blocked_name_mismatch";
  return "passed";
}

function normalizeLicenseNumber(n: string): string {
  return n.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

async function failLookup(
  admin: ReturnType<typeof createClient>,
  lookupId: string,
  profileId: string,
  result: string,
  errorMsg: string,
  licenseId?: string,
): Promise<void> {
  await admin.from("license_lookups").update({
    result, completed_at: new Date().toISOString(),
    error_message: errorMsg.slice(0, 200),
    ...(licenseId ? { license_id: licenseId } : {}),
  }).eq("id", lookupId);
  await writeAudit(admin, profileId, "license.lookup_failed", { result, error: errorMsg.slice(0, 200) });
}

async function writeAudit(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  action: string,
  details: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin.from("audit_events").insert({
    actor_id: actorId, action, resource_type: "license", resource_id: actorId, change_after: details,
  });
  if (error) console.error("audit write failed (non-fatal):", error.message);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
