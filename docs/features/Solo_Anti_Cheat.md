# Solo anti-cheat (home practice)

Solo-home integrity for TypeSetGo. This does **not** cover Connect, Race, or classroom.

Deployment order: publish the matching Convex schema/functions before the frontend. The updated client requires the optional `completed` progress argument and `wordTarget` save argument; a frontend-only rollout against older validators can reject saves. Cloudflare publishing does not deploy Convex. See [backend-dependent release order](../development.md#releasing-backend-dependent-changes).

## Ranked vs valid

- `isValid` is the anti-cheat persist flag. Legacy rows with `isValid` unset still count (`isValid !== false`).
- Ranked leaderboard is stricter: `rankedEligible !== false` AND `isValid !== false` AND `accuracy >= 90` AND `wpm <= 300` AND (`duration >= 30000` OR `wordsCorrect >= 50`).
- New `saveResult` rows set `rankedEligible: false` and remain unverified history only: they do not rank or update streaks, achievements, or aggregate stats. Legacy rows omit the field and keep prior eligibility (no backfill).
- `finalizeSession` sets `rankedEligible: true`. 15s tests stay valid for history, PBs, and exempt achievements. They do **not** rank unless they also have 50 `wordsCorrect`.
- Hard WPM cap is **300**. 170–200 WPM is always valid. There is no auto-invalid at 150 or 220.
- Gross WPM: typed length / 5 / minutes. Today/week buckets are UTC.

## Ranked path

Use `api.typingSessions.startSession` / `recordProgress` / `finalizeSession`. Ordinary heartbeats are fire-and-forget; await `startSession` for the server prompt and await the completion heartbeat before finalization.

| Function | Notes |
|---|---|
| `startSession` | `ctx.auth` required. Every call creates an independent attempt; it never reuses or deletes another tab's session. Time/words: client `targetText` is ignored; server generates the prompt. Quote/preset: pass `targetText` (locked at start). Duration is at most 3,600 seconds, word target at most 9,999, and supplied text at most 10,000 characters. `startedAt` is set on first `recordProgress`. |
| `recordProgress` | `{ sessionId, typedLength, completed? }`. Send on the first two keystrokes; for timed tests over ten minutes, subsequent reports are batched to two seconds or 50 characters, with large input jumps reported immediately. At finish, await a report with the exact final length and `completed: true`, then finalize. It freezes the length and server-owned `completedAt`. Ordinary Time reports arriving after the server deadline return `{ success: false }`; the completion report still accepts a bounded in-flight tail. Identical completed retries return `{ success: true }` without changing timing; other post-completion reports return `{ success: false }`. Burst is time-scaled at 25 cps. |
| `finalizeSession` | Stats vs `session.targetText`. Ranked WPM from **server elapsed through completion**, never client elapsed or save/retry delay. Time-mode completion stops at `startedAt + duration` once that deadline has elapsed; early completion remains early and is validated. Other modes use the completion report's server timestamp. A different final length after completion is invalid. Completion/final jumps allow at most two seconds of 25 cps plus a 12-character floor, so waiting to save cannot authorize a large paste. Invalid tests skip streaks, achievements, stats-cache PB, and leaderboard. |
| `saveResult` | History only when no server-owned session exists. The server validates metric bounds, marks the row unverified, and does not count it toward progress. Guests must sign in. |

Old clients without `completed` remain supported: non-time duration ends at the last server heartbeat, and Time duration is capped at the server deadline. `clientElapsedMs` is accepted for compatibility but never trusted for ranked duration. Old clients should report the exact final length; unreported final jumps still receive the bounded allowance, not unlimited save latency. Finalization consumes/deletes the session after saving; completion reporting is idempotent, but successful finalization itself is not a repeatable write.

Words results store configured `wordTarget` separately from `wordCount` (gross five-character WPM units used by existing stats). Profile history labels the configured target when recorded; legacy target size is unknown rather than inferred from WPM units.

## Achievements

Generated difficulty and punctuation/numbers challenge/explorer achievements apply only to generated-text modes (Time, Words, and eligible historical Zen results). Quote/Preset results normalize punctuation, numbers, and capitalization to false; the evaluator also ignores generated settings on historical Quote/Preset rows and unsupported modes, including difficulty exploration. Ordinary mode exploration and otherwise eligible activity/speed achievements are unaffected. Zen/kid are not accepted by the ranked `startSession` endpoint.

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
