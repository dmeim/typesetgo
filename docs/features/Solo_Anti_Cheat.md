# Solo anti-cheat (home practice)

Solo-home integrity for TypeSetGo. This does **not** cover Connect, Race, or classroom.

## Ranked vs valid

- `isValid` is the anti-cheat persist flag. Legacy rows with `isValid` unset still count (`isValid !== false`).
- Ranked leaderboard is stricter: `rankedEligible !== false` AND `isValid !== false` AND `accuracy >= 90` AND `wpm <= 300` AND (`duration >= 30000` OR `wordsCorrect >= 50`).
- New `saveResult` rows set `rankedEligible: false` and never rank. Legacy rows omit the field and keep prior eligibility (no backfill).
- `finalizeSession` sets `rankedEligible: true`. 15s tests stay valid for history, PBs, and exempt achievements. They do **not** rank unless they also have 50 `wordsCorrect`.
- Hard WPM cap is **300**. 170–200 WPM is always valid. There is no auto-invalid at 150 or 220.
- Gross WPM: typed length / 5 / minutes. Today/week buckets are UTC.

## Ranked path

Use `api.typingSessions.startSession` / `recordProgress` / `finalizeSession`. Heartbeats are fire-and-forget; `startSession` should be awaited when you need the server prompt.

| Function | Notes |
|---|---|
| `startSession` | `ctx.auth` required. Time/words/zen: client `targetText` is ignored; server always generates the prompt. Quote/preset: pass `targetText` (locked at start). `startedAt` is set on first `recordProgress`. |
| `recordProgress` | `{ sessionId, typedLength }`. Send on first keystroke (do not skip time mode). Burst is time-scaled at 25 cps. |
| `finalizeSession` | Stats vs `session.targetText`. Ranked WPM from **server elapsed**. Invalidates if `typedText.length` jumps past last heartbeat beyond 25 cps + a small floor. Invalid tests skip streaks, achievements, stats-cache PB, and leaderboard. |
| `saveResult` | History/PBs/exempt only. Sets `rankedEligible: false` so live `getLeaderboard` skips it. Over 300 WPM persists `isValid: false` (not clamped). Guests must sign in. |

## Achievements

Invalid tests award nothing. `qualifiesForAchievement` (90% + 30s or 50 wordsCorrect) applies to **non-exempt** IDs only. Exempt first-test, explorer, quirky, night-owl, endurance, and time-based badges can still award on a valid short or messy test.

## Auth

Convex `convex/auth.config.ts` expects dashboard env `CLERK_JWT_ISSUER_DOMAIN`. Frontend must wrap with `ConvexProviderWithClerk` (`convex/react-clerk` + Clerk `useAuth`). Solo writes use `ctx.auth`, not client `clerkId`.

## Admin

`api.admin.login` (action) checks Convex env `ADMIN_PASSWORD` (timing-safe, never `VITE_`). `listReview` returns invalid rows and WPM ≥ 250. `setValidity` patches one row and rebuilds **that user's** stats and leaderboard caches.

Set `ADMIN_PASSWORD` in the Convex dashboard only. Do not put the real password in git.

## Session lifetime and activity policy

Prepared sessions expire after 24 hours; the client recreates old prepared sessions before the first input. Active sessions expire after ten minutes without progress, using `lastEventAt`, so supported long tests remain valid while active. Cleanup runs in bounded batches.

UTC dates define activity streaks and daily totals. Browser-local calendar facts are stored separately for local-time badges; old results without those facts do not assume a timezone. All achievement entry points share a bounded evaluator and scheduled rebuild path; see [development contracts](../development.md).
