# Core typing engine

`src/components/typing/TypingPractice.tsx` owns solo practice and the Host-controlled Connect typing attempt. Supported solo modes are Time, Words, Quote, Zen, and Preset. Connect additionally executes the Host's shared plan through its own room settings. The old unreachable solo plan state and dialogs have been removed.

## Attempt lifecycle

A session epoch identifies the current prompt/attempt. Reset, explicit prompt changes, and departure invalidate work for the previous epoch. Results awaiting first sign-in contain their originating attempt identity; starting another attempt discards that pending intent. Stale server replies cannot mark a new attempt as saved.

`usePracticeClock` owns elapsed time; `PracticeText` renders the prompt and memoizes stable words so timer-only rerenders do not rebuild every character. Input handling preserves composition/IME and strict-versus-forgiving completion behavior. `TypingArea` is the strict Race executor and shares small metric definitions rather than the full solo lifecycle.

Signed-in ranked attempts use server-created prompts and Convex typing sessions. The browser waits for the shared `AccountProvider` to establish authenticated account readiness. Prepared sessions older than 24 hours are recreated before input; backend cleanup expires active sessions based on recent activity. See [solo validation](Solo_Anti_Cheat.md).

## Preferences and content

`usePracticePreferences` owns account hydration, local edit precedence, queued prompt changes, and debounced persistence. `src/lib/practice-preferences.ts` maps between typed settings and backend preferences. Settings arriving during a running or finished attempt apply at the next prompt boundary; explicit edits retain precedence.

Word lists and quotes come from `public/words` and `public/quotes`. Difficulty runs from Beginner through Expert. Preset mode accepts custom text. `ThemeContext` owns theme/variant/mode selection; palette and font files load on demand. Sound settings share `useSoundPreview`, which stops previous playback and cleans up on close. Unsupported error-sound selection is no longer exposed.

## Metrics

Raw/gross speed is total typed characters divided by five and elapsed minutes; correct-character speed excludes mistakes. Ranked WPM remains computed by the backend using server elapsed time. Empty input may display 100% accuracy; nonempty all-wrong input reports 0%, including through Connect callbacks. Preserve this distinction when changing presentation.

## Performance evidence

The opt-in `practice-rendering-benchmark.test.tsx` uses React Profiler in jsdom for 200, 9,999, and 2,000-word prompts. It measures component render work, not browser paint, caret layout, or end-to-end input latency. Run with `TYPESETGO_RENDER_BENCHMARK=1 bun run test:run tests/unit/practice-rendering-benchmark.test.tsx --disableConsoleIntercept`. Large prompt mounting remains costly; use browser measurements before adopting virtualization.
