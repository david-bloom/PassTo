/**
 * demo-presenter-grant
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: true (Authenticated presenter - service-role wrapper)
 *
 * Adds an auth_user_id to demo.presenters. Initial seed of the presenter
 * allowlist is performed by Supabase admin SQL out-of-band (David's
 * auth_user_id). After that, granting additional presenters is gated on
 * an existing active presenter (demo.is_active_presenter()).
 *
 * TODO Stage A:
 *   - validate the target auth_user_id exists in auth.users
 *   - insert into demo.presenters (granted_by = caller)
 *   - audit_role_changes is written by the trigger
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateBoot, corsHeaders } from "../_shared/demo-isolation.ts";
import { resolveAuthenticatedCaller } from "../_shared/demo-auth.ts";

validateBoot("demo-presenter-grant");

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const caller = await resolveAuthenticatedCaller(req);
  if (!caller) return json({ error: "unauthorized" }, 401, cors);

  const { data: ok } = await caller.supabaseAdmin
    .schema("demo")
    .rpc("is_active_presenter");
  if (ok !== true) return json({ error: "forbidden" }, 403, cors);

  return json({ error: "not_implemented_stage_a" }, 501, cors);
});

function json(b: unknown, s: number, c: HeadersInit) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...c, "Content-Type": "application/json" } });
}
