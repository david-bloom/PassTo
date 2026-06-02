-- ============================================================
-- Migration L: Add unique constraint on credentials(profile_id, license_id)
--
-- TASK-0049 remediation — Codex P2 finding
-- David approval required before applying.
--
-- Prevents duplicate credential rows for the same profile+license pair
-- when concurrent credential-create calls race past the pre-insert check.
--
-- PostgreSQL NULL behaviour: license_id is nullable (set null on license
-- delete). Multiple rows with license_id = NULL are permitted by the
-- unique constraint because NULL != NULL in SQL. This is correct —
-- credential history is preserved when a license is deleted.
--
-- Apply via Supabase dashboard SQL Editor.
-- Safe to run even if no duplicate rows exist.
-- ============================================================

alter table public.credentials
  add constraint credentials_profile_license_unique
  unique (profile_id, license_id);

comment on constraint credentials_profile_license_unique on public.credentials
  is 'One active credential per profile+license pair. NULL license_id (deleted license) is exempt — multiple orphaned credential rows are allowed.';
