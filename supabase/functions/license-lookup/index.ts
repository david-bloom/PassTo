/**
 * license-lookup
 *
 * TASK-0046 — License Info Lookup and ID.me/License Binding Backend
 *
 * verify_jwt: true — requires an authenticated Supabase session.
 * The nurse must have completed ID.me verification before reaching this point.
 *
 * Flow:
 *   1. Authenticate caller and validate trust gates on profiles row
 *   2. Validate and normalize license inputs
 *   3. Call RapidAPI license verification (server-side only)
 *   4. Validate provider response (license number match, required fields)
 *   5. Normalize raw status via license_status_mappings (hardcoded MVP fallback)
 *   6. Persist license row and lookup record
 *   7. Run conservative name-only data matching (dob_match_mode = name_only)
 *   8. Call complete_license_verification() RPC (atomic match result + step advance)
 *   9. Return safe response to Lovable
 *
 * Required Supabase secrets:
 *   RAPIDAPI_KEY             — RapidAPI subscription key
 *   RAPIDAPI_HOST            — RapidAPI host header (e.g. us-license-verify.p.rapidapi.com)
 *   RAPIDAPI_LICENSE_URL     — Full endpoint URL for license verification POST
 *
 * Deviations from FLOW-LICENSE-002:
 *   - Routing is not read from state_license_routes for MVP; all states call RapidAPI directly.
 *   - Vercel route replaced by Supabase Edge Function (consistent with TASK-0045 architecture).
 *   - license_status_mappings fallback: if table lookup fails/misses, a hardcoded canonical
 *     map is used. Populate license_status_mappings for production.
 *
 * TASK: TASK-0046
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

// US state codes (uppercase two-character)
const VALID_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC","PR","VI","GU","MP","AS",
]);

const VALID_LICENSE_TYPES = new Set([
  "RN","LPN","APRN","NP","CRNA","CNM","CNS","CNA","MA","EMT","PARAMEDIC",
  "DENTAL","OTHER",
]);

// Hardcoded MVP status normalization fallback.
// Matches common RapidAPI/Propelus raw status strings to PassTo canonical values.
// Populate license_status_mappings table for production to override these.
const STATUS_FALLBACK: Record<string, {
  normalized: string;
  intent: string;
  treatment: string;
}> = {
  "Active":              { normalized: "Active",    intent: "credential_valid",    treatment: "valid" },
  "ACTIVE":              { normalized: "Active",    intent: "credential_valid",    treatment: "valid" },
  "Current":             { normalized: "Active",    intent: "credential_valid",    treatment: "valid" },
  "Clear":               { normalized: "Active",    intent: "credential_valid",    treatment: "valid" },
  "Inactive":            { normalized: "Inactive",  intent: "credential_invalid",  treatment: "invalid" },
  "INACTIVE":            { normalized: "Inactive",  intent: "credential_invalid",  treatment: "invalid" },
  "Expired":             { normalized: "Expired",   intent: "credential_invalid",  treatment: "invalid" },
  "EXPIRED":             { normalized: "Expired",   intent: "credential_invalid",  treatment: "invalid" },
  "Lapsed":              { normalized: "Expired",   intent: "credential_invalid",  treatment: "invalid" },
  "Suspended":           { normalized: "Suspended", intent: "credential_invalid",  treatment: "invalid" },
  "SUSPENDED":           { normalized: "Suspended", intent: "credential_invalid",  treatment: "invalid" },
  "Revoked":             { normalized: "Revoked",   intent: "credential_invalid",  treatment: "invalid" },
  "REVOKED":             { normalized: "Revoked",   intent: "credential_invalid",  treatment: "invalid" },
  "Surrendered":         { normalized: "Surrendered", intent: "credential_invalid", treatment: "invalid" },
  "Pending":             { normalized: "Pending",   intent: "credential_invalid",  treatment: "invalid" },
  "Pending Renewal":     { normalized: "Pending",   intent: "credential_invalid",  treatment: "invalid" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Authenticated client — used to verify the caller's JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "unauthorized" }, 401);
  }
  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  // ── 1. Authenticate caller ─────────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) {
    return json({ error: "unauthorized" }, 401);
  }

  // ── 2. Validate trust gates on profiles row ────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, id_verification_status, id_verification_level, onboarding_step, account_status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return json({ error: "profile_not_found" }, 404);
  }

  if (profile.account_status !== "active") {
    return json({ error: "account_not_active" }, 403);
  }
  if (profile.id_verification_status !== "verified") {
    return json({ error: "identity_not_verified" }, 403);
  }
  if (profile.id_verification_level !== "IAL2") {
    return json({ error: "insufficient_assurance_level" }, 403);
  }
  if (profile.onboarding_step !== "license") {
    return json({ error: "invalid_onboarding_step" }, 403);
  }
  if (!profile.first_name || !profile.last_name) {
    return json({ error: "profile_missing_verified_name" }, 403);
  }

  // ── 3. Parse and validate request body ────────────────────────────────────
  let license_number: string;
  let license_state: string;
  let license_type: string;

  try {
    const body = await req.json();
    license_number = (body?.license_number ?? "").toString().trim();
    license_state  = (body?.license_state  ?? "").toString().trim().toUpperCase();
    license_type   = (body?.license_type   ?? "").toString().trim().toUpperCase();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }

  if (!license_number) {
    return json({ error: "missing_license_number" }, 400);
  }
  if (!VALID_STATES.has(license_state)) {
    return json({ error: "invalid_state" }, 400);
  }
  if (!VALID_LICENSE_TYPES.has(license_type)) {
    return json({ error: "invalid_license_type" }, 400);
  }

  const licenseNumberNorm = normalizeLicenseNumber(license_number);

  // ── 4. Call RapidAPI license verification ─────────────────────────────────
  // Endpoint confirmed: POST https://nurse-license-verification.p.rapidapi.com/verify
  // Body: { state, license_number } — no license_type in this API's contract
  const rapidApiKey = Deno.env.get("RAPIDAPI_KEY") ?? "";

  if (!rapidApiKey) {
    console.error("RAPIDAPI_KEY not configured");
    await writeLookupRecord(supabaseAdmin, profile.id, null, "api_error",
      "rapidapi_not_configured");
    return json({ error: "source_unavailable", message_code: "license_source_unavailable" }, 200);
  }

  let providerResult: ProviderResult;

  try {
    const providerResponse = await callRapidApi(rapidApiKey,
      { state: license_state, licenseNumber: license_number },
    );
    providerResult = providerResponse;
  } catch (e) {
    console.error("RapidAPI call failed:", (e as Error).message);
    await writeLookupRecord(supabaseAdmin, profile.id, null, "api_error",
      "provider_error");
    await writeAudit(supabaseAdmin, profile.id, "license.lookup_failed",
      { error: "provider_error", state: license_state });
    return json({ error: "source_unavailable", message_code: "license_source_unavailable" }, 200);
  }

  if (!providerResult.found) {
    await writeLookupRecord(supabaseAdmin, profile.id, null, "failed",
      "license_not_found");
    await writeAudit(supabaseAdmin, profile.id, "license.lookup_failed",
      { error: "not_found", state: license_state, license_type: license_type });
    return json({ success: false, error: "not_found", message_code: "license_not_found" }, 200);
  }

  // ── 5. Validate required provider fields ──────────────────────────────────
  if (!providerResult.holderFirstName || !providerResult.holderLastName) {
    await writeLookupRecord(supabaseAdmin, profile.id, null, "failed",
      "missing_required_field");
    return json({
      success: false,
      error: "missing_required_field",
      message_code: "license_lookup_incomplete",
    }, 200);
  }

  if (!providerResult.rawStatus) {
    await writeLookupRecord(supabaseAdmin, profile.id, null, "failed",
      "missing_required_field");
    return json({
      success: false,
      error: "missing_required_field",
      message_code: "license_lookup_incomplete",
    }, 200);
  }

  // Validate returned license number matches submitted number
  const returnedNorm = normalizeLicenseNumber(providerResult.licenseNumber ?? "");
  if (!returnedNorm || returnedNorm !== licenseNumberNorm) {
    await writeLookupRecord(supabaseAdmin, profile.id, null, "failed",
      "license_number_mismatch");
    return json({ success: false, error: "not_found", message_code: "license_not_found" }, 200);
  }

  // ── 6. Normalize status ────────────────────────────────────────────────────
  const statusResult = await resolveStatus(supabaseAdmin, providerResult.rawStatus);

  // Unknown raw status → verification failure, do not issue
  if (!statusResult) {
    await writeLookupRecord(supabaseAdmin, profile.id, null, "failed",
      `unknown_status:${providerResult.rawStatus.slice(0, 40)}`);
    await writeAudit(supabaseAdmin, profile.id, "license.lookup_failed",
      { error: "unknown_status", raw_status: providerResult.rawStatus });
    return json({
      success: false,
      error: "license_status_unrecognized",
      message_code: "license_status_unrecognized",
    }, 200);
  }

  // Non-issuable normalized status → lookup succeeded but blocked
  const credentialEligible =
    statusResult.normalized === "Active" &&
    statusResult.treatment !== "do_not_issue";

  // ── 7. Persist license row ─────────────────────────────────────────────────
  const now = new Date().toISOString();
  const expirationDate = providerResult.expirationDate ?? null;

  // Check if a license row already exists for this profile/state/type/number
  const { data: existingLicense } = await supabaseAdmin
    .from("licenses")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("state", license_state)
    .eq("license_type", license_type)
    .eq("license_number", license_number)
    .maybeSingle();

  let licenseId: string;

  if (existingLicense) {
    const { error: updateErr } = await supabaseAdmin
      .from("licenses")
      .update({
        first_name:           providerResult.holderFirstName,
        last_name:            providerResult.holderLastName,
        source_status_raw:    providerResult.rawStatus,
        source_status_display: statusResult.normalized,
        normalized_status:    statusResult.normalized,
        status_intent:        statusResult.intent,
        wallet_pass_treatment: statusResult.treatment,
        expiration_date:      expirationDate,
        lookup_source:        "rapidapi",
        lookup_response:      providerResult.rawPayload ?? null,
        status_checked_at:    now,
        updated_at:           now,
      })
      .eq("id", existingLicense.id);

    if (updateErr) {
      console.error("Failed to update license row:", updateErr);
      return json({ error: "server_error" }, 500);
    }
    licenseId = existingLicense.id;
  } else {
    const { data: newLicense, error: insertErr } = await supabaseAdmin
      .from("licenses")
      .insert({
        profile_id:           profile.id,
        state:                license_state,
        license_type:         license_type,
        license_number:       license_number,
        first_name:           providerResult.holderFirstName,
        last_name:            providerResult.holderLastName,
        source_status_raw:    providerResult.rawStatus,
        source_status_display: statusResult.normalized,
        normalized_status:    statusResult.normalized,
        status_intent:        statusResult.intent,
        wallet_pass_treatment: statusResult.treatment,
        expiration_date:      expirationDate,
        is_primary:           true,
        lookup_source:        "rapidapi",
        lookup_response:      providerResult.rawPayload ?? null,
        status_checked_at:    now,
      })
      .select("id")
      .single();

    if (insertErr || !newLicense) {
      console.error("Failed to insert license row:", insertErr);
      return json({ error: "server_error" }, 500);
    }
    licenseId = newLicense.id;
  }

  // ── 8. Write lookup record ─────────────────────────────────────────────────
  await writeLookupRecord(supabaseAdmin, profile.id, licenseId,
    credentialEligible ? "success" : "failed",
    credentialEligible ? undefined : `status_ineligible:${statusResult.normalized}`);

  // If license status is not credential-eligible, stop here
  if (!credentialEligible) {
    await writeAudit(supabaseAdmin, profile.id, "license.lookup_succeeded_ineligible", {
      normalized_status: statusResult.normalized,
      license_id: licenseId,
    });
    return json({
      success: true,
      credential_eligible: false,
      normalized_status: statusResult.normalized,
      message_code: "license_not_active",
    }, 200);
  }

  // ── 9. Name-only data matching (dob_match_mode = name_only) ───────────────
  const matchResult = matchNames(
    profile.first_name,
    profile.last_name,
    providerResult.holderFirstName,
    providerResult.holderLastName,
  );

  // ── 10. Atomic: write match result + advance onboarding step ──────────────
  const { error: rpcErr } = await supabaseAdmin.rpc("complete_license_verification", {
    p_profile_id:     profile.id,
    p_license_id:     licenseId,
    p_match_result:   matchResult.result,
    p_dob_match_mode: "name_only",
  });

  if (rpcErr) {
    console.error("complete_license_verification RPC failed:", rpcErr);
    return json({ error: "server_error" }, 500);
  }

  // ── 11. Audit ──────────────────────────────────────────────────────────────
  await writeAudit(supabaseAdmin, profile.id, "license.lookup_succeeded", {
    license_id:      licenseId,
    normalized_status: statusResult.normalized,
    match_result:    matchResult.result,
    dob_match_mode:  "name_only",
  });

  // ── 12. Return response ────────────────────────────────────────────────────
  if (matchResult.result !== "passed") {
    return json({
      success: false,
      credential_eligible: false,
      error: matchResult.result,
      message_code: "identity_license_mismatch",
    }, 200);
  }

  return json({
    success:             true,
    credential_eligible: true,
    normalized_status:   statusResult.normalized,
    next_step:           "phone",
  }, 200);
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProviderResult {
  found:            boolean;
  licenseNumber:    string | null;
  holderFirstName:  string | null;
  holderLastName:   string | null;
  rawStatus:        string | null;
  expirationDate:   string | null;
  rawPayload:       Record<string, unknown> | null;
}

// ── RapidAPI adapter ──────────────────────────────────────────────────────────

const RAPIDAPI_URL  = "https://nurse-license-verification.p.rapidapi.com/verify";
const RAPIDAPI_HOST = "nurse-license-verification.p.rapidapi.com";

async function callRapidApi(
  apiKey: string,
  input: { state: string; licenseNumber: string },
): Promise<ProviderResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(RAPIDAPI_URL, {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "X-RapidAPI-Key":  apiKey,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
      body: JSON.stringify({
        state:          input.state,
        license_number: input.licenseNumber,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 429) {
    throw new Error("provider_rate_limited");
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("provider_auth_error");
  }
  if (!res.ok) {
    throw new Error(`provider_http_${res.status}`);
  }

  const data = await res.json() as Record<string, unknown>;

  // Flexible field extraction — handles multiple RapidAPI response shapes.
  // After first sandbox run, pin the exact field names and remove alternatives.
  const found = extractBool(data, ["found", "success", "verified", "exists"]) ?? false;

  if (!found) {
    return { found: false, licenseNumber: null, holderFirstName: null,
             holderLastName: null, rawStatus: null, expirationDate: null, rawPayload: data };
  }

  const licenseNumber   = extractStr(data, ["licenseNumber","license_number","number","licNumber"]);
  const rawStatus       = extractStr(data, ["status","rawStatus","raw_status","licenseStatus","license_status"]);
  const expirationDate  = extractStr(data, ["expirationDate","expiration_date","expDate","exp_date","expiryDate"]);

  // Name: try flat fields first, then compound full_name split
  let holderFirstName = extractStr(data, ["firstName","first_name","holderFirstName","holder_first_name","givenName"]);
  let holderLastName  = extractStr(data, ["lastName","last_name","holderLastName","holder_last_name","familyName","surname"]);

  if (!holderFirstName || !holderLastName) {
    const fullName = extractStr(data, ["fullName","full_name","holderName","holder_name","name"]);
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        holderFirstName = holderFirstName ?? parts[0];
        holderLastName  = holderLastName  ?? parts[parts.length - 1];
      }
    }
  }

  return {
    found:           true,
    licenseNumber:   licenseNumber   ?? null,
    holderFirstName: holderFirstName ?? null,
    holderLastName:  holderLastName  ?? null,
    rawStatus:       rawStatus       ?? null,
    expirationDate:  expirationDate  ?? null,
    rawPayload:      data,
  };
}

// ── Status normalization ──────────────────────────────────────────────────────

async function resolveStatus(
  supabase: ReturnType<typeof createClient>,
  rawStatus: string,
): Promise<{ normalized: string; intent: string; treatment: string } | null> {
  // Try DB mapping first
  const { data: mapped } = await supabase
    .from("license_status_mappings")
    .select("normalized_status")
    .eq("raw_status", rawStatus)
    .maybeSingle();

  if (mapped?.normalized_status) {
    return deriveFromNormalized(mapped.normalized_status as string);
  }

  // Hardcoded MVP fallback
  const fallback = STATUS_FALLBACK[rawStatus];
  if (fallback) return { normalized: fallback.normalized, intent: fallback.intent, treatment: fallback.treatment };

  // Unknown status — treated as verification failure
  return null;
}

function deriveFromNormalized(
  normalized: string,
): { normalized: string; intent: string; treatment: string } {
  const map: Record<string, { intent: string; treatment: string }> = {
    Active:      { intent: "credential_valid",   treatment: "valid" },
    Inactive:    { intent: "credential_invalid", treatment: "invalid" },
    Expired:     { intent: "credential_invalid", treatment: "invalid" },
    Surrendered: { intent: "credential_invalid", treatment: "invalid" },
    Revoked:     { intent: "credential_invalid", treatment: "invalid" },
    Suspended:   { intent: "credential_invalid", treatment: "invalid" },
    Pending:     { intent: "credential_invalid", treatment: "invalid" },
    Unknown:     { intent: "verification_failure", treatment: "do_not_issue" },
  };
  const entry = map[normalized];
  if (!entry) return { normalized: "Unknown", intent: "verification_failure", treatment: "do_not_issue" };
  return { normalized, ...entry };
}

// ── Name matching (dob_match_mode = name_only) ────────────────────────────────

interface MatchResult {
  result: "passed" | "blocked_name_mismatch" | "blocked_missing_idme" | "blocked_missing_license_holder";
}

function matchNames(
  idmeFirst: string | null,
  idmeLast:  string | null,
  licFirst:  string | null,
  licLast:   string | null,
): MatchResult {
  if (!idmeFirst || !idmeLast) return { result: "blocked_missing_idme" };
  if (!licFirst  || !licLast)  return { result: "blocked_missing_license_holder" };

  const norm = (s: string) =>
    s.toUpperCase()
      .replace(/[^A-Z\s\-]/g, "")  // keep letters, spaces, hyphens
      .replace(/-/g, " ")            // normalize hyphens to spaces
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);

  const idmeFirstTokens = norm(idmeFirst);
  const idmeLastTokens  = norm(idmeLast);
  const licFirstTokens  = norm(licFirst);
  const licLastTokens   = norm(licLast);

  if (!idmeFirstTokens.length || !idmeLastTokens.length) return { result: "blocked_missing_idme" };
  if (!licFirstTokens.length  || !licLastTokens.length)  return { result: "blocked_missing_license_holder" };

  // First name: the first token of the first-name field must match
  if (idmeFirstTokens[0] !== licFirstTokens[0]) return { result: "blocked_name_mismatch" };

  // Last name: the last token of the last-name field must match
  // (handles compound last names where token count may differ)
  const idmeLastToken = idmeLastTokens[idmeLastTokens.length - 1];
  const licLastToken  = licLastTokens[licLastTokens.length - 1];
  if (idmeLastToken !== licLastToken) return { result: "blocked_name_mismatch" };

  return { result: "passed" };
}

// ── Persistence helpers ───────────────────────────────────────────────────────

async function writeLookupRecord(
  supabase:   ReturnType<typeof createClient>,
  profileId:  string,
  licenseId:  string | null,
  result:     "success" | "failed" | "api_error" | "no_change" | "pending",
  errorMsg?:  string,
): Promise<void> {
  const { error } = await supabase.from("license_lookups").insert({
    profile_id:    profileId,
    license_id:    licenseId,
    triggered_by:  "onboarding",
    result,
    lookup_source: "rapidapi",
    error_message: errorMsg ?? null,
  });
  if (error) console.error("Failed to write license_lookups row:", error);
}

async function writeAudit(
  supabase:   ReturnType<typeof createClient>,
  profileId:  string,
  action:     string,
  details:    Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("audit_events").insert({
    actor_id:      profileId,
    action,
    resource_type: "license",
    resource_id:   (details.license_id as string) ?? profileId,
    change_after:  details,
  });
  if (error) console.error("audit_events write failed:", error);
}

// ── Field extraction helpers ──────────────────────────────────────────────────

function extractStr(data: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function extractBool(data: Record<string, unknown>, keys: string[]): boolean | null {
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "boolean") return v;
    if (v === "true" || v === 1) return true;
    if (v === "false" || v === 0) return false;
  }
  return null;
}

function normalizeLicenseNumber(n: string): string {
  return n.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

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
