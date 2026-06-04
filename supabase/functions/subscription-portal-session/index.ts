/**
 * subscription-portal-session
 *
 * TASK-0061 — Subscription Management and Cancellation Flow
 *
 * verify_jwt: true
 *
 * Called by Lovable from /dashboard when the nurse clicks "Manage Subscription".
 *
 * Gate chain:
 *   1. Auth — JWT via supabaseAuth; service-role for Stripe API call
 *   2. Profile — active account only
 *   3. Stripe customer — must exist and be linked to profile
 *   4. Stripe session creation — calls Stripe Customer Portal API
 *
 * Response:
 *   - 302 redirect to portal URL, or
 *   - { url: "https://billing.stripe.com/..." } (if Lovable prefers fetch over redirect)
 *
 * Security:
 *   - Never expose Stripe secret, API key, or internal IDs
 *   - Service-role only; Lovable cannot access Stripe API directly
 *   - Portal URL is Stripe-managed and short-lived
 *
 * TASK: TASK-0061
 * Codex QA: required before production use
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://app.passtodigital.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_CLIENT_SECRET") ?? "";

  if (!stripeKey) {
    console.error("subscription-portal-session: STRIPE_CLIENT_SECRET not configured");
    return json({ error: "payment_unavailable" }, 503);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) {
    return json({ error: "unauthorized" }, 401);
  }

  // ── 2. Load profile + gate ─────────────────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, account_status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return json({ error: "profile_not_found" }, 404);
  }

  if (profile.account_status !== "active") {
    return json({ error: "account_not_active" }, 403);
  }

  // ── 3. Load Stripe customer ────────────────────────────────────────────────
  const { data: stripeCust, error: custErr } = await supabaseAdmin
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (custErr) {
    console.error("subscription-portal-session: stripe_customers read failed:", custErr.message);
    return json({ error: "backend_read_error" }, 503);
  }
  if (!stripeCust) {
    return json({ error: "stripe_customer_not_found" }, 404);
  }

  // ── 4. Create portal session via Stripe ────────────────────────────────────
  let portalUrl: string;
  try {
    const portalRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: stripeCust.stripe_customer_id,
        return_url: "https://app.passtodigital.com/dashboard",
      }).toString(),
    });

    if (!portalRes.ok) {
      const errBody = await portalRes.text().catch(() => "(unreadable)");
      console.error("subscription-portal-session: Stripe portal creation failed:", portalRes.status, errBody);
      return json({ error: "payment_unavailable" }, 503);
    }

    const session = await portalRes.json();
    portalUrl = session.url;

    if (!portalUrl) {
      console.error("subscription-portal-session: Stripe session missing url:", JSON.stringify(session));
      return json({ error: "payment_unavailable" }, 503);
    }
  } catch (e) {
    console.error("subscription-portal-session: Stripe API call threw:", (e as Error).message);
    return json({ error: "payment_unavailable" }, 503);
  }

  // ── 5. Audit ───────────────────────────────────────────────────────────────
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id: profile.id,
    action: "subscription.portal_session_created",
    resource_type: "stripe_session",
    resource_id: null,
    change_after: {
      customer_id: stripeCust.stripe_customer_id,
      return_url: "https://app.passtodigital.com/dashboard",
    },
  });

  if (auditErr) {
    console.error("subscription-portal-session: audit insert failed:", auditErr.message);
    // Best-effort audit; do not fail the request
  }

  // ── 6. Return portal URL ───────────────────────────────────────────────────
  return json({ url: portalUrl }, 200);
});
