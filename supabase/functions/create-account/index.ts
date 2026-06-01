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
 *     calling admin.createUser() — prevents concurrent account creation.
 *   - Compares confirmed_email to attempt.verified_email (case-insensitive).
 *     If unchanged, email_confirm = true (IAL2 proved ownership).
 *     If edited, email_confirm = false (Supabase sends verification link).
 *   - Profile first_name and last_name are set from attempt.verified_first_name
 *     and attempt.verified_last_name (ID.me trust source), NOT from browser
 *     input. Browser-submitted names are accepted for display only if they
 *     differ, but the ID.me-verified names are the identity anchor for
 *     downstream license matching (TASK-0046).
 *   - verified_phone from ID.me is NOT copied to profiles.phone — only
 *     phone-verify-otp may write that field.
 *   - On any pre-link failure, resets attempt to id_verified for retry.
 *   - Fails closed on attempt-link failure (returns explicit recovery state).
 *
 * TASK: TASK-0045 — P1 + P2 remediation
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
  let confirmed_email: string;

  try {
    const body = await req.json();
    attempt_id = body?.attempt_id;
    confirmed_email = body?.email;
  } catch {
    return json({ error: "invalid_input" }, 400);
  }

  if (!attempt_id || typeof attempt_id !== "string") {
    return json({ error: "invalid_input" }, 400);
  }
  if (!confirmed_email || !EMAIL_RE.test(confirmed_email.trim())) {
    return json({ error: "invalid_input" }, 400);
  }

  const attemptId = attempt_id.trim();
  const email = confirmed_email.trim().toLowerCase();

  // ── 2. Validate attempt state ──────────────────────────────────────────────
  const { data: attempt, error: selectErr } = await supabaseAdmin
    .from("onboarding_attempts")
    .select("id, state, expires_at, idme_subject, id_verification_level, verified_email, verified_first_name, verified_last_name")
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
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from("onboarding_attempts")
    .update({ state: "account_creating", updated_at: new Date().toISOString() })
    .eq("id", attemptId)
    .eq("state", "id_verified")
    .select("id, idme_subject, id_verification_level, verified_email, verified_first_name, verified_last_name");

  if (claimErr) {
    console.error("Failed to claim attempt:", claimErr);
    return json({ error: "server_error" }, 500);
  }
  if (!claimed || claimed.length === 0) {
    return json({ error: "attempt_already_claimed" }, 409);
  }

  const claimedAttempt = claimed[0];

  // ── 4. Resolve identity and email fields ───────────────────────────────────
  // ID.me-verified names are the trust anchor for license matching (TASK-0046).
  // Browser-submitted names from /confirm-info are ignored for identity fields.
  const verifiedFirstName = claimedAttempt.verified_first_name ?? null;
  const verifiedLastName  = claimedAttempt.verified_last_name  ?? null;
  const verifiedEmailNorm = (claimedAttempt.verified_email ?? "").trim().toLowerCase();
  const emailMatchesVerified = verifiedEmailNorm.length > 0 && email === verifiedEmailNorm;

  // ── 5. Check for existing profile with this ID.me subject ─────────────────
  if (claimedAttempt.idme_subject) {
    const { data: existingSubjectProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id_me_subject", claimedAttempt.idme_subject)
      .maybeSingle();

    if (existingSubjectProfile) {
      console.log("ID.me subject already linked — blocking duplicate.");
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
    user_metadata: {
      first_name: verifiedFirstName,
      last_name:  verifiedLastName,
    },
  });

  if (createUserErr) {
    const isDuplicate = (createUserErr as { code?: string }).code === "email_exists";
    if (isDuplicate) {
      console.log("Email already exists in Supabase Auth — not revealing to client.");
      await resetAttempt(supabaseAdmin, attemptId);
      await writeAudit(supabaseAdmin, null, "identity.email_conflict_attempt", {
        attempt_id: attemptId,
        error: "email_conflict",
      });
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

  // ── 8. Update profile with ID.me-verified identity fields ──────────────────
  // first_name and last_name are set from ID.me-verified values so they serve
  // as the identity anchor for TASK-0046 license name matching. If the nurse
  // edited their display name at /confirm-info, that is not stored here.
  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({
      first_name:              verifiedFirstName,
      last_name:               verifiedLastName,
      id_verification_status:  "verified",
      id_verification_level:   claimedAttempt.id_verification_level,
      id_me_subject:           claimedAttempt.idme_subject,
      onboarding_step:         "license",
      updated_at:              new Date().toISOString(),
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

  // ── 9. Link attempt to profile ─────────────────────────────────────────────
  // Fail closed: if this write fails, the attempt stays in account_creating.
  // Return an explicit recovery state so Lovable can prompt the nurse to retry
  // or contact support, rather than silently completing with a dangling attempt.
  const { error: linkErr } = await supabaseAdmin
    .from("onboarding_attempts")
    .update({
      state:      "linked",
      profile_id: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (linkErr) {
    console.error("Failed to mark attempt linked:", linkErr);
    // Account exists and is correct; attempt is stuck in account_creating.
    // Return explicit partial state so the client can handle recovery.
    return json(
      {
        success:       true,
        profile_id:    profileId,
        email_confirmed: emailMatchesVerified,
        warning:       "attempt_link_partial",
        action:        "contact_support_if_issue",
      },
      200,
    );
  }

  // ── 10. Audit (awaited — this is a trust-boundary record) ─────────────────
  await writeAudit(supabaseAdmin, profileId, "identity.account_created", {
    id_verification_level: claimedAttempt.id_verification_level,
    email_auto_confirmed:  emailMatchesVerified,
    onboarding_step:       "license",
  });

  // ── 11. Generate session token for Lovable ─────────────────────────────────
  // Only issue a token if email is confirmed. If the nurse edited their email,
  // Supabase sent a confirmation link; they must verify before getting a session.
  if (!emailMatchesVerified) {
    return json(
      {
        success:         true,
        profile_id:      profileId,
        email_confirmed: false,
        next:            "verify_email",
      },
      200,
    );
  }

  const { data: linkData, error: linkGenErr } = await supabaseAdmin.auth.admin.generateLink({
    type:  "magiclink",
    email,
  });

  if (linkGenErr || !linkData?.properties?.hashed_token) {
    console.error("Failed to generate session link:", linkGenErr);
    return json(
      {
        success:         true,
        profile_id:      profileId,
        email_confirmed: true,
        token_hash:      null,
        fallback:        "send_setup_email",
      },
      200,
    );
  }

  return json(
    {
      success:         true,
      profile_id:      profileId,
      email_confirmed: true,
      email,
      token_hash:      linkData.properties.hashed_token,
      token_type:      "email",
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
    headers: {
      ...corsHeaders,
      "Content-Type":  "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function writeAudit(
  supabase: ReturnType<typeof createClient>,
  actorId: string | null,
  action: string,
  changeAfter: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("audit_events").insert({
    actor_id:      actorId,
    action,
    resource_type: actorId ? "profile" : "onboarding_attempt",
    resource_id:   changeAfter.attempt_id ?? actorId,
    change_after:  changeAfter,
  });
  if (error) console.error("audit_events write failed:", error);
}
