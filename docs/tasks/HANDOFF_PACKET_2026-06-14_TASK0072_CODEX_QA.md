# Handoff Packet — TASK-0072 Codex QA

**Date:** 2026-06-14
**From:** Claude
**To:** Codex (QA)
**Status:** Live verification complete — ready for Codex QA

---

## Task

- TASK-0072 — Configure and Verify Apple and Google Wallet Pass Issuance

## Current GitHub Source

- Task doc: `docs/tasks/TASK-0072.md`
- Display spec: `docs/design_system/WALLET_PASS_DISPLAY_SPEC.md`
- Signing contract: `docs/architecture/WALLET_SIGNING_CONTRACT.md`
- Activity log entry: `docs/activity_log/ACTIVITY_LOG.md` (top entry, 2026-06-14)
- Phase 4 task list: `docs/tasks/PRD_PHASE_04_CREDENTIAL_WALLET_TASK_LIST.md`
- Latest commits reviewed:
  - `94c6855` fix(TASK-0072): Apple Wallet pass installation verified live on iPhone
  - `9480f2f` debug(TASK-0072): Add ?assets=1 diagnostic (reverted in 94c6855)
  - `052c129` fix(TASK-0072): Include api/assets in Vercel sign-apple bundle
  - `1d4feb2` fix(TASK-0072): Resize Apple Wallet logo to spec
  - `d8d5d1a` fix(TASK-0072): Resolve Apple Wallet signing — provider integration verified live

## Approval State

- Approved: APPROVAL-0034 (TASK-0072 execution, provider config, Vercel env, Supabase secrets, deployment, test-mode wallet issuance)
- Not approved: production launch, broader risk acceptance, permanent QR/barcode embedding, Stripe live-mode changes
- Required before execution: nothing — Codex QA is the next gate

## Live Supabase State

- Project: `wvzjfxacykgsaffskgtr`
- Migrations: no new migrations for TASK-0072 (all required schema in place from prior tasks)
- Edge Functions: `wallet-issue` deployed (existing). No new functions in this task.
- Grants/RLS: unchanged
- Logs: not checked in this verification
- Supabase secrets added/confirmed:
  - `VERCEL_SIGN_APPLE_URL` → `https://pass-to.vercel.app/api/sign-apple`
  - `VERCEL_SIGN_GOOGLE_URL` → `https://pass-to.vercel.app/api/sign-google`
  - `WALLET_INTERNAL_SECRET` (shared with Vercel)

## Live Vercel State

- Project: `pass-to` (Bloom-LLC Hobby plan)
- Production URL: `https://pass-to.vercel.app`
- Blob store: public, hosts `.pkpass` files at `https://lijftzg2jqddlmry.public.blob.vercel-storage.com/passes/...`
- Env vars set (no values in this packet):
  - `WALLET_INTERNAL_SECRET`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `APPLE_WWDR_PEM_BASE64`, `APPLE_CERT_PEM_BASE64`, `APPLE_KEY_PEM_BASE64`, `APPLE_CERT_PASSWORD`
  - `APPLE_PASS_TYPE_ID` = `pass.com.passto.license`
  - `APPLE_TEAM_ID` = `76J36374T7`
  - `GOOGLE_SERVICE_ACCOUNT_JSON`
  - `GOOGLE_WALLET_ISSUER_ID` = `3388000000023110660`
  - `GOOGLE_WALLET_CLASS_ID` = `3388000000023110660.passto_nurse_license_v1`
  - `PASSTO_LOGO_URL` = `https://enroll.passtodigital.com/logo/primary-white.png`
  - `BLOB_READ_WRITE_TOKEN`

## Files / Functions Affected

- Docs:
  - `docs/tasks/TASK-0072.md` (updated with live verification section)
  - `docs/activity_log/ACTIVITY_LOG.md`
  - `docs/tasks/MVP_LAUNCH_CRITICAL_BUILD_SEQUENCE.md`
- Vercel routes:
  - `api/sign-apple.js` (PKCS#8 encrypted key, deterministic serial, Vercel Blob upload)
  - `api/sign-google.js` (unchanged in this task — already mirrored Apple field set)
- Vercel config: `vercel.json` (`includeFiles: "api/assets/**"`)
- Assets: `api/assets/logo.png` (160x37), `api/assets/logo@2x.png` (320x74)
- Supabase functions: `wallet-issue` (unchanged in this task)
- Lovable routes: unchanged
- Stripe: unchanged

## Live Verification Evidence

- Apple signing route call returned `success: true` and a valid Vercel Blob `.pkpass` URL.
- Signature verification: `openssl smime -verify -in signature -inform DER -content manifest.json -noverify` reports "Verification successful".
- David installed the test pass to his iPhone Wallet via Safari (2026-06-14).
- Google signing route call returned `success: true` with a Google Wallet save URL JWT and stable `object_id`.

## Open Risks / Blockers

- P1: none
- P2: Google Wallet visual render not yet confirmed on an Android device. API-level verification is in place but device QA is deferred.
- P2: The current QA test credential uses synthetic license data; the live pass shows empty values for LICENSE #, STATE, ISSUED, EXPIRES, LAST VERIFIED. Real values populate from ID.me/RapidAPI on a production nurse — not a sign-route bug, but Codex should confirm by reading the source.
- Pending David decisions: none for this task. Production launch remains a separate hard gate.

## Do Not Touch

- Production launch approval — not in this task's scope.
- Stripe live-mode changes — not in this task's scope.
- Adding permanent QR/barcode to wallet pass — explicitly out of scope per PRD and David approval.
- Committing certificate, private key, service account JSON, raw secrets, pass files, or signed JWTs to GitHub.
- Modifying `wallet-issue` Edge Function (no source-level changes in this task).

## Next Expected Output

- Codex QA report appended to `docs/tasks/TASK-0072.md` under "Codex QA Review".
- Pass/fail decision against TASK-0072 acceptance criteria.
- Any P1/P2 findings logged and remediation requested if needed.
- If passing, recommendation to David for Done decision.

## Recommended Prompt for Codex QA

```text
Run Codex QA on TASK-0072 — Configure and Verify Apple and Google Wallet Pass Issuance.

Live verification has been completed by Claude. Please verify:

Source review:
- api/sign-apple.js — Apple Wallet signing route. Confirm WALLET_INTERNAL_SECRET bearer auth, Supabase data load via service role, deterministic serial number, PassKit pass.json structure, asset bundling.
- api/sign-google.js — Google Wallet signing route. Confirm WALLET_INTERNAL_SECRET bearer auth, Supabase data load, GenericObject payload structure, signing with service account JWT, no QR/barcode.
- supabase/functions/wallet-issue/index.ts — orchestrator. Confirm fail-closed behavior, wallet_passes persistence, credential activation only after durable provider write.
- vercel.json — confirm includeFiles config for api/sign-apple.js.

Documentation review:
- docs/design_system/WALLET_PASS_DISPLAY_SPEC.md — confirm deployed payloads (extractable from a freshly generated pass) match the spec, especially status mapping, forbidden fields, and QR boundary.
- docs/architecture/WALLET_SIGNING_CONTRACT.md — confirm the live boundary matches.

Negative live checks against deployed routes (no secret values in QA output):
- Direct curl without WALLET_INTERNAL_SECRET → 401 unauthorized
- Wrong bearer token → 401 unauthorized
- Valid bearer + non-existent credential_id → 404 credential_not_found
- Valid bearer + credential with status outside {pending, active} → 400 credential_not_issuable

Confirm in source that:
- No wallet signing secret is exposed to Lovable or committed files.
- Provider failure does not mark wallet_passes.status = issued.
- credentials.status only advances to active after at least one provider result is durably persisted.

Document evidence and any findings. Either issue a Pass/Done recommendation to David or open P1/P2 remediation items.
```

---

**Claude Session Reference:** 2026-06-14 session (Opus 4.7)
**Verified Test Credential:** `c855fe7f-db98-4e79-884b-227194922a92` (profile `b1ab6d80-bc48-49b2-9567-ff88d10ec0dd`, email `pass-ready@passtodigital.test`)
