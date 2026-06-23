/**
 * share-link-create
 *
 * TASK-0056 — Implement Share-Link Token Creation Function
 *
 * verify_jwt: true
 *
 * Called by Lovable from /dashboard when the nurse requests a share link.
 *
 * Gate chain:
 *   1. Auth — JWT via supabaseAuth; service-role for all writes
 *   2. Profile — active account, IAL2 identity, terminal onboarding step
 *   3. Credential — active credential owned by profile
 *   4. License — normalized_status Active, data_match_passed true, owned by profile
 *   5. Entitlement — free tier always allowed; paid tier requires active subscriptions row
 *
 * Token:
 *   - 32-byte high-entropy raw token (hex string)
 *   - SHA-256 hash stored in verification_tokens; raw token never stored
 *   - TTL: 72 hours; token_type: share_link
 *   - Raw token returned once in share_url
 *
 * Audit (OD-1 — resource.verb format enforced):
 *   - Both creation and rejection paths write audit_events
 *   - Creation path: fail-closed — audit must succeed before token insert
 *   - Rejection paths: best-effort — audit failure does not change rejection behavior
 *
 * TASK: TASK-0056
 * Codex QA: required before production use
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://app.passtodigital.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SHARE_LINK_TTL_HOURS = 72;
const TERMINAL_STEPS       = new Set(["pass", "complete"]);
const SHAREABLE_STATUSES   = new Set(["active"]);

// ── Token helpers ──────────────────────────────────────────────────────────────

async function generateShareToken(): Promise<{ raw: string; hash: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hash };
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")  ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const shareLinkBase = Deno.env.get("SHARE_LINK_BASE_URL") ?? "https://passtodigital.com/v";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabaseAuth  = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  // ── 2. Load profile + gate ─────────────────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, account_status, onboarding_step, subscription_tier, id_verification_status, id_verification_level")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);

  if (profile.account_status !== "active") {
    await writeRejectionAudit(supabaseAdmin, null, "account_not_active");
    return json({ error: "account_not_active" }, 403);
  }
  if (profile.id_verification_status !== "verified" || profile.id_verification_level !== "IAL2") {
    await writeRejectionAudit(supabaseAdmin, profile.id, "identity_not_verified");
    return json({ error: "identity_not_verified" }, 403);
  }
  if (!TERMINAL_STEPS.has(profile.onboarding_step)) {
    await writeRejectionAudit(supabaseAdmin, profile.id, "onboarding_not_complete");
    return json({ error: "onboarding_not_complete", onboarding_step: profile.onboarding_step }, 403);
  }

  // ── 3. Load credential — must be active and owned by profile ──────────────
  const { data: credential, error: credErr } = await supabaseAdmin
    .from("credentials")
    .select("id, status, license_id")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (credErr) {
    console.error("share-link-create: credential read failed:", credErr.message);
    return json({ error: "backend_read_error" }, 503);
  }
  if (!credential) {
    await writeRejectionAudit(supabaseAdmin, profile.id, "credential_not_found");
    return json({ error: "credential_not_found" }, 403);
  }
  if (!SHAREABLE_STATUSES.has(credential.status)) {
    await writeRejectionAudit(supabaseAdmin, profile.id, `credential_not_shareable:${credential.status}`);
    return json({ error: "credential_not_shareable", credential_status: credential.status }, 403);
  }

  // ── 4. Load license — active + identity match confirmed ───────────────────
  if (!credential.license_id) {
    await writeRejectionAudit(supabaseAdmin, profile.id, "license_not_linked");
    return json({ error: "license_not_linked" }, 403);
  }

  const { data: license, error: licErr } = await supabaseAdmin
    .from("licenses")
    .select("id, normalized_status, data_match_passed")
    .eq("id", credential.license_id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (licErr) {
    console.error("share-link-create: license read failed:", licErr.message);
    return json({ error: "backend_read_error" }, 503);
  }
  if (!license) {
    await writeRejectionAudit(supabaseAdmin, profile.id, "license_not_found");
    return json({ error: "license_not_found" }, 403);
  }
  if (license.normalized_status !== "Active") {
    await writeRejectionAudit(supabaseAdmin, profile.id, `license_not_active:${license.normalized_status}`);
    return json({ error: "license_not_active", normalized_status: license.normalized_status }, 403);
  }
  if (!license.data_match_passed) {
    await writeRejectionAudit(supabaseAdmin, profile.id, "license_match_not_passed");
    return json({ error: "license_match_not_passed" }, 403);
  }

  // ── 5. Entitlement gate — free always passes; paid requires active sub ─────
  if (profile.subscription_tier !== "free") {
    const { data: activeSub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (subErr) {
      console.error("share-link-create: subscriptions read failed:", subErr.message);
      return json({ error: "backend_read_error" }, 503);
    }
    if (!activeSub) {
      await writeRejectionAudit(supabaseAdmin, profile.id, "subscription_not_confirmed");
      return json({ error: "subscription_not_confirmed" }, 403);
    }
  }

  // ── 6. Generate token ──────────────────────────────────────────────────────
  const { raw, hash } = await generateShareToken();
  const expiresAt = new Date(
    Date.now() + SHARE_LINK_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  // ── 7. Audit — fail-closed before token insert ────────────────────────────
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id:      profile.id,
    action:        "verification_token.created",
    resource_type: "verification_token",
    resource_id:   null,
    change_after: {
      token_type:    "share_link",
      credential_id: credential.id,
      license_id:    license.id,
      expires_at:    expiresAt,
    },
  });

  if (auditErr) {
    console.error("share-link-create: audit insert failed:", auditErr.message);
    return json({ error: "audit_failed" }, 500);
  }

  // ── 8. Insert token hash — raw token never stored ─────────────────────────
  const { error: tokenErr } = await supabaseAdmin
    .from("verification_tokens")
    .insert({
      profile_id:    profile.id,
      credential_id: credential.id,
      token_hash:    hash,
      token_type:    "share_link",
      status:        "active",
      expires_at:    expiresAt,
    });

  if (tokenErr) {
    console.error("share-link-create: token insert failed:", tokenErr.message);
    return json({ error: "token_creation_failed" }, 500);
  }

  // ── 9. Return raw token once ───────────────────────────────────────────────
  return json({
    share_url:  `${shareLinkBase}/${raw}`,
    expires_at: expiresAt,
    token_type: "share_link",
  }, 200);
});

// ── Helpers ────────────────────────────────────────────────────────────────────

async function writeRejectionAudit(
  // deno-lint-ignore no-explicit-any
  admin: any,
  profileId: string | null,
  reason: string,
): Promise<void> {
  try {
    await admin.from("audit_events").insert({
      actor_id:      profileId,
      action:        "verification_token.creation_rejected",
      resource_type: "verification_token",
      resource_id:   null,
      change_after:  { reason },
    });
  } catch (e) {
    console.error("share-link-create: rejection audit failed (non-fatal):", (e as Error).message);
  }
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
