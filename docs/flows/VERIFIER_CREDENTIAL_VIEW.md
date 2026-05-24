# Verifier Credential View Flow

**Status:** Draft  
**Source:** Product Attributes Blueprint v1.6 + David decisions  
**Owner:** Codex  
**Last Updated:** 2026-05-24  

## Purpose

This document defines the verifier-side flow after a verifier opens a nurse-sent link or scans a nurse-generated QR code.

## Entry Points

Verifier access may start from:

1. Nurse-sent share link.
2. Nurse-generated QR code shown for scan.
3. PDF QR code, where applicable.

All entry points use a short-lived one-time verification token.

## Verifier Entry Form

MVP verifier form collects only:

```text
Name
Email
```

No other verifier information is collected in MVP.

Specifically excluded:

- Organization.
- Title.
- Phone.
- Address.
- Free-text notes.

## Required Terms Checkbox

The verifier must check:

```text
[ ] I agree to PassTo’s Terms of Use
```

“Terms of Use” must link to a Terms of Use page.

## Optional Marketing Checkbox

The verifier may optionally check:

```text
[ ] May we contact you with occasional PassTo product updates? I can unsubscribe at any time.
```

Marketing consent is optional and separate from Terms of Use acceptance.

## Disclaimer Copy

The verifier page must display:

```text
This verification reflects information available to PassTo as of [date/time]. Licensing status may change after this verification. For official status, consult the applicable licensing authority.
```

## Validation Flow

System validates the token before showing the verifier form or credential view.

Validation checks:

1. Token exists.
2. Token status is `active`.
3. Token has not expired.
4. Token has not been used.
5. Credential is eligible for display.
6. License status mapping allows display.
7. Source status is not `unknown` / verification failure.

## Successful Verification View

After verifier submits name, email, required Terms checkbox, and optional marketing choice:

- Create or retrieve verifier by email.
- Create verification event.
- Display credential/report view.
- Mark token as `used`.

## Displayed Credential Information

Display:

- Nurse full name.
- License number.
- License type.
- State.
- Raw licensing-board status display.
- Expiry date.
- Last verified date/time.
- Current-as-of date/time.
- Trust indicators, where applicable.

Standard and Premier may include selfie. Free does not.

## Used or Invalid Token

Used, expired, replaced, revoked, or invalid tokens should not reveal credential details.

Recommended message:

```text
This link has expired. Ask the nurse to send you a new link or generate a new QR code.
```

If credential is no longer active, show a distinct message:

```text
This credential is no longer active. The nurse’s license status has changed. Contact the nurse for current information.
```

## Data Records

Recommended tables:

```text
verifiers
verification_events
verification_tokens
audit_events
```

## Privacy Notes

Verifier email is not displayed to the nurse.

Verifier data may be stored to provide and improve PassTo services as disclosed in Terms of Use.

PassTo should not treat verifier email as permission to spam.
