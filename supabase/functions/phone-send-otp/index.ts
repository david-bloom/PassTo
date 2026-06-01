import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://enroll.passtodigital.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// E.164 format: + followed by 7–15 digits
const E164_RE = /^\+[1-9]\d{6,14}$/;

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

  try {
    const body = await req.json();
    phone = body?.phone;
  } catch {
    return json({ error: "invalid_phone" }, 400);
  }

  if (!phone || typeof phone !== "string" || !E164_RE.test(phone.trim())) {
    return json({ error: "invalid_phone" }, 400);
  }
  phone = phone.trim();

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
    .select("id, onboarding_step, id_verification_status, id_verification_level")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return json({ error: "profile_not_found" }, 404);
  }

  // ── 4. Gate checks ──────────────────────────────────────────────────────────
  if (profile.onboarding_step !== "phone") {
    return json({ error: "invalid_step" }, 400);
  }

  if (
    profile.id_verification_status !== "verified" ||
    profile.id_verification_level !== "IAL2"
  ) {
    return json({ error: "identity_not_verified" }, 400);
  }

  // ── 4b. License match gate ─────────────────────────────────────────────────
  // Require data_match_passed = true on the primary license before sending OTP.
  // Prevents a nurse who failed license lookup from reaching phone verification.
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

  // ── 5. Call Twilio Verify ───────────────────────────────────────────────────
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID") ?? "";

  const twilioAuth = btoa(`${accountSid}:${authToken}`);

  let twilioStatus: string;
  let verificationSid: string | undefined;

  try {
    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, Channel: "sms" }).toString(),
      },
    );

    if (!twilioRes.ok) {
      const errBody = await twilioRes.text().catch(() => "(unreadable)");
      console.error("Twilio Verify send failed:", twilioRes.status, errBody);

      // Twilio 429 = rate limit
      if (twilioRes.status === 429) {
        await writeFailedNotification(supabaseAdmin, profile.id);
        await writeAudit(supabaseAdmin, profile.id, "phone.otp_failed", {
          error_key: "rate_limited",
        });
        return json({ sent: false, error: "rate_limited" }, 200);
      }

      await writeFailedNotification(supabaseAdmin, profile.id);
      await writeAudit(supabaseAdmin, profile.id, "phone.otp_failed", {
        error_key: "provider_error",
      });
      return json({ sent: false, error: "provider_error" }, 200);
    }

    const twilioData = await twilioRes.json();
    twilioStatus = twilioData?.status;
    verificationSid = twilioData?.sid;
  } catch (e) {
    console.error("Twilio Verify send threw:", e);
    await writeFailedNotification(supabaseAdmin, profile.id);
    await writeAudit(supabaseAdmin, profile.id, "phone.otp_failed", {
      error_key: "provider_error",
    });
    return json({ sent: false, error: "provider_error" }, 200);
  }

  // ── 6. Write notification_events (success) ─────────────────────────────────
  const { error: notifErr } = await supabaseAdmin.from("notification_events").insert({
    profile_id: profile.id,
    related_entity_type: "phone_verification",
    channel: "sms",
    provider: "twilio",
    direction: "outbound",
    status: "sent",
    external_message_id: verificationSid ?? null,
  });
  if (notifErr) {
    console.error("notification_events write failed (non-blocking):", notifErr);
  }

  // ── 7. Write audit event ────────────────────────────────────────────────────
  await writeAudit(supabaseAdmin, profile.id, "phone.otp_sent", {
    channel: "sms",
  });

  // ── 8. Return success ───────────────────────────────────────────────────────
  return json({ sent: true }, 200);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function writeFailedNotification(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
): Promise<void> {
  const { error } = await supabase.from("notification_events").insert({
    profile_id: profileId,
    related_entity_type: "phone_verification",
    channel: "sms",
    provider: "twilio",
    direction: "outbound",
    status: "failed",
  });
  if (error) {
    console.error("notification_events failed-row write failed (non-blocking):", error);
  }
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
