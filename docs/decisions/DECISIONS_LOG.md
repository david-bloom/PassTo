# PassTo Decisions Log

**Created:** 2026-05-26
**Task:** TASK-0008
**Status:** Active
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

### FD-014 — Three Lovable Apps, One Supabase Project

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes A-OD-02
**Source:** TASK-0009 Lovable audit
**Area:** Architecture

**Decision:**
```
P1 PassTo Website  → wvzjfxacykgsaffskgtr (PassTo Dev)
P2 PassTo Enroll   → wvzjfxacykgsaffskgtr (PassTo Dev)
P3 PassTo App      → wvzjfxacykgsaffskgtr (PassTo Dev)
```

Three permanent Lovable projects. All three share the single canonical Supabase instance. No consolidation of Lovable projects planned.

**Consequences:**
- All three Lovable projects must have `VITE_SUPABASE_URL` updated to `https://wvzjfxacykgsaffskgtr.supabase.co` after v4 migration SQL is applied
- Supabase Auth sessions created in P2 (enrollment) are valid in P3 (dashboard) — same auth system, same project
- RLS policies must account for all three frontends sharing the same database — no per-app data isolation at the DB layer
- Edge functions deployed to `wvzjfxacykgsaffskgtr` serve all three apps
- P1's `create-checkout` edge function, P2's `submit-enrollment` edge function, and any future edge functions all land in the same project

---

### FD-015 — Wallet Pass Signing Owner: Vercel

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes S1-OD-03 and A-OD-05
**Area:** Architecture

**Decision:**
Wallet pass signing remains in Vercel. Existing routes confirmed as the implementation target:
```
api/sign-apple.js  — Apple Wallet pass generation (PassKit + @vercel/blob)
api/sign-google.js — Google Wallet pass generation (JWT signing)
```

**Consequences:**
- These routes are currently not called from any Lovable project — wiring them in is part of TASK-0011 / credential issuance implementation
- Apple certs (`APPLE_WWDR_PEM_BASE64`, `APPLE_CERT_PEM_BASE64`, `APPLE_KEY_PEM_BASE64`) and Google service account (`GOOGLE_SERVICE_ACCOUNT_JSON`) remain as Vercel env vars
- Lovable frontend calls a Supabase Edge Function or directly invokes the Vercel route to trigger signing — exact invocation pattern to be defined in implementation task

---

### FD-016 — Stripe Webhook Owner: Supabase Edge Function

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes S1-OD-04
**Area:** Architecture

**Decision:**
Stripe webhooks are handled by a Supabase Edge Function, not a Vercel route.

**Consequences:**
- The `stripe_events` idempotency table (OD-10 in TASK-0007) is confirmed required — Supabase Edge Function needs it for webhook deduplication
- Stripe webhook secret (`STRIPE_WEBHOOK_SECRET`) must be stored as a Supabase Edge Function secret, not a Vercel env var
- Existing P1 `create-checkout` Supabase Edge Function aligns with this decision — checkout is already in Supabase
- No Vercel route for Stripe — any existing Vercel Stripe references should be removed

---

### FD-017 — PDF Generation Owner: Supabase Edge Function

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes S1-OD-05
**Area:** Architecture

**Decision:**
PDF generation is handled by a Supabase Edge Function, not a Vercel route.

**Consequences:**
- PDFMonkey (candidate provider) is called from a Supabase Edge Function
- Generated PDF is stored in Supabase Storage per FD-011 (DECISION-0011 item 7)
- PDF access uses authenticated nurse access or short-lived signed URLs per FD-011 (item 9)
- No Vercel route for PDF generation

---

### FD-018 — Twilio Launch Gate: No Production Launch Without Approved SMS Path

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes S1-OD-06
**Area:** Launch Readiness

**Decision:**
PassTo will not launch to production without an approved Twilio A2P 10DLC SMS path. There is no email-only or manual-verification fallback approved for launch.

**Consequences:**
- Twilio A2P 10DLC registration is a hard launch prerequisite — not optional
- Launch readiness checklist must include A2P 10DLC approval status as a gate
- Phone verification (Twilio SMS OTP) is required in the onboarding flow before credential issuance
- If A2P 10DLC approval is delayed, launch date moves — not the SMS requirement

---

### FD-019 — Selfie Ownership: PassTo via Supabase Storage

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes TASK-0010 open scope item 1
**Area:** Architecture / Data / Security

**Decision:**
PassTo owns the post-match selfie asset. ID.me handles identity verification; the selfie captured after successful data matching is stored in Supabase Storage under PassTo's control.

**Access rules:**
- Protected Supabase Storage bucket — not public
- Access via RLS/storage policies for authenticated nurse (own selfie only)
- Service-role signed URLs for any ops/audit access
- Selfie never returned in frontend API responses

**Consequences:**
- `profiles` or a dedicated `selfie_assets` reference in the schema stores the Supabase Storage path
- Storage bucket policy must enforce nurse-only read of own selfie
- Selfie captured in P2 Lovable enrollment flow after data match gate passes

---

### FD-020 — Subscription Lapse Behavior

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes TASK-0010 open scope item 2
**Area:** Product / Subscriptions

**Decision:**
On subscription lapse, downgrade to Free-tier behavior. Do not delete or hide credentials. Do not revoke wallet pass solely due to payment lapse.

**Specific lapse rules:**

| Item | On Lapse |
|---|---|
| Credential visibility | Remains visible to nurse — do not hide |
| Wallet pass | Remains valid — do not revoke for payment lapse alone |
| Nurse dashboard | Remains accessible |
| Entitlement tier | Downgraded to Free immediately on lapse |
| Extra licenses | Blocked — cannot purchase or add |
| Included refreshes | Blocked — no paid-tier refresh quota |
| Included PDFs | Blocked |
| Included share/QR usage | Blocked for new paid-tier-only allocations |
| Existing active share/QR tokens | Remain valid until normal TTL expiry |
| Fraud / payment reversal | May require explicit revocation — handled separately |

**Consequences:**
- Lapse handling is a state transition in `subscriptions` table — not a data deletion
- Entitlement gating logic must read current `subscription_tier` from `subscriptions` at request time
- Existing active tokens not retroactively invalidated on lapse (only on fraud/reversal)
- Wallet pass lifecycle (refresh, updates) pauses but pass is not revoked

---

### FD-021 — Lovable → Supabase Edge Function Invocation Pattern

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes TASK-0010 open scope item 3
**Area:** Architecture / Security

**Decision:**
Lovable invokes Supabase Edge Functions using the logged-in user's JWT. The publishable/anon key is the only Supabase key that lives in Lovable.

```
Pattern:
  Lovable (publishable key + user JWT)
    → supabase.functions.invoke("function-name", { body: data })
    → Edge Function receives request with Authorization: Bearer <user_JWT>
    → Edge Function verifies user via JWT
    → Edge Function uses service_role internally for privileged reads/writes
    → service_role key never appears in Lovable

"Lovable knocks on the door; the Edge Function decides what happens inside."
```

**Consequences:**
- Every Edge Function that performs privileged operations must validate the user JWT before using service_role
- service_role key stored as Supabase Edge Function secret only — never in Lovable env vars
- Unauthenticated Edge Function calls (e.g., verifier `/v/{token}` access) use a different pattern: public token lookup with service_role inside the function, no user JWT required
- This pattern applies to P1, P2, and P3 Lovable projects equally

---

### FD-022 — `passtodigital.com` Routes to P1 (PassTo Website)

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes A-OD-04 and TASK-0010 open scope item 4
**Area:** Routing / Deployment

**Decision:**
`passtodigital.com` currently points to P1 (PassTo Website — Lovable project `6c973fd1-2dcd-4377-8c98-4d2f0d68732e`).

Verifiable via: Lovable domain settings, Vercel domain settings, or DNS records for `passtodigital.com`.

**Known subdomain routing:**
- `passtodigital.com` → P1 PassTo Website
- `enroll.passtodigital.com` → P2 PassTo Enroll
- P3 PassTo App → domain/subdomain TBD

**Consequences:**
- Post-migration, P1 `VITE_SUPABASE_URL` is the first env var update that affects live production traffic at `passtodigital.com`
- P3 domain assignment should be confirmed before implementation tasks target P3 routing

---

### FD-023 — Show QR Verifier Flow: Form-Gated

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes OD-4 and TASK-0010 open scope item 5
**Area:** Product / Schema

**Decision:**
Show QR verification is form-gated. Verifiers must submit a form before viewing the credential.

**Required form fields:**
- `verifier_name`
- `verifier_email`

**Records created on submission:**
- `verifiers` record
- `verification_events` record

This is consistent with the share link verifier flow (LC-11). Show QR and share link both gate access through the same verifier form + terms acceptance pattern.

**Consequences:**
- `verifiers` table design must support both `share_link` and `show_qr` token types
- `verification_events` records the token type used
- Show QR remains Deferred (D-1) for launch but its implementation pattern is now fully defined

---

### FD-024 — `license_status_mappings`: DB Reference Table

**Date:** 2026-05-26
**Decision Owner:** David
**Status:** Approved — closes OD-12 and TASK-0010 open scope item 6
**Area:** Schema / Product

**Decision:**
License status mapping logic lives in a database reference table, not solely in Edge Function code.

**Rationale:** Status mapping is product logic and must be auditable and reviewable. Embedding it only in Edge Function code makes it invisible to ops and hard to update without a code deploy.

**Consequences:**
- `license_status_mappings` table is included in v4 migration SQL
- Table is populated with initial status mappings before migration is approved
- Edge Functions read from `license_status_mappings` at runtime — not hardcoded logic
- Schema for this table must be defined in TASK-0007 Codex response or Claude v4 SQL work

---

## OPEN DECISIONS

Open decisions are unresolved. Do not treat as settled or assume in implementation work until explicitly approved.

---

### S1-OD-01 — Resolve TASK-0006 Schema/RLS Open Decisions (OD-1 through OD-12)

**Status:** Open
**Owner:** Codex (TASK-0007 assigned) + David for product calls
**Blocks:** v4 migration SQL authorization

See OD-1 through OD-11 below. (OD-4 and OD-12 resolved by David — FD-023 and FD-024.)

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

## OPEN DECISIONS SUMMARY TABLE

| ID | Decision | Status | Blocks |
|---|---|---|---|
| S1-OD-01 | Resolve TASK-0006 OD-1 through OD-12 | Open — TASK-0007 assigned to Codex | v4 migration SQL |
| S1-OD-02 | Final MVP subscription pricing | **Resolved — FD-012: Standard $9.99, Premier $19.99** | — |
| S1-OD-03 | Wallet pass signing owner | **Resolved — FD-015: Vercel** | — |
| S1-OD-04 | Stripe webhook owner | **Resolved — FD-016: Supabase Edge Function** | — |
| S1-OD-05 | PDF generation owner | **Resolved — FD-017: Supabase Edge Function** | — |
| S1-OD-06 | Twilio A2P 10DLC fallback | **Resolved — FD-018: Hard launch gate — no launch without approved SMS** | — |
| A-OD-01 | Canonical Supabase instance | **Resolved — FD-013: `wvzjfxacykgsaffskgtr`** | — |
| A-OD-02 | Are P1/P2/P3 permanent or consolidating? | **Resolved — FD-014: 3 Lovable apps, 1 Supabase project** | — |
| A-OD-03 | Is `IdmeCallback.tsx` doing client-side code exchange? | **Resolved — No. Make holds client_secret. 2 launch blockers: idmelabs→production URL; nurseId→Supabase UUID. TASK-0011.** | — |
| A-OD-04 | Which project serves `passtodigital.com`? | **Resolved — FD-022: P1 PassTo Website** | — |
| A-OD-05 | Wallet pass signing owner (duplicate of S1-OD-03) | **Resolved — FD-015: Vercel** | — |
| OD-1 | `audit_events.action` canonical namespace | Open — Codex TASK-0007 | v4 migration SQL |
| OD-2 | `is_primary` implementation path | Open — Codex TASK-0007 | v4 migration SQL |
| OD-3 | RLS testing approach | Open — Codex TASK-0007 | Migration approval |
| OD-4 | `verifiers` record behavior for `show_qr` | **Resolved — FD-023: Form-gated; verifier_name + verifier_email** | — |
| OD-5 | PDF QR token type (`pdf_qr`) MVP scope | Open — David product call | v4 migration SQL |
| OD-6 | `passes` → `credentials` rename | Open — Codex TASK-0007 | v4 migration SQL |
| OD-7 | `stripe_subscriptions` → `subscriptions` rename | Open — Codex TASK-0007 | v4 migration SQL |
| OD-8 | `purchases` → `payments` rename | Open — Codex TASK-0007 | v4 migration SQL |
| OD-9 | `communication_events` → `notification_events` rename | Open — Codex TASK-0007 | v4 migration SQL |
| OD-10 | Add `stripe_events` idempotency table | Open — Codex TASK-0007 | v4 migration SQL |
| OD-11 | Nurse UPDATE policy on `profiles` scoped to safe columns | Open — Codex TASK-0007 | v4 migration SQL |
| OD-12 | `license_status_mappings`: DB table or Edge Function logic | **Resolved — FD-024: DB reference table** | — |

---

## Log Metadata

| Field | Value |
|---|---|
| Created | 2026-05-26 |
| Last updated | 2026-05-26 (FD-019–FD-024 added; OD-4, OD-12, A-OD-04 closed) |
| Log status | Active |
| Completed decisions | FD-001 through FD-024 (24 total) |
| Open decisions | S1-OD-01, OD-1, OD-2, OD-3, OD-5, OD-6, OD-7, OD-8, OD-9, OD-10, OD-11 (11 total) |
| Next action | TASK-0007 (Codex) resolves OD-1–OD-3, OD-5–OD-11 before v4 migration SQL |
| Critical blocking task | TASK-0007 — Codex must resolve remaining ODs before v4 migration SQL |
