# TypeSetGo codebase improvements

Reviewed September 23, 2026 against `ee92a69` on `main`. This is a new review of the code at that commit, following the [September 22 review](CODEBASE-REVIEW.md), whose 35 listed items are marked resolved. The original findings and possible actions remain below as review history; the implementation status here tracks the subsequent local work on `codex/codebase-improvements-2026-09-23`.

**Priority guide:** P1 affects correctness, trust, or availability; P2 affects supported flows or has a plausible scaling cost; P3 is cleanup or an optimization to measure. “Confirmed” means the behavior follows from current code. Conditional cases and unmeasured scaling risks are identified explicitly.

The review covered the route and component code, practice, profiles, themes, Connect and Race, non-generated Convex functions and helpers, build configuration, documentation, and tests. It included read-only browsing of the running guest site at `localhost:3000` (Home and Leaderboard) and isolated browser tests. No live database writes, deployment, migration, or production load test was performed. The prior review's resolved items were not copied into this list.

## Implementation status

| Finding | Local status | What changed or remains |
| --- | --- | --- |
| 01 · Saved results | Implemented locally | Numeric inputs are checked; client-only saves remain visible as **unverified history** and cannot add progress or rank. The explicit maintenance action can repair historical aggregates, awards, and streaks after deployment. |
| 02 · Session bounds | Implemented | Server validates modes, difficulty, counts, duration, and supplied text before prompt generation. Direct Race text generation was also bounded. |
| 03 · Long timed tests | Implemented | The supported duration is now 1–600 seconds across the browser and server. The custom picker adapts to the new maximum. A local browser fixture rendered the 3,750-word maximum prompt and accepted input. |
| 04 · Admin lockout | Implemented | Login requires Clerk sign-in, and rate limiting is scoped to that identity. Admin sessions are bound to the signed-in identity. |
| 05 · Race finish claims | Mitigated | The server checks the full target, calculates elapsed time and WPM, and applies a 300 WPM minimum-time floor. A browser can still fabricate its own typed text; the podium cannot prove physical keystrokes. |
| 06 · Clock differences | Implemented | Early finish returns an explicit retry delay; the client resubmits after the server's start boundary. |
| 07 · Stranded host | Implemented | The next racer joining a waiting room takes over after its host disconnected alone. |
| 08 · Placement rule | Implemented | Live positions and final snapshots use the same finish-time ordering and stable tie-breaker. |
| 09 · Date labels | Implemented | Leaderboard labels and backend windows both use UTC. |
| 10 · Midnight refresh | Implemented | An open page refreshes period arguments and labels at UTC midnight and on visibility return. |
| 11 · Leaderboard scanning | Mitigated | Today and Week use a date index, so they do not scan older history. They still inspect all scores inside the selected window; measure that cost as data grows. |
| 12 · Stats repair | Implemented | Best-score replacement uses an index; full repair runs in resumable pages. Aggregate figures can lag while pages complete. |
| 13 · Public payload | Implemented | Public profile results return only displayed fields and a verification status. |
| 14 · Number dials | Implemented | Buttons and keyboard arrows now move in the same direction, with interaction coverage. |
| 15 · Profile charts | Implemented | The chart loads when opened; the profile route chunk fell from about 427 kB to 40 kB minified in the fixture build. |
| 16 · Old theme loaders | Implemented | Unused full-catalog and storage helpers and their old tests were removed; the browsing index and selected-palette path remain. |
| 17 · Solo plan branches | Implemented | Unreachable solo practice branches were removed; Connect plan selection remains. |
| 18 · Session shape | Implemented with compatibility | Current clients send one flat shape. The backend accepts older nested calls when fields do not conflict. |
| 19 · Source maps | Implemented | Production Vite assets no longer include public `.map` files; the local fixture build emitted zero. |
| 20 · Check gate | Local only | A GitHub workflow now runs build, explicit Convex typecheck, lint, unit tests, and isolated browser tests. It cannot run remotely until this branch is pushed. |
| 21 · Review links | Implemented | Root and docs READMEs point to this report; the September 22 report is labeled historical. |

**Before deployment:** review the existing unverified results' historical awards and aggregates. After the new code is deployed, `internal.migrations.backfillAllCaches` can rebuild stats, achievements, and streaks in resumable user batches; running it against a live deployment requires a separate authorized maintenance step. No production data has been changed during this work. Remote CI, deployment, and browser checks against the live service remain unverified.

| Local implementation check | Result |
| --- | --- |
| Fixture `bun run build`; explicit Convex typecheck; `bun run lint` | Passed. |
| `bun run test:run` | Passed: 49 files and 395 tests; one file/test skipped. |
| `bun run test:e2e` | Passed: Practice, Fonts, Profiles, Connect, Connect Session, and Race isolated suites. |
| Production asset maps | Zero `.map` files in `dist`. |
| Maximum timed prompt in an unthrottled desktop browser fixture | 3,750 words; about 1.33 s from navigation to full prompt, 114 ms for a one-character Playwright fill. This is a local synthetic measurement, not a live-service or low-end-device result. |

### Original review evidence

| Check | Result |
| --- | --- |
| `VITE_CONVEX_URL=https://fixture.invalid VITE_CLERK_PUBLISHABLE_KEY= bun run build` | Passed; Vite warned that the initial JS chunk exceeds 500 kB. |
| `bun run test:run` | Passed: 46 files, 373 tests; one file and one test skipped. |
| `bun run lint` | Passed. |
| `bun run test:e2e` | Passed the isolated Practice, Fonts, Profiles, Connect, Connect Session, and Race suites. |
| Running site | Guest Home and Leaderboard loaded; the page visibly labels leaderboard periods in Eastern Time. The timing and race issues below come from source tracing, not live reproduction. |

## 01. Validate saved results before awarding progress

**P1 · Confirmed.** The authenticated unranked [`saveResult`](../convex/testResults.ts#L18-L97) accepts client-provided WPM, accuracy, duration, and word totals. [`validityForUnrankedSave`](../convex/lib/leaderboardEligibility.ts#L38-L48) only rejects WPM above 300. Other impossible values can be stored as valid and then feed streak, achievement, and stats-cache updates. These results are excluded from the ranked leaderboard, but public profile and account progress still use them.

**Possible actions:**

- Define numeric and mode-specific bounds for unranked saves, including finite nonnegative counts and accuracy from 0 to 100.
- Decide which achievements, streaks, and public aggregates may use client-reported unranked results; derive or verify the rest server-side.
- Add registered mutation tests for fabricated metrics and legitimate unranked saves.

## 02. Bound session requests on the server

**P1 · Confirmed input gap; resource impact is unmeasured.** [`startSession`](../convex/typingSessions.ts#L51-L102) accepts arbitrary numeric duration and word target values and unrestricted quote/preset target text. [`wordCountForPrompt`](../convex/lib/soloPrompt.ts#L7-L19) converts the numbers directly into generated words. The browser limits in [`practice-limits.ts`](../src/lib/practice-limits.ts#L1-L6) do not constrain direct backend calls.

**Possible actions:**

- Validate mode, difficulty, finite integer duration/word target, and target-text length in the mutation before generating or storing a prompt.
- Share practical limits with the UI while keeping server validation authoritative.
- Add rejection tests for huge, negative, fractional, and non-finite inputs without constructing huge prompts.

## 03. Make the longest supported timed test practical

**P2 · Confirmed size; browser impact is inferred.** The UI permits 6:59:59 ([`practice-limits.ts`](../src/lib/practice-limits.ts#L4)). At that duration the server formula requests **157,494 words** ([`soloPrompt.ts`](../convex/lib/soloPrompt.ts#L15-L18)); [`PracticeText`](../src/components/typing/PracticeText.tsx#L39-L82) maps every word and character into React elements. The [earlier review](CODEBASE-REVIEW.md#30-measure-rendering-work-for-long-typing-prompts) measured a 9,999-word initial mount at roughly 1.5 seconds in a development component benchmark, so the much larger supported prompt merits a browser measurement before retaining this limit.

**Possible actions:**

- Set a realistic maximum duration or generate additional prompt text in bounded segments while preserving ranked-session integrity.
- Measure the supported maximum in a browser for payload size, initial render, and input responsiveness.
- Cover whichever maximum or segmented behavior is chosen with a boundary test.

## 04. Avoid a shared admin login lockout

**P1 · Confirmed conditional availability defect.** Every [`admin.login`](../convex/admin.ts#L20-L37) attempt consumes the same [`"admin_login"` rate-limit key](../convex/sessionCleanup.ts#L63-L67) before password verification. The limit is eight attempts per 15 minutes ([`rateLimit.ts`](../convex/lib/rateLimit.ts#L20-L25)). Anyone able to call the public login action can consume the shared allowance and temporarily block the real admin.

**Possible actions:**

- Choose an admin access gate or reliable per-caller throttling signal, with a global ceiling that does not create an easy blanket lockout.
- Test that one unauthenticated caller cannot exhaust another authorized caller's entire allowance.
- Keep the password and session token server-only while changing the throttle.

## 05. Decide who owns race finish claims

**P1 · Confirmed trust gap.** [`recordFinish`](../convex/participants.ts#L265-L298) accepts a racer's `finishTime`, typed text, progress, and WPM/accuracy snapshot. It checks basic numeric ranges but does not verify that the target was completed or that the submitted time matches server-observed race timing. The final [race snapshot](../convex/lib/multiplayer.ts#L95-L117) ranks by the submitted finish time and stores the submitted stats. A participant with a valid room credential can therefore falsify the podium.

**Possible actions:**

- Decide whether Race is an informal, client-trusted game or whether its podium should be authoritative; make the UI wording match that decision.
- For an authoritative podium, verify completion against the room target and calculate elapsed time from server timestamps; define how much progress evidence is needed before trusting a finish.
- Add a registered mutation test for a valid participant submitting an impossible finish.

## 06. Save race finishes across clock differences

**P1 · Conditional defect from source tracing.** The browser enables racing using its own [`Date.now()`](../src/pages/RaceActive.tsx#L135-L146), while [`acceptsAttempt`](../convex/lib/multiplayer.ts#L123-L133) checks the server clock. If a player's clock is ahead, it can enable and finish an attempt before the server accepts it. [`recordFinish`](../convex/participants.ts#L277-L283) then returns without a result; the client has already set its finished state and only offers Retry after a thrown error ([`RaceActive.tsx`](../src/pages/RaceActive.tsx#L199-L225), [finish UI](../src/pages/RaceActive.tsx#L411-L435)).

**Possible actions:**

- Make race start and finish acknowledgment explicit server state, or use a server-time offset for the client countdown.
- Have the finish mutation return an accepted/rejected result and make the client retry or resume when it is rejected.
- Test a fast client clock and a finish sent just before the server start time.

## 07. Recover a waiting race after its lone host leaves

**P2 · Conditional defect from source tracing.** Disconnecting the host transfers ownership only when an already-connected successor exists ([`multiplayer.ts`](../convex/lib/multiplayer.ts#L81-L92)). A player who joins afterward is inserted without taking over the host role ([`participants.ts`](../convex/participants.ts#L81-L111)). The room can remain waiting with players who cannot start it until the original host reconnects or the room expires.

**Possible actions:**

- Define a takeover rule for a waiting room with a disconnected host and no connected successor.
- Apply that rule on later joins or scheduled cleanup, using the existing private participant capability.
- Test host-leaves-alone, later-join, and original-host-reconnect sequences.

## 08. Use one race placement rule

**P2 · Confirmed conditional inconsistency.** A live finish gets its [`position` by mutation arrival order](../convex/participants.ts#L287-L293), which the [live race display](../src/components/race/RaceCourse.tsx#L24-L31) uses. The [final snapshot](../convex/lib/multiplayer.ts#L102-L113) sorts finishers by submitted elapsed time and assigns positions again. When network arrival order differs from elapsed-time order, the live winner and final winner can differ.

**Possible actions:**

- Choose one ordering rule, including a tie-breaker, and use it for both live and final results.
- Reconcile current positions when a later finish sorts ahead of an earlier one, or label live order as provisional.
- Add an out-of-order finish test and verify the live and final displays agree.

## 09. Align leaderboard dates with their data window

**P2 · Confirmed mismatch.** The [Leaderboard subtitles](../src/pages/Leaderboard.tsx#L20-L53) say Eastern Time, but the [backend cutoff](../convex/testResults.ts#L330-L337) uses UTC days. During the evening hours when the UTC date has advanced but the Eastern date has not, “Today” and “This Week” describe a different period from the scores they contain. The running page visibly shows the Eastern labels; the boundary mismatch was derived from the code.

**Possible actions:**

- Choose and document one leaderboard calendar policy, consistent with the site's existing UTC activity policy where appropriate.
- Compute both labels and backend cutoffs from that policy, including daylight-saving transitions if Eastern Time is chosen.
- Add a test around UTC midnight while the Eastern date is still the previous day.

## 10. Refresh leaderboard periods at midnight

**P2 · Inferred lifecycle defect.** The [leaderboard queries](../src/pages/Leaderboard.tsx#L208-L211) use fixed arguments while the [server computes cutoffs with current time](../convex/testResults.ts#L330-L337). A page left open across a period boundary has no explicit timer or boundary argument to force new results. The labels likewise compute from the current date only when React renders. A database-triggered rerun may incidentally refresh them, but an idle page has no guaranteed rollover.

**Possible actions:**

- Schedule a client refresh at the selected calendar boundary and pass a period key or cutoff into the query.
- Refresh the period labels from the same boundary state.
- Add a controlled-clock test for an open page crossing midnight without new results.

## 11. Bound leaderboard score scanning

**P2 · Scaling risk, unmeasured.** [`getLeaderboard`](../convex/testResults.ts#L339-L354) walks the descending all-time WPM index and filters the requested time window, duplicates, and ineligible scores in application code. A quiet “Today” or “This Week” may require scanning a large older history before finding enough eligible users or exhausting the index.

**Possible actions:**

- Measure documents read and query duration against representative history and quiet-day data.
- If the cost is material, add an index or bounded period-specific leaderboard representation suited to the chosen ranking policy.
- Keep eligibility and one-best-score-per-user behavior in a regression test for the replacement.

## 12. Bound per-user stats repair

**P2 · Scaling risk, unmeasured.** Deleting a best score loads [all of that user's results](../convex/statsCache.ts#L92-L103) to recalculate the best WPM. A full [stats-cache rebuild](../convex/statsCache.ts#L130-L163), also used after admin validity changes, collects the entire result history in one mutation. A long-lived account can eventually make those operations expensive or exceed backend limits.

**Possible actions:**

- Measure deletion and rebuild work for accounts with large histories.
- Use a suitable per-user score index for best-score lookup and page any full rebuild with resumable progress if needed.
- Test the replacement with invalid results and deletion of the current best score.

## 13. Trim public profile result payloads

**P3 · Data-minimization opportunity.** The public [`getUserStatsByUserId`](../convex/testResults.ts#L263-L313) query returns up to 100 full `testResults` documents as `allResults`. The [profile presentation type](../src/components/stats/profile-presentation.ts#L1-L20) uses a smaller display subset. Full documents include internal ranking and local calendar metadata that the public page does not need; the validity fields *are* used by the page. This is a payload/privacy cleanup, not evidence of private account identifiers being exposed.

**Possible actions:**

- Return a typed public result view containing only fields actually rendered in profile history and details.
- Keep private or internal result fields in separate authenticated/admin paths.
- Test the public response shape and profile rendering after the projection.

## 14. Make the number dial directions agree

**P2 · Confirmed UI defect.** The visible up button in [`PracticeCountDialog`](../src/components/typing/PracticeCountDialog.tsx#L94-L101) decreases the count and the down button increases it ([same file](../src/components/typing/PracticeCountDialog.tsx#L198-L205)). Keyboard ArrowUp and ArrowDown do the opposite ([same file](../src/components/typing/PracticeCountDialog.tsx#L121-L129)). The accessible button labels also say “up” and “down,” so the controls give inconsistent feedback.

**Possible actions:**

- Make pointer, keyboard, visual movement, and labels follow one direction convention.
- Add a small interaction test for both buttons and arrow keys.

## 15. Load profile charts when opened

**P3 · Measured bundle opportunity, user impact unmeasured.** [`UserStats`](../src/pages/UserStats.tsx#L10-L12) imports the chart modal at route load, and the modal imports [Recharts](../src/components/stats/UserStatsChartModal.tsx#L3-L10). The current profile chunk is 426.61 kB minified / 113.95 kB gzip, even when the chart stays closed. Build output shows the size; it does not by itself establish slow profile loading.

**Possible actions:**

- Load the chart modal on first open and provide a brief loading state.
- Compare profile route bytes and browser load time before and after; keep the change only if it helps.
- Check modal open, close, and keyboard focus behavior after splitting.

## 16. Retire unused full-theme loading paths

**P3 · Confirmed cleanup opportunity.** [`fetchThemeCatalog`, `retryThemeCatalog`, and `fetchAllThemes`](../src/lib/themes.ts#L241-L275) fetch full palettes for a legacy flow. Current production callers use the browsing index and load a selected palette on demand; the legacy functions appear in tests and an old test mock. Separate [`storage-utils` theme helpers](../src/lib/storage-utils.ts#L101-L165) also have no current production callers. These paths increase the surface future agents must understand.

**Possible actions:**

- Confirm there are no external consumers beyond this repository, then remove unused APIs and their tests/mocks.
- Keep the on-demand theme index, selected palette loading, and current `ThemeContext` persistence covered.
- Remove related unused types, comments, and storage keys only after checking migration needs for saved browser data.

## 17. Remove remaining unreachable solo-plan branches

**P3 · Confirmed cleanup opportunity.** Solo preferences already convert a saved `plan` mode to Zen ([`TypingPractice.tsx`](../src/components/typing/TypingPractice.tsx#L153-L159)), and the [solo mode selector](../src/components/typing/practice-config.ts#L1-L7) does not offer plans. Connect resolves a host plan to a concrete practice step before rendering ([`room-settings.ts`](../src/components/connect/room-settings.ts#L18-L47)). Yet the practice component and [dataset hook](../src/components/typing/usePracticeDataset.ts#L10-L19) still contain `plan` special cases, including a waiting message ([`TypingPractice.tsx`](../src/components/typing/TypingPractice.tsx#L1292-L1298)).

**Possible actions:**

- Trace all remaining `settings.mode === "plan"` checks in solo practice and remove only those unreachable after Connect resolution.
- Preserve Host's plan editor, step selection, and Connect plan execution.
- Keep a Connect plan acceptance test and a legacy saved-preference fallback test.

## 18. Give ranked-session creation one argument shape

**P3 · Confirmed duplication.** [`startSession`](../convex/typingSessions.ts#L51-L87) accepts both flat fields and a nested `settings` object, with nested values taking precedence, plus an ignored `clerkId`. The only current frontend caller sends the same settings twice ([`TypingPractice.tsx`](../src/components/typing/TypingPractice.tsx#L677-L695)). That leaves two possible sources for each setting without a current in-repo need.

**Possible actions:**

- Pick one typed request shape and send each setting once.
- Check whether deployed older clients still need the compatibility shape before removing it from the backend.
- Test the selected shape and reject contradictory input during any compatibility period.

## 19. Decide whether production needs source maps

**P3 · Deployment choice.** [`vite.config.ts`](../vite.config.ts#L17-L20) always enables source maps. The fixture build emitted 57 `.map` files totaling about 7.1 MB into `dist`, which is the asset directory used by the Worker. Public maps can be useful for debugging but add deploy bytes and expose source structure; whether that tradeoff is wanted is currently implicit.

**Possible actions:**

- Decide whether source maps should be public, private error-reporting artifacts, or disabled for production.
- Make the build setting explicit for that choice and verify the generated `dist` contents.
- Keep any needed production stack-trace workflow before removing maps.

## 20. Add an automated check gate for this codebase

**P2 · Coverage gap in the repository; remote settings unverified.** The repository has no checked-in `.github` workflow or equivalent visible CI configuration. The documented build, lint, unit, and isolated browser commands are local scripts ([`package.json`](../package.json#L8-L22)). The root TypeScript project references app, Node, and Worker projects, but not [`convex/tsconfig.json`](../tsconfig.json#L7-L12), so an explicit backend typecheck would make that gate unambiguous. The owner has reported a Workers Builds connection, but its remote checks were not inspected here.

**Possible actions:**

- Add a repository check on proposed changes for build, lint, unit tests, and explicit Convex typechecking; run browser acceptance where the runner supports Chrome.
- Record the exact command and environment fixture so checks never point at live services.
- Verify which remote checks already exist before duplicating them.

## 21. Point readers to the current review

**P3 · Confirmed documentation drift.** [`README.md`](../README.md#L147) and the [documentation index](README.md#L5) still call the September 22 review the *current remediation checklist*, although all 35 entries in that file are marked resolved. This report is the current set of proposals, and the old review is useful as implementation history.

**Possible actions:**

- Once this report is accepted, update the documentation index and root README to link it as the current review.
- Label the September 22 review as historical resolution evidence.
