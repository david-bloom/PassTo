/**
 * idme-verification-start
 *
 * Step 1 of the ID.me-first onboarding flow.
 * Called when the nurse clicks "Continue with ID.me" on /id-verification.
 *
 * Generates state and PKCE code_verifier SERVER-SIDE so neither value
 * ever exists in browser JavaScript. Stores state_hash and encrypted
 * code_verifier in onboarding_attempts. Returns only the values Lovable
 * needs to build the ID.me authorize URL.
 *
 * verify_jwt: false — no auth user exists yet.
 *
 * Lovable responsibility:
 *   - Store attempt_id in sessionStorage
 *   - Build authorize URL: IDME_BASE_URL/oauth/authorize?client_id=...
 *     &redirect_uri=...&response_type=code&scope=openid tefca
 *     &state=<state>&code_challenge=<code_challenge>&code_challenge_method=S256
 *   - Do NOT store state or code_challenge anywhere
 *   - On callback, read state from the URL params ID.me echoes back
 *
 * TASK: TASK-0045 — P1 remediation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://enroll.passtodigital.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  // ── 1. Generate state and PKCE verifier server-side ─────────────────────────
  const state = generateRandom(32);           // 32 bytes → base64url
  const codeVerifier = generateRandom(48);    // 48 bytes → 64-char base64url (valid PKCE)
  const codeChallenge = await sha256Base64url(codeVerifier);
  const stateHash = await sha256Hex(state);

  // ── 2. Encrypt code_verifier for storage ─────────────────────────────────────
  let codeVerifierCiphertext: string;
  try {
    codeVerifierCiphertext = await encryptValue(codeVerifier);
  } catch (e) {
    console.error("Failed to encrypt code_verifier:", e);
    return json({ error: "server_error" }, 500);
  }

  // ── 3. Create onboarding_attempt ─────────────────────────────────────────────
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data: attempt, error: insertErr } = await supabaseAdmin
    .from("onboarding_attempts")
    .insert({
      state_hash: stateHash,
      code_verifier_ciphertext: codeVerifierCiphertext,
      state: "started",
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertErr || !attempt) {
    console.error("Failed to create onboarding_attempt:", insertErr);
    return json({ error: "server_error" }, 500);
  }

  // ── 4. Audit (non-blocking) ──────────────────────────────────────────────────
  supabaseAdmin.from("audit_events").insert({
    actor_id: null,
    action: "identity.verification_started",
    resource_type: "onboarding_attempt",
    resource_id: attempt.id,
    change_after: {},
  }).then(({ error }) => {
    if (error) console.error("audit_events write failed:", error);
  });

  // ── 5. Return values Lovable needs to build the authorize URL ────────────────
  // Lovable stores attempt_id in sessionStorage only.
  // state is included in the authorize URL; ID.me echoes it back as a URL param.
  return json(
    {
      attempt_id: attempt.id,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    },
    200,
  );
});

// ── Crypto helpers ────────────────────────────────────────────────────────────

function generateRandom(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr);
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function sha256Hex(input: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Base64url(input: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return base64url(new Uint8Array(hash));
}

function getEncryptionKeyBytes(): Uint8Array {
  const raw = Deno.env.get("ONBOARDING_ENCRYPTION_KEY") ?? "";
  if (!raw) throw new Error("ONBOARDING_ENCRYPTION_KEY not set");

  // Support base64: or legacy base64:= prefix, then hex fallback
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

async function encryptValue(plaintext: string): Promise<string> {
  const keyBytes = getEncryptionKeyBytes();
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, "0")).join("");
  const ctHex = Array.from(new Uint8Array(ciphertext))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${ivHex}:${ctHex}`;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
