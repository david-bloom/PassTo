/**
 * demo-share-create
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: true (Authenticated participant)
 *
 * Issues a one-time share token recorded in demo.share_tokens with
 * mode/environment scoping. The raw token is returned to the participant
 * exactly once; only the sha256 hash is persisted. The token is later
 * consumed by demo-verifier-view, which atomically marks first_used_at
 * and mints the verifier session.
 *
 * Default share-token TTL: 24 hours (consistent with production share
 * link semantics; refined in TASK-0074 Stage A based on UAT findings).
 *
 * TODO Stage A:
 *   - body: { session_id, ttl_seconds? }
 *   - participant binding check
 *   - generateOpaqueToken + hashToken; insert into demo.share_tokens
 *   - audit_share_create row
 *   - return { share_url, expires_at } where share_url is
 *     https://demo.passtodigital.com/v/<raw_token>
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateBoot, corsHeaders, assertOriginAllowed, manifest } from "../_shared/demo-isolation.ts";
import { resolveAuthenticatedCaller, requireBinding, generateOpaqueToken, hashToken } from "../_shared/demo-auth.ts";

validateBoot("demo-share-create");

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const reject = await assertOriginAllowed(req, { endpoint: "demo-share-create" });
  if (reject) return reject;

  const caller = await resolveAuthenticatedCaller(req);
  if (!caller) return json({ error: "unauthorized" }, 401, cors);

  const { session_id, ttl_seconds } = await req.json().catch(() => ({}));
  if (!session_id) return json({ error: "missing_session_id" }, 400, cors);

  const bound = await requireBinding(caller, session_id, "participant");
  if (!bound) return json({ error: "forbidden" }, 403, cors);

  const ttl = Math.max(60, Math.min(ttl_seconds ?? DEFAULT_TTL_SECONDS, 7 * 24 * 60 * 60));
  const rawToken = generateOpaqueToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const { error: insertErr } = await caller.supabaseAdmin
    .schema("demo")
    .from("share_tokens")
    .insert({
      token_hash: tokenHash,
      session_id,
      expires_at: expiresAt,
    });

  if (insertErr) return json({ error: "share_token_insert_failed" }, 500, cors);

  await caller.supabaseAdmin
    .schema("demo")
    .from("audit_share_create")
    .insert({
      session_id,
      share_token_hash: tokenHash,
      expires_at: expiresAt,
    });

  const shareUrl = `${manifest.allowed.demo_domain_origin}/v/${rawToken}`;
  return json({ share_url: shareUrl, expires_at: expiresAt }, 200, cors);
});

function json(b: unknown, s: number, c: HeadersInit) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...c, "Content-Type": "application/json" } });
}
