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
 * Boot-time validation. Call once at module top-level in every demo
 * Edge Function. Throws if validation fails; the throw is intentional —
 * a failing boot must crash the worker rather than start.
 */
export function validateBoot(endpoint: string): void {
  const failures: IsolationFailure[] = [];

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!supabaseUrl.includes(manifest.allowed.supabase_project_ref)) {
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

  for (const prodOrigin of manifest.disallowed.production_origins) {
    if (supabaseUrl.includes(prodOrigin)) {
      failures.push({
        context: "boot",
        endpoint,
        violation: `SUPABASE_URL contains disallowed production origin ${prodOrigin}`,
      });
    }
  }

  // Apple Pass Type ID must match the demo identifier exactly.
  const applePassTypeId = Deno.env.get("APPLE_PASS_TYPE_ID");
  if (applePassTypeId && applePassTypeId !== manifest.allowed.apple_pass_type_id) {
    failures.push({
      context: "boot",
      endpoint,
      violation: "APPLE_PASS_TYPE_ID is not the allowed demo Pass Type ID",
      details: { configured: applePassTypeId },
    });
  }

  // Apple Team ID matches the allowed value (shared with production by design).
  const appleTeamId = Deno.env.get("APPLE_TEAM_ID");
  if (appleTeamId && appleTeamId !== manifest.allowed.apple_team_id) {
    failures.push({
      context: "boot",
      endpoint,
      violation: "APPLE_TEAM_ID is not the allowed demo Team ID",
    });
  }

  // Google Wallet issuer ID, when configured, must not equal the
  // production issuer ID. Null/undefined is acceptable (Google approval
  // still pending) — wallet-issue paths refuse to operate while null.
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

  // Google Wallet class ID, when configured, must use the demo suffix.
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

  if (failures.length > 0) {
    // Structured log; the host will capture this before the throw aborts boot.
    console.error(JSON.stringify({
      type: "demo_isolation_boot_failure",
      failures,
    }));
    throw new Error(
      `Demo isolation boot validation failed: ${failures.length} violation(s)`
    );
  }
}

/**
 * Build a same-origin CORS header set for demo verifier endpoints. The
 * allowlist is derived from the manifest; cross-origin requests are
 * rejected by absence (no `*` ever).
 */
export function corsHeaders(req: Request, allowMethods: string[] = ["POST", "OPTIONS"]): HeadersInit {
  const origin = req.headers.get("Origin");
  const allowed = [
    manifest.allowed.demo_domain_origin,
    manifest.allowed.lovable_preview_origin,
  ];
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": allowMethods.join(", "),
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
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
