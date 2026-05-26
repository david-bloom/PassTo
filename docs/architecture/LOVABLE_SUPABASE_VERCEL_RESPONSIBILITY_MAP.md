# Lovable / Supabase / Vercel Responsibility Map

**Status:** Draft Baseline — Ready for David Review  
**Owner:** Codex  
**Created:** 2026-05-25  
**Related Task:** TASK-0004  
**Source:** `/docs/prd/PASS_TO_PRD.md`, `/docs/tasks/MVP_TASK_BACKLOG.md`  

## Purpose

This document defines what Lovable, Supabase, and Vercel each own for the PassTo MVP.

The goal is to reduce cost of change, preserve the existing Lovable frontend, and prevent future implementation tasks from putting data, secrets, trust decisions, or backend orchestration in the wrong layer.

## Core Platform Rule

```text
Lovable owns the MVP user experience.
Supabase owns product data, auth/data security, RLS, and preferred backend orchestration.
Vercel owns backend/API routes only where Supabase Edge Functions or Lovable are not the right fit.
```

Lovable remains the MVP frontend builder and website host unless David explicitly changes this decision.

Supabase is the MVP system of record.

Vercel is not the default frontend host for MVP. It is a targeted backend/API option.

## Platform Ownership Summary

| Area | Lovable | Supabase | Vercel |
|---|---|---|---|
| Website hosting | Primary owner | No | No, unless later approved |
| Frontend UI | Primary owner | No | No |
| Forms and route UX | Primary owner | Supports via APIs/data | No |
| Auth UI | Primary UI owner | Auth backend owner | No, unless custom auth route needed |
| Database | No | Primary owner | No |
| RLS/security policies | No | Primary owner | No |
| Edge/backend orchestration | No | Preferred owner | Secondary owner where needed |
| Service-role operations | No | Runs through trusted Edge Functions | Runs through trusted API routes where needed |
| Secrets | No | Supabase secrets / env | Vercel env for Vercel-owned routes |
| Payments UI | UI entry points | Payment records/state | Stripe redirect/webhook route only if needed |
| Stripe webhooks | No | Preferred owner via Edge Function | Allowed if needed |
| ID.me callbacks | UI redirect pages only | Preferred owner via Edge Function | Allowed if needed |
| Twilio verification | UI entry points only | Preferred owner via Edge Function | Allowed if needed |
| License lookup | UI entry points only | Preferred owner via Edge Function | Allowed if needed |
| Wallet pass signing | UI entry points/status only | Stores state | Likely owner if existing signing code remains Vercel-based |
| PDF generation | UI trigger/status only | Stores PDF/job state | Allowed if provider implementation requires route |
| Notifications | UI preferences/status only | Preferred event/job owner | Allowed if needed |
| Admin/ops | Possible future UI | Default MVP admin views/logs | No, unless admin API needed |

## Lovable Responsibilities

Lovable owns MVP frontend and website experience.

### Lovable owns

- Public marketing / landing website if retained in current Lovable site.
- Nurse-facing onboarding screens.
- Verifier-facing credential view screens.
- Dashboard UI.
- Share link and show-QR UI.
- Upgrade/payment entry UI.
- PDF export trigger UI.
- User-facing status, error, retry, and support states.
- Frontend route structure.
- Form collection and validation at the UX layer.
- Displaying safe data returned from approved backend endpoints.
- Calling approved Supabase Edge Function or Vercel API endpoints.

### Lovable does not own

- Database schema.
- RLS policies.
- Service-role operations.
- ID.me token exchange.
- Twilio verification secret logic.
- RapidAPI/Propelus API key usage.
- Stripe webhook trust decisions.
- Payment entitlement enforcement.
- Token generation or hashing.
- Data matching trust decisions.
- Wallet pass signing.
- PDF generation secrets.
- Secret storage.
- Source-of-truth audit/event records.

### Lovable default rule

If a task changes what a user sees, enters, confirms, clicks, or is told, Lovable is probably involved.

If a task decides whether a credential can be issued, whether a paid action is allowed, whether a token is valid, or whether a verifier can see data, Lovable is not the source of authority.

## Supabase Responsibilities

Supabase owns the MVP system of record and preferred backend orchestration layer.

### Supabase owns

- Auth backend.
- Database tables.
- RLS policies.
- Storage, if used for PDFs, selfies, or credential-related assets.
- Edge Functions where practical.
- Scheduled jobs where practical.
- User/profile/license/credential state.
- Verification token records.
- Verifier records.
- Verification event records.
- Refresh event records.
- Subscription/payment state records.
- Notification/communication event records.
- Audit events.
- Status mapping data.
- Service-role-only writes through trusted functions.
- Data matching backend logic unless specifically assigned elsewhere.
- License lookup orchestration unless Vercel route is required.
- ID.me callback/token exchange unless Vercel route is required.
- Twilio verification orchestration unless Vercel route is required.
- Stripe webhook handling unless Vercel route is required.

### Supabase does not own

- Lovable page design.
- Public website design.
- Frontend form layout.
- Wallet pass signing if existing Vercel signing code remains in use.
- Any frontend-only UX copy unless represented as data/config.

### Supabase default rule

If a task changes durable product state, authorization, row visibility, service-role behavior, event records, or scheduled backend work, Supabase is probably the owner.

## Vercel Responsibilities

Vercel is a targeted backend/API layer for MVP, not the default frontend host.

### Vercel owns when needed

- Existing or retained wallet pass signing endpoints.
- Backend routes that depend on Node-specific libraries unavailable or awkward in Supabase Edge Functions.
- API routes that must use Vercel environment variables or runtime behavior.
- Legacy Vercel signing service code if still retained.
- Backend routes that should not be implemented in Lovable and are not practical in Supabase Edge Functions.

### Vercel may own

- Apple Wallet pass generation.
- Google Wallet JWT signing.
- PassKit integration route.
- Specialized ID.me callback route if Edge Function implementation is not preferred.
- Specialized PDF generation route if provider integration is not preferred in Edge Functions.
- Provider webhook routes if Supabase Edge Functions are unsuitable.

### Vercel does not own by default

- MVP frontend hosting.
- Lovable UI pages.
- Supabase database state.
- RLS policies.
- General CRUD APIs that Supabase can safely handle.
- Generic orchestration that Supabase Edge Functions can handle.

### Vercel default rule

Use Vercel only when there is a concrete reason Supabase Edge Functions are the wrong tool.

Acceptable reasons include:

- Existing Vercel signing code is already useful and cheaper to retain.
- Node runtime/library requirements.
- Provider SDK compatibility.
- File/signing/certificate handling better suited to Vercel.
- Security or operational reason approved by Codex/David.

## Route Responsibility Map

| Route / Area | Lovable owner | Supabase owner | Vercel owner | Notes |
|---|---|---|---|---|
| `/` | Yes | No | No | Public site / landing experience in Lovable. |
| `/enroll` | Yes | Profile/account state | No | Form UX in Lovable; durable state in Supabase. |
| `/verify-identity` | Yes | ID.me orchestration preferred | Possible | Lovable starts flow; backend handles token exchange/callback. |
| `/verify-phone` | Yes | Twilio orchestration preferred | Possible | Lovable UI only; backend owns verification. |
| `/license-lookup` | Yes | RapidAPI/Propelus lookup preferred | Possible | Lovable collects input; backend calls vendor. |
| `/data-match-review` | Yes | Data matching authority | No, unless needed | Lovable shows safe result/status; backend decides match. |
| `/selfie` | Yes | Storage/state | Possible | Storage likely Supabase; processing TBD. |
| `/dashboard` | Yes | Credential/license/subscription state | No | Lovable reads safe data from Supabase/API. |
| `/share` | Yes | Token creation/gating preferred | Possible | Backend creates token after entitlement check. |
| `/show-qr` | Yes | Token creation/gating preferred | Possible | Backend creates short-lived token; Lovable renders QR. |
| `/v/{token}` | Yes | Token validation/event writes | Possible | Verifier UI in Lovable; backend validates token and writes events. |
| `/upgrade` | Yes | Subscription state | Possible Stripe route/webhook | Lovable starts checkout; backend/webhook records state. |
| `/pdf-export` | Yes | PDF job/state preferred | Possible | Provider implementation TBD. |
| Admin/ops | Maybe | Default MVP admin views | Maybe | Supabase dashboard/views first unless David approves Lovable admin UI. |

## Backend Endpoint Ownership Defaults

| Backend capability | Preferred owner | Alternate owner | Lovable role |
|---|---|---|---|
| Create profile | Supabase | None | UI/form |
| ID.me auth start/callback | Supabase Edge Function | Vercel route | Redirect/display states |
| ID.me token exchange | Supabase Edge Function | Vercel route | None |
| Twilio send/verify code | Supabase Edge Function | Vercel route | UI/form |
| RapidAPI/Propelus lookup | Supabase Edge Function | Vercel route | UI/form |
| Data matching | Supabase Edge Function | Vercel route only if justified | Display safe result |
| Selfie upload | Supabase Storage/function | Vercel route if processing requires | Capture UI |
| Credential issuance | Supabase Edge Function | Vercel route if wallet dependency requires | Status UI |
| Wallet pass signing | Vercel likely | Supabase if feasible | Trigger/status UI |
| Share token creation | Supabase Edge Function | Vercel route | Trigger/display link |
| Show-QR token creation | Supabase Edge Function | Vercel route | Render QR |
| Verifier token validation | Supabase Edge Function | Vercel route | Verifier UI |
| Stripe checkout session | Supabase Edge Function | Vercel route | Checkout button |
| Stripe webhook | Supabase Edge Function | Vercel route | None |
| Refresh lookup | Supabase Edge Function / scheduled job | Vercel route | Trigger/status UI |
| Notification send | Supabase Edge Function | Vercel route | Preferences/status UI |
| PDF generation | Supabase Edge Function | Vercel route | Trigger/status UI |
| Ops alert | Supabase Edge Function | Vercel route | None |

## Integration Ownership Map

| Integration | MVP role | Platform owner |
|---|---|---|
| Supabase Auth | Account authentication | Supabase backend; Lovable UI |
| Supabase DB | System of record | Supabase |
| Supabase RLS | Access control | Supabase |
| Supabase Edge Functions | Backend orchestration | Supabase preferred |
| Supabase Storage | Selfies/PDFs/assets if used | Supabase |
| Stripe Checkout | Payments/subscriptions | Supabase or Vercel backend; Lovable entry UI |
| Stripe Webhooks | Payment truth | Supabase preferred; Vercel allowed |
| ID.me | Identity verification | Supabase preferred; Vercel allowed |
| Twilio | Phone verification / SMS | Supabase preferred; Vercel allowed |
| RapidAPI / Propelus | Nurse license lookup | Supabase preferred; Vercel allowed |
| Postmark | Transactional email / ops alerts | Supabase preferred; Vercel allowed |
| PDFMonkey | PDF generation | Supabase or Vercel depending provider fit |
| PassKit | Wallet pass issuance | Vercel likely if existing signing service retained |
| Apple Wallet | Wallet credential | Vercel likely through signing/pass service |
| Google Wallet | Wallet credential | Vercel likely through signing/JWT service |

## Security and Secret-Handling Rules

### Never put in Lovable frontend code

- ID.me client secret.
- Twilio auth token or API secret.
- RapidAPI/Propelus API key.
- Stripe secret key or webhook secret.
- Postmark server token.
- PDFMonkey API key.
- Apple Wallet certificate material.
- Google service account JSON/private key.
- Supabase service role key.
- Token hashing secrets or raw verifier token storage logic.

### Backend-only trust decisions

The following decisions must happen in Supabase Edge Functions or approved Vercel API routes:

- Whether identity verification is sufficient.
- Whether phone verification passed.
- Whether license lookup succeeded.
- Whether data matching passed.
- Whether credential issuance is allowed.
- Whether a user is entitled to create a share token, QR token, refresh, PDF, or additional license.
- Whether a verifier token is valid.
- Whether payment state is valid.
- Whether wallet pass issuance/update is allowed.

### Frontend-safe responses

Backend responses to Lovable should return only the minimum data needed for UI state.

Temporary sensitive ID.me fields used for matching must not be returned to Lovable.

## Data Ownership Rules

### Source of truth

Supabase is the source of truth for:

- profiles
- licenses
- credentials/passes
- wallet pass references
- verification tokens
- verifiers
- verification events
- subscriptions
- purchases/payments
- refresh events
- notification/communication events
- PDF export records
- audit events

### Not source of truth

Lovable is not source of truth for durable credential state.

Vercel is not source of truth for durable credential state unless it writes back to Supabase.

Third-party providers are not PassTo product state source of truth, although they may be source of truth for provider-specific status.

## Event and Audit Ownership

Supabase owns event and audit persistence.

Every critical backend operation should write an event/audit record where appropriate:

- identity verification result
- phone verification result
- license lookup result
- data match result
- credential issuance result
- wallet pass issuance/update result
- share token creation
- QR token creation
- verifier view
- refresh result
- payment/subscription update
- notification send/failure
- PDF generation result
- admin/manual intervention

## Admin/Ops Ownership

Default MVP admin/ops mechanism:

```text
Supabase dashboard/views first
Lovable admin UI only if David approves it as MVP scope
Vercel admin routes only if needed for backend retry/diagnostics
```

Admin/ops must be able to inspect:

- blocked onboarding
- ID.me failures
- Twilio failures
- RapidAPI/Propelus failures
- data-match failures
- wallet pass issuance failures
- Stripe webhook/payment issues
- PDF generation failures
- notification failures
- refresh failures
- audit events

## Implementation Assignment Rules

Future task specs should use these rules:

### Assign to Lovable when the task is mainly about

- Page layout.
- Form UX.
- Button/action placement.
- Dashboard display.
- Verifier display.
- Error/retry/support message display.
- Calling an already-defined backend endpoint.

### Assign to Supabase when the task is mainly about

- Tables.
- RLS.
- Auth backend.
- Edge Functions.
- Service-role operations.
- Durable state.
- Scheduled jobs.
- Event/audit records.
- Data matching.
- Token creation/validation.
- Entitlement checks.

### Assign to Vercel when the task is mainly about

- Existing wallet signing service.
- Node-specific provider SDKs.
- Certificate/private key handling for wallet passes.
- Backend/API code that Supabase Edge Functions cannot cleanly support.
- Provider integration route explicitly approved for Vercel.

## MVP Build Sequence Implications

This map implies the next implementation planning sequence should be:

```text
1. Audit Lovable routes and current backend calls.
2. Finalize Supabase schema/RLS plan.
3. Define Edge Function vs Vercel route list.
4. Build auth/profile foundation.
5. Build identity/phone/license/data-match backend gates.
6. Wire Lovable screens to new backend endpoints.
7. Build credential/wallet/token flows.
8. Build payments/gating.
9. Build admin/ops visibility and launch readiness.
```

## Open Decisions

1. Whether any existing Vercel wallet signing code is retained exactly as-is or rewritten.
2. Whether ID.me callback is Supabase Edge Function or Vercel route.
3. Whether Stripe webhooks are Supabase Edge Function or Vercel route.
4. Whether PDF generation is Supabase Edge Function or Vercel route.
5. Whether admin/ops uses Supabase dashboard/views only for MVP or a Lovable admin UI.
6. Whether Twilio A2P 10DLC is ready for launch or needs fallback.
7. Whether Standard/Premier pricing is final at values referenced in Claude schema activity or still open per visible Decisions Log.
8. Whether DECISION-0011 should be restored/created in the canonical Decisions Log.

## Risks

- Lovable can make it easy to put business logic in the UI. That must be avoided for trust, payment, and credential decisions.
- Supabase Edge Functions may not fit every wallet/provider SDK use case. Vercel should remain available for those cases.
- If backend endpoint ownership is not decided before implementation, Claude may build duplicate Supabase and Vercel paths.
- If admin/ops visibility is deferred too long, MVP launch may become operationally fragile.
- If old Make webhook assumptions remain inside Lovable, user flows may appear complete but fail backend trust/security requirements.

## Acceptance Criteria for Future Tasks Using This Map

Every future implementation task should state:

```text
Frontend owner: Lovable / none
Data owner: Supabase / none
Backend owner: Supabase Edge Function / Vercel route / none
Third-party integrations touched: list
Secrets involved: yes/no
Service-role required: yes/no
RLS impact: yes/no
User-visible routes affected: list
```

If a task cannot answer those fields, it is not ready for Claude implementation.

---

## Claude Review — 2026-05-26

**Reviewer:** Claude (Sonnet 4.6)  
**Scope:** Platform ownership boundaries, layer assignment correctness, sufficiency for guiding future Claude task specs.

---

### Boundary Implementation-Readiness

**COMMENT-MAP-01 — BLOCKER: Open Decisions 1–4 must be resolved before implementation tasks are written**

Open Decisions 1–4 (wallet signing platform, ID.me callback platform, Stripe webhook platform, PDF generation platform) each represent a fork in implementation logic — not just a documentation choice. Any future Claude task spec that touches these areas will have to make an undocumented judgment call or the spec will stall waiting for a decision.

Recommendation: Codex should resolve these four decisions explicitly before writing any task specs for wallet/credential issuance, identity verification, payment, or PDF. Each resolved decision should update this doc and be noted in the relevant task spec.

If David has a preference (e.g., "keep wallet signing in Vercel, everything else in Supabase"), that resolves three of the four immediately.

---

**COMMENT-MAP-02 — AMBIGUITY: "Preferred / allowed / possible" qualifiers do not resolve to an implementation decision**

Throughout the Backend Endpoint Ownership and Route Responsibility tables, entries say "Supabase Edge Function | Vercel route" with qualifiers like "preferred," "allowed," "possible," or "if needed." This is correct for architecture documentation but creates a pre-spec decision step for every one of those rows.

Recommendation: Add a "Decision status" column or annotation — "Decided: Supabase" or "Open: Supabase preferred / Vercel allowed" — so Claude task specs can immediately see which assignments are settled and which require a decision before the task proceeds. Without this, every ambiguous row could become a blocker in a future task.

---

**COMMENT-MAP-03 — GAP: How Lovable calls backend endpoints is not defined**

The map says Lovable "calls approved Supabase Edge Function or Vercel API endpoints" but does not specify the invocation pattern. This is implementation-critical:

- Does Lovable use the Supabase JS client with the user's JWT (authenticated calls)?
- Does Lovable call Vercel routes via fetch with a Bearer token?
- What authentication mechanism does Lovable pass when calling an Edge Function?

A task spec for wiring any Lovable screen to a backend endpoint cannot be written without this. Codex should add a "Backend Invocation Pattern" sub-section defining: the Supabase JS client as the default for Edge Function calls, what auth header Lovable sends, and how Vercel routes validate that the caller is a legitimate Lovable frontend (not a direct API call).

---

### Layer Assignment Correctness

**COMMENT-MAP-04 — LAYER RISK: Selfie storage assignment may be incorrect for the ID.me flow**

The map assigns selfie upload to "Supabase Storage/function | Vercel route if processing requires" and the `/selfie` route to "Storage likely Supabase."

In a standard ID.me identity verification flow, the selfie is submitted directly to ID.me — it does not transit or get stored in PassTo's infrastructure. If that is the case here, PassTo does not own or store the selfie, and this assignment is incorrect. Incorrectly assigning selfie storage to Supabase would cause a task spec to build a selfie capture/storage pipeline that is actually redundant with (and possibly conflicts with) the ID.me SDK flow.

Codex should clarify: does PassTo capture and store the selfie independently, or does the selfie go exclusively through ID.me? If the latter, remove or correct this row and the `/selfie` route.

---

**COMMENT-MAP-05 — LAYER RISK: `/v/{token}` verifier route — auth model is undefined and has RLS implications**

The map assigns `/v/{token}` to "Lovable UI + Supabase token validation" which is structurally correct. However, this is a publicly accessible share link — the verifier visiting this URL almost certainly has no Supabase auth session.

This matters because Supabase RLS policies are evaluated against the requesting user's auth role. If the token validation Edge Function is designed assuming an authenticated user, it will fail for anonymous verifier requests. The Edge Function must use service-role or a carefully designed anon-safe RLS policy to validate the token and return credential data.

This distinction needs to be explicit in this document. A future task spec that reads "backend validates token and writes events" without this context may incorrectly implement the token validation against user-auth RLS, breaking verifier views entirely.

Codex should add a note to this row: "Verifier is unauthenticated (no Supabase session). Edge Function must use service-role for token lookup and credential data retrieval. RLS policy for public credential display must be explicitly defined."

---

**COMMENT-MAP-06 — NOTE: Service-role constraint is in Security section but missing from Implementation Assignment Rules**

The Security section correctly states that service-role operations must run only in trusted backend contexts (not Lovable). But the Implementation Assignment Rules section — which is what Claude will use to assign future tasks — does not include this as an explicit rule.

Recommendation: Add to the "Assign to Supabase" list: "Any operation that requires the Supabase service-role key — these cannot be called from Lovable under any circumstances."

This prevents a future task from accidentally assigning a service-role operation to a Lovable component because the implementation rule section didn't explicitly call it out.

---

### Sufficiency for Guiding Future Claude Task Specs

**COMMENT-MAP-07 — STRENGTH: "Acceptance Criteria for Future Tasks" block is correct and should be mandatory**

The required fields (Frontend owner / Data owner / Backend owner / Third-party integrations / Secrets / Service-role / RLS impact / User-visible routes) are exactly the right gate. This block should be required at the top of every Claude task spec, not just referenced at the bottom of the map.

Recommendation: Add one field to this block:

```text
Open decisions this task depends on: [list from Open Decisions section, or "None"]
```

This surfaces blockers before a task is assigned for implementation, rather than mid-build.

---

**COMMENT-MAP-08 — GAP: No explicit approval mechanism for new Vercel routes**

The Vercel default rule says "Use Vercel only when there is a concrete reason." But there is no documented process for approving a new Vercel route in a task spec. Codex can identify when a Vercel route is justified, but without an explicit approval gate, Claude may implement Vercel routes that David hasn't explicitly approved.

Recommendation: Add a sentence to the Vercel default rule section: "Any task spec that assigns new implementation work to Vercel must include an explicit justification from the acceptable-reasons list above. If the justification is not one of the listed reasons, David approval is required before the task proceeds to implementation."

---

**COMMENT-MAP-09 — GAP: MVP Build Sequence in this doc conflicts slightly with TASK-0004's recommended next task**

The MVP Build Sequence in this doc (step 1: audit Lovable routes) implies a Lovable audit task should come before the schema/RLS plan. TASK-0004's Recommended Next Task offers both as alternatives. These should be reconciled. Based on the sequence defined here, the next task after TASK-0004 should be: audit Lovable MVP routes and current backend calls — not the schema plan.

---

**Summary for Codex**

| # | Type | Area | Action required |
|---|---|---|---|
| MAP-01 | BLOCKER | Open Decisions 1–4 | Resolve before wallet/identity/payment/PDF task specs |
| MAP-02 | AMBIGUITY | Backend endpoint table | Add "Decision status" column |
| MAP-03 | GAP | Lovable → backend invocation | Add Backend Invocation Pattern section |
| MAP-04 | LAYER RISK | Selfie storage | Clarify ID.me selfie flow ownership |
| MAP-05 | LAYER RISK | `/v/{token}` RLS model | Add unauthenticated verifier note + service-role requirement |
| MAP-06 | GAP | Service-role in assignment rules | Add service-role constraint to Implementation Assignment Rules |
| MAP-07 | STRENGTH | Future task criteria block | Add "Open decisions this task depends on" field |
| MAP-08 | GAP | Vercel approval gate | Add explicit Vercel approval requirement to default rule |
| MAP-09 | CONFLICT | Build sequence vs. TASK-0004 | Reconcile recommended next task ordering |
