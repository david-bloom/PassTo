/**
 * demo-selfie-upload
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: true (Authenticated participant)
 *
 * Validates session binding and consent flags; writes the selfie object
 * to the demo-selfies storage bucket with required metadata. Records
 * demo.audit_selfie_capture.
 *
 * TODO Stage A:
 *   - body: { session_id, consent_flags, mime, image_bytes_base64 }
 *   - require consent_flags.recording = true, consent_flags.selfie = true
 *   - reject if image_bytes exceed size limit
 *   - upload to storage with metadata { environment: 'demo_uat', mode, session_id, captured_at }
 *   - write demo.audit_selfie_capture
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateBoot, corsHeaders, assertOriginAllowed } from "../_shared/demo-isolation.ts";
import { resolveAuthenticatedCaller, requireBinding } from "../_shared/demo-auth.ts";

validateBoot("demo-selfie-upload");

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const reject = await assertOriginAllowed(req, { endpoint: "demo-selfie-upload" });
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
