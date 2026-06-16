/**
 * demo-env-guard.ts
 *
 * TASK-0074 — Fail-closed environment guard for all demo Edge Functions.
 *
 * Call assertDemoEnvironment() at module top-level (cold start) in every
 * demo-only Edge Function. If the function is accidentally deployed to the
 * production Supabase project, it returns 503 before processing any request.
 *
 * Guards against:
 *   - Production Supabase project URL (wvzjfxacykgsaffskgtr)
 *   - Production Apple pass type identifier
 *
 * The Apple pass type guard uses the APPLE_DEMO_PASS_TYPE_ID env var:
 * if it is unset, demo wallet functions reject with 503. This prevents
 * the demo pass from accidentally using the production pass type.
 */

const PRODUCTION_PROJECT_REF = "wvzjfxacykgsaffskgtr";

export function assertDemoEnvironment(): void {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  if (url.includes(PRODUCTION_PROJECT_REF)) {
    console.error(
      "demo.environment_guard_tripped: production Supabase project URL detected in demo function. " +
      "This function must only run in the demo/UAT Supabase project."
    );
    throw new Error("demo.environment_guard_tripped");
  }
}

export function assertDemoWalletEnvironment(): void {
  assertDemoEnvironment();
  const demoPassTypeId = Deno.env.get("APPLE_DEMO_PASS_TYPE_ID") ?? "";
  if (!demoPassTypeId) {
    console.error(
      "demo.environment_guard_tripped: APPLE_DEMO_PASS_TYPE_ID is not set. " +
      "Demo wallet functions require a separate demo pass type ID."
    );
    throw new Error("demo.environment_guard_tripped");
  }
}
