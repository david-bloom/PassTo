# PassTo Architecture

## Purpose

This folder contains system architecture, data model, security model, integrations, architecture decision records, naming conventions, and technical strategy for PassTo.

## Canonical Architecture Docs

Start here:

```text
/docs/architecture/SYSTEM_ARCHITECTURE.md
/docs/architecture/DATA_MODEL.md
/docs/architecture/SECURITY_MODEL.md
/docs/architecture/INTEGRATIONS.md
/docs/architecture/NAMING_CONVENTIONS.md
/docs/architecture/PRODUCT_ATTRIBUTES_ARCHITECTURE.md
/docs/architecture/ADR/ADR-0001-example.md
```

## Usage

Codex should review this folder before:

- Writing technical task specs
- Making architecture decisions
- Reviewing security/RLS risk
- Reviewing Claude implementation
- Approving migrations or integration work

Claude should review this folder before executing work that touches:

- Architecture
- Data model
- Supabase schema
- RLS/auth
- Integrations
- Payments
- Wallet passes
- PDF generation/storage
- Deployment or production safety

## Migration Warning

The baseline architecture docs do not approve Supabase migration execution.

Migration execution still requires:

```text
Claude remediation
Codex re-review
David approval
```

## ADRs

Architecture Decision Records live in:

```text
/docs/architecture/ADR/
```

Use the example/template:

```text
/docs/architecture/ADR/ADR-0001-example.md
```

## Related Folders

```text
/docs/features/
/docs/flows/
/docs/tasks/
/docs/activity_log/
/docs/team_charter/
/docs/design_system/
```
