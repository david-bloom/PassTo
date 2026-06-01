/**
 * license-lookup
 *
 * TASK-0046 — License Info Lookup and ID.me/License Binding Backend
 * Remediation: TASK-0046 Codex P1/P2 findings — 2026-06-02
 *
 * verify_jwt: true — requires an authenticated Supabase session.
 *
 * Flow:
 *   1. Authenticate caller and validate trust gates on profiles row
 *   2. Validate and normalize license inputs
 *   3. Call RapidAPI license verification (server-side only)
 *   4. Validate provider response (license number match, required fields)
 *   5. Normalize status — missing status from provider → Unknown → do_not_issue
 *   6. Persist license row (clears stale data_match_passed before new result)
 *   7. Run conservative name-only data matching (dob_match_mode = name_only)
 *   8. Call complete_license_verification() RPC (atomic match result + step advance)
 *   9. Return safe response to Lovable
 *
 * Required Supabase secrets:
 *   RAPIDAPI_KEY  — RapidAPI subscription key (only secret required)
 *
 * Provider configuration (hardcoded for MVP — P3 docs reconciliation):
 *   URL:  https://nurse-license-verification.p.rapidapi.com/verify
 *   Host: nurse-license-verification.p.rapidapi.com
 *   These are not read from secrets; update source and redeploy if the
 *   provider endpoint changes.
 *
 * Confirmed provider response contract (from live sandbox response):
 *   Request:  POST { state, query } where query = nurse's verified last name
 *   Response: { state, query, results: [{ license_number, full_name, license_type }], result_count }
 *   full_name format: "LAST, FIRST MIDDLE" (e.g. "SMITH, JANE A")
 *   Status field: not returned by this endpoint.
 *   Missing status → rawStatus = "Unknown" → normalized "Unknown" → do_not_issue → blocked.
 *
 * Deviations from FLOW-LICENSE-002:
 *   - Vercel route → Supabase Edge Function (consistent with TASK-0045 architecture).
 *   - state_license_routes table not consulted for MVP; all states call RapidAPI directly.
 *   - Provider does not return license status; missing status treated as Unknown/do_not_issue.
 *   - lookup_response stores an allowlisted payload only (not raw provider response).
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

const RAPIDAPI_URL  = "https://nurse-license-verification.p.rapidapi.com/verify";
const RAPIDAPI_HOST = "nurse-license-verification.p.rapidapi.com";

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

// Status normalization fallback.
// DB table license_status_mappings is checked first; this map is the MVP fallback.
// "Unknown" is used when the provider returns no status — it is explicitly do_not_issue.
// "Registered" has been removed: existence under a name search ≠ issuable license status.
const STATUS_FALLBACK: Record<string, {
  normalized: string;
  intent: string;
  treatment: string;
}> = {
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProviderResult {
  found:            boolean;
  notFoundReason:   "no_results" | "number_mismatch" | null;
  licenseNumber:    string | null;
  holderFirstName:  string | null;
  holderLastName:   string | null;
  // rawStatus = "Unknown" when provider returns no status field — do NOT treat as issuable
  rawStatus:        string;
  expirationDate:   string | null;
  allowlistedPayload: Record<string, unknown>;
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

  if (profile.account_status !== "active")           return json({ error: "account_not_active" }, 403);
  if (profile.id_verification_status !== "verified") return json({ error: "identity_not_verified" }, 403);
  if (profile.id_verification_level !== "IAL2")      return json({ error: "insufficient_assurance_level" }, 403);
  if (profile.onboarding_step !== "license")         return json({ error: "invalid_onboarding_step" }, 403);
  if (!profile.first_name || !profile.last_name)     return json({ error: "profile_missing_verified_name" }, 403);

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

  if (!license_number)                      return json({ error: "missing_license_number" }, 400);
  if (!VALID_STATES.has(license_state))     return json({ error: "invalid_state" }, 400);
  if (!VALID_LICENSE_TYPES.has(license_type)) return json({ error: "invalid_license_type" }, 400);

  const licenseNumberNorm = normalizeLicenseNumber(license_number);

  // ── 4. Call RapidAPI license verification ─────────────────────────────────
  const rapidApiKey = Deno.env.get("RAPIDAPI_KEY") ?? "";
  if (!rapidApiKey) {
    console.error("RAPIDAPI_KEY not configured");
    try {
      await writeTerminalOutcome(supabaseAdmin, profile.id, null,
        "api_error", "rapidapi_not_configured",
        "license.lookup_failed", { error: "rapidapi_not_configured", state: license_state });
    } catch (e) {
      console.error("Terminal write failed:", (e as Error).message);
      return json({ error: "server_error" }, 500);
    }
    return json({ error: "source_unavailable", message_code: "license_source_unavailable" }, 200);
  }

  let providerResult: ProviderResult;

  try {
    providerResult = await callRapidApi(rapidApiKey,
      { state: license_state, licenseNumber: licenseNumberNorm, nurseLastName: profile.last_name },
    );
  } catch (e) {
    console.error("RapidAPI call failed:", (e as Error).message);
    try {
      await writeTerminalOutcome(supabaseAdmin, profile.id, null,
        "api_error", `provider_error:${(e as Error).message.slice(0, 80)}`,
        "license.lookup_failed", { error: "provider_error", state: license_state });
    } catch (we) {
      console.error("Terminal write failed:", (we as Error).message);
      return json({ error: "server_error" }, 500);
    }
    return json({ error: "source_unavailable", message_code: "license_source_unavailable" }, 200);
  }

  // ── 5. Handle not-found and required-field failures ───────────────────────

  if (!providerResult.found) {
    const auditDetails =
      providerResult.notFoundReason === "number_mismatch"
        ? { error: "license_number_mismatch", state: license_state, license_type }
        : { error: "not_found", state: license_state, license_type };
    const lookupMsg =
      providerResult.notFoundReason === "number_mismatch"
        ? "license_number_mismatch"
        : "license_not_found";

    try {
      await writeTerminalOutcome(supabaseAdmin, profile.id, null,
        "failed", lookupMsg,
        "license.lookup_failed", auditDetails);
    } catch (e) {
      console.error("Terminal write failed:", (e as Error).message);
      return json({ error: "server_error" }, 500);
    }
    return json({ success: false, error: "not_found", message_code: "license_not_found" }, 200);
  }

  if (!providerResult.holderFirstName || !providerResult.holderLastName) {
    try {
      await writeTerminalOutcome(supabaseAdmin, profile.id, null,
        "failed", "missing_required_field:holder_name",
        "license.lookup_failed", { error: "missing_holder_name", state: license_state });
    } catch (e) {
      console.error("Terminal write failed:", (e as Error).message);
      return json({ error: "server_error" }, 500);
    }
    return json({ success: false, error: "missing_required_field", message_code: "license_lookup_incomplete" }, 200);
  }

  // ── 6. Normalize status ────────────────────────────────────────────────────
  // rawStatus = "Unknown" when provider returned no status — always do_not_issue.
  // STATUS_FALLBACK["Unknown"] maps to verification_failure / do_not_issue.
  const statusResult = await resolveStatus(supabaseAdmin, providerResult.rawStatus);

  // resolveStatus returns null only for truly unrecognized raw strings (not "Unknown")
  if (!statusResult) {
    try {
      await writeTerminalOutcome(supabaseAdmin, profile.id, null,
        "failed", `unrecognized_status:${providerResult.rawStatus.slice(0, 40)}`,
        "license.lookup_failed", { error: "unrecognized_status", raw_status: providerResult.rawStatus });
    } catch (e) {
      console.error("Terminal write failed:", (e as Error).message);
      return json({ error: "server_error" }, 500);
    }
    return json({ success: false, error: "license_status_unrecognized", message_code: "license_status_unrecognized" }, 200);
  }

  const credentialEligible =
    statusResult.normalized === "Active" &&
    statusResult.intent === "credential_valid" &&
    (statusResult.treatment === "valid" || statusResult.treatment === "caution");

  // ── 7. Persist license row ─────────────────────────────────────────────────
  // Always clears data_match_passed and dob_match_mode on UPDATE so stale
  // passed state from a previous lookup cannot survive a refresh that returns
  // an ineligible or unknown status.
  const now = new Date().toISOString();

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
        first_name:            providerResult.holderFirstName,
        last_name:             providerResult.holderLastName,
        source_status_raw:     providerResult.rawStatus,
        source_status_display: statusResult.normalized,
        normalized_status:     statusResult.normalized,
        status_intent:         statusResult.intent,
        wallet_pass_treatment: statusResult.treatment,
        expiration_date:       providerResult.expirationDate,
        lookup_source:         "rapidapi",
        lookup_response:       providerResult.allowlistedPayload,
        status_checked_at:     now,
        // Clear stale match state — RPC will set these only if current lookup passes
        data_match_passed:     false,
        dob_match_mode:        null,
        updated_at:            now,
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
        profile_id:            profile.id,
        state:                 license_state,
        license_type:          license_type,
        license_number:        license_number,
        first_name:            providerResult.holderFirstName,
        last_name:             providerResult.holderLastName,
        source_status_raw:     providerResult.rawStatus,
        source_status_display: statusResult.normalized,
        normalized_status:     statusResult.normalized,
        status_intent:         statusResult.intent,
        wallet_pass_treatment: statusResult.treatment,
        expiration_date:       providerResult.expirationDate,
        is_primary:            true,
        lookup_source:         "rapidapi",
        lookup_response:       providerResult.allowlistedPayload,
        status_checked_at:     now,
        // data_match_passed and dob_match_mode start null; RPC sets them on pass
      })
      .select("id")
      .single();

    if (insertErr || !newLicense) {
      console.error("Failed to insert license row:", insertErr);
      return json({ error: "server_error" }, 500);
    }
    licenseId = newLicense.id;
  }

  // ── 8. Write lookup record and handle ineligible status ───────────────────
  if (!credentialEligible) {
    try {
      await writeTerminalOutcome(supabaseAdmin, profile.id, licenseId,
        "failed", `status_ineligible:${statusResult.normalized}`,
        "license.lookup_succeeded_ineligible",
        { normalized_status: statusResult.normalized, license_id: licenseId,
          raw_status: providerResult.rawStatus });
    } catch (e) {
      console.error("Terminal write failed:", (e as Error).message);
      return json({ error: "server_error" }, 500);
    }
    return json({
      success:             true,
      credential_eligible: false,
      normalized_status:   statusResult.normalized,
      message_code:        providerResult.rawStatus === "Unknown"
        ? "license_status_unavailable"
        : "license_not_active",
    }, 200);
  }

  // ── 9. Write successful lookup record ──────────────────────────────────────
  const { error: lookupErr } = await supabaseAdmin.from("license_lookups").insert({
    profile_id:    profile.id,
    license_id:    licenseId,
    triggered_by:  "onboarding",
    result:        "success",
    lookup_source: "rapidapi",
  });
  if (lookupErr) {
    console.error("Failed to write lookup success record:", lookupErr);
    return json({ error: "server_error" }, 500);
  }

  // ── 10. Name-only data matching (dob_match_mode = name_only) ──────────────
  const matchResult = matchNames(
    profile.first_name,
    profile.last_name,
    providerResult.holderFirstName,
    providerResult.holderLastName,
  );

  // ── 11. Atomic: write match result + advance onboarding step ──────────────
  // complete_license_verification() re-validates all invariants server-side.
  // It will raise if any condition fails (e.g., direct bypass attempt via PostgREST).
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

  // ── 12. Await success audit ────────────────────────────────────────────────
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id:      profile.id,
    action:        "license.lookup_succeeded",
    resource_type: "license",
    resource_id:   licenseId,
    change_after: {
      license_id:        licenseId,
      normalized_status: statusResult.normalized,
      match_result:      matchResult.result,
      dob_match_mode:    "name_only",
    },
  });
  if (auditErr) console.error("Success audit write failed (non-fatal):", auditErr);

  // ── 13. Return response ────────────────────────────────────────────────────
  if (matchResult.result !== "passed") {
    return json({
      success:             false,
      credential_eligible: false,
      error:               matchResult.result,
      message_code:        "identity_license_mismatch",
    }, 200);
  }

  return json({
    success:             true,
    credential_eligible: true,
    normalized_status:   statusResult.normalized,
    next_step:           "phone",
  }, 200);
});

// ── RapidAPI adapter ──────────────────────────────────────────────────────────

async function callRapidApi(
  apiKey: string,
  input: { state: string; licenseNumber: string; nurseLastName: string },
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
      body: JSON.stringify({ state: input.state, query: input.nurseLastName }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 429) throw new Error("provider_rate_limited");
  if (res.status === 401 || res.status === 403) throw new Error("provider_auth_error");
  if (!res.ok) throw new Error(`provider_http_${res.status}`);

  const data = await res.json() as Record<string, unknown>;
  const results = Array.isArray(data.results)
    ? data.results as Array<Record<string, unknown>>
    : [];

  if (!results.length) {
    return {
      found: false, notFoundReason: "no_results",
      licenseNumber: null, holderFirstName: null, holderLastName: null,
      rawStatus: "Unknown", expirationDate: null,
      allowlistedPayload: buildAllowlistedPayload(data, null, input.state),
    };
  }

  // Filter to the result whose license_number matches the submitted number
  const match = results.find((r) =>
    normalizeLicenseNumber(String(r.license_number ?? "")) === input.licenseNumber
  );

  if (!match) {
    return {
      found: false, notFoundReason: "number_mismatch",
      licenseNumber: null, holderFirstName: null, holderLastName: null,
      rawStatus: "Unknown", expirationDate: null,
      allowlistedPayload: buildAllowlistedPayload(data, null, input.state),
    };
  }

  // Parse "LAST, FIRST MIDDLE" full_name format confirmed from live response
  const fullName = String(match.full_name ?? "").trim();
  let holderFirstName: string | null = null;
  let holderLastName:  string | null = null;

  const commaIdx = fullName.indexOf(",");
  if (commaIdx >= 0) {
    holderLastName  = fullName.slice(0, commaIdx).trim() || null;
    const firstPart = fullName.slice(commaIdx + 1).trim().split(/\s+/);
    holderFirstName = firstPart[0] || null;
  } else if (fullName) {
    const parts = fullName.split(/\s+/);
    if (parts.length >= 2) {
      holderFirstName = parts[0];
      holderLastName  = parts[parts.length - 1];
    }
  }

  // Provider does not return a status field.
  // rawStatus = "Unknown" triggers do_not_issue path.
  // If a future provider version adds a status field, it will be used here.
  const rawStatus = match.status ? String(match.status) : "Unknown";

  return {
    found:           true,
    notFoundReason:  null,
    licenseNumber:   String(match.license_number ?? ""),
    holderFirstName,
    holderLastName,
    rawStatus,
    expirationDate:  match.expiration_date ? String(match.expiration_date) : null,
    allowlistedPayload: buildAllowlistedPayload(data, match, input.state),
  };
}

// ── Allowlisted payload builder ───────────────────────────────────────────────
// Only audit-necessary fields are stored. Raw PII (full_name), the results
// array, DOB, address, and disciplinary fields are explicitly excluded.
// Retained fields are documented here per TASK-0046 / FLOW-LICENSE-002.

function buildAllowlistedPayload(
  data: Record<string, unknown>,
  match: Record<string, unknown> | null,
  queryState: string,
): Record<string, unknown> {
  return {
    provider:             "rapidapi",
    endpoint:             "nurse-license-verification.p.rapidapi.com/verify",
    query_state:          queryState,
    result_count:         typeof data.result_count === "number" ? data.result_count : null,
    matched:              match !== null,
    matched_license_type: match ? String(match.license_type ?? "") : null,
    // Excluded: full_name (PII stored in licenses.first_name/last_name),
    //           results array, any DOB/address/disciplinary data.
  };
}

// ── Status normalization ──────────────────────────────────────────────────────

async function resolveStatus(
  supabase: ReturnType<typeof createClient>,
  rawStatus: string,
): Promise<{ normalized: string; intent: string; treatment: string } | null> {
  const { data: mapped } = await supabase
    .from("license_status_mappings")
    .select("normalized_status")
    .eq("raw_status", rawStatus)
    .maybeSingle();

  if (mapped?.normalized_status) {
    return deriveFromNormalized(mapped.normalized_status as string);
  }

  const fallback = STATUS_FALLBACK[rawStatus];
  if (fallback) return { normalized: fallback.normalized, intent: fallback.intent, treatment: fallback.treatment };

  return null; // Truly unrecognized raw status string
}

function deriveFromNormalized(
  normalized: string,
): { normalized: string; intent: string; treatment: string } {
  const map: Record<string, { intent: string; treatment: string }> = {
    Active:      { intent: "credential_valid",     treatment: "valid" },
    Inactive:    { intent: "credential_invalid",   treatment: "invalid" },
    Expired:     { intent: "credential_invalid",   treatment: "invalid" },
    Surrendered: { intent: "credential_invalid",   treatment: "invalid" },
    Revoked:     { intent: "credential_invalid",   treatment: "invalid" },
    Suspended:   { intent: "credential_invalid",   treatment: "invalid" },
    Pending:     { intent: "credential_invalid",   treatment: "invalid" },
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
      .replace(/[^A-Z\s\-]/g, "")
      .replace(/-/g, " ")
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

  if (idmeFirstTokens[0] !== licFirstTokens[0]) return { result: "blocked_name_mismatch" };

  const idmeLastToken = idmeLastTokens[idmeLastTokens.length - 1];
  const licLastToken  = licLastTokens[licLastTokens.length - 1];
  if (idmeLastToken !== licLastToken) return { result: "blocked_name_mismatch" };

  return { result: "passed" };
}

// ── Persistence helpers ───────────────────────────────────────────────────────

// writeTerminalOutcome writes lookup + audit atomically for terminal failure paths.
// Throws if either write fails — callers catch and return 500 (fail closed).
async function writeTerminalOutcome(
  supabase:    ReturnType<typeof createClient>,
  profileId:   string,
  licenseId:   string | null,
  lookupResult: "failed" | "api_error",
  lookupMsg:   string,
  auditAction: string,
  auditDetails: Record<string, unknown>,
): Promise<void> {
  const { error: lookupErr } = await supabase.from("license_lookups").insert({
    profile_id:    profileId,
    license_id:    licenseId,
    triggered_by:  "onboarding",
    result:        lookupResult,
    lookup_source: "rapidapi",
    error_message: lookupMsg,
  });
  if (lookupErr) {
    throw new Error(`terminal lookup record write failed: ${lookupErr.message}`);
  }

  const { error: auditErr } = await supabase.from("audit_events").insert({
    actor_id:      profileId,
    action:        auditAction,
    resource_type: "license",
    resource_id:   licenseId ?? profileId,
    change_after:  auditDetails,
  });
  if (auditErr) {
    throw new Error(`terminal audit event write failed: ${auditErr.message}`);
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

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
