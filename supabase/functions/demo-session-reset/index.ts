/**
 * demo-session-reset
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: true (Authenticated presenter)
 *
 * Per `Prepare New Demo` runbook step 5. Closes the active session and
 * preserves session-scoped audit history.
 *
 * TODO Stage A:
 *   - mark sessions.closed_at
 *   - revoke share + selfie tokens
 *   - close any active demo_verifier_sessions
 *   - invoke demo-cleanup-phone
 *   - write demo.audit_session_reset
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateBoot, corsHeaders } from "../_shared/demo-isolation.ts";
import { resolveAuthenticatedCaller, requireBinding } from "../_shared/demo-auth.ts";

validateBoot("demo-session-reset");

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const caller = await resolveAuthenticatedCaller(req);
  if (!caller) return json({ error: "unauthorized" }, 401, cors);

  const { session_id } = await req.json().catch(() => ({}));
  if (!session_id) return json({ error: "missing_session_id" }, 400, cors);

  const bound = await requireBinding(caller, session_id, "presenter");
  if (!bound) return json({ error: "forbidden" }, 403, cors);

  return json({ error: "not_implemented_stage_a" }, 501, cors);
});

function json(b: unknown, s: number, c: HeadersInit) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...c, "Content-Type": "application/json" } });
}
