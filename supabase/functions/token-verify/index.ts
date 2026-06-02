/**
 * token-verify
 *
 * TASK-0057 — Implement Verifier Token Validation Function
 *
 * verify_jwt: false — anonymous, token-gated endpoint
 *
 * Called by Lovable from /v/{token} when a verifier submits their form.
 *
 * Flow:
 *   1. Validate request body (token, verifier_name, verifier_email, terms_accepted)
 *   2. Hash raw token server-side (SHA-256); look up verification_tokens by hash
 *   3. Reject expired, used, revoked, wrong-type, or unknown tokens
 *   4. Verify credential still active + license still Active at time of verification
 *   5. Atomically mark token used (UPDATE WHERE status='active' — prevents double-use)
 *   6. Insert verifiers row (name, email, terms_accepted_at)
 *   7. Write verification_events (session_started + credential_viewed)
 *   8. Write audit_event (verification.completed)
 *   9. Return safe credential/license display payload
 *
 * Safe display payload excludes:
 *   - Nurse name, email, phone, DOB
 *   - Raw license number
 *   - Internal profile/credential/license IDs
 *   - Raw provider API payloads
 *   - Subscription/payment details
 *   - Audit internals
 *
 * CORS: open (*) — public anonymous endpoint; all auth is via token hash.
 *
 * TASK: TASK-0057
 * Codex QA: required before production use
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  // Public verifier endpoint — no credential cookies; token provides auth.
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Token helpers ──────────────────────────────────────────────────────────────

async function hashToken(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ verified: false, error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const svc = createClient(supabaseUrl, supabaseKey);

  // ── 1. Parse + validate request body ──────────────────────────────────────
  let rawToken: string;
  let verifierName: string;
  let verifierEmail: string;
  let termsAccepted: boolean;
  let marketingConsent: boolean;

  try {
    const body = await req.json();
    rawToken         = (body?.token          ?? "").toString().trim();
    verifierName     = (body?.verifier_name  ?? "").toString().trim();
    verifierEmail    = (body?.verifier_email ?? "").toString().trim().toLowerCase();
    termsAccepted    = body?.terms_accepted    === true;
    marketingConsent = body?.marketing_consent === true;  // optional — defaults false
  } catch {
    return json({ verified: false, error: "invalid_request" }, 400);
  }

  if (!rawToken)     return json({ verified: false, error: "missing_token" }, 400);
  if (!verifierName) return json({ verified: false, error: "missing_verifier_name" }, 400);
  if (!verifierEmail || !EMAIL_RE.test(verifierEmail)) {
    return json({ verified: false, error: "invalid_verifier_email" }, 400);
  }
  if (!termsAccepted) {
    return json({ verified: false, error: "terms_not_accepted" }, 400);
  }

  // ── 2. Hash token + look up verification_tokens ───────────────────────────
  const tokenHash = await hashToken(rawToken);
  const now = new Date().toISOString();

  const { data: tokenRow, error: tokenErr } = await svc
    .from("verification_tokens")
    .select("id, profile_id, credential_id, token_type, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenErr) {
    console.error("token-verify: verification_tokens read failed:", tokenErr.message);
    return json({ verified: false, error: "backend_read_error" }, 503);
  }

  // ── 3. Token validity checks ───────────────────────────────────────────────
  if (!tokenRow) {
    return json({ verified: false, error: "token_not_found" }, 404);
  }
  if (tokenRow.token_type !== "share_link") {
    return json({ verified: false, error: "token_wrong_type" }, 403);
  }
  if (tokenRow.status === "used") {
    return json({ verified: false, error: "token_used" }, 403);
  }
  if (tokenRow.status === "revoked") {
    return json({ verified: false, error: "token_revoked" }, 403);
  }
  if (tokenRow.status !== "active") {
    return json({ verified: false, error: "token_not_active" }, 403);
  }
  if (new Date(tokenRow.expires_at) <= new Date(now)) {
    return json({ verified: false, error: "token_expired" }, 403);
  }

  // ── 4. Load credential — verify still active at time of verification ──────
  const { data: credential, error: credErr } = await svc
    .from("credentials")
    .select("id, status, issued_at, expires_at, license_id")
    .eq("id", tokenRow.credential_id)
    .maybeSingle();

  if (credErr) {
    console.error("token-verify: credential read failed:", credErr.message);
    return json({ verified: false, error: "backend_read_error" }, 503);
  }
  if (!credential) {
    return json({ verified: false, error: "credential_not_found" }, 403);
  }
  if (credential.status !== "active") {
    return json({ verified: false, error: "credential_not_shareable", credential_status: credential.status }, 403);
  }

  // ── 5. Load license — verify still Active at time of verification ─────────
  let licenseType: string | null = null;
  let licenseState: string | null = null;
  let licenseNormalizedStatus: string | null = null;
  let licenseExpirationDate: string | null = null;
  let licenseCurrentAsOf: string | null = null;

  if (credential.license_id) {
    const { data: license, error: licErr } = await svc
      .from("licenses")
      .select("license_type, state, normalized_status, expiration_date, status_checked_at")
      .eq("id", credential.license_id)
      .maybeSingle();

    if (licErr) {
      console.error("token-verify: license read failed:", licErr.message);
      return json({ verified: false, error: "backend_read_error" }, 503);
    }
    if (!license || license.normalized_status !== "Active") {
      return json({
        verified: false,
        error: "license_not_active",
        license_status: license?.normalized_status ?? "not_found",
      }, 403);
    }

    licenseType             = license.license_type;
    licenseState            = license.state;
    licenseNormalizedStatus = license.normalized_status;
    licenseExpirationDate   = license.expiration_date;
    licenseCurrentAsOf      = license.status_checked_at;
  }

  // ── 6. Atomically mark token used (prevents double-use) ───────────────────
  const { count: updatedCount, error: markErr } = await svc
    .from("verification_tokens")
    .update({ status: "used", used_at: now })
    .eq("id", tokenRow.id)
    .eq("status", "active")          // guard: only succeeds if still active
    .select("id", { count: "exact", head: true });

  if (markErr) {
    console.error("token-verify: token mark-used failed:", markErr.message);
    return json({ verified: false, error: "backend_read_error" }, 503);
  }
  if ((updatedCount ?? 0) === 0) {
    // Another request won the race and already marked this token used
    return json({ verified: false, error: "token_used" }, 403);
  }

  // ── 7. Insert verifiers row ────────────────────────────────────────────────
  const { data: verifierRow, error: verifierErr } = await svc
    .from("verifiers")
    .insert({
      token_id:          tokenRow.id,
      name:              verifierName,
      email:             verifierEmail,
      terms_accepted_at: now,
      marketing_consent: marketingConsent,
      status:            "active",
    })
    .select("id")
    .single();

  if (verifierErr || !verifierRow) {
    console.error("token-verify: verifiers insert failed:", verifierErr?.message);
    // Token is marked used; log and continue — do not block the verified response
  }

  const verifierId = verifierRow?.id ?? null;

  // ── 8. Write verification_events ──────────────────────────────────────────
  if (verifierId) {
    const events = [
      {
        verifier_id:           verifierId,
        verification_token_id: tokenRow.id,
        event_type:            "session_started",
        metadata:              { source: "share_link" },
      },
      {
        verifier_id:           verifierId,
        verification_token_id: tokenRow.id,
        event_type:            "credential_viewed",
        metadata:              { credential_status: credential.status },
      },
    ];

    const { error: eventsErr } = await svc.from("verification_events").insert(events);
    if (eventsErr) {
      console.error("token-verify: verification_events insert failed (non-fatal):", eventsErr.message);
    }
  }

  // ── 9. Write audit event ───────────────────────────────────────────────────
  const { error: auditErr } = await svc.from("audit_events").insert({
    actor_id:      tokenRow.profile_id,
    action:        "verification.completed",
    resource_type: "verification_token",
    resource_id:   tokenRow.id,
    change_after: {
      verifier_id:    verifierId,
      token_type:     "share_link",
      credential_id:  tokenRow.credential_id,
      verified_at:    now,
    },
  });
  if (auditErr) {
    console.error("token-verify: audit insert failed (non-fatal):", auditErr.message);
  }

  // ── 10. Return safe credential display payload ─────────────────────────────
  return json({
    verified:    true,
    verifier_id: verifierId,

    credential: {
      status:    credential.status,
      issued_at: credential.issued_at,
      expires_at: credential.expires_at,
    },

    license: {
      type:              licenseType,
      state:             licenseState,
      normalized_status: licenseNormalizedStatus,
      expiration_date:   licenseExpirationDate,
      current_as_of:     licenseCurrentAsOf,
    },

    token_expires_at: tokenRow.expires_at,
    verified_at:      now,
  }, 200);
});

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
