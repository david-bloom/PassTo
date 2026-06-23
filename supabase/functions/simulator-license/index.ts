/**
 * simulator-license
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: true (Authenticated participant)
 *
 * Accepts any reasonable alphanumeric license number, echoes it into a
 * synthetic Active - Simulated record, and labels the result synthetic.
 * Reserved sentinel values may produce deterministic failure scenarios
 * for engineering testing only; not used in moderated cohort sessions.
 *
 * TODO Stage A:
 *   - body schema: { session_id, license_state, license_type, license_number }
 *   - normalize license_number
 *   - if sentinel value → deterministic failure path
 *   - else → return { status: 'Active - Simulated', number, state, type }
 *   - write demo.audit_simulator (simulator='license')
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateBoot, corsHeaders, assertOriginAllowed } from "../_shared/demo-isolation.ts";
import { resolveAuthenticatedCaller, requireBinding } from "../_shared/demo-auth.ts";

validateBoot("simulator-license");

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const reject = await assertOriginAllowed(req, { endpoint: "simulator-license" });
  if (reject) return reject;

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
