# PRD Section 3 — End-to-End MVP User Journeys

**Status:** Draft for David Review  
**Owner:** David Bloom  
**Drafting Support:** Codex and Claude  
**Created:** 2026-05-26  
**Associated Task List:** `/docs/tasks/PRD_SECTION_03_MASTER_TASK_LIST.md`  

## 3.1 Purpose

This section defines the launch-critical user journeys PassTo must support for MVP.

The goal is to make the product flow clear enough for Claude and Codex to turn journeys into implementation tasks without expanding scope into deferred capabilities.

## 3.2 Launch-Critical Journey Map

The MVP launch-critical journey is:

```text
Nurse discovers PassTo
→ creates account
→ verifies identity
→ verifies phone
→ enters license details
→ license lookup runs
→ data match runs
→ selfie is captured and stored
→ credential record is created
→ wallet pass is issued
→ nurse reaches dashboard
→ nurse creates share link
→ verifier opens link
→ verifier submits minimal info and accepts terms
→ verifier views credential status
```

The MVP must support this path before first production launch.

## 3.3 Nurse Account Creation Journey

The nurse starts from the PassTo website or enrollment entry point and creates an account.

Expected behavior:

- Nurse enters required account information.
- Supabase Auth creates the authenticated user.
- A PassTo profile is created or initialized.
- The nurse is routed into the verification sequence.
- The system writes required account/audit events.

The account creation flow must not create a credential or license record until the required trust gates are completed.

## 3.4 Identity Verification Journey

The nurse completes identity verification through ID.me.

Expected behavior:

- Lovable starts or displays the ID.me flow.
- ID.me callback/token exchange happens in a trusted backend context.
- The backend validates assurance level and identity result.
- IAL2 is required for credential issuance.
- IAL1 or failed verification routes to retry/support and blocks issuance.
- The backend writes identity status and audit events.

Lovable must not handle ID.me secrets or make trust decisions.

## 3.5 Phone Verification Journey

After identity verification, the nurse verifies phone possession through Twilio SMS.

Expected behavior:

- Nurse enters or confirms phone number.
- Backend sends Twilio verification code.
- Nurse enters code.
- Backend verifies code and updates phone verification state.
- Credential issuance remains blocked until phone verification passes.
- Twilio launch readiness remains a launch-critical dependency.

If Twilio A2P 10DLC is not ready for production, David must approve a launch fallback before production launch.

## 3.6 License Lookup Journey

After identity and phone verification, the nurse enters license details.

Expected behavior:

- Nurse provides license state, license type, and license number or required lookup fields.
- Lovable invokes a dedicated license lookup backend function.
- Backend calls the approved license lookup source.
- Backend stores license source data and normalized status fields.
- Lookup failure routes the nurse to retry/support and blocks credential issuance.
- Lookup success proceeds to data matching.

License lookup should be a separate backend operation from ID.me exchange. Keeping it separate preserves clearer audit, retry, and failure handling.

## 3.7 Data Matching Journey

After license lookup succeeds, PassTo confirms that the verified identity matches the license record.

Expected behavior:

- Backend compares normalized ID.me name data against license source data.
- Data matching is deterministic and conservative.
- A successful match allows the nurse to proceed to selfie capture and credential issuance.
- A failed match flags the account or credential state, writes an audit event, and blocks issuance.
- Temporary identity fields used for matching are cleared when no longer needed.
- Temporary identity fields are never returned to Lovable.

Data matching is a hard credential issuance gate.

## 3.8 Selfie Capture Journey

After successful data matching, the nurse captures a selfie.

Expected behavior:

- Lovable provides the selfie capture UI.
- Selfie is stored in protected Supabase Storage.
- Storage access is controlled by policy or trusted backend flow.
- Selfie capture failure routes the nurse to retry/support.
- Credential issuance remains blocked until selfie capture succeeds.

PassTo owns selfie storage. ID.me does not own this MVP selfie asset.

## 3.9 Credential Creation and Wallet Issuance Journey

After identity, phone, license lookup, data matching, and selfie gates pass, PassTo creates the credential and issues the wallet pass.

Expected behavior:

- Backend creates the credential record.
- Backend writes credential status and current-as-of timestamps.
- Backend triggers wallet pass issuance automatically at the end of enrollment.
- Wallet pass issuance is surfaced through the PassReady experience.
- Lovable shows status, success, or failure states.
- Wallet signing may use Vercel where Node libraries, certificates, or provider SDKs require it.
- Failure writes an event and gives ops a recovery path.

Wallet pass issuance is launch-critical and should not require the nurse to manually initiate from the P3 dashboard in MVP.

## 3.10 Nurse Dashboard Journey

After credential creation, the nurse reaches the dashboard.

Expected behavior:

- Nurse sees credential status.
- Nurse sees license status and current-as-of timestamp.
- Nurse sees wallet/pass readiness state.
- Nurse sees subscription/tier state.
- Nurse sees launch-critical actions only.
- Deferred actions such as Show QR and PDF export should not appear as launch blockers.

For launch, the dashboard must support share-link creation. It does not need to support deferred Show QR or PDF export unless David reopens those items.

## 3.11 Share Link Journey

The nurse creates a controlled share link from the dashboard.

Expected behavior:

- Nurse requests share link.
- Backend confirms ownership and entitlement.
- Backend creates a hashed, short-lived verification token.
- Raw token is returned once to the frontend.
- Share link expires after the approved TTL or first successful use.
- Share link creation writes event/audit records.

Share-link verifier access is launch-critical.

## 3.12 Verifier Credential View Journey

The verifier opens the share link and views credential status.

Expected behavior:

- Verifier opens `/v/{token}`.
- Backend validates token using a trusted backend route or Edge Function.
- Verifier submits minimal information: name and email.
- Verifier accepts Terms of Use.
- Backend creates verifier and verification event records.
- Verifier sees safe credential status, license status, and current-as-of disclosure.
- Verifier cannot browse credential records outside the tokenized flow.
- Token is marked used after successful verification.

Verifier access does not require a PassTo account in MVP.

## 3.13 Subscription and Entitlement Journey

Subscription behavior must be enforced server-side.

Expected behavior:

- Stripe handles checkout and subscription events.
- Backend records payment/subscription state in Supabase.
- Feature access is determined by server-side entitlement checks.
- Client-side UI may hide unavailable actions, but cannot be the source of authority.
- On subscription lapse, the account downgrades to Free behavior.
- Existing credential and wallet records remain retained.
- Paid-tier-only actions are blocked after lapse.

## 3.14 Admin / Ops Journey

PassTo operations must be able to inspect and recover launch-critical flow issues.

Expected behavior:

- Supabase dashboard/views provide MVP ops visibility.
- Ops can inspect account, license, credential, wallet, payment, event, and failure state.
- Critical failures write audit/event records.
- Ops can identify where the user is blocked in the journey.
- Lovable admin UI is deferred unless separately approved.

## 3.15 Deferred Journeys

The following journeys are deferred from launch-critical MVP:

| Journey | Status |
|---|---|
| Show QR verifier flow | Deferred |
| PDF export | Deferred |
| Scheduled automated refresh | Deferred |
| Additional license purchase/use | Deferred |
| Employer dashboard | Deferred |
| Lovable admin UI | Deferred |

Deferred journeys should not be assigned as launch implementation work unless David explicitly reopens them.

## 3.16 Section 3 Acceptance Criteria

Section 3 is complete when David confirms:

- The launch-critical journey map is correct.
- Account, identity, phone, license, data match, selfie, credential, wallet, dashboard, share link, and verifier journeys are correct.
- Deferred journeys are correctly excluded from launch-critical scope.
- Journey boundaries are clear enough for implementation task creation.
