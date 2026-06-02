/**
 * stripe-webhook
 *
 * TASK-0040 — Implement Stripe Subscription State and Entitlement Gating
 *
 * verify_jwt: false — called by Stripe, not the nurse browser.
 * Signature is verified via HMAC-SHA256 against STRIPE_WEBHOOK_SECRET.
 *
 * Events handled:
 *   checkout.session.completed       — subscription checkout succeeded
 *   customer.subscription.created   — subscription record created
 *   customer.subscription.updated   — subscription status/period changed
 *   customer.subscription.deleted   — cancellation/lapse; downgrade behavior
 *   invoice.payment_failed          — record payment failure
 *
 * On checkout.session.completed (subscription mode):
 *   - Writes/updates subscriptions row (status = 'active')
 *   - Writes payments row
 *   - Stores stripe_customer_id on profile if not set
 *   - Advances profiles.onboarding_step from 'payment' → 'selfie'
 *   - Writes audit event
 *
 * On customer.subscription.deleted:
 *   - Updates subscriptions.status = 'canceled'
 *   - Downgrades profiles.subscription_tier to 'free' (behavior only)
 *   - Does NOT delete credentials or wallet_passes
 *   - Writes audit event
 *
 * Idempotency: stripe_events.stripe_event_id is the idempotency key.
 * Duplicate events are acknowledged 200 without reprocessing.
 *
 * Required Supabase secrets:
 *   STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret
 *
 * license_entitlement_count by plan (MVP defaults — confirm with David):
 *   standard: 2
 *   premier:  5
 *
 * TASK: TASK-0040
 * Codex QA: required before production use
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_API = "https://api.stripe.com/v1";

const LICENSE_ENTITLEMENT: Record<string, number> = {
  standard: 2,
  premier:  5,
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  // ── 1. Read raw body and verify Stripe signature ───────────────────────────
  const rawBody = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";

  const verified = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
  if (!verified) {
    console.error("Stripe signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  // ── 2. Parse event ─────────────────────────────────────────────────────────
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventId   = event.id as string;
  const eventType = event.type as string;

  // ── 3. Idempotency check ───────────────────────────────────────────────────
  const { data: existing } = await supabaseAdmin
    .from("stripe_events")
    .select("id, processed")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  if (existing?.processed) {
    // Already processed — acknowledge without reprocessing
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 4. Insert stripe_events row (processed = false) ────────────────────────
  const { data: eventRow, error: insertErr } = await supabaseAdmin
    .from("stripe_events")
    .upsert({
      stripe_event_id: eventId,
      event_type:      eventType,
      processed:       false,
      payload:         event as unknown as Record<string, unknown>,
    }, { onConflict: "stripe_event_id" })
    .select("id")
    .single();

  if (insertErr || !eventRow) {
    console.error("Failed to insert stripe_event row:", insertErr);
    return new Response("Database error", { status: 500 });
  }

  // ── 5. Process event ───────────────────────────────────────────────────────
  let processingError: string | null = null;

  try {
    if (eventType === "checkout.session.completed") {
      await handleCheckoutCompleted(supabaseAdmin, event);
    } else if (
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated"
    ) {
      await handleSubscriptionUpsert(supabaseAdmin, event);
    } else if (eventType === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(supabaseAdmin, event);
    } else if (eventType === "invoice.payment_failed") {
      await handlePaymentFailed(supabaseAdmin, event);
    }
    // Other event types: acknowledge without processing
  } catch (e) {
    processingError = (e as Error).message;
    console.error(`Error processing ${eventType}:`, processingError);
  }

  // ── 6. Mark event processed ────────────────────────────────────────────────
  await supabaseAdmin
    .from("stripe_events")
    .update({
      processed:    processingError === null,
      processed_at: new Date().toISOString(),
      error_message: processingError,
    })
    .eq("id", eventRow.id);

  if (processingError) {
    // Return 200 anyway — Stripe will not retry on 5xx for all event types,
    // and we've persisted the raw event for manual replay.
    console.error("Event persisted with error — manual review required:", eventId);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  admin: ReturnType<typeof createClient>,
  event: Record<string, unknown>,
): Promise<void> {
  const session = event.data as Record<string, unknown>;
  const obj = session.object as Record<string, unknown>;

  if (obj.mode !== "subscription") return; // only handle subscription checkouts

  const profileId       = (obj.metadata as Record<string, string>)?.profile_id;
  const planName        = (obj.metadata as Record<string, string>)?.plan_name ?? "standard";
  const stripeSubId     = obj.subscription as string;
  const stripeCustomerId = obj.customer as string;
  const amountTotal      = (obj.amount_total as number) ?? 0;
  const paymentIntentId  = obj.payment_intent as string | null;

  if (!profileId || !stripeSubId) {
    throw new Error(`checkout.session.completed missing profile_id or subscription: profile=${profileId} sub=${stripeSubId}`);
  }

  const now = new Date().toISOString();
  const entitlementCount = LICENSE_ENTITLEMENT[planName] ?? 2;

  // Fetch subscription details from Stripe for period dates
  const subDetails = await fetchStripeSubscription(stripeSubId);
  const periodStart = subDetails?.current_period_start
    ? new Date((subDetails.current_period_start as number) * 1000).toISOString()
    : now;
  const periodEnd = subDetails?.current_period_end
    ? new Date((subDetails.current_period_end as number) * 1000).toISOString()
    : null;

  // Upsert subscription row
  const { error: subErr } = await admin
    .from("subscriptions")
    .upsert({
      profile_id:               profileId,
      stripe_subscription_id:   stripeSubId,
      stripe_customer_id:       stripeCustomerId,
      plan_name:                planName,
      status:                   "active",
      license_entitlement_count: entitlementCount,
      current_period_start:     periodStart,
      current_period_end:       periodEnd,
      updated_at:               now,
    }, { onConflict: "stripe_subscription_id" });

  if (subErr) throw new Error(`subscriptions upsert failed: ${subErr.message}`);

  // Write payment row
  const { error: payErr } = await admin.from("payments").insert({
    profile_id:               profileId,
    action_type:              "subscription_start",
    stripe_payment_intent_id: paymentIntentId ?? stripeSubId,
    amount_cents:             amountTotal,
    status:                   "succeeded",
    related_entity_type:      "subscription",
    metadata:                 { plan_name: planName, stripe_subscription_id: stripeSubId },
  });
  if (payErr) console.error("payments insert failed (non-fatal):", payErr.message);

  // Store stripe_customer_id on profile if not set
  await admin
    .from("profiles")
    .update({ stripe_customer_id: stripeCustomerId, updated_at: now })
    .eq("id", profileId)
    .is("stripe_customer_id", null);

  // Advance onboarding step: payment → selfie
  await admin
    .from("profiles")
    .update({ onboarding_step: "selfie", updated_at: now })
    .eq("id", profileId)
    .eq("onboarding_step", "payment");

  // Audit
  const { error: auditErr } = await admin.from("audit_events").insert({
    actor_id:      profileId,
    action:        "payment.subscription_started",
    resource_type: "profile",
    resource_id:   profileId,
    change_after:  { plan_name: planName, onboarding_step: "selfie", stripe_subscription_id: stripeSubId },
  });
  if (auditErr) console.error("audit write failed:", auditErr.message);
}

async function handleSubscriptionUpsert(
  admin: ReturnType<typeof createClient>,
  event: Record<string, unknown>,
): Promise<void> {
  const session = event.data as Record<string, unknown>;
  const sub = session.object as Record<string, unknown>;

  const stripeSubId      = sub.id as string;
  const stripeCustomerId = sub.customer as string;
  const status           = sub.status as string;
  const planName         = (sub.metadata as Record<string, string>)?.plan_name
    ?? ((sub.items as Record<string, unknown>)?.data as Array<Record<string, unknown>>)?.[0]
         ?.price
       ? "standard"
       : "standard";
  const periodStart = sub.current_period_start
    ? new Date((sub.current_period_start as number) * 1000).toISOString()
    : null;
  const periodEnd = sub.current_period_end
    ? new Date((sub.current_period_end as number) * 1000).toISOString()
    : null;

  const now = new Date().toISOString();
  const entitlementCount = LICENSE_ENTITLEMENT[planName] ?? 2;

  await admin
    .from("subscriptions")
    .upsert({
      stripe_subscription_id:    stripeSubId,
      stripe_customer_id:        stripeCustomerId,
      plan_name:                 planName,
      status,
      license_entitlement_count: entitlementCount,
      current_period_start:      periodStart,
      current_period_end:        periodEnd,
      updated_at:                now,
    }, { onConflict: "stripe_subscription_id" });
}

async function handleSubscriptionDeleted(
  admin: ReturnType<typeof createClient>,
  event: Record<string, unknown>,
): Promise<void> {
  const session = event.data as Record<string, unknown>;
  const sub = session.object as Record<string, unknown>;

  const stripeSubId = sub.id as string;
  const now = new Date().toISOString();

  // Update subscription status
  const { data: subRow } = await admin
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: now, updated_at: now })
    .eq("stripe_subscription_id", stripeSubId)
    .select("profile_id")
    .single();

  if (!subRow?.profile_id) return;

  // Downgrade behavior: set subscription_tier back to free.
  // credentials and wallet_passes are NOT deleted.
  await admin
    .from("profiles")
    .update({ subscription_tier: "free", updated_at: now })
    .eq("id", subRow.profile_id);

  await admin.from("audit_events").insert({
    actor_id:      subRow.profile_id,
    action:        "subscription.canceled",
    resource_type: "profile",
    resource_id:   subRow.profile_id,
    change_after:  { subscription_tier: "free", stripe_subscription_id: stripeSubId },
  });
}

async function handlePaymentFailed(
  admin: ReturnType<typeof createClient>,
  event: Record<string, unknown>,
): Promise<void> {
  const session = event.data as Record<string, unknown>;
  const invoice = session.object as Record<string, unknown>;

  const stripeSubId  = invoice.subscription as string | null;
  const customerId   = invoice.customer as string;
  const amountDue    = (invoice.amount_due as number) ?? 0;
  const now          = new Date().toISOString();

  // Find the profile by stripe_customer_id
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!profile) return;

  await admin.from("payments").insert({
    profile_id:               profile.id,
    action_type:              "subscription_renewal",
    stripe_payment_intent_id: invoice.payment_intent as string ?? customerId,
    amount_cents:             amountDue,
    status:                   "failed",
    related_entity_type:      "subscription",
    metadata:                 { stripe_subscription_id: stripeSubId, reason: "invoice_payment_failed" },
  });

  await admin.from("audit_events").insert({
    actor_id:      profile.id,
    action:        "payment.failed",
    resource_type: "profile",
    resource_id:   profile.id,
    change_after:  { stripe_subscription_id: stripeSubId, amount_cents: amountDue },
  });
}

// ── Stripe API helper ─────────────────────────────────────────────────────────

async function fetchStripeSubscription(subId: string): Promise<Record<string, unknown> | null> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return null;
  try {
    const res = await fetch(`${STRIPE_API}/subscriptions/${subId}`, {
      headers: { "Authorization": `Bearer ${stripeKey}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Stripe signature verification ─────────────────────────────────────────────
// Implements the Stripe webhook signature scheme using Web Crypto API.
// https://stripe.com/docs/webhooks/signatures

async function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  // Parse t= and v1= from "t=...,v1=..."
  const parts: Record<string, string> = {};
  for (const part of sigHeader.split(",")) {
    const [k, v] = part.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }

  const timestamp = parts["t"];
  const v1        = parts["v1"];
  if (!timestamp || !v1) return false;

  // Reject if timestamp is more than 5 minutes old
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const payload = `${timestamp}.${rawBody}`;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const computed = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Timing-safe comparison
    return timingSafeEqual(computed, v1);
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
