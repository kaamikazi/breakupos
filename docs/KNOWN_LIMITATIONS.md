# Known Limitations

Breakup OS Dating is private-beta software. These limitations should be understood before inviting real testers.

## Security And Privacy

- The local PIN and private vault are convenience controls, not cryptographic security.
- Profile and social photos use Supabase Storage buckets (`profile-photos` and `social-posts`). The current beta assumes public bucket URLs unless you configure a private/signed URL strategy, so anyone with an old public URL may be able to open it until the object is deleted.
- Deleting posts, photos, delete-all data, or an account attempts to remove related storage objects. Treat storage cleanup as something to manually smoke-test before inviting broader beta traffic.
- The production storage plan is private buckets plus short-lived signed URLs or an image proxy. Public beta URLs are a temporary simplicity tradeoff.
- Rate limits use Upstash Redis when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured. Without Upstash, local/dev falls back to in-memory limits; production AI routes fail safely when Anthropic is enabled but durable limits are missing.
- Screenshots for message analysis are previewed locally and are not stored by default, but OCR is not fully integrated.
- Export/delete is designed to cover app data. Full account deletion also attempts to remove profile-photo and social-post storage objects before deleting the Supabase Auth user; manually verify this on a test account before beta launch.
- Abuse reports involving a deleted account are removed in the current beta implementation. Before a broader launch, decide whether a limited, anonymized safety-retention policy is required.

## Product Behavior

- OCR is placeholder/manual fallback. Users must paste extracted text if no OCR provider is configured.
- Email and push notifications are not implemented. Notifications are in-app only.
- Moderation is basic. Admins can review reports, update status, add notes, and use simple block actions, but there is no full moderation queue workflow yet.
- Relationship reports are printable HTML, not server-rendered PDFs.
- Profile boost is a placeholder and does not change ranking.
- Who-liked-you is gated and may be placeholder-level depending on plan and implementation state.
- Verification is a trust badge placeholder. There is no selfie, video, or ID verification yet.

## AI Limits

- AI can be wrong, incomplete, biased, or overconfident.
- AI analysis is not scientific compatibility scoring.
- AI reply suggestions should be reviewed by the user before sending.
- AI features should not be used for manipulation, pressure, harassment, stalking, coercion, or sexual content.

## Safety Limits

- Breakup OS Dating is not therapy.
- Breakup OS Dating is not legal advice.
- Breakup OS Dating is not crisis support.
- Users in immediate danger or crisis should contact local emergency services or a qualified crisis resource.
- Reports and blocks are safety tools, not a guarantee that harmful users are fully removed from every possible path.

## Deployment Limits

- Supabase RLS, Storage policies, Stripe webhooks, Realtime, and environment variables must be verified in the deployed environment.
- Local test success does not guarantee production configuration is correct.
- Browser/device QA is still required before sending invites.
