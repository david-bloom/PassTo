/**
 * Demo/UAT shared authorization helpers.
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 *
 * Authenticated functions: resolve auth.uid() via the user's JWT and
 * additionally verify the demo.session_participants binding (and
 * demo.presenters allowlist for presenter-only endpoints).
 *
 * Public-token functions: caller presents a token; this module exposes
 * helpers for the hash-and-lookup primitives.
 */

// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * The demo Edge Functions create supabase-js clients with
 * `db: { schema: "demo" }`. The resulting client type is
 * `SupabaseClient<any, "public", "demo", any, any>` — the third generic
 * carries the schema option. Declaring the interface fields with the
 * default `SupabaseClient` (which resolves to schema "public") would
 * fail `deno check`. We use `DemoSupabaseClient` for both authenticated
 * and service-role clients in this module.
 */
export type DemoSupabaseClient = SupabaseClient<any, "public", "demo", any, any>;

export type AuthRole = "participant" | "presenter";

export interface AuthenticatedCaller {
  authUserId: string;
  supabaseAuth: DemoSupabaseClient;
  supabaseAdmin: DemoSupabaseClient;
}

export interface BoundCaller extends AuthenticatedCaller {
  sessionId: string;
  role: AuthRole;
}

/**
 * Resolve auth.uid() from the Authorization header. Returns null if no
 * header is present or the JWT is invalid.
 */
export async function resolveAuthenticatedCaller(
  req: Request,
): Promise<AuthenticatedCaller | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
    db: { schema: "demo" },
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    db: { schema: "demo" },
  });

  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return null;

  return {
    authUserId: user.id,
    supabaseAuth,
    supabaseAdmin,
  };
}

/**
 * Verify the caller is bound to a demo session in the given role.
 * `participant` requires only an active session_participants row.
 * `presenter` requires both an active session_participants row AND
 * an active demo.presenters allowlist row.
 *
 * Returns null if the binding does not exist or is revoked.
 */
export async function requireBinding(
  caller: AuthenticatedCaller,
  sessionId: string,
  role: AuthRole,
): Promise<BoundCaller | null> {
  const fn =
    role === "participant"
      ? "is_active_participant"
      : "is_active_presenter_for";

  const { data, error } = await caller.supabaseAdmin
    .schema("demo")
    .rpc(fn, { p_session_id: sessionId });

  if (error || data !== true) return null;

  return { ...caller, sessionId, role };
}

/**
 * Hash a raw token for ledger storage / lookup. Uses SHA-256 and
 * returns the Postgres bytea hex literal form (`\\x` followed by
 * lowercase hex) so it can be inserted into and queried against a
 * bytea column via supabase-js / PostgREST without ambiguity.
 *
 * Raw tokens MUST NOT be persisted; only the hash is stored.
 *
 * Use this representation everywhere a token hash crosses the
 * function/database boundary: `demo.share_tokens.token_hash`,
 * `demo.selfie_access_tokens.token_hash`, and any audit row that
 * carries a token hash. The Stage 1 integration test inserts a
 * token row and looks it up by hash to prove the round trip.
 */
export async function hashToken(rawToken: string): Promise<string> {
  const bytes = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToByteaHex(new Uint8Array(digest));
}

/**
 * Encode a Uint8Array as a Postgres bytea hex literal.
 *   bytesToByteaHex(new Uint8Array([0xde, 0xad])) === '\\xdead'
 */
export function bytesToByteaHex(bytes: Uint8Array): string {
  let hex = "\\x";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/**
 * Generate an opaque random token (32 random bytes, base64url encoded).
 * Used for both share tokens and selfie access tokens.
 */
export function generateOpaqueToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
}

function base64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * HMAC-SHA256 helper used by the verifier-session cookie contract.
 * Returns base64url-encoded MAC.
 */
export async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return base64urlEncode(new Uint8Array(sig));
}

/**
 * Constant-time string comparison.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
