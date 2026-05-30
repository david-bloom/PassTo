# PassTo Risks Log

This log records known risks, unresolved issues, accepted risks, and follow-up concerns.

## Risk Format

```markdown
## RISK-0000 — Risk Title

**Date Opened:** YYYY-MM-DD  
**Status:** Open / Accepted / Mitigated / Closed  
**Owner:** Codex / Claude / David  
**Severity:** Low / Medium / High / Critical  
**Related Task:** TASK-0000 / N/A  
**Area:** Product / Architecture / Security / Data / Design / Deployment / Integration  

### Risk

Describe the risk plainly.

### Impact

What could happen if this risk is not addressed?

### Mitigation / Recommendation

What should be done?

### David Acceptance

Accepted / Not Accepted / Pending

### Closeout Notes

-
```

---

## RISK-0001 — Supporting Documentation May Drift If Templates Are Not Used

**Date Opened:** 2026-05-24  
**Status:** Mitigated  
**Owner:** Codex  
**Severity:** Medium  
**Related Task:** TASK-0001  
**Area:** Operations  

### Risk

Without standard templates, Codex and Claude could document tasks, approvals, decisions, risks, and closeouts inconsistently.

### Impact

Future sessions may restart from incomplete or inconsistent documentation.

### Mitigation / Recommendation

Create foundational task, decision, risk, approval, and README templates.

### David Acceptance

Mitigated by TASK-0001 approval.

### Closeout Notes

Foundational templates created as part of TASK-0001.

---

## RISK-0002 — Twilio A2P 10DLC Carrier Approval Pending

**Date Opened:** 2026-05-30  
**Status:** Submitted — Pending Carrier Approval  
**Owner:** David  
**Severity:** High  
**Related Task:** TASK-0026 — Phase 3.2 Twilio Phone Verification  
**Area:** Integration  

### Risk

Twilio A2P 10DLC registration is required for production SMS delivery in the US. Without approved registration, Twilio cannot deliver OTP messages to nurses on US numbers. This directly blocks Phase 3.2 end-to-end QA and production launch.

### Impact

Nurses cannot complete phone verification via SMS in production until the A2P 10DLC application is approved by carriers. TASK-0026 implementation can proceed and be tested in Twilio sandbox/trial mode, but production SMS is blocked until approval clears.

### Mitigation / Recommendation

- A2P 10DLC application submitted 2026-05-30.
- TASK-0026 Edge Function implementation and Lovable wiring can proceed using Twilio sandbox mode.
- Production SMS gate: do not enable live Twilio credentials in Edge Function secrets until A2P approval is confirmed.
- Monitor Twilio dashboard for carrier approval status (typically 3–7 business days).

### David Acceptance

Accepted — A2P 10DLC application submitted 2026-05-30.

### Closeout Notes

Close this risk entry when Twilio dashboard confirms A2P 10DLC registration approved.
