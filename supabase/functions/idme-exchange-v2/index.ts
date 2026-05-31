/**
 * idme-exchange-v2
 *
 * ID.me-first onboarding: pre-account token exchange.
 * Called by Lovable /auth/idme/callback BEFORE a Supabase Auth user exists.
 *
 * verify_jwt: false — no authenticated user at this point.
 * Security is provided by PKCE code_verifier validation + onboarding_attempts
 * partial-unique-index preventing duplicate active attempts per ID.me subject.
 *
 * On success: creates or resumes an onboarding_attempts row and returns safe
 * identity/contact fields for /confirm-info prefill, plus the attempt_id Lovable
 * must store in sessionStorage and pass to create-account.
 *
 * TASK: TASK-0045
 * Codex QA: pending — security review required before production use.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://enroll.passtodigital.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// RFC 7636 §4.1 — code_verifier: 43–128 unreserved chars
const PKCE_VERIFIER_RE = /^[A-Za-z0-9\-._~]{43,128}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // ── 1. Parse and validate input ────────────────────────────────────────────
  let code: string;
  let code_verifier: string;

  try {
    const body = await req.json();
    code = body?.code;
    code_verifier = body?.code_verifier;
  } catch {
    return json({ error: "missing_code" }, 400);
  }

  if (!code || typeof code !== "string" || !code.trim()) {
    return json({ error: "missing_code" }, 400);
  }

  if (
    !code_verifier ||
    typeof code_verifier !== "string" ||
    !PKCE_VERIFIER_RE.test(code_verifier)
  ) {
    return json({ error: "invalid_code_verifier" }, 400);
  }

  // ── 2. Exchange code with ID.me token endpoint ──────────────────────────────
  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: Deno.env.get("IDME_CLIENT_ID") ?? "",
    client_secret: Deno.env.get("IDME_CLIENT_SECRET") ?? "",
    redirect_uri: Deno.env.get("IDME_REDIRECT_URI") ?? "",
    code_verifier,
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
      return json({ verified: false, error: "exchange_failed" }, 200);
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData?.access_token;

    if (!accessToken) {
      console.error(
        "ID.me token response missing access_token. Keys:",
        Object.keys(tokenData ?? {}),
      );
      return json({ verified: false, error: "exchange_failed" }, 200);
    }
  } catch (e) {
    console.error("ID.me token exchange threw:", e);
    return json({ verified: false, error: "provider_error" }, 200);
  }

  // ── 3. Fetch UserInfo / Attributes from ID.me ────────────────────────────────
  // Using attributes API endpoint. Diagnostic logging enabled — first run will
  // reveal exact response structure so field parsing can be pinned.
  let attributesData: Record<string, unknown>;

  try {
    const attrRes = await fetch(Deno.env.get("IDME_ATTRIBUTES_URL") ?? "", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!attrRes.ok) {
      const errBody = await attrRes.text().catch(() => "(unreadable)");
      console.error("ID.me attributes fetch failed:", attrRes.status, errBody);
      return json({ verified: false, error: "provider_error" }, 200);
    }

    attributesData = await attrRes.json();

    // Diagnostic — review in Supabase Edge Function logs after first sandbox run
    // Remove before production.
    console.log("ID.me attributes top-level keys:", Object.keys(attributesData ?? {}));
    console.log("ID.me attributes (sanitized):", JSON.stringify({
      sub: attributesData?.sub,
      uuid: attributesData?.uuid,
      ial: attributesData?.ial,
      loa: attributesData?.loa,
      vot: attributesData?.vot,
      verified: attributesData?.verified,
      status: attributesData?.status,
      hasAttributesArray: Array.isArray(attributesData?.attributes),
      attributeHandles: Array.isArray(attributesData?.attributes)
        ? (attributesData.attributes as Array<{ handle: string }>).map(
            (a) => a.handle,
          )
        : [],
    }));
  } catch (e) {
    console.error("ID.me attributes fetch threw:", e);
    return json({ verified: false, error: "provider_error" }, 200);
  }

  // ── 4. Extract fields (handles both flat OIDC and nested attributes API) ────
  const subject =
    extractField(attributesData, ["sub", "uuid"]) ??
    extractAttribute(attributesData, ["uuid", "sub"]);

  const ialLevel = resolveIAL(attributesData);
  const firstName = extractField(attributesData, ["first_name", "fname"]) ??
    extractAttribute(attributesData, ["first_name", "fname", "given_name"]);
  const lastName = extractField(attributesData, ["last_name", "lname"]) ??
    extractAttribute(attributesData, ["last_name", "lname", "family_name"]);
  const email = extractField(attributesData, ["email"]) ??
    extractAttribute(attributesData, ["email"]);
  const phone = extractField(attributesData, ["phone", "phone_number"]) ??
    extractAttribute(attributesData, ["phone", "phone_number", "mobile"]);

  // Log parsed values (no PII beyond initial of name for debugging)
  console.log("Parsed: subject_present:", !!subject, "ial:", ialLevel,
    "first_name_present:", !!firstName, "last_name_present:", !!lastName,
    "email_present:", !!email, "phone_present:", !!phone);

  // ── 5. Validate IAL ─────────────────────────────────────────────────────────
  if (!subject) {
    console.error(
      "ID.me response missing subject. Top-level keys:",
      Object.keys(attributesData ?? {}),
    );
    return json({ verified: false, error: "provider_error" }, 200);
  }

  if (ialLevel < 2) {
    console.error("IAL check failed. Resolved ialLevel:", ialLevel);
    return json({ verified: false, error: "ial1_only" }, 200);
  }

  // ── 6. Check for existing PassTo profile with this ID.me subject ─────────────
  // Prevents one ID.me identity from creating a second account.
  // Does not reveal what email the existing profile uses.
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, account_status")
    .eq("id_me_subject", subject)
    .maybeSingle();

  if (existingProfile) {
    // Subject already has a PassTo account — route to sign-in, not enrollment
    console.log("ID.me subject already linked to a profile. Routing to sign-in.");
    return json({
      verified: false,
      error: "identity_already_registered",
      action: "sign_in",
    }, 200);
  }

  // ── 7. Create or resume onboarding_attempt ──────────────────────────────────
  // Partial unique index on idme_subject WHERE state NOT IN ('linked','abandoned','expired')
  // means only one active attempt per subject at a time.

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // Check for an existing active attempt (e.g. nurse refreshed mid-flow)
  const { data: existingAttempt } = await supabaseAdmin
    .from("onboarding_attempts")
    .select("id, state, expires_at")
    .eq("idme_subject", subject)
    .not("state", "in", '("linked","abandoned","expired")')
    .maybeSingle();

  let attemptId: string;

  if (existingAttempt && new Date(existingAttempt.expires_at) > new Date()) {
    // Resume: update the existing attempt with fresh verified data
    const { error: updateErr } = await supabaseAdmin
      .from("onboarding_attempts")
      .update({
        id_verification_level: ialLevel >= 2 ? "IAL2" : "IAL1",
        verified_first_name: firstName ?? null,
        verified_last_name: lastName ?? null,
        verified_email: email ?? null,
        verified_phone: phone ?? null,
        state: "id_verified",
        expires_at: expiresAt,
        updated_at: now,
      })
      .eq("id", existingAttempt.id);

    if (updateErr) {
      console.error("Failed to update existing onboarding_attempt:", updateErr);
      return json({ verified: false, error: "provider_error" }, 200);
    }
    attemptId = existingAttempt.id;
  } else {
    // Create new attempt
    const { data: newAttempt, error: insertErr } = await supabaseAdmin
      .from("onboarding_attempts")
      .insert({
        idme_subject: subject,
        id_verification_level: ialLevel >= 2 ? "IAL2" : "IAL1",
        verified_first_name: firstName ?? null,
        verified_last_name: lastName ?? null,
        verified_email: email ?? null,
        verified_phone: phone ?? null,
        state: "id_verified",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insertErr || !newAttempt) {
      console.error("Failed to create onboarding_attempt:", insertErr);
      return json({ verified: false, error: "provider_error" }, 200);
    }
    attemptId = newAttempt.id;
  }

  // ── 8. Write audit event ────────────────────────────────────────────────────
  // actor_id is null at this point — no profile exists yet
  try {
    await supabaseAdmin.from("audit_events").insert({
      actor_id: null,
      action: "identity.verification_completed",
      resource_type: "onboarding_attempt",
      resource_id: attemptId,
      change_after: {
        id_verification_level: ialLevel >= 2 ? "IAL2" : "IAL1",
        attempt_id: attemptId,
      },
    });
  } catch (e) {
    console.error("audit_events write failed (non-blocking):", e);
  }

  // ── 9. Return safe fields to Lovable for /confirm-info prefill ──────────────
  return json({
    verified: true,
    attempt_id: attemptId,
    first_name: firstName ?? null,
    last_name: lastName ?? null,
    email: email ?? null,
    phone: phone ?? null,
  }, 200);
});

// ── Field extraction helpers ──────────────────────────────────────────────────

/** Try flat top-level keys on the response object */
function extractField(
  data: Record<string, unknown>,
  handles: string[],
): string | undefined {
  for (const h of handles) {
    if (typeof data[h] === "string" && data[h]) return data[h] as string;
  }
  return undefined;
}

/** Try nested attributes array (ID.me Attributes API format) */
function extractAttribute(
  data: Record<string, unknown>,
  handles: string[],
): string | undefined {
  const attrs = data["attributes"] as
    | Array<{ handle: string; value: string }>
    | undefined;
  if (!Array.isArray(attrs)) return undefined;
  for (const h of handles) {
    const found = attrs.find((a) => a.handle === h);
    if (found?.value) return found.value;
  }
  return undefined;
}

/** Resolve IAL level from multiple possible response shapes */
function resolveIAL(data: Record<string, unknown>): number {
  // Flat numeric
  if (typeof data.ial === "number") return data.ial;
  if (typeof data.ial === "string") return parseInt(data.ial, 10) || 0;

  // Flat NIST LOA URL
  if (typeof data.loa === "string") {
    if (data.loa.includes("ial/2") || data.loa.includes("ial/3")) return 2;
    if (data.loa.includes("ial/1")) return 1;
  }

  // Nested attributes array
  const attrs = data["attributes"] as
    | Array<{ handle: string; value: string }>
    | undefined;
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

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
