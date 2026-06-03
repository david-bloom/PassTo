# QA Findings Log — PassTo

**File:** `docs/activity_log/QA_FINDINGS_LOG.md`
**Format:** Append-only running register. Finding IDs are permanent. Status
transitions require owner confirmation; Claude (QA Agent) may not move any
finding to `closed`.

**Status vocabulary:**
- `open` — active issue, no fix applied
- `applied` — fix claimed by owner and confirmed by QA Agent observation
- `applied_partial` — fix partially applied; at least one acceptance criterion still unmet
- `decision_pending` — blocked on a human decision before a fix path is known
- `codex_verification_requested` — fix applied; QA Agent recommends Codex verify before status moves to `closed`

---

## QA-001

**Date:** 2026-06-03
**Severity:** P0
**Status:** `codex_verification_requested`
**Surface:** App project (`9a223cc4-ef58-43d4-929a-4c0424b586c2`) — `/dashboard`
**Route:** `https://app.passtodigital.com/dashboard`
**Owner:** Lovable App project
**Related tasks/issues:** TASK-0056, TASK-0058

**Finding:** Share Credential button was disabled and showed "Coming Soon" copy
with caption "Shareable credential links will be available soon" even though
`dashboard-status` Edge Function returned `share_link_eligible: true` for eligible
nurses.

**Evidence:** Pre-run state confirmed via QA-A4 observation (2026-06-03). Backend
gate chain fully satisfied for test-nurse-001. Button UI did not reflect eligibility.

**Remediation applied:** Lovable wired button to `share-link-create` Edge Function
before this QA run. Button renders enabled when `share_link_eligible` is true;
disabled with tooltip from `share_link_reason` when false. Modal shows `share_url`,
expiry, Copy + Open actions.

**QA Agent verification:** QA-A6 (2026-06-03): Edge Function POST → 200, share URL
generated. QA-A8: verifier flow exercised end-to-end using generated token. Dashboard
screenshot (~16:50 UTC) shows "Share Credential" button enabled and share modal with
correct URL host and "Expires in 3 days" copy.

**Codex verification scope:** Confirm `share_link_eligible: false` states render
disabled button with reason tooltip; confirm single-use token enforced server-side
(separately verified in QA-A9).

---

## QA-002

**Date:** 2026-06-03
**Severity:** P0
**Status:** `codex_verification_requested`
**Surface:** App project — post-`signInWithPassword` profile fetch handler
**Route:** `https://app.passtodigital.com/` (login)
**Owner:** Lovable App project
**Related tasks/issues:** —

**Finding:** Every fresh login succeeded at Supabase Auth (200) but the App
immediately showed "Could not load your profile. Please try again." toast and
stayed on the login page. The post-signin handler queried `profiles` with
`select=id_verification_status,onboarding_step,license_id,account_status`.
`profiles.license_id` does not exist as a column. PostgREST returned 400 on
every login attempt going back to at least 02:30 UTC on the same day.

**Evidence:** PostgREST API logs showed repeating pattern:
`POST /auth/v1/token → 200` immediately followed by
`GET /rest/v1/profiles?select=…,license_id,… → 400`. Reproduced live with
test-nurse-001 and test-nurse-002. Browser console confirmed same error URL.

**Remediation applied:** Lovable removed `license_id` from the profiles SELECT,
added `id` instead, and introduced a separate `licenses` table query using
`profile_id` FK for license linkage. PostgREST errors now logged verbatim to console.

**QA Agent verification:** 15:10:32 UTC API logs showed clean login chain:
`POST /auth/v1/token → 200`,
`GET /rest/v1/profiles?select=id,id_verification_status,onboarding_step,account_status → 200`,
`GET /rest/v1/licenses?profile_id=eq.…&is_primary=eq.true → 200`,
then full dashboard-status chain all 200s. No 400s since fix.

**Codex verification scope:** Confirm the fix is the only profiles SELECT call site
in the App project — no other component still references `license_id` from `profiles`.

---

## QA-003

**Date:** 2026-06-03
**Severity:** P0
**Status:** `codex_verification_requested`
**Surface:** Supabase Edge Function `share-link-create` — `SHARE_LINK_BASE_URL` environment variable / function default
**Route:** Share URL returned in function response body
**Owner:** David (Supabase secret config)
**Related tasks/issues:** TASK-0056, APPROVAL-0028

**Finding:** `share-link-create` Edge Function returned `share_url` with host
`https://passtodigital.com/v/…` (marketing domain). The `/v/:token` verifier route
only exists on `app.passtodigital.com`. Clicking the generated share link produced
a 404 on the marketing domain.

**Root cause:** `SHARE_LINK_BASE_URL` Supabase secret was not set. Function source
falls through to hardcoded default:
`Deno.env.get("SHARE_LINK_BASE_URL") ?? "https://passtodigital.com/v"`.

**Remediation applied:** David set Supabase secret `SHARE_LINK_BASE_URL` to
`https://app.passtodigital.com/v` during the QA run (2026-06-03, mid-session).
This is a config-only change — no Edge Function code or redeployment required.

**Source-of-truth note:** This change was applied directly by David in the Supabase
dashboard during QA Agent mode. Approval recorded as APPROVAL-0028 in
`docs/activity_log/APPROVALS_LOG.md`. Activity log entry recorded in
`docs/activity_log/ACTIVITY_LOG.md` (2026-06-03 QA run entry).

**QA Agent verification:** New share link generated immediately after secret was set.
URL host confirmed `https://app.passtodigital.com/v/…` both in the dashboard share
modal screenshot (~16:50 UTC) and via David's direct report of URL pattern (15:13 UTC).
Prior token manually rewritten to App host and exercised end-to-end in QA-A7/A8/A9.

**Codex verification scope:** Confirm `SHARE_LINK_BASE_URL` is present and correct
in Supabase project `wvzjfxacykgsaffskgtr` secrets. Confirm no other Edge Function
or code path still references the marketing domain for share URLs. Confirm
APPROVAL-0028 and ACTIVITY_LOG entry are present and accurate.

---

## QA-004

**Date:** 2026-06-03
**Severity:** P1
**Status:** `open`
**Surface:** App project — root route `/`
**Route:** `https://app.passtodigital.com/`
**Owner:** Lovable App project
**Related tasks/issues:** `docs/tasks/LOVABLE_PROMPT_2026-06-02_APP_LAUNCH_READINESS.md`

**Finding:** When a nurse has a valid, unexpired Supabase session in localStorage
and navigates to `https://app.passtodigital.com/`, the sign-in form renders
("Welcome back / Sign in to your PassTo account"). The route does not check session
state on mount and does not redirect to `/dashboard`.

**Evidence:** Reproduced live 2026-06-03 with test-nurse-001 active session
(user_id present, expires_at in future). URL stayed on `/`; no redirect observed.

**Remediation:** Included in launch-readiness Lovable prompt
(`LOVABLE_PROMPT_2026-06-02_APP_LAUNCH_READINESS.md`). Not yet applied as of end
of QA run.

---

## QA-005

**Date:** 2026-06-03
**Severity:** P1
**Status:** `open`
**Surface:** App project — `/update-password`
**Route:** `https://app.passtodigital.com/update-password`
**Owner:** Lovable App project
**Related tasks/issues:** TASK-0065, `docs/tasks/LOVABLE_PROMPT_2026-06-02_APP_LAUNCH_READINESS.md`

**Finding:** Visiting `/update-password` directly with no session and no recovery
token in the URL fragment renders the "Set new password" form immediately. Expected
behavior: no-session + no recovery token → show "Invalid or expired recovery link"
message, not the form. Only visits via a valid Supabase PASSWORD_RECOVERY email link,
or a signed-in user intentionally changing their password, should see the form.

**Evidence:** QA-A11 (2026-06-03): cold no-session visit to `/update-password`
confirmed `form_visible: true`, `session_present: false`, no recovery text detected
in body. JavaScript inspection confirmed no recovery-context check.

**Note:** The legitimate recovery flow (QA-A10/A12) was separately confirmed working:
reset email sent, recovery link resolved to `/update-password`, new password set and
accepted. The bug affects only the unguarded direct-visit path.

**Remediation:** Included in launch-readiness Lovable prompt. Not yet applied.

---

## QA-006

**Date:** 2026-06-03
**Severity:** P1
**Status:** `decision_pending`
**Surface:** App project — `/verify-demo`
**Route:** `https://app.passtodigital.com/verify-demo`
**Owner:** David (disposition decision) → Lovable App project (execution)
**Related tasks/issues:** `docs/tasks/LOVABLE_PROMPT_2026-06-02_APP_LAUNCH_READINESS.md`

**Finding:** `/verify-demo` is publicly accessible without authentication and displays
fabricated nurse credentials: "Sarah Johnson, RN", license "RN-2024-198234", state CA,
data source "Nursys QuickConfirm · Primary Source", expiration "March 30, 2027",
"Verified April 7, 2026". Page title is "PassTo — Credential Verification" —
indistinguishable from a real verification. No DEMO / SAMPLE / FAKE labeling anywhere
visible.

**Evidence:** QA-A13 (2026-06-03): screenshot captured, JavaScript confirmed
`demo_label_present: false`, `looks_like_real_credential_ui: true`.

**Decision required from David:**
- Option A: Remove route entirely (recommended)
- Option B: Add prominent DEMO banner + retitle tab
- Option C: Gate behind `/demo/` subpath or auth wall

**Remediation:** Blocked on David's disposition decision. Three pre-drafted options
available in `docs/tasks/LOVABLE_PROMPT_2026-06-02_APP_LAUNCH_READINESS.md`.

---

## QA-007

**Date:** 2026-06-03
**Severity:** P1
**Status:** `codex_verification_requested`
**Surface:** App project — `/dashboard` wallet status cards
**Route:** `https://app.passtodigital.com/dashboard`
**Owner:** Lovable App project
**Related tasks/issues:** `docs/tasks/LOVABLE_PROMPT_2026-06-02_APP_LAUNCH_READINESS.md`

**Finding:** Dashboard showed amber "Wallet Passes Preparing — Your wallet passes are
being prepared. This usually takes a moment." even when no wallet pass attempt had
ever been made. `dashboard-status` Edge Function returned `wallet.apple.status =
"not_attempted"` and `wallet.google.status = "not_attempted"`. No PassKit issuance
was in progress.

**Evidence:** QA-A4 initial observation and subsequent session navigation consistently
showed amber preparing state. API logs confirmed `not_attempted` returned from
dashboard-status v6.

**Remediation applied:** Lovable rewrote wallet cards to per-provider state handling:
`not_attempted` → neutral card; `pending` → amber spinner; `issued` → green with
add-to-wallet button; `voided`/`error` → red error state.

**QA Agent visual verification (~16:50 UTC 2026-06-03):** Screenshot of `/dashboard`
with test-nurse-001 signed in confirmed:
- Separate "Apple Wallet pass not yet created" and "Google Wallet pass not yet
  created" cards under "Wallet Passes" heading
- Copy: "We'll generate this when wallet issuance is configured. No action needed
  right now."
- No amber color, no spinner, no "preparing" copy
- Per-provider card layout correct

**Codex verification scope:** Confirm `pending`, `issued`, `voided`, and `error`
wallet states also render correctly (cannot be exercised without PassKit integration
active; recommend code-level review of the conditional logic).

---

## QA-008

**Date:** 2026-06-03
**Severity:** P2
**Status:** `applied_partial`
**Surface:** App project — `index.html` static metadata + production deployment
**Route:** `https://app.passtodigital.com/` (view-source)
**Owner:** Lovable App project
**Related tasks/issues:** `docs/tasks/LOVABLE_PROMPT_2026-06-02_APP_LAUNCH_READINESS.md`

**Finding:** Deployed `index.html` contained Lovable default metadata: `<title>Lovable
App</title>`, `og:title = "Lovable App"`, OG image and Twitter image hosted on
`pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/…lovable.app…png`. Lovable "Edit with
Lovable" floating badge visible in production at bottom-right.

**Evidence:** JavaScript metadata inspection 2026-06-03 pre-fix confirmed all Lovable
defaults present. Badge detected via DOM query.

**Remediation applied (partial):**

| Criterion | Status |
|---|---|
| Tab title `"Sign In — PassTo"` | ✅ Verified by QA Agent |
| `og:title = "PassTo — Digital Nurse Credential"` | ✅ Verified |
| `og:description` = PassTo brand copy | ✅ Verified |
| `twitter:title` = PassTo | ✅ Verified |
| `twitter:card = "summary_large_image"` | ✅ Verified |
| Edit badge removed from production | ✅ Verified (DOM query returned null) |
| `og:image` hosted on PassTo-controlled domain | ❌ Still `…lovable.app…png` |
| `twitter:image` hosted on PassTo-controlled domain | ❌ Still `…lovable.app…png` |

**Remaining gap:** OG and Twitter images still served from Lovable's CDN
(`pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev`). At risk of changing or disappearing
without notice.

**Remediation required:** Create a PassTo-branded 1200×630 OG image, host it on a
stable PassTo-controlled URL, update `og:image` and `twitter:image` in `index.html`.

---

## QA-009

**Date:** 2026-06-03
**Severity:** P2
**Status:** `codex_verification_requested`
**Surface:** App project — per-route `document.title`
**Routes:** `https://app.passtodigital.com/`, `/reset-password`, `/update-password`
**Owner:** Lovable App project
**Related tasks/issues:** `docs/tasks/LOVABLE_PROMPT_2026-06-02_APP_LAUNCH_READINESS.md`

**Finding:** Three App routes displayed tab title "Lovable App". `/dashboard` and
`/v/:token` were already correct pre-fix.

**Remediation applied:** Lovable added per-route `document.title` updates.

**QA Agent verification (2026-06-03):**

| Route | Expected | Observed | Result |
|---|---|---|---|
| `/` | "Sign In — PassTo" | "Sign In — PassTo" | ✅ |
| `/reset-password` | "Reset Password — PassTo" | "Reset Password — PassTo" | ✅ |
| `/update-password` | "Set New Password — PassTo" | "Set New Password — PassTo" | ✅ |
| `/dashboard` | "Your Credential — PassTo" | (unchanged, correct pre-fix) | ✅ |
| `/v/:token` | "Verify Credential — PassTo" | (unchanged, correct pre-fix) | ✅ |

All three previously-broken routes fully verified by QA Agent.

**Codex verification scope:** Confirm title updates persist on back-navigation and
route changes without full page reload (SPA navigation).

---

## QA-010

**Date:** 2026-06-03
**Severity:** P1
**Status:** `codex_verification_requested`
**Surface:** App project — authenticated route header / sign-out
**Route:** `https://app.passtodigital.com/dashboard` (and other authenticated routes)
**Owner:** Lovable App project
**Related tasks/issues:** `docs/tasks/LOVABLE_PROMPT_2026-06-02_APP_LAUNCH_READINESS.md`

**Finding:** Signed-in `/dashboard` had no header, no navigation, no sign-out
mechanism. Users had no non-destructive way to switch accounts, clear session, or
access other surfaces.

**Evidence:** QA-A4 and all session observations of `/dashboard` pre-fix: no header
element, no email display, no sign-out affordance.

**Remediation applied:** Lovable added slim `AppHeader` on authenticated routes with
"PassTo" wordmark (left, links to `/dashboard`) and email chip (right, dropdown
containing "Sign out" → `supabase.auth.signOut()` → navigate to `/`). Header
excluded from unauthenticated routes.

**QA Agent visual verification (~16:50 UTC 2026-06-03):** Screenshot of `/dashboard`
with test-nurse-001 signed in confirmed:
- "PassTo" wordmark visible top-left
- Email chip "test-nurse-001@passto..." visible top-right
- Header present on `/dashboard`
- Header absent on cold `/`, `/reset-password`, `/update-password` (confirmed via
  per-route observations earlier in run)

**Codex verification scope:** Click sign-out and confirm: session cleared, navigate
to `/`, browser back-button does not re-authenticate. Confirm header does not render
on `/v/:token`.

---

## QA-011

**Date:** 2026-06-03
**Severity:** P0
**Status:** `codex_verification_requested`
**Surface:** Enroll project (`d279ccd3-8397-4e7b-933c-8f5c8468d19e`) — missing route `/post-login`
**Route:** `https://enroll.passtodigital.com/post-login`
**Owner:** Lovable enroll project
**Related tasks/issues:** TASK-0065, `docs/tasks/LOVABLE_PROMPT_2026-06-02_TASK0065_ENROLLMENT_REDIRECT.md`

**Finding:** Partial-enrollment nurses who sign in on `app.passtodigital.com` are
correctly redirected by the App to `enroll.passtodigital.com/post-login` (per Supabase
Auth allow-list and App post-signin routing logic). The enroll project had no `/post-login`
route — 404.

**Evidence:** test-nurse-002 (`onboarding_step='identity'`, `id_verification_status=
'unverified'`) signed in on App → App bounced to `enroll.passtodigital.com/post-login`
→ confirmed 404 in David's browser.

**Remediation applied:** Lovable enroll project added `/post-login` as a one-shot
post-auth router: hydrates session, reads profile from backend (using correct `profiles`
SELECT — no `license_id` column), replace-navigates to the appropriate enrollment step
or to `app.passtodigital.com/dashboard` if `onboarding_step` is complete.

**QA Agent verification:**

1. **Cold no-session path (2026-06-03):** QA Agent navigated directly to
   `enroll.passtodigital.com/post-login` with no session. Route resolved and
   replace-navigated to `/id-verification`. URL bar confirmed. No 404.

2. **Authenticated cross-domain path (2026-06-03):** David signed in as test-nurse-002
   on `app.passtodigital.com`. App detected partial enrollment, redirected to
   `enroll.passtodigital.com/post-login`. David confirmed landing URL:
   `https://enroll.passtodigital.com/id-verification`. No 404, correct routing.

**Codex verification scope:**
- Verify the profile SELECT in `/post-login` does not include `license_id` (same
  class of bug as QA-002 on the App side).
- Verify `onboarding_step = 'complete'` path routes to
  `https://app.passtodigital.com/dashboard`, not to an enroll route.
- Verify `/post-login` uses replace-navigate (no back-button trap).

---

## Aggregate counts (2026-06-03 session)

| Severity | Total | `codex_verification_requested` | `applied_partial` | `open` | `decision_pending` |
|---|---|---|---|---|---|
| P0 | 4 | 4 | 0 | 0 | 0 |
| P1 | 5 | 2 | 0 | 2 | 1 |
| P2 | 2 | 1 | 1 | 0 | 0 |
| **Total** | **11** | **7** | **1** | **2** | **1** |

**All 11 findings:** QA-001 through QA-011.

**Open — require Lovable action:** QA-004, QA-005.

**Decision pending:** QA-006 (David to choose `/verify-demo` disposition).

**Partially applied — follow-up required:** QA-008 (OG/Twitter image URL still on
Lovable CDN).

**Source-of-truth gap resolved this commit:** QA-003 (APPROVAL-0028 recorded in
APPROVALS_LOG; activity log entry added).

---

## QA run metadata

| Field | Value |
|---|---|
| Run date | 2026-06-03 |
| Scope authority | `docs/team_charter/PASSTO_MANUAL_E2E_QA_SCOPE.md` v3, commit `085104a` |
| QA Agent | Claude |
| Test identities | `test-nurse-001@passtodigital.com`, `test-nurse-002@passtodigital.com` |
| Real PII used | None |
| Secrets/tokens captured | None |
| GitHub writes during run | None (per scope; all writes deferred to this post-run commit) |
| Domains covered | `app.passtodigital.com`, `enroll.passtodigital.com` |
| Deferred scopes | Block E (ID.me IAL1 wall); Block S (no Stripe upgrade surface reachable) |
