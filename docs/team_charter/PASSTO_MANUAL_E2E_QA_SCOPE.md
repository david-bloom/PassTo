# PassTo Manual E2E QA Scope — Claude Execution Authority v3

**Status:** Draft for David / Main Conductor approval  
**Owner:** David  
**Proposed Date:** 2026-06-03  
**Applies To:** Claude manual browser QA, Codex review, Lovable handoff QA  

## Purpose

This document defines a limited manual QA authority for testing PassTo's live web experience in David's browser against:

- `https://enroll.passtodigital.com`
- `https://app.passtodigital.com`

This scope is for QA execution only. It does not authorize production launch, task Done decisions, risk acceptance, migrations, deployments, secrets changes, provider configuration changes, or live payment/wallet changes.

## Authorization Model

Claude may run manual end-to-end QA only when explicitly invoked by David for a specific QA request.

Each invocation is per-request authorization, not standing access. Claude must stop when the specific request is satisfied, a hard boundary is reached, or David signals stop.

The Main Conductor owns final source-of-truth decisions, approval-boundary interpretation, GitHub publishing, risk acceptance, and Done decisions.

Codex may provide technical review and proposed QA verdicts. David / Main Conductor owns final approval, risk acceptance, Done decisions, and GitHub publishing.

## What Claude May Do During An Active QA Request

Claude may:

- Navigate to and load public or approved test-account-accessible routes on the two QA domains.
- Click UI controls, type seeded fake values into form fields, select options, and submit forms.
- Read DOM state, console messages, network requests, response headers, cookies, localStorage, and sessionStorage for diagnosis.
- Capture screenshots of pages containing only seeded fake data.
- Observe and record redirects, status codes, error messages, timing, UI state, and copy.
- Read Supabase Edge Function logs, Auth logs, and database tables via approved read-only tools for diagnosis of what the frontend did.
- Trigger normal application writes through approved server-side code paths invoked by scoped user actions, such as:
  - Creating a share link through the app UI.
  - Submitting a verifier form that writes verifier and verification event records.
  - Requesting a password reset email.
  - Updating a password from a valid recovery link.
  - Running Stripe checkout only in Stripe sandbox/test mode when included in the specific QA request.
- Produce written QA findings, draft remediation artifacts, Lovable prompts, Codex review prompts, task update drafts, activity-log drafts, approval-log drafts, and QA finding drafts.

Before triggering any app action that writes server-side state, Claude must confirm the active account is an approved test identity and the route/action is in the current QA scope.

## What Claude May Not Do Without Separate Explicit Approval

Claude may not:

- Change Supabase Auth settings, URL configuration, providers, redirect lists, or templates.
- Apply Supabase database migrations, alter RLS policies, change extensions, or modify schemas.
- Change Supabase secrets, environment variables, service keys, or API keys.
- Modify, deploy, redeploy, or version Supabase Edge Functions.
- Change Stripe live-mode configuration, live products, live prices, live webhooks, or move from test mode to live mode.
- Enter or use real payment cards.
- Change Vercel deployment configuration, environment variables, domain settings, or DNS.
- Change wallet provider production configuration, PassKit / Apple Wallet / Google Wallet certificates, private keys, issuer settings, or signing keys.
- Change GitHub repository settings, branch protection, secrets, or merge pull requests.
- Mark QA as passed, close a task as Done, close issues, accept risk on behalf of David, or declare launch readiness.
- Commit code changes without a David-approved task.
- Publish GitHub governance updates while acting as a QA Agent unless the current Main Conductor / David-approved workflow explicitly authorizes that publication.

## Sensitive Browser Data Handling

Claude may inspect cookies, localStorage, and sessionStorage for diagnosis, but must not paste, publish, screenshot, store, or expose:

- Auth tokens.
- Refresh tokens.
- JWTs.
- API keys.
- Service-role keys.
- Secret-bearing values.
- Wallet provider credentials or private key material.
- Stripe live-mode credentials.

If sensitive values appear on screen, in DevTools, or in logs, Claude must not capture or quote them. Claude should summarize the relevant behavior without exposing the secret value.

## Test Identities And Test Data

Allowed test auth identities:

- `test-nurse-001@passtodigital.com`
- Numbered variants such as `test-nurse-002@passtodigital.com`, `test-nurse-003@passtodigital.com`, etc.

Claude must not use `david@passtodigital.com` or any other real person's account for QA. If Claude is driving a browser session that is signed in as a real account, Claude must sign out and switch to an approved test-nurse account before continuing QA.

All PII typed into forms must be obviously seeded test values, not real identities.

Claude must never enter:

- Real Social Security Numbers.
- Real government-issued IDs.
- Real payment card details.
- Wallet provider private keys or certificates.
- Supabase service-role keys.
- Live provider credentials.

David should enter all passwords manually unless David explicitly provides a disposable test password in the QA thread. Claude may type non-secret seeded test data but must not view, store, or reuse passwords outside the active QA request.

Screenshots may capture seeded fake PII. Screenshots must not capture real identity data. If real identity data appears on screen during QA, Claude must redact before sharing.

## Browser Identity Hygiene

If Claude finds an active real-user session, Claude must sign out before any interactive QA action.

Claude must verify the active session belongs to an approved test-nurse account before clicking any button that triggers a server-side write.

Session verification may use visible UI, safe localStorage inspection, or read-only Supabase Auth/profile checks. Token values must not be exposed.

## Routes In Scope

### Enrollment Domain

In scope on `enroll.passtodigital.com`:

- `/`
- `/id-verification`
- `/confirm-info`
- `/license`
- `/license-info`
- `/post-login`
- `/reset-password`
- `/update-password`

### App Domain

In scope on `app.passtodigital.com`:

- `/`
- `/login`
- `/dashboard`
- `/reset-password`
- `/update-password`
- `/v/:token`

`/verify-demo` is inspect-only until David decides its disposition. Claude may inspect and screenshot it for QA evidence, but must not treat it as an approved production demo route unless David explicitly approves that route.

## Stripe Sandbox Checkout Scope

Stripe checkout may be included only when the specific QA request explicitly says Stripe sandbox/test checkout is in scope.

When in scope, Claude may:

- Trigger checkout from the application UI using test accounts only.
- Use Stripe test-mode card numbers only, such as `4242 4242 4242 4242`, with seeded fake billing details.
- Observe Stripe-hosted checkout, return URLs, webhook-driven app state, subscription state, entitlement state, and dashboard copy.
- Inspect read-only Stripe/Supabase evidence if the available tools and approvals allow read-only checks.
- Report checkout, return-route, entitlement, and webhook findings.

Claude may not:

- Use live-mode Stripe.
- Enter real payment cards.
- Create or modify live Stripe products, prices, customers, coupons, webhooks, tax settings, branding, or portal settings.
- Change Stripe secrets or webhook signing secrets.
- Accept payment or subscription risk on behalf of David.

If the browser or Stripe page indicates live mode, Claude must stop the checkout test immediately and report the boundary hit.

## Out Of Scope Unless Separately Authorized

The following require separate QA scopes or hard-gate approvals:

- Wallet pass install flow when real PassKit / Apple Wallet / Google Wallet signing is involved.
- Stripe live-mode checkout.
- Account settings, sign-out, profile edit, or account deletion beyond basic navigation observations.
- Notification SMS/email delivery end-to-end, except observing that a reset email was requested.
- PDF export.
- Show-QR token or in-person verification.
- Admin/ops surfaces.
- Provider dashboards.
- Production wallet issuance.

## Findings Reporting

Every QA session should produce a written findings report in chat.

Structured QA findings should be drafted for the source-of-truth record with:

- Finding ID.
- Date.
- Severity (`P0`, `P1`, `P2`, `P3`).
- Surface.
- Evidence.
- Remediation owner.
- Status (`open`, `in_progress`, `applied`, `codex_verified`, `closed`, `wontfix`).
- Related task or issue IDs.

If `docs/activity_log/QA_FINDINGS_LOG.md` does not yet exist, Claude may draft entries for that file. Creating or publishing the file follows the current Main Conductor / David-approved GitHub workflow.

Claude must not change finding status from `open` to `closed` while acting as QA Agent. Status transitions to `applied`, `codex_verified`, or `closed` require confirmation by the named owner and source-of-truth recording by the authorized conductor workflow.

For P0/P1 findings, Claude may draft a remediation artifact as part of the report. Execution requires David approval per the PassTo charter.

## Escalation

On discovery of a P0 launch blocker, Claude should complete the immediate finding, draft the remediation artifact, and stop further QA on related routes until the P0 is resolved.

On discovery of a possible security issue, including data exposure, auth bypass, token exposure, or cross-account data visibility, Claude must stop QA immediately and alert David. Public GitHub publication of sensitive details waits for David/Main Conductor direction.

On uncertainty about scope, Claude pauses QA and asks David rather than guessing.

## Scope Boundary

This document governs Claude's manual QA execution authority only.

It does not authorize:

- Marking any task Done.
- Closing any issue.
- Approving any pull request.
- Production launch readiness sign-off.
- Risk acceptance.
- Deviations from the approved PassTo operating model, task workflow, standing approval lanes, or team charter.

