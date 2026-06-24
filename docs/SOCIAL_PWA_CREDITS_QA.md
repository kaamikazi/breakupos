# Social / PWA / Credits Manual QA

Use 2-3 real test accounts on the production beta domain.

## Mobile

- Android Chrome: open `https://breakupos-beta.vercel.app`, sign in, and verify bottom tabs appear.
- iPhone Safari: sign in and verify bottom tabs do not overlap page actions.
- Android Chrome: use install prompt or Add to Home Screen and confirm standalone launch.
- Installed PWA: open Feed, Rankings, Matches, OS, and Profile tabs.
- Offline: disable network and open `/offline.html`.

## Social Feed

- Open `/social`.
- Tap a poster avatar/name and confirm it opens `/u/[username]`.
- Confirm public profile shows only public profile fields, social posts, and public verdict stats.
- Confirm public profile does not show email, private situations, AI analysis, reports, journals, no-contact data, or private match tracking.
- Send a message request from a public profile.
- Send a message request from a social post Reach out button and confirm the source post preview appears in `/requests`.
- Upload JPG, PNG, and WebP photos under 5MB.
- Confirm files over 5MB fail gracefully.
- Confirm posts require an image and section.
- Confirm no caption/comment UI exists.
- React Love on a post.
- Change reaction from Love to Red Flag.
- Confirm Community Verdict percentages update.
- Confirm Red Flag copy refers to the situation/post, not the person.
- Delete your own post.
- Confirm deleted posts no longer receive reactions.

## Rankings

- Open `/social/rankings`.
- Test All plus each section filter.
- Confirm Top Loved, Most Red-Flagged, Most Divisive, and Trending Today boards load.
- Confirm empty states are calm and non-toxic.
- Confirm ranked cards show image preview, section, counts, verdict bar, and rank position.

## Credits / Cost Protection

- Confirm new users have a `user_credits` row.
- Run AI advisor within free quota.
- Exhaust free AI quota or lower quota in test data.
- Confirm advisor can use credits when free quota is exhausted.
- Confirm insufficient credits blocks with a clear message.
- Run message analyzer as a free user with credits.
- Confirm failed AI/fallback paths do not spend credits.
- Confirm `credit_transactions` and `ai_usage_events` rows are created.

## Safety / Privacy

- Confirm social posts have no caption field.
- Confirm users cannot delete another user’s post.
- Confirm users cannot message-request themselves.
- Confirm duplicate pending message requests are blocked.
- Confirm blocked users cannot send another request.
- Confirm accepting a request opens/creates a match chat.
- Confirm declining a request does not create a match.
- Confirm unauthenticated users are redirected away from social pages.
- Confirm stack traces are not visible in API errors.
- Confirm private situations and matched-user tracking remain private.
