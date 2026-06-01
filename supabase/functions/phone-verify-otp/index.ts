import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://enroll.passtodigital.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const E164_RE = /^\+[1-9]\d{6,14}$/;
const OTP_CODE_RE = /^\d{6}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // ── 1. Parse and validate input ────────────────────────────────────────────
  let phone: string;
  let code: string;

  try {
    const body = await req.json();
    phone = body?.phone;
    code = body?.code;
  } catch {
    return json({ error: "invalid_input" }, 400);
  }

  if (!phone || typeof phone !== "string" || !E164_RE.test(phone.trim())) {
    return json({ error: "invalid_input" }, 400);
  }
  if (!code || typeof code !== "string" || !OTP_CODE_RE.test(code.trim())) {
    return json({ error: "invalid_input" }, 400);
  }
  phone = phone.trim();
  code = code.trim();

  // ── 2. Verify JWT ───────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "unauthenticated" }, 401);
  }

  const { data: { user }, error: authError } =
    await supabaseAdmin.auth.getUser(authHeader.slice(7));

  if (authError || !user) {
    return json({ error: "unauthenticated" }, 401);
  }

  // ── 3. Look up profile ──────────────────────────────────────────────────────
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, onboarding_step, phone, id_verification_status, id_verification_level",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return json({ error: "profile_not_found" }, 404);
  }

  // ── 4. Gate checks ──────────────────────────────────────────────────────────
  if (
    profile.id_verification_status !== "verified" ||
    profile.id_verification_level !== "IAL2"
  ) {
    return json({ error: "identity_not_verified" }, 400);
  }

  // Idempotency: already past phone step (plan or later in ID.me-first flow)
  const POST_PHONE_STEPS = new Set(["plan", "payment", "selfie", "pass", "complete"]);
  if (POST_PHONE_STEPS.has(profile.onboarding_step)) {
    if (profile.phone === phone) {
      return json({ verified: true }, 200);
    }
    return json({ verified: false, error: "already_verified_different_phone" }, 200);
  }

  if (profile.onboarding_step !== "phone") {
    return json({ error: "invalid_step" }, 400);
  }

  // ── 4b. License match gate ─────────────────────────────────────────────────
  // Require data_match_passed = true on the primary license before verifying OTP.
  const { data: primaryLicense } = await supabaseAdmin
    .from("licenses")
    .select("data_match_passed")
    .eq("profile_id", profile.id)
    .eq("is_primary", true)
    .eq("data_match_passed", true)
    .maybeSingle();

  if (!primaryLicense) {
    await writeAudit(supabaseAdmin, profile.id, "phone.otp_blocked", {
      error_key: "license_not_verified",
    });
    return json({ error: "license_not_verified" }, 403);
  }

  // ── 5. Check code with Twilio Verify ───────────────────────────────────────
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID") ?? "";

  const twilioAuth = btoa(`${accountSid}:${authToken}`);

  let verificationStatus: string;

  try {
    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, Code: code }).toString(),
      },
    );

    if (!twilioRes.ok) {
      const errBody = await twilioRes.text().catch(() => "(unreadable)");
      console.error("Twilio VerificationCheck failed:", twilioRes.status, errBody);
      await writeAudit(supabaseAdmin, profile.id, "phone.otp_failed", {
        error_key: "provider_error",
      });
      return json({ verified: false, error: "provider_error" }, 200);
    }

    const twilioData = await twilioRes.json();
    verificationStatus = twilioData?.status;
  } catch (e) {
    console.error("Twilio VerificationCheck threw:", e);
    await writeAudit(supabaseAdmin, profile.id, "phone.otp_failed", {
      error_key: "provider_error",
    });
    return json({ verified: false, error: "provider_error" }, 200);
  }

  // ── 6. Evaluate result ──────────────────────────────────────────────────────
  if (verificationStatus === "approved") {
    // Atomically write profiles.phone + onboarding_step = 'license' + audit_events
    const { error: rpcError } = await supabaseAdmin.rpc(
      "complete_phone_verification",
      { p_profile_id: profile.id, p_phone: phone },
    );

    if (rpcError) {
      console.error("complete_phone_verification RPC failed:", rpcError);
      // Atomic rollback — profile NOT advanced; nurse can retry
      return json({ verified: false, error: "provider_error" }, 200);
    }

    return json({ verified: true }, 200);
  }

  // Terminal states: OTP expired, max attempts exceeded, or cancelled
  if (
    verificationStatus === "canceled" ||
    verificationStatus === "expired" ||
    verificationStatus === "max_attempts_reached"
  ) {
    await writeAudit(supabaseAdmin, profile.id, "phone.otp_expired", {
      error_key: "code_expired",
    });
    return json({ verified: false, error: "code_expired" }, 200);
  }

  // Wrong code, attempts still remain
  if (verificationStatus === "pending") {
    await writeAudit(supabaseAdmin, profile.id, "phone.otp_failed", {
      error_key: "invalid_code",
    });
    return json({ verified: false, error: "invalid_code" }, 200);
  }

  // Unexpected/unknown Twilio status (failed, deleted, etc.)
  console.error("Unexpected Twilio verification status:", verificationStatus);
  await writeAudit(supabaseAdmin, profile.id, "phone.otp_failed", {
    error_key: "provider_error",
  });
  return json({ verified: false, error: "provider_error" }, 200);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function writeAudit(
  supabase: ReturnType<typeof createClient>,
  actorId: string,
  action: string,
  changeAfter: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("audit_events").insert({
    actor_id: actorId,
    action,
    resource_type: "profile",
    resource_id: actorId,
    change_after: changeAfter,
  });
  if (error) {
    console.error("audit_events write failed (non-blocking):", error);
  }
}
