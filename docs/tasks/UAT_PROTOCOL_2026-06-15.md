# PassTo UAT Protocol - Isolated Demo/UAT Environment

**Status:** Draft Protocol - Implementation Approval Required
**Date:** 2026-06-15
**Owner:** David / Codex
**Related Task:** TASK-0073

## 1. Purpose

Validate that nurses can understand and complete PassTo onboarding, install a
wallet credential, and share it without relying on fictional identities being
accepted by ID.me or RapidAPI/Propelus.

This protocol tests PassTo's experience and trust controls. It does not prove
the usability or availability of the live external-provider journeys.

## 2. UAT Stages

### Stage A - Internal UAT

David and the development team validate:

- Environment isolation and reset behavior.
- Golden-path reliability.
- Real SMS OTP to presenter and participant numbers.
- Fresh selfie capture, replacement, display, and manual deletion.
- Simulated identity and license-provider contracts.
- Apple and Google souvenir pass issuance.
- Share-link and verifier behavior.
- Recording, event correlation, evidence, and cleanup.
- Zoom and in-person presentation variants.

### Stage B - Moderated Nurse UAT

David recruits nurses personally. Each session uses:

- Fictional identity `Avery Demo`.
- Synthetic license data.
- Nurse's phone by preference; David's phone as fallback.
- Nurse's or David's selfie with explicit consent.
- Short introduction followed by mostly silent observation.
- Screen and audio recording with explicit consent.

Recommended first cohort: five nurses, then review and remediate before the next
round.

## 3. Required Environment

- Dedicated non-production Supabase project: `atnmcjkjshyqcttnmzkq`
  ("PassTo Demo"), provided by David on 2026-06-16.
- Dedicated demo/UAT domains.
- Separate Apple and Google Wallet identifiers.
- Synthetic provider fixtures and isolated storage.
- Real Twilio test/demo delivery where approved.
- No production users, secrets, wallet IDs, provider records, or analytics.
- Immutable `demo_session_id` or `uat_session_id` on session evidence.
- Immutable `mode = uat` on every session governed by this protocol.
- Environment-wide fail-closed checks, not only a visible UI label.

## 4. Golden-Path Scenario

The participant:

1. Starts onboarding as Avery Demo.
2. Acknowledges that identity verification will be simulated.
3. Completes the simulated successful identity result.
4. Enters license state, type, and a license-number value.
5. Receives an active synthetic license result using the entered number.
6. Reviews the identity/license match.
7. Receives and enters a real SMS OTP.
8. Captures a fresh required selfie.
9. Reviews the credential in the app, including the selfie.
10. Installs a uniquely issued souvenir wallet pass.
11. Creates a time-limited share link.
12. Completes the verifier form with fictional or real details.
13. Views the credential, latest selfie, synthetic status, and current-as-of time.
14. Returns to nurse activity history and sees verifier-provided activity.
15. Optionally joins the launch list through a separate opt-in.

## 5. Simulation Disclosures

### Identity Acknowledgment

Show once, before the simulator:

> **UAT identity verification**
>
> ID.me cannot be completed using the fictional Avery Demo profile. This test
> will simulate a successful identity-verification result so you can continue
> through PassTo. It does not verify your identity or create a valid credential.

Action:

`Continue with simulated verification`

Do not imitate ID.me screens or imply ID.me participation in the UAT result.

### License Simulation

The participant is not told to enter a random value unless they ask. This
allows observation of whether nurses know or need to locate their license
number.

If asked, David responds:

> “For this UAT session, you can enter any random letters or numbers.”

If the participant intends to enter a real license number, David responds:

> “For this UAT session we use synthetic data only. The environment cannot
> validate a real license number and we should not store one here. Any letters
> and numbers will work.”

The golden-path simulator accepts a reasonable alphanumeric value, echoes it
into the synthetic record, and labels the result as synthetic.

Reserved test values may trigger deterministic internal failure scenarios, but
they are not part of the main moderated nurse session.

## 6. Moderator Script

### Introduction

> “You’ll onboard using the fictional profile Avery Demo and a synthetic
> nursing-license record. Please proceed as though you were creating your own
> credential. I’m testing the product, not you. I’ll mostly observe, so some
> silence is intentional. Please say what you are thinking as you go.”

### Standard Intervention Ladder

1. Observe silently.
2. Ask: “What would you expect to do here?”
3. Ask: “What information would help you continue?”
4. Provide the smallest factual clarification.
5. Give direct instruction only when needed to preserve the rest of the test.

Record each intervention and timestamp. Completion after direct instruction is
`assisted`, not an unqualified usability pass.

The moderator may intervene immediately for privacy, safety, accidental real
credential exposure, or a technical failure that cannot be resolved in-product.

## 7. Consent and Recording

Obtain separate affirmative consent for:

- UAT participation.
- Use of the participant's phone number for OTP.
- Use and retention of the participant's selfie.
- Screen and audio recording.
- Optional use of anonymized clips in internal product review.
- Separate launch-list marketing contact.

Suggested recording consent:

> “With your permission, we’ll record your screen, voice, and interactions so
> we can review the product experience. The recording is for PassTo research,
> not identity verification. You may pause or stop recording at any time.”

Recording guidance:

- Use native phone screen recording with microphone, or mirrored-screen
  recording plus room audio.
- Enable Do Not Disturb first.
- Do not ask the moderator to edit or redact while facilitating the session.
- Complete one post-session redaction pass before review or sharing, covering
  OTP values, phone numbers, raw share links/tokens, unrelated notifications,
  authentication links, and other accidental PII.
- Do not record identity documents.
- Confirm secure transfer before deleting a participant-device local copy.

When a participant uses their phone:

- Do not unlock or navigate beyond the action they approved.
- Do not scroll past notifications or unrelated content.
- Do not screen-share the participant's phone.
- Return control of the phone immediately after the action.

## 8. Selfie Rules

- Selfie capture is required in the tested trust flow.
- Explain that it is a current likeness, not biometric verification by ID.me.
- Display it in the nurse app credential experience.
- Display the latest selfie in verifier views through backend-authorized access.
- Never expose a private storage path or durable public URL.
- If manually deleted, future verifier views show `Selfie not provided`.
- If a participant is concerned, David offers manual deletion after the session.
- Wallet pass remains photo-free unless separately approved and implemented.

Suggested copy:

> **Take a current photo**
>
> Your current likeness supports PassTo's trust and credential-issuance process.
> It is stored privately and does not prove biometric verification by ID.me.

Verifier copy:

> “Current likeness provided by the credential holder for visual comparison.”

## 9. Inline Validation

Use inline validation for missing or correctable information:

- Keep the participant on the current page.
- Preserve prior input.
- Focus or scroll to the first problem.
- Show a concise summary near the primary action when multiple items are missing.

Use separate resolution states only for provider failure, no license found,
identity/license mismatch, ineligible license, or support-required conditions.

Each nurse UAT includes one naturally occurring or intentionally introduced
recoverable inline error. Do not derail the golden path with a provider failure.

## 10. Timing and Success Metrics

Track two clocks:

### Prepared-User Product Time

Measures active PassTo interaction when identity access and license information
are ready.

Record product-controlled elapsed time without defining a protocol-level
duration target. David may discuss expected timing during a UAT session.

### Total Elapsed Time

Includes:

- Time locating license information.
- Identity-account readiness discussion.
- OTP delivery delay.
- Permissions and wallet setup.
- Connectivity or provider delay.

Record stage timing for:

- Identity acknowledgment/simulation.
- License entry and retrieval behavior.
- OTP.
- Selfie capture.
- Credential issuance.
- Wallet installation.
- Share-link creation.
- Verifier completion.

Internal UAT reliability target:

- 10 consecutive golden-path runs without manual database intervention.
- Wallet installation and sharing complete without moderator instruction.
- Both presenter-phone and participant-phone OTP paths pass.
- Zoom and in-person variants pass.
- No demo artifact can be mistaken for a production credential.

Observed completion time remains supporting data, not a UAT exit gate.
Headline usability signals are:

- Direct help requests.
- Hesitation events lasting five seconds or more.
- Golden-path steps completed without instruction.
- Wrong turns and backtracking.
- License-number retrieval behavior.

Session outcome definitions:

- `unassisted_complete`: completed without direct instruction.
- `assisted_complete`: completed with one or more direct instructions.
- `incomplete`: did not complete the required path.

Headline unassisted completion rate:

```text
unassisted_complete sessions / total sessions
```

Nurse UAT measures:

- Completion and assisted-completion rates.
- Time by stage and total time.
- Wrong turns, backtracking, and help requests.
- License-number retrieval behavior.
- Percentage who know the license number without lookup.
- Percentage who locate it without help.
- Median license-number retrieval time.
- State-board or other lookup behavior observed.
- Trust/privacy concerns.
- Nurse response to learning that verifier identity is self-declared and not
  independently authenticated.
- Whether that disclosure changes willingness to share the credential.
- Understanding of simulated verification.
- Wallet installation and sharing success.
- Perceived value and confidence.
- Launch-list opt-in rate, reported separately from usability completion.

## 11. Post-Session Questions

Ask before explaining misunderstood features:

1. What did you think PassTo was doing?
2. Which step felt least trustworthy or clear?
3. Was anything harder than expected?
4. Would carrying this credential in your wallet be useful?
5. When would you share it, and with whom?

## 12. Evidence Package

Create one restricted package per `uat_session_id`:

- Recording or redacted recording reference.
- Device model, OS, browser, wallet, and relevant accessibility settings.
- Stage timings.
- Moderator notes and intervention timestamps.
- Participant comments tagged by topic.
- Expected versus actual system event timeline.
- Simulation acknowledgment event and timestamp.
- Whether the participant appeared to read the acknowledgment, recorded as a
  moderator observation rather than a system fact.
- Functional checkpoint results.
- Post-session answers.
- Selfie deletion request/status, without copying the image.
- Findings with severity, owner, and recommended action.

Do not include raw OTPs, auth links, unredacted share tokens, secret values,
private storage paths, or provider credentials.

## 13. Review Rules

- Review the first five nurse sessions as one cohort.
- Any privacy, credential-misrepresentation, or cross-environment issue is an
  immediate blocker.
- A trust break affecting the meaning of the credential is also an immediate
  blocker after one occurrence.
- Usability friction repeated in three or more of five sessions becomes a
  remediation candidate requiring root-cause diagnosis before a fix is chosen.
- Other usability signals are carried into cohort 2 before a product decision
  unless severity or evidence warrants earlier action.
- Cohort 1 findings at `n = 5` are directional signals, not definitive product
  conclusions. Usability decisions require cohort 2 evidence unless an
  immediate-blocker threshold is met.
- Separate product usability findings from external-provider readiness findings.
- Do not claim the simulated ID.me step proves real ID.me completion time.

## 14. Launch-List Opt-In

Keep opt-in separate from Avery Demo and UAT records.

Collect only:

- First name.
- Email or mobile number.
- Preferred contact method.
- Optional state/license type.
- Explicit marketing consent.

Confirmation:

> “Joining the launch list does not create or verify a professional credential.”

## 15. Cleanup

- Clear participant phone/contact data from the demo session after use.
- Revoke or allow normal expiry of share links according to the runbook.
- Retain selfie until replaced unless the participant requests manual deletion.
- Preserve non-sensitive audit and UAT evidence under the session ID.
- Delete restricted raw recordings within 30 days.
- Retain redacted recordings or clips for no more than 12 months without a
  renewed documented need.
- Retain structured de-identified findings as product research.
- Never use normal production account-deletion behavior as the demo reset path.

## Codex Disposition of Claude Review - 2026-06-15

| Comment | Disposition | Result |
|---|---|---|
| CR-UAT-01 | Accept with modification | Removed a fixed duration target; friction signals and observed timing drive usability assessment. |
| CR-UAT-02 | Accept | Promoted license-number retrieval to top-line metrics. |
| CR-UAT-03 | Accept | Defined unassisted, assisted, incomplete, and headline rate. |
| CR-UAT-04 | Accept | Added tiered evidence rules for blockers, repeated friction, and cohort 2 pooling. |
| CR-UAT-05 | Accept | Replaced live redaction with a post-session checklist pass. |
| CR-UAT-06 | Accept | Added scripted redirect away from real license numbers. |
| CR-UAT-07 | Accept | Added participant-phone handling guardrails. |
| CR-UAT-08 | Accept | Added launch-list opt-in rate as a separate measure. |
| CR-UAT-09 | Accept with bounded retention | Added 30-day raw and 12-month redacted recording caps. |
| CR-UAT-10 | Accept | Added acknowledgment event and observation to evidence. |

---

## Claude Review Comments - 2026-06-15

**Reviewer:** Claude
**Status:** Suggestions and clarifying questions; disposition pending Codex / David
**Scope:** Items specific to this protocol. Cross-cutting items live in
`docs/tasks/TASK-0073.md`.

### CR-UAT-01 - Use friction metrics instead of a fixed-duration UAT exit criterion

A fixed-duration target can obscure the slow, variable external steps because
ID.me and license lookup are simulated. Recommend the headline UAT exit metrics
remain friction signals: count of help requests, hesitation events of five
seconds or more, count of golden-path steps completed without instruction, and
license-number lookup behavior. Keep observed time as supporting data, not as
an exit criterion.

### CR-UAT-02 - Promote license-number lookup behavior to a top-line metric

Sections 5 and 10 mention the observation but bury it. This is the single most
valuable un-simulatable signal in the session - the friction of "where do I
find my license number" is real even with synthetic data. Recommend reporting:
percent of participants who knew the number, percent who looked it up
successfully without help, median time-to-find, and any state-board-site
behavior observed. Keep the existing rule of not prompting the nurse to find it.

### CR-UAT-03 - Define `passed` vs `assisted` numerator and denominator before cohort 1

Section 6 defines "assisted" after direct instruction but the metrics section
does not commit to how the headline success rate is computed. Recommend stating
now: any session containing a direct instruction is `assisted`, others are
`unassisted`. Headline pass rate = unassisted completions / total sessions.
This prevents post-hoc reinterpretation after cohort 1.

### CR-UAT-04 - Tiered evidence bar for n=5 cohort

A "3-of-5 = remediation" rule in section 13 will over-fit to coincidence at
n=5. Recommend:

- Privacy, safety, credential-misrepresentation, cross-environment, or trust
  break: blocker at n >= 1 (already in place).
- Usability friction repeated in three or more of five sessions: remediation
  candidate, but require root-cause diagnosis before committing a fix.
- Other usability signals: pool with cohort 2 before deciding.

### CR-UAT-05 - Post-process recording redaction, not in-session

Asking the moderator (section 7) to live-redact OTPs, phone numbers, share
tokens, notifications, and auth links while moderating will fail under
pressure. Recommend: DND enabled, no mid-session edits, single post-process
redaction pass against a written checklist before any review or sharing.

### CR-UAT-06 - Written redirect for participants who want to enter a real license number

Likely scenario in moderated sessions; not addressed in section 5. Recommend a
short scripted response, for example:

> "For this UAT session we use synthetic data only. The environment can't
> validate a real license number and we shouldn't store one here. Any letters
> and numbers will work."

### CR-UAT-07 - In-person participant-phone guardrail

"Explicit consent" in sections 7 and 8 does not cover the practical exposure
when the nurse hands over their phone for OTP or selfie. Recommend adding: do
not unlock further than required, do not scroll past notifications, do not
screen-share the participant's phone, return it immediately after the action.

### CR-UAT-08 - Track launch-list opt-in as a measure

Opt-in conversion is one of the few non-simulated conversion signals available
in the session. Recommend adding `launch_list_opt_in_rate` to nurse UAT
measures in section 10.

### CR-UAT-09 - Explicit PII retention caps

"Preserve non-sensitive evidence under session ID" in section 15 leaves
retention undefined for raw recordings and selfies. See `CR-0073-06`. Recommend
stating caps in this section so the protocol is self-contained.

### CR-UAT-10 - Capture the simulation acknowledgment in evidence

Sections 5 and 12 do not require capture of whether the participant actively
acknowledged the simulated ID.me result, when, and whether they appeared to
read it. Recommend including the acknowledgment event in the expected-vs-actual
system event timeline so misunderstandings of simulation are traceable.
