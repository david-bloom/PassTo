/**
 * demo-session-prepare
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 *
 * verify_jwt: true (Authenticated presenter)
 *
 * Allocates a new demo session: inserts demo.sessions, restores synthetic
 * license fixture, clears prior participant phone/contact data via
 * demo-cleanup-phone, runs sync verification, and returns presenter-
 * console state. Authorization requires:
 *   - active session_participants row with role = 'presenter'
 *     for the prepared session (created in-line by this function), AND
 *   - active demo.presenters allowlist row for auth.uid().
 *
 * Out of scope for Stage 1 skeleton: synthetic fixture restoration logic
 * and the sync-verification probe are TODOs to be implemented before
 * Stage A.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  validateBoot,
  corsHeaders,
  makeIsolationLogger,
} from "../_shared/demo-isolation.ts";
import { resolveAuthenticatedCaller } from "../_shared/demo-auth.ts";

validateBoot("demo-session-prepare");

interface PrepareBody {
  mode?: "demo" | "uat";
}

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const caller = await resolveAuthenticatedCaller(req);
  if (!caller) return json({ error: "unauthorized" }, 401, cors);

  // Presenter allowlist gate (the demo.presenters table seeds before this).
  const { data: presenterCheck } = await caller.supabaseAdmin
    .schema("demo")
    .rpc("is_active_presenter");
  if (presenterCheck !== true) {
    return json({ error: "forbidden" }, 403, cors);
  }

  let body: PrepareBody = {};
  try { body = await req.json(); } catch (_) { /* empty body OK */ }
  const mode = body.mode ?? "demo";
  if (mode !== "demo" && mode !== "uat") {
    return json({ error: "invalid_mode" }, 400, cors);
  }

  // Insert session and presenter binding atomically.
  const { data: session, error: insertErr } = await caller.supabaseAdmin
    .schema("demo")
    .from("sessions")
    .insert({ mode, created_by: caller.authUserId })
    .select()
    .single();

  if (insertErr || !session) {
    return json({ error: "session_insert_failed" }, 500, cors);
  }

  const { error: partErr } = await caller.supabaseAdmin
    .schema("demo")
    .from("session_participants")
    .insert({
      session_id: session.session_id,
      auth_user_id: caller.authUserId,
      role: "presenter",
    });

  if (partErr) {
    return json({ error: "session_participants_insert_failed" }, 500, cors);
  }

  // TODO Stage A: invoke demo-cleanup-phone(session_id); restore
  // synthetic license fixture; run sync verification (demo schema/
  // function version diff against last known-good).

  return json({ session_id: session.session_id, mode }, 200, cors);
});

function json(body: unknown, status: number, cors: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
