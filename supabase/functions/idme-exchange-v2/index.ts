/**
 * idme-exchange-v2
 *
 * Step 2 of the ID.me-first onboarding flow.
 * Called by Lovable /auth/idme/callback after ID.me redirects back.
 *
 * verify_jwt: false — no Supabase Auth user exists yet.
 *
 * Security model:
 *   - Requires attempt_id (from Lovable sessionStorage) plus code + state
 *     from the ID.me callback URL params.
 *   - Validates state by hashing it and comparing to state_hash stored at
 *     attempt creation time — proves the callback belongs to a server-initiated
 *     enrollment.
 *   - Atomically claims the attempt (sets consumed_at WHERE consumed_at IS NULL)
 *     before calling ID.me — prevents concurrent replay.
 *   - Decrypts the stored code_verifier server-side; the browser never holds it.
 *   - On any ID.me or attribute failure, marks attempt abandoned.
 *
 * On success: attempt state = id_verified; safe identity fields returned to
 * Lovable for /confirm-info prefill.
 *
 * TASK: TASK-0045 — P1 remediation
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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // ── 1. Parse and validate input ────────────────────────────────────────────
  let attempt_id: string;
  let code: string;
  let state: string;

  try {
    const body = await req.json();
    attempt_id = body?.attempt_id;
    code = body?.code;
    state = body?.state;
  } catch {
    return json({ error: "invalid_input" }, 400);
  }

  if (!attempt_id || typeof attempt_id !== "string" || !attempt_id.trim()) {
    return json({ error: "missing_attempt_id" }, 400);
  }
  if (!code || typeof code !== "string" || !code.trim()) {
    return json({ error: "missing_code" }, 400);
  }
  if (!state || typeof state !== "string" || !state.trim()) {
    return json({ error: "missing_state" }, 400);
  }

  const attemptId = attempt_id.trim();

  // ── 2. Look up the pending attempt ─────────────────────────────────────────
  const { data: attempt, error: selectErr } = await supabaseAdmin
    .from("onboarding_attempts")
    .select("id, state, state_hash, code_verifier_ciphertext, expires_at")
    .eq("id", attemptId)
    .maybeSingle();

  if (selectErr) {
    console.error("onboarding_attempts select error:", selectErr);
    return json({ error: "server_error" }, 500);
  }

  if (!attempt) {
    return json({ verified: false, error: "attempt_not_found" }, 404);
  }

  if (new Date(attempt.expires_at) < new Date()) {
    await supabaseAdmin
      .from("onboarding_attempts")
      .update({ state: "expired", updated_at: new Date().toISOString() })
      .eq("id", attemptId)
      .eq("state", "started");
    return json({ verified: false, error: "attempt_expired" }, 400);
  }

  if (attempt.state !== "started") {
    const alreadyDone = ["id_verified", "account_creating", "linked"].includes(attempt.state);
    return json(
      {
        verified: false,
        error: alreadyDone ? "attempt_already_consumed" : "attempt_invalid_state",
      },
      409,
    );
  }

  if (!attempt.state_hash || !attempt.code_verifier_ciphertext) {
    // Row was created by the old function before Migration E — cannot validate
    console.error("attempt missing state_hash or code_verifier_ciphertext:", attemptId);
    return json({ verified: false, error: "attempt_incompatible" }, 400);
  }

  // ── 3. Validate state (timing-safe) ───────────────────────────────────────
  const receivedHash = await sha256Hex(state.trim());
  if (!constantTimeEqual(receivedHash, attempt.state_hash)) {
    console.error("state_hash mismatch for attempt:", attemptId);
    return json({ verified: false, error: "state_invalid" }, 400);
  }

  // ── 4. Atomically consume the attempt ─────────────────────────────────────
  // UPDATE WHERE consumed_at IS NULL is the compare-and-swap guard.
  // If another concurrent request already set consumed_at, this UPDATE
  // returns 0 rows and we reject.
  const now = new Date().toISOString();
  const { data: consumed, error: consumeErr } = await supabaseAdmin
    .from("onboarding_attempts")
    .update({ consumed_at: now, updated_at: now })
    .eq("id", attemptId)
    .eq("state", "started")
    .is("consumed_at", null)
    .select("id");

  if (consumeErr) {
    console.error("Failed to consume attempt:", consumeErr);
    return json({ verified: false, error: "server_error" }, 500);
  }

  if (!consumed || consumed.length === 0) {
    return json({ verified: false, error: "attempt_already_consumed" }, 409);
  }

  // ── 5. Decrypt the stored code_verifier ────────────────────────────────────
  let codeVerifier: string;
  try {
    codeVerifier = await decryptValue(attempt.code_verifier_ciphertext);
  } catch (e) {
    console.error("Failed to decrypt code_verifier:", e);
    await markAbandoned(supabaseAdmin, attemptId, "decrypt_failed");
    return json({ verified: false, error: "server_error" }, 500);
  }

  // ── 6. Exchange authorization code with ID.me ──────────────────────────────
  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code: code.trim(),
    client_id: Deno.env.get("IDME_CLIENT_ID") ?? "",
    client_secret: Deno.env.get("IDME_CLIENT_SECRET") ?? "",
    redirect_uri: Deno.env.get("IDME_REDIRECT_URI") ?? "",
    code_verifier: codeVerifier,
  });

  let accessToken: string;

  try {
    const tokenRes = await fetch(Deno.env.get("IDME_TOKEN_URL") ?? "", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text().catch(() => "(unreadable)");
      console.error("ID.me token exchange failed:", tokenRes.status, errBody);
      await markAbandoned(supabaseAdmin, attemptId, "exchange_failed");
      return json({ verified: false, error: "exchange_failed" }, 200);
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData?.access_token;

    if (!accessToken) {
      console.error(
        "ID.me token response missing access_token. Keys:",
        Object.keys(tokenData ?? {}),
      );
      await markAbandoned(supabaseAdmin, attemptId, "exchange_failed");
      return json({ verified: false, error: "exchange_failed" }, 200);
    }
  } catch (e) {
    console.error("ID.me token exchange threw:", e);
    await markAbandoned(supabaseAdmin, attemptId, "provider_error");
    return json({ verified: false, error: "provider_error" }, 200);
  }

  // ── 7. Fetch identity attributes from ID.me ────────────────────────────────
  let attributesData: Record<string, unknown>;

  try {
    const attrRes = await fetch(Deno.env.get("IDME_ATTRIBUTES_URL") ?? "", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!attrRes.ok) {
      const errBody = await attrRes.text().catch(() => "(unreadable)");
      console.error("ID.me attributes fetch failed:", attrRes.status, errBody);
      await markAbandoned(supabaseAdmin, attemptId, "provider_error");
      return json({ verified: false, error: "provider_error" }, 200);
    }

    attributesData = await attrRes.json();
  } catch (e) {
    console.error("ID.me attributes fetch threw:", e);
    await markAbandoned(supabaseAdmin, attemptId, "provider_error");
    return json({ verified: false, error: "provider_error" }, 200);
  }

  // ── 8. Extract fields (handles flat OIDC and nested attributes API shapes) ─
  const subject =
    extractField(attributesData, ["sub", "uuid"]) ??
    extractAttribute(attributesData, ["uuid", "sub"]);

  const ialLevel = resolveIAL(attributesData);
  const firstName =
    extractField(attributesData, ["first_name", "fname"]) ??
    extractAttribute(attributesData, ["first_name", "fname", "given_name"]);
  const lastName =
    extractField(attributesData, ["last_name", "lname"]) ??
    extractAttribute(attributesData, ["last_name", "lname", "family_name"]);
  const email =
    extractField(attributesData, ["email"]) ??
    extractAttribute(attributesData, ["email"]);
  const phone =
    extractField(attributesData, ["phone", "phone_number"]) ??
    extractAttribute(attributesData, ["phone", "phone_number", "mobile"]);

  // ── 9. Validate subject and IAL ────────────────────────────────────────────
  if (!subject) {
    console.error(
      "ID.me response missing subject. Top-level keys:",
      Object.keys(attributesData ?? {}),
    );
    await markAbandoned(supabaseAdmin, attemptId, "missing_subject");
    return json({ verified: false, error: "provider_error" }, 200);
  }

  if (ialLevel < 2) {
    console.error("IAL check failed. Resolved ialLevel:", ialLevel);
    await markAbandoned(supabaseAdmin, attemptId, "ial_insufficient");
    return json({ verified: false, error: "ial1_only" }, 200);
  }

  // ── 10. Check for existing profile with this ID.me subject ────────────────
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, account_status")
    .eq("id_me_subject", subject)
    .maybeSingle();

  if (existingProfile) {
    console.log("ID.me subject already linked to a profile — routing to sign-in.");
    await markAbandoned(supabaseAdmin, attemptId, "identity_already_registered");
    return json(
      { verified: false, error: "identity_already_registered", action: "sign_in" },
      200,
    );
  }

  // ── 11. Update attempt with verified identity fields ───────────────────────
  const refreshedExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { error: updateErr } = await supabaseAdmin
    .from("onboarding_attempts")
    .update({
      idme_subject: subject,
      id_verification_level: "IAL2",
      verified_first_name: firstName ?? null,
      verified_last_name: lastName ?? null,
      verified_email: email ?? null,
      verified_phone: phone ?? null,
      state: "id_verified",
      expires_at: refreshedExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (updateErr) {
    console.error("Failed to update attempt with verified fields:", updateErr);
    await markAbandoned(supabaseAdmin, attemptId, "server_error");
    return json({ verified: false, error: "server_error" }, 500);
  }

  // ── 12. Audit (non-blocking) ───────────────────────────────────────────────
  supabaseAdmin.from("audit_events").insert({
    actor_id: null,
    action: "identity.verification_completed",
    resource_type: "onboarding_attempt",
    resource_id: attemptId,
    change_after: { id_verification_level: "IAL2", attempt_id: attemptId },
  }).then(({ error }) => {
    if (error) console.error("audit_events write failed (non-blocking):", error);
  });

  // ── 13. Return safe fields to Lovable for /confirm-info prefill ────────────
  return json(
    {
      verified: true,
      attempt_id: attemptId,
      first_name: firstName ?? null,
      last_name: lastName ?? null,
      email: email ?? null,
      phone: phone ?? null,
    },
    200,
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function markAbandoned(
  supabase: ReturnType<typeof createClient>,
  attemptId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase
    .from("onboarding_attempts")
    .update({ state: "abandoned", updated_at: new Date().toISOString() })
    .eq("id", attemptId);
  if (error) console.error("Failed to mark attempt abandoned:", reason, error);
}

function extractField(
  data: Record<string, unknown>,
  handles: string[],
): string | undefined {
  for (const h of handles) {
    if (typeof data[h] === "string" && data[h]) return data[h] as string;
  }
  return undefined;
}

function extractAttribute(
  data: Record<string, unknown>,
  handles: string[],
): string | undefined {
  const attrs = data["attributes"] as Array<{ handle: string; value: string }> | undefined;
  if (!Array.isArray(attrs)) return undefined;
  for (const h of handles) {
    const found = attrs.find((a) => a.handle === h);
    if (found?.value) return found.value;
  }
  return undefined;
}

function resolveIAL(data: Record<string, unknown>): number {
  if (typeof data.ial === "number") return data.ial;
  if (typeof data.ial === "string") return parseInt(data.ial, 10) || 0;
  if (typeof data.loa === "string") {
    if (data.loa.includes("ial/2") || data.loa.includes("ial/3")) return 2;
    if (data.loa.includes("ial/1")) return 1;
  }
  const attrs = data["attributes"] as Array<{ handle: string; value: string }> | undefined;
  if (Array.isArray(attrs)) {
    const ialAttr = attrs.find((a) => a.handle === "ial" || a.handle === "loa");
    if (ialAttr?.value) {
      const n = parseInt(ialAttr.value, 10);
      if (!isNaN(n)) return n;
      if (ialAttr.value.includes("2") || ialAttr.value.includes("3")) return 2;
      if (ialAttr.value.includes("1")) return 1;
    }
  }
  return 0;
}

async function sha256Hex(input: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function getEncryptionKeyBytes(): Uint8Array {
  const raw = Deno.env.get("ONBOARDING_ENCRYPTION_KEY") ?? "";
  if (!raw) throw new Error("ONBOARDING_ENCRYPTION_KEY not set");

  if (raw.startsWith("base64:")) {
    const b64 = raw.startsWith("base64:=") ? raw.slice(8) : raw.slice(7);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    if (bytes.length !== 16 && bytes.length !== 24 && bytes.length !== 32) {
      throw new Error(`ONBOARDING_ENCRYPTION_KEY: invalid AES key length ${bytes.length}`);
    }
    return bytes;
  }

  const hex = raw.replace(/[^0-9a-fA-F]/g, "");
  if (hex.length !== 32 && hex.length !== 48 && hex.length !== 64) {
    throw new Error(`ONBOARDING_ENCRYPTION_KEY: invalid hex length ${hex.length}`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function decryptValue(ciphertext: string): Promise<string> {
  // Format written by encryptValue in idme-verification-start: ${ivHex}:${ctHex}
  const colonIdx = ciphertext.indexOf(":");
  if (colonIdx < 0) throw new Error("invalid_ciphertext_format");

  const ivHex = ciphertext.slice(0, colonIdx);
  const ctHex = ciphertext.slice(colonIdx + 1);

  if (ivHex.length !== 24) throw new Error(`invalid IV hex length: ${ivHex.length}`);
  if (ctHex.length === 0) throw new Error("empty ciphertext");

  const iv = hexToBytes(ivHex);
  const ct = hexToBytes(ctHex);

  const keyBytes = getEncryptionKeyBytes();
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(plaintext);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
