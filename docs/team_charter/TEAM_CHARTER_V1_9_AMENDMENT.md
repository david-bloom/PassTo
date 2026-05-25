# PassTo Engineering Team Operating Charter — v1.9 Amendment

**Status:** Approved  
**Version:** v1.9 Amendment  
**Owner:** David  
**Approved Date:** 2026-05-25  
**Applies To:** `/docs/team_charter/TEAM_CHARTER.md` v1.3 and active amendments v1.4 through v1.8  

---

## Purpose

This amendment establishes the relationship between `CLAUDE.md`, the canonical naming conventions, and the PassTo operating charter.

It also confirms that naming conventions apply to both Codex and Claude.

---

## Version History Entry

Add to the charter version history:

| Version | Date | Approved By | Summary |
|---|---:|---|---|
| v1.9 | 2026-05-25 | David | Added `CLAUDE.md` startup aid and canonical naming conventions source at `/docs/architecture/NAMING_CONVENTIONS.md` |

---

## CLAUDE.md

`CLAUDE.md` is a Claude startup aid.

Canonical location:

```text
/CLAUDE.md
```

Claude should read `CLAUDE.md` at the start of Claude Code sessions when available.

`CLAUDE.md` may summarize startup instructions, active docs, naming conventions, task execution rules, PR rules, label routing, the `C` handshake, and current high-priority context.

`CLAUDE.md` does not replace or override:

- The PassTo team charter.
- Approved charter amendments.
- Approved task specs.
- Architecture docs.
- Feature docs.
- Flow docs.
- Activity logs.
- Decision logs.
- Risk logs.
- Approval logs.

If `CLAUDE.md` conflicts with a newer approved GitHub source-of-truth document, the newer approved source controls.

---

## Canonical Naming Conventions

PassTo naming conventions live at:

```text
/docs/architecture/NAMING_CONVENTIONS.md
```

The naming conventions apply to both Codex and Claude.

Codex must use the naming conventions when writing specs, architecture docs, QA reviews, schema recommendations, task files, and implementation guidance.

Claude must use the naming conventions when writing migrations, implementation notes, PRs, remediation responses, tests, docs, and GitHub comments.

Naming conventions apply to:

- Supabase tables
- Supabase columns
- Status values
- Token names
- Verifier names
- Payment names
- Subscription names
- PDF names
- Job names
- Event names
- Route names
- Documentation files
- GitHub labels
- Task files

---

## Naming Deviation Rule

Claude may challenge a naming convention if implementation evidence shows a better pattern.

Claude must document:

```text
Current Convention:
Proposed Deviation:
Reason:
Impact:
Risk:
Recommendation:
```

Codex must review the proposed deviation.

David approval is required if the deviation affects product language, architecture, schema, routes, integrations, docs, or task acceptance criteria.

---

## Consolidation Note

This amendment should be consolidated into `/docs/team_charter/TEAM_CHARTER.md` in a future documentation maintenance task together with v1.4 through v1.8.
