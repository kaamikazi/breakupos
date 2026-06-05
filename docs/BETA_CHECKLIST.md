# BreakupOS Private Beta Checklist

## Local Setup

- [ ] Copy `.env.example` to `.env.local`.
- [ ] Fill Supabase, Stripe, Anthropic, app URL, and beta access variables.
- [ ] Run `npm.cmd install`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run typecheck`.
- [ ] Run `npm.cmd run test`.
- [ ] Run `npm.cmd run build`.

## Supabase

- [ ] Run `supabase/schema.sql`.
- [ ] Confirm RLS is enabled on all app tables.
- [ ] Confirm OAuth redirect URL includes `/auth/callback`.
- [ ] Confirm `relationship_reports` and `weekly_summaries` exist.
- [ ] Confirm indexes were created.

## Stripe Test Mode

- [ ] Create Pro product and recurring test price.
- [ ] Set `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`.
- [ ] Configure webhook `/api/webhooks/stripe`.
- [ ] Test `checkout.session.completed`.
- [ ] Test `customer.subscription.deleted`.
- [ ] Test `invoice.payment_failed`.
- [ ] Confirm user downgrades safely on failed/canceled subscription.

## Anthropic

- [ ] Set `ANTHROPIC_API_KEY`.
- [ ] Generate advisor response.
- [ ] Generate message analysis.
- [ ] Generate relationship report.
- [ ] Generate weekly summary.
- [ ] Confirm fallbacks work with key temporarily removed in local testing.

## Auth / Beta Access

- [ ] Set `BETA_ACCESS_ENABLED=true`.
- [ ] Confirm `/auth` asks for beta code.
- [ ] Confirm wrong code shows error.
- [ ] Confirm correct code unlocks OAuth options.
- [ ] Confirm existing authenticated user is not blocked.
- [ ] Confirm `BETA_ACCESS_ENABLED=false` disables the gate.

## Core App Flow

- [ ] Sign in.
- [ ] Create first situation from onboarding.
- [ ] Add interaction.
- [ ] Move situation between pipeline stages.
- [ ] Add red and green flags.
- [ ] Save private notes.
- [ ] Use no-contact recovery mode.
- [ ] New dating users are redirected to `/dating/onboarding` before discovery.
- [ ] Dating onboarding completes all five steps on mobile and desktop.
- [ ] Dating profile can request verification and shows pending status.
- [ ] Safety Center at `/safety` is reachable from dating/profile/chat flows.
- [ ] Notifications page shows new match/message/report/weekly-summary notifications and can mark them read.
- [ ] Repeated identical chat messages are blocked by anti-spam rules.
- [ ] Inactive matches show an inactive badge without being deleted.
- [ ] Admin reports can be filtered by status/category and quick-block reported users when appropriate.

## Pro Features

- [ ] Free user sees Pro gates.
- [ ] Pro user can analyze messages.
- [ ] Pro user can preview screenshot and paste extracted text.
- [ ] Pro user can generate relationship report.
- [ ] Pro user can generate weekly coach summary.
- [ ] Free user cannot call Pro APIs directly.

## Privacy / Delete / Export

- [ ] Panic hide toggles names.
- [ ] Local PIN lock works and can be cleared.
- [ ] Export downloads JSON.
- [ ] Delete all data requires confirmation and clears user data.
- [ ] Screenshots are not uploaded or stored by default.

## Mobile

- [ ] Landing CTA fits on mobile.
- [ ] Navbar scrolls/wraps without overlap.
- [ ] Dashboard board scrolls horizontally.
- [ ] Situation tabs are usable.
- [ ] Forms fit within viewport.
- [ ] Analyzer screenshot preview is readable.

## Launch Day

- [ ] Deploy Vercel production build.
- [ ] Verify env vars in production.
- [ ] Run one complete smoke test as a new beta user.
- [ ] Run one Stripe test checkout.
- [ ] Confirm logs contain no private relationship content.
- [ ] Share beta access code only with intended testers.
- [ ] Keep support/contact channel ready for feedback.
