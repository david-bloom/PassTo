-- PassTo Supabase Fresh Schema v1
-- Purpose: Create a clean Postgres/Supabase schema for PassTo MVP.
-- Assumption: This is a fresh Supabase project with no Airtable data migration.
-- Run in Supabase SQL Editor or via Supabase CLI migration.

begin;

create extension if not exists pgcrypto;

-- Enums
create type public.app_role as enum ('owner', 'admin', 'reviewer', 'member');
create type public.account_status as enum ('active', 'suspended', 'deleted');
create type public.account_tier as enum ('free', 'standard', 'premier');
create type public.risk_status as enum ('normal', 'flagged', 'blocked');
create type public.onboarding_step as enum ('pending_idme', 'pending_phone', 'pending_license', 'pending_selfie', 'pending_issuance', 'complete');
create type public.verification_status as enum ('not_started', 'pending', 'verified', 'failed', 'needs_review');
create type public.identity_assurance_level as enum ('ial1', 'ial2');
create type public.match_result as enum ('passed', 'failed', 'pending');
create type public.credential_issuance_status as enum ('not_attempted', 'pending', 'failed', 'complete');
create type public.license_type as enum ('rn', 'lpn', 'aprn', 'np', 'crna', 'cnm', 'cns', 'cna', 'ma', 'emt', 'paramedic', 'dental', 'other');
create type public.license_status as enum ('active', 'inactive', 'suspended', 'revoked', 'registered', 'pending_renewal', 'other');
create type public.source_type as enum ('direct', 'vendor', 'unavailable');
create type public.pass_type as enum ('apple', 'google');
create type public.credential_status as enum ('pending', 'active', 'expired', 'revoked', 'failed');
create type public.token_status as enum ('active', 'expired', 'revoked', 'replaced');
create type public.verifier_created_by as enum ('self', 'nurse_entered', 'system');
create type public.refresh_triggered_by as enum ('nurse', 'scheduled', 'system', 'other');
create type public.payment_type as enum ('subscription', 'refresh', 'license_activation', 'share_link', 'pdf_export');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.subscription_status as enum ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused');
create type public.channel_type as enum ('email', 'sms', 'webhook', 'http');
create type public.provider_type as enum ('stripe', 'twilio', 'postmark', 'pdfmonkey', 'passkit', 'rapidapi', 'idme', 'supabase', 'other');
create type public.document_type as enum ('selfie', 'license_screenshot', 'pdf_export', 'other');
create type public.document_status as enum ('active', 'deleted', 'replaced');
create type public.share_link_status as enum ('active', 'expired', 'revoked');
create type public.audit_actor_type as enum ('nurse', 'system', 'admin', 'reviewer', 'verifier');
create type public.audit_event_type as enum ('account_created', 'account_suspended', 'account_closed', 'credential_issued', 'credential_refreshed', 'credential_viewed', 'data_matched', 'id_verified', 'license_looked_up', 'license_status_changed', 'payment_processed', 'pdf_exported', 'phone_verified', 'tier_changed', 'token_generated', 'share_link_created', 'share_link_viewed', 'risk_flagged', 'risk_cleared');
create type public.compliance_result as enum ('clear', 'flagged', 'review');

-- Utility functions
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.hash_token(raw_token text)
returns text
language sql
stable
as $$
  select encode(digest(raw_token, 'sha256'), 'hex')
$$;

-- Core identity/account
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  phone text,
  first_name text,
  last_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_lowercase_chk check (email = lower(email))
);
create unique index profiles_email_unique on public.profiles(email);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, email, phone, first_name, last_name)
  values (new.id, lower(coalesce(new.email, '')), new.phone, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')
  on conflict (id) do update set email = excluded.email, phone = coalesce(excluded.phone, public.profiles.phone), updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  tier public.account_tier not null default 'free',
  status public.account_status not null default 'active',
  risk_status public.risk_status not null default 'normal',
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index accounts_stripe_customer_id_unique on public.accounts(stripe_customer_id) where stripe_customer_id is not null;

create table public.account_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  unique(account_id, profile_id)
);
create index account_memberships_profile_idx on public.account_memberships(profile_id);
create index account_memberships_account_idx on public.account_memberships(account_id);

create or replace function public.handle_new_account_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.account_memberships(account_id, profile_id, role)
  values (new.id, new.owner_profile_id, 'owner')
  on conflict (account_id, profile_id) do update set role = 'owner';
  return new;
end;
$$;
create trigger on_account_created_add_owner_membership after insert on public.accounts for each row execute function public.handle_new_account_owner_membership();

create or replace function public.is_account_member(target_account_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.account_memberships am where am.account_id = target_account_id and am.profile_id = auth.uid())
$$;
create or replace function public.is_account_admin_or_owner(target_account_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.account_memberships am where am.account_id = target_account_id and am.profile_id = auth.uid() and am.role in ('owner', 'admin'))
$$;
create or replace function public.is_account_reviewer_or_admin(target_account_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.account_memberships am where am.account_id = target_account_id and am.profile_id = auth.uid() and am.role in ('owner', 'admin', 'reviewer'))
$$;

-- Nurse domain
create table public.nurse_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  public_slug text not null,
  verification_status public.verification_status not null default 'not_started',
  match_result public.match_result not null default 'pending',
  credential_issuance_status public.credential_issuance_status not null default 'not_attempted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, profile_id),
  unique(public_slug)
);
create index nurse_profiles_account_idx on public.nurse_profiles(account_id);
create index nurse_profiles_profile_idx on public.nurse_profiles(profile_id);

create table public.nurse_onboarding_state (
  nurse_profile_id uuid primary key references public.nurse_profiles(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  step public.onboarding_step not null default 'pending_idme',
  last_completed_step public.onboarding_step,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  nurse_profile_id uuid not null references public.nurse_profiles(id) on delete cascade,
  provider public.provider_type not null default 'idme',
  provider_verification_id text,
  status public.verification_status not null default 'pending',
  assurance_level public.identity_assurance_level,
  raw_first_name text,
  raw_last_name text,
  raw_full_name text,
  raw_date_of_birth text,
  matched_at timestamptz,
  verified_at timestamptz,
  failed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index identity_verifications_provider_unique on public.identity_verifications(provider, provider_verification_id) where provider_verification_id is not null;

create table public.phone_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempt_count int not null default 0,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Configuration and licensing
create table public.license_status_mappings (raw_status text primary key, normalized_status public.license_status not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.state_license_routes (state char(2) primary key, route public.source_type not null, board_name text, vendor_name text, config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint state_license_routes_state_chk check (state = upper(state)));
create table public.nlc_states (state char(2) primary key, active boolean not null default true, effective_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint nlc_states_state_chk check (state = upper(state)));

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  nurse_profile_id uuid not null references public.nurse_profiles(id) on delete cascade,
  license_number text not null,
  license_type public.license_type not null,
  profession_code text,
  state char(2) not null,
  status public.license_status not null default 'other',
  raw_status text,
  expiry_date date,
  compact_status boolean,
  compact_eligible boolean,
  source_type public.source_type not null default 'vendor',
  source_name text,
  last_verified_at timestamptz,
  primary_license boolean not null default false,
  pass_url text,
  enforcement_actions text,
  nursys_enrolled boolean,
  nursys_badge_eligible boolean not null default false,
  alerts_sent text[] not null default array[]::text[],
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint licenses_state_chk check (state = upper(state))
);
create unique index licenses_unique_license_per_state on public.licenses(state, license_number, license_type);
create unique index licenses_one_primary_per_nurse on public.licenses(nurse_profile_id) where primary_license is true;

-- Credentials, tokens, documents
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  nurse_profile_id uuid not null references public.nurse_profiles(id) on delete cascade,
  license_id uuid not null references public.licenses(id) on delete restrict,
  pass_type public.pass_type not null,
  pass_template_id text not null,
  provider public.provider_type not null default 'passkit',
  external_pass_id text,
  serial_number text,
  status public.credential_status not null default 'pending',
  raw_status text,
  device_push_token text,
  issued_at timestamptz,
  revoked_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index credentials_external_pass_unique on public.credentials(external_pass_id) where external_pass_id is not null;
create unique index credentials_serial_unique on public.credentials(serial_number) where serial_number is not null;

create table public.credential_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  credential_id uuid not null references public.credentials(id) on delete cascade,
  token_hash text not null unique,
  status public.token_status not null default 'active',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by_token_id uuid references public.credential_tokens(id),
  created_at timestamptz not null default now()
);
create unique index credential_tokens_one_active_per_credential on public.credential_tokens(credential_id) where status = 'active';

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  nurse_profile_id uuid references public.nurse_profiles(id) on delete cascade,
  license_id uuid references public.licenses(id) on delete cascade,
  document_type public.document_type not null,
  status public.document_status not null default 'active',
  storage_bucket text not null,
  storage_path text not null,
  uploaded_by_profile_id uuid references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(storage_bucket, storage_path)
);

-- Verifiers, share links, and credential views
create table public.verifiers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  verifier_name text not null,
  verifier_email text not null,
  organization text,
  created_by public.verifier_created_by not null default 'self',
  nurse_profile_id uuid references public.nurse_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verifiers_email_lowercase_chk check (verifier_email = lower(verifier_email))
);
create index verifiers_email_idx on public.verifiers(verifier_email);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  credential_id uuid not null references public.credentials(id) on delete cascade,
  nurse_profile_id uuid not null references public.nurse_profiles(id) on delete cascade,
  token_hash text not null unique,
  status public.share_link_status not null default 'active',
  verifier_id uuid references public.verifiers(id) on delete set null,
  expires_at timestamptz not null,
  max_views int,
  view_count int not null default 0,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.share_link_views (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references public.share_links(id) on delete cascade,
  verifier_id uuid references public.verifiers(id) on delete set null,
  viewer_email text,
  viewer_ip inet,
  viewer_user_agent text,
  viewed_at timestamptz not null default now()
);

create table public.credential_views (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  credential_id uuid not null references public.credentials(id) on delete cascade,
  verifier_id uuid references public.verifiers(id) on delete set null,
  share_link_id uuid references public.share_links(id) on delete set null,
  viewed_at timestamptz not null default now(),
  verifier_ip inet,
  license_status_at_view public.license_status,
  paid_refresh_involved boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create table public.refresh_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  credential_id uuid not null references public.credentials(id) on delete cascade,
  triggered_by public.refresh_triggered_by not null,
  trigger_source text,
  payment_id uuid,
  old_token_hash text,
  new_token_hash text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- Billing and integrations
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  nurse_profile_id uuid references public.nurse_profiles(id) on delete set null,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_checkout_session_id text,
  amount_cents int not null,
  currency text not null default 'usd',
  payment_method text,
  product_name text,
  type public.payment_type not null,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint payments_amount_nonnegative_chk check (amount_cents >= 0),
  constraint payments_currency_lowercase_chk check (currency = lower(currency))
);
create unique index payments_stripe_payment_intent_unique on public.payments(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create unique index payments_stripe_checkout_session_unique on public.payments(stripe_checkout_session_id) where stripe_checkout_session_id is not null;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  status public.subscription_status not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table public.stripe_events (id uuid primary key default gen_random_uuid(), stripe_event_id text not null unique, event_type text not null, processed_at timestamptz, payload jsonb not null, created_at timestamptz not null default now());
create table public.integration_events (id uuid primary key default gen_random_uuid(), account_id uuid references public.accounts(id) on delete set null, provider public.provider_type not null, channel public.channel_type not null, external_event_id text, event_type text not null, status text, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());

-- Compliance and audit
create table public.oig_sam_checks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  nurse_profile_id uuid not null references public.nurse_profiles(id) on delete cascade,
  checked_at timestamptz not null default now(),
  oig_result public.compliance_result not null default 'review',
  sam_result public.compliance_result not null default 'review',
  match_details text,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  resolution text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_type public.audit_actor_type not null default 'system',
  event_type public.audit_event_type not null,
  entity_type text not null,
  entity_id uuid,
  changed_field text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_events_account_idx on public.audit_events(account_id, created_at desc);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

alter table public.refresh_events add constraint refresh_events_payment_fk foreign key (payment_id) references public.payments(id) on delete set null;

-- Views
create view public.v_nurse_dashboard as
select np.id as nurse_profile_id, np.account_id, p.email, p.phone, p.first_name, p.last_name, a.tier, a.status as account_status, a.risk_status, np.verification_status, np.match_result, np.credential_issuance_status, nos.step as onboarding_step, l.id as primary_license_id, l.license_number, l.license_type, l.state, l.status as license_status, l.expiry_date, c.id as active_credential_id, c.status as credential_status, c.issued_at as credential_issued_at
from public.nurse_profiles np
join public.profiles p on p.id = np.profile_id
join public.accounts a on a.id = np.account_id
left join public.nurse_onboarding_state nos on nos.nurse_profile_id = np.id
left join public.licenses l on l.nurse_profile_id = np.id and l.primary_license is true
left join public.credentials c on c.nurse_profile_id = np.id and c.status = 'active';

create view public.v_credential_eligibility as
select np.id as nurse_profile_id, np.account_id,
  (a.status = 'active' and a.risk_status = 'normal' and np.verification_status = 'verified' and np.match_result = 'passed' and exists (select 1 from public.licenses l where l.nurse_profile_id = np.id and l.status = 'active' and (l.expiry_date is null or l.expiry_date >= current_date))) as eligible_for_credential,
  a.status as account_status, a.risk_status, np.verification_status, np.match_result
from public.nurse_profiles np join public.accounts a on a.id = np.account_id;

-- Updated-at triggers
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger accounts_set_updated_at before update on public.accounts for each row execute function public.set_updated_at();
create trigger nurse_profiles_set_updated_at before update on public.nurse_profiles for each row execute function public.set_updated_at();
create trigger nurse_onboarding_set_updated_at before update on public.nurse_onboarding_state for each row execute function public.set_updated_at();
create trigger identity_verifications_set_updated_at before update on public.identity_verifications for each row execute function public.set_updated_at();
create trigger license_status_mappings_set_updated_at before update on public.license_status_mappings for each row execute function public.set_updated_at();
create trigger state_license_routes_set_updated_at before update on public.state_license_routes for each row execute function public.set_updated_at();
create trigger nlc_states_set_updated_at before update on public.nlc_states for each row execute function public.set_updated_at();
create trigger licenses_set_updated_at before update on public.licenses for each row execute function public.set_updated_at();
create trigger credentials_set_updated_at before update on public.credentials for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger verifiers_set_updated_at before update on public.verifiers for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- RLS enabled on all public tables
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_memberships enable row level security;
alter table public.nurse_profiles enable row level security;
alter table public.nurse_onboarding_state enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.phone_verification_attempts enable row level security;
alter table public.license_status_mappings enable row level security;
alter table public.state_license_routes enable row level security;
alter table public.nlc_states enable row level security;
alter table public.licenses enable row level security;
alter table public.credentials enable row level security;
alter table public.credential_tokens enable row level security;
alter table public.verifiers enable row level security;
alter table public.share_links enable row level security;
alter table public.share_link_views enable row level security;
alter table public.credential_views enable row level security;
alter table public.refresh_events enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.integration_events enable row level security;
alter table public.documents enable row level security;
alter table public.oig_sam_checks enable row level security;
alter table public.audit_events enable row level security;

-- Starter RLS policies
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy accounts_select_member on public.accounts for select using (public.is_account_member(id));
create policy accounts_insert_owner on public.accounts for insert with check (owner_profile_id = auth.uid());
create policy accounts_update_admin_owner on public.accounts for update using (public.is_account_admin_or_owner(id)) with check (public.is_account_admin_or_owner(id));
create policy memberships_select_member on public.account_memberships for select using (public.is_account_member(account_id));
create policy memberships_insert_admin_owner on public.account_memberships for insert with check (public.is_account_admin_or_owner(account_id));
create policy memberships_update_admin_owner on public.account_memberships for update using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy memberships_delete_admin_owner on public.account_memberships for delete using (public.is_account_admin_or_owner(account_id));
create policy nurse_profiles_select_member on public.nurse_profiles for select using (public.is_account_member(account_id));
create policy nurse_profiles_write_admin_owner on public.nurse_profiles for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy nurse_onboarding_select_member on public.nurse_onboarding_state for select using (public.is_account_member(account_id));
create policy nurse_onboarding_write_admin_owner on public.nurse_onboarding_state for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy identity_verifications_select_reviewer on public.identity_verifications for select using (public.is_account_reviewer_or_admin(account_id));
create policy identity_verifications_write_admin_owner on public.identity_verifications for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy phone_verification_select_admin on public.phone_verification_attempts for select using (public.is_account_admin_or_owner(account_id));
create policy phone_verification_write_admin on public.phone_verification_attempts for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy licenses_select_member on public.licenses for select using (public.is_account_member(account_id));
create policy licenses_write_admin_owner on public.licenses for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy credentials_select_member on public.credentials for select using (public.is_account_member(account_id));
create policy credentials_write_admin_owner on public.credentials for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy credential_tokens_select_admin on public.credential_tokens for select using (public.is_account_admin_or_owner(account_id));
create policy credential_tokens_write_admin on public.credential_tokens for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy verifiers_select_member on public.verifiers for select using (account_id is null or public.is_account_member(account_id));
create policy verifiers_write_admin_owner on public.verifiers for all using (account_id is null or public.is_account_admin_or_owner(account_id)) with check (account_id is null or public.is_account_admin_or_owner(account_id));
create policy share_links_select_member on public.share_links for select using (public.is_account_member(account_id));
create policy share_links_write_admin_owner on public.share_links for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy share_link_views_select_member on public.share_link_views for select using (exists (select 1 from public.share_links sl where sl.id = share_link_id and public.is_account_member(sl.account_id)));
create policy credential_views_select_member on public.credential_views for select using (public.is_account_member(account_id));
create policy credential_views_write_admin_owner on public.credential_views for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy refresh_events_select_member on public.refresh_events for select using (public.is_account_member(account_id));
create policy refresh_events_write_admin_owner on public.refresh_events for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy payments_select_member on public.payments for select using (public.is_account_member(account_id));
create policy payments_write_admin_owner on public.payments for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy subscriptions_select_member on public.subscriptions for select using (public.is_account_member(account_id));
create policy subscriptions_write_admin_owner on public.subscriptions for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy integration_events_select_member on public.integration_events for select using (account_id is null or public.is_account_member(account_id));
create policy integration_events_write_admin_owner on public.integration_events for all using (account_id is null or public.is_account_admin_or_owner(account_id)) with check (account_id is null or public.is_account_admin_or_owner(account_id));
create policy documents_select_member on public.documents for select using (public.is_account_member(account_id));
create policy documents_write_admin_owner on public.documents for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy oig_sam_select_reviewer on public.oig_sam_checks for select using (public.is_account_reviewer_or_admin(account_id));
create policy oig_sam_write_admin_owner on public.oig_sam_checks for all using (public.is_account_admin_or_owner(account_id)) with check (public.is_account_admin_or_owner(account_id));
create policy audit_events_select_admin_owner on public.audit_events for select using (account_id is null or public.is_account_admin_or_owner(account_id));
create policy audit_events_insert_admin_owner on public.audit_events for insert with check (account_id is null or public.is_account_admin_or_owner(account_id));
create policy license_status_mappings_select_authenticated on public.license_status_mappings for select to authenticated using (true);
create policy state_license_routes_select_authenticated on public.state_license_routes for select to authenticated using (true);
create policy nlc_states_select_authenticated on public.nlc_states for select to authenticated using (true);

-- stripe_events intentionally has no client policies; use service role only.

alter view public.v_nurse_dashboard set (security_invoker = true);
alter view public.v_credential_eligibility set (security_invoker = true);

commit;
