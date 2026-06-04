# TASK-0061 Subscription Management and Cancellation Flow — Implementation Spec

**Task:** TASK-0061 — Define Subscription Management and Cancellation Flow  
**Date:** 2026-06-04  
**Owner:** Claude  
**Status:** Implementation Spec Ready for David Approval

---

## Executive Summary

MVP subscription management uses **Stripe Customer Portal** for safe, backend-controlled account and billing management. A service-role-only backend function creates portal sessions without exposing Stripe secrets to Lovable. Cancellation and lapse behavior remain webhook-driven. Dashboard states reflect server-confirmed subscription status.

---

## 1. Subscription Management Approach: Stripe Customer Portal

### Decision: Use Stripe Customer Portal

**Why:**
- **Security:** Stripe handles sensitive subscription, payment, card, and billing history — no secrets exposed to Lovable
- **Standard practice:** Stripe Customer Portal is the industry standard for SaaS subscription management
- **Scope fit:** Portal covers the MVP MVP use cases: view billing history, update payment method, cancel subscription
- **Stripe configuration:** Portal is managed entirely in Stripe; no additional PassTo infrastructure needed beyond session creation

**What Nurses Can Do in Portal:**
- View subscription status
- View billing history and payment methods
- Update payment method
- Cancel subscription
- Download invoices

**What Portal Does NOT Expose to MVP:**
- Refunds (not handled by nurses; David/support decides)
- Disputes/chargebacks (not handled by nurses; Stripe/payment processor decides)
- Coupons/discounts (not configured in MVP)
- Trial extensions (not in MVP scope)
- Plan changes (nurses cannot upgrade/downgrade directly; cancellation → Free downgrade on lapse)

### Backend Implementation: `subscription-portal-session` Function

**New Edge Function:** `supabase/functions/subscription-portal-session/index.ts`

```typescript
/**
 * subscription-portal-session
 *
 * TASK-0061 — Subscription Management and Cancellation Flow
 *
 * verify_jwt: true
 *
 * Called by Lovable when nurse clicks "Manage Subscription" on dashboard.
 *
 * Gate chain:
 *   1. Auth — JWT via supabaseAuth; service-role for Stripe API call
 *   2. Profile — active account only
 *   3. Stripe customer — must exist and be linked to profile
 *   4. Stripe session creation — calls Stripe Customer Portal API
 *
 * Response:
 *   - { url: "https://billing.stripe.com/..." } — raw portal session URL
 *   - Never expose Stripe secret, API key, or internal IDs
 *
 * Audit:
 *   - Portal session creation logged with profile_id, action, timestamp
 *   - No sensitive Stripe data persisted
 *
 * TASK: TASK-0061
 * Codex QA: required before production use
 */
```

**Spec Detail:**

| Item | Requirement |
|---|---|
| HTTP Method | POST |
| Route | `/subscription-portal-session` |
| Auth | `verify_jwt: true` |
| Input | None (auth determines profile) |
| Success Response (302) | Redirect to Stripe portal URL or return `{ url: "..." }` |
| Error Response (4xx/5xx) | Safe error message; no Stripe secrets exposed |
| Audit | Log portal session request; no payment/card data |
| CORS | `https://app.passtodigital.com` |

**Gate Logic:**
1. Authenticate with JWT
2. Load profile; verify active
3. Load stripe_customer for profile
4. Call Stripe API: `POST /v1/billing_portal/sessions` with `customer_id`
5. Return portal URL to Lovable
6. Lovable redirects or opens in modal

**Security:**
- No Stripe secret in Lovable
- Service-role only for Stripe API calls
- Audit log for compliance
- Portal URL is short-lived (Stripe-managed)

---

## 2. Cancellation and Lapse Behavior

### Subscription Lifecycle

```
Active (paid Standard/Premier)
    ↓ [webhook: customer.subscription.updated with status=canceled]
    ↓
Canceled (pending period end)
    ↓ [at period end: webhook: customer.subscription.updated with status=canceled]
    ↓
Lapsed (free tier)
    ↓ [reactivate with new subscription if nurse upgrades]
    ↓
Active again
```

### Webhook-Driven State Management

**Current webhook handler** (`stripe-webhook` Edge Function):

| Stripe Event | Action | MVP Coverage |
|---|---|---|
| `customer.subscription.created` | Create `subscriptions` row | ✓ Implemented (TASK-0040) |
| `customer.subscription.updated` | Update `subscriptions.status` | ✓ Implemented (TASK-0040) |
| `customer.subscription.deleted` | Mark lapsed; downgrade to Free | ⚠️ Needs implementation |
| `invoice.payment_failed` | Log event; monitor for lapse trigger | ⚠️ Needs implementation |

**Subscription Status Enum** (already in schema):
```sql
status in ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid')
```

### Lapse Behavior: "Downgrade to Free on Period End"

From SUBSCRIPTION.md (confirmed MVP rule):
```text
Downgrade to Free at period end unless David changes this.
```

**Implementation:**
1. When `customer.subscription.deleted` webhook arrives:
   - Update `subscriptions.status = 'canceled'` (already done)
   - Check `current_period_end`: if > now, subscription is "pending lapse"
   - At or after `current_period_end`:
     - Update `profiles.subscription_tier = 'free'`
     - Credential/wallet records remain active (not deleted)
     - Share-link and other actions still work under Free tier rules
     - Write audit event: `subscription.lapsed`

2. **Option A (Immediate):** Update `subscription_tier = 'free'` immediately on `subscription.deleted`
   - Simpler; less state management
   - Free features available immediately on cancellation
   - Recommended for MVP

3. **Option B (Deferred to Period End):** Wait until `current_period_end` to downgrade
   - Preserves paid entitlements until period end (customer-friendly)
   - Requires scheduled job or manual support
   - Out of scope for MVP (Phase 7 ops scheduled jobs deferred)

**MVP Decision:** **Option A (Immediate Downgrade)** — simpler, safe, documented.

**Credential/Wallet Preservation:**
- Downgrade does NOT delete credential or wallet records
- Credential remains visible on dashboard
- Entitlements change (share-link free for Free tier; no additional licenses; etc.)
- Verifier access to previously-shared credentials continues (TTL-based)

---

## 3. Dashboard Subscription States and Copy

### Subscription Status Display

**Current dashboard responses** (from `dashboard-status`):

| Profile State | Displayed Tier | Displayed Status | Copy |
|---|---|---|---|
| `subscription_tier = 'free'` | Free | — | "Free account" |
| `subscription_tier = 'standard'`, active sub | Standard | "Active" | "Standard subscription, renews [date]" |
| `subscription_tier = 'standard'`, no sub | Standard | "Not confirmed" | "Select a plan to activate Standard benefits" |
| `subscription_tier = 'premier'`, active sub | Premier | "Active" | "Premier subscription, renews [date]" |

### New/Updated States (TASK-0061)

| Subscription Status | Display to Nurse | Copy | CTA |
|---|---|---|---|
| **active** | "Active" | "Your [Standard\|Premier] subscription is active. Next billing date: [date]" | [Manage Subscription] → Portal |
| **past_due** | "Payment Due" | "Your payment failed. Please update your payment method to keep your subscription active." | [Update Payment] → Portal |
| **canceled** | "Ending [date]" | "Your subscription will end on [period_end_date]. You'll be downgraded to Free." | [Reactivate] or just Close |
| **unpaid** | "Account At Risk" | "Your account has unpaid charges. Subscription access is limited." | [Resolve Now] → Portal |
| **incomplete** | "Payment Incomplete" | "Complete your payment to activate your subscription." | [Complete Payment] → Portal |
| Free (no active sub) | "Free" | "You're on the Free plan. Upgrade to Standard or Premier for more features." | [View Plans] → Checkout |

### Dashboard Copy Guardrails

**What copy MUST say:**
- ✅ Paid entitlements are tied to active subscription status
- ✅ Cancellation ends access to paid features
- ✅ Free downgrade happens at lapse
- ✅ Credential remains accessible (just limited actions)

**What copy MUST NOT say:**
- ❌ "Your subscription was canceled" (should say "ending" or "downgrading")
- ❌ Imply credential is deleted/unavailable after downgrade
- ❌ Suggest share links or actions will disappear (they're just paid)

---

## 4. Lovable Implementation Requirements

### `/dashboard` Route Updates

**New Section: Subscription Management**

```
[Subscription Card]
├─ Current Plan: [Free | Standard | Premier]
├─ Status: [Active | Canceled | Past Due | Payment Needed]
├─ Next Billing Date: [date if active]
└─ [Manage Subscription] button
     → Calls POST /subscription-portal-session
     → Opens Stripe portal in new window or modal
```

### Edge Cases Lovable Must Handle

1. **No active subscription (Free account):** Hide "Manage Subscription"; show "Upgrade Plan" link
2. **No stripe_customer row:** Show error "Subscription not linked" + support email
3. **Portal session creation fails (503):** Show "Billing temporarily unavailable; try again later"
4. **User cancels in portal:** Dashboard reflects updated status on next poll/refresh

### Do NOT Implement in Lovable

- ❌ Cancellation UI (done in Stripe portal)
- ❌ Plan upgrade/downgrade UI (canceled → free downgrade automatic)
- ❌ Payment method update UI (done in Stripe portal)
- ❌ Invoice/billing history UI (done in Stripe portal)

---

## 5. Required Stripe Configuration (David Hard Gate)

### Test Mode Setup

**Before TASK-0061 Codex QA:**

| Item | Status | Notes |
|---|---|---|
| Stripe test mode Customer Portal enabled | ⚠️ **Must verify** | Stripe account default; confirm in Dashboard → Settings |
| Stripe test API key (existing) | ✓ Already set | `STRIPE_CLIENT_SECRET` in Supabase secrets |
| Portal redirect URL configured | ⚠️ **Must configure** | Stripe Dashboard → Settings → Billing Portal → Customer Portal configuration |

**Portal Configuration Checklist (Stripe Dashboard):**
- [ ] Customer Portal is enabled for test mode
- [ ] Allowed features include: Subscription management, payment method update, billing history
- [ ] Billing Portal URL patterns configured (optional; not required for API sessions)
- [ ] Return URL set to `https://app.passtodigital.com/dashboard` (optional; Lovable can handle return)

### Production Setup (David Hard Gate — Not MVP)

Before production launch, David must:

1. **Enable Stripe Customer Portal** in production Stripe account
2. **Configure production redirect URLs** in Stripe Dashboard
3. **Set `STRIPE_CLIENT_SECRET` (live)** in production Supabase secrets
4. **Test portal session creation** with production API key
5. **Verify billing portal renders correctly** with live product/price IDs

**This is a blocking hard gate — subscription management does not go live until David configures production Stripe portal.**

---

## 6. Implementation Tasks

### Task 1: `subscription-portal-session` Function

**What:** New Edge Function to create Stripe portal sessions

**Files:**
- `supabase/functions/subscription-portal-session/index.ts` (new)

**Steps:**
1. Authenticate user
2. Load profile and stripe_customer
3. Call Stripe API: `POST /v1/billing_portal/sessions`
4. Return portal URL
5. Audit log

**Deployment:** `deno run supabase functions deploy subscription-portal-session`

**Tests:**
- Valid authenticated user → portal URL
- No stripe_customer → 404
- Stripe API error → 503

### Task 2: Update `stripe-webhook` for Subscription Lapse

**What:** Implement lapse behavior when subscription ends

**Files:**
- `supabase/functions/stripe-webhook/index.ts` (update)

**Changes:**
1. On `customer.subscription.deleted` event:
   - Update `subscriptions.status = 'canceled'`
   - Update `profiles.subscription_tier = 'free'`
   - Write audit: `subscription.lapsed`
2. On `invoice.payment_failed` event:
   - Log event; may trigger lapse if repeated
   - (Advanced alert handling deferred to Phase 7)

**Tests:**
- Subscription canceled → tier downgraded to Free
- Credential remains active
- Share-link eligibility recalculated

### Task 3: Update `dashboard-status` Function

**What:** Return subscription status and copy for display

**Files:**
- `supabase/functions/dashboard-status/index.ts` (update)

**Changes:**
1. Load `subscriptions.status` (already done)
2. Return additional fields:
   - `subscription_status` (active|past_due|canceled|unpaid|incomplete)
   - `current_period_end` (ISO timestamp if active)
   - `can_manage_subscription` (bool: true if stripe_customer exists)
3. Copy/messaging logic stays in Lovable

**Tests:**
- Active Standard → correct status + renew date
- Canceled → correct status + lapse date
- Free → no subscription section

### Task 4: Lovable `/dashboard` Route Update

**What:** Add subscription management UI section

**Files:**
- Lovable prompts (not in this repo; David/Lovable team owns)

**Changes:**
1. Subscription card with status display
2. "Manage Subscription" button → calls `/subscription-portal-session` → opens portal
3. Copy varies by status (see Section 3)

**Tests:**
- Loads subscription status correctly
- Portal opens/redirects on button click
- Handles error states (no stripe_customer, portal creation fails)

---

## 7. Acceptance Criteria Checklist

- [ ] MVP subscription management path is documented and approved
- [ ] Cancellation/lapse behavior is webhook-driven and does not delete credentials or wallet records
- [ ] Lovable dashboard/account states are specified for active, canceled, past_due, unpaid, and lapsed subscriptions
- [ ] Any backend portal-session route is service-side and does not expose Stripe secrets
- [ ] Any required Stripe configuration is documented as a David hard gate before production
- [ ] Claude documents files changed, tests run, deviations, and risks

---

## 8. Files Changed, Tests, Deviations, Risks

### Files to Create/Modify

| File | Change | Type |
|---|---|---|
| `supabase/functions/subscription-portal-session/index.ts` | New | Function |
| `supabase/functions/stripe-webhook/index.ts` | Update | Function |
| `supabase/functions/dashboard-status/index.ts` | Update | Function |
| Lovable `/dashboard` | Update | UI (not in repo) |

### Tests

**Unit/Source Tests:**
- `subscription-portal-session`: Valid user, no stripe_customer, Stripe API error
- `stripe-webhook`: Subscription canceled, subscription lapsed, audit written
- `dashboard-status`: Active sub, past_due sub, free account

**Integration Tests (Stripe test mode):**
1. Create test Standard subscription (via TASK-0060 checkout)
2. Cancel subscription via Stripe Dashboard
3. Verify webhook fires → profile downgraded to Free
4. Verify credential still visible on dashboard
5. Verify share-link creation still works (now free)

### Deviations from Original Spec

**None.** Proposed approach aligns with TASK-0061 scope and PRD guidance.

### Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Stripe Customer Portal not enabled in test account | Low | Verify in Stripe Dashboard before deployment |
| Portal session creation timeout on Stripe API | Low | 30-second timeout; return 503 to Lovable for retry |
| User cancels subscription but profile not downgraded (webhook failure) | Medium | Implement Phase 7 reconciliation job; audit retained for support |
| User expects immediate refund after cancellation | Medium | Clear dashboard copy: "your subscription will end on [date]"; support process owns refunds |
| Lovable calls portal function without auth | Low | `verify_jwt: true` enforced at Supabase; returns 401 if missing |

---

## Next Steps

1. **David approval:** Review this spec and approve Stripe Customer Portal approach
2. **Implementation:** Claude develops `subscription-portal-session` and updates webhook/dashboard
3. **Codex QA:** Verify webhook lapse logic, audit writes, and Lovable integration
4. **David hard gates:** Before production, Stripe production portal configuration (blocking)

---

**Ready for David review and approval.**
