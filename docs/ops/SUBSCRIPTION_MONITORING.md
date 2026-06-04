# PassTo Subscription and Payment Monitoring

**Purpose:** Daily ops checklist and SQL queries for monitoring subscription, payment, and Stripe webhook health.

**Audience:** PassTo operations team

---

## Daily Monitoring Checklist

Run this checklist at the start of each shift:

- [ ] Check for failed Stripe webhooks (see Query 3 below)
- [ ] Spot-check recent lapsed subscriptions (see Query 5 below)
- [ ] Review audit trail for any manual interventions (see Query 4 below)
- [ ] Verify no unprocessed payment failures (see Query 2 below)

---

## SQL Queries

### Query 1: Profile Subscription and Entitlement Summary

**Purpose:** Inspect complete subscription and entitlement state for a nurse.

**When to use:**
- Support ticket: "My subscription isn't working"
- Verify state before manual intervention
- Compliance audit response

**Query:**
```sql
-- Replace 'nurse@example.com' with actual email
select
  p.id,
  p.email,
  p.onboarding_step,
  p.account_status,
  p.subscription_tier,
  s.status as subscription_status,
  s.plan_name,
  s.license_entitlement_count,
  s.stripe_subscription_id,
  s.current_period_start,
  s.current_period_end,
  s.canceled_at,
  (select count(*) from credentials where profile_id = p.id and status = 'active') as active_credential_count,
  (select count(*) from wallet_passes where credential_id in (select id from credentials where profile_id = p.id) and status = 'issued') as issued_wallet_passes,
  p.updated_at
from profiles p
left join subscriptions s on p.id = s.profile_id
where p.email = 'nurse@example.com'
order by p.created_at desc;
```

**What it shows:**
- Profile ID, email, onboarding step
- Account status
- Current tier intent (`subscription_tier`)
- Active subscription truth (status, plan, entitlement count)
- Renewal dates and cancellation timestamp
- Count of active credentials and issued wallet passes

---

### Query 2: A-La-Carte Payment and Stripe Event History

**Purpose:** Inspect a-la-carte payment history (share tokens, refreshes, PDF exports, additional licenses) and associated Stripe events.

**When to use:**
- Support ticket: "My share/refresh/PDF payment failed"
- Investigate missing payment record
- Trace why a paid action didn't activate

**Query:**
```sql
-- Replace 'nurse@example.com' with actual email
select
  p.id as profile_id,
  p.email,
  py.id as payment_id,
  py.action_type,
  py.amount_cents,
  py.status,
  py.stripe_payment_intent_id,
  py.created_at as payment_created_at,
  se.stripe_event_id,
  se.event_type,
  se.processed,
  se.error_message,
  se.created_at as event_created_at,
  se.processed_at
from profiles p
left join payments py on p.id = py.profile_id
left join stripe_events se on se.payload->>'payment_intent' = py.stripe_payment_intent_id
where p.email = 'nurse@example.com'
order by py.created_at desc, se.created_at desc
limit 20;
```

**What it shows:**
- Payment ID, action type (share_token, refresh, pdf_export, additional_license), amount
- Payment status (pending, succeeded, failed, refunded)
- Stripe event ID and type
- Whether event was processed
- Error message (if any)
- Timeline of a-la-carte payments and webhooks

**For subscription payment history, use Query 5 below or inspect stripe_events filtered by subscription events.**

---

### Query 3: Failed/Unprocessed Stripe Events

**Purpose:** Find all webhook events that failed to process. **Run daily.**

**When to use:**
- Daily ops sweep (start of shift)
- Investigate why a subscription update didn't persist
- Prepare events for manual replay

**Query:**
```sql
-- Find all failed/unprocessed webhook events (last 30 days)
select
  se.id,
  se.stripe_event_id,
  se.event_type,
  se.processed,
  se.error_message,
  se.created_at,
  se.payload->>'customer' as stripe_customer_id,
  (select email from profiles where stripe_customer_id = se.payload->>'customer') as nurse_email,
  se.payload
from stripe_events se
where se.created_at > now() - interval '30 days'
  and (se.processed = false or se.error_message is not null)
order by se.created_at desc;
```

**What it shows:**
- Stripe event ID and type
- Processed status and error message
- Associated nurse (by Stripe customer ID)
- Raw event payload (for manual replay)

**Action if results found:**
- Check error message for context
- See MANUAL_RECOVERY.md for replay instructions
- Document the replay in audit_events

---

### Query 4: Audit Events for Sensitive Changes

**Purpose:** Inspect audit trail for subscription state changes, payments, and credentials.

**When to use:**
- Compliance review
- Investigate unexpected state change
- Support response: show nurse their audit trail

**Query:**
```sql
-- Sensitive events from last 30 days
select
  ae.id,
  ae.actor_id,
  p.email,
  ae.action,
  ae.resource_type,
  ae.resource_id,
  ae.change_before,
  ae.change_after,
  ae.created_at
from audit_events ae
left join profiles p on ae.actor_id = p.id
where ae.created_at > now() - interval '30 days'
  and ae.action in (
    'subscription.lapsed',
    'subscription.portal_session_created',
    'payment.subscription_started',
    'payment.failed',
    'credential.created',
    'verification_token.created',
    'webhook.manual_replay',
    'manual.subscription_remediation'
  )
order by ae.created_at desc;
```

**What it shows:**
- Who initiated the action (actor_id or null for system)
- Associated nurse email
- Action performed
- Before/after state
- Timestamp

---

### Query 5: Lapse/Cancellation Status Check

**Purpose:** Verify lapse behavior is working (subscriptions canceled, profiles downgraded, credentials preserved).

**When to use:**
- Daily sanity check that lapse behavior works
- Verify no credentials are unexpectedly unavailable
- Support follow-up after subscription ends

**Query:**
```sql
-- All canceled/lapsed subscriptions (last 30 days)
select
  p.id,
  p.email,
  s.stripe_subscription_id,
  s.status,
  s.plan_name,
  s.canceled_at,
  s.current_period_end,
  p.subscription_tier,
  (select count(*) from credentials where profile_id = p.id and status = 'active') as active_credentials,
  (select count(*) from verification_tokens where profile_id = p.id and status = 'active') as active_share_links,
  s.updated_at
from profiles p
join subscriptions s on p.id = s.profile_id
where s.status in ('canceled', 'unpaid', 'incomplete')
  and s.updated_at > now() - interval '30 days'
order by s.canceled_at desc;
```

**What it shows:**
- Profile and subscription IDs
- Subscription status (should be 'canceled')
- Profile tier (should be downgraded to 'free')
- Count of active credentials (should be > 0; not deleted)
- Count of active share-links (now subject to Free tier rules)

**What to look for:**
- ✅ `subscription_tier = 'free'` after cancellation
- ✅ `active_credentials > 0` (not deleted)
- ✅ Appropriate `canceled_at` timestamp

**If something looks wrong:**
- See MANUAL_RECOVERY.md for remediation

---

## Support Response Templates

### "My subscription ended; can I still see my credential?"

```
Yes! Your credential is safe and still visible in your account. Here's what happened:

1. Your subscription was canceled on [canceled_at from Query 5]
2. You've been downgraded to our Free plan
3. Your credential and all your data remain in your account
4. You can still view your credential on the dashboard
5. Free-tier features like sharing are still available

If you'd like to resubscribe, you can select a plan from the dashboard.
```

### "My payment failed; what do I do?"

```
We received your payment failure on [date from Query 2]. Here's what you can do:

1. Open your PassTo dashboard and click "Manage Subscription"
2. Update your payment method in the Stripe portal
3. We'll retry your payment automatically
4. Your subscription will reactivate once payment succeeds

If this doesn't work, please reply and we'll investigate further.
```

### "I can't create a share link. Why?"

```
Share links require an active subscription. Let me check your account...

[Run Query 1; check subscription_status and can_create_share]

If your subscription is canceled or lapsed:
- Your account has been downgraded to our Free plan
- You can still view your credential, but paid features are temporarily unavailable
- Resubscribe to Standard or Premier to unlock paid actions

If something else is wrong, please reply and we'll help.
```

---

## Alert Rules (If Monitoring Tool Implemented)

**Recommended alerts (Phase 7 scope):**

| Alert | Condition | Action |
|---|---|---|
| Webhook failures | `stripe_events.processed = false` and age > 1 hour | Investigate + replay |
| Payment failures | `payments.status = 'failed'` and age < 24 hours | Send support email template |
| Lapse mismatch | `s.status = 'canceled'` but `p.subscription_tier != 'free'` | Manual fix + audit |

---

## References

- **Manual Recovery:** See `docs/ops/MANUAL_RECOVERY.md`
- **Full Spec:** See `docs/tasks/TASK-0063-OPS-HARDENING-SPEC.md`
- **Stripe Webhook Status:** Supabase Dashboard → SQL Editor → Query 3
- **Audit Logs:** Supabase Dashboard → SQL Editor → Query 4
