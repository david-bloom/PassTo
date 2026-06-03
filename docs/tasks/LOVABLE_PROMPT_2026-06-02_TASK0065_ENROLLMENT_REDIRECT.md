# Lovable Prompt — Enrollment App `redirectTo` Correction (TASK-0065 remediation)

**Date:** 2026-06-02
**Target Lovable project:** `d279ccd3-8397-4e7b-933c-8f5c8468d19e`
**Target domain:** `https://enroll.passtodigital.com`
**Related task:** TASK-0065 (Supabase Auth password reset redirect fix)
**Approval:** Codex Approve-With-Modifications recorded as APPROVAL-0026 (2026-06-02)
**Audience:** Lovable

---

## Why this prompt exists

The Supabase Auth URL Configuration was updated to:

- **Site URL:** `https://app.passtodigital.com`
- **Redirect allow-list:**
  - `https://app.passtodigital.com/update-password`
  - `https://app.passtodigital.com/reset-password`
  - `https://app.passtodigital.com/dashboard`
  - `https://enroll.passtodigital.com/post-login`
  - `https://enroll.passtodigital.com/id-verification`

Site URL is the **default** post-auth redirect when no explicit `redirectTo` is passed. Without an explicit `redirectTo`, the enrollment app's auth events (sign-up confirmation, magic link, sign-in) will hand nurses off to `https://app.passtodigital.com/…` even when they are mid-onboarding and the destination route does not exist on that domain. This is the bug that produced the 404 on `https://app.passtodigital.com/id-verification`.

This prompt instructs Lovable to pass an explicit enrollment-domain `redirectTo` at every Supabase Auth call site in the enrollment app, so mid-onboarding nurses remain on `enroll.passtodigital.com`.

---

## Scope

Enrollment Lovable project only (`d279ccd3-8397-4e7b-933c-8f5c8468d19e`).

**Do NOT** edit the app project (`9a223cc4-…`) or the marketing project (`6c973fd1-…`) from this prompt. Those have separate prompts where applicable.

---

## Required code change

Find every call site in the enrollment project that invokes Supabase Auth and add an explicit `redirectTo` / `emailRedirectTo` value targeting the enrollment domain.

### Call sites to update

Search the enrollment project for these Supabase Auth methods:

```text
supabase.auth.signUp
supabase.auth.signInWithOtp
supabase.auth.signInWithOAuth
supabase.auth.resend
supabase.auth.verifyOtp
supabase.auth.resetPasswordForEmail
```

### Pattern — `signUp` and `signInWithOtp` (magic link / email confirmation)

These methods use `options.emailRedirectTo`:

```ts
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: "https://enroll.passtodigital.com/post-login"
  }
})
```

```ts
await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: "https://enroll.passtodigital.com/post-login"
  }
})
```

If the enrollment project does **not** yet have a `/post-login` route, use this fallback instead:

```ts
emailRedirectTo: "https://enroll.passtodigital.com/id-verification"
```

Both URLs are on the Supabase allow-list, so either is accepted by Supabase. Prefer `/post-login` if it exists or you create it; it is the canonical post-auth router that should read profile/onboarding state and forward to `/id-verification`, `/license`, `/complete`, etc.

### Pattern — `signInWithOAuth`

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: "https://enroll.passtodigital.com/post-login"
  }
})
```

### Pattern — `signInWithPassword` (no redirect URL needed)

`signInWithPassword` does **not** trigger a Supabase email and does **not** use the auth redirect URL list. After a successful password sign-in, the client receives a session immediately. Routing the user to the right next page (id-verification vs license vs dashboard vs `/post-login`) must happen client-side based on profile/onboarding state. If your enrollment app currently hardcodes a post-`signInWithPassword` navigation to `https://app.passtodigital.com/…`, change it to either:

- `https://enroll.passtodigital.com/post-login` (preferred, if `/post-login` routes based on state), or
- a client-side check that picks the correct `enroll.passtodigital.com/<next-step>` path

### Pattern — `resetPasswordForEmail`

The enrollment app does **not** own password reset. Password reset lives in the app project (`9a223cc4-…`) under TASK-0065. If the enrollment app exposes a "Forgot password" link, point that link to the app domain:

```ts
window.location.href = "https://app.passtodigital.com/reset-password"
```

Do **not** call `supabase.auth.resetPasswordForEmail` from the enrollment app.

---

## Optional but recommended — add `/post-login` route

Add a new client-side route `/post-login` in the enrollment app:

1. On mount, read the authenticated user's `profile.onboarding_step` (and any other relevant fields like `id_verification_status`, `license_id`).
2. Based on state, `replace`-navigate to:
   - `/id-verification` if `id_verification_status !== "verified"`
   - `/license` if license not yet linked
   - `/credential` if credential not yet generated
   - `/wallet` if wallet pass not yet enrolled
   - `https://app.passtodigital.com/dashboard` if onboarding is complete
3. Show a brief loading state ("Signing you in…") while routing.

This route should never be the user's permanent destination — it is a one-shot router fired by Supabase auth callbacks.

---

## Out of scope for this prompt

- App project routes or auth code (separate prompt: `LOVABLE_PROMPT_2026-06-02_TASK0065_APP_RESET.md`)
- Edge Function CORS allow-list (separate task: TASK-0066, awaiting approval)
- Email template content
- Supabase Auth URL Configuration (already updated by Claude)

---

## Deliverable for Codex QA

Paste back into the TASK-0065 issue:

1. List of file paths edited in the enrollment Lovable project
2. Before / after snippets for each auth call site
3. Whether `/post-login` was added (yes/no, route file path)
4. Live test result: trigger a fresh sign-up on `enroll.passtodigital.com`; confirm the confirmation email link lands on `enroll.passtodigital.com/<route>` (not `app.passtodigital.com/id-verification`)
