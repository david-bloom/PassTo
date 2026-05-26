# P2 Enrollment Pipeline Migration Spec

**Document ID:** P2_ENROLLMENT_PIPELINE_MIGRATION_SPEC
**Created:** 2026-05-26
**Task:** TASK-0011
**Owner:** Claude (David final approver)
**Status:** Approved — David 2026-05-26
**Target Supabase:** `wvzjfxacykgsaffskgtr` (PassTo Dev)

---

## 1. Problem Statement

The P2 enrollment pipeline at `enroll.passtodigital.com` is in violation of the approved platform ownership architecture (FD-008, FD-009, DECISION-0013) in four ways, all identified in the TASK-0009 audit:

| Finding | Description | Severity |
|---|---|---|
| **CF-2** | Make.com is the active enrollment backend. Live webhook called from browser (x2) and from `submit-enrollment` Edge Function. | Critical — must fix before migration |
| **CF-3** | ID.me OAuth callback handled in Lovable browser code (`IdmeCallback.tsx`), not in a server-side function. Auth code transmitted browser→Make via `fetch()`. | Critical — must fix before launch |
| **CF-4** | Dead Airtable edge functions (`sync-airtable` in P1, `create-airtable-record` in P2) still deployed and called from frontend code. | High — remove |
| **CF-5** | Wallet pass signing routes exist in Vercel (`api/sign-apple.js`, `api/sign-google.js`) but are not called from any Lovable project. | Critical — must wire before launch |

Additionally, `nurseId` throughout the entire P2 flow is an Airtable record ID (`recXXXXXX`), not a Supabase UUID. Every reference must change to `profiles.id` after the v4 migration SQL is applied.

---

## 2. Current P2 Enrollment Flow

Documented from the TASK-0009 audit and TASK-0009 Addendum 2 (A-OD-03 resolution).

```
Step 1 — CreateAccount.tsx
  supabase.auth.signUp({ email, password })          ← creates Supabase Auth user (UUID exists)
  supabase.functions.invoke("create-airtable-record") ← DEAD — but still called
    returns result.id = "recXXXXXX"                  ← Airtable record ID stored as nurseId
  supabase.functions.invoke("submit-enrollment")      ← active, calls Make internally
    fetch(MAKE_WEBHOOK_URL, { ... })                  ← Make creates/updates Airtable record
  update({ nurseId: result.id })                      ← stores Airtable ID in enrollment state

Step 2 — IdVerification.tsx
  persistIdmePending({ nurseId: "recXXXXXX", phoneNumber }) → localStorage[IDME_STORAGE_KEY]
  window.location.href = IDME_AUTHORIZE_URL
  → https://api.idmelabs.com/oauth/authorize           ← SANDBOX, not production
      ?client_id=8c31c52383e4d0d1b4ac2486281bac1f
      &redirect_uri=https://enroll.passtodigital.com/auth/idme/callback
      &response_type=code
      &scope=tefca

Step 3 — ID.me redirects to:
  https://enroll.passtodigital.com/auth/idme/callback?code=<auth_code>

Step 4 — IdmeCallback.tsx
  code     = searchParams.get("code")                 ← auth code from URL
  raw      = localStorage.getItem(IDME_STORAGE_KEY)   ← { nurseId: "recXXXXXX", phoneNumber }
  localStorage.removeItem(IDME_STORAGE_KEY)           ← cleanup

  // Call 1: identity exchange — browser→Make
  fetch(webhookUrl, { body: JSON.stringify({ code, nurseId, phoneNumber, ... }) })
  → POST https://hook.us2.make.com/6c1ylx67nwua8ksk3segplftob5iu9m8
  Make: exchanges code with ID.me using client_secret
  Make: validates IAL2 + TEFCA scope
  Make: extracts identity data
  Make: updates Airtable record

  // Call 2: license lookup trigger — browser→Make (fire and forget)
  void fetch(licenseWebhookUrl, { ... })
  → second Make webhook (triggers license lookup Make scenario)

  → navigates to /account-select

Step 5 — AccountSelect.tsx, Payment.tsx
  → Stripe checkout (supabase.functions.invoke("create-checkout"))
  → Stripe redirects back after payment

Step 6 — UploadSelfie.tsx
  → file upload (current destination unknown — likely local state or Airtable)
  supabase.functions.invoke("submit-enrollment", { body: { step: "selfie", ... } })
  → submit-enrollment calls Make internally

Step 7 — SecondLicense.tsx (if applicable)
  supabase.functions.invoke("submit-enrollment", { body: { ... } })

Step 8 — PassReady.tsx
  → wallet pass NOT generated (CF-5)
  → currently a static confirmation screen
```

**Key problem summary:**
- Supabase Auth UUID is created in Step 1 but immediately discarded — Airtable ID used instead
- Make.com handles all identity work (Steps 4–5)
- Browser directly calls Make (Steps 4a, 4b) — violates FD-009 / DECISION-0013
- ID.me sandbox endpoint used throughout (Step 2)
- Wallet pass never generated (Step 8)

---

## 3. Target P2 Enrollment Flow

Against the approved architecture: FD-008 (no Make/Airtable), FD-009 (Supabase owns backend), FD-019 (selfie→Supabase Storage), FD-021 (Lovable→Edge Function via user JWT).

```
Step 1 — CreateAccount.tsx
  supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } })
    → creates Supabase Auth user; user.id is the UUID
  supabase.functions.invoke("submit-enrollment", {
    body: { step: "create", full_name, phone }
  })                                                  ← user JWT in Authorization header (FD-021)
    → Edge Function verifies JWT → auth.uid() = UUID
    → creates profiles record (id = auth.uid())
    → returns { success: true }
  update({ nurseId: supabase.auth.user.id })          ← UUID, not Airtable ID

Step 2 — IdVerification.tsx
  persistIdmePending({ nurseId: UUID, phoneNumber }) → localStorage[IDME_STORAGE_KEY]
  window.location.href = IDME_AUTHORIZE_URL
  → https://api.id.me/oauth/authorize                 ← PRODUCTION endpoint
      ?client_id=<PRODUCTION_CLIENT_ID>               ← from env var VITE_IDME_CLIENT_ID
      &redirect_uri=https://enroll.passtodigital.com/auth/idme/callback
      &response_type=code
      &scope=tefca

Step 3 — ID.me redirects to:
  https://enroll.passtodigital.com/auth/idme/callback?code=<auth_code>

Step 4 — IdmeCallback.tsx
  code     = searchParams.get("code")                 ← auth code from URL
  raw      = localStorage.getItem(IDME_STORAGE_KEY)   ← { nurseId: UUID, phoneNumber }
  localStorage.removeItem(IDME_STORAGE_KEY)           ← cleanup

  // Call 1: server-side identity exchange — replaces both Make fetch() calls
  const idmeResult = await supabase.functions.invoke("idme-exchange", {
    body: { code }                                    ← user JWT in Authorization header (FD-021)
  })
  // idme-exchange Edge Function (single-purpose — identity only):
  //   verifies user JWT → auth.uid()
  //   exchanges code with api.id.me using IDME_CLIENT_SECRET (edge function secret)
  //   validates IAL2 + TEFCA scope
  //   updates profiles record (idme_verified, idme_subject, idme_verified_at)
  //   returns { verified: true, identity: { full_name, dob, ... } }

  if (!idmeResult.data?.verified) { /* handle error */ return }

  // Call 2: license lookup — separate call, not inline in idme-exchange (FD-027)
  const licenseResult = await supabase.functions.invoke("lookup-license", {
    body: {}                                          ← user JWT identifies the nurse; Edge Fn fetches profiles
  })
  // lookup-license aligns with FLOW-LICENSE-002 spec
  // if licenseResult fails, show error/retry — do not block navigation on transient failure

  → navigates to /account-select

Step 5 — AccountSelect.tsx, Payment.tsx
  → Stripe checkout (supabase.functions.invoke("create-checkout"))  ← unchanged

Step 6 — UploadSelfie.tsx
  // Upload to Supabase Storage (FD-019)
  supabase.storage.from("selfies").upload(`${user.id}/selfie.jpg`, file)
    → protected bucket; RLS: nurse can write own selfie only
  supabase.functions.invoke("submit-enrollment", {
    body: { step: "selfie", selfie_storage_path: `${user.id}/selfie.jpg` }
  })                                                  ← user JWT in Authorization header
    → Edge Function updates profiles record (selfie_storage_path)

Step 7 — SecondLicense.tsx (if applicable)
  supabase.functions.invoke("submit-enrollment", {
    body: { step: "second-license", license_number, license_state }
  })

Step 8 — PassReady.tsx
  // Wallet pass issuance (see OD-T11-02 — trigger point TBD)
  supabase.functions.invoke("issue-wallet-pass")      ← user JWT in Authorization header
    → Edge Function verifies JWT → auth.uid()
    → fetches credential data from credentials table (or creates it)
    → calls Vercel api/sign-apple.js with credential payload (server-to-server)
    → calls Vercel api/sign-google.js with credential payload (server-to-server)
    → stores wallet pass URLs in wallet_passes table
    → returns { apple_pass_url, google_pass_url }
  → displays pass download buttons
```

---

## 4. Component Change Specifications

---

### 4.1 — `CreateAccount.tsx` (P2 Lovable)

**Change 1:** Remove call to `create-airtable-record` edge function entirely.

**Change 2:** After `supabase.auth.signUp()` succeeds, use `user.id` as `nurseId`:
```
// Before (remove):
const { data: airtableData } = await supabase.functions.invoke("create-airtable-record", { ... })
update({ nurseId: airtableData.id })  // "recXXXXXX"

// After:
const { data: authData } = await supabase.auth.signUp({ email, password, ... })
update({ nurseId: authData.user.id })  // UUID
```

**Change 3:** `submit-enrollment` invocation must include `step: "create"`:
```
await supabase.functions.invoke("submit-enrollment", {
  body: { step: "create", full_name, phone }
  // Authorization: Bearer <user_JWT> sent automatically by supabase.functions.invoke()
})
```

**No other changes** to CreateAccount.tsx logic — form fields, validation, navigation unchanged.

---

### 4.2 — `IdVerification.tsx` (P2 Lovable)

**Change 1:** Replace sandbox endpoint with production:
```
// Before (remove):
const IDME_AUTHORIZE_URL =
  `https://api.idmelabs.com/oauth/authorize?client_id=8c31c52383e4d0d1b4ac2486281bac1f&...`

// After:
const IDME_AUTHORIZE_URL =
  `https://api.id.me/oauth/authorize?client_id=${import.meta.env.VITE_IDME_CLIENT_ID}&...`
```

**Change 2:** `nurseId` stored in localStorage is now a UUID (no code change needed if `nurseId` in enrollment state is already a UUID — flows from CreateAccount.tsx fix above).

**No other changes** — redirect_uri, scope, response_type unchanged.

---

### 4.3 — `IdmeCallback.tsx` (P2 Lovable)

**Change 1:** Remove both `fetch()` calls to Make webhook:
```
// Remove entirely:
const res = await fetch(webhookUrl, { ... })         // line 81
void fetch(licenseWebhookUrl, { ... })               // line 99
```

**Change 2:** Replace both Make `fetch()` calls with two sequential Edge Function invocations (FD-027):
```
// Step A: identity exchange (replaces Make webhook call 1)
const { data: idmeData, error: idmeError } = await supabase.functions.invoke("idme-exchange", {
  body: { code }
})

if (idmeError || !idmeData?.verified) {
  // handle failure — navigate to error/retry screen
  return
}

// Step B: license lookup (replaces Make webhook call 2 — separate function per FD-027)
const { data: licenseData, error: licenseError } = await supabase.functions.invoke("lookup-license", {
  body: {}
})

if (licenseError) {
  // log error but do not hard-block — license lookup can be retried
  console.error("License lookup failed:", licenseError)
}

// navigate to /account-select
```

**Change 3:** Remove Make webhook URL references from imports/constants:
```
// Remove:
const webhookUrl = import.meta.env.VITE_WEBHOOK_IDME_CALLBACK || "https://hook.us2.make.com/..."
const licenseWebhookUrl = ...
```

**Unchanged:** localStorage read/cleanup pattern (lines 44, 60) is fine — keep as-is.

---

### 4.4 — `submit-enrollment` Edge Function (P2 — target Supabase: `wvzjfxacykgsaffskgtr`)

**Current behavior (remove all of this):**
- Calls Make webhook: `fetch(MAKE_WEBHOOK_URL, { ... })`
- Passes Airtable record IDs

**Target behavior — step-aware orchestrator:**

```typescript
// Interface
POST /functions/v1/submit-enrollment
Authorization: Bearer <user_JWT>
Body: {
  step: "create" | "selfie" | "second-license"
  // step-specific fields:
  full_name?: string        // step: create
  phone?: string            // step: create
  selfie_storage_path?: string  // step: selfie
  license_number?: string   // step: second-license
  license_state?: string    // step: second-license
}

// Edge Function logic (all steps):
1. Verify JWT → const user = await supabase.auth.getUser(jwt)
2. if (!user) return 401

// step: "create"
3a. INSERT INTO profiles (id, full_name, phone, enrollment_status, created_at)
    VALUES (user.id, full_name, phone, 'pending', now())
    ON CONFLICT (id) DO UPDATE SET full_name, phone, updated_at
4a. return { success: true }

// step: "selfie"
3b. UPDATE profiles SET selfie_storage_path = selfie_storage_path, updated_at = now()
    WHERE id = user.id
4b. return { success: true }

// step: "second-license"
3c. INSERT INTO licenses (nurse_id, license_number, license_state, is_primary)
    VALUES (user.id, license_number, license_state, false)
4c. return { success: true }
```

**Secrets required:** None beyond the standard Supabase service role (already available inside Edge Functions).

**Remove from current `submit-enrollment`:**
- `MAKE_WEBHOOK_URL` env var reference
- `fetch(MAKE_WEBHOOK_URL, ...)` call
- Any Airtable record ID handling

---

### 4.5 — New Edge Function: `idme-exchange` (target Supabase: `wvzjfxacykgsaffskgtr`)

**Purpose:** Server-side ID.me authorization code exchange. Replaces both Make webhook calls from `IdmeCallback.tsx`.

```typescript
// Interface
POST /functions/v1/idme-exchange
Authorization: Bearer <user_JWT>
Body: {
  code: string   // ID.me authorization code from OAuth callback URL
}

// Response (success):
{
  verified: true,
  idme_subject: string,
  identity: {
    full_name: string,
    first_name: string,
    last_name: string,
    // additional TEFCA-scoped attributes as returned by ID.me
  }
}

// Response (failure):
{
  verified: false,
  error: "invalid_code" | "ial2_required" | "scope_missing" | "exchange_failed"
}

// Edge Function logic:
1. Verify JWT → const user = await supabase.auth.getUser(jwt)
2. if (!user) return 401

3. POST https://api.id.me/oauth/token
   body: {
     grant_type: "authorization_code",
     code: code,
     client_id: Deno.env.get("IDME_CLIENT_ID"),
     client_secret: Deno.env.get("IDME_CLIENT_SECRET"),
     redirect_uri: Deno.env.get("IDME_REDIRECT_URI")
     // = "https://enroll.passtodigital.com/auth/idme/callback"
   }
   → receives { access_token, token_type, scope }

4. Validate scope includes "tefca"
5. Validate IAL level from token claims or userinfo endpoint

6. GET https://api.id.me/api/public/v3/attributes.json
   Authorization: Bearer <access_token>
   → receives identity attributes

7. UPDATE profiles SET
     idme_subject = <subject_id>,
     idme_verified = true,
     idme_verified_at = now(),
     updated_at = now()
   WHERE id = user.id

8. Optionally: trigger license lookup (see OD-T11-03)

9. return { verified: true, idme_subject, identity: { ... } }
```

**Required Edge Function Secrets (stored in Supabase project `wvzjfxacykgsaffskgtr`):**
```
IDME_CLIENT_ID      = <production ID.me client_id>
IDME_CLIENT_SECRET  = <production ID.me client_secret>
IDME_REDIRECT_URI   = https://enroll.passtodigital.com/auth/idme/callback
```

**Blocked by:** ID.me production credentials (OD-T11-01); v4 migration SQL applied (profiles table required).

---

### 4.6 — New Edge Function: `issue-wallet-pass` (target Supabase: `wvzjfxacykgsaffskgtr`)

**Purpose:** Triggers wallet pass generation by calling Vercel signing routes server-to-server, then stores the resulting pass in `wallet_passes` table. Wires CF-5 (wallet pass not connected).

```typescript
// Interface
POST /functions/v1/issue-wallet-pass
Authorization: Bearer <user_JWT>
Body: {} or { credential_id?: string }

// Response (success):
{
  issued: true,
  apple_pass_url: string,     // signed .pkpass download URL
  google_pass_url: string,    // Google Wallet save link
  wallet_pass_id: string      // UUID of wallet_passes record
}

// Edge Function logic:
1. Verify JWT → const user = await supabase.auth.getUser(jwt)
2. if (!user) return 401

3. Fetch credential data from credentials table
   SELECT * FROM credentials WHERE nurse_id = user.id AND status = 'active' LIMIT 1

4. Build credential payload:
   {
     nurseId: user.id,
     nurseName: profiles.full_name,
     licenseNumber: licenses.license_number,
     licenseState: licenses.license_state,
     licenseStatus: licenses.status,
     expiresAt: credentials.expires_at,
     issuedAt: now()
   }

5. Call Vercel Apple signing route (server-to-server):
   POST https://<vercel-domain>/api/sign-apple
   body: credential_payload
   → receives signed .pkpass file or storage URL

6. Call Vercel Google signing route (server-to-server):
   POST https://<vercel-domain>/api/sign-google
   body: credential_payload
   → receives Google Wallet JWT link

7. Store in Supabase Storage (if pass file returned, not URL):
   supabase.storage.from("wallet-passes").upload(...)

8. INSERT INTO wallet_passes (
     nurse_id, credential_id, apple_pass_url, google_pass_url,
     issued_at, status
   ) VALUES (...)

9. return { issued: true, apple_pass_url, google_pass_url, wallet_pass_id }
```

**Required Edge Function Secrets:**
```
VERCEL_WALLET_SIGNING_URL   = https://<vercel-app>.vercel.app
VERCEL_WALLET_API_SECRET    = <shared secret for Vercel route auth>  [if Vercel routes require auth]
```

**Note on Vercel route authentication:** The Vercel `api/sign-apple.js` and `api/sign-google.js` routes are called by this Edge Function server-to-server. If those Vercel routes are not currently gated (no auth header check), add a shared secret header to prevent public access. This is a Vercel implementation detail to confirm.

**Blocked by:** v4 migration SQL applied (`credentials`, `wallet_passes` tables required); OD-T11-02 (trigger point: enrollment vs. dashboard).

---

### 4.7 — Dead Code Removal

**P1 PassTo Website — remove `sync-airtable`:**

Files to update in P1 Lovable:
| File | Change |
|---|---|
| `src/pages/AccessGateModal.tsx` (or component) | Remove `supabase.functions.invoke("sync-airtable")` call |
| `src/pages/CreateAccount.tsx` (P1) | Remove `supabase.functions.invoke("sync-airtable")` call |
| Lovable-managed Supabase P1 (`zektkbhvmbbmhvthwah`) | Delete `sync-airtable` Edge Function |

**P2 PassTo Enroll — remove `create-airtable-record`:**

Files to update in P2 Lovable:
| File | Change |
|---|---|
| `src/pages/CreateAccount.tsx` (P2) | Remove `supabase.functions.invoke("create-airtable-record")` call (already covered in §4.1) |
| Lovable-managed Supabase P2 (`ofpxczstptysqxoruiox`) | Delete `create-airtable-record` Edge Function |

**P3 PassTo App — remove dead Airtable comment:**

Files to update in P3 Lovable:
| File | Change |
|---|---|
| `src/components/AccessGateModal.tsx` | Remove `// Skip Airtable sync for now` block and any disabled Airtable code beneath it |

---

### 4.8 — ENV Var Delta

**P2 Lovable ENV vars:**

| Var | Action | Before | After |
|---|---|---|---|
| `VITE_WEBHOOK_IDME_CALLBACK` | **Remove** | `https://hook.us2.make.com/6c1ylx67nwua8ksk3segplftob5iu9m8` | (removed) |
| `WEBHOOK_IDME_CALLBACK` | **Remove** (in `.env.development`, `.env.production`) | Make webhook URL | (removed) |
| `VITE_SUPABASE_URL` | **Change value** | `https://ofpxczstptysqxoruiox.supabase.co` | `https://wvzjfxacykgsaffskgtr.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Change value** | key for `ofpxczstptysqxoruiox` | anon/publishable key for `wvzjfxacykgsaffskgtr` |
| `VITE_IDME_CLIENT_ID` | **Add** | (not present) | `<production ID.me client_id>` |
| `VITE_IDME_REDIRECT_URI` | **Add** (optional — confirm if needed) | (not present) | `https://enroll.passtodigital.com/auth/idme/callback` |

**P1 Lovable ENV vars:**

| Var | Action | After |
|---|---|---|
| `VITE_SUPABASE_URL` | **Change value** | `https://wvzjfxacykgsaffskgtr.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Change value** | anon/publishable key for `wvzjfxacykgsaffskgtr` |

**P3 Lovable ENV vars:**

| Var | Action | After |
|---|---|---|
| `VITE_SUPABASE_URL` | **Change value** | `https://wvzjfxacykgsaffskgtr.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Change value** | anon/publishable key for `wvzjfxacykgsaffskgtr` |

**Supabase Edge Function Secrets (target project `wvzjfxacykgsaffskgtr`):**

| Secret | Function | Note |
|---|---|---|
| `IDME_CLIENT_ID` | `idme-exchange` | Production ID.me client_id (OD-T11-01) |
| `IDME_CLIENT_SECRET` | `idme-exchange` | Production ID.me client_secret (OD-T11-01) |
| `IDME_REDIRECT_URI` | `idme-exchange` | `https://enroll.passtodigital.com/auth/idme/callback` |
| `VERCEL_WALLET_SIGNING_URL` | `issue-wallet-pass` | Vercel deployment URL |
| `STRIPE_PUBLISHABLE_KEY` | (existing) | Keep — used by create-checkout |
| `STRIPE_SECRET_KEY` | (existing) | Keep |
| `MAKE_WEBHOOK_URL` | — | **Remove from all functions** |

---

## 5. Open Decisions — All Resolved by David (2026-05-26)

| ID | Decision | Resolution | Reference |
|---|---|---|---|
| OD-T11-01 | ID.me production credentials status | Sandbox only. No production `client_id` or `client_secret`. Applying for production ID.me developer access is a **hard launch prerequisite** (equivalent to Twilio A2P 10DLC). | FD-025 |
| OD-T11-02 | Wallet pass issuance trigger | Automatic at end of enrollment. `PassReady.tsx` calls `issue-wallet-pass` upon enrollment completion. | FD-026 |
| OD-T11-03 | License lookup trigger placement | Separate `invoke("lookup-license")` from `IdmeCallback.tsx` after `idme-exchange` returns. `idme-exchange` is identity-only. | FD-027 |
| OD-T11-04 | P2 Lovable-managed Supabase data to preserve | No data to preserve. `ofpxczstptysqxoruiox` can be decommissioned directly after env var switch. | FD-028 |

**Note on OD-T11-01:** `VITE_IDME_CLIENT_ID` in the P2 env var delta (§4.8) will be the **production** client_id once PassTo obtains it. Until then, sandbox credentials remain in place. The `idme-exchange` Edge Function cannot be deployed to production without production credentials.

---

## 6. Implementation Sequencing

### Blocked Until v4 Migration SQL Applied (`wvzjfxacykgsaffskgtr`)

These changes require `profiles`, `licenses`, `credentials`, `wallet_passes` tables to exist:

- [ ] `submit-enrollment` rewrite (needs `profiles` table to write to)
- [ ] `idme-exchange` deployment (needs `profiles` table for `idme_subject` update)
- [ ] `issue-wallet-pass` deployment (needs `credentials`, `wallet_passes` tables)
- [ ] CreateAccount.tsx, IdVerification.tsx, IdmeCallback.tsx code changes in Lovable
- [ ] P1/P2/P3 `VITE_SUPABASE_URL` env var switch
- [ ] UploadSelfie.tsx selfie upload to Supabase Storage (needs storage bucket policy applied)

### Blocked Until OD-T11-01 Resolved (ID.me Production Credentials)

- [ ] `idme-exchange` Edge Function deployment to production
- [ ] `VITE_IDME_CLIENT_ID` env var in P2 Lovable
- [ ] `IDME_CLIENT_ID` / `IDME_CLIENT_SECRET` Edge Function secrets in `wvzjfxacykgsaffskgtr`

### Can Proceed Now (Before v4 Migration)

- [x] This spec (TASK-0011) — complete
- [ ] Draft `idme-exchange` Edge Function TypeScript code (for Codex review — no deployment)
- [ ] Draft `issue-wallet-pass` Edge Function TypeScript code (for Codex review — no deployment)
- [ ] Confirm with David: OD-T11-01 (ID.me creds), OD-T11-02 (wallet trigger), OD-T11-03 (license trigger)
- [ ] Confirm with David: OD-T11-04 (user data in P2 Lovable Supabase before decommission)
- [ ] Dead Airtable code removal from P3 `AccessGateModal.tsx` (no migration dependency — P3 has no active Airtable calls)

### Partial — Can Spec Now, Execute After Migration

- [ ] `submit-enrollment` Edge Function code (spec complete in §4.4 above; deploy after migration)
- [ ] Dead edge function removal from P1/P2 Lovable-managed Supabase (can identify; actual delete requires access to those instances)

---

## 7. P2 Enrollment Flow: Before/After Summary

| Step | Current | Target |
|---|---|---|
| Nurse primary key | Airtable record ID (`recXXXXXX`) | Supabase `profiles.id` UUID |
| CreateAccount backend | `create-airtable-record` (dead) + `submit-enrollment`→Make | `submit-enrollment` with JWT, step: "create" |
| ID.me endpoint | `api.idmelabs.com` (sandbox) | `api.id.me` (production) |
| ID.me code exchange | Browser → Make webhook (Make holds client_secret) | `idme-exchange` Edge Function (server-side, Supabase holds client_secret) |
| License lookup trigger | Second Make webhook call from browser | Separate `invoke("lookup-license")` from `IdmeCallback.tsx` after `idme-exchange` (FD-027) |
| Selfie storage | Unknown (Airtable / local state) | Supabase Storage protected bucket (`selfies/`) — FD-019 |
| Wallet pass issuance | Not implemented (CF-5) | `issue-wallet-pass` → Vercel `api/sign-apple.js` + `api/sign-google.js` |
| Auth source | Supabase Auth signUp (UUID created) + Airtable ID used | Supabase Auth signUp; UUID used throughout |
| Make dependency | Active (webhook live) | Removed entirely |
| Airtable dependency | Active (via Make scenarios) | Removed entirely |

---

## 8. Notes for Codex

1. **FD-021 is the invocation standard:** Every Lovable→Edge Function call uses the logged-in user's JWT. `supabase.functions.invoke()` sends the JWT automatically when the user is signed in. Do not put service_role in Lovable code.

2. **`profiles.id` = `auth.uid()`:** In Supabase, `auth.uid()` in RLS policies refers to the authenticated user's ID. The `profiles` table primary key should be defined as `profiles.id UUID REFERENCES auth.users(id)`. This means no separate "nurse ID" concept — the Supabase Auth UID IS the nurse ID.

3. **Unauthenticated enrollment edge case:** If a nurse reaches `IdmeCallback.tsx` without a valid Supabase Auth session (e.g., session expired during the ID.me redirect), `supabase.functions.invoke("idme-exchange")` will fail with 401. The UI must detect this and redirect to re-authenticate before completing the callback. This is an error recovery flow to implement.

4. **`idme-exchange` is not idempotent by default:** If a nurse somehow hits the callback twice with the same code, the code exchange will fail (codes are one-time-use). The Edge Function should handle this gracefully — check if the nurse's profile already has `idme_verified = true` and return success without re-exchanging.

5. **`issue-wallet-pass` Vercel call:** The Vercel signing routes currently accept a payload and return a signed pass. The Edge Function needs the Vercel deployment URL as a secret. Confirm whether the existing `api/sign-apple.js` and `api/sign-google.js` currently validate any auth header — if not, add a shared secret check before wiring this in production.

6. **FLOW-LICENSE-002 alignment:** The license lookup triggered after ID.me verification should align with the spec in `docs/tasks/FLOW-LICENSE-002-license-lookup-backend-service.md`. Do not re-spec the license lookup logic in TASK-0011 implementation — reference and invoke whatever FLOW-LICENSE-002 produces.

7. **Dead edge functions in Lovable-managed Supabase:** The Lovable-managed Supabase instances (`zektkbhvmbbmhvthwah`, `ofpxczstptysqxoruiox`) are not accessible via the Supabase MCP. Dead function deletion from those instances requires access via the Supabase dashboard or Lovable editor. These can be removed once the Lovable projects are re-pointed to `wvzjfxacykgsaffskgtr`.

---

## Document Metadata

| Field | Value |
|---|---|
| Created | 2026-05-26 |
| Task | TASK-0011 |
| Status | Ready for David Review |
| Open decisions | OD-T11-01 through OD-T11-04 (4 total) |
| Critical blocker | v4 migration SQL (TASK-0007 → Codex) + ID.me production credentials (OD-T11-01) |
| Next action | David reviews spec; confirms OD-T11-01 through OD-T11-04; TASK-0007 Codex completes migration SQL |
