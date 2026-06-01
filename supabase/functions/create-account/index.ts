/**
 * create-account
 *
 * Step 3 of the ID.me-first onboarding flow.
 * Called when the nurse submits /confirm-info after reviewing their ID.me
 * verified name and email.
 *
 * verify_jwt: false — no Supabase Auth user exists yet at this point.
 *
 * Security model:
 *   - Requires attempt_id in id_verified state.
 *   - Atomically claims the attempt (id_verified → account_creating) before
 *     calling admin.createUser() — prevents concurrent account creation for the
 *     same attempt.
 *   - Compares confirmed_email to attempt.verified_email (case-insensitive).
 *     If the nurse kept the ID.me email, email_confirm = true (IAL2 already
 *     proved ownership). If the nurse edited it, email_confirm = false
 *     (Supabase sends a verification link to the new address).
 *   - On any partial failure, attempts best-effort recovery to reset the attempt
 *     to id_verified so the nurse can retry rather than being permanently stuck.
 *   - verified_phone from ID.me is NOT copied to profiles.phone — only
 *     phone-verify-otp may write that field.
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
  if (!confirmed_first_name || !NAME_RE.test(confirmed_first_name.trim())) {
    return json({ error: "invalid_input" }, 400);
  }
  if (!confirmed_last_name || !NAME_RE.test(confirmed_last_name.trim())) {
    return json({ error: "invalid_input" }, 400);
  }
  if (!confirmed_email || !EMAIL_RE.test(confirmed_email.trim())) {
    return json({ error: "invalid_input" }, 400);
  }

  const attemptId = attempt_id.trim();
  const firstName = confirmed_first_name.trim();
  const lastName = confirmed_last_name.trim();
  const email = confirmed_email.trim().toLowerCase();

  // ── 2. Validate attempt state ──────────────────────────────────────────────
  const { data: attempt, error: selectErr } = await supabaseAdmin
    .from("onboarding_attempts")
    .select("id, state, expires_at, idme_subject, id_verification_level, verified_email")
    .eq("id", attemptId)
    .maybeSingle();

  if (selectErr) {
    console.error("onboarding_attempts select error:", selectErr);
    return json({ error: "server_error" }, 500);
  }

  if (!attempt) {
    return json({ error: "attempt_not_found" }, 404);
  }

  if (attempt.state === "linked") {
    return json({ error: "attempt_already_used" }, 409);
  }

  if (attempt.state === "account_creating") {
    // A concurrent request is mid-flight — do not proceed
    return json({ error: "attempt_already_claimed" }, 409);
  }

  if (attempt.state !== "id_verified") {
    return json({ error: "attempt_invalid_state" }, 400);
  }

  if (new Date(attempt.expires_at) < new Date()) {
    await supabaseAdmin
      .from("onboarding_attempts")
      .update({ state: "expired", updated_at: new Date().toISOString() })
      .eq("id", attemptId);
    return json({ error: "attempt_expired" }, 400);
  }

  // ── 3. Atomically claim the attempt ────────────────────────────────────────
  // Transitions id_verified → account_creating.
  // If 0 rows returned, a concurrent request just claimed it.
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from("onboarding_attempts")
    .update({
      state: "account_creating",
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("state", "id_verified")
    .select("id, idme_subject, id_verification_level, verified_email");

  if (claimErr) {
    console.error("Failed to claim attempt:", claimErr);
    return json({ error: "server_error" }, 500);
  }

  if (!claimed || claimed.length === 0) {
    return json({ error: "attempt_already_claimed" }, 409);
  }

  const claimedAttempt = claimed[0];

  // ── 4. Compare confirmed email to verified_email ───────────────────────────
  // If the nurse kept the ID.me email exactly: ID.me IAL2 already proved
  // ownership, so we auto-confirm. If the nurse edited it: require Supabase
  // to send a verification link before the new address is confirmed.
  const verifiedEmailNorm = (claimedAttempt.verified_email ?? "").trim().toLowerCase();
  const emailMatchesVerified = verifiedEmailNorm.length > 0 && email === verifiedEmailNorm;

  // ── 5. Check for existing profile with this ID.me subject ─────────────────
  // Final guard against duplicate accounts (backs up the unique index on
  // profiles.id_me_subject). Done after the atomic claim so only one
  // concurrent request can reach this point for the same attempt.
  if (claimedAttempt.idme_subject) {
    const { data: existingSubjectProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id_me_subject", claimedAttempt.idme_subject)
      .maybeSingle();

    if (existingSubjectProfile) {
      console.log("ID.me subject already linked to existing profile — blocking duplicate.");
      await resetAttempt(supabaseAdmin, attemptId);
      await writeAudit(supabaseAdmin, null, "identity.duplicate_account_attempt", {
        attempt_id: attemptId,
        error: "identity_already_registered",
      });
      return json({ error: "identity_already_registered", action: "sign_in" }, 409);
    }
  }

  // ── 6. Create Supabase Auth user ───────────────────────────────────────────
  const { data: authData, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: emailMatchesVerified,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (createUserErr) {
    // Use structured error code per Supabase Auth API
    const isDuplicate =
      (createUserErr as { code?: string }).code === "email_exists" ||
      createUserErr.message?.toLowerCase().includes("already registered");

    if (isDuplicate) {
      console.log("Email already exists in Supabase Auth — not revealing to client.");
      await resetAttempt(supabaseAdmin, attemptId);
      await writeAudit(supabaseAdmin, null, "identity.email_conflict_attempt", {
        attempt_id: attemptId,
        error: "email_conflict",
      });
      // Generic message — does not reveal whether the email exists
      return json({ error: "account_setup_failed", action: "contact_support" }, 409);
    }

    console.error("admin.createUser failed:", createUserErr);
    await resetAttempt(supabaseAdmin, attemptId);
    return json({ error: "account_setup_failed" }, 500);
  }

  const newUser = authData?.user;
  if (!newUser?.id) {
    console.error("admin.createUser returned no user");
    await resetAttempt(supabaseAdmin, attemptId);
    return json({ error: "account_setup_failed" }, 500);
  }

  // ── 7. Wait for handle_new_user() trigger to create the profile row ────────
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
    await supabaseAdmin.auth.admin.deleteUser(newUser.id).catch((e) =>
      console.error("deleteUser cleanup failed:", e),
    );
    await resetAttempt(supabaseAdmin, attemptId);
    return json({ error: "account_setup_failed" }, 500);
  }

  // ── 8. Update profile with verified identity fields ─────────────────────────
  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      id_verification_status: "verified",
      id_verification_level: claimedAttempt.id_verification_level,
      id_me_subject: claimedAttempt.idme_subject,
      onboarding_step: "license",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (updateErr) {
    console.error("Failed to update profile with verified fields:", updateErr);
    await supabaseAdmin.auth.admin.deleteUser(newUser.id).catch((e) =>
      console.error("deleteUser cleanup failed:", e),
    );
    await resetAttempt(supabaseAdmin, attemptId);
    return json({ error: "account_setup_failed" }, 500);
  }

  // ── 9. Link attempt to profile (recoverable — do not fail response) ─────────
  const { error: linkErr } = await supabaseAdmin
    .from("onboarding_attempts")
    .update({
      state: "linked",
      profile_id: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (linkErr) {
    // Account was created successfully. Log and continue — the profile is
    // correct. The attempt will be cleaned up by expiry or manual remediation.
    console.error("Failed to mark attempt linked (non-fatal — account created):", linkErr);
  }

  // ── 10. Audit (non-blocking) ───────────────────────────────────────────────
  writeAudit(supabaseAdmin, profileId, "identity.account_created", {
    id_verification_level: claimedAttempt.id_verification_level,
    email_auto_confirmed: emailMatchesVerified,
    onboarding_step: "license",
  });

  // ── 11. Generate session token for Lovable ─────────────────────────────────
  // Magic link token — Lovable calls supabase.auth.verifyOtp() to get a
  // session and proceed to /license-info.
  // Only issue a session if the email is confirmed (same as ID.me email).
  // If the nurse edited their email, they must verify first before getting a
  // session; Supabase will have sent a confirmation link to the new address.
  if (!emailMatchesVerified) {
    return json(
      {
        success: true,
        profile_id: profileId,
        email_confirmed: false,
        next: "verify_email",
      },
      200,
    );
  }

  const { data: linkData, error: linkGenErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkGenErr || !linkData?.properties?.hashed_token) {
    console.error("Failed to generate session link:", linkGenErr);
    // Account is created — return success without session token.
    return json(
      {
        success: true,
        profile_id: profileId,
        email_confirmed: true,
        session_token: null,
        fallback: "send_setup_email",
      },
      200,
    );
  }

  return json(
    {
      success: true,
      profile_id: profileId,
      email_confirmed: true,
      email,
      session_token: linkData.properties.hashed_token,
      session_token_type: "email",
    },
    200,
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resetAttempt(
  supabase: ReturnType<typeof createClient>,
  attemptId: string,
): Promise<void> {
  const { error } = await supabase
    .from("onboarding_attempts")
    .update({ state: "id_verified", updated_at: new Date().toISOString() })
    .eq("id", attemptId)
    .eq("state", "account_creating");
  if (error) console.error("Failed to reset attempt to id_verified:", error);
}

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
  const { error } = await supabase.from("audit_events").insert({
    actor_id: actorId,
    action,
    resource_type: actorId ? "profile" : "onboarding_attempt",
    resource_id: changeAfter.attempt_id ?? actorId,
    change_after: changeAfter,
  });
  if (error) console.error("audit_events write failed:", error);
}
