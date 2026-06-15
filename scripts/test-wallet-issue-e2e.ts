/**
 * test-wallet-issue-e2e.ts
 *
 * TASK-0072 P1 #2 remediation evidence — authenticated end-to-end test of
 * the wallet issuance orchestration path:
 *
 *   1. Sign in the disposable test nurse via admin-generated magic link.
 *   2. Call credential-create with the authenticated user JWT so
 *      pass_template_data is populated through the production path.
 *   3. Call wallet-issue with the same JWT to exercise the full Apple +
 *      Google orchestration, durable wallet_passes writes, audit events,
 *      and credential activation.
 *   4. Read back credentials, wallet_passes, audit_events for evidence.
 *
 * Safety:
 *   - Hard-fails unless SUPABASE_URL contains the approved dev project ref.
 *   - Hard-fails unless PASSTO_ALLOW_DEV_E2E=true is set.
 *   - Only operates on the seeded @passtodigital.test test users.
 *   - Never commits secrets. Reads SUPABASE_SERVICE_ROLE_KEY and the
 *     Supabase anon key from environment.
 *
 * Usage:
 *   export SUPABASE_URL=https://wvzjfxacykgsaffskgtr.supabase.co
 *   export SUPABASE_ANON_KEY=<sb_publishable_*>
 *   export SUPABASE_SERVICE_ROLE_KEY=<sb_secret_*>
 *   export PASSTO_ALLOW_DEV_E2E=true
 *   deno run --allow-env --allow-net scripts/test-wallet-issue-e2e.ts pass-ready
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEV_PROJECT_REF = "wvzjfxacykgsaffskgtr";
const SEED_EMAIL_DOMAIN = "@passtodigital.test";

const supabaseUrl  = Deno.env.get("SUPABASE_URL")             ?? "";
const anonKey      = Deno.env.get("SUPABASE_ANON_KEY")        ?? "";
const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowE2E     = Deno.env.get("PASSTO_ALLOW_DEV_E2E")     === "true";

if (!supabaseUrl.includes(DEV_PROJECT_REF)) {
  console.error(`Refusing to run: SUPABASE_URL does not target dev project ${DEV_PROJECT_REF}`);
  Deno.exit(2);
}
if (!anonKey || !serviceKey) {
  console.error("Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY");
  Deno.exit(2);
}
if (!allowE2E) {
  console.error("Set PASSTO_ALLOW_DEV_E2E=true to confirm this is a dev test run");
  Deno.exit(2);
}

const personaKey = Deno.args[0] ?? "pass-ready";
const email      = `${personaKey}${SEED_EMAIL_DOMAIN}`;

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`\n=== E2E wallet-issue test for ${email} ===\n`);

// ── 1. Generate magic link and exchange for a real user session ──────────────

console.log("Step 1: Generate magic link via admin API...");
const linkRes = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
});

if (linkRes.error || !linkRes.data) {
  console.error("generateLink failed:", linkRes.error?.message);
  Deno.exit(3);
}

const tokenHash = (linkRes.data.properties as { hashed_token?: string } | undefined)?.hashed_token;
if (!tokenHash) {
  console.error("generateLink response missing properties.hashed_token");
  console.error(JSON.stringify(linkRes.data, null, 2));
  Deno.exit(3);
}
console.log(`  token_hash acquired: ${tokenHash.slice(0, 10)}…`);

console.log("Step 2: Exchange token_hash for session via verifyOtp...");
const userClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const verifyRes = await userClient.auth.verifyOtp({
  token_hash: tokenHash,
  type: "magiclink",
});

if (verifyRes.error || !verifyRes.data.session) {
  console.error("verifyOtp failed:", verifyRes.error?.message);
  Deno.exit(3);
}

const accessToken = verifyRes.data.session.access_token;
const userId      = verifyRes.data.user!.id;
console.log(`  signed in as auth_user_id=${userId}`);
console.log(`  access_token: ${accessToken.slice(0, 24)}…`);

// ── 2. Lookup profile_id for read-back queries ──────────────────────────────

const { data: profile } = await admin
  .from("profiles")
  .select("id, onboarding_step, account_status")
  .eq("auth_user_id", userId)
  .maybeSingle();

if (!profile) {
  console.error("profile not found for auth_user_id; persona may not be seeded");
  Deno.exit(3);
}
console.log(`  profile.id=${profile.id} onboarding_step=${profile.onboarding_step} status=${profile.account_status}`);

// ── 3. Pre-test cleanup: remove any prior credential/wallet rows for this
//        profile so we get a clean E2E orchestration trace. We only touch
//        rows belonging to this seeded test profile.

console.log("\nStep 3: Clean up prior wallet_passes + credential rows for this test profile…");
const { data: priorCredentials } = await admin
  .from("credentials")
  .select("id")
  .eq("profile_id", profile.id);
const priorIds = (priorCredentials ?? []).map((c) => c.id);
if (priorIds.length > 0) {
  await admin.from("wallet_passes").delete().in("credential_id", priorIds);
  await admin.from("credentials").delete().in("id", priorIds);
  console.log(`  deleted ${priorIds.length} prior credential(s) and their wallet_passes rows`);
} else {
  console.log("  no prior credentials to clean");
}

// Ensure profile is on the 'pass' step for credential-create to accept it.
await admin.from("profiles").update({ onboarding_step: "pass" }).eq("id", profile.id);

// ── 4. Call credential-create with authenticated JWT ─────────────────────────

console.log("\nStep 4: Call credential-create…");
const ccRes = await fetch(`${supabaseUrl}/functions/v1/credential-create`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type":  "application/json",
  },
  body: JSON.stringify({}),
});
const ccBody = await ccRes.json();
console.log(`  HTTP ${ccRes.status}`);
console.log(`  body: ${JSON.stringify(ccBody)}`);

// ── 5. Call wallet-issue with the same authenticated JWT ─────────────────────

console.log("\nStep 5: Call wallet-issue…");
const wiRes = await fetch(`${supabaseUrl}/functions/v1/wallet-issue`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type":  "application/json",
  },
  body: JSON.stringify({}),
});
const wiBody = await wiRes.json();
console.log(`  HTTP ${wiRes.status}`);
console.log(`  body: ${JSON.stringify(wiBody)}`);

// ── 6. Read back evidence ────────────────────────────────────────────────────

console.log("\nStep 6: Read back evidence…");

const { data: credentials } = await admin
  .from("credentials")
  .select("id, status, issued_at, pass_template_data")
  .eq("profile_id", profile.id);
console.log("\ncredentials:");
for (const c of credentials ?? []) {
  console.log(`  id=${c.id} status=${c.status} issued_at=${c.issued_at}`);
  console.log(`  pass_template_data keys: ${c.pass_template_data ? Object.keys(c.pass_template_data).join(", ") : "<null>"}`);
}

if ((credentials ?? []).length > 0) {
  const credId = credentials![0].id;
  const { data: passes } = await admin
    .from("wallet_passes")
    .select("provider, status, pass_url, external_pass_id, provider_response")
    .eq("credential_id", credId);
  console.log("\nwallet_passes:");
  for (const p of passes ?? []) {
    console.log(`  provider=${p.provider} status=${p.status}`);
    if (p.pass_url)         console.log(`    pass_url: ${String(p.pass_url).slice(0, 80)}…`);
    if (p.external_pass_id) console.log(`    external_pass_id: ${String(p.external_pass_id).slice(0, 80)}…`);
    if (p.provider_response) console.log(`    provider_response: ${JSON.stringify(p.provider_response)}`);
  }

  const { data: audits } = await admin
    .from("audit_events")
    .select("action, created_at, change_after")
    .eq("resource_id", credId)
    .order("created_at", { ascending: true });
  console.log("\naudit_events:");
  for (const a of audits ?? []) {
    console.log(`  ${a.created_at}  ${a.action}  ${JSON.stringify(a.change_after)}`);
  }
}

// ── 7. Sign out cleanup ──────────────────────────────────────────────────────

await userClient.auth.signOut();
console.log("\n=== Done ===\n");
