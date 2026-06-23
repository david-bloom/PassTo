# Lovable Prompt — App Project Password Reset `redirectTo` (TASK-0065)

**Date:** 2026-06-02
**Target Lovable project:** `9a223cc4-ef58-43d4-929a-4c0424b586c2`
**Target domain:** `https://app.passtodigital.com`
**Related task:** TASK-0065 (Supabase Auth password reset redirect fix)
**Approval:** Codex Approve-With-Modifications recorded as APPROVAL-0026 (2026-06-02)
**Audience:** Lovable

---

## Why this prompt exists

Password reset for PassTo nurses runs on the App project at `https://app.passtodigital.com`. The Supabase Auth URL Configuration was updated so that:

- **Site URL:** `https://app.passtodigital.com`
- **Allow-listed reset routes:**
  - `https://app.passtodigital.com/reset-password` (user requests a reset here)
  - `https://app.passtodigital.com/update-password` (recovery link lands here)

Supabase requires the `resetPasswordForEmail` call to pass an explicit `redirectTo` that matches an allow-list entry. Without it, the recovery email link will fall back to the Site URL with no specific path, which is **not** the working update-password route.

---

## Scope

App Lovable project only (`9a223cc4-ef58-43d4-929a-4c0424b586c2`).

**Do NOT** edit the enrollment project (`d279ccd3-…`) from this prompt. That has a separate prompt (`LOVABLE_PROMPT_2026-06-02_TASK0065_ENROLLMENT_REDIRECT.md`).

---

## Required code change

### 1. `resetPasswordForEmail` call site (the "Forgot password" form on `/reset-password`)

Find the call to `supabase.auth.resetPasswordForEmail` and add an explicit `redirectTo`:

```ts
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: "https://app.passtodigital.com/update-password"
})
```

Acceptance check: the value must match a Supabase Auth redirect allow-list entry **exactly** (scheme + host + path). The allow-listed string is `https://app.passtodigital.com/update-password`.

### 2. `/update-password` route — recovery session handling

The `/update-password` route is what the user lands on after clicking the recovery email link. Supabase delivers a `PASSWORD_RECOVERY` event to `supabase.auth.onAuthStateChange` when the user arrives via that link. The route must:

1. Subscribe to `onAuthStateChange` and detect the `PASSWORD_RECOVERY` event.
2. Render the "Set new password" form.
3. On submit, call `supabase.auth.updateUser({ password: newPassword })`.
4. On success, route the user to `/dashboard` (which is allow-listed) or to a confirmation screen.

If the route already does this, no change is needed beyond verifying the redirect value above.

### 3. `signInWithPassword` post-sign-in routing

`signInWithPassword` does **not** use the Supabase redirect URL list — the client receives a session directly. After a successful password sign-in:

- If the nurse is fully enrolled, route to `/dashboard` (this is in scope of the app project)
- If the nurse is **not** yet fully enrolled (i.e. `profile.onboarding_step` is incomplete), redirect them to `https://enroll.passtodigital.com/post-login` so they can finish onboarding

Do **not** silently leave a partially-enrolled user on the app domain — they will hit broken routes (this is what produced the original `app.passtodigital.com/id-verification` 404).

### 4. `signUp` — should not be called from the app project

Sign-up belongs to the enrollment project. The app project's sign-in screen should expose a "Don't have an account? Sign up" link that points to:

```text
https://enroll.passtodigital.com
```

Do **not** call `supabase.auth.signUp` from the app project.

---

## Out of scope for this prompt

- Enrollment project routes (separate prompt)
- New password complexity rules
- Multi-factor / passkey rollout
- Email template content
- Supabase Auth URL Configuration (already updated by Claude)
- Edge Function CORS allow-list (separate task: TASK-0066, awaiting approval)

---

## Deliverable for Codex QA

Paste back into the TASK-0065 issue:

1. File path(s) edited in the app Lovable project
2. Before / after snippets for `resetPasswordForEmail` and any post-sign-in routing changes
3. Confirmation that `/update-password` correctly handles the `PASSWORD_RECOVERY` event
4. Live test result:
   - Trigger a password reset on `https://app.passtodigital.com/reset-password` for a test nurse
   - Confirm the email link host is `app.passtodigital.com` and path is the configured Supabase recovery callback
   - Click the link, confirm landing on `/update-password`, set a new password, confirm sign-in works
