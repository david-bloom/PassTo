/**
 * demo-wallet-issue
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: true (Authenticated participant)
 *
 * Mirrors production wallet-issue but signs with the demo Apple/Google
 * identifiers and writes to demo.audit_wallet_issue. Enforces unique
 * souvenir serial/object IDs per session. Boot validation refuses to
 * operate if GOOGLE_WALLET_ISSUER_ID is still null (Google approval
 * pending).
 *
 * TODO Stage A:
 *   - body: { session_id, providers: ['apple_wallet', 'google_wallet'] }
 *   - load demo entitlement; refuse if absent or 'do_not_issue'
 *   - call Vercel sign-apple and sign-google with demo env vars
 *   - persist demo wallet pass identifiers (table TBD; not in
 *     migration_demo_001_baseline; will be added when wallet flow
 *     lands in Stage A)
 *   - audit_wallet_issue rows for each provider
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateBoot, corsHeaders, assertOriginAllowed, requireSecrets, manifest } from "../_shared/demo-isolation.ts";
import { resolveAuthenticatedCaller, requireBinding } from "../_shared/demo-auth.ts";

validateBoot("demo-wallet-issue");

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const reject = await assertOriginAllowed(req, { endpoint: "demo-wallet-issue" });
  if (reject) return reject;

  // CR2-S1-04: actually enforce the manifest's
  // wallet_issue_runtime secret list at request time. Missing any
  // returns 503 so the endpoint fails closed until the wallet stack
  // is fully provisioned. This is the canonical handling of the
  // Stage 1 -> Stage A transition window during which Google Wallet
  // API access is still being approved.
  const secretMissing = requireSecrets(
    "demo-wallet-issue",
    manifest.allowed.required_secrets.wallet_issue_runtime,
  );
  if (secretMissing) return secretMissing;

  const caller = await resolveAuthenticatedCaller(req);
  if (!caller) return json({ error: "unauthorized" }, 401, cors);

  const { session_id } = await req.json().catch(() => ({}));
  if (!session_id) return json({ error: "missing_session_id" }, 400, cors);

  const bound = await requireBinding(caller, session_id, "participant");
  if (!bound) return json({ error: "forbidden" }, 403, cors);

  return json({ error: "not_implemented_stage_a" }, 501, cors);
});

function json(b: unknown, s: number, c: HeadersInit) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...c, "Content-Type": "application/json" } });
}
