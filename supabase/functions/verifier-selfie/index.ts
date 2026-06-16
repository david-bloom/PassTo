/**
 * verifier-selfie
 *
 * TASK-0074 Phase 5 — Selfie-Verifier Backend Contract
 *
 * verify_jwt: false — token-gated, anonymous endpoint
 * CORS: https://app.passtodigital.com, https://demo.passtodigital.com
 *
 * Accepts a raw verification token, validates it, and returns a short-TTL (60s)
 * Supabase Storage signed URL for the nurse's selfie. Designed for production
 * use from the start; also used by the demo environment.
 *
 * Security contract:
 *   - Never returns or logs the raw storage path.
 *   - Signed URL TTL is 60 seconds; caller must request fresh URL per page load.
 *   - Accepts tokens with status 'active' or 'used' (verifier may call after
 *     token-verify has consumed the token on the same page load).
 *   - Rejects 'revoked' tokens and expired tokens unconditionally.
 *   - Audit event contains token_id and timestamp only — no URL or storage path.
 *
 * Input:  { token: string }
 * Output: { selfie_available: true,  url: "<60s-signed-url>" }
 *         { selfie_available: false, reason: 'not_provided' }
 *
 * Audit: verifier.selfie_accessed (token_id + timestamp only)
 *
 * TASK: TASK-0074
 * Codex security review: required before deployment
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  // Allow both production verifier surface and demo environment verifier view
  "Access-Control-Allow-Origin":  "https://app.passtodigital.com",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary":                         "Origin",
};

const DEMO_ORIGIN = "https://demo.passtodigital.com";

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  if (origin === DEMO_ORIGIN) {
    return {
      "Access-Control-Allow-Origin":  DEMO_ORIGIN,
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary":                         "Origin",
    };
  }
  return corsHeaders;
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type":  "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function hashToken(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")   return json(req, { error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")              ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin       = createClient(supabaseUrl, supabaseKey);

  // ── 1. Parse + validate input ──────────────────────────────────────────────
  let rawToken: string;
  try {
    const body = await req.json();
    rawToken   = (body?.token ?? "").toString().trim();
  } catch {
    return json(req, { error: "invalid_request" }, 400);
  }

  if (!rawToken) return json(req, { error: "token_required" }, 400);

  const tokenHash = await hashToken(rawToken);
  const now       = new Date().toISOString();

  // ── 2. Look up verification_tokens by hash ────────────────────────────────
  const { data: tokenRow, error: tokenErr } = await admin
    .from("verification_tokens")
    .select("id, profile_id, credential_id, token_type, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenErr) {
    console.error("verifier-selfie: token lookup failed:", tokenErr.message);
    return json(req, { error: "backend_read_error" }, 503);
  }

  // ── 3. Token validity checks ───────────────────────────────────────────────
  if (!tokenRow) {
    return json(req, { error: "token_not_found" }, 404);
  }
  if (tokenRow.token_type !== "share_link") {
    return json(req, { error: "token_wrong_type" }, 403);
  }
  if (tokenRow.status === "revoked") {
    return json(req, { error: "token_revoked" }, 403);
  }
  // Accept 'active' and 'used' — verifier-selfie may be called after token-verify
  if (!["active", "used"].includes(tokenRow.status)) {
    return json(req, { error: "token_not_valid", status: tokenRow.status }, 403);
  }
  if (new Date(tokenRow.expires_at) <= new Date(now)) {
    return json(req, { error: "token_expired" }, 403);
  }

  // ── 4. Load profile selfie_storage_path ───────────────────────────────────
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, selfie_storage_path")
    .eq("id", tokenRow.profile_id)
    .maybeSingle();

  if (profileErr) {
    console.error("verifier-selfie: profile read failed:", profileErr.message);
    return json(req, { error: "backend_read_error" }, 503);
  }

  if (!profile?.selfie_storage_path) {
    // Audit: selfie check attempted (no selfie — not an error)
    await admin.from("audit_events").insert({
      actor_id:      null,
      action:        "verifier.selfie_accessed",
      resource_type: "verification_token",
      resource_id:   tokenRow.id,
      change_after:  { selfie_available: false, timestamp: now },
    }).catch(() => {});

    return json(req, { selfie_available: false, reason: "not_provided" });
  }

  // ── 5. Generate 60-second signed URL ──────────────────────────────────────
  // selfie_storage_path is the path relative to the 'selfies' bucket.
  // We never return or log the path itself — only the signed URL.
  const { data: signedData, error: signErr } = await admin.storage
    .from("selfies")
    .createSignedUrl(profile.selfie_storage_path, 60);

  if (signErr || !signedData?.signedUrl) {
    console.error("verifier-selfie: signed URL generation failed:", signErr?.message);
    return json(req, { error: "signed_url_failed" }, 500);
  }

  // ── 6. Audit — token_id and timestamp only; never URL or storage path ─────
  await admin.from("audit_events").insert({
    actor_id:      null,
    action:        "verifier.selfie_accessed",
    resource_type: "verification_token",
    resource_id:   tokenRow.id,
    change_after:  { selfie_available: true, timestamp: now },
  }).catch(() => {});

  return json(req, { selfie_available: true, url: signedData.signedUrl });
});
