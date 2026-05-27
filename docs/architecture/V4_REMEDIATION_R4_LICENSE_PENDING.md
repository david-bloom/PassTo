# V4 Remediation R4 — License Pending Status Constraint

**Migration:** `v4_passto_mvp_remediation_r4`  
**Project:** `wvzjfxacykgsaffskgtr`  
**Applied:** 2026-05-27  
**Executor:** Codex  
**Source Finding:** TASK-0018 P1 — `licenses.normalized_status` CHECK mismatch  
**Status:** Applied and verified  

---

## Purpose

R4 fixes the mismatch introduced after R3 added `Pending` to `license_status_mappings.normalized_status` but `licenses.normalized_status` still allowed only seven values.

Without this fix, the Phase 3.3 license lookup Edge Function could map a source status such as `Application Pending` to `Pending`, then fail when writing that value to `public.licenses.normalized_status`.

---

## Migration SQL

```sql
alter table public.licenses
  drop constraint if exists licenses_normalized_status_check;

alter table public.licenses
  add constraint licenses_normalized_status_check
  check (normalized_status = any (array[
    'Active','Inactive','Expired','Surrendered',
    'Revoked','Suspended','Pending','Unknown'
  ]));

comment on column public.licenses.normalized_status
  is 'PassTo canonical status. Eight values. Pending = source has pending application/renewal/review state; credential issuance depends on mapping rules.';
```

---

## Verification Results

Constraint after R4:

```text
licenses_normalized_status_check
CHECK ((normalized_status = ANY (ARRAY[
  'Active','Inactive','Expired','Surrendered',
  'Revoked','Suspended','Pending','Unknown'
])))
```

Column comment after R4:

```text
PassTo canonical status. Eight values. Pending = source has pending application/renewal/review state; credential issuance depends on mapping rules.
```

Migration history after R4:

```text
20260526203020  v4_passto_mvp_schema
20260526203708  v4_passto_mvp_remediation_r1
20260526203905  v4_passto_mvp_remediation_r2
20260526214025  v4_passto_mvp_remediation_r3
20260527143033  v4_passto_mvp_selfie_storage
20260527162803  v4_passto_mvp_remediation_r4
```

`license_status_mappings` contains 42 rows across 8 normalized status groups, including 5 `Pending` rows.

---

## Outcome

The TASK-0018 pre-Phase-3.3 blocker is resolved.

Phase 3.3 license lookup work may proceed when the Phase 3 sequence begins, subject to all other Phase 3 prerequisites.
