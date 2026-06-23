# MVP Launch Readiness Checklist - 2026-06-15

**Source Task:** TASK-0067
**Status:** Drafted by Codex - Ready for David Review
**Owner:** Codex
**Source PRD:** `docs/prd/PRD_SECTION_07_LAUNCH_QA_DECISIONS.md` sections 7.2 and 7.3
**Purpose:** Single pre-launch gate checklist for deciding whether PassTo can launch with the first production nurse.

## Readiness Rule

PassTo is not launch-ready until every launch-critical gate below is either passed with evidence or explicitly accepted by David as a launch fallback. This checklist does not approve production launch, close tasks, or accept risk.

## Status Legend

| Status | Meaning |
|---|---|
| Passed | Evidence exists and the gate is complete within its approved scope. |
| Needs QA | Implementation or artifact exists but final Codex/David launch QA is still required. |
| Blocked | A known unresolved blocker prevents launch readiness. |
| Pending | Work, configuration, evidence, or approval remains open. |
| Deferred | Not required for MVP launch under the approved PRD. |

## Launch Gates

| Gate | Launch Critical | Current Status | Evidence / Source | Owner | Approval Needed | Next Action |
|---|---:|---|---|---|---|---|
| PRD sections 1-7 approved | Yes | Passed | PRD approval docs and Section 7 task list | David | None for PRD baseline | Keep later changes routed through tasks. |
| v4 Supabase migration SQL drafted | Yes | Passed | TASK-0007 / migration docs | Claude/Codex | None if source unchanged | Use existing approved schema baseline. |
| Codex QA of v4 migration SQL | Yes | Passed | Codex schema QA docs | Codex | None if source unchanged | Preserve QA evidence. |
| David migration approval | Yes | Passed | DECISION-0016 and approvals log | David | None if source unchanged | Preserve approval boundary. |
| Migration applied to intended Supabase project | Yes | Passed | Build sequence Phase 1 | Claude/Codex | None if already applied | Reconfirm project before production smoke. |
| RLS tests completed | Yes | Needs QA | Section 7.5; TASK-0068 | Codex | David approval before production-impacting tests | Execute MVP QA plan RLS cases. |
| Lovable connected to approved backend endpoints | Yes | Needs QA | TASK-0065/0066, QA findings log, TASK-0072 | Lovable/Codex | David approval for new prod config changes | Complete current route/wallet remediation verification. |
| ID.me production readiness | Yes | Pending | ID.me tasks and production provider config | David/Codex | David approval for production credentials/mode | Confirm callback, mode, and evidence without fake production claims. |
| Twilio production readiness or approved fallback | Yes | Blocked | RISK-0002 | David | David approval if fallback used | Confirm A2P 10DLC approval or document fallback acceptance. |
| RapidAPI / Propelus readiness | Yes | Pending | License lookup task evidence | David/Codex | David approval for live provider mode | Confirm production credentials, rate limits, and failure behavior. |
| Stripe checkout/webhook readiness | Yes | Needs QA | TASK-0060 through TASK-0064 | Codex | TASK-0064 approved; Done still pending | Execute TASK-0064 Phase 6 QA. |
| Wallet pass signing readiness | Yes | Blocked | TASK-0072; wallet display spec | Claude/Codex/David | Existing APPROVAL-0034 covers execution; Done still pending | Complete TASK-0072 re-QA, including successful `/success` Add to Wallet rendering. |
| Postmark critical alert readiness | Yes | Pending | Ops/alert tasks; Section 7.6 | Claude/Codex | David approval for production sender/domain | Verify sender/domain, alert recipients, and no secret exposure. |
| Terms/disclaimer readiness | Yes | Pending | Verifier Terms, legal/disclaimer docs | David | David legal/product approval | Confirm nurse, verifier, and payment disclosures before launch. |
| Dev-only test personas and seed/reset process | Yes | Needs QA | TASK-0044 | Claude/Codex | David approval already required by TASK-0044 | Confirm seed harness safety, personas, and reset evidence. |
| Production configuration checklist | Yes | Pending | TASK-0069 artifact | Codex/David | David approval before active production gate | Review `PRODUCTION_CONFIGURATION_CHECKLIST_2026-06-15.md`. |
| Launch QA plan | Yes | Pending | TASK-0068 artifact | Codex/David | David approval before active QA gate | Review `MVP_QA_TEST_PLAN_2026-06-15.md`. |
| Launch smoke test script | Yes | Pending | TASK-0070 | Codex/David | David approval before production-like execution | Create and approve TASK-0070 artifact. |
| UAT/demo program | No for production launch; yes for sales/UAT readiness | Pending | TASK-0073 | David/Codex/Claude/Lovable | Separate implementation approval | Build isolated demo/UAT environment separately from production launch gate. |
| David production launch approval | Yes | Pending | Section 7.2 | David | Explicit David approval | Only after all launch-critical gates pass or are accepted. |

## Current Launch Blockers

1. TASK-0072 wallet issuance/display re-QA remains blocked until the live route guard issue is remediated and Add to Wallet actions render for the pass-ready nurse.
2. TASK-0064 Phase 6 Stripe/entitlement/lapse QA is now approved for execution but not yet complete.
3. Twilio A2P 10DLC remains pending unless David approves a fallback.
4. Production configuration, legal/Terms readiness, ops alerts, full RLS QA, and launch smoke test are not yet complete.

## David Review Questions

1. Should this checklist become the active launch gate after review?
2. Are any launch gates missing or incorrectly classified as launch-critical?
3. Is any blocked gate eligible for a David-approved fallback, or should it remain a hard launch blocker?
