# Lovable Prompt: Gate /update-password Route to Recovery Context Only

**Task:** QA-005 remediation — Add recovery context validation to `/update-password` route

**Priority:** P1 (security/UX risk)

**Date:** 2026-06-04

---

## Background

The `/update-password` route currently renders the "Set new password" form on direct navigation, regardless of whether the user has a valid recovery context.

**Current behavior (incorrect):**
- No session + no recovery token → Form visible (❌ should show error)
- No session + valid recovery token → Form visible (✅ correct)
- Session active + no recovery token → Form visible (✅ correct — user can change own password)

**Expected behavior:**
- No session + no recovery token → "Invalid or expired recovery link" message
- No session + valid recovery token → Form visible
- Session active + no recovery token → Form visible
- Session active + recovery token → Form visible

**Finding:** QA-A11 (2026-06-03) confirmed form visible on cold visit to `/update-password` with no session and no recovery token.

---

## What to Implement

### 1. Recovery Context Detection

On `/update-password` component mount, check:

```
const recoveryToken = window.location.hash
  .substring(1)
  .split("&")
  .find(param => param.startsWith("type=recovery"))

const { data: { session } } = await supabase.auth.getSession()

const hasRecoveryContext = !!recoveryToken || !!session
```

### 2. Conditional Rendering

**If no recovery context:**
```
<div className="error-message">
  <h2>Invalid or Expired Recovery Link</h2>
  <p>
    Your password recovery link has expired or is invalid.
    Please request a new password reset from the login page.
  </p>
  <Link to="/reset-password">Request New Password Reset</Link>
</div>
```

**If recovery context present:**
```
<form>
  {/* "Set new password" form as currently implemented */}
</form>
```

### 3. Error State Styling

Use existing PassTo design system for error message:
- Heading: P1 size, primary text color
- Body: secondary text color
- Link: Link color (blue), underline on hover
- Container: Optional light error background

---

## Acceptance Criteria

✅ **Direct visit, no session, no token:**
- URL: `https://app.passtodigital.com/update-password`
- Display: "Invalid or Expired Recovery Link" message
- Form: NOT visible
- Link to `/reset-password` present

✅ **Valid PASSWORD_RECOVERY link from email:**
- URL: `https://app.passtodigital.com/update-password#type=recovery&...`
- Display: "Set new password" form
- Form visible and usable

✅ **Signed-in user (no token fragment):**
- URL: `https://app.passtodigital.com/update-password` (with active session in localStorage)
- Display: "Set new password" form
- User can change their own password

✅ **Form submission still works:**
- Valid password → Success message → Redirect to login (or dashboard if already signed in)
- Invalid password → Error message
- Network error → Error toast

✅ **TypeScript compiles cleanly**
✅ **No broken imports**

---

## Test Plan (Claude will execute after deployment)

Once deployed, QA will verify:

1. Direct visit (no session, no token) → Error message displayed
2. Valid recovery link → Form displayed
3. Signed-in user visit → Form displayed
4. Form submission → Still functional

---

## Related Context

- **Password recovery flow (working):** Email sent → recovery link → form loads → password set (confirmed working in QA-A10/A12)
- **Bug scope:** Only affects direct-visit path with no recovery context
- **User impact:** Confusing UX; user sees password form when they shouldn't
- **Security impact:** Low (form submission still validates recovery token server-side)

---

## Timeline

- **Execution:** Add recovery context check, conditional rendering
- **Verification:** After deployment (within minutes)
- **QA closure:** After live verification confirms error message on direct visit

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
