# PassTo Live Nurse Demo Runbook

**Status:** Draft Runbook - Implementation Approval Required
**Date:** 2026-06-15
**Owner:** David
**Related Task:** TASK-0073
**Operating Mode:** `demo`

## 1. Demo Objective

Show an individual nurse that PassTo onboarding is legitimately simple and that
the result is useful in two ways:

1. The credential can live in the wallet on the nurse's phone.
2. The nurse can share a time-limited credential view with a verifier.

Primary payoff: wallet installation.
Secondary payoff: secure sharing and access history.

## 2. Audience and Format

- Audience: individual nurses.
- Primary format: Zoom.
- Secondary format: in-person conversation.
- Presenter controls the main flow.
- David may speak to expected timing during the presentation; this runbook does
  not prescribe a duration claim.

## 3. Demo Story

> “You verify once, PassTo turns your nursing-license information into a
> portable digital credential, and you control when and with whom you share it.”

The demo uses the fictional Avery Demo identity and synthetic provider data.
The OTP, selfie capture, PassTo backend flow, wallet issuance, sharing, and
verifier interaction should be real within the isolated environment.

## 4. Preflight

Before the meeting:

- Confirm demo/UAT environment health.
- Confirm no production project or provider credentials are active.
- Confirm Apple and Google demo wallet routes are healthy.
- Confirm SMS delivery to David's phone.
- Confirm the presenter console can start a new `demo_session_id`.
- Confirm the session is immutably stamped `mode = demo`.
- Confirm synthetic identity and license fixtures are available.
- Confirm private selfie upload and replacement.
- Confirm a private/incognito verifier browser is ready.
- Confirm screen/audio recording setup when the session is also UAT.
- Enable Do Not Disturb on phones used.
- Prepare a fallback issued demo pass and unused share link tagged to the
  current `demo_session_id`; confirm neither artifact has prior verifier history.
- Confirm launch-list opt-in is separate from demo account state.

## 5. Opening

Optionally begin by showing an existing souvenir demo pass:

> “This is the finished experience. It is clearly marked as a demonstration
> credential. Now I’ll show you how quickly a nurse gets one.”

Do not remove existing souvenir passes from participant devices.

Use `Prepare New Demo` to:

- Create a unique session.
- Reset Avery Demo onboarding.
- Clear prior participant phone/contact data.
- Revoke prior active share links for the resettable backend persona.
- Preserve prior audit history by session.
- Retain the current selfie until a new selfie replaces it.
- Restore the active synthetic license fixture.
- Confirm wallet and sharing health.

## 6. Core Presentation Flow

### Step 1 - Start Onboarding

Introduce:

> “We’ll use the fictional name Avery Demo because real identity and nursing
> records should not be used casually in a presentation.”

### Step 2 - Identity Acknowledgment

The participant or presenter actively acknowledges the simulated ID.me result.

Explain:

> “The external identity response is simulated because Avery Demo is fictional.
> The PassTo steps around it are the experience we are testing.”

Add:

> “Production timing will vary because live ID.me and license-provider steps
> are not measured in this demonstration.”

### Step 3 - License Information

Allow normal state, license-type, and license-number entry.

- For presenter-led Zoom demos, use a memorable synthetic value.
- In nurse UAT, do not say the number may be random unless asked.
- Show the returned number and label the record as synthetic.

### Step 4 - Phone Possession

Choose:

- David's phone for the reliable default.
- Participant's phone for an in-person trust demonstration, with consent.

Enter the real OTP without exposing it in a recording.

Narrative:

> “This confirms possession of the phone used in the trust process.”

### Step 5 - Fresh Selfie

Capture a fresh selfie of David or the participant, with consent.

Narrative:

> “A current likeness completes the trust cycle and gives a verifier an
> additional visual comparison. It is not ID.me biometric verification.”

Show the selfie in the PassTo app credential experience.

### Step 6 - Issue and Install Wallet Pass

Issue a unique souvenir pass and install it live.

Open the pass and explain:

- Avery Demo.
- License type and state.
- Simulated license status.
- Current-as-of/last-checked information.
- Permanent demo treatment.

The pass must visibly state:

```text
DEMO
NOT A VALID PROFESSIONAL CREDENTIAL
Synthetic license data
```

### Step 7 - Share

Transition:

> “A wallet credential is useful when I’m standing in front of someone. Nurses
> also need to share credentials remotely.”

Generate a fresh time-limited share link.

Zoom:

- Copy the link into the prepared private browser.
- Do not rely on SMS/email delivery for the main path.

In person:

- Open the link on the nurse's phone or a second available device.
- A QR handoff may be used only if it creates the approved short-lived share
  access, not a permanent wallet QR.

### Step 8 - Verifier Experience

Enter fictional or real verifier information.

Explain:

> “Production verifiers are required to enter accurate information and accept
> the terms. PassTo records what they provide; it does not independently verify
> their identity unless a future authentication step is added.”

The disclosure must always remain present. UAT may compare approved short and
long wording, but must not test an omitted disclosure.

Show:

- Avery Demo.
- Latest selfie or `Selfie not provided`.
- Synthetic license fields and status.
- Current-as-of timestamp and disclaimer.
- Clear demo treatment.

### Step 9 - Nurse Activity

Return to the nurse view and show:

- Verifier-provided name.
- Organization.
- Purpose.
- Access time.
- Label: `Verifier-provided information - not independently verified`.

### Step 10 - Close and Opt-In

> “This pass demonstrates the experience. To receive a credential you can use
> professionally, you’ll complete production onboarding with real identity and
> license verification.”

Offer the separate launch-list opt-in.

The participant may keep the souvenir demo pass and show it to friends.

## 7. Zoom Variant

- Mirror David's phone to the presentation computer.
- Share only the relevant phone/app window.
- Keep the verifier browser private/incognito and pre-positioned.
- Use David's phone for OTP unless demonstrating participant delivery.
- Keep a backup pass screenshot or installed pass available for continuity.
- Keep a backup unused share link, clearly identified as fallback evidence.

## 8. In-Person Variant

- Use David's phone by default.
- Offer participant-phone OTP and selfie only with explicit consent.
- Do not unlock or navigate beyond the approved action.
- Do not scroll past notifications or unrelated content.
- Do not screen-share the participant's phone.
- Return control of the phone immediately after the action.
- Let the nurse handle wallet installation where practical.
- Use a second browser/device for the verifier view.
- Avoid collecting or retaining unrelated content from the nurse's phone.
- If no second device is available, complete the verifier step in a private
  browser on David's computer or phone after showing the wallet pass.

## 9. Recovery Paths

If identity/license simulation fails:

- Explain the demo-environment issue.
- Use the prepared backend fixture or restart the session.

If SMS is delayed:

- Retry once.
- Switch to David's phone if participant delivery was optional.
- Do not use a secret universal OTP in the client.

If selfie upload fails:

- Retry capture once.
- Continue only if the required demo trust gate completes.

If wallet issuance fails:

- Show the prepared souvenir pass.
- State clearly that the live issuance step failed during this presentation.
- Record the failure; do not imply it succeeded.

If sharing fails:

- Use the prepared unused fallback link.
- State that it is the backup session link.

If connectivity fails:

- Show the installed souvenir pass.
- State plainly that no live issuance evidence exists for this session.
- A recorded/redacted walkthrough may be shown only as a previously captured
  reference, never as proof of the current run.

## 10. After the Presentation

- Clear participant phone/contact information from the demo session.
- Honor any manual selfie-deletion request.
- Leave souvenir passes installed unless the participant wants removal.
- Let share links expire or revoke them according to the session closeout.
- Preserve non-sensitive session/audit evidence.
- Store launch-list consent separately.
- Record demo failures and required remediation.

## 11. Presenter Readiness Checklist

- [ ] Isolated environment confirmed.
- [ ] Session stamped `mode = demo`.
- [ ] Demo providers and wallets healthy.
- [ ] Avery Demo reset completed.
- [ ] OTP phone selected.
- [ ] Selfie consent path ready.
- [ ] Wallet pass permanent demo treatment verified.
- [ ] Private verifier browser ready.
- [ ] Backup pass and link ready.
- [ ] Backup pass/link are unused and tagged to the current session.
- [ ] Launch-list opt-in ready and isolated.
- [ ] Recording consent obtained when applicable.

## 12. Demo Pass Acceptance Criteria

- Unique per session.
- Installable on the intended wallet platform.
- Cannot overwrite production passes.
- Cannot be promoted to production.
- Permanent, prominent demo/invalid labeling.
- Synthetic name and license data only.
- No permanent verifier QR.
- No private selfie-storage URL.
- Optional launch-list link is informational only.

## Codex Disposition of Claude Review - 2026-06-15

| Comment | Disposition | Result |
|---|---|---|
| CR-DEMO-01 | Accept with corrected wording | Added production-timing disclosure without making an unsupported duration claim. |
| CR-DEMO-02 | Accept | Runbook is explicitly `demo`; UAT uses the separate UAT protocol and immutable mode tag. |
| CR-DEMO-03 | Accept | Added participant-phone guardrails. |
| CR-DEMO-04 | Modify | Disclosure is mandatory; UAT may compare short versus long approved wording, not omission. |
| CR-DEMO-05 | Accept | Fallback artifacts must be current-session, unused, and free of prior verifier history. |
| CR-DEMO-06 | Accept | Clarified that recorded material is prior reference, never current-run evidence. |

---

## Claude Review Comments - 2026-06-15

**Reviewer:** Claude
**Status:** Suggestions and clarifying questions; disposition pending Codex / David
**Scope:** Items specific to this runbook. Cross-cutting items live in
`docs/tasks/TASK-0073.md`.

### CR-DEMO-01 - Add a production-time disclosure to the demo narrative

Any timing statement should distinguish the simulated provider steps from the
production experience. Recommend the presenter add a single explicit line, for
example after Step 2 or in the close in section 6:

> "Production timing will vary because live identity and license-provider steps
> are not measured in this demonstration."

Without this line the demo is technically honest but practically misleading.

### CR-DEMO-02 - Hard mode switch between DEMO and UAT in this runbook

The runbook currently mixes demo-polish guidance ("memorable synthetic value"
in section 6 Step 3, presenter-led main flow) with UAT-observation guidance
from the protocol ("don't tell the nurse it can be random"). Recommend either
splitting this runbook into a presenter-led demo runbook and a UAT moderator
runbook, or tagging every divergent instruction with `[DEMO]` / `[UAT]` so the
operator cannot accidentally apply the wrong instruction to the wrong session.

### CR-DEMO-03 - In-person participant-phone guardrail

"Explicit consent" alone in section 8 is thin. Recommend adding: do not unlock
the nurse's phone further than required, do not scroll past notifications, do
not screen-share the nurse's phone, return it immediately after the action.

### CR-DEMO-04 - Treat the "verifier not independently verified" line as a UAT variable

The disclosure in section 6 Step 8 may reduce nurse confidence in the product
more than it informs them. Recommend testing it in UAT (with vs. without, or
short vs. long phrasing) before committing the production demo script.

### CR-DEMO-05 - Per-session fallback uniqueness

"Prepare a fallback issued demo pass and unused share link" in section 4 needs
a uniqueness check: the fallback must not be a previously used souvenir or a
link tied to a prior session's verifier history. Recommend the preflight
confirm the fallback artifacts are unused and tagged with the current
`demo_session_id` before the session begins.

### CR-DEMO-06 - Connectivity-fallback recording wording

Section 9 says "Use a recorded/redacted walkthrough only as fallback, not as
live evidence." Recommend strengthening: if connectivity fails, state plainly
that no live issuance evidence exists for this session and do not present the
recorded walkthrough as proof of a current run - only as a previously captured
reference.
