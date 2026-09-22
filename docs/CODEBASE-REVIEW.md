# TypeSetGo codebase review

Reviewed September 22, 2026 against `eca47f4`. The owner subsequently approved implementation of this list. Original findings and evidence below describe that reviewed snapshot; each **Resolution** records the local remediation on `codex/codebase-remediation`. No backend deployment, data migration, or push was performed.

The largest simplification opportunity is to give each operation one authoritative path: account identity, typing-attempt transitions, result saving, achievement evaluation, preferences, and leaderboard computation. Several current problems come from multiple implementations of the same rule. Other complexity protects real behavior and should stay.

## How to use this report

- **P1 — Address first:** unauthorized writes, exposed account data, incorrect awards, or interference with saving results.
- **P2 — Address next:** lifecycle defects, inconsistent behavior, and substantial maintenance or scaling problems.
- **P3 — Cleanup or measure:** useful reductions in scope and complexity, without a demonstrated urgent failure.
- **Confirmed defect** means the behavior follows from the inspected implementation; sections say explicitly when an isolated reproduction was also executed. **Cleanup opportunity** and **measurement candidate** are not claims of a production incident.

Each numbered section retains the original possible actions for context. The resolution records the chosen implementation; alternative actions are not an additional unchecked backlog. UTC activity policy was retained, unreachable solo features were removed, and active Connect plans were preserved.

## Original review coverage and baseline

The review covered the frontend routes, shared shell/auth/notifications/UI, solo typing and preferences, themes/sounds/fonts, Connect and Race, profiles/achievements/admin, all non-generated Convex modules and helpers, schema and scheduled maintenance, Worker/build configuration, scripts, test harnesses, and current/historical documentation. Source inventory included 154 frontend TypeScript modules and 34 non-generated backend TypeScript modules. Assets were inspected through their loaders, manifests, catalog tests, and data checks; this was not a manual review of every palette, quote, or binary file.

The review combined source tracing, an import-reachability inventory, existing checks, and isolated backend/storage probes. No live database, deployment, remote configuration, or production load was inspected. No dependency advisory scan or legal compliance assessment was performed.

| Check | Result |
| --- | --- |
| `VITE_CONVEX_URL=https://fixture.invalid VITE_CLERK_PUBLISHABLE_KEY= bun run build` | Passed. Vite warned about a 554.67 kB minified initial JavaScript chunk; this alone does not establish a user-visible performance problem. |
| `bun run test:run` | Passed: 36 files, 321 tests. |
| `node node_modules/@typescript/native/bin/tsc --project convex/tsconfig.json --noEmit` | Passed. The app build also includes backend modules transitively through generated API types. |
| `bun run lint` | Failed on pre-existing, untracked duplicate Worker files: one error and two warnings. See issue 34. |
| `bun run test:e2e` | Practice, fonts, profiles, and Connect passed (Connect: 8 tests). Connect session failed at Vite fixture startup and failed identically on a targeted rerun; a diagnostic captured HTTP 504 “Outdated Optimize Dep” responses. The runner stops there, so Race was run separately and passed all 12 tests. See issue 35. |
| Static content checks | All five practice word lists contained strings without empty entries, whitespace-containing entries, or exact duplicates; all four quote files had nonempty quote text. Existing theme/font tests also passed. |
| Isolated probes | Confirmed anonymous account mutation, public identity exposure, optional host check, inconsistent achievement refresh, unreachable weekend award, and incomplete notification decoding. These used local fixtures, not live services. |

Pre-existing changes were left alone: `convex/_generated/api.d.ts`, `CF_ToDo.md`, `CLEANUP.md`, and several untracked files with ` 2` in their names. Build/test runs produced their normal ignored or temporary artifacts. Older audit documents were treated as leads and checked against current code rather than copied as current findings.

## 01. Authenticate account writes

**Resolution:** Implemented. Shared identity helpers authenticate account writes and private reads. Registered tests reject anonymous/wrong-account calls and accept the owner.

**P1 · Confirmed defect, locally reproduced.** Several account mutations locate the target user using a caller-supplied `clerkId` without verifying the authenticated caller. This affects profile creation/update, preferences, result deletion, and achievement refresh. Comparing a selected result with a selected user's ID does not establish who made the request. An anonymous in-memory handler call successfully changed another user's profile.

**Evidence:** [users.ts](../convex/users.ts), `getOrCreateUser` at line 6 and `updateProfile` at line 88; [preferences.ts](../convex/preferences.ts), `savePreferences` at line 71; [testResults.ts](../convex/testResults.ts), `deleteResult` at line 131; [identity.ts](../convex/lib/identity.ts), existing authentication helpers.

**Possible actions:**

- Derive the account from the authenticated subject and reuse the existing authorization helper where applicable.
- Apply one ownership rule to every account-owned mutation, including refresh and deletion.
- Test anonymous, wrong-account, and correct-account calls against the actual handlers.

## 02. Return only public profile fields

**Resolution:** Implemented. Public profiles return only display fields and public record identity; tests reject email/Clerk ID exposure.

**P1 · Confirmed defect, locally reproduced.** Public user queries return entire user documents, including email and Clerk ID. The profile UI does not need all of those fields. Besides unnecessary disclosure, this supplies identifiers accepted by the unchecked writes in issue 01. The current identity tests even preserve Clerk ID exposure as expected behavior.

**Evidence:** [users.ts](../convex/users.ts), `getUser` at line 63 and `getUserById` at line 78; [leaderboard-identity.test.ts](../tests/unit/leaderboard-identity.test.ts); [UserStats.tsx](../src/pages/UserStats.tsx).

**Possible actions:**

- Define a small public profile response containing only fields needed for public display and links.
- Keep private account reads authenticated and separate from public profile reads.
- Update tests to assert that public responses exclude email and authentication identifiers.

## 03. Enforce multiplayer permissions

**Resolution:** Implemented. All multiplayer writes require the private browser capability; hashes stay out of public responses. Contract tests cover omissions, forgeries, another member, host identity squatting, and invalid completion.

**P1 · Confirmed defect, locally reproduced in the host helper.** `checkRoomHost` allows callers to omit `hostSessionId`. Other state-changing endpoints operate on supplied room or participant IDs without ownership checks. Public queries expose the session/record IDs used by these operations, so making the current argument mandatory would still be insufficient.

**Evidence:** [multiplayer.ts](../convex/lib/multiplayer.ts), `checkRoomHost` at line 10; [rooms.ts](../convex/rooms.ts), room deletion and race controls; [participants.ts](../convex/participants.ts), name, kick, disconnect, and progress mutations.

**Possible actions:**

- Define one host/participant permission contract, including how anonymous guests prove ownership.
- If anonymous play remains, use private server-issued credentials or an equivalent authenticated ownership mechanism; do not return credentials in public room data.
- Apply checks to all state-changing endpoints and test missing, forged, and wrong-owner credentials.

## 04. Keep deferred saves attached to their original attempt

**Resolution:** Implemented. Deferred saves carry the original attempt and completion time; starting another attempt discards the intent. Regressions cover Next/Repeat before sign-in and late saves after a new attempt.

**P1 · Confirmed lifecycle defect from source tracing.** Anonymous Save Results stores a snapshot in `pendingResultRef`, but reset and prompt changes do not clear or version that intent. After a later sign-in, the old snapshot enters `saveResults`, which reads the current attempt's session and updates the current saved/finalized flags. Finishing guest attempt A, requesting sign-in, starting B, and signing in later can make A's save interfere with B. The existing test signs in without changing attempts.

**Evidence:** [TypingPractice.tsx](../src/components/typing/TypingPractice.tsx), `resetSession` at line 729, pending save at line 865, current-session capture at line 887, completion flags at line 968, and sign-in effect at line 991; [practice-engine.test.tsx](../tests/unit/practice-engine.test.tsx).

**Possible actions:**

- Store the attempt ID and completion snapshot together with deferred-save status.
- Decide whether starting another attempt discards the pending save or preserves it independently; avoid building a queue unless the product needs one.
- Prevent a previous attempt's save from changing the current attempt and test the A → B → sign-in sequence.

## 05. Keep active typing sessions alive

**Resolution:** Implemented. Prepared sessions have a 24-hour lifetime and are renewed before typing when stale. Active expiry uses recent progress; controlled-time tests cover idle and long-running sessions.

**P2 · Confirmed lifecycle defect.** Cleanup deletes sessions ten minutes after creation regardless of recent progress. Sessions can be prepared before the user starts typing, and the controls allow timed tests up to 6:59:59. An active long test, or a short test started after an idle period, can therefore lose the server session needed for finalization. `lastEventAt` exists but is not used by cleanup. Zen does not create a ranked session and is not affected by this particular defect.

**Evidence:** [sessionCleanup.ts](../convex/sessionCleanup.ts), `cleanupExpiredSessions` at line 11; [antiCheatConstants.ts](../convex/lib/antiCheatConstants.ts), `SESSION_TTL_MS`; [practice-limits.ts](../src/lib/practice-limits.ts), line 4; [typingSessions.ts](../convex/typingSessions.ts).

**Possible actions:**

- Make expiry compatible with the supported duration and actual activity, with a separate rule for abandoned prepared sessions.
- Recreate an expired prepared session before typing starts.
- Test active long sessions and idle-before-start sessions using controlled time.

## 06. Use the same achievement rules on save and refresh

**Resolution:** Implemented. One evaluator serves saves and rebuilds after refresh, deletion, and admin invalidation. Registered tests compare resulting awards, including revoked eligibility.

**P1 · Confirmed defect, locally reproduced.** Save-time awards use the qualification/ranked gate, while `recheckAllAchievements` independently rebuilds awards from results whose `isValid` is not false. Refresh ignores important eligibility rules. One isolated unranked, ten-second result at 180 WPM granted 39 speed-achievement tiers through refresh. The duplicated evaluators disagree despite comments claiming consistency.

**Evidence:** [achievements.ts](../convex/achievements.ts), save-time selection around line 405 and refresh evaluation around lines 1080 and 1174; [achievementGate.ts](../convex/lib/achievementGate.ts); [achievement-gate.test.ts](../tests/unit/achievement-gate.test.ts).

**Possible actions:**

- Use one award evaluator for save, refresh, deletion, and administrative invalidation.
- State eligibility separately for activity totals, competitive awards, and exempt achievements.
- Add handler tests proving that the same saved history yields the same awards through every entry point, including the intended policy for revoking awards.

## 07. Replace achievement placeholders with real facts

**Resolution:** Implemented. Bounded progress stores actual streak, calendar, variance, and improvement facts; category/collection awards use unique earned IDs. Legacy rows without local calendar facts cannot substantiate local-time badges.

**P2 · Confirmed defects; weekend case locally reproduced.** Some requirements cannot be earned from an initially empty achievement set. Weekend test count reaches the required total only if the badge is already owned; weekday/weekend coverage similarly uses existing completion badges to fill missing history. Other checks substitute the current test for an entire streak or cap the inspected history below advertised thresholds. These are product rules that appear implemented but are not computed faithfully.

**Evidence:** [achievements.ts](../convex/achievements.ts), weekend count around line 498 and streak/day coverage at lines 613–635; [achievementThresholds.ts](../convex/achievementThresholds.ts), variance thresholds; [achievement-definitions.ts](../src/lib/achievement-definitions.ts), displayed requirements.

**Possible actions:**

- List the persisted facts needed for each advertised badge and identify which are absent.
- Implement those facts through the shared evaluator, or simplify/remove unsupported badges deliberately.
- Test each affected badge from unearned to earned using its minimum qualifying sequence.

## 08. Choose one calendar policy

**Resolution:** Implemented. UTC remains the policy for activity dates, streaks, and daily totals. Browser-local date/hour/weekday/month fields are internally consistent and persisted separately for calendar badges; no historical timezone is invented.

**P2 · Confirmed inconsistency requiring a product decision.** `getLocalCalendarFields` uses a UTC date string together with local hour, weekday, month, and day. A New York evening after UTC midnight describes two different days in one payload. Streaks and daily achievement calculations also use differing boundaries. Changing only the frontend date would leave the disagreement in place.

**Evidence:** [TypingPractice.tsx](../src/components/typing/TypingPractice.tsx), `getLocalCalendarFields` at line 144; [streaks.ts](../convex/streaks.ts), date storage/comparison and current-day reads; [achievements.ts](../convex/achievements.ts), daily/calendar calculations; [utc.ts](../convex/lib/utc.ts).

**Possible actions:**

- Decide whether streaks and daily goals follow UTC or a user's calendar; document any intentional difference from global leaderboards.
- Persist the time facts needed to reproduce that decision and centralize conversion.
- Test both sides of midnight and daylight-saving transitions.

## 09. Expire abandoned multiplayer memberships

**Resolution:** Implemented. Heartbeats renew room retention; scheduled expiry disconnects stale participants, transfers Race hosts, and completes races with vanished racers. Tests cover these paths. Cleanup runs every 30 seconds after the 75-second inactivity threshold.

**P2 · Confirmed lifecycle defect.** Membership departure depends on explicit Leave actions. Closing a tab, losing the browser, or disappearing from the network leaves `isConnected` stale. `lastSeen` and room `expiresAt` are recorded but not used to expire membership or rooms. Ghost racers can block readiness and keep small races unfinished; host transfer also relies on explicit disconnect.

**Evidence:** [useRaceDeparture.ts](../src/components/race/useRaceDeparture.ts), line 15; [Join.tsx](../src/pages/Join.tsx), `handleLeave` at line 118; [RaceLobby.tsx](../src/pages/RaceLobby.tsx), readiness at line 54; [RaceActive.tsx](../src/pages/RaceActive.tsx), finish rule at line 158; [crons.ts](../convex/crons.ts).

**Possible actions:**

- Define a reconnect grace period and server-observed presence expiry.
- Apply existing disconnect and host-transfer behavior when presence expires; do not rely on browser unload callbacks alone.
- Implement room retention and expired-join behavior using the existing expiry field or remove it if a different policy is chosen.
- Test host disappearance and a two-person race whose second participant vanishes.

## 10. Resume the host room after refresh

**Resolution:** Implemented. `/connect/host/:roomId` restores the owned room and settings after refresh. New room and End room are explicit actions; browser acceptance covers refresh without duplicate creation.

**P2 · Confirmed lifecycle gap.** The Connect Host page creates a room when it mounts and keeps its code in hook state. Its URL identifies the host name, not the room. Refresh creates a new room while participants remain in the previous one, and the host editor starts from local defaults rather than the existing room.

**Evidence:** [Host.tsx](../src/pages/Host.tsx), creation and initial state at lines 97–112; [HostCard.tsx](../src/components/connect/HostCard.tsx), navigation at line 28; [rooms.ts](../convex/rooms.ts), `create`.

**Possible actions:**

- Put the room identity in a resumable route and load it on refresh using the ownership rules from issue 03.
- Initialize the editor from persisted room settings.
- Make New room and End room explicit actions; test refresh and back/forward navigation with connected participants.

## 11. Retry failed Connect progress

**Resolution:** Implemented. Connect acknowledges successful deliveries, retains the latest failed snapshot for Retry, and invalidates old-run deliveries. Tests cover final-write failure, newer snapshots, and reset-before-retry.

**P2 · Confirmed defect.** Join marks a snapshot as sent and clears the pending value before the mutation succeeds. A rejected final update can lose the finished state because subsequent identical reports are deduplicated, while the UI offers only Dismiss/Leave. Race already acknowledges successful snapshots and retains failures for retry.

**Evidence:** [Join.tsx](../src/pages/Join.tsx), send sequence at lines 91–104 and feedback at lines 202–218; [useRaceProgress.ts](../src/components/race/useRaceProgress.ts), lines 63–72; [connect-session.test.tsx](../tests/unit/connect-session.test.tsx).

**Possible actions:**

- Advance the acknowledged signature after success and retain the latest failed snapshot.
- Offer a bounded explicit retry, especially after completion.
- Share only the small delivery mechanism if useful, preserving Connect run/reset identity and Race finish semantics.
- Test rejected final writes, a newer snapshot arriving during failure, and reset before retry.

## 12. Preserve zero accuracy and clarify typing metrics

**Resolution:** Implemented. Nonempty all-wrong input reports 0% accuracy. Shared pure helpers define gross and correct-character speed; TypingArea naming is corrected while ranked server scoring and strict Race progress remain intact.

**P2 · Confirmed defect plus duplicated semantics.** The shared practice callback sends `accuracy || 100`, converting a legitimate 0% result into 100% for Connect. The separate `TypingArea` implementation already distinguishes empty input from zero accuracy. The two engines also compute metrics separately, and `TypingArea` names total-character speed `wpm` while assigning correct-character speed to `rawWpm`. The latter is currently misleading internal terminology, not a demonstrated display bug.

**Evidence:** [TypingPractice.tsx](../src/components/typing/TypingPractice.tsx), callback at line 1224; [TypingArea.tsx](../src/components/typing/TypingArea.tsx), metric calculations at lines 171–182; [computeStats.ts](../convex/lib/computeStats.ts).

**Possible actions:**

- Pass the already-computed accuracy without a truthiness fallback and test all-wrong input.
- Define raw/correct/net speed and units once in a small pure contract used where the semantics match.
- Preserve the intentional difference between strict race progress and forgiving practice completion.

## 13. Load Host themes on demand and report failures

**Resolution:** Implemented. Host browses catalog metadata and loads only the selected palette. Explicit error/retry states and browser request-count checks cover the path.

**P2 · Confirmed recovery defect and unnecessary loading.** Host's theme dialog waits for every full palette across more than 1,500 theme files. The legacy `fetchAllThemes` wrapper discards failure metadata and returns partial/empty success. Host's catch-based Retry UI therefore does not handle ordinary failed requests, and reopening the dialog does not retry once it has an array. The solo picker already uses a compact browsing catalog.

**Evidence:** [Host.tsx](../src/pages/Host.tsx), loader at line 159 and picker at line 828; [themes.ts](../src/lib/themes.ts), `fetchThemeCatalogIndex`, `fetchThemeCatalog`, and `fetchAllThemes`; [connect-ui.spec.ts](../tests/e2e/connect-ui.spec.ts), successful picker coverage.

**Possible actions:**

- Populate choices from `fetchThemeCatalogIndex` and load only a previewed/selected palette.
- Keep an explicit loading/failure result instead of treating an empty successful value as recovery.
- Test manifest failure, selected-palette failure, retry, and the number of palette requests on opening.

## 14. Initialize multiplayer identity outside the storage snapshot

**Resolution:** Implemented. Stable multiplayer identity initializes outside storage snapshots; denied reads/writes fall back to memory. Tests exercise the actual identity module. Persistence across reload requires working browser storage.

**P2 · Confirmed conditional defect.** `useSessionId` reads and writes localStorage inside its external-store snapshot getter. A denied read or failed write throws during render, preventing Connect/Race entry. Most multiplayer tests replace this hook, so they do not exercise this boundary. The no-op subscription also makes the external-store abstraction unnecessary for its current fixed-identity role.

**Evidence:** [useSessionId.ts](../src/hooks/useSessionId.ts), lines 6–21; [connect-attempts.test.tsx](../tests/unit/connect-attempts.test.tsx); [race-ui.test.tsx](../tests/unit/race-ui.test.tsx).

**Possible actions:**

- Initialize one stable identity and attempt persistence without making storage availability a prerequisite.
- Keep reads used during render free of writes; use a simpler lifetime model if the identity never changes.
- Test throwing reads/writes and identity stability across rerenders.
- Decide whether tabs intentionally share identity before altering reconnect behavior.

## 15. Separate notification history by account

**Resolution:** Implemented. Notification storage is partitioned by Clerk account or guest. Switching identity changes history without remounting practice; stale callbacks cannot write into another account. Unattributable legacy history is not imported.

**P2 · Confirmed behavior needing a product decision.** Notification history uses one browser-wide key and a provider mounted outside authentication. Signing out and signing into another account leaves the previous account's achievement notifications available. Opening one then queries achievements for the new account. This is documented behavior, but it creates confusing and potentially unwanted cross-account history on shared devices.

**Evidence:** [main.tsx](../src/main.tsx), provider order at line 33; [notification-state.ts](../src/lib/notification-state.ts), storage key at line 52; [NotificationProvider.tsx](../src/context/NotificationProvider.tsx), initialization at line 11; [NotificationCenter.tsx](../src/components/layout/NotificationCenter.tsx), achievement query at line 48.

**Possible actions:**

- Decide whether notifications belong to a browser or an account and make the UI match that choice.
- For account history, scope persistence and in-memory state by user, with a clear guest policy.
- Test account A → sign-out → account B without requiring device synchronization or a new backend inbox.

## 16. Simplify notification storage and validate what is rendered

**Resolution:** Implemented. Stored notification fields and metadata are decoded before use; actual reads/writes are individually guarded without storage probes. Tests cover malformed metadata, quota failures, denied reads, and owner changes.

**P3 · Confirmed boundary defect, locally reproduced.** Storage availability is tested with an extra write/delete before each real operation, yet the restored-record predicate accepts any string type and does not validate description, read state, or metadata. It also does not cap restored history. A local probe restored 55 records, including an object description and missing `read`, despite the declared 50-item typed contract. Rendering such a description as a React child can fail.

**Evidence:** [notification-state.ts](../src/lib/notification-state.ts), preflight at line 55 and decoder at line 79; [NotificationCenter.tsx](../src/components/layout/NotificationCenter.tsx), notification rendering; [foundations-notifications-store.test.tsx](../tests/unit/foundations-notifications-store.test.tsx).

**Possible actions:**

- Attempt the actual storage operation once under a narrow catch, removing redundant availability writes.
- Decode only the fields the UI supports, normalize/reject invalid records, and cap the returned array.
- Test malformed persisted content and unavailable storage; avoid introducing a general storage framework.

## 17. Correct the privacy page's data description

**Resolution:** Implemented. Privacy copy describes account/server data, public profiles, local history, and deletion limits. It links the public project issue tracker instead of an unspecified contact channel; no private-data deletion workflow is claimed.

**P2 · Confirmed product-content mismatch.** The page says typing statistics remain on the device and implies clearing localStorage deletes user data. Signed-in identity, results, achievements, and statistics persist in Convex. Multiplayer data is called temporary despite issue 09, and contact language does not provide a concrete destination. These are discrepancies with implementation, not a legal compliance determination.

**Evidence:** [Privacy.tsx](../src/pages/Privacy.tsx), storage text at lines 95–100 and deletion text at lines 141–145; [TermsOfService.tsx](../src/pages/TermsOfService.tsx), contact text; [schema.ts](../convex/schema.ts); [users.ts](../convex/users.ts).

**Possible actions:**

- Describe guest/local preferences separately from account data and public profile/leaderboard visibility.
- Explain actual deletion controls and retention after the room-lifecycle decision.
- Supply a real contact destination and verify analytics wording against deployed behavior before publishing revised claims.

## 18. Give typing attempts one lifecycle

**Resolution:** Implemented. Attempt identity owns deferred saves and stale-result protection; duplicate runtime/view reset work is consolidated and unreachable plan branches removed. Shared account readiness owns initialization. Connect attempts explicitly survive Clerk changes.

**P2 · Cleanup opportunity linked to issue 04.** `TypingPractice` resets overlapping groups of refs/state in committed epoch cleanup, explicit reset, and prompt replacement. The lists differ, making ownership omissions difficult to see. It also contains demonstrably unreachable recovery: both the `sessionId` and `!sessionId` branches return before the “Session was not established” branch. The issue is scattered transitions, not merely the component's size.

**Evidence:** [TypingPractice.tsx](../src/components/typing/TypingPractice.tsx), epoch cleanup around line 402, reset at line 729, unreachable fallback at line 980, repeated finished check around line 1071, and prompt replacement around line 1424.

**Possible actions:**

- Remove impossible branches and name the supported attempt transitions.
- Move attempt state changes into one reducer/transition function and isolate server-session persistence where it improves ownership.
- Keep necessary stale-request epochs and prompt identity checks; preserve delayed-response, repeat, IME, and account-switch tests.
- Avoid replacing the component with a general state-machine framework solely to reduce line count.

## 19. Put preferences behind typed adapters

**Resolution:** Implemented. A dedicated preference hook and typed adapters own hydration/edit precedence/persistence. Tests preserve active attempts, queued defaults, user edits, account readiness and account switching.

**P2 · Cleanup opportunity.** Preference fields are manually repeated in local storage, remote snapshots, hydration, and callback dependencies. Remote saving rebuilds an object through `JSON.parse`, and hydration casts generated types through an untyped record. These parallel maps are easy to update inconsistently and live inside typing-session orchestration. Existing edit-precedence and account-revision protections are useful.

**Evidence:** [storage-utils.ts](../src/lib/storage-utils.ts), persisted settings at line 78; [TypingPractice.tsx](../src/components/typing/TypingPractice.tsx), snapshot at line 489, hydration at line 581, and save parsing at line 674; [preferences.ts](../convex/preferences.ts).

**Possible actions:**

- Introduce small typed persistence adapters with explicit legacy normalization and session-only fields excluded.
- Extract hydration, dirty tracking, and debounced saving into one preference hook.
- Preserve late hydration, active user edits, account-switch, and delayed-save coverage while removing duplicate maps.

## 20. Move account synchronization out of the account button

**Resolution:** Implemented. AccountProvider deduplicates profile synchronization, exposes readiness/retry, and waits for Convex auth. Header, practice, private preferences, and notification queries use this state. Provider tests cover StrictMode, stale requests, failures, and subtree continuity.

**P2 · Cleanup opportunity with a failure-state gap.** Rendering `UserButton` performs backend account creation/synchronization, while practice separately repeats the same operation before session start and saving. A header sync failure only logs to the console; a missing account record can leave the stats button labeled “Loading your stats.” Data readiness is therefore coupled to a display component and repeated by consumers.

**Evidence:** [UserButton.tsx](../src/components/auth/UserButton.tsx), synchronization at lines 23–36; [Header.tsx](../src/components/layout/Header.tsx), account query at line 58 and stats loading label; [TypingPractice.tsx](../src/components/typing/TypingPractice.tsx), calls at lines 899 and 1020.

**Possible actions:**

- After issue 01, establish one authenticated account-readiness owner with explicit ready/error states.
- Let header and practice consume that state instead of independently synchronizing the same profile.
- Preserve save/start sequencing and provide a clear retry for account initialization failure.

## 21. Save Host settings deliberately

**Resolution:** Implemented. Host edits a local draft and saves deliberately on Apply/Start. Browser tests verify draft edits do not emit writes before applying.

**P2 · Verified efficiency and maintenance opportunity, not a proven ordering defect.** Every text/number/color edit sends the entire settings object, including plan/custom text. Host tracks revisions and pending writes, then saves the full object again before Start. Intermediate text edits generate backend mutations and participant updates that may not be useful.

**Evidence:** [Host.tsx](../src/pages/Host.tsx), update handling at lines 170–198 and Start at lines 217–230; [PracticeSettings.tsx](../src/components/connect/PracticeSettings.tsx), preset editing at line 119; [rooms.ts](../convex/rooms.ts), settings patch support.

**Possible actions:**

- Use a local draft with Apply/Start, or debounce edits and explicitly flush before starting.
- Send changed fields only where live preview is an actual requirement.
- Consolidate pending/error tracking and test that rapid editing starts with the latest successfully saved settings.

## 22. Choose one leaderboard implementation

**Resolution:** Implemented. Unused leaderboard-cache jobs, helpers and rebuild paths are removed. The legacy schema table remains for existing rows; the active profile stats cache remains.

**P2 · Confirmed redundant work and scaling concern.** Saves, identity changes, deletion, cron, and migrations maintain `leaderboardCache`, but the public leaderboard ignores it and scans users plus their results. The application pays for both designs. Switching reads to the cache without fixing it would be unsafe: an expired daily/weekly best is not replaced correctly by a lower current score, and pruning does not find a replacement winner.

**Evidence:** [testResults.ts](../convex/testResults.ts), `getLeaderboard` at line 357 and scans at line 376; [statsCache.ts](../convex/statsCache.ts), incremental winner updates at line 98 and pruning around line 566; [crons.ts](../convex/crons.ts).

**Possible actions:**

- Choose the simplest design appropriate to actual usage: remove unused leaderboard-cache machinery, or make a correct bounded aggregate read authoritative.
- If retaining it, test date rollover, an expired best with a lower eligible replacement, deletion, and identity changes.
- Keep the separate user-stats cache that profiles actually consume; do not delete all caches as one cleanup.

## 23. Bound achievement work during saving

**Resolution:** Implemented. Normal achievement saves update bounded progress; historical rebuilds page 100 results through scheduled mutations with generation guards. A 2,000-result fixture measured seven document reads for normal evaluation. Interleaving tests cover append, deletion and admin invalidation while pages are pending.

**P2 · Confirmed unbounded work; production impact unmeasured.** Valid saves collect the user's full result history and repeatedly filter, reduce, and sort it for achievements. Other recalculation paths duplicate much of this work. Growing history therefore increases work inside the result-saving transaction even though aggregate infrastructure already exists.

**Evidence:** [achievements.ts](../convex/achievements.ts), history collection around line 463 and subsequent calculations; [typingSessions.ts](../convex/typingSessions.ts), award processing around line 320; [statsCache.ts](../convex/statsCache.ts).

**Possible actions:**

- Consolidate award logic in issue 06 before optimizing several implementations.
- Measure reads and work for representative long histories; maintain simple counters or bounded recent windows where justified.
- Reserve full rebuilds for explicit maintenance with bounded batches and equivalent results.

## 24. Use a real migration cursor

**Resolution:** Implemented. Maintenance iterates native pagination cursors with resumable progress. Registered and supplemental nonlexicographic-ID tests cover ordering. No migration was run.

**P2 · Confirmed maintenance correctness defect.** `getUserIdsBatch` reads users in the database's default insertion order but treats the last `_id` as a lexicographic cursor for the next batch. Those are different orderings. Cache backfills and identity repair can skip or revisit users. The installed Convex query source describes default scans as insertion ordered.

**Evidence:** [migrations.ts](../convex/migrations.ts), `getUserIdsBatch` at lines 30–55; installed `convex/src/server/query.ts`, query ordering contract.

**Possible actions:**

- Replace manual ID comparisons with the database's native pagination cursor.
- Test multiple batches with IDs deliberately out of creation order.
- Report distinct processed users and failures for resumable maintenance; do not run historical migrations as part of a code-only fix.

## 25. Remove or isolate the unreachable solo plan workflow

**Resolution:** Implemented. Removed the unreachable solo plan executor and unsupported synchronization/waiting fields while preserving Host/Connect plan editing and execution. Legacy solo plan preference falls back to Zen.

**P2 · Confirmed dormant path; product decision required.** Solo practice initializes `showPlanBuilder` to false and only sets it when closing; plan is absent from selectable solo modes. Yet plan state, finish handling, splash, navigation, results, and overlays remain interwoven with the practice lifecycle. Connect does use shared plan components, so deleting the entire plan directory would break supported functionality.

**Evidence:** [TypingPractice.tsx](../src/components/typing/TypingPractice.tsx), plan state around line 298, handlers around line 775, and builder rendering around line 1846; [practice-config.ts](../src/components/typing/practice-config.ts), mode choices; [PlanBuilderModal.tsx](../src/components/plan/PlanBuilderModal.tsx).

**Possible actions:**

- Remove solo-only plan state/branches if the feature is not wanted, preserving Connect's active plan executor.
- If retained, give it an explicit entry point and separate owner rather than keeping an invisible partial implementation.
- Review dormant synchronization/waiting options and `UserPlanProgress` alongside that decision.
- Only fix latent solo-plan UI issues if that path is being restored.

## 26. Remove unreachable source modules

**Resolution:** Implemented. Removed the 13 unreachable modules listed below and tests/fixtures used only by removed ColorPicker code. Active theme/ghost/profile and Connect plan paths remain covered.

**P3 · Confirmed import-graph cleanup candidates.** A TypeScript import/export/literal-dynamic-import trace from `src/main.tsx` found 13 unreachable modules. Several form superseded feature islands. Some still have tests or fixtures, which proves they can render in isolation, not that users can reach them. Removing dead source reduces maintenance and misleading alternatives; it does not necessarily reduce production bundle size because bundling may already exclude it.

**Evidence / candidates:**

- `src/components/auth/StatsModal.tsx` (historical path), `src/components/auth/AchievementsGrid.tsx` (historical path), `src/components/auth/StreakCard.tsx` (historical path), and their unused `src/components/auth/index.ts` (historical path).
- `src/components/typing/GhostWriterController.tsx` (historical path), `src/components/settings/GhostWriterSettingsModal.tsx` (historical path), `src/components/typing/ColorPicker.tsx` (historical path), and `src/lib/color-utils.ts` (historical path).
- `src/hooks/useSound.ts` (historical path), `src/hooks/useGridColumns.ts` (historical path), `src/lib/schemas.ts` (historical path), `src/components/ui/command.tsx` (historical path), and `src/components/ui/hover-card.tsx` (historical path).

**Possible actions:**

- Confirm no intended entry point or external consumer exists, then remove complete obsolete feature islands in small batches.
- Remove or repurpose tests that exercise only intentionally deleted code; preserve coverage for live replacements.
- Recheck imports immediately before deletion and update documentation pointing at removed modules.

## 27. Remove dependencies that have no live consumer

**Resolution:** Implemented. Removed react-hook-form, @hookform/resolvers, next-themes, zod, cmdk and @radix-ui/react-hover-card through Bun; lockfile updated.

**P3 · Verified cleanup opportunity.** `react-hook-form`, `@hookform/resolvers`, and `next-themes` have no source consumers. Zod is used only by the unreachable schema file, `cmdk` only by the unreachable command primitive, and the hover-card package only by its unreachable wrapper. Their presence makes the supported architecture look broader than it is.

**Evidence:** [package.json](../package.json); `src/lib/schemas.ts` (historical path); `src/components/ui/command.tsx` (historical path); `src/components/ui/hover-card.tsx` (historical path); issue 26's reachability inventory.

**Possible actions:**

- Remove unused packages after deciding whether their dormant consumers are being deleted.
- Update the lockfile through Bun and rerun build/tests; check configuration and generators as well as imports.
- Keep actively used Radix controls, animation, font, and CSS tooling even if older cleanup notes call them unused.

## 28. Share the sound settings lifecycle

**Resolution:** Implemented. Both sound settings surfaces use one preview controller with stop-on-selection/close and visible playback errors. Dormant error-sound controls/settings and the unused playback hook are removed. Optional backend fields accept existing legacy rows and older clients, without exposing an active frontend preference.

**P3 · Cleanup opportunity and dormant feature residue.** The solo settings preview starts audio without retaining/stopping it and swallows playback failures. The separate Host sound modal already stops earlier previews and cleans up on close. Both implement pack selection/playback, while typing audio is elsewhere. `errorSound` is also persisted and modeled although the engine does not use it; there are no current error-sound assets, and the solo selector is hidden when none exist.

**Evidence:** [PracticeSettingsDialog.tsx](../src/components/typing/PracticeSettingsDialog.tsx), preview at line 64; [SoundSettingsModal.tsx](../src/components/settings/SoundSettingsModal.tsx), preview lifecycle at line 31; [TypingPractice.tsx](../src/components/typing/TypingPractice.tsx), typing playback at line 818.

**Possible actions:**

- Share a small preview controller and setting rows rather than retaining different playback lifecycles.
- Define whether previews overlap and stop previews when their dialog closes.
- Either implement error feedback with a real user-facing purpose or remove its dormant fields deliberately; coordinate with the unused hook in issue 26.

## 29. Remove Admin's speculative API compatibility layer

**Resolution:** Implemented. Admin uses generated function references and response types directly; unsupported optional-function checks and response-envelope guessing are removed. Existing stale-request/session tests pass.

**P3 · Confirmed ineffective guard and cleanup opportunity.** Admin redeclares optional API types and accepts both array and envelope responses even though this repository has a concrete generated API and an array-returning backend. Optional property checks cannot detect whether functions exist in a deployed Convex backend: generated references are proxies. An isolated check found truthy references even for nonexistent module/function names.

**Evidence:** [Admin.tsx](../src/pages/Admin.tsx), types at lines 16–41, response fallback at lines 82–85, and optional checks around line 102; [admin.ts](../convex/admin.ts), `listReview` at line 80; generated API's `anyApi` export.

**Possible actions:**

- Use generated `api.admin` references and derive response types from the actual backend contract.
- Remove unsupported alternate response shapes.
- Handle request failures directly, or use an explicit capability response only if deployment skew is a supported requirement.
- Preserve stale-request/session protections covered by [admin-review.test.tsx](../tests/unit/admin-review.test.tsx).

## 30. Measure rendering work for long typing prompts

**Resolution:** Measured and simplified. React Profiler/jsdom samples at 200/9,999/2,000 words justified memoizing stable prompt/word rendering. For 9,999 words, timer-only render work fell roughly 384→0 ms and first-input render work 285→131 ms. These are development component measurements, not browser latency; maximum-prompt mounting remains about 1.5 seconds. An opt-in benchmark records the limits without introducing virtualization.

**P3 · Measurement candidate, not a confirmed slowdown.** The practice clock publishes every 100 ms, and `PracticeText` rebuilds words and character elements when its parent rerenders. Supported word targets reach 9,999 and Zen appends text over time. This establishes growing work, but this review did not profile typing latency or establish a problematic device/workload threshold.

**Evidence:** [usePracticeClock.ts](../src/components/typing/usePracticeClock.ts), interval at line 45; [PracticeText.tsx](../src/components/typing/PracticeText.tsx), character rendering at line 37; [practice-limits.ts](../src/lib/practice-limits.ts).

**Possible actions:**

- Measure input latency and render cost for normal practice, maximum word counts, and sustained Zen use.
- If needed, isolate clock subscribers and memoize stable prompt work before introducing virtualization.
- Preserve caret, wrapping, ghost, and IME behavior; use the measurements to decide whether larger rendering changes are warranted.

## 31. Test the boundaries that the mocks replace

**Resolution:** Implemented. convex-test suites execute registered validators, identity contexts, schema/index operations, and representative authorization/lifecycle flows. Production entry tests exercise provider ordering with mocked transport. External-service configuration remains unverified; tests never use the live database.

**P2 · Confirmed coverage gap.** The suite has substantial UI and pure-function coverage, but browser fixtures replace authentication/data transport and many backend tests call `_handler` with a hand-written database. That fixture casts a context containing only `db`, ignores index names, and bypasses registered argument validators. These tests cannot establish real authorization, schema validation, or integration behavior. For example, host tests reject an explicitly wrong host ID but other tests omit it and still pass.

**Evidence:** [multiplayer-db.ts](../tests/unit/fixtures/multiplayer-db.ts), lines 39–52; [multiplayer-backend.test.ts](../tests/unit/multiplayer-backend.test.ts), lines 58–72; [browser README](../tests/browser/README.md), documented boundaries; [practice entry](../tests/browser/practice/entry.tsx).

**Possible actions:**

- Add focused anonymous/cross-account/omitted-credential tests when fixing issues 01–03; keep fast handler tests for pure lifecycle rules.
- Add a small isolated backend-contract suite that exercises validators, real identity contexts, and representative schema/index behavior.
- Exercise production bootstrap/configuration separately from UI fixture entry points.
- Keep external-request blocking and the rule against using the live development database for tests; do not replace the entire existing harness.

## 32. Make local development targets unambiguous

**Resolution:** Implemented. `dev:fixture` is the documented first-run UI path. The Convex watcher wrapper requires an explicit env file and matching target, rejects credential overrides, and requires an extra explicit flag for cloud writes. No live target or database was changed.

**P2 · Verified workflow risk, not an observed incident.** The project intentionally uses a Convex development deployment for live data. The quick start still presents `convex dev` as an ordinary local development step, and package scripts provide no target distinction. A new contributor or future agent can follow familiar development instructions while modifying the live backend. Migrating the existing database is neither necessary nor authorized by this finding.

**Evidence:** [README.md](../README.md), quick start at lines 102–116; [package.json](../package.json), Convex scripts; [agent handbook](AGENTS.md), live-service warning and testing boundaries; [browser README](../tests/browser/README.md).

**Possible actions:**

- Make isolated frontend fixtures the obvious first-run path for UI work.
- Document and verify a separate backend target for backend development; make target identity visible before watch/deploy commands.
- Add a small target/configuration check where practical, without changing the intentional live deployment or migrating data.

## 33. Reconcile current documentation and historical backlogs

**Resolution:** Implemented. Current setup/architecture, feature guides and package inventory are reconciled; the documentation index distinguishes historical audits/plans. Workers Builds is recorded as owner-reported and unverified, without claiming a new remote check.

**P2 · Confirmed documentation drift.** Multiple documents describe different present states. The README/deployment guide say Workers Builds is connected but unverified, while the handbook/tech inventory describe manual or planned deployment. The tech inventory still lists Sonner and unused form/theme libraries. Content docs reference a missing `analyze_quotes.js`; older cleanup notes still propose untracking `dist`, which is already untracked. Some historical audit items have since been fixed. Future agents following these documents literally can repeat completed work or revive obsolete architecture.

**Evidence:** [README.md](../README.md), line 90; [deployment guide](deployment/CLOUDFLARE_GUIDE.md), line 62; [TECH-STACK.md](TECH-STACK.md), UI/forms/theme tables; [Content_Management.md](features/Content_Management.md), utility instructions; `CLEANUP.md` (historical path); [UI-CLEANUP-AUDIT.md](UI-CLEANUP-AUDIT.md) and [integration ledger](ui-cleanup/integration.md).

**Possible actions:**

- Choose authoritative current setup/architecture documents and label older audits, plans, and migration records as historical.
- Reconcile deployment claims with actual configured state before changing any deployment workflow; remote configuration was not checked in this review.
- Replace missing commands and inaccurate dependency/table/feature descriptions with source-backed facts.
- Reconcile this report with existing owner plans after review, rather than maintaining several unchecked competing task lists.

## 34. Resolve duplicate files in the checkout

**Resolution:** Resolved locally. Compared all four untracked duplicate files: two were byte-identical; the Worker copy only added an obsolete triple-slash reference, and the guide copy contained older deployment wording. Preserved verified copies and a SHA-256 manifest outside the checkout at `/Users/dimitri/.codex/local-backups/typesetgo-2026-09-22-codebase-review`; removed only those four duplicates from the original source tree. Other pre-existing user files and generated changes remain untouched.

**P3 · Confirmed local check failure; pre-existing untracked files.** The checkout contains alternate deployment/Worker files with ` 2` in their names. ESLint discovers the duplicate Worker entry and generated declaration file: the entry produces a triple-slash-reference error and the declaration produces two warnings. The canonical Worker files are not the reported failure. The origin of the duplicates was not established, and they were preserved.

**Evidence:** `git status --short`; `worker/index 2.ts` (historical path); `worker/worker-configuration.d 2.ts` (historical path); `wrangler 2.jsonc` (historical path); `deployment/CLOUDFLARE_GUIDE 2.md` (historical path); [eslint.config.js](../eslint.config.js).

**Possible actions:**

- Compare the copies with their canonical counterparts and recover any intentional content before removal.
- Decide where local backups belong so they cannot be mistaken for active source/configuration.
- Rerun lint after resolving the copies; avoid weakening lint or mass-formatting generated declarations to hide this failure.

## 35. Stabilize browser fixture startup

**Resolution:** Implemented. Vite scans the actual fixture entry rather than production HTML. Connect-session waits for fixture readiness and attaches early console/page/request failures. Cold-cache and repeat real Join runs pass; full-suite results are recorded below.

**P2 · Confirmed tooling failure, reproduced and diagnosed.** The Connect session test failed twice before its intended typing scenario because `window.connectFixture` was undefined. A separate bounded diagnostic captured HTTP 504 “Outdated Optimize Dep” responses for React, React DOM, React Router, and the JSX runtime. After three seconds the page remained blank and the fixture global was absent: this is a Vite bootstrap failure before application execution, not evidence of a Connect regression. The precise cache invalidation trigger remains unproven. The test also records browser errors only to assert them at the end, hiding useful diagnostics when it exits early.

**Evidence:** [connect-session.spec.ts](../tests/e2e/connect-session.spec.ts), navigation and direct access at lines 21–24, final error assertion; [fixture convex.ts](../tests/fixtures/connect-browser/convex.ts), module-level global assignment; [vite.real.config.ts](../tests/fixtures/connect-browser/vite.real.config.ts), persistent fixture cache. Observed in the full browser run, a targeted repeat, and a diagnostic navigation during this review.

**Possible actions:**

- Investigate stale optimizer hashes/cache reuse and make optimization stable for the actual fixture entry.
- Establish a bounded fixture-ready condition before modifying fixture state; an arbitrary sleep does not repair failed module requests.
- Attach browser errors and HTTP/request failures even when an intermediate assertion throws.
- Verify cold-cache and repeat runs of the real Join scenario and full coordinator, retaining external-request blocking.

## Safeguards worth preserving

The review does not support a blanket removal of defensive code. Server-owned ranked prompts and score calculation, invalid/unranked result markers, attempt versions, stale-response rejection, atomic race snapshots, IME handling, focus restoration, reduced-motion support, lazy theme/font loading, and isolated browser request fences all address concrete behavior. Several have meaningful regression coverage. The useful simplification is fewer owners and fewer duplicate rules around those boundaries.

Suggested order after owner review: fix account/multiplayer permissions and public responses; correct deferred saves, session lifetime, and achievement consistency; repair multiplayer lifecycle/delivery; then remove dormant paths and consolidate state/persistence. Measure the scaling candidates before choosing larger optimizations. The owner later authorized the local changes recorded above. Live operations and a push remain outside this run.

## Implementation validation

All 35 resolutions are implemented locally. Independent source review found and then confirmed fixes for notification auth readiness and Connect account-switch reset. No remaining source-review blockers were reported.

| Final check | Result |
| --- | --- |
| Fixture-environment `bun run build` | Passed; existing initial-chunk size warning remains (about 557 kB minified). |
| `bun run test:run` | Passed: 46 files, 373 tests; one opt-in benchmark skipped by default. A run concurrent with browser/build timed out on one achievement UI test; the standalone full rerun passed without changing timeout or assertions. |
| Explicit rendering benchmark | Passed: 200 / 9,999 / 2,000 words. Latest maximum-prompt mount/clock/input component work: 1,579.8 / 0.00 / 134.65 ms in jsdom. |
| `bun run lint` | Passed without findings. |
| Convex native TypeScript check | Passed independently and in final integration. |
| Full `bun run test:e2e` coordinator | Passed: Practice, Fonts, Profiles, Connect (9), real Connect session (1), Race (12). A stale signed-in notification fixture key was corrected before this successful full run. |
| Connect-session cold-cache and repeat runs | Both passed in the multiplayer lane. |
| Diff whitespace and changed-document local links | Passed. |
| Duplicate backup hashes | All four independently match the backup manifest. |

Tests use local fixtures and `convex-test`; live Clerk configuration, production transport, cloud deployment settings, and production performance were not exercised. No historical data backfill or backend release was performed. Maximum-size prompt mounting and the initial bundle-size warning remain measurable limitations, not claimed solved by this cleanup.

The implementation is on `codex/codebase-remediation` in `/Users/dimitri/.codex/worktrees/codebase-remediation/typesetgo`. The original server still runs the original checkout. Before any later publication, coordinate the new Convex functions/credential arguments with the frontend release; see [release sequencing](development.md#releasing-this-branch-after-review).
