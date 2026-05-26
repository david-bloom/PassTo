# PassTo Decisions Log

**Created:** 2026-05-26
**Task:** TASK-0008
**Status:** Ready for David Review
**Owner:** David Bloom
**Maintained by:** Claude / Codex on David instruction

---

## About This Log

This is the canonical decisions log for PassTo. It records completed foundation decisions and open decisions separately.

**Completed decisions** are settled — they serve as authoritative baselines for future task specs, PRD sections, and Codex QA. Do not re-litigate completed decisions without explicit David instruction.

**Open decisions** are unresolved — they must not be treated as settled or assumed in implementation work until explicitly approved. Each open decision notes what it blocks.

---

## COMPLETED FOUNDATION DECISIONS

---

### FD-001 — Product Definition Confirmed

**Date:** Carried forward from vision/context documents
**Decision Owner:** David
**Status:** Approved
**Source:** PRD Section 1, `PRD_SECTION_01_MASTER_TASK_LIST.md`

**Decision:**
PassTo is a digital credential product for licensed nurses. Nurses verify identity, connect a nursing license, receive a wallet-based credential, and share controlled verification access with reviewers, employers, or other credential verifiers.

The MVP must prove that PassTo can:
- Onboard a nurse through identity, phone, license, and data-match gates.
- Issue a trustworthy digital credential backed by current license data.
- Allow a verifier to view credential status through controlled, short-lived access.
- Support a founder-maintainable commercial workflow using Lovable, Supabase, Stripe, and targeted integrations.

---

### FD-002 — MVP Beachhead Segment: Travel Nurses

**Date:** Carried forward from vision/context documents
**Decision Owner:** David
**Status:** Approved
**Source:** PRD Section 1, personas and strategic context

**Decision:**
Travel nurses are the MVP beachhead segment.

---

### FD-003 — Primary Secondary User: Verifier

**Date:** Carried forward from vision/context documents
**Decision Owner:** David
**Status:** Approved
**Source:** PRD Section 1

**Decision:**
The verifier (employer, staffing agency reviewer, facility administrator, or reviewer) is the primary secondary user of the PassTo MVP. No verifier account is required — verifier access uses one-time, short-lived tokens.

---

### FD-004 — Lovable Confirmed as MVP Frontend Layer

**Date:** 2026-05-25
**Decision Owner:** David
**Status:** Approved
**Source:** PRD Section 1, TASK-0004, DECISION-0013

**Decision:**
Lovable is retained as the MVP frontend builder and website host. Re-platforming away from Lovable is explicitly out of MVP scope unless a blocking issue is identified.

Lovable must not hold secrets or perform credential, payment, or token trust decisions.

**Canonical reference:** `/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`

---

### FD-005 — Supabase Confirmed as System of Record

**Date:** 2026-05-25
**Decision Owner:** David
**Status:** Approved
**Source:** PRD Section 1, TASK-0004, DECISION-0012

**Decision:**
Supabase is the MVP system of record. Supabase provides PostgreSQL, Row Level Security, Auth, Edge Functions, and Storage. Airtable is abandoned.

**Canonical reference:** `/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`

---

### FD-006 — Supabase Edge Functions as Preferred Backend Orchestration

**Date:** 2026-05-25
**Decision Owner:** David
**Status:** Approved
**Source:** PRD Section 1, TASK-0004, DECISION-0012

**Decision:**
Supabase Edge Functions are the preferred backend orchestration layer. Make/Integromat is abandoned. All orchestration logic moves to Supabase Edge Functions or Vercel server-side routes where Edge Functions are not the right fit.

---

### FD-007 — Vercel as Targeted Backend/API Layer Only

**Date:** 2026-05-25
**Decision Owner:** David
**Status:** Approved
**Source:** PRD Section 1, TASK-0004, DECISION-0013

**Decision:**
Vercel is used as a backend/API layer only where Supabase Edge Functions are not the right fit. Vercel is not the default frontend host. Existing Vercel signing routes (`api/sign-apple.js`, `api/sign-google.js`, `api/idme-callback.js`) are retained pending audit.

New Vercel routes require explicit justification before implementation.

**Canonical reference:** `/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`

---

### FD-008 — Stack Migration: Airtable and Make Abandoned

**Date:** 2026-05-25
**Decision Owner:** David
**Status:** Approved
**Source:** TASK-0003, DECISION-0012
**Area:** Architecture

**Decision:**
Airtable and Make are abandoned as execution platforms. All data moves to Supabase PostgreSQL with RLS. All orchestration logic moves to Supabase Edge Functions or Vercel server-side routes.

Do not write new specs, task files, or blueprints against Airtable or Make.

**Consequences:**
- The Airtable base (`appn3CMhqiH4ExTOP`) is abandoned.
- All business logic from Make scenarios (S2–S13) must be re-specced for Supabase.
- Old Make webhook assumptions may still be embedded in the Lovable frontend — audit required (TASK-0009).

---

### FD-009 — Platform Ownership Boundaries Confirmed

**Date:** 2026-05-25
**Decision Owner:** David
**Status:** Approved
**Source:** TASK-0004, DECISION-0013

**Decision:**
```
Lovable    — owns the MVP user experience
Supabase   — owns product data, auth/data security, RLS, and preferred backend orchestration
Vercel     — owns backend/API routes only where Supabase Edge Functions are not the right fit
```

Every future implementation task must declare: frontend owner, data owner, backend owner, integrations touched, secrets involved, service-role required, RLS impact, user-visible routes affected.

**Canonical reference:** `/docs/architecture/LOVABLE_SUPABASE_VERCEL_RESPONSIBILITY_MAP.md`

**Remaining open within this area:** Four platform assignments are still unresolved — see S1-OD-03 through S1-OD-05 below.

---

### FD-010 — Supabase Schema and RLS Plan Accepted as Planning Baseline

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved as planning baseline — migration SQL not yet authorized
**Source:** TASK-0006
**Canonical reference:** `/docs/architecture/SUPABASE_SCHEMA_RLS_PLAN.md`

**Decision:**
The Supabase Schema and RLS Plan is accepted as the planning baseline. Migration SQL is not yet authorized. Migration SQL requires Codex resolution of OD-1 through OD-12 (assigned via TASK-0007) followed by David migration approval.

**14 authorized MVP tables (canonical names):**

| Canonical Name | v3 Artifact Name | Status |
|---|---|---|
| `profiles` | `profiles` | No change |
| `licenses` | `licenses` | No change |
| `credentials` | `passes` | Rename pending — OD-6 |
| `verification_tokens` | `verification_tokens` | No change |
| `verifiers` | `verifiers` | No change |
| `verification_events` | `verification_events` | No change |
| `subscriptions` | `stripe_subscriptions` | Rename pending — OD-7 |
| `payments` | `purchases` | Rename pending — OD-8 |
| `stripe_events` | *(missing from v3)* | Add pending — OD-10 |
| `wallet_passes` | `wallet_passes` | No change |
| `notification_events` | `communication_events` | Rename pending — OD-9 |
| `pdf_exports` | `pdf_exports` | No change |
| `audit_events` | `audit_events` | No change |
| `license_lookups` | `license_lookups` | No change |

---

### FD-011 — MVP Migration-Blocking Decisions Approved (10 Items)

**Date:** 2026-05-24
**Decision Owner:** David
**Status:** Approved
**Source:** Claude Task 001-R, DECISION-0011
**Canonical file:** `/docs/activity_log/DECISION-0011-MVP-MIGRATION-BLOCKING-DECISIONS.md`

**Approved decisions:**

1. **Data retention:** 7 years for operational, audit, payment, and verification records. Schema enforces with `ON DELETE RESTRICT` on financial and PDF records.
2. **Share-link token TTL:** 72 hours or first successful use.
3. **Show-QR token TTL:** 45 minutes or first use.
4. **Free-tier license entitlement:** 1 license only; no additional license purchases in MVP.
5. **Paid additional-license entitlement:** Standard = 1 included + $4.99 each; Premier = 2 included + $4.99 each.
6. **Subscription pricing:** Standard = $9.99/month; Premier = $19.99/month.
7. **PDF storage:** Supabase Storage.
8. **PDF records:** Tracked in `pdf_exports` table.
9. **PDF access control:** Authenticated nurse access or short-lived signed URLs.
10. **PDF disclaimer:** Static record with `disclaimer_version` field.

**Remaining open from this set:** PDF QR token TTL pending confirmation if PDF QR is in MVP scope (see OD-5 below).

---

### FD-012 — Subscription Pricing Confirmed

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes S1-OD-02
**Source:** DECISION-0011, DECISION-0014
**Area:** Product / Pricing

**Decision:**
```
Standard subscription: $9.99/month
Premier subscription: $19.99/month
```

Stripe product setup can proceed using these prices once migration is approved.

**Remaining open:** Annual plan, trial, and coupon/discount behavior for MVP.

---

## OPEN DECISIONS

Open decisions are unresolved. Do not treat as settled or assume in implementation work until explicitly approved.

---

### S1-OD-01 — Resolve TASK-0006 Schema/RLS Open Decisions (OD-1 through OD-12)

**Status:** Open
**Owner:** Codex (TASK-0007 assigned) + David for product calls
**Blocks:** v4 migration SQL authorization

See OD-1 through OD-12 below.

---

### S1-OD-03 — Wallet Pass Signing Owner: Supabase or Vercel

**Status:** Open
**Owner:** David + Codex/Claude
**Blocks:** Credential issuance implementation tasks

**Context:** Existing Vercel routes `api/sign-apple.js` and `api/sign-google.js` handle wallet signing. Decision required: retain in Vercel or move to Supabase Edge Function.

---

### S1-OD-04 — Stripe Webhook Owner: Supabase or Vercel

**Status:** Open
**Owner:** David + Codex/Claude
**Blocks:** Payment implementation tasks

**Context:** Stripe webhooks require a trusted backend endpoint with HMAC signature validation. Decision required: Supabase Edge Function or Vercel route.

---

### S1-OD-05 — PDF Generation Owner: Supabase or Vercel

**Status:** Open
**Owner:** David + Codex/Claude
**Blocks:** PDF export implementation tasks

**Context:** PDFMonkey is the candidate provider. Decision required: Supabase Edge Function or Vercel route for generation trigger and PDF return to Supabase Storage.

---

### S1-OD-06 — Twilio A2P 10DLC Launch Fallback

**Status:** Open
**Owner:** David
**Blocks:** Launch readiness

**Context:** Twilio A2P 10DLC registration is required before production SMS can be sent. If approval is not ready at launch, phone verification cannot proceed. David must approve a fallback: email-only notification, manual verification, or soft launch without SMS.

---

### OD-1 — `audit_events.action` Canonical Namespace

**Status:** Open
**Owner:** Codex (TASK-0007)
**Blocks:** v4 migration SQL
**Recommendation:** `resource.verb` format (e.g., `credential.issued`, `token.expired`, `verification.viewed`)

---

### OD-2 — `is_primary` License Designation Implementation Path

**Status:** Open
**Owner:** Codex (TASK-0007)
**Blocks:** v4 migration SQL
**Recommendation:** Service-role API route only — not client-settable, not managed via RLS directly

---

### OD-3 — RLS Testing Approach Before Migration

**Status:** Open
**Owner:** Codex (TASK-0007)
**Blocks:** Migration approval
**Context:** Confirm testing methodology before David migration approval — e.g., Supabase test helpers, pgTAP, or manual validation protocol.

---

### OD-4 — `verifiers` Record Behavior for `show_qr` Tokens

**Status:** Open
**Owner:** David (product call) + Codex (TASK-0007)
**Blocks:** v4 migration SQL; verifier flow implementation
**Context:** Does the show-QR verifier path require a form gate (creating a `verifiers` record) or no form gate?

---

### OD-5 — PDF QR Token Type (`pdf_qr`) MVP Scope

**Status:** Open
**Owner:** David (product call) + Codex (TASK-0007)
**Blocks:** v4 migration SQL if `pdf_qr` token type is included
**Context:** Confirm whether a QR code embedded in a PDF export is in or out of MVP scope.

---

### OD-6 — `passes` → `credentials` Rename

**Status:** Open
**Owner:** Codex (TASK-0007)
**Blocks:** v4 migration SQL
**Recommendation:** Accept rename — aligns with canonical naming

---

### OD-7 — `stripe_subscriptions` → `subscriptions` Rename

**Status:** Open
**Owner:** Codex (TASK-0007)
**Blocks:** v4 migration SQL
**Recommendation:** Accept rename — aligns with canonical naming

---

### OD-8 — `purchases` → `payments` Rename

**Status:** Open
**Owner:** Codex (TASK-0007)
**Blocks:** v4 migration SQL
**Recommendation:** Accept rename — aligns with canonical naming

---

### OD-9 — `communication_events` → `notification_events` Rename

**Status:** Open
**Owner:** Codex (TASK-0007)
**Blocks:** v4 migration SQL
**Recommendation:** Accept rename — aligns with canonical naming

---

### OD-10 — Add `stripe_events` Idempotency Table

**Status:** Open
**Owner:** Codex (TASK-0007)
**Blocks:** v4 migration SQL
**Recommendation:** Add table — required for Stripe webhook idempotency. Present in canonical naming but missing from v3 artifact.

---

### OD-11 — Nurse UPDATE Policy on `profiles`: Scope to Safe Columns Only

**Status:** Open — security concern
**Owner:** Codex (TASK-0007)
**Blocks:** v4 migration SQL
**Context:** The nurse UPDATE RLS policy on `profiles` must be scoped to safe columns only (e.g., `display_name`, `phone`, `avatar_url`). Must not allow nurse to update `subscription_tier`, `deleted_at`, `idme_subject`, or other privileged fields. Must not be left open at migration time.

---

### OD-12 — `license_status_mappings`: DB Reference Table or Edge Function Logic

**Status:** Open
**Owner:** David (product call likely required) + Codex (TASK-0007)
**Blocks:** v4 migration SQL
**Context:** Determine whether license status mapping logic lives in a database reference table or in Edge Function code. If DB table: schema required before migration. If Edge Function: table can be omitted.

---

---

### FD-013 — Canonical Supabase Instance Confirmed

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes A-OD-01
**Source:** TASK-0009 Lovable audit
**Area:** Architecture / Infrastructure

**Decision:**
```
Canonical Supabase project: PassTo Dev
Project ID: wvzjfxacykgsaffskgtr
URL: https://wvzjfxacykgsaffskgtr.supabase.co
Region: us-west-2
Status: ACTIVE_HEALTHY — empty, clean slate
```

This is the project where v4 migration SQL will be applied. All three Lovable projects (PassTo Website, PassTo Enroll, PassTo App) must be re-pointed to this instance after migration.

**Inventory of all Supabase instances discovered during TASK-0009 audit:**

| Project ID Prefix | Name | Owner | Status | Disposition |
|---|---|---|---|---|
| `wvzjfxacykgsaffskgtr` | PassTo Dev | David (this org) | Empty — canonical target | **KEEP — migrate here** |
| `zpvbexzdiklxlvrxsvop` | david-bloom's Project | David (this org) | Empty | Decommission or ignore |
| `zektkbhvmbbmhvthwah` | Lovable-managed (P1 Website) | Lovable org | Unknown data state | Replace with canonical after migration |
| `ofpxczstptysqxoruiox` | Lovable-managed (P2 Enroll) | Lovable org | Has enrollment data | Audit for user data before decommission |
| `vvefeasvpmdsqvwkkzsj` | Lovable-managed (P3 App) | Lovable org | Unknown data state | Replace with canonical after migration |

**Consequences:**
- v4 migration SQL targets `wvzjfxacykgsaffskgtr`
- All Lovable project `VITE_SUPABASE_URL` env vars must be updated to point to `wvzjfxacykgsaffskgtr` after migration
- Before decommissioning P2's Lovable-managed Supabase (`ofpxczstptysqxoruiox`), check for any real user data that needs to be preserved

---

### S1-OD-03 — Wallet Pass Signing Owner: Supabase or Vercel

**Status:** Open — TASK-0009 finding: neither option currently wired
**Owner:** David + Codex/Claude
**Blocks:** Credential issuance implementation tasks

**Updated context from TASK-0009:** Vercel `api/sign-apple.js` and `api/sign-google.js` exist but are not called from any Lovable project. Wallet pass generation is not implemented. Decision still required and now also needs an implementation task.

---

## OPEN DECISIONS (updated after TASK-0009)

| ID | Decision | Status | Blocks |
|---|---|---|---|
| S1-OD-01 | Resolve TASK-0006 OD-1 through OD-12 | Open — TASK-0007 assigned to Codex | v4 migration SQL |
| S1-OD-03 | Wallet pass signing owner: Supabase or Vercel | Open | Credential issuance |
| S1-OD-04 | Stripe webhook owner: Supabase or Vercel | Open | Payment tasks |
| S1-OD-05 | PDF generation owner: Supabase or Vercel | Open | PDF export tasks |
| S1-OD-06 | Twilio A2P 10DLC launch fallback | Open | Launch readiness |
| A-OD-01 | Canonical Supabase instance | **Resolved — FD-013: `wvzjfxacykgsaffskgtr`** | — |
| A-OD-02 | Are P1/P2/P3 permanent or consolidating? | Open — David decision | Architecture |
| A-OD-03 | Is `IdmeCallback.tsx` doing client-side code exchange? | Open — security review required | ID.me migration |
| A-OD-04 | Which project serves `passtodigital.com` currently? P1 or P3? | Open | Routing clarity |
| A-OD-05 | Wallet pass signing owner | Open (same as S1-OD-03) | — |

---

## Log Metadata

| Field | Value |
|---|---|
| Created | 2026-05-26 |
| Last updated | 2026-05-26 (TASK-0009 findings added) |
| Log status | Updated — Ready for David Review |
| Completed decisions | FD-001 through FD-013 |
| Open decisions | S1-OD-01, S1-OD-03–S1-OD-06, A-OD-02–A-OD-05, OD-1–OD-12 (21 total) |
| Next action | David reviews FD-013 and A-OD-02 through A-OD-04 |
| Critical blocking task | TASK-0007 — Codex must resolve OD-1 through OD-12 before v4 migration SQL |
