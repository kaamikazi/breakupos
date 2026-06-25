# Manual QA Script

Use this script before inviting private beta users. Test with two normal users and one admin user. Run the test against the deployed beta environment, not only localhost.

## Auth Entry Smoke Test

1. Open the deployed beta URL while logged out.
2. Click Start free beta.
3. Confirm `/login` opens.
4. Confirm the page shows the BreakupOS brand, "Welcome to Breakup OS", Privacy and Safety links, and a large Continue with Google button.
5. Click Continue with Google.
6. Confirm the button shows a redirecting/loading state and cannot be double-clicked repeatedly.
7. Complete Google sign-in.
8. If beta gate is disabled, confirm the user lands in the app.
9. If beta gate is enabled, confirm `/beta-access` opens after Google sign-in and the correct password approves the account permanently.
10. Open `/social` while logged out in a fresh browser profile.
11. Confirm it redirects to `/login?next=/social`.
12. Complete Google login and confirm the app returns to `/social` if beta and profile gates allow it.
13. Open `/discover` while logged out.
14. Confirm login preserves the destination, then sends users without completed dating profiles to onboarding.
15. Confirm social/public profile surfaces do not show the user's email address.

## Test Data Rules

- Use test emails only.
- Use nicknames, not real names.
- Do not upload sensitive, explicit, or identifying photos.
- Do not enter real crisis, legal, medical, financial, or highly private relationship details.
- Record bugs with the page URL, account used, steps, expected result, actual result, screenshot, and browser/device.

## Accounts

| Role | Suggested Email | Purpose |
| --- | --- | --- |
| Account A | beta-a@example.com | Main dating user |
| Account B | beta-b@example.com | Matching, reporting, blocking |
| Admin | admin@example.com | Moderation review |

Make sure the admin email is included in `ADMIN_EMAILS`.

## Account A Script

1. Open the deployed beta URL.
2. If beta access is enabled, enter the beta access code.
3. Sign up as Account A.
4. Confirm the auth redirect returns to the app.
5. Navigate to Discover.
6. Confirm incomplete dating users are redirected to `/dating/onboarding`.
7. Complete dating onboarding:
   - Enter display name or nickname.
   - Enter age.
   - Add bio.
   - Select gender.
   - Select interested in.
   - Select relationship goal.
   - Add interests.
   - Add city.
   - Upload one safe profile photo.
   - Review privacy and safety expectations.
8. Confirm the dating profile becomes complete.
9. Open Dating Profile and verify:
   - Photo appears.
   - Quality score appears.
   - Visibility can be set.
   - Safety Center link works.
10. Enter Discovery.
11. Confirm Account A does not see their own profile.
12. Like Account B.
13. Confirm no match appears yet if Account B has not liked Account A.
14. After Account B likes Account A, open Matches.
15. Open the match chat.
16. Send a normal test message.
17. Confirm the message appears in the thread.
18. Use the AI reply helper:
   - Try one tone.
   - Confirm Pro gate appears if Account A is Free.
   - If Account A is Pro and `ANTHROPIC_API_KEY` is configured, confirm a safe suggestion appears.
   - If no AI key is configured, confirm fallback copy is clear.
19. Convert the match to a Breakup OS situation.
20. Confirm redirect to the new situation detail page.
21. Confirm duplicate conversion does not create a second situation.
22. Open Privacy.
23. Export data as JSON.
24. Export data as CSV.
25. Confirm exports include dating profile, photos metadata, matches, messages, reports, blocks, notifications, situations, interactions, relationship reports, and weekly summaries where present.
26. Create one social post from the test account.
27. React to one post.
28. Send or receive one message request.
29. Send one chat message.
30. Create one manual Breakup OS situation.
31. In Privacy, open Delete account.
32. Confirm the final delete button stays disabled until the exact text `DELETE` is typed.
33. Type `DELETE`.
34. Confirm deletion.
35. Confirm the user is redirected/signed out.
36. Sign in again with the same provider.
37. Confirm old situations, dating profile, message requests, chats, and social posts are not restored.
38. Confirm the social feed no longer shows the deleted user's posts.
39. Confirm no vague "Could not delete all account data" or stack trace appears.
40. Use Delete All only on a separate test account if you need to test data deletion without auth-user deletion.

## Account B Script

1. Open the deployed beta URL in another browser profile or incognito window.
2. If beta access is enabled, enter the beta access code.
3. Sign up as Account B.
4. Complete dating onboarding with safe test data.
5. Upload one safe profile photo.
6. Enter Discovery.
7. Like Account A.
8. Confirm a match is created only once.
9. Open Notifications.
10. Confirm new match notification appears.
11. Open Matches.
12. Open chat with Account A.
13. Confirm Account A's message is visible.
14. Send a reply.
15. Confirm Account A can see it without a full refresh if Realtime is enabled, or after polling/refresh fallback.
16. Report Account A:
   - Choose a category.
   - Add brief test details.
   - Submit.
   - Confirm success state.
17. Block Account A.
18. Confirm chat history remains visible.
19. Confirm message input is disabled after block.
20. Confirm Account A is hidden from Discovery.
21. Confirm old match behavior matches current product policy.

## Admin Script

1. Sign in as the admin account listed in `ADMIN_EMAILS`.
2. Open `/admin/reports`.
3. Confirm non-admin accounts cannot access this route.
4. Confirm latest reports appear first.
5. Filter by status.
6. Filter by category.
7. Open the Account B report against Account A.
8. Update report status.
9. Add an internal moderation note.
10. Save changes.
11. Confirm Account B receives an in-app report update notification if implemented for the action.
12. Confirm reported user visibility:
    - Reported user details are visible enough for review.
    - Private message contents are not overexposed beyond what the moderation flow needs.
13. Use quick block behavior if safe:
    - Confirm the reported user is blocked from the reporter.
    - Confirm no duplicate block record is created.
    - Confirm discovery/chat behavior respects the block.

## Core Breakup OS Regression Script

1. Create a situation from the dashboard.
2. Add an interaction.
3. Change stage.
4. Use Advisor.
5. Use Message Analyzer.
6. Enable Recovery/no-contact mode.
7. Generate a relationship report if Pro.
8. Generate weekly summary if Pro.
9. Open Analytics.
10. Export data.
11. Delete data on a test-only account.

## Mobile QA Checks

Test at minimum:

- iPhone-sized viewport around 390px wide.
- Android-sized viewport around 412px wide.
- Tablet viewport around 768px wide.

Check these pages:

- Landing
- Auth
- Dating onboarding
- Dating profile
- Discover
- Matches
- Chat
- Notifications
- Safety Center
- Dashboard
- Situation detail
- Analytics
- Privacy
- Admin reports

Mobile acceptance checks:

- No horizontal overflow.
- Primary buttons remain visible and tappable.
- Cards do not crop important text.
- Forms have readable labels and useful errors.
- Chat input is usable at the bottom of the viewport.
- Discovery card actions are reachable without awkward scrolling.
- Navigation can scroll horizontally without hiding critical actions.
- Modals and dialogs fit the screen.

## Pass Criteria

- Lint, typecheck, tests, and build pass.
- Account A and Account B can complete onboarding.
- A mutual match is created once.
- Chat is participant-only.
- Block disables new sending.
- Reports appear in admin.
- Export/delete cover dating and Breakup OS data.
- No private message content appears in server logs.
- Known limitations are documented before beta invites go out.
