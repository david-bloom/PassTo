/**
 * demo-retention-report
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1
 * verify_jwt: false (Scheduled / service-role; invoked by Supabase cron
 * or by an authenticated presenter via an internal-secret header).
 *
 * Emits a weekly retention-drift report against the manual-attestation
 * model defined in TASK-0074 Cleanup Mechanics:
 *   - demo.recordings rows with state = 'raw' AND captured_at older than 30 days
 *   - demo.recordings rows with state = 'redacted' AND
 *     (attestation_at IS NULL OR attestation_at older than 12 months)
 *   - demo.selfie_access_tokens rows with consumed_at older than 90 days
 *     (operational audit window)
 *
 * Output is returned in the response and (Stage A) also delivered to
 * David and Codex via the configured notification channel.
 *
 * TODO Stage A:
 *   - cron schedule wired in supabase config
 *   - internal-secret guard for ad-hoc invocations
 *   - structured email/Slack delivery
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateBoot } from "../_shared/demo-isolation.ts";

validateBoot("demo-retention-report");

serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, supabaseKey, { db: { schema: "demo" } });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rawDrift } = await admin
    .from("recordings")
    .select("recording_id, session_id, captured_at, storage_location_label")
    .eq("state", "raw")
    .lt("captured_at", thirtyDaysAgo);

  const { data: redactedDrift } = await admin
    .from("recordings")
    .select("recording_id, session_id, redacted_at, attestation_at, storage_location_label")
    .eq("state", "redacted")
    .or(`attestation_at.is.null,attestation_at.lt.${twelveMonthsAgo}`);

  const { data: tokenDrift } = await admin
    .from("selfie_access_tokens")
    .select("token_hash, session_id, consumed_at")
    .lt("consumed_at", ninetyDaysAgo)
    .not("consumed_at", "is", null);

  const report = {
    generated_at: now.toISOString(),
    drift: {
      recordings_raw_over_30d: rawDrift ?? [],
      recordings_redacted_attestation_stale_or_over_12mo: redactedDrift ?? [],
      selfie_access_tokens_consumed_over_90d: tokenDrift ?? [],
    },
    drift_counts: {
      raw_over_30d: (rawDrift ?? []).length,
      redacted_stale: (redactedDrift ?? []).length,
      selfie_tokens_over_90d: (tokenDrift ?? []).length,
    },
  };

  return new Response(JSON.stringify(report), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
