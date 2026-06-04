# PassTo Manual Recovery Procedures

**Purpose:** Step-by-step procedures for ops to safely recover from common failure states.

**Audience:** PassTo operations team

**Important:** All manual interventions must be audited in `audit_events`. Use the provided templates.

---

## When to Use This Guide

**Use manual recovery when:**
- A Stripe webhook failed to process (Query 3 in SUBSCRIPTION_MONITORING.md)
- A subscription state is inconsistent with Stripe
- A support ticket requires state inspection or remediation

**Do NOT use manual recovery when:**
- A feature is simply not working (troubleshoot first)
- You're not sure what the problem is (inspect first, see SUBSCRIPTION_MONITORING.md)

---

## Recovery 1: Failed Stripe Webhook Event

### Scenario
A webhook event failed to process. The error is in `stripe_events.error_message`.

### Investigation

1. **Find the failed event:**
   ```sql
   select * from stripe_events
   where stripe_event_id = 'evt_1234...'
   ```

2. **Check the error:**
   - Look at `error_message` column
   - Check Supabase Edge Function logs:
     - Supabase Dashboard → Edge Functions → stripe-webhook → Logs
     - Filter by timestamp of the failed event

3. **Understand what failed:**
   - `customer.subscription.created` — subscription should be inserted
   - `customer.subscription.updated` — subscription status should be updated
   - `customer.subscription.deleted` — profile should be downgraded to Free
   - `checkout.session.completed` — payment and subscription should be created

### Root Causes

| Error | Cause | Fix |
|---|---|---|
| `no profile_id for subscription` | Metadata missing from Stripe | Manually look up profile by Stripe customer ID |
| `subscriptions upsert failed: unique constraint` | Duplicate subscription ID | Already processed; safe to skip |
| `profiles update failed: no rows` | Profile doesn't exist | Create profile or investigate why it's missing |
| `timeout` | Stripe API slow | Retry the event (safe; idempotent) |
| `permission denied` | RLS policy issue | Contact eng team |

### Resolution: Automatic (Recommended)

**Option 1: Stripe Dashboard Re-delivery (Easiest)**

1. Open Stripe Dashboard
2. Go to Webhooks → stripe-webhook-endpoint
3. Find the failed event
4. Click "Attempt delivery"
5. Stripe will re-send the event to PassTo
6. Check `stripe_events.processed` → should become true

**Option 2: Manual Replay (If Stripe not accessible)**

1. Get the event payload from `stripe_events.payload`
2. Call the stripe-webhook function with the payload (requires Vercel/API access)
3. Check `stripe_events.processed` → should become true

### Resolution: Manual (Last Resort)

If automatic replay fails, inspect the event and fix the root issue:

1. **If missing profile_id:**
   ```sql
   select id, email from profiles
   where stripe_customer_id = (stripe_events.payload->>'customer');
   ```
   - If profile exists: re-run Stripe dashboard re-delivery (it has the profile_id now)
   - If profile doesn't exist: contact support team (profile should exist)

2. **If unique constraint error:**
   - Check if subscription already exists: `select * from subscriptions where stripe_subscription_id = '...'`
   - If yes: event is already processed; no action needed
   - If no: investigate why constraint failed

3. **If profile doesn't exist:**
   - Check `profiles` table: does auth_user_id exist?
   - If yes: re-run Stripe dashboard re-delivery
   - If no: profile creation failed; contact eng team

### Audit the Recovery

**After successful replay:**

```sql
insert into audit_events (
  actor_id, action, resource_type, resource_id, change_after
) values (
  null,
  'webhook.manual_replay',
  'stripe_event',
  null,
  json_build_object(
    'stripe_event_id', 'evt_1234...',
    'event_type', 'customer.subscription.updated',
    'reason', 'automatic retry via Stripe dashboard',
    'ops_timestamp', now()::text
  )
);
```

---

## Recovery 2: Subscription Status Mismatch

### Scenario
A nurse's subscription status in PassTo doesn't match Stripe. Example: PassTo says "active" but Stripe says "cancelled".

### Investigation

1. **Get nurse email:**
   - From support ticket or account lookup

2. **Run Query 1:**
   - See SUBSCRIPTION_MONITORING.md
   - Check `subscription_status` and `subscription_tier`

3. **Check Stripe:**
   - Stripe Dashboard → Customers → find nurse (by email)
   - View subscription → check actual status

4. **Compare:**
   - Is PassTo status different from Stripe?
   - When did Stripe status change?
   - Was a webhook sent for the change?

### Resolution: Determine Root Cause

| Scenario | Root Cause | Fix |
|---|---|---|
| PassTo "active" but Stripe "cancelled" | Webhook didn't process | See Recovery 1 (replay webhook) |
| PassTo "cancelled" but Stripe "active" | Stripe status changed after PassTo recorded | Update PassTo (see Recovery 2B below) |
| PassTo tier wrong | Webhook processed but didn't downgrade | Manual fix (see Recovery 2B below) |

### Recovery 2A: Replay Missing Webhook

If a `customer.subscription.updated` or `customer.subscription.deleted` webhook failed:

1. **Find the event:**
   ```sql
   select * from stripe_events
   where payload->>'subscription' = 'sub_1234...'
   order by created_at desc;
   ```

2. **Follow Recovery 1 above** — replay the webhook via Stripe dashboard or manually

### Recovery 2B: Manual State Update (Last Resort)

**If webhook cannot be replayed and state is critical:**

1. **Verify Stripe state:**
   - Stripe Dashboard → Customer subscription → actual status
   - Note the timestamp

2. **Update PassTo:**
   ```sql
   update subscriptions
   set status = 'canceled', updated_at = now()
   where stripe_subscription_id = 'sub_1234...';
   
   update profiles
   set subscription_tier = 'free', updated_at = now()
   where id = (select profile_id from subscriptions where stripe_subscription_id = 'sub_1234...');
   ```

3. **Verify the update:**
   - Run Query 1 again
   - Check that tier is now 'free'
   - Check that credential count is still > 0

4. **Audit the fix:**
   ```sql
   insert into audit_events (
     actor_id, action, resource_type, resource_id, change_after
   ) values (
     null,
     'manual.subscription_remediation',
     'subscription',
     (select id from subscriptions where stripe_subscription_id = 'sub_1234...'),
     json_build_object(
       'stripe_subscription_id', 'sub_1234...',
       'reason', 'webhook failed; manual remediation',
       'stripe_status', 'cancelled',
       'ops_notes', 'Verified Stripe status on dashboard; downgraded profile to free'
     )
   );
   ```

---

## Recovery 3: Credential Unexpectedly Unavailable

### Scenario
A nurse says their credential disappeared after subscription ended.

### Investigation

1. **Get nurse email**

2. **Run Query 1:**
   - Check `active_credential_count`
   - Should be > 0 even after cancellation

3. **Check `credentials` table:**
   ```sql
   select id, status, created_at, updated_at from credentials
   where profile_id = (select id from profiles where email = 'nurse@example.com')
   order by created_at desc;
   ```

4. **Look for:**
   - Are credentials present?
   - Are credentials marked 'active' or something else?

### Root Causes

| Finding | Cause | Fix |
|---|---|---|
| Credentials exist and active | Correct behavior (MVP expected) | Educate nurse: credential preserved after lapse |
| Credentials deleted | This should NOT happen | Investigate — webhook should not delete |
| Credentials status = 'suspended' | Account suspended | Verify account_status on profile |

### Resolution

**If credentials are present (expected):**
- Educate the nurse: "Your credential is safe and still in your account"
- See support template in SUBSCRIPTION_MONITORING.md

**If credentials are missing/deleted:**
- This is a bug or RLS issue
- Contact eng team immediately
- Document in audit:
  ```sql
  insert into audit_events (
    actor_id, action, resource_type, change_after
  ) values (
    null,
    'investigation.missing_credential',
    'credential',
    json_build_object(
      'profile_id', '...',
      'status', 'INVESTIGATION_REQUIRED',
      'reason', 'Credential missing after lapse; should be preserved'
    )
  );
  ```

---

## Recovery 4: Share-Link Creation Fails

### Scenario
A nurse tries to create a share link but gets "subscription_not_confirmed" error.

### Investigation

1. **Run Query 1:**
   - Check `subscription_status`
   - Check `subscription_tier`

2. **Verify subscription:**
   - If `subscription_status = 'active'` and `subscription_tier = 'standard'|'premier'` → should work
   - If `subscription_status = null` or `subscription_tier = 'free'` → expected (Free tier can create links)
   - If `subscription_status = 'cancelled'|'unpaid'` and `subscription_tier != 'free'` → mismatch (see Recovery 2)

3. **Check dashboard:**
   - Ask nurse to refresh `/dashboard`
   - Status endpoint should return current state

### Resolution

1. **If subscription is actually canceled:**
   - Educate nurse: "Your subscription ended on [date]"
   - Offer to help them resubscribe

2. **If subscription appears active but function rejects it:**
   - Check `stripe_events` for recent updates (Query 2)
   - Look for unprocessed webhook (Query 3)
   - If found: follow Recovery 1

3. **If status is inconsistent:**
   - Follow Recovery 2B to sync PassTo with Stripe

---

## Recovery 5: Subscription Payment Failed

### Scenario
A nurse says their subscription payment failed, but we're not sure what happened.

### Investigation

1. **Check subscription status (Query 1 or Query 5 in SUBSCRIPTION_MONITORING.md):**
   - Look for `status = 'past_due'`, `'unpaid'`, or `'incomplete'`
   - Check `current_period_end`

2. **Check Stripe:**
   - Stripe Dashboard → Customers → find nurse
   - Check invoices → look for failed/pending invoice
   - Note the timestamp and invoice status

3. **Check webhook:**
   - Query 3 in SUBSCRIPTION_MONITORING.md → look for `invoice.payment_failed` or `invoice.payment_action_required` event
   - If found but `processed = false` → webhook failed
   - If not found → Stripe didn't send the event yet (rare)

### Resolution

**If webhook failed:**
- Follow Recovery 1 → replay the event via Stripe dashboard
- This will update `subscriptions.status` to match Stripe

**If no webhook found:**
1. Check Stripe webhook endpoint configuration
2. Verify webhook is enabled for `invoice.payment_failed` events
3. Contact Stripe support if webhook setup is broken

**If payment is pending in Stripe:**
- Advise nurse to update payment method in their Stripe Customer Portal
- Stripe will retry the payment automatically
- Once successful, webhook will update PassTo status

---

## Reference: What NOT to Do

| Action | Why Not | What to Do Instead |
|---|---|---|
| **Manually set `subscription_tier` to active** | Bypasses Stripe truth | Sync from Stripe via webhook replay |
| **Delete a credential** | Loses data; looks bad for compliance | Leave it; lapsed users still see credentials |
| **Delete a wallet pass** | Loses issuance history | Mark as 'voided' if needed |
| **Directly create payment row** | No Stripe proof; audit red flag | Payment rows only created by Stripe webhooks for a-la-carte actions; subscription payments tracked in subscriptions table |
| **Directly create subscription row** | No Stripe proof; entitlement bypass | Must come from Stripe webhook only |
| **Skip audit for manual change** | Compliance violation | Always audit with `audit_events` insert |

---

## When to Escalate to Engineering

| Situation | Action |
|---|---|
| RLS policy error when reading/writing | Escalate — possible DB misconfiguration |
| Stripe webhook endpoint not receiving events | Escalate — webhook setup issue |
| Credentials being deleted on lapse | Escalate — function may have cascade delete bug |
| Profile missing when subscription exists | Escalate — FK or trigger issue |
| Duplicate payment rows after single webhook | Escalate — idempotency bug |

---

## Audit Checklist for Manual Interventions

**Before you make any change:**
- [ ] Identified root cause (investigation complete)
- [ ] Verified Stripe state matches investigation
- [ ] Chose appropriate recovery path
- [ ] Notified nurse (if customer-facing issue)

**After you make the change:**
- [ ] Updated PassTo state (if manual fix was needed)
- [ ] Inserted audit_events row with full context
- [ ] Verified state is now consistent (re-run Query 1)
- [ ] Documented recovery in support ticket or logs

---

## Quick Reference: Common Queries

**Find recent failures:**
```sql
select * from stripe_events where processed = false order by created_at desc limit 10;
```

**Check profile entitlements:**
```sql
select * from profiles where email = 'nurse@example.com';
```

**Check subscription state:**
```sql
select * from subscriptions where profile_id = '...' order by created_at desc;
```

**Check a-la-carte payment history:**
```sql
select * from payments where profile_id = '...' order by created_at desc;
```

**Check subscription payment status (failed invoices):**
```sql
select * from stripe_events 
where payload->>'customer' = (select stripe_customer_id from profiles where id = '...')
  and event_type in ('invoice.payment_failed', 'invoice.payment_action_required')
order by created_at desc;
```

**Verify credential still exists:**
```sql
select count(*) from credentials where profile_id = '...' and status = 'active';
```

**Find events by subscription ID:**
```sql
select * from stripe_events where payload->>'subscription' = 'sub_1234...' order by created_at desc;
```
