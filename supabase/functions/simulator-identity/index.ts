/**
 * simulator-identity
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: true (Authenticated participant)
 *
 * Returns a deterministic simulated_success identity result tied to
 * session_id AFTER the participant or presenter has recorded the
 * acknowledgment event. Refuses to return a result without
 * acknowledgment.
 *
 * Never imitates ID.me branding. Inputs, outputs, and the acknowledgment
 * event are written to demo.audit_simulator so the evidence package can
 * show simulation provenance.
 *
 * TODO Stage A:
 *   - body schema: { session_id, acknowledgment_event_id }
 *   - verify acknowledgment_event_id exists in demo.audit_simulator with
 *     simulator='identity' and acknowledged_at IS NOT NULL
 *   - return { result: 'simulated_success', subject: 'Avery Demo', ial: 2 }
 *   - write audit_simulator row with input/output
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateBoot, corsHeaders } from "../_shared/demo-isolation.ts";
import { resolveAuthenticatedCaller, requireBinding } from "../_shared/demo-auth.ts";

validateBoot("simulator-identity");

interface SimulatorBody {
  session_id?: string;
  acknowledgment_event_id?: string;
}

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const caller = await resolveAuthenticatedCaller(req);
  if (!caller) return json({ error: "unauthorized" }, 401, cors);

  const body: SimulatorBody = await req.json().catch(() => ({} as SimulatorBody));
  if (!body.session_id) return json({ error: "missing_session_id" }, 400, cors);

  const bound = await requireBinding(caller, body.session_id, "participant");
  if (!bound) return json({ error: "forbidden" }, 403, cors);

  if (!body.acknowledgment_event_id) {
    return json({ error: "acknowledgment_required" }, 412, cors);
  }

  // TODO Stage A: verify acknowledgment_event_id is a valid prior
  // event of (simulator='identity', session_id=body.session_id), then
  // write the simulated-success audit row and return the result.

  return json({ error: "not_implemented_stage_a" }, 501, cors);
});

function json(b: unknown, s: number, c: HeadersInit) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...c, "Content-Type": "application/json" } });
}
