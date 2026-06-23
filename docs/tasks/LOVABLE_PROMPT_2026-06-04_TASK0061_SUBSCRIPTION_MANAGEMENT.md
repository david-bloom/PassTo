# Lovable Prompt: Subscription Management Card (TASK-0061)

**Task:** TASK-0061 — Define Subscription Management and Cancellation Flow  
**Component:** Dashboard subscription card  
**Date:** 2026-06-04

---

## Overview

Add a subscription management section to the Lovable `/dashboard` route. This card shows current subscription status and provides a "Manage Subscription" button that opens Stripe Customer Portal for safe, backend-controlled subscription management.

---

## Backend Status Endpoint

**Endpoint:** `GET /dashboard-status` (already deployed)

**New fields returned:**
```json
{
  "subscription_tier": "standard",
  "subscription_status": "active",
  "subscription_plan_name": "standard",
  "current_period_end": "2026-07-04T12:34:56Z",
  "can_manage_subscription": true
}
```

**New endpoint to call:**
```
POST /subscription-portal-session

Required: Authorization header with JWT
Returns: { url: "https://billing.stripe.com/..." }
```

---

## UI Requirements

### Subscription Card Placement

Add a new section on `/dashboard` after the credential/wallet sections. Order:
1. Credential Status Card
2. Wallet Status Card
3. **→ SUBSCRIPTION CARD (NEW)**
4. Share History (if implemented)

### Subscription Card Content

#### When subscription_tier = "free"

```
┌─────────────────────────────────────────────┐
│ SUBSCRIPTION                                │
├─────────────────────────────────────────────┤
│ Plan: Free                                  │
│                                             │
│ You're on the Free plan. Upgrade to         │
│ Standard or Premier for more features.      │
│                                             │
│ [View Plans]                                │
└─────────────────────────────────────────────┘
```

**Copy:** "You're on the Free plan. Upgrade to Standard or Premier for more features."
**Button:** "View Plans" → Routes to `/account-select` (plan selection)

---

#### When subscription_tier = "standard" or "premier" AND subscription_status = "active"

```
┌─────────────────────────────────────────────┐
│ SUBSCRIPTION                                │
├─────────────────────────────────────────────┤
│ Plan: Standard                              │
│ Status: Active                              │
│ Next billing date: July 4, 2026             │
│                                             │
│ [Manage Subscription]                       │
└─────────────────────────────────────────────┘
```

**Copy:**
- Line 1: "Plan: [Standard | Premier]"
- Line 2: "Status: Active"
- Line 3: "Next billing date: [formatted current_period_end]"

**Button:** "Manage Subscription" 
- → Call `POST /subscription-portal-session`
- → Opens returned URL in new window/modal

---

#### When subscription_status = "past_due"

```
┌─────────────────────────────────────────────┐
│ SUBSCRIPTION                                │
├─────────────────────────────────────────────┤
│ Plan: Standard                              │
│ Status: ⚠️ Payment Due                       │
│                                             │
│ Your payment failed. Please update your     │
│ payment method to keep your subscription    │
│ active.                                     │
│                                             │
│ [Update Payment]                            │
└─────────────────────────────────────────────┘
```

**Copy:** "Your payment failed. Please update your payment method to keep your subscription active."
**Button:** "Update Payment" 
- → Call `POST /subscription-portal-session` 
- → Opens portal to update payment method

---

#### When subscription_status = "canceled"

```
┌─────────────────────────────────────────────┐
│ SUBSCRIPTION                                │
├─────────────────────────────────────────────┤
│ Plan: Standard (Ending)                     │
│ Status: Ending July 4, 2026                 │
│                                             │
│ Your subscription will end on July 4. You   │
│ will be downgraded to the Free plan.        │
│ Your credential will remain accessible.     │
│                                             │
│ [Reactivate] or [Close]                     │
└─────────────────────────────────────────────┘
```

**Copy:** "Your subscription will end on [current_period_end]. You will be downgraded to the Free plan. Your credential will remain accessible."
**Buttons:**
- "Reactivate" → Opens plan selection (`/account-select`)
- "Close" → Dismisses card (or just show it permanently as informational)

---

#### When subscription_status = "unpaid"

```
┌─────────────────────────────────────────────┐
│ SUBSCRIPTION                                │
├─────────────────────────────────────────────┤
│ Plan: Standard                              │
│ Status: ⚠️ Account At Risk                   │
│                                             │
│ Your account has unpaid charges. Your       │
│ subscription access is limited.             │
│                                             │
│ [Resolve Now]                               │
└─────────────────────────────────────────────┘
```

**Copy:** "Your account has unpaid charges. Your subscription access is limited."
**Button:** "Resolve Now"
- → Call `POST /subscription-portal-session`
- → Opens portal to resolve charges

---

#### When subscription_status = "incomplete"

```
┌─────────────────────────────────────────────┐
│ SUBSCRIPTION                                │
├─────────────────────────────────────────────┤
│ Plan: Standard                              │
│ Status: ⚠️ Payment Incomplete                │
│                                             │
│ Complete your payment to activate your      │
│ subscription.                               │
│                                             │
│ [Complete Payment]                          │
└─────────────────────────────────────────────┘
```

**Copy:** "Complete your payment to activate your subscription."
**Button:** "Complete Payment"
- → Call `POST /subscription-portal-session`
- → Opens portal to complete payment

---

## Implementation Notes

### API Call Pattern

```typescript
// When user clicks "Manage Subscription" button
const response = await fetch('/subscription-portal-session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`, // from Supabase
  },
});

if (response.ok) {
  const { url } = await response.json();
  window.open(url, '_blank'); // Open in new tab/window
} else {
  // Show error: "Billing temporarily unavailable; try again later"
  showError('Unable to open subscription management. Please try again.');
}
```

### Status Polling

After user returns from Stripe portal, refresh `/dashboard-status` to show updated subscription state:

```typescript
// After portal closes or on page focus
setTimeout(() => {
  refreshDashboardStatus(); // Reload subscription state
}, 2000);
```

### Conditional Rendering

```typescript
const showManageButton = can_manage_subscription && subscription_tier !== 'free';
const showUpgradeButton = subscription_tier === 'free';
const showWarning = ['past_due', 'unpaid', 'incomplete'].includes(subscription_status);
```

### Copy Guidelines

**DO:**
- ✅ "Your subscription will end on [date]"
- ✅ "You will be downgraded to the Free plan"
- ✅ "Your credential will remain accessible"
- ✅ "Next billing date: [date]"

**DON'T:**
- ❌ "Your subscription was canceled" (use "ending" or "will end")
- ❌ Imply credential is deleted or unavailable
- ❌ Show "$1.99 share link" or "PDF export" for Free users
- ❌ Make subscription management sound confusing

---

## Error Handling

### Portal Session Creation Fails (503)

```
┌─────────────────────────────────────────────┐
│ SUBSCRIPTION                                │
├─────────────────────────────────────────────┤
│ Plan: Standard                              │
│ Status: Active                              │
│                                             │
│ ⚠️ Billing temporarily unavailable.          │
│ Please try again in a moment.               │
└─────────────────────────────────────────────┘
```

**Action:** Disable button, show error, auto-retry in background

### No Stripe Customer (404)

```
┌─────────────────────────────────────────────┐
│ SUBSCRIPTION                                │
├─────────────────────────────────────────────┤
│ Plan: Standard                              │
│ Status: Not confirmed                       │
│                                             │
│ Your subscription is not linked to          │
│ billing. Contact support@passtodigital.com  │
└─────────────────────────────────────────────┘
```

**Action:** Hide button, show support email

---

## Testing Checklist

- [ ] Free tier → Shows "You're on Free plan" + "View Plans" button
- [ ] Active subscription → Shows plan, status, renewal date, "Manage Subscription" button
- [ ] Manage Subscription click → Opens Stripe portal in new tab
- [ ] Portal closes → Dashboard refreshes to show updated status
- [ ] Canceled subscription → Shows "Ending [date]" + "Reactivate" option
- [ ] Past due → Shows warning + "Update Payment" button
- [ ] Error case (503) → Shows friendly error message, button disabled
- [ ] No stripe_customer (404) → Shows support email, no button
- [ ] Copy is clear and reassuring (no "deletion" language)

---

## Design System

**Card styling:** Use same pattern as credential/wallet cards
**Typography:** Heading (plan name), subheading (status), body (copy)
**Colors:**
- Normal state: Standard color scheme
- Warning state (past_due, incomplete): Yellow/amber warning color
- Error state (unpaid): Red error color

**Buttons:**
- Primary action: Standard blue button (Manage Subscription, View Plans)
- Secondary action: Ghost button (Close, if shown for canceled)
- Warning action: Yellow/amber button (Update Payment, Resolve Now)

---

## Related Backend

- **Endpoint:** `GET /dashboard-status` → returns subscription fields
- **Endpoint:** `POST /subscription-portal-session` → creates Stripe portal URL
- **Function:** `subscription-portal-session/index.ts` (already deployed)
- **Stripe:** Customer Portal (configured via Stripe Dashboard)

---

**Ready to implement. All backend endpoints deployed and tested.**
