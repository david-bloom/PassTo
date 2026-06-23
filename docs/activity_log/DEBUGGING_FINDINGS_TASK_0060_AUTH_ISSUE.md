# TASK-0060 Debugging Findings: Magic-Link Authentication Session Persistence Issue

**Date:** 2026-06-04  
**Task:** TASK-0060 - Reconcile Stripe Checkout End-to-End Readiness  
**Status:** Identified blocker, requires Lovable fix  
**Priority:** Critical — blocks real Stripe checkout execution

---

## Executive Summary

Magic-link authentication works (tokens are generated and redirect works), but **Lovable's Supabase client does not persist the session to localStorage or make it available to the Payment component**. This prevents the Stripe checkout call from authenticating with a valid JWT.

The root cause is a **mismatch between Lovable's Supabase client configuration (PKCE flow) and how Supabase returns magic-link tokens (hash fragments)**.

---

## Problem Statement

### User Journey
1. ✅ User clicks magic link: `https://wvzjfxacykgsaffskgtr.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=https://enroll.passtodigital.com/payment`
2. ✅ Supabase verify endpoint validates token and redirects with session tokens in URL hash
3. ✅ Browser loads `/payment` page
4. ❌ Lovable Supabase client does NOT detect tokens in URL hash
5. ❌ Session is NOT persisted to localStorage
6. ❌ Payment component cannot retrieve session, JWT is missing
7. ❌ `stripe-checkout-create` Edge Function call returns 401 Unauthorized

### Blocker: Session Missing at Payment Step

```javascript
[Payment] initial getSession: {
  hasSession: false,
  hasAccessToken: false,
  userId: undefined,
  rawStoragePresent: false
}

[Payment] handleSubscribe session details:
- access_token: MISSING
- user: MISSING
- user.id: MISSING
- localStorage['passto-supabase-auth']: not present
```

---

## Root Cause Analysis

### Issue 1: Missing Redirect URL Whitelist ✅ FIXED

**Finding:** The redirect URL `https://enroll.passtodigital.com/payment` was not whitelisted in Supabase project authentication settings.

**Impact:** Supabase's `/auth/v1/verify` endpoint was not including session tokens in the redirect response.

**Fix Applied:** Added `https://enroll.passtodigital.com/payment` to Supabase Auth → Redirect URLs whitelist.

**Evidence After Fix:**
```
URL after redirect: 
https://enroll.passtodigital.com/payment#access_token=eyJh...&refresh_token=4i43qshmnnuw&type=magiclink
```
✅ Tokens are now present in URL hash

---

### Issue 2: Client Configuration Mismatch — REQUIRES LOVABLE FIX

**Finding:** Tokens are present in URL hash, but Lovable's Supabase client is NOT parsing them.

**Root Cause:** Flow type mismatch:
- **Magic-link behavior:** Supabase returns tokens in URL **hash fragment** (anchor): `#access_token=...&refresh_token=...`
- **Lovable client config:** `flowType: "pkce"` with `detectSessionInUrl: true`
- **PKCE flow expectation:** Tokens in **query parameters** from OAuth response, not hash fragments
- **Result:** Client ignores hash tokens even though `detectSessionInUrl: true` is set

**Evidence:**

1. **Network Tab:** No `/auth/v1/user` calls made on page load
   - Expected: Client should make call to retrieve session from HTTP-only cookie
   - Observed: No auth calls at all
   - Reason: Client doesn't know there's a session to retrieve

2. **URL Analysis:** Tokens present but not processed
   ```
   URL Hash: #access_token=eyJh...&refresh_token=4i43qshmnnuw&type=magiclink
   localStorage['passto-supabase-auth']: empty
   Session availability: none
   ```

3. **Console Output After Page Refresh:**
   ```javascript
   // Even after refresh with tokens in URL:
   {hasSession: false, hasAccessToken: false, rawStoragePresent: false}
   ```

---

## Required Fix: Lovable Supabase Client Configuration

### Option A: Change Flow Type (RECOMMENDED)

For magic-link authentication, the client should use implicit flow for hash-based tokens:

```javascript
// Current (broken for magic-links):
const supabase = createClient(url, key, {
  detectSessionInUrl: true,
  flowType: "pkce"  // ← PKCE is for OAuth, not magic-links
});

// Should be (for magic-links):
const supabase = createClient(url, key, {
  detectSessionInUrl: true,
  flowType: "implicit"  // ← For hash-based tokens from magic-links
});
```

**Why:** Implicit flow is designed to parse tokens from URL hash fragments, which is how magic-link redirects work.

---

### Option B: Explicit Session Retrieval

If PKCE flow must be kept, add explicit code to Payment component initialization:

```javascript
// On /payment component mount:
const { data: { session }, error } = await supabase.auth.getSession();

if (session) {
  // Session successfully retrieved from URL tokens
  // Store to localStorage if needed
  localStorage.setItem('passto-supabase-auth', JSON.stringify(session));
} else if (error) {
  console.error('Failed to get session:', error);
}
```

This manually processes the URL tokens that PKCE flow isn't detecting.

---

## Testing Evidence

### Before Redirect URL Fix
```
Network: No /auth/v1/verify request visible
Console: [Supabase Init] sessionFromStorage: null
Console: [Supabase Auth Event] hasSession: false
Result: ❌ Session not created at all
```

### After Redirect URL Fix + Before Client Config Fix
```
Network: /auth/v1/verify request returns 302 redirect
URL: https://enroll.passtodigital.com/payment#access_token=eyJh...
Console: [Payment] initial getSession: {hasSession: false}
Result: ❌ Tokens in URL but not detected by client
```

### Expected After Lovable Fix
```
Network: /auth/v1/verify returns tokens in redirect
URL: https://enroll.passtodigital.com/payment#access_token=eyJh...
Console: [Payment] initial getSession: {hasSession: true, userId: "bd7db485-..."}
localStorage['passto-supabase-auth']: session persisted
Result: ✅ Payment component can call stripe-checkout-create with valid JWT
```

---

## Acceptance Criteria Impact

| Criterion | Status | Blocker |
|-----------|--------|---------|
| A real test checkout through Lovable completes | ❌ BLOCKED | Yes — Can't authenticate |
| `subscriptions.profile_id` populated | Pending | Depends on #1 |
| `subscriptions.status` matches plan | Pending | Depends on #1 |
| `payments` records `subscription_start` | Pending | Depends on #1 |
| `stripe_events` records event | Pending | Depends on #1 |
| Profile advances after webhook | Pending | Depends on #1 |
| No Stripe secrets exposed | ✅ VERIFIED | No |

---

## Recommended Next Steps

### For David / Lovable

1. **Review Lovable's Supabase client configuration** in the enrollment bundle
   - Check `flowType` setting
   - Verify `detectSessionInUrl` behavior
   
2. **Implement one of the fixes above:**
   - Option A: Change to `flowType: "implicit"` (cleanest)
   - Option B: Add explicit `getSession()` call on `/payment` mount (workaround)

3. **Test the magic-link flow:**
   - Load magic link
   - Verify `localStorage['passto-supabase-auth']` contains session
   - Verify `[Payment] initial getSession` shows valid `hasSession: true`
   - Verify Stripe checkout call succeeds with 200 response

### For Claude (Post-Fix Verification)

1. ✅ Execute real Stripe test checkout with test card `4242 4242 4242 4242`
2. ✅ Verify `subscriptions` table updated from webhook
3. ✅ Verify `payments` table updated
4. ✅ Verify `stripe_events` idempotency
5. ✅ Verify profile advancement to next step
6. ✅ Document evidence and mark TASK-0060 complete

---

## Technical Details

### Magic-Link Flow (Post-Fix)

```
1. User requests magic link
   → POST /auth/v1/otp
   → Supabase generates token

2. User clicks link
   → GET /auth/v1/verify?token=...&redirect_to=...
   
3. Supabase verify endpoint (with redirect URL whitelisted)
   → Validates token ✅
   → Creates session ✅
   → REDIRECTS with tokens in hash ✅
   → https://enroll.passtodigital.com/payment#access_token=...&refresh_token=...

4. Lovable app loads /payment
   → Supabase client detects URL hash tokens (needs fix)
   → Client parses and stores to localStorage (needs fix)
   → Payment component retrieves session
   → session.access_token available
   → stripe-checkout-create call succeeds ✅
```

### Cross-Domain Cookie Issue (RESOLVED)

**Earlier finding:** HTTP-only session cookies set by `supabase.co` cannot be sent to `passtodigital.com` domain.

**Resolution:** Supabase returns tokens in redirect URL hash instead, avoiding cookie domain issues. This works once client is configured to detect hash tokens.

---

## Files/Components Affected

- **Lovable enrollment bundle** — Supabase client initialization (needs config fix)
- **Lovable /payment route** — Depends on fixed session availability
- **stripe-checkout-create Edge Function** — v13, `verify_jwt: true` ✅ (working correctly)
- **Supabase Auth settings** — Redirect URL whitelist ✅ (now fixed)

---

## Security & RLS Impact

- ✅ No Stripe secrets exposed to Lovable
- ✅ No RLS violations
- ✅ Session authentication still required
- ✅ Fix maintains security boundaries

---

## References

- **Supabase Docs:** [Magic Links](https://supabase.com/docs/guides/auth/auth-magic-link)
- **Supabase JS SDK:** [Flow Types](https://supabase.com/docs/reference/javascript/initializing)
- **PKCE vs Implicit Flow:** [OAuth 2.0 Flow Selection](https://auth0.com/docs/get-started/authentication-and-authorization-flow)

---

## Sign-Off

**Debugging Completed By:** Claude  
**Date:** 2026-06-04  
**Status:** Awaiting Lovable configuration fix to proceed with TASK-0060 acceptance testing

**Next Milestone:** Once Lovable fixes client configuration, TASK-0060 can be completed within 1-2 hours (real checkout + webhook verification).
