# Handoff Packet - TASK-0060 Stripe Checkout End-to-End Readiness

Task:
- TASK-0060 - Reconcile Stripe Checkout End-to-End Readiness

Current GitHub Source:
- Task doc: `docs/tasks/TASK-0060.md`
- Related PRD/flow docs: `docs/tasks/TASK-0040.md`, `docs/flows/PAYMENTS.md`, `docs/flows/IDME_FIRST_ONBOARDING.md`
- Related implementation: `supabase/functions/stripe-checkout-create/index.ts`, `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/payment-status/index.ts`, `supabase/functions/plan-select/index.ts`
- Latest commits reviewed: `f8805bc docs(approvals): record phase 5 and 6 decisions`

Approval State:
- Approved: TASK-0060 execution within documented Stripe test-mode/Supabase evidence scope, recorded under APPROVAL-0031.
- Not approved: Stripe live-mode cutover, live products/prices, production launch, risk acceptance, task Done, issue closure, or unrelated secret/config changes.
- Required before execution: no further David approval for documented test-mode execution.

Live Supabase State:
- Project: `wvzjfxacykgsaffskgtr`
- Edge Functions checked: `stripe-checkout-create` ACTIVE v7 with `verify_jwt: true`; `stripe-webhook` ACTIVE v8 with `verify_jwt: false`; `payment-status` ACTIVE v5.
- Migrations checked: live migration list does not show `migration_k_payments_action_type`, but live `payments_action_type_check` includes `subscription_start` and `subscription_renewal`.
- Grants/RLS/logs: not yet checked for this packet.

Files / Functions Affected:
- Docs: `docs/tasks/TASK-0060.md`, `docs/activity_log/ACTIVITY_LOG.md`, and this packet.
- Supabase functions: read-only review unless a documented blocker requires remediation.
- Migrations: none planned.
- Lovable routes: `/payment`, `/upload-selfie` evidence only.
- Stripe: test-mode Checkout evidence only.

Open Risks / Blockers:
- P1: a real test checkout still needs a paid-plan test profile at `onboarding_step = payment`.
- P2: Stripe event evidence must prove `subscriptions.profile_id`, `payments.subscription_start`, `stripe_events` idempotency, and webhook-driven `payment` to `selfie` advancement.
- Pending David decisions: none for documented TASK-0060 execution.

Do Not Touch:
- No Stripe live-mode changes.
- No live product/price changes.
- No production launch/risk acceptance.
- No deferred paid-action scope expansion.
- Do not treat client redirect/success URL as payment confirmation.

Next Expected Output:
- Execution evidence or blocker record in `docs/tasks/TASK-0060.md` and `docs/activity_log/ACTIVITY_LOG.md`.
- If a real checkout cannot be completed, record the exact blocker and remaining evidence gap.

Recommended Prompt for Claude:
"""
Execute TASK-0060 within the recorded approval boundary. Use Stripe test mode only. Exercise the approved Lovable or backend test path to create a paid-plan Checkout Session for a real Supabase profile at `onboarding_step = payment`, complete payment with Stripe test card `4242 4242 4242 4242`, then verify `subscriptions`, `payments`, `stripe_events`, and `profiles.onboarding_step` reflect webhook-confirmed state. Do not make live-mode Stripe changes or mark the task Done.
"""

Recommended Prompt for Codex QA:
"""
Review TASK-0060 evidence after execution. Confirm checkout/session metadata links to `profiles.id`, webhook writes an active subscription and `subscription_start` payment, profile advances only from webhook confirmation, duplicate event handling is idempotent, and Lovable receives no Stripe secrets. Propose pass/block/deferral only; do not mark final Done.
"""

Recommended Prompt for Lovable:
"""
No Lovable prompt yet. If frontend changes are needed, wire `/payment` to call `payment-status` and `stripe-checkout-create` only; redirect to the returned Checkout URL; on return to `/upload-selfie`, poll backend status and do not mark payment complete from the return URL.
"""
