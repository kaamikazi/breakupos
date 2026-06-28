# BreakupOS

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e)
![Stripe](https://img.shields.io/badge/Stripe-Subscriptions-635bff)

BreakupOS is an AI-powered emotional operating system for breakups, ghosting, no-contact recovery, talking stages, dating, photo-only social verdicts, and private situationship tracking.

## Private Beta Status

BreakupOS Dating is ready for controlled private beta testing, not broad public launch.

What works:

- Private beta access gate
- Required first-run public identity setup before protected app features
- Dating onboarding and profile editing
- Supabase Storage profile photo uploads
- Discovery, like/pass, daily like limits, and matches
- Match chat with participant-only access, soft delete, read receipts, block/report safety behavior, and Realtime/polling fallback notes
- In-app notifications for matches, messages, report updates, and weekly summaries
- Photo-only social feed with Love / Red Flag reactions
- Section-based social rankings for Top Loved, Most Red-Flagged, Most Divisive, and Trending Today
- Public social profiles at `/u/[username]`
- Message requests from social posts/profiles before opening chat
- Mobile bottom tab navigation and PWA manifest/icons
- Credit wallet foundation for cost-protected AI actions
- Admin report review for configured admin emails
- Breakup OS situation tracking, advisor, analyzer, recovery mode, analytics, reports, weekly summaries, export, and delete-all

What is experimental:

- Dating compatibility previews are lightweight product signals, not scientific scoring
- AI icebreakers, chat analysis, and reply suggestions need human review
- Verification, profile boost, and who-liked-you are beta foundations/placeholders
- Moderation is basic and should be manually reviewed during beta
- OCR for screenshots is placeholder/manual fallback
- Reports are printable HTML rather than server-rendered PDFs
- PWA offline support is a simple fallback page; a full service worker cache is still future work
- Credits are internal ledger infrastructure; credit-pack checkout is a next step

Before inviting testers:

- Read [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md)
- Run [docs/MANUAL_QA_SCRIPT.md](docs/MANUAL_QA_SCRIPT.md)
- Share [docs/BETA_INVITE.md](docs/BETA_INVITE.md)
- Review [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md)

## Product Overview

BreakupOS helps users turn messy romantic uncertainty into structured data:

- Track people through a relationship pipeline
- Create a public social identity without exposing email or private tracker data
- Log interactions, sentiment, flags, and notes
- Run no-contact recovery mode for exes
- Ask an AI advisor for grounded next steps
- Analyze pasted conversations for mixed signals and risks
- Generate printable relationship reports for individual situations
- Generate manual weekly AI coach summaries
- Post photo-only social situations and react with Love or Red Flag
- Open public poster profiles without exposing private BreakupOS data
- Send safe message requests that can become match chats if accepted
- Browse section-based community rankings without public identity scoring
- Use starter credits/free quota for deeper AI actions while protecting cloud costs
- Review analytics that reveal patterns over time
- Export or delete sensitive data from privacy controls
- Create a dating profile, browse discovery, like/pass, match, and prepare for future realtime chat

## Screenshots

Add production screenshots here after deployment:

| Dashboard | Situation Detail | Recovery | Analytics |
| --- | --- | --- | --- |
| `public/screenshots/dashboard.png` | `public/screenshots/situation.png` | `public/screenshots/recovery.png` | `public/screenshots/analytics.png` |

## Architecture

```text
app/
  api/                  Server routes for advisor, analyzer, dating, social, reports, summaries, situations, privacy, Stripe
  dashboard/            Pipeline entry point
  dating/profile/       Dating profile setup and edit flow
  discover/             One-card-at-a-time discovery feed
  matches/              Match list and realtime chat
  social/               Photo-only social feed and rankings
  situation/[id]/       Situation detail shell and client workflow
  analytics/            Server-loaded analytics page
components/
  Advisor/              AI advisor and message analyzer UI
  Analytics/            Chart components
  Dating/               Profile setup and discovery feed UI
  Social/               Photo-only feed and community rankings UI
  Pipeline/             Board, columns, cards
  Recovery/             No-contact recovery UI
  Situation/            Forms, flags, interactions, timeline, scoring
  shared/               Navbar, gates, meters, alerts, empty states
  ui/                   Base UI primitives
lib/
  api.ts                API response, JSON parsing, simple rate limiting
  compatibility.ts      Compatibility scoring engine
  domain.ts             Shared domain enums and field limits
  supabase*.ts          Supabase clients
  anthropic.ts          AI client and safety prompt primitives
types/
  index.ts              Product types
  database.ts           Supabase database types
supabase/
  schema.sql            Schema, RLS, indexes, upgrade helpers
```

## Feature Set

- Pipeline board with drag-and-drop stages
- Situation detail pages with vibe, investment, flags, private notes, vault, and score breakdown
- No-contact mode with streak, relapse log, emergency screen, reasons, and milestones
- AI advisor with tone selector, reply drafting, message analysis, safety-aware prompting, and memory summaries
- Pro-gated message analyzer with strict JSON validation and fallback analysis
- Screenshot upload preview for chat screenshots; OCR integration is a TODO and screenshots are not stored
- Pro-only printable relationship report generator with stored report metadata
- Pro-only weekly AI coach summary foundation with manual generation
- Analytics dashboard with stage distribution, red flags, investment, ghosting, consistency, and drain insights
- Privacy page with local PIN, panic hide, JSON export, and delete-all controls
- Stripe Checkout and webhook-based Pro activation
- Dating layer with guided onboarding, profile setup, trust badge placeholder, Supabase Storage photo uploads, discovery ranking, daily like limits, Pro filters, compatibility previews, AI icebreakers, like/pass, matches, realtime chat, in-app notifications, block/report, soft delete, read receipts, moderation workflow, Safety Center, and Pro AI reply helper

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Use `.env.example` as the current environment template.

Open `http://localhost:3000`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only service role key |
| `ANTHROPIC_API_KEY` | Recommended | Enables full AI advisor/analyzer |
| `STRIPE_SECRET_KEY` | Pro billing | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Pro billing | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Pro billing | Stripe publishable key |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Pro billing | Recurring Pro price ID |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL for auth and checkout redirects |
| `BETA_ACCESS_ENABLED` | Beta | Enables private beta invite-code gate |
| `BETA_ACCESS_CODE` | Beta | Server-side private beta access code |
| `NEXT_PUBLIC_BETA_FEEDBACK_URL` | Beta | Optional public feedback form URL shown in the app nav |

## Database Setup

Run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor.

The schema includes:

- RLS policies for profile, situation, interaction, and AI advice ownership
- Report and weekly summary tables for premium generated artifacts
- Dating profile, photo, like, pass, match, block, and report tables
- Upgrade-safe trigger recreation
- Indexes for dashboard, timeline, recovery, analytics, advice history, dating discovery, matches, safety, and Stripe lookups
- Migration helpers for no-contact mode, recovery fields, memory summary, and private vault

## Migration Notes

For an existing database, rerun `supabase/schema.sql`. The upgrade section:

- Adds `is_breakup_mode`, `no_contact_started`, `no_contact_reasons`, `recovery_milestones`, `memory_summary`, and `private_vault`
- Adds `relationship_reports` and `weekly_summaries`
- Adds `dating_profiles`, `profile_photos`, `profile_likes`, `profile_passes`, `matches`, `dating_messages`, `user_blocks`, and `user_reports`
- Adds `situations.match_id` so a match can be converted into one BreakupOS situation per user
- Adds uploaded profile photo metadata, report status/review fields, and admin moderation notes
- Adds dating verification status, match activity timestamps, and in-app notifications
- Replaces stage, interaction type, and advice type check constraints
- Adds query indexes
- Recreates triggers and policies safely

Back up production data before running schema changes.

## Deployment

1. Deploy to Vercel.
2. Set all environment variables.
3. Add Supabase auth redirect URL: `https://your-domain.com/auth/callback`.
4. Configure Stripe webhook: `https://your-domain.com/api/webhooks/stripe`.
5. Run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Quality Gates

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Production builds use a system font stack and do not require Google Fonts network access.

## Private Beta Testing

Use three accounts for beta QA:

- Account A: creates a dating profile, likes Account B, chats, tries AI help, converts the match to a situation, exports data, and deletes data.
- Account B: creates a dating profile, likes Account A, confirms match notifications, chats, reports, and blocks.
- Admin: reviews reports, filters moderation queues, updates status, adds notes, and confirms quick block behavior.

The full script lives in [docs/MANUAL_QA_SCRIPT.md](docs/MANUAL_QA_SCRIPT.md).

Recommended pre-invite command sequence:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

## Security Notes

- Supabase RLS limits records by authenticated user ID.
- Service-role API routes re-check user ownership before mutating data.
- Message Analyzer is enforced as Pro at the API layer, not only in the UI.
- Relationship reports and weekly summaries are enforced as Pro at the API layer.
- Screenshots are previewed in-browser and are not uploaded or persisted by default.
- Dating safety actions are server-authenticated and rate-limited. Blocks exclude both users from discovery; reports store only the selected reason/details.
- Chat messages are scoped to match participants, soft-deleted instead of hard-deleted, and disabled when either participant blocks the other.
- The Pro AI reply helper uses recent messages from the current match only and includes safety instructions for harassment, coercion, abuse, stalking, self-harm, and crisis.
- Free dating users have a daily like limit. Pro unlocks more dating capacity, advanced filters, AI icebreakers, chat analysis, relationship reports after match conversion, weekly coach, and premium placeholders for who-liked-you/profile boost.
- Compatibility previews are lightweight product signals from shared interests, goal alignment, and profile completeness. They are not scientific claims.
- Profile boost is a placeholder only and does not alter ranking yet. Who-liked-you is gated so Free users do not receive identifiable liker data.
- Dating onboarding lives at `/dating/onboarding`; incomplete dating users are redirected there before discovery.
- Verification is a trust badge placeholder only: users can request review, but real selfie/video or ID verification is still TODO.
- Messaging has simple anti-spam checks for repeated identical messages and obvious low-effort spam.
- Notifications are in-app only for new matches, new messages, report status changes, and weekly summaries. Email/push is a future integration.
- Profile photos upload to the Supabase `profile-photos` bucket. The beta uses public URLs for simple discovery rendering; storage paths are not exposed in public discovery/chat payloads.
- `/admin/reports` is gated by `ADMIN_EMAILS` and supports basic report status review.
- Destructive delete-all requires an explicit confirmation payload.
- Local PIN and private vault are convenience controls, not encryption. Treat real encrypted vault support as future work.
- Private beta testers should avoid entering legal names, addresses, phone numbers, financial details, explicit content, details involving minors, crisis content, or anything that should not be used in early beta debugging.
- See [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) for the current safety and production limitations.

## Roadmap

- Server-backed encrypted private vault
- OCR upload flow for screenshots
- Weekly AI summary job
- PDF relationship report generation
- OCR provider integration for screenshots
- Convert a match into a Breakup OS situation
- Photo upload storage and moderation workflow
- Signed URL/private bucket support for profile photos
- Real profile boost ranking implementation
- Full who-liked-you profile reveal UX for Pro
- Selfie/video verification workflow
- Email and push notification providers
- Formal unit tests for scoring and API validation
- Observability for AI latency, Stripe events, and route errors
- Mobile navigation polish after real-device testing

## Contributing

1. Create a branch.
2. Keep changes small and scoped.
3. Run lint, typecheck, and build before opening a PR.
4. Include screenshots for UI changes.
5. Include migration notes for schema changes.

## License

Private project. Add a license before open-sourcing.
