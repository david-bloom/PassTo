# Production Configuration Checklist - 2026-06-15

**Source Task:** TASK-0069
**Status:** Drafted by Codex - Ready for David Review
**Owner:** Codex
**Source PRD:** `docs/prd/PRD_SECTION_07_LAUNCH_QA_DECISIONS.md` section 7.6
**Purpose:** Prevent launch from depending on undocumented environment variables, redirects, secrets, domains, provider modes, wallet identifiers, or unsafe dev tooling.

## Guardrails

- Do not write secret values into GitHub.
- Distinguish sandbox/test/live configuration in every provider dashboard.
- Production-impacting configuration changes require David approval.
- Demo/UAT configuration from TASK-0073 must remain isolated from production configuration.
- Dev/test seed tooling must fail closed against production.

## Configuration Matrix

| Area | Required Configuration | Environment | Owner | Evidence / Verification | Status | Approval Gate |
|---|---|---|---|---|---|---|
| Supabase project | Confirm production project ref is `wvzjfxacykgsaffskgtr` or document any replacement. | Production | David/Codex | Supabase dashboard/project metadata, no secret values. | Pending reconfirmation | David |
| Supabase Auth Site URL | Site URL points to approved post-onboarding app domain. | Production | David/Codex | Auth URL Configuration screenshot/metadata. | Needs reconfirmation | David for changes |
| Supabase Auth redirects | Exact redirect allow-list for app/enrollment routes; no broad wildcards. | Production | David/Codex | Redirect URL list compared to TASK-0065/0066 decisions. | Needs reconfirmation | David for changes |
| Supabase Auth password policy | Backend-enforced minimum password policy enabled for the real Supabase Auth project. | Production | David/Codex | Supabase Auth password settings. | Pending | David |
| Supabase Auth leaked-password protection | HIBP leaked-password protection enabled for the real project serving PassTo passwords. | Production | David/Codex | Supabase Auth password security settings. | Pending | David |
| Supabase RLS | RLS enabled and verified for launch-critical tables. | Production/dev QA | Codex | QA-RLS test evidence from MVP QA plan. | Needs QA | David before production tests |
| Supabase Storage | Selfie bucket private/protected; signed/proxy access only where approved. | Production | Codex | Bucket/policy review and access tests. | Needs QA | David for policy changes |
| Supabase Edge Functions | Required functions deployed with correct `verify_jwt` settings and no client secrets. | Production | Claude/Codex | Function list, metadata, source review. | Needs QA | David for deploys |
| Edge Function secrets | Required secrets present for providers, Stripe, share links, wallet routes, alerts; values not exposed. | Production | David/Codex | Presence-only dashboard/API evidence. | Pending | David |
| CORS allow-list | Functions allow only approved app/enrollment/verifier origins as appropriate. | Production | Codex | Preflight checks and function source review. | Needs QA | David for changes |
| Lovable enrollment domain | `enroll.passtodigital.com` routes onboarding and approved callbacks. | Production | Lovable/David | Live route checks. | Needs QA | David for domain changes |
| Lovable app domain | `app.passtodigital.com` routes dashboard, password reset, sharing, and verifier pages as approved. | Production | Lovable/David | Live route checks. | Needs QA | David for domain changes |
| Lovable client secrets | No service-role keys, provider secrets, signing credentials, webhook secrets, or raw tokens in client code. | Production | Codex | Source/build scan. | Needs QA | None for read-only scan |
| Vercel wallet routes | Wallet signing routes deployed and environment variables configured. | Production/test-mode | Codex/David | Vercel env presence and live route evidence. | Blocked by TASK-0072 re-QA | David for env/deploy |
| Apple Wallet | Pass type ID, signing cert, WWDR/cert chain, pass assets, and display fields configured. | Production/test-mode | David/Codex | Apple pass issuance evidence and display spec comparison. | Blocked by TASK-0072 re-QA | APPROVAL-0034 scope; Done pending |
| Google Wallet | Issuer/class/object config, service account, and display payload configured. | Production/test-mode | David/Codex | Google add flow evidence and display spec comparison. | Blocked by TASK-0072 re-QA | APPROVAL-0034 scope; Done pending |
| Stripe mode separation | Test/live modes, products, prices, webhook endpoints, and secrets are explicitly separated. | Test/live | David/Codex | Stripe dashboard evidence, TASK-0060-0064 review. | Needs TASK-0064 QA | David for live mode |
| Stripe webhook endpoint | Production webhook endpoint and signing secret configured only when live launch is approved. | Production | David/Codex | Endpoint presence-only evidence. | Pending | David |
| ID.me callback | Production/sandbox callback URL and client credentials mode are documented. | Sandbox/live | David/Codex | ID.me dashboard evidence without secret values. | Pending | David for live mode |
| Twilio A2P / fallback | A2P 10DLC approval confirmed or David-approved fallback documented. | Production | David | Twilio dashboard status or risk acceptance. | Blocked by RISK-0002 | David |
| RapidAPI / Propelus | Production credentials, endpoint, rate limits, and failure handling documented. | Production | David/Codex | Provider dashboard/API readiness evidence. | Pending | David for live mode |
| Postmark | Sender/domain, recipients, templates, and failure-alert triggers configured. | Production | David/Claude/Codex | Sender/domain verification and test alert evidence. | Pending | David |
| Domain routing/DNS | Marketing, enrollment, app, verifier, wallet, and callback routes point to approved services. | Production | David/Lovable/Codex | DNS and live-route checks. | Needs QA | David |
| Dev seed guard | Seed harness requires explicit opt-in and refuses production project refs. | Dev only | Claude/Codex | TASK-0044 source/evidence. | Needs QA | David for execution |
| Demo/UAT isolation | Demo project, provider credentials, wallet identifiers, domains, and synthetic data are separate. | Demo/UAT | David/Claude/Lovable/Codex | TASK-0073 implementation evidence. | Pending | Separate TASK-0073 approval |

## Required Production Evidence Packet

Before production launch approval, collect:

1. Presence-only screenshots or command output proving required secrets/config exist without exposing values.
2. Auth Site URL and redirect allow-list evidence.
3. Supabase Auth password policy and HIBP leaked-password protection evidence.
4. Provider mode evidence for Stripe, ID.me, Twilio, RapidAPI/Propelus, Apple Wallet, Google Wallet, and Postmark.
5. RLS/security QA evidence from `MVP_QA_TEST_PLAN_2026-06-15.md`.
6. Launch smoke-test evidence from TASK-0070 after that task is approved and executed.

## Current Blockers / Open Items

- TASK-0072 wallet re-QA is still required before wallet signing can be considered launch-ready.
- Twilio A2P 10DLC is pending unless David accepts a fallback.
- TASK-0064 Stripe/entitlement/lapse QA must be executed after this approval.
- Supabase Auth password policy and HIBP leaked-password protection need direct real-project confirmation.
- Production legal/Terms, Postmark alert readiness, provider live-mode readiness, and final smoke-test evidence remain pending.
