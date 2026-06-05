# Private Beta Launch Checklist

Use this checklist immediately before sending private beta invites.

## Repository

- [ ] `npm.cmd run lint` passes.
- [ ] `npm.cmd run typecheck` passes.
- [ ] `npm.cmd run test` passes.
- [ ] `npm.cmd run build` passes.
- [ ] `.env.example` matches deployed env requirements.
- [ ] README beta status is current.
- [ ] Known limitations are linked or shared with testers.

## Supabase

- [ ] `supabase/schema.sql` has been applied.
- [ ] RLS is enabled and verified for every sensitive table.
- [ ] Dating tables exist.
- [ ] Messaging table exists.
- [ ] Notifications table exists.
- [ ] Admin report fields exist.
- [ ] Storage bucket `profile-photos` exists.
- [ ] Storage upload policy allows users to manage only their own photos.
- [ ] Storage read strategy is understood: public bucket or signed URLs.
- [ ] Realtime is enabled for `dating_messages`.
- [ ] Realtime chat tested with two accounts.
- [ ] Export/delete tested with dating data and Breakup OS data.

## Stripe

- [ ] Stripe test mode keys are configured.
- [ ] `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` points to the intended recurring Pro price.
- [ ] Checkout route works.
- [ ] Webhook endpoint is configured.
- [ ] Webhook signing secret is configured.
- [ ] Subscription active, canceled, and failed states update profile plan safely.

## Anthropic

- [ ] `ANTHROPIC_API_KEY` is configured.
- [ ] Advisor works.
- [ ] Message Analyzer works.
- [ ] Dating reply helper works.
- [ ] Icebreaker generator works.
- [ ] Missing-key fallback behavior has been tested.

## Beta Access

- [ ] `BETA_ACCESS_ENABLED` is set intentionally.
- [ ] `BETA_ACCESS_CODE` is set if beta access is enabled.
- [ ] Existing authenticated users are not unnecessarily blocked.
- [ ] New unauthenticated users see clear beta access copy.

## Admin

- [ ] `ADMIN_EMAILS` is configured.
- [ ] Admin account can access `/admin/reports`.
- [ ] Non-admin account cannot access `/admin/reports`.
- [ ] Report filters work.
- [ ] Report status update works.
- [ ] Internal moderation notes save.
- [ ] Quick block behavior works.

## Feedback

- [ ] `NEXT_PUBLIC_BETA_FEEDBACK_URL` is configured if collecting feedback through a form.
- [ ] Feedback link appears in the navbar.
- [ ] Feedback link is hidden when the env var is missing.
- [ ] Bug report instructions are included in tester invite copy.

## Manual QA

- [ ] Account A script completed.
- [ ] Account B script completed.
- [ ] Admin script completed.
- [ ] Mobile QA completed.
- [ ] Core Breakup OS regression script completed.
- [ ] Safety Center links verified.
- [ ] Privacy page export tested.
- [ ] Privacy page delete-all tested on test account.

## Deployment

- [ ] Vercel project points to the correct repository and branch.
- [ ] All production environment variables are configured.
- [ ] App URL matches auth, Stripe, and Supabase redirect configuration.
- [ ] Post-deploy smoke test completed.
- [ ] Logs checked for private content leakage.
- [ ] Known limitations reviewed before invites are sent.
