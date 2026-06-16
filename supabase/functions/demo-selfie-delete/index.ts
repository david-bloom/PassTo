/**
 * demo-selfie-delete
 *
 * TASK-0074 Phase 4 — Demo Session Management
 *
 * verify_jwt: true
 * CORS: https://demo.passtodigital.com
 *
 * Deletes Avery Demo's selfie from Supabase Storage at participant request.
 * Called from the presenter console. Clears selfie_storage_path and
 * selfie_captured_at from the profile.
 *
 * Input:  { demo_session_id: string }
 * Output: { success: true, selfie_deleted: true }
 *         { success: true, selfie_deleted: false, reason: 'no_selfie' }
 *
 * Audit: demo.selfie_deleted
 *
 * TASK: TASK-0074
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertDemoEnvironment } from "../_shared/demo-env-guard.ts";

assertDemoEnvironment();

const corsHeaders = {
  "Access-Control-Allow-Origin":  "https://demo.passtodigital.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")   return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")              ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")         ?? "";
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabaseAuth  = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  let body: { demo_session_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const { demo_session_id } = body;
  if (!demo_session_id) return json({ error: "demo_session_id_required" }, 400);

  // Validate demo session
  const { data: session } = await supabaseAdmin
    .from("demo_sessions")
    .select("id")
    .eq("demo_session_id", demo_session_id)
    .maybeSingle();

  if (!session) return json({ error: "invalid_demo_session" }, 400);

  // Load Avery Demo profile
  const { data: persona } = await supabaseAdmin
    .from("demo_personas")
    .select("auth_user_id")
    .eq("persona_key", "avery_demo")
    .maybeSingle();

  if (!persona?.auth_user_id) return json({ error: "avery_demo_not_configured" }, 503);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, selfie_storage_path")
    .eq("auth_user_id", persona.auth_user_id)
    .maybeSingle();

  if (!profile) return json({ error: "avery_demo_profile_not_found" }, 404);

  if (!profile.selfie_storage_path) {
    return json({ success: true, selfie_deleted: false, reason: "no_selfie" });
  }

  const now = new Date().toISOString();

  // Audit before deletion (fail-closed) — do not log the storage path
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id:      profile.id,
    action:        "demo.selfie_deleted",
    resource_type: "profile",
    resource_id:   profile.id,
    change_after:  { demo_session_id, synthetic: true },
  });
  if (auditErr) {
    console.error("demo-selfie-delete: audit write failed:", auditErr.message);
    return json({ error: "server_error" }, 500);
  }

  // Delete from Supabase Storage (selfies bucket)
  const { error: storageErr } = await supabaseAdmin.storage
    .from("selfies")
    .remove([profile.selfie_storage_path]);

  if (storageErr) {
    // Log without the path
    console.error("demo-selfie-delete: storage delete failed:", storageErr.message);
    return json({ error: "storage_delete_failed" }, 500);
  }

  // Clear profile columns
  await supabaseAdmin
    .from("profiles")
    .update({
      selfie_storage_path: null,
      selfie_captured_at:  null,
      updated_at:          now,
    })
    .eq("id", profile.id);

  return json({ success: true, selfie_deleted: true });
});
