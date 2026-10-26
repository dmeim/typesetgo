# Core typing engine

`src/components/typing/TypingPractice.tsx` owns solo practice and the Host-controlled Connect typing attempt. Supported solo modes are Time, Words, Quote, Zen, and Preset. Connect additionally executes the Host's shared plan through its own room settings. The old unreachable solo plan state and dialogs have been removed.

## Attempt lifecycle

A session epoch identifies the current prompt/attempt. Reset, explicit prompt changes, and departure invalidate work for the previous epoch. Results awaiting first sign-in contain their originating attempt identity; starting another attempt discards that pending intent. Stale server replies cannot mark a new attempt as saved. Signed-in completed attempts disable Next, Repeat, and the Enter shortcut while saving; a failed save remains retryable, and changing accounts still invalidates the old attempt.

`usePracticeClock` owns elapsed time and pauses synchronously at completion so the first final snapshot and restored results use the same frozen duration; `PracticeText` renders the prompt and memoizes stable words so timer-only rerenders do not rebuild every character. Input handling preserves composition/IME and strict-versus-forgiving completion behavior. `TypingArea` is the strict Race executor and shares small metric definitions rather than the full solo lifecycle.

Signed-in ranked attempts use server-created prompts and Convex typing sessions. The browser waits for the shared `AccountProvider` to establish authenticated account readiness. Prepared sessions older than 24 hours are recreated before input; backend cleanup expires active sessions based on recent activity. See [solo validation](Solo_Anti_Cheat.md).

## Preferences and content

`usePracticePreferences` owns account hydration, local edit precedence, queued prompt changes, and debounced persistence. `src/lib/practice-preferences.ts` maps between typed settings and backend preferences. Settings arriving during a running or finished attempt apply at the next prompt boundary; explicit edits retain precedence.

Word lists and quotes come from `public/words` and `public/quotes`. Difficulty runs from Beginner through Expert. Preset is available in the desktop mode picker and compact Quick Settings. Selecting it with no prompt opens the custom-text dialog; Edit custom text reopens the current prompt for replacement. Difficulty and generated-text modifiers do not apply to quotes or custom text. `ThemeContext` owns theme/variant/mode selection; palette and font files load on demand. Sound settings share `useSoundPreview`, which stops previous playback and cleans up on close. Unsupported error-sound selection is no longer exposed.

## Metrics

Raw/gross speed is total typed characters divided by five and elapsed minutes; correct-character speed excludes mistakes. Ranked WPM remains computed by the backend using server-owned completion timing, not finalization latency. Saved result summaries show the backend's returned WPM, accuracy, and duration. Connect reports actual submitted words separately from five-character speed units; Words history records the configured target, with unknown legacy targets labeled as not recorded. Empty input may display 100% accuracy; nonempty all-wrong input reports 0%, including through Connect callbacks. Preserve this distinction when changing presentation.

The results screen (`PracticeResults`) shows speed and accuracy cards, a per-second graph and summary chips. While a test runs, `TypingPractice` records one `TimelineSample` per whole second (`src/lib/result-timeline.ts`): gross WPM, accuracy, and the running count of wrong, missed and extra letters. A second is marked as a mistake when that count grows. `finishTimeline` adds the finishing moment for tests that end mid-second. The graph (`ResultTimelineGraph`) needs at least two samples, so restored or instant results show no graph. Signed-in solo players also get today/average/best bars from `testResults.getResultComparison`, which reads their last 50 valid results. That snapshot is taken in `finishSession`, before saving, so a test is never compared with itself. Guests and Connect rooms see the cards without comparison. The chips (`ResultChips`) morph into detail panels for correct words, letter-level mistakes (`src/lib/word-diff.ts`), characters, and test settings. Escape closes a panel and returns focus to its chip.

## Performance evidence

The opt-in `practice-rendering-benchmark.test.tsx` uses React Profiler in jsdom for 200, 9,999, and 2,000-word prompts. It measures component render work, not browser paint, caret layout, or end-to-end input latency. Run with `TYPESETGO_RENDER_BENCHMARK=1 bun run test:run tests/unit/practice-rendering-benchmark.test.tsx --disableConsoleIntercept`. Large prompt mounting remains costly; use browser measurements before adopting virtualization.
