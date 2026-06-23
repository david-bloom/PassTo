# MVP QA Test Plan - 2026-06-15

**Source Task:** TASK-0068
**Status:** Drafted by Codex - Ready for David Review
**Owner:** Codex
**Source PRD:** `docs/prd/PRD_SECTION_07_LAUNCH_QA_DECISIONS.md` sections 7.4 and 7.5
**Purpose:** Executable QA matrix for PassTo's launch-critical journey, security boundaries, integration failures, and ops visibility.

## Execution Rules

- Read-only source review and documented evidence review may proceed under the standing review lane.
- Live writes, provider calls, payment actions, production-like wallet issuance, secrets/config changes, or destructive seed resets require explicit David approval.
- A launch-blocking failure is any failure that allows incorrect credential issuance, exposes protected data, bypasses payment/account gates, prevents a nurse from completing the launch-critical path, or prevents ops from diagnosing a stuck launch-critical state.

## QA Matrix

| ID | Area | Test | Persona / Preconditions | Steps | Expected Result | Evidence | Execution Approval |
|---|---|---|---|---|---|---|---|
| QA-AUTH-001 | Account | New account creation | New test nurse | Create account from enrollment entry. | Profile is created; nurse lands on correct ID.me-first route. | Screenshot, user/profile IDs, route. | Dev write approval |
| QA-AUTH-002 | Account | Login/session persistence | Existing test nurse | Sign in, refresh, close/reopen session. | Session persists only as intended; route matches onboarding state. | Screenshot and route log. | Read/write QA |
| QA-AUTH-003 | Account | Password reset/update | Existing test nurse | Trigger reset and open recovery link. | Reset lands on approved app route; no localhost or wrong-domain redirect. | Email link host redacted, screenshot. | David approval if live email |
| QA-IDME-001 | Identity | ID.me start/callback success | Sandbox or approved simulated identity | Start identity flow and complete allowed callback. | Identity state records approved result; no fake production assertion. | Callback state, audit row. | Provider-call approval |
| QA-IDME-002 | Identity | ID.me failure / IAL wall | Sandbox or simulated failure | Exercise failed/insufficient assurance result. | Credential flow blocks with useful recovery copy. | Screenshot, audit row. | Provider-call approval |
| QA-PHONE-001 | Phone | OTP success | Phone-pending persona | Send and verify OTP. | Phone gate passes; next route is correct. | Redacted phone, route, audit row. | Provider-call approval |
| QA-PHONE-002 | Phone | OTP wrong/expired/rate limited | Phone-pending persona | Submit wrong, expired, and repeated OTP attempts. | Attempts fail safely; no bypass; errors logged. | Screenshots, event rows. | Provider-call approval |
| QA-LIC-001 | License | License lookup success | Identity-ready persona | Enter license data and run lookup. | License row reflects provider result; next gate unlocked only on valid match. | Provider response summary, row IDs. | Provider-call approval |
| QA-LIC-002 | License | License not found/provider failure | Identity-ready persona | Use missing license or simulate provider outage. | Credential creation blocked; retry/support state visible; failure logged. | Screenshot, failure event. | Provider-call approval |
| QA-LIC-003 | Match | Identity/license mismatch | Match-failed persona | Exercise mismatch case. | Credential issuance remains blocked by backend state. | Row state, blocked action evidence. | Dev write approval |
| QA-SELFIE-001 | Selfie | Upload success | Selfie-pending persona | Upload acceptable selfie. | Selfie stored in protected bucket; latest selfie used; next gate advances. | Storage object metadata, screenshot. | Dev write approval |
| QA-SELFIE-002 | Selfie | Upload failure/protection | Selfie-pending persona | Try invalid file and unauthorized access. | Failure is clear; protected file is not public. | HTTP status, screenshot. | Dev write/read approval |
| QA-CRED-001 | Credential | Credential creation gate | All prior gates complete | Invoke approved credential creation path. | Credential is created only when all required gates pass. | Credential ID, audit row. | Dev write approval |
| QA-CRED-002 | Credential | Backend gate enforcement | Incomplete-gate personas | Attempt direct navigation or client-side bypass. | No credential/pass is created; backend rejects. | Response codes, DB evidence. | Dev write approval |
| QA-WALLET-001 | Wallet | Apple Add to Wallet | Pass-ready persona, Apple config ready | Issue or open Apple pass action. | Valid Apple Wallet add flow opens; pass fields match spec. | Screenshot, pass row. | Wallet provider approval |
| QA-WALLET-002 | Wallet | Google Add to Wallet | Pass-ready persona, Google config ready | Issue or open Google Wallet action. | Valid Google add flow opens; pass fields match spec. | Screenshot, pass row. | Wallet provider approval |
| QA-WALLET-003 | Wallet | Wallet blocked state | Credential missing or invalid | Attempt wallet issue before pass-ready state. | Backend blocks issuance; UI shows correct missing requirement. | Response, screenshot. | Dev write approval |
| QA-DASH-001 | Dashboard | Dashboard display | Pass-ready persona | Open dashboard after login. | License, credential, wallet, subscription, and share status render accurately. | Screenshot, status payload. | Read/write QA |
| QA-SHARE-001 | Share | Share-link creation | Entitled/pass-ready persona | Create share link from dashboard. | Token is created by backend; raw token is not stored; link host is app domain. | Redacted URL, DB token hash evidence. | Dev write approval |
| QA-SHARE-002 | Verifier | Token validation and expiry | Fresh and expired token | Open `/v/:token` and repeat after expiry/invalid token. | Valid token loads allowed data; invalid/expired token fails safely. | Screenshots, response codes. | Dev write approval |
| QA-SHARE-003 | Verifier | Verifier form and Terms | Valid token | Submit verifier-provided info and Terms acknowledgement. | Submission records verifier-provided data and acknowledgement; disclosure is visible. | Screenshot, row IDs. | Dev write approval |
| QA-STRIPE-001 | Stripe | Checkout success | Payment-pending persona | Create checkout and complete Stripe test payment. | Subscription/payment rows update from webhook; entitlement is server-derived. | Stripe event ID, DB rows. | Stripe test approval |
| QA-STRIPE-002 | Stripe | Webhook idempotency | Prior Stripe test event | Replay duplicate event. | Duplicate does not double-apply state; event is recorded idempotently. | Event IDs, row diff. | Stripe test approval |
| QA-STRIPE-003 | Stripe | Lapse/cancel/past-due | Active paid persona | Simulate cancel/lapse/past-due states. | Paid actions and dashboard reflect lapsed entitlement safely. | DB rows, screenshots. | Stripe test approval |
| QA-ACCT-001 | Account status | Suspended account | Suspended persona | Attempt dashboard, share, wallet, credential actions. | Sensitive actions blocked by backend/account status, not only UI. | Response codes, screenshots. | Dev write approval |
| QA-ACCT-002 | Account status | Closed account | Closed persona | Attempt login/action flow. | Closed state blocks sensitive actions and avoids unsafe deletion assumptions. | Response codes, screenshots. | Dev write approval |
| QA-RLS-001 | Security/RLS | Cross-nurse data isolation | Two seeded nurses | Attempt reads/writes across nurse IDs through client context. | RLS denies cross-nurse access. | SQL/API response evidence. | Dev read/write approval |
| QA-RLS-002 | Security/RLS | Verifier data boundary | Verifier token context | Attempt browse/enumerate credential data. | Verifier can only see token-scoped allowed data. | HTTP status, screenshots. | Dev write approval |
| QA-RLS-003 | Security/secrets | Client secret scan | Repo/source review | Search client/build artifacts for service-role/provider secrets. | No service-role, signing, webhook, or provider secrets in client code/GitHub. | `rg` output summary. | Read-only |
| QA-OPS-001 | Ops | Failure logging | Simulated provider/credential failures | Trigger known failure states. | Ops-visible events contain enough context without exposing secrets/PII. | Redacted event rows. | Dev write approval |
| QA-OPS-002 | Ops | Stuck-state inspection | Seeded stuck personas | Inspect ops-visible state for each stuck gate. | Ops can identify blocker and next action. | Redacted row summary. | Read-only/dev read |
| QA-SMOKE-001 | Smoke | Full dev dry run | Approved dev persona | Run full Section 7.7 journey in dev/test mode. | End-to-end journey passes or blockers are logged. | Smoke-test packet. | David approval before execution |
| QA-SMOKE-002 | Smoke | Production launch smoke | First production launch candidate | Run approved smoke script against production configuration. | Only runs after all prior gates pass and David approves. | Launch evidence packet. | Explicit David launch approval |

## Launch-Blocking Classification

Launch-blocking findings include:

- Credential or wallet issuance before required trust/payment gates pass.
- Cross-user, verifier, or public access to protected nurse data or selfies.
- Raw token storage or verifier token browsing.
- Stripe entitlement activation by client navigation or direct client writes.
- Missing/incorrect production provider configuration for a required MVP gate.
- Inability to complete the first-nurse smoke path without an approved fallback.
- Ops inability to inspect and recover a launch-critical stuck state.

## Non-Blocking Observations

Non-blocking observations may include minor copy/design defects, presentation polish, analytics gaps, or non-MVP feature requests, provided they do not degrade trust, security, credential accuracy, payment enforcement, or launch-critical completion.
