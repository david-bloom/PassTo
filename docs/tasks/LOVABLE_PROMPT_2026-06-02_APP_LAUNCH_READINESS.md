# Lovable Prompt — App Project Launch Readiness Fixes

**Date:** 2026-06-02
**Target Lovable project:** `9a223cc4-ef58-43d4-929a-4c0424b586c2`
**Target domain:** `https://app.passtodigital.com`
**Related task:** Launch-readiness QA findings post-TASK-0066
**Audience:** Lovable
**Source:** Codex read-only QA + Claude live-route QA (2026-06-02)

---

## How to use this prompt

Paste the **Lovable instructions block** below into the Lovable chat for the App project. The prompt is structured by severity (P0 → P2). Each issue is self-contained with acceptance criteria and a test.

**Before pasting:** edit the `/verify-demo` section (currently marked as DECISION PENDING — David picks one of remove/gate/keep). Once you've chosen, replace that section's text with the chosen approach. Do not paste this prompt to Lovable with the decision-pending placeholder still in it.

---

## Backend constraints Lovable should NOT change

- Supabase Auth URL Configuration (already correct: Site URL = `https://app.passtodigital.com`, exact redirect URLs).
- Edge Function source for `dashboard-status`, `share-link-create`, `token-verify` (CORS already locked to App domain — TASK-0066 done).
- `dashboard-status` response shape — Lovable should adapt to it, not request schema changes.

If Lovable believes a backend change is required, escalate to David rather than changing Edge Function code.

---

## ─── BEGIN LOVABLE INSTRUCTIONS BLOCK ────────────────────────────────────

```
Comprehensive launch-readiness fixes for app.passtodigital.com (project
9a223cc4-ef58-43d4-929a-4c0424b586c2). Based on a Codex review + live QA
findings. Severity-ranked. Each issue has acceptance criteria and a test.

═══════════════════════════════════════════════════════════════════════════
P0 — Wire the Share Credential button (BLOCKS the MVP demo flow)
═══════════════════════════════════════════════════════════════════════════

Current state: dashboard shows "Share Credential — Coming Soon" with a
disabled button and caption "Shareable credential links will be available
soon."

Required: connect the button to the existing share-link-create Edge
Function. Backend is ready.

Implementation:

1. Remove the "Coming Soon" badge and the placeholder caption.

2. Read share_link_eligible and share_link_reason from the existing
   dashboard-status response. The fetch already happens — surface the
   fields.

3. Render the button enabled when share_link_eligible === true.
   When share_link_eligible === false, render disabled with a tooltip
   showing share_link_reason (credential_not_active, license_not_active,
   license_match_not_passed, entitlement_not_confirmed).

4. On click of an enabled "Share Credential" button:
     const { data: { session } } = await supabase.auth.getSession()
     const res = await fetch(
       "https://wvzjfxacykgsaffskgtr.functions.supabase.co/share-link-create",
       {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${session.access_token}`,
         },
       }
     )
     const body = await res.json()
     // body.share_url, body.expires_at, body.token_type
   - On 200: show a modal/toast with the share_url. Provide
     "Copy link" and "Open" actions. Display body.expires_at
     in a friendly format ("Expires in 72 hours" or absolute time).
     The raw share token is returned ONCE — do not re-request the
     same token; if the user needs another, generate a new one.
   - On error: show body.error verbatim plus a friendly preamble.

5. Acceptance:
   - test-nurse-001@passtodigital.com signs in → /dashboard → clicks
     "Share Credential" → receives a share_url like
     https://passtodigital.com/v/<token-hex>.
   - Opening that URL in another browser hits app.passtodigital.com/v/<token>
     (verifier form already works there).
   - Verifier submits → credential displays.

═══════════════════════════════════════════════════════════════════════════
P1 — /verify-demo route disposition
═══════════════════════════════════════════════════════════════════════════

** DECISION PENDING FROM DAVID — REPLACE THIS SECTION WITH ONE OF:       **
**   OPTION A: Remove the route entirely. Delete /verify-demo and its    **
**   component files; remove any links/imports pointing at it. Acceptance**
**   GET https://app.passtodigital.com/verify-demo returns 404.          **
**                                                                       **
**   OPTION B: Keep with prominent DEMO labeling. Add a full-width amber **
**   banner across the top: "DEMO — fabricated data for sales/marketing **
**   illustration. Not a real verification." Also rename page title to  **
**   "Demo — PassTo Verification (NOT A REAL CREDENTIAL)". Acceptance:   **
**   visiting /verify-demo immediately shows the banner above the fold.  **
**                                                                       **
**   OPTION C: Gate behind a /demo/ subpath or auth wall.                **
**                                                                       **
** Do not paste this prompt to Lovable with this placeholder still here. **

═══════════════════════════════════════════════════════════════════════════
P1 — Redirect signed-in users away from "/"
═══════════════════════════════════════════════════════════════════════════

Current state: when a user has a valid Supabase session in localStorage
and navigates to https://app.passtodigital.com/, the "Welcome back —
Sign in" form is shown instead of /dashboard.

Required: in the root route component, subscribe to
supabase.auth.onAuthStateChange (or check getSession on mount with the
same wait-for-hydration pattern used in /dashboard). If session is
present and non-expired, replace-navigate to /dashboard. Only render
the login form when session is null.

Test: while signed in, visit /. Expected: brief loading state →
auto-redirect to /dashboard. Do NOT show the sign-in form.

═══════════════════════════════════════════════════════════════════════════
P1 — Fix "Wallet Passes Preparing" messaging
═══════════════════════════════════════════════════════════════════════════

Current state: dashboard shows amber "Wallet Passes Preparing — Your
wallet passes are being prepared. This usually takes a moment."
even when no wallet pass attempt has ever been made.

Backend (dashboard-status) returns:
  wallet.apple.status / wallet.google.status which can be:
    "not_attempted"  — no row exists yet (never started)
    "pending"        — row exists, awaiting PassKit
    "issued"         — wallet pass live; pass_url / save_url populated
    "voided"         — pass cancelled
    "error"          — pass generation failed

Required UI behavior:

  not_attempted → "Wallet pass not yet created" + (optional) action button
                  "Add to Apple Wallet" / "Add to Google Wallet" if/when
                  PassKit issuance is wired up. For now, neutral status
                  text — NOT amber, NOT "preparing".

  pending       → "Wallet pass preparing" (the current amber state — keep
                  this copy here, just gate it to status === "pending").

  issued        → "Available in [Apple/Google] Wallet" + the actual
                  add-to-wallet button using pass_url (Apple) or
                  save_url (Google).

  voided/error  → red error state with retry option.

Acceptance: for test-nurse-001 (status = not_attempted on both providers),
dashboard shows neutral "not yet created" text, not amber "preparing".

═══════════════════════════════════════════════════════════════════════════
P1 — /update-password recovery-session check
═══════════════════════════════════════════════════════════════════════════

Current state: visiting /update-password directly renders the
"Set new password" form regardless of session state. The component
calls supabase.auth.updateUser({ password }) on submit.

Required: on /update-password mount,
  1. Subscribe to onAuthStateChange.
  2. Accept ONE of these states for rendering the form:
     a. event === "PASSWORD_RECOVERY" (user arrived via reset-password
        email link — Supabase emits this on the recovery callback)
     b. session is present AND user is intentionally changing password
        from inside their account.
  3. If neither, show "Invalid or expired recovery link" with a link
     back to /reset-password.

Acceptance:
  - Visiting /update-password in a fresh incognito (no session) shows
    the "invalid link" message, NOT the password form.
  - Visiting /update-password via a real Supabase password-reset email
    link shows the form and updateUser succeeds.
  - Visiting /update-password while signed in shows the form (intentional
    password change) and updateUser succeeds.

═══════════════════════════════════════════════════════════════════════════
P2 — Clean up Lovable defaults in deployed HTML
═══════════════════════════════════════════════════════════════════════════

Current state: deployed index.html still contains:
  <title>Lovable App</title>  (or similar default)
  og:title / og:description / og:image with Lovable defaults
  Lovable "Edit with Lovable" floating badge visible in production

Required:
  1. Set <title> to "PassTo — Digital Nurse Credential" (or similar).
  2. Set og:title, og:description, og:image, twitter:* tags for PassTo
     with appropriate brand copy and an OG share image.
  3. Disable the Lovable edit badge for the production deployment
     (Lovable usually has a setting to hide this in published builds).

Acceptance:
  - view-source on https://app.passtodigital.com/ shows PassTo metadata,
    not Lovable defaults.
  - No "Edit with Lovable" badge visible on the deployed site.

═══════════════════════════════════════════════════════════════════════════
P2 — Per-route page titles
═══════════════════════════════════════════════════════════════════════════

Current state:
  /                  shows "Lovable App"
  /reset-password    shows "Lovable App"
  /update-password   shows "Lovable App"
  /dashboard         shows "Your Credential — PassTo"        ✓
  /v/:token          shows "Verify Credential — PassTo"      ✓

Required: set <title> per route using react-router or a useEffect that
updates document.title on mount:
  /                  → "Sign In — PassTo"
  /reset-password    → "Reset Password — PassTo"
  /update-password   → "Set New Password — PassTo"
  (leave /dashboard and /v/:token as-is)

═══════════════════════════════════════════════════════════════════════════
P2 — Add minimal header with sign-out on authenticated routes
═══════════════════════════════════════════════════════════════════════════

Current state: signed-in /dashboard has no header, no nav, no way to
sign out.

Required: add a slim top header (just on authenticated routes) with:
  - "PassTo" wordmark on the left (links to /dashboard)
  - User email or account icon on the right with a dropdown or button
    that calls supabase.auth.signOut() then navigates to /
  - Keep it minimal — full nav can come later.

═══════════════════════════════════════════════════════════════════════════
Test plan for the whole prompt
═══════════════════════════════════════════════════════════════════════════

1. Visit / while signed in → auto-redirect to /dashboard.
2. /dashboard shows credential card + share button ENABLED + correct
   wallet-pass status text + a sign-out option in the header.
3. Click Share Credential → modal with share URL → copy and open in
   another browser → verifier flow works.
4. /verify-demo handled per David's chosen option above.
5. View page source on / → PassTo title + OG tags, no Lovable defaults.
6. /update-password without session → "Invalid link" message.

Out of scope:
- Enrollment project (separate domain).
- Edge Function code changes (backend is correct).
- Supabase Auth configuration.
- Subscription/payments UI.
```

## ─── END LOVABLE INSTRUCTIONS BLOCK ──────────────────────────────────────

---

## Deliverable for Codex QA (after Lovable applies)

Paste back into the TASK-0066 issue:

1. List of files edited in the App Lovable project
2. Confirmation that each acceptance criterion above passes live
3. Outcome of the test plan (steps 1–6)
4. Any deviations from the prompt with reasoning
