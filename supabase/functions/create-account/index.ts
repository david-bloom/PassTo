/**
 * create-account
 *
 * ID.me-first onboarding: creates the Supabase Auth user and profile after
 * the nurse confirms their contact details at /confirm-info.
 *
 * verify_jwt: false — no Supabase Auth user exists yet at this point.
 *
 * Flow:
 *   1. Receive attempt_id + nurse-confirmed fields from Lovable
 *   2. Validate the onboarding_attempt (exists, id_verified state, not expired)
 *   3. Detect duplicate id_me_subject without leaking existing account emails
 *   4. Create Supabase Auth user (admin API, email pre-confirmed, no password)
 *   5. handle_new_user() trigger fires → profiles row created automatically
 *   6. Update profile with verified identity fields
 *   7. Mark onboarding_attempt as linked
 *   8. Return a one-time session token so Lovable can authenticate the nurse
 *      and proceed to /license-info
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^.{1,100}$/;

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
  let confirmed_first_name: string;
  let confirmed_last_name: string;
  let confirmed_email: string;

  try {
    const body = await req.json();
    attempt_id = body?.attempt_id;
    confirmed_first_name = body?.first_name;
    confirmed_last_name = body?.last_name;
    confirmed_email = body?.email;
  } catch {
    return json({ error: "invalid_input" }, 400);
  }

  if (!attempt_id || typeof attempt_id !== "string") {
    return json({ error: "invalid_input" }, 400);
  }
  if (
    !confirmed_first_name ||
    !NAME_RE.test(confirmed_first_name.trim())
  ) {
    return json({ error: "invalid_input" }, 400);
  }
  if (
    !confirmed_last_name ||
    !NAME_RE.test(confirmed_last_name.trim())
  ) {
    return json({ error: "invalid_input" }, 400);
  }
  if (!confirmed_email || !EMAIL_RE.test(confirmed_email.trim())) {
    return json({ error: "invalid_input" }, 400);
  }

  const firstName = confirmed_first_name.trim();
  const lastName = confirmed_last_name.trim();
  const email = confirmed_email.trim().toLowerCase();

  // ── 2. Look up and validate onboarding_attempt ──────────────────────────────
  const { data: attempt, error: attemptErr } = await supabaseAdmin
    .from("onboarding_attempts")
    .select("id, idme_subject, id_verification_level, state, expires_at, profile_id")
    .eq("id", attempt_id)
    .maybeSingle();

  if (attemptErr || !attempt) {
    return json({ error: "attempt_not_found" }, 404);
  }

  if (attempt.state !== "id_verified") {
    // Already linked — return conflict without leaking details
    if (attempt.state === "linked") {
      return json({ error: "attempt_already_used" }, 409);
    }
    return json({ error: "attempt_invalid_state" }, 400);
  }

  if (new Date(attempt.expires_at) < new Date()) {
    // Mark expired
    await supabaseAdmin
      .from("onboarding_attempts")
      .update({ state: "expired", updated_at: new Date().toISOString() })
      .eq("id", attempt_id);
    return json({ error: "attempt_expired" }, 400);
  }

  // ── 3. Check for existing profile with this ID.me subject ───────────────────
  // Prevents a second account from being created for the same identity.
  // Does not reveal what email the existing profile uses.
  const { data: existingSubjectProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id_me_subject", attempt.idme_subject)
    .maybeSingle();

  if (existingSubjectProfile) {
    console.log("ID.me subject already linked to existing profile. Blocking duplicate.");
    await writeAudit(supabaseAdmin, null, "identity.duplicate_account_attempt", {
      attempt_id,
      error: "identity_already_registered",
    });
    return json({
      error: "identity_already_registered",
      action: "sign_in",
    }, 409);
  }

  // ── 4. Create Supabase Auth user (admin API, no password, email pre-confirmed) ─
  // email_confirm: true skips the email confirmation requirement.
  // The nurse's identity is already proven by IAL2 ID.me.
  // A "set your password" Postmark email is sent after /success (async, non-blocking).
  const { data: authData, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (createUserErr) {
    // Handle duplicate email without leaking account existence
    const isDuplicate =
      createUserErr.message?.toLowerCase().includes("already") ||
      createUserErr.message?.toLowerCase().includes("exists") ||
      (createUserErr as { status?: number }).status === 422;

    if (isDuplicate) {
      console.log("Email already exists in Supabase Auth. Not revealing to client.");
      await writeAudit(supabaseAdmin, null, "identity.email_conflict_attempt", {
        attempt_id,
        error: "email_conflict",
      });
      // Generic message — does not reveal whether email exists
      return json({ error: "account_setup_failed", action: "contact_support" }, 409);
    }

    console.error("admin.createUser failed:", createUserErr);
    return json({ error: "account_setup_failed" }, 500);
  }

  const newUser = authData?.user;
  if (!newUser?.id) {
    console.error("admin.createUser returned no user");
    return json({ error: "account_setup_failed" }, 500);
  }

  // ── 5. Wait briefly for handle_new_user() trigger to fire ──────────────────
  // The trigger is synchronous in Postgres but we may need a brief settle.
  // Poll for the profiles row (max 3 attempts, 500ms apart).
  let profileId: string | null = null;
  for (let i = 0; i < 3; i++) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", newUser.id)
      .maybeSingle();
    if (profile?.id) {
      profileId = profile.id;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!profileId) {
    console.error("profiles row not found after createUser. auth_user_id:", newUser.id);
    // Attempt cleanup
    await supabaseAdmin.auth.admin.deleteUser(newUser.id).catch(() => {});
    return json({ error: "account_setup_failed" }, 500);
  }

  // ── 6. Update profile with verified identity fields ─────────────────────────
  // These are trust-gate fields — written via service-role only.
  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      id_verification_status: "verified",
      id_verification_level: attempt.id_verification_level,
      id_me_subject: attempt.idme_subject,
      onboarding_step: "license",  // skip 'identity' and 'confirm' — already done
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (updateErr) {
    console.error("Failed to update profile with verified fields:", updateErr);
    // Attempt cleanup
    await supabaseAdmin.auth.admin.deleteUser(newUser.id).catch(() => {});
    return json({ error: "account_setup_failed" }, 500);
  }

  // ── 7. Mark onboarding_attempt as linked ────────────────────────────────────
  await supabaseAdmin
    .from("onboarding_attempts")
    .update({
      state: "linked",
      profile_id: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attempt_id);

  // ── 8. Write audit event ────────────────────────────────────────────────────
  await writeAudit(supabaseAdmin, profileId, "identity.account_created", {
    id_verification_level: attempt.id_verification_level,
    onboarding_step: "license",
  });

  // ── 9. Generate a one-time session token for Lovable ────────────────────────
  // Uses a magic link token — programmatic session establishment, not user-visible.
  // Lovable calls supabase.auth.verifyOtp({ email, token_hash, type: 'email' })
  // to get a session and proceed to /license-info without a password.
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error("Failed to generate session link:", linkErr);
    // Account is created — return success without session token.
    // Lovable must send a "set your password" email path instead.
    return json({
      success: true,
      profile_id: profileId,
      session_token: null,
      fallback: "send_setup_email",
    }, 200);
  }

  return json({
    success: true,
    profile_id: profileId,
    email,
    session_token: linkData.properties.hashed_token,
    session_token_type: "email",
  }, 200);
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
  actorId: string | null,
  action: string,
  changeAfter: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("audit_events").insert({
      actor_id: actorId,
      action,
      resource_type: "profile",
      resource_id: actorId,
      change_after: changeAfter,
    });
  } catch (e) {
    console.error("audit_events write failed:", e);
  }
}
