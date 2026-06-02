-- ============================================================
-- Migration K: Extend payments.action_type for Stripe events
--
-- TASK-0040 — Implement Stripe Subscription State and Entitlement Gating
-- David approved 2026-06-02
--
-- The v4 baseline payments.action_type CHECK only allows:
--   'share_token', 'refresh', 'pdf_export', 'additional_license'
--
-- stripe-webhook inserts payment rows with action_type values:
--   'subscription_start'   — checkout.session.completed
--   'subscription_renewal' — invoice.payment_failed (failure record)
--
-- These writes would throw a CHECK constraint violation without this migration.
--
-- Apply via Supabase dashboard SQL Editor BEFORE deploying
-- stripe-checkout-create or stripe-webhook.
-- ============================================================

alter table public.payments
  drop constraint if exists payments_action_type_check;

alter table public.payments
  add constraint payments_action_type_check check (
    action_type in (
      'share_token',
      'refresh',
      'pdf_export',
      'additional_license',
      'subscription_start',
      'subscription_renewal'
    )
  );

comment on column public.payments.action_type
  is 'share_token=$1.99 where paid; refresh=$1.99 where paid; pdf_export=entitlement Standard+; additional_license=$4.99; subscription_start=Stripe checkout success; subscription_renewal=Stripe renewal (failed record).';
