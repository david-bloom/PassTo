# PassTo Flows

## Purpose

This folder contains end-to-end user and business process documentation for PassTo.

Flows describe multi-step user/business processes. Feature docs describe product capabilities.

## Canonical Flow Docs

```text
/docs/flows/ACCOUNT_CREATION.md
/docs/flows/ID_VERIFICATION.md
/docs/flows/IDME_FIRST_ONBOARDING.md
/docs/flows/LICENSE_LOOKUP.md
/docs/flows/PAYMENTS.md
/docs/flows/VERIFIER_CREDENTIAL_VIEW.md
```

## Usage

Codex should review this folder before writing task specs for multi-step user or business flows.

Claude should review this folder before implementing flow behavior.

## Related Folders

```text
/docs/features/
/docs/architecture/
/docs/tasks/
/docs/activity_log/
/docs/team_charter/
/docs/design_system/
```

## Guardrail

Flow docs are baseline product/architecture documentation.

They do not approve Supabase migrations, Stripe live setup, production deployment, or Class A implementation work.
