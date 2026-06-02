/**
 * stripe-checkout-create
 *
 * TASK-0040 — Implement Stripe Subscription State and Entitlement Gating
 *
 * verify_jwt: true
 *
 * Called by Lovable from /payment to create a Stripe Checkout Session.
 * Returns a checkout_url the nurse is redirected to for payment.
 *
 * Gate: onboarding_step = 'payment', account active, subscription_tier != 'free'.
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY          — Stripe secret API key (test mode for MVP)
 *   STRIPE_PRICE_ID_STANDARD   — Stripe Price ID for Standard monthly plan
 *   STRIPE_PRICE_ID_PREMIER    — Stripe Price ID for Premier monthly plan
 *
 * The checkout session uses metadata.profile_id so the webhook can link
 * the payment to the correct Supabase profile.
 *
 * Stripe secrets are never exposed to Lovable — only the session URL is returned.
 * Payment confirmation comes from the webhook, not the Stripe return URL.
 *
 * TASK: TASK-0040
 * Codex QA: required before production use
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://enroll.passtodigital.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STRIPE_API = "https://api.stripe.com/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeKey    = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY not configured");
    return json({ error: "payment_unavailable" }, 503);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  // ── 2. Load and validate profile gate ─────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, onboarding_step, account_status, subscription_tier, email, stripe_customer_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);
  if (profile.account_status !== "active")   return json({ error: "account_not_active" }, 403);
  if (profile.onboarding_step !== "payment") return json({ error: "invalid_onboarding_step", onboarding_step: profile.onboarding_step }, 403);
  if (profile.subscription_tier === "free")  return json({ error: "free_plan_no_payment" }, 403);

  // Guard: if already has an active subscription, don't create another checkout
  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("id, status")
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (existingSub) {
    return json({ error: "subscription_already_active" }, 409);
  }

  // ── 3. Resolve Stripe Price ID ─────────────────────────────────────────────
  const priceEnvKey = profile.subscription_tier === "premier"
    ? "STRIPE_PRICE_ID_PREMIER"
    : "STRIPE_PRICE_ID_STANDARD";
  const priceId = Deno.env.get(priceEnvKey) ?? "";

  if (!priceId) {
    console.error(`${priceEnvKey} not configured`);
    return json({ error: "payment_unavailable" }, 503);
  }

  // ── 4. Create Stripe Checkout Session ─────────────────────────────────────
  const params = new URLSearchParams({
    "mode":                                    "subscription",
    "line_items[0][price]":                    priceId,
    "line_items[0][quantity]":                 "1",
    // Checkout Session metadata (available on checkout.session.completed)
    "metadata[profile_id]":                    profile.id,
    "metadata[plan_name]":                     profile.subscription_tier,
    // subscription_data.metadata propagates to the Subscription object,
    // making profile_id available on customer.subscription.* events.
    "subscription_data[metadata][profile_id]": profile.id,
    "subscription_data[metadata][plan_name]":  profile.subscription_tier,
    "success_url":                             "https://enroll.passtodigital.com/upload-selfie",
    "cancel_url":                              "https://enroll.passtodigital.com/payment",
    // Payment confirmation comes from webhook — not the return URL.
    // success_url is UX only; Lovable re-checks payment-status on page load.
  });

  if (profile.email) {
    params.set("customer_email", profile.email);
  }
  if (profile.stripe_customer_id) {
    params.set("customer", profile.stripe_customer_id);
    params.delete("customer_email"); // use existing customer, not email
  }

  let sessionUrl: string;

  try {
    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "(unreadable)");
      console.error("Stripe checkout session creation failed:", res.status, errBody);
      return json({ error: "payment_unavailable" }, 503);
    }

    const session = await res.json();
    sessionUrl = session.url;

    if (!sessionUrl) {
      console.error("Stripe session missing url:", JSON.stringify(session));
      return json({ error: "payment_unavailable" }, 503);
    }
  } catch (e) {
    console.error("Stripe API call threw:", (e as Error).message);
    return json({ error: "payment_unavailable" }, 503);
  }

  // ── 5. Audit ───────────────────────────────────────────────────────────────
  const { error: auditErr } = await supabaseAdmin.from("audit_events").insert({
    actor_id:      profile.id,
    action:        "payment.checkout_created",
    resource_type: "profile",
    resource_id:   profile.id,
    change_after:  { plan_name: profile.subscription_tier, onboarding_step: "payment" },
  });
  if (auditErr) console.error("stripe-checkout-create: audit write failed (non-fatal):", auditErr);

  return json({ checkout_url: sessionUrl }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
