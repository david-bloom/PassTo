/**
 * demo-cleanup-phone
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: true (Authenticated presenter OR scheduled service-role)
 *
 * Clears participant phone/contact data at session close. Invocable from
 * the presenter console and as a scheduled job. Manual SQL is not part
 * of normal operation per TASK-0073 CR2-0073-05.
 *
 * TODO Stage A:
 *   - body: { session_id? }   // omit for scheduled bulk cleanup
 *   - if scheduled call (no JWT): require WALLET_INTERNAL_SECRET-style
 *     internal-secret header; otherwise presenter binding for the given
 *     session_id
 *   - clear demo.sessions.participant_phone_id, presenter_phone_id, and
 *     any other phone-shaped columns
 *   - mark demo.audit_otp rows with cleared_at = now() (audit retention
 *     keeps the row; only the phone value is cleared)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateBoot, corsHeaders, assertOriginAllowed } from "../_shared/demo-isolation.ts";
import { resolveAuthenticatedCaller, requireBinding } from "../_shared/demo-auth.ts";

validateBoot("demo-cleanup-phone");

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // demo-cleanup-phone is invocable from the presenter console (browser)
  // and as a scheduled service-role call (no Origin). Allow Origin-less.
  const reject = await assertOriginAllowed(req, { endpoint: "demo-cleanup-phone", allowMissingOrigin: true });
  if (reject) return reject;

  const caller = await resolveAuthenticatedCaller(req);
  if (!caller) return json({ error: "unauthorized" }, 401, cors);

  const { session_id } = await req.json().catch(() => ({}));
  if (session_id) {
    const bound = await requireBinding(caller, session_id, "presenter");
    if (!bound) return json({ error: "forbidden" }, 403, cors);
  }

  return json({ error: "not_implemented_stage_a" }, 501, cors);
});

function json(b: unknown, s: number, c: HeadersInit) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...c, "Content-Type": "application/json" } });
}
