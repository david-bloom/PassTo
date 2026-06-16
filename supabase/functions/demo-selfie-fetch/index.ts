/**
 * demo-selfie-fetch
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: true (Authenticated participant) - nurse-app path
 *
 * Implements the nurse-app half of the Selfie Short-TTL Delivery Contract:
 * single round trip, streaming proxy. Inserts a demo_selfie_access_tokens
 * row with caller_context='nurse_app', verifier_session_id=NULL,
 * consumed_at=now() BEFORE streaming the image bytes from Supabase
 * storage. The storage URL is never returned to the client.
 *
 * Token expires_at = issued_at + 60s. Replay forensics intact via the
 * ledger.
 *
 * TODO Stage A:
 *   - body / query: session_id
 *   - validate participant binding
 *   - look up the active selfie for the demo session
 *   - if not found → return safe-display { status: 'selfie_not_provided' }
 *   - else → generate opaque token, insert ledger row with consumed_at=now(),
 *     stream image bytes from storage via service role, return
 *     Cache-Control: no-store + Content-Disposition: inline
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateBoot, corsHeaders } from "../_shared/demo-isolation.ts";
import { resolveAuthenticatedCaller, requireBinding, generateOpaqueToken, hashToken } from "../_shared/demo-auth.ts";

validateBoot("demo-selfie-fetch");

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const caller = await resolveAuthenticatedCaller(req);
  if (!caller) return json({ error: "unauthorized" }, 401, cors);

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return json({ error: "missing_session_id" }, 400, cors);

  const bound = await requireBinding(caller, sessionId, "participant");
  if (!bound) return json({ error: "forbidden" }, 403, cors);

  // TODO Stage A: streaming-proxy implementation per the contract.
  // Skeleton path placeholder — return not_implemented until Stage A.
  const token = generateOpaqueToken();
  const _tokenHash = await hashToken(token);

  return json({ error: "not_implemented_stage_a" }, 501, cors);
});

function json(b: unknown, s: number, c: HeadersInit) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...c, "Content-Type": "application/json" } });
}
