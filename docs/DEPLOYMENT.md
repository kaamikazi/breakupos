# BreakupOS Deployment Checklist

## Required Environment Variables

Set these in `.env.local` and Vercel:

Use `.env.example` as the source template for local setup.

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key. Never expose client-side. |
| `NEXT_PUBLIC_APP_URL` | Yes | Production app URL, e.g. `https://breakupos-beta.vercel.app` |
| `ANTHROPIC_API_KEY` | Recommended | Enables AI advisor, reports, analyzer, weekly summaries |
| `STRIPE_SECRET_KEY` | Billing | Required for checkout |
| `STRIPE_WEBHOOK_SECRET` | Billing | Required for webhook verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Billing | Required if client Stripe flows are added |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Billing | Recurring Pro price ID |
| `BETA_ACCESS_ENABLED` | Beta | Set to `true` to require invite code before auth |
| `BETA_ACCESS_CODE` | Beta | Private beta invite code checked server-side |
| `NEXT_PUBLIC_BETA_FEEDBACK_URL` | Beta | Optional public feedback form URL shown in the app nav |
| `ADMIN_EMAILS` | Safety | Comma-separated admin emails allowed to access `/admin/reports` |

## Supabase Setup

1. Create a Supabase project.
2. Enable auth providers used by the app: Google and/or GitHub.
3. Add redirect URLs for the deployed app:
   - `https://breakupos-beta.vercel.app/auth/callback`
   - `https://breakupos-beta.vercel.app/auth/callback/client`
4. Run `supabase/schema.sql` in the SQL editor.
5. Confirm RLS is enabled on:
   - `profiles`
   - `situations`
   - `interactions`
   - `ai_advice`
   - `relationship_reports`
   - `weekly_summaries`
   - `dating_profiles`
   - `profile_photos`
   - `profile_likes`
   - `profile_passes`
   - `matches`
   - `dating_messages`
   - `user_blocks`
   - `user_reports`
6. In Supabase Realtime, enable realtime events for `dating_messages` if chat should update without polling. The app falls back to manual refresh/polling behavior if the channel is unavailable.

## Supabase Storage Setup

1. Create a Storage bucket named `profile-photos`.
2. For the private beta, configure it as public so discovery cards can render image URLs without signed URL churn.
3. Add bucket policies that allow authenticated users to upload into their own folder path and read public objects. Server API routes still enforce ownership before writing/deleting metadata.
4. Confirm max upload size is compatible with the app limit: 5MB.
5. If you switch to a private bucket later, update the app to mint short-lived signed URLs for profile display.

## Database Migration Steps

1. Back up production data.
2. Run the full `supabase/schema.sql`.
3. Confirm indexes were created.
4. Confirm policies exist and do not duplicate.
5. Smoke-test one user account before opening traffic.

The schema is designed to be rerunnable: triggers and policies are dropped before recreation, columns use `ADD COLUMN IF NOT EXISTS`, and indexes use `CREATE INDEX IF NOT EXISTS`.

## Stripe Setup

1. Create a BreakupOS Pro product.
2. Create a recurring price and set `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`.
3. Set `STRIPE_SECRET_KEY`.
4. Add webhook endpoint:
   - `https://your-domain.com/api/webhooks/stripe`
5. Subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
6. Set `STRIPE_WEBHOOK_SECRET`.

## Anthropic Setup

1. Create an Anthropic API key.
2. Set `ANTHROPIC_API_KEY`.
3. Without this key, AI premium features fall back to deterministic summaries where supported.

## Vercel Deployment

1. Import the project into Vercel.
2. Set all environment variables.
3. Ensure build command is `npm run build`.
4. Ensure install command is `npm install`.
5. Deploy.

## Pre-Deploy Quality Gates

Run locally:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

Also run `npm.cmd audit --audit-level=moderate` in an environment with npm registry access. If audit fails because the registry is unavailable, rerun it in CI before launch.

The app uses a system font stack, so production builds do not depend on fetching Google Fonts.

## Post-Deploy Smoke Test

Use `docs/BETA_CHECKLIST.md` for the full private beta checklist. Minimum smoke test:

- Sign in with OAuth.
- Create a situation.
- Add an interaction.
- Confirm dashboard and situation detail load.
- Confirm free user cannot access Pro APIs.
- Complete Stripe test checkout.
- Confirm profile plan changes to `pro`.
- Analyze a pasted message.
- Generate a relationship report.
- Generate weekly summary.
- Create a dating profile.
- Like/pass in discovery with a second test account and confirm matches appear.
- Open match chat, send messages from both test accounts, and confirm realtime or polling updates.
- Upload JPG, PNG, and WebP profile photos; reject unsupported types and files over 5MB.
- Delete an uploaded profile photo and confirm the Storage object is removed.
- Confirm visible dating profiles require at least one photo.
- Confirm Free users stop at the daily dating like limit and Pro users do not.
- Confirm Free users cannot call Pro-only dating AI/filter APIs.
- Confirm advanced discovery filters work for a Pro test account.
- Confirm AI icebreaker fallback works when `ANTHROPIC_API_KEY` is not set.
- Visit `/dating/onboarding` with a new dating user and finish all five steps.
- Request verification from the dating profile page and confirm status changes to pending.
- Confirm read receipts appear after the other account views the thread.
- Try sending repeated identical messages and confirm anti-spam copy appears.
- Confirm inactive matches show an inactive badge after the configured threshold.
- Visit `/notifications`, generate a new match/message, and mark a notification read.
- Delete your own message and confirm it shows as `Message deleted`.
- Confirm Pro account can generate an AI reply helper suggestion.
- Convert a match into a BreakupOS situation and confirm repeated conversion reuses the existing situation.
- Block/report a test profile and confirm it disappears from discovery.
- Block a matched user and confirm chat input disables while old messages remain visible.
- Set `ADMIN_EMAILS`, visit `/admin/reports`, and update a report status.
- Filter reports by status/category and test the quick block action.
- Visit `/safety` and confirm dating/profile/chat flows link to it.
- Export data.
- Delete all data from Privacy page.
- Cancel subscription in Stripe and confirm downgrade.

## Known Limitations

- Rate limiting is in-memory and should move to Redis/Vercel KV for multi-instance production.
- Local PIN and private vault are not encrypted.
- Screenshot OCR is not integrated yet; screenshots are not uploaded or stored.
- Relationship reports use printable HTML with browser Save as PDF.
- Weekly summaries are manual; cron scheduling is not implemented yet.
- Error logging is local console-only; add Sentry or similar before scaling.
- Realtime chat requires Supabase Realtime to be enabled for `dating_messages`; otherwise users can refresh/poll for updates.
- Profile photos currently use public bucket URLs for beta simplicity. Move to private buckets and signed URLs before handling highly sensitive identity use cases.
- Moderation is a foundation only: status review exists, but automated abuse detection, queues, and escalation workflows are future work.
- Profile boost is a documented placeholder and does not change ranking yet.
- Dating compatibility previews are heuristic, not scientific or therapeutic assessments.
- Verification status is a placeholder and does not perform real identity checks.
- Notifications are in-app only. Add email/push providers later.
- Anti-spam rules are intentionally simple and should be expanded with production telemetry.
