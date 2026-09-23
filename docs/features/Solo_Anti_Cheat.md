# Solo anti-cheat (home practice)

Solo-home integrity for TypeSetGo. This does **not** cover Connect, Race, or classroom.

Deployment note: this page describes the checked-in Convex source. Until those functions are deployed, the existing backend still counts valid unranked saves in statistics and eligible achievements, and admin sessions are not bound to a Clerk identity. The visible frontend uses the deployed API and avoids claiming those server-side changes are active.

## Ranked vs valid

- `isValid` is the anti-cheat persist flag. Legacy rows with `isValid` unset still count (`isValid !== false`).
- Ranked leaderboard is stricter: `rankedEligible !== false` AND `isValid !== false` AND `accuracy >= 90` AND `wpm <= 300` AND (`duration >= 30000` OR `wordsCorrect >= 50`).
- New `saveResult` rows set `rankedEligible: false` and remain unverified history only: they do not rank or update streaks, achievements, or aggregate stats. Legacy rows omit the field and keep prior eligibility (no backfill).
- `finalizeSession` sets `rankedEligible: true`. 15s tests stay valid for history, PBs, and exempt achievements. They do **not** rank unless they also have 50 `wordsCorrect`.
- Hard WPM cap is **300**. 170–200 WPM is always valid. There is no auto-invalid at 150 or 220.
- Gross WPM: typed length / 5 / minutes. Today/week buckets are UTC.

## Ranked path

Use `api.typingSessions.startSession` / `recordProgress` / `finalizeSession`. Heartbeats are fire-and-forget; `startSession` should be awaited when you need the server prompt.

| Function | Notes |
|---|---|
| `startSession` | `ctx.auth` required. Time/words: client `targetText` is ignored; server generates the prompt. Quote/preset: pass `targetText` (locked at start). Duration is at most 3,600 seconds, word target at most 9,999, and supplied text at most 10,000 characters. `startedAt` is set on first `recordProgress`. |
| `recordProgress` | `{ sessionId, typedLength }`. Send on the first two keystrokes; for timed tests over ten minutes, subsequent reports are batched to two seconds or 50 characters, with large input jumps reported immediately. Finalization sends the exact typed length. Burst is time-scaled at 25 cps. |
| `finalizeSession` | Stats vs `session.targetText`. Ranked WPM from **server elapsed**. Invalidates if `typedText.length` jumps past last heartbeat beyond 25 cps + a small floor. Invalid tests skip streaks, achievements, stats-cache PB, and leaderboard. |
| `saveResult` | History only when no server-owned session exists. The server validates metric bounds, marks the row unverified, and does not count it toward progress. Guests must sign in. |

## Achievements

Invalid tests award nothing. `qualifiesForAchievement` (90% + 30s or 50 wordsCorrect) applies to **non-exempt** IDs only. Exempt first-test, explorer, quirky, night-owl, endurance, and time-based badges can still award on a valid short or messy test.

## Auth

Convex `convex/auth.config.ts` expects dashboard env `CLERK_JWT_ISSUER_DOMAIN`. Frontend must wrap with `ConvexProviderWithClerk` (`convex/react-clerk` + Clerk `useAuth`). Solo writes use `ctx.auth`, not client `clerkId`.

## Admin

`api.admin.login` (action) requires a signed-in Clerk identity and checks Convex env `ADMIN_PASSWORD` (timing-safe, never `VITE_`). Login attempts are throttled per signed-in identity. Review sessions remain bound to that identity; admin sign-out revokes the server session. `listReview` returns invalid rows and WPM ≥ 250. `setValidity` patches one row and starts a paged rebuild of **that user's** stats cache.

Set `ADMIN_PASSWORD` in the Convex dashboard only. Do not put the real password in git.

## Session lifetime and activity policy

Prepared sessions expire after 24 hours; the client recreates old prepared sessions before the first input. Active timed sessions are retained through their deadline and then expire after ten minutes without progress. Other active sessions expire after ten minutes without progress. Cleanup runs in bounded batches.

UTC dates define activity streaks and daily totals. Browser-local calendar facts are stored separately for local-time badges; old results without those facts do not assume a timezone. All achievement entry points share a bounded evaluator and scheduled rebuild path; see [development contracts](../development.md).

After deployment, historical client-only saves already counted in progress can be reconciled with the explicit, resumable `internal.migrations.backfillAllCaches` maintenance action. It rebuilds stats, achievements, and streaks from stored results. Run it only as an authorized live maintenance operation and follow its returned cursor and failed-user IDs.
