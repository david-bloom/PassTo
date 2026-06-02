-- Migration J: Extend license_lookups for TASK-0054
-- David approved 2026-06-01
alter table public.license_lookups
  add column if not exists submitted_license_number text,
  add column if not exists submitted_state           text,
  add column if not exists submitted_license_type    text,
  add column if not exists search_mode               text,
  add column if not exists candidate_data            jsonb,
  add column if not exists completed_at              timestamptz;
alter table public.license_lookups
  alter column lookup_source set default null;
