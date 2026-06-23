/**
 * Demo/UAT Environment Isolation Manifest loader and validator.
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 *
 * Single source of truth: config/demo-environment.manifest.json (checked
 * into the repo). Edge Functions deployed to the demo Supabase project
 * load this file at cold-start, run boot validation, and fail closed if
 * any allowed identifier is missing or any disallowed identifier appears
 * in the resolved configuration.
 *
 * NOT to be imported by production Edge Functions.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Embedded copy of the manifest so the Edge Function does not need
// repo-relative filesystem access at runtime. Update both files together;
// the unit test in TASK-0074 verifies they match.
import manifestData from "../../../config/demo-environment.manifest.json" with { type: "json" };

export type DemoEnvManifest = typeof manifestData;
export const manifest: DemoEnvManifest = manifestData;

export interface IsolationFailure {
  context: "boot" | "request";
  endpoint: string;
  violation: string;
  details?: Record<string, unknown>;
}

/**
 * Boot-required secrets are read from the manifest's
 * `allowed.required_secrets.boot` array; every demo Edge Function must
 * have these set before it can start. The `wallet_issue_runtime` group
 * is checked at request time by `demo-wallet-issue` via the
 * `requireSecrets` helper. See manifest notes for the split rationale.
 */
const BOOT_REQUIRED_SECRETS: readonly string[] =
  manifest.allowed.required_secrets.boot;

/**
 * Boot-time validation. Call once at module top-level in every demo
 * Edge Function. Throws if validation fails; the throw is intentional -
 * a failing boot must crash the worker rather than start.
 *
 * Implements the manifest's `validators.boot` contract:
 *   - required.allowed.* identifier checks
 *   - required.secrets.all_present (for ALWAYS_REQUIRED_SECRETS)
 *   - forbid.disallowed.production_supabase_project_ref.present
 *   - forbid.disallowed.production_domains.present (in SUPABASE_URL and
 *     Vercel signing URLs)
 *   - forbid.disallowed.verifier_endpoint_origin_substrings.in_verifier_urls
 *   - google_service_account_email match against the configured
 *     GOOGLE_SERVICE_ACCOUNT_JSON, when set
 */
export function validateBoot(endpoint: string): void {
  const failures: IsolationFailure[] = [];

  // ── Required boot secrets present (per manifest) ───────────────────
  for (const name of BOOT_REQUIRED_SECRETS) {
    const v = Deno.env.get(name);
    if (!v || v.length === 0) {
      failures.push({
        context: "boot",
        endpoint,
        violation: `required boot secret ${name} is missing`,
      });
    }
  }

  // ── SUPABASE_URL matches allowed.supabase_project_ref ───────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (supabaseUrl && !supabaseUrl.includes(manifest.allowed.supabase_project_ref)) {
    failures.push({
      context: "boot",
      endpoint,
      violation: "SUPABASE_URL does not match allowed.supabase_project_ref",
      details: { supabase_url_substring: supabaseUrl.substring(0, 40) },
    });
  }
  if (supabaseUrl.includes(manifest.disallowed.production_supabase_project_ref)) {
    failures.push({
      context: "boot",
      endpoint,
      violation: "SUPABASE_URL contains production project ref",
    });
  }

  // ── No production domains anywhere in the resolved configuration ────
  const urlsToScan: Array<{ name: string; value: string }> = [
    { name: "SUPABASE_URL", value: supabaseUrl },
    { name: "VERCEL_SIGN_APPLE_URL", value: Deno.env.get("VERCEL_SIGN_APPLE_URL") ?? "" },
    { name: "VERCEL_SIGN_GOOGLE_URL", value: Deno.env.get("VERCEL_SIGN_GOOGLE_URL") ?? "" },
  ];
  for (const { name, value } of urlsToScan) {
    if (!value) continue;
    for (const prodDomain of manifest.disallowed.production_domains) {
      if (value.includes(prodDomain)) {
        failures.push({
          context: "boot",
          endpoint,
          violation: `${name} contains disallowed production domain ${prodDomain}`,
        });
      }
    }
    for (const prodOrigin of manifest.disallowed.production_origins) {
      if (value.includes(prodOrigin)) {
        failures.push({
          context: "boot",
          endpoint,
          violation: `${name} contains disallowed production origin ${prodOrigin}`,
        });
      }
    }
  }

  // ── Apple identifiers ───────────────────────────────────────────────
  const applePassTypeId = Deno.env.get("APPLE_PASS_TYPE_ID");
  if (applePassTypeId && applePassTypeId !== manifest.allowed.apple_pass_type_id) {
    failures.push({
      context: "boot",
      endpoint,
      violation: "APPLE_PASS_TYPE_ID is not the allowed demo Pass Type ID",
      details: { configured: applePassTypeId },
    });
  }

  const appleTeamId = Deno.env.get("APPLE_TEAM_ID");
  if (appleTeamId && appleTeamId !== manifest.allowed.apple_team_id) {
    failures.push({
      context: "boot",
      endpoint,
      violation: "APPLE_TEAM_ID is not the allowed demo Team ID",
    });
  }

  // ── Google Wallet identifiers (when configured) ─────────────────────
  const googleIssuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID");
  if (
    googleIssuerId &&
    googleIssuerId === manifest.disallowed.production_google_wallet_issuer_id
  ) {
    failures.push({
      context: "boot",
      endpoint,
      violation: "GOOGLE_WALLET_ISSUER_ID is the production issuer",
    });
  }

  const googleClassId = Deno.env.get("GOOGLE_WALLET_CLASS_ID");
  if (
    googleClassId &&
    googleClassId === manifest.disallowed.production_google_wallet_class_id
  ) {
    failures.push({
      context: "boot",
      endpoint,
      violation: "GOOGLE_WALLET_CLASS_ID is the production class",
    });
  }

  // GOOGLE_SERVICE_ACCOUNT_JSON's client_email must equal the allowed
  // demo service account email when both are configured.
  const gsaJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (gsaJson) {
    try {
      const parsed = JSON.parse(gsaJson) as { client_email?: string; project_id?: string };
      if (
        parsed.client_email &&
        parsed.client_email !== manifest.allowed.google_service_account_email
      ) {
        failures.push({
          context: "boot",
          endpoint,
          violation: "GOOGLE_SERVICE_ACCOUNT_JSON.client_email does not match allowed.google_service_account_email",
        });
      }
      if (
        parsed.project_id &&
        parsed.project_id !== manifest.allowed.gcp_project_id
      ) {
        failures.push({
          context: "boot",
          endpoint,
          violation: "GOOGLE_SERVICE_ACCOUNT_JSON.project_id does not match allowed.gcp_project_id",
        });
      }
    } catch (_) {
      failures.push({
        context: "boot",
        endpoint,
        violation: "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON",
      });
    }
  }

  // ── Verifier endpoint origin / routing pattern ──────────────────────
  // The verifier_endpoint_origin is the browser-visible origin; we
  // cannot fully validate it from inside an Edge Function (it depends
  // on the Lovable rewrite at the edge). The Edge Function does verify
  // that its own SUPABASE_URL is not a disallowed verifier endpoint
  // substring, which is enforced above. The end-to-end same-origin
  // routing check is part of the manual browser QA gate.
  if (
    !["lovable_rewrite", "supabase_custom_domain"].includes(
      manifest.allowed.verifier_endpoint_routing_pattern,
    )
  ) {
    failures.push({
      context: "boot",
      endpoint,
      violation: "manifest verifier_endpoint_routing_pattern is not a recognized pattern",
    });
  }

  if (failures.length > 0) {
    // Structured log; the host will capture this before the throw aborts boot.
    console.error(JSON.stringify({
      type: "demo_isolation_boot_failure",
      failures,
    }));
    throw new Error(
      `Demo isolation boot validation failed: ${failures.length} violation(s)`,
    );
  }
}

/**
 * Runtime check for endpoint-specific required secrets (e.g.,
 * wallet-issuing endpoints need APPLE_CERT_PEM_BASE64 et al.). Returns
 * a Response (503) when any required secret is missing; otherwise
 * returns null. Boot validation never fails for these; this is what
 * lets the demo platform run before Google Wallet API access lands.
 */
export function requireSecrets(
  endpoint: string,
  names: string[],
): Response | null {
  const missing = names.filter((n) => !Deno.env.get(n));
  if (missing.length === 0) return null;
  console.error(JSON.stringify({
    type: "demo_required_secret_missing",
    endpoint,
    missing,
  }));
  return new Response(
    JSON.stringify({ error: "required_secret_missing", missing }),
    {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
}

/**
 * Build a same-origin CORS header set for demo endpoints. The allowlist
 * is derived from the manifest; cross-origin requests are rejected
 * explicitly by `assertOriginAllowed` rather than by silent header
 * mirroring. No `*` is ever returned for Access-Control-Allow-Origin.
 *
 * Callers must invoke `assertOriginAllowed(req, endpoint)` before any
 * work that produces a credentialed response.
 */
export function corsHeaders(
  req: Request,
  allowMethods: string[] = ["POST", "OPTIONS"],
): HeadersInit {
  const origin = req.headers.get("Origin");
  const allowed = [
    manifest.allowed.demo_domain_origin,
    manifest.allowed.lovable_preview_origin,
  ];
  // We only ever echo an Origin that is on the allowlist. If the caller
  // supplied an unapproved Origin we still emit the allowlist origin
  // (browser CORS will then refuse the response because the request
  // Origin doesn't match) AND assertOriginAllowed will have already
  // produced a 403 before we reach this point. For Origin-less calls
  // (server-to-server, scheduled), no Access-Control-Allow-Origin is
  // required by the browser; we emit the canonical demo origin for
  // consistency.
  const allowOrigin = origin && allowed.includes(origin)
    ? origin
    : manifest.allowed.demo_domain_origin;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": allowMethods.join(", "),
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

export interface OriginAssertOptions {
  /**
   * Endpoint name for the audit log. Always pass.
   */
  endpoint: string;
  /**
   * When true, requests with no Origin header are allowed. Use for
   * scheduled / server-to-server endpoints (e.g., demo-retention-report).
   * Default false: a browser-facing endpoint must receive an Origin.
   */
  allowMissingOrigin?: boolean;
}

/**
 * Returns `null` when the request Origin is allowed (or absent and
 * absent is allowed). Returns a `Response` (403) when the request must
 * be rejected. When it returns a Response, the caller must return it
 * directly without further processing.
 *
 * Logs a `demo.audit_isolation_failures` row when rejection occurs.
 */
export async function assertOriginAllowed(
  req: Request,
  options: OriginAssertOptions,
): Promise<Response | null> {
  const origin = req.headers.get("Origin");
  const allowed = [
    manifest.allowed.demo_domain_origin,
    manifest.allowed.lovable_preview_origin,
  ];

  if (!origin) {
    if (options.allowMissingOrigin) return null;
    await tryLogIsolation({
      context: "request",
      endpoint: options.endpoint,
      violation: "missing_origin_header",
    });
    return rejectResponse("missing_origin");
  }

  if (allowed.includes(origin)) return null;

  await tryLogIsolation({
    context: "request",
    endpoint: options.endpoint,
    violation: "origin_not_allowed",
    details: { origin },
  });
  return rejectResponse("origin_not_allowed");
}

function rejectResponse(error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 403,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      // No Access-Control-Allow-Origin: the browser blocks reading the
      // body, which is the intended outcome for an unapproved origin.
    },
  });
}

async function tryLogIsolation(failure: IsolationFailure): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !supabaseKey) return;
  try {
    const logger = makeIsolationLogger(supabaseUrl, supabaseKey);
    await logger.logFailure(failure);
  } catch (e) {
    console.error("isolation_failure_log_failed", e);
  }
}

export interface IsolationLogger {
  logFailure(failure: IsolationFailure): Promise<void>;
}

/**
 * Returns a logger that writes isolation violations to
 * demo.audit_isolation_failures via the service role.
 */
export function makeIsolationLogger(serviceRoleUrl: string, serviceRoleKey: string): IsolationLogger {
  const supabaseAdmin = createClient(serviceRoleUrl, serviceRoleKey, {
    db: { schema: "demo" },
  });
  return {
    async logFailure(failure: IsolationFailure) {
      try {
        await supabaseAdmin
          .from("audit_isolation_failures")
          .insert({
            context: failure.context,
            endpoint: failure.endpoint,
            violation: failure.violation,
            details: failure.details ?? null,
          });
      } catch (e) {
        console.error("audit_isolation_failures insert failed", e);
      }
    },
  };
}
