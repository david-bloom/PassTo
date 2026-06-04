/**
 * seed-dev-test-personas.ts
 *
 * Dev-only seed harness for PassTo QA personas.
 *
 * TASK-0044 — David approved 2026-06-01
 *
 * Creates stable, repeatable test accounts for QA of the ID.me-first
 * onboarding flow and downstream credential/subscription states.
 *
 * Safety:
 *   - Hard-fails unless PASSTO_ALLOW_DEV_SEED=true is set.
 *   - Hard-fails unless SUPABASE_URL contains the approved dev project ref.
 *   - Defaults to --dry-run; requires --apply to write anything.
 *   - All seed accounts use the @passtodigital.test domain.
 *   - Cleanup only touches rows with the seed marker in Auth metadata.
 *   - Never connects to production. Never commits secrets.
 *
 * Usage:
 *   deno run --allow-env --allow-net scripts/seed-dev-test-personas.ts --list
 *   deno run --allow-env --allow-net scripts/seed-dev-test-personas.ts --apply
 *   deno run --allow-env --allow-net scripts/seed-dev-test-personas.ts --reset-seed-data
 *
 * Required env vars:
 *   SUPABASE_URL              — e.g. https://wvzjfxacykgsaffskgtr.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (never commit this)
 *   PASSTO_ALLOW_DEV_SEED     — must be "true"
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEV_PROJECT_REF = "wvzjfxacykgsaffskgtr";
const SEED_EMAIL_DOMAIN = "@passtodigital.test";
const SEED_METADATA_KEY = "passto_seed_persona";

// ── Persona definitions (ID.me-first flow order) ──────────────────────────────

interface PersonaDef {
  key: string;
  email: string;
  firstName: string;
  lastName: string;
  description: string;
  onboardingStep: string;
  accountStatus: string;
  idVerificationStatus?: string;
  idVerificationLevel?: string;
  idMeSubject?: string;
  phoneVerificationStatus?: string;
  seedLicense?: boolean;
  licenseNormalizedStatus?: string;
  licenseMatchPassed?: boolean;
  seedCredential?: boolean;
  credentialStatus?: string;
  seedSubscription?: boolean;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  blocked?: string;
  note?: string;
}

const PERSONAS: PersonaDef[] = [
  {
    key: "new-account",
    email: `new-account${SEED_EMAIL_DOMAIN}`,
    firstName: "Alex",
    lastName: "Seed",
    description: "Fresh account — not yet started ID.me",
    onboardingStep: "identity",
    accountStatus: "active",
    note: "Login → should route to /id-verification",
  },
  {
    key: "identity-linked",
    email: `identity-linked${SEED_EMAIL_DOMAIN}`,
    firstName: "Jordan",
    lastName: "Seed",
    description: "ID.me verified, contact confirmed — license pending",
    onboardingStep: "license",
    accountStatus: "active",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-identity-linked",
    note: "Login → should route to /license-info",
  },
  {
    key: "license-lookup-failed",
    email: `license-lookup-failed${SEED_EMAIL_DOMAIN}`,
    firstName: "Morgan",
    lastName: "Seed",
    description: "ID.me verified — license lookup failed/not found",
    onboardingStep: "license",
    accountStatus: "active",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-lookup-failed",
    seedLicense: true,
    licenseNormalizedStatus: "Unknown",
    licenseMatchPassed: false,
    note: "Login → should show license lookup failure path",
  },
  {
    key: "identity-license-mismatch",
    email: `identity-license-mismatch${SEED_EMAIL_DOMAIN}`,
    firstName: "Taylor",
    lastName: "Seed",
    description: "License found but identity/license data match failed",
    onboardingStep: "license",
    accountStatus: "active",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-mismatch",
    seedLicense: true,
    licenseNormalizedStatus: "Active",
    licenseMatchPassed: false,
    note: "Login → blocked at data-match gate",
  },
  {
    key: "phone-pending",
    email: `phone-pending${SEED_EMAIL_DOMAIN}`,
    firstName: "Casey",
    lastName: "Seed",
    description: "License matched — phone verification pending",
    onboardingStep: "phone",
    accountStatus: "active",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-phone-pending",
    seedLicense: true,
    licenseNormalizedStatus: "Active",
    licenseMatchPassed: true,
    note: "Login → should route to /phone-check",
  },
  {
    key: "plan-pending",
    email: `plan-pending${SEED_EMAIL_DOMAIN}`,
    firstName: "Riley",
    lastName: "Seed",
    description: "Phone verified — plan selection pending",
    onboardingStep: "plan",
    accountStatus: "active",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-plan-pending",
    phoneVerificationStatus: "verified",
    seedLicense: true,
    licenseNormalizedStatus: "Active",
    licenseMatchPassed: true,
    note: "Login → should route to /account-select",
  },
  {
    key: "payment-pending",
    email: `payment-pending${SEED_EMAIL_DOMAIN}`,
    firstName: "Casey",
    lastName: "Seed",
    description: "Plan selected (Standard) — payment pending",
    onboardingStep: "payment",
    accountStatus: "active",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-payment-pending",
    phoneVerificationStatus: "verified",
    seedLicense: true,
    licenseNormalizedStatus: "Active",
    licenseMatchPassed: true,
    seedSubscription: false,
    subscriptionPlan: "standard",
    note: "Login → should route to /payment for Stripe checkout test (TASK-0060)",
  },
  {
    key: "selfie-pending",
    email: `selfie-pending${SEED_EMAIL_DOMAIN}`,
    firstName: "Quinn",
    lastName: "Seed",
    description: "Free plan selected — selfie pending",
    onboardingStep: "selfie",
    accountStatus: "active",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-selfie-pending",
    phoneVerificationStatus: "verified",
    seedLicense: true,
    licenseNormalizedStatus: "Active",
    licenseMatchPassed: true,
    seedSubscription: true,
    subscriptionPlan: "free",
    subscriptionStatus: "active",
    note: "Login → should route to /upload-selfie",
  },
  {
    key: "pass-ready",
    email: `pass-ready${SEED_EMAIL_DOMAIN}`,
    firstName: "Avery",
    lastName: "Seed",
    description: "All trust gates passed — free tier — credential/pass ready",
    onboardingStep: "complete",
    accountStatus: "active",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-pass-ready",
    phoneVerificationStatus: "verified",
    seedLicense: true,
    licenseNormalizedStatus: "Active",
    licenseMatchPassed: true,
    seedCredential: true,
    credentialStatus: "active",
    seedSubscription: true,
    subscriptionPlan: "free",
    subscriptionStatus: "active",
    note: "Login → should reach /dashboard with active credential",
  },
  {
    key: "standard-tier",
    email: `standard-tier${SEED_EMAIL_DOMAIN}`,
    firstName: "Blake",
    lastName: "Seed",
    description: "Active Standard subscription — share/refresh entitled",
    onboardingStep: "complete",
    accountStatus: "active",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-standard",
    phoneVerificationStatus: "verified",
    seedLicense: true,
    licenseNormalizedStatus: "Active",
    licenseMatchPassed: true,
    seedCredential: true,
    credentialStatus: "active",
    seedSubscription: true,
    subscriptionPlan: "standard",
    subscriptionStatus: "active",
    note: "Login → dashboard with share action allowed (Standard)",
  },
  {
    key: "premier-tier",
    email: `premier-tier${SEED_EMAIL_DOMAIN}`,
    firstName: "Drew",
    lastName: "Seed",
    description: "Active Premier subscription — all entitlements",
    onboardingStep: "complete",
    accountStatus: "active",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-premier",
    phoneVerificationStatus: "verified",
    seedLicense: true,
    licenseNormalizedStatus: "Active",
    licenseMatchPassed: true,
    seedCredential: true,
    credentialStatus: "active",
    seedSubscription: true,
    subscriptionPlan: "premier",
    subscriptionStatus: "active",
    note: "Login → dashboard with all Premier entitlements",
  },
  {
    key: "expired-license",
    email: `expired-license${SEED_EMAIL_DOMAIN}`,
    firstName: "Jamie",
    lastName: "Seed",
    description: "Active account — license expired",
    onboardingStep: "complete",
    accountStatus: "active",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-expired",
    phoneVerificationStatus: "verified",
    seedLicense: true,
    licenseNormalizedStatus: "Expired",
    licenseMatchPassed: true,
    seedCredential: true,
    credentialStatus: "expired",
    seedSubscription: true,
    subscriptionPlan: "standard",
    subscriptionStatus: "active",
    note: "Login → dashboard should show expired state and refresh prompt",
  },
  {
    key: "suspended",
    email: `suspended${SEED_EMAIL_DOMAIN}`,
    firstName: "Sam",
    lastName: "Seed",
    description: "Suspended account — all sensitive actions blocked",
    onboardingStep: "complete",
    accountStatus: "suspended",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-suspended",
    phoneVerificationStatus: "verified",
    seedLicense: true,
    licenseNormalizedStatus: "Active",
    licenseMatchPassed: true,
    seedCredential: true,
    credentialStatus: "suspended",
    note: "Login → account-status enforcement should block all actions",
  },
  {
    key: "closed",
    email: `closed${SEED_EMAIL_DOMAIN}`,
    firstName: "Parker",
    lastName: "Seed",
    description: "Closed account — no access",
    onboardingStep: "complete",
    accountStatus: "closed",
    idVerificationStatus: "verified",
    idVerificationLevel: "IAL2",
    idMeSubject: "seed-idme-subject-closed",
    phoneVerificationStatus: "verified",
    note: "Auth may succeed but all product actions blocked",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function col(text: string, width: number): string {
  return text.slice(0, width).padEnd(width);
}

function printPersonaTable(personas: PersonaDef[]): void {
  const header = `${col("Key", 28)} ${col("Email", 42)} ${col("Step", 12)} ${col("Status", 12)} Note`;
  console.log("\n" + header);
  console.log("─".repeat(header.length + 20));
  for (const p of personas) {
    console.log(
      `${col(p.key, 28)} ${col(p.email, 42)} ${col(p.onboardingStep, 12)} ${col(p.accountStatus, 12)} ${p.note ?? ""}`,
    );
  }
  console.log();
}

// ── Safety guards ─────────────────────────────────────────────────────────────

function assertDevEnvironment(): void {
  const allow = Deno.env.get("PASSTO_ALLOW_DEV_SEED");
  if (allow !== "true") {
    console.error("❌  PASSTO_ALLOW_DEV_SEED must be set to 'true' to run this script.");
    console.error("    This guard prevents accidental execution in non-dev environments.");
    Deno.exit(1);
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  if (!url.includes(DEV_PROJECT_REF)) {
    console.error(`❌  SUPABASE_URL does not contain the expected dev project ref: ${DEV_PROJECT_REF}`);
    console.error(`    Detected URL: ${url}`);
    console.error("    This script refuses to run against any other project.");
    Deno.exit(1);
  }

  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!key) {
    console.error("❌  SUPABASE_SERVICE_ROLE_KEY is not set.");
    Deno.exit(1);
  }

  // Refuse if any production-signal env vars are set
  const prodSignals = ["PRODUCTION", "PROD_SUPABASE", "STRIPE_LIVE"];
  for (const sig of prodSignals) {
    if (Deno.env.get(sig)) {
      console.error(`❌  Production signal env var detected: ${sig}. Refusing to run.`);
      Deno.exit(1);
    }
  }
}

// ── Seed operations ───────────────────────────────────────────────────────────

interface SeedResult {
  email: string;
  key: string;
  authUserId: string | null;
  profileId: string | null;
  magicLink: string | null;
  skipped: boolean;
  errors: string[];
}

async function seedPersona(
  supabase: ReturnType<typeof createClient>,
  persona: PersonaDef,
  dryRun: boolean,
): Promise<SeedResult> {
  const result: SeedResult = {
    email: persona.email,
    key: persona.key,
    authUserId: null,
    profileId: null,
    magicLink: null,
    skipped: false,
    errors: [],
  };

  if (dryRun) {
    console.log(`  [dry-run] Would seed: ${persona.key} <${persona.email}>`);
    return result;
  }

  // Check if this seed user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = existingUsers?.users?.find((u) => u.email === persona.email);

  let authUserId: string;

  if (existing) {
    authUserId = existing.id;
    console.log(`  ↩  ${persona.key}: auth user exists (${authUserId.slice(0, 8)}…), skipping creation`);
    result.skipped = true;
  } else {
    // Create Auth user (email pre-confirmed; dev-only)
    const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
      email: persona.email,
      email_confirm: true,
      app_metadata: {
        [SEED_METADATA_KEY]: persona.key,
      },
      user_metadata: {
        first_name: persona.firstName,
        last_name: persona.lastName,
        [SEED_METADATA_KEY]: persona.key,
      },
    });

    if (createErr || !authData?.user?.id) {
      result.errors.push(`createUser failed: ${createErr?.message ?? "no user returned"}`);
      return result;
    }

    authUserId = authData.user.id;
    console.log(`  ✅ ${persona.key}: auth user created (${authUserId.slice(0, 8)}…)`);
  }

  result.authUserId = authUserId;

  // Wait for handle_new_user() trigger to create the profile
  let profileId: string | null = null;
  for (let i = 0; i < 5; i++) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (profile?.id) {
      profileId = profile.id;
      break;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  if (!profileId) {
    result.errors.push("profiles row not found after createUser — trigger may not have fired");
    return result;
  }

  result.profileId = profileId;

  // Update profile with seed state
  const profileUpdate: Record<string, unknown> = {
    first_name: persona.firstName,
    last_name: persona.lastName,
    onboarding_step: persona.onboardingStep,
    account_status: persona.accountStatus,
    updated_at: new Date().toISOString(),
  };

  if (persona.idVerificationStatus) {
    profileUpdate.id_verification_status = persona.idVerificationStatus;
  }
  if (persona.idVerificationLevel) {
    profileUpdate.id_verification_level = persona.idVerificationLevel;
  }
  if (persona.idMeSubject) {
    // Use persona-key suffix to ensure uniqueness across seed runs on same project
    profileUpdate.id_me_subject = persona.idMeSubject;
  }
  if (persona.phoneVerificationStatus) {
    profileUpdate.phone_verification_status = persona.phoneVerificationStatus;
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", profileId);

  if (profileErr) {
    result.errors.push(`profile update failed: ${profileErr.message}`);
  } else {
    console.log(`     profile updated: step=${persona.onboardingStep} status=${persona.accountStatus}`);
  }

  // Seed license (fake data)
  if (persona.seedLicense) {
    const seedLicenseNumber = `SEED-${persona.key.toUpperCase().slice(0, 8)}-RN`;
    const { data: existingLic } = await supabase
      .from("licenses")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!existingLic) {
      const licenseRow: Record<string, unknown> = {
        profile_id: profileId,
        license_number: seedLicenseNumber,
        license_state: "NY",
        license_type: "RN",
        source_status_raw: `FAKE-SEED-${persona.licenseNormalizedStatus?.toUpperCase()}`,
        source_status_display: persona.licenseNormalizedStatus,
        normalized_status: persona.licenseNormalizedStatus ?? "Active",
        status_intent: persona.licenseNormalizedStatus === "Active" ? "valid" : "invalid",
        wallet_pass_treatment:
          persona.licenseNormalizedStatus === "Active" ? "valid"
          : persona.licenseNormalizedStatus === "Expired" ? "invalid"
          : "do_not_issue",
        status_checked_at: new Date().toISOString(),
        license_data_match_passed: persona.licenseMatchPassed ?? false,
      };

      const { error: licErr } = await supabase.from("licenses").insert(licenseRow);
      if (licErr) {
        result.errors.push(`license insert failed: ${licErr.message}`);
      } else {
        console.log(`     license seeded: ${seedLicenseNumber} (${persona.licenseNormalizedStatus})`);
      }
    } else {
      console.log(`     license already exists — skipping`);
    }
  }

  // Seed credential (fake/simulated)
  if (persona.seedCredential) {
    const { data: existingCred } = await supabase
      .from("credentials")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!existingCred) {
      const { error: credErr } = await supabase.from("credentials").insert({
        profile_id: profileId,
        status: persona.credentialStatus ?? "active",
        credential_type: "nurse_license",
        issued_at: new Date().toISOString(),
      });
      if (credErr) {
        result.errors.push(`credential insert failed: ${credErr.message}`);
      } else {
        console.log(`     credential seeded: status=${persona.credentialStatus}`);
      }
    } else {
      console.log(`     credential already exists — skipping`);
    }
  }

  // Seed subscription
  if (persona.seedSubscription && persona.subscriptionPlan) {
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!existingSub) {
      const { error: subErr } = await supabase.from("subscriptions").insert({
        profile_id: profileId,
        plan_name: persona.subscriptionPlan,
        status: persona.subscriptionStatus ?? "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (subErr) {
        result.errors.push(`subscription insert failed: ${subErr.message}`);
      } else {
        console.log(`     subscription seeded: plan=${persona.subscriptionPlan}`);
      }
    } else {
      console.log(`     subscription already exists — skipping`);
    }
  }

  // Generate a magic-link for David to log in (displayed once, never stored)
  if (!result.skipped) {
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: persona.email,
    });
    result.magicLink = linkData?.properties?.action_link ?? null;
  }

  return result;
}

// ── Reset: delete only seed-marked rows ──────────────────────────────────────

async function resetSeedData(
  supabase: ReturnType<typeof createClient>,
  dryRun: boolean,
): Promise<void> {
  console.log(dryRun ? "\n[dry-run] Would delete seed users:" : "\nDeleting seed users...");

  const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const seedUsers = allUsers?.users?.filter(
    (u) => u.email?.endsWith(SEED_EMAIL_DOMAIN) ||
      u.app_metadata?.[SEED_METADATA_KEY],
  ) ?? [];

  if (seedUsers.length === 0) {
    console.log("  No seed users found.");
    return;
  }

  for (const user of seedUsers) {
    if (dryRun) {
      console.log(`  [dry-run] Would delete: ${user.email} (${user.id.slice(0, 8)}…)`);
      continue;
    }

    // Cascade: profile rows and related data should be cleaned up by DB cascade
    // or handle_user_delete trigger. Only delete the Auth user.
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`  ❌ Failed to delete ${user.email}: ${error.message}`);
    } else {
      console.log(`  ✅ Deleted: ${user.email}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = Deno.args;
  const isList = args.includes("--list");
  const isApply = args.includes("--apply");
  const isReset = args.includes("--reset-seed-data");
  const dryRun = !isApply && !isReset;

  console.log("PassTo Dev Seed Harness");
  console.log("=======================");

  if (isList) {
    printPersonaTable(PERSONAS);
    console.log("Run with --apply to seed, --reset-seed-data to clean up.");
    return;
  }

  // Safety checks (always, even for --dry-run)
  assertDevEnvironment();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  if (dryRun) {
    console.log("\n⚠️  DRY-RUN MODE — no changes will be made. Pass --apply to write.\n");
  }

  if (isReset) {
    await resetSeedData(supabase, dryRun);
    return;
  }

  // Seed personas
  console.log(`\nSeeding ${PERSONAS.length} personas...`);
  const results: SeedResult[] = [];

  for (const persona of PERSONAS) {
    console.log(`\n→ ${persona.key} (${persona.description})`);
    const result = await seedPersona(supabase, persona, dryRun);
    results.push(result);
  }

  if (dryRun) {
    console.log("\n⚠️  DRY-RUN complete. No changes made. Run with --apply to seed.\n");
    return;
  }

  // Print summary table
  console.log("\n\n═══ SEED SUMMARY ═══\n");
  console.log(
    `${"KEY".padEnd(28)} ${"EMAIL".padEnd(42)} ${"PROFILE".padEnd(10)} STATUS`,
  );
  console.log("─".repeat(100));

  const loginLinks: Array<{ key: string; email: string; link: string }> = [];

  for (const r of results) {
    const status = r.errors.length > 0 ? `⚠️  ${r.errors[0]}` : (r.skipped ? "skipped (existing)" : "✅ seeded");
    console.log(
      `${r.key.padEnd(28)} ${r.email.padEnd(42)} ${(r.profileId?.slice(0, 8) ?? "none").padEnd(10)} ${status}`,
    );
    if (r.magicLink) {
      loginLinks.push({ key: r.key, email: r.email, link: r.magicLink });
    }
  }

  if (loginLinks.length > 0) {
    console.log("\n\n═══ ONE-TIME LOGIN LINKS (valid ~60 min, display only) ═══\n");
    console.log("Copy these to a local notepad. They are not stored anywhere.\n");
    for (const { key, email, link } of loginLinks) {
      console.log(`${key.padEnd(28)} ${email}`);
      console.log(`${"".padEnd(28)} ${link}`);
      console.log();
    }
    console.log("For existing personas (skipped): use supabase.auth.admin.generateLink() to get a fresh link.");
  }

  const errorCount = results.filter((r) => r.errors.length > 0).length;
  if (errorCount > 0) {
    console.log(`\n⚠️  ${errorCount} persona(s) had errors. Review output above.`);
    console.log("Some errors may be expected if not all tables exist yet (credential, subscription).");
  } else {
    console.log("\n✅ All personas seeded successfully.");
  }

  console.log("\nTo reset seed data: deno run --allow-env --allow-net scripts/seed-dev-test-personas.ts --reset-seed-data");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  Deno.exit(1);
});
