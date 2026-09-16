# UI cleanup integration ledger

Base: `main` at audit commit `6c0eacb`. Integration branch: `codex/ui-integration`; worktree: `/Users/dimitri/Code/typesetgo-worktrees/integration`. The user main checkout and its six unrelated untracked files are untouched. All changes are local and undeployed.

This ledger preserves all 81 audit section titles in original order. “Integrated” records local code, not full resolution. Independent verification records coordinator/reviewer evidence separately from the lane reports. A unit/browser pass covers its fixtures, not live identity, network or every palette.

## Ownership and merge sequence

| Lane | Branch | Delivered HEAD | Source snapshot |
| --- | --- | --- | --- |
| Foundations | `codex/ui-foundations` | `c61bffd` | `57e5a04` |
| Practice | `codex/ui-practice` | `35585ee` | `4ec7ffb` |
| Profiles | `codex/ui-profiles` | `72d8daf` | `821aaa5` plus shared followups |
| Multiplayer | `codex/ui-multiplayer` | `18e6835` | `dd3b740` |

Merged Foundations → Practice → Profiles → Multiplayer. Older equivalent cherry-picks remain in ancestry but were not reapplied over newer implementations. Conflicts retained current theme preference revisions, Escape veto propagation, Practice delayed preferences/Save contrast/auth feedback and tests. The Profiles modal callback and NotificationCenter caller landed together.

Integration owns package/lock/lint, browser configuration, shared schema acceptance and this ledger. Tooling worker: `codex/ui-integration-tooling` at `/Users/dimitri/Code/typesetgo-worktrees/integration-tooling`, exclusively package/lock/ESLint and its report. Read-only integrated reviewer and browser verifier have no source ownership. All spawned agents use GPT-6 Astra/XHigh without a service-tier override; parent runtime settings are host-controlled, with no self-configuration API exposed.

## Shared contracts requiring merge/rollout order

- Foundation semantic tokens (`tv.ui`), safe `useAppAuth`, normal-flow Header, shared overlay Escape/focus and theme preference revision precede feature consumers. Raw typing colors remain distinct.
- `AchievementsModal.onCloseAutoFocus` precedes NotificationCenter persistent-trigger restoration.
- Practice `initialInput`/`initialElapsedMs`, exact `TypingStats.typedText`, stopped emission guards and pure `practice-limits.ts` precede Multiplayer adapters. Limits: text 1–6rem, duration 1–25199 seconds, words 1–9999, ghost 1–200 WPM.
- Optional schema fields: `rooms.runVersion`, `participants.resetVersion`, room sound pack names. Legacy versions default to zero. Schema, lifecycle handlers and version-bearing callers must travel together; no data migration or backend deployment was run.
- Host-led plan steps resolve to one locked practice configuration. Stop freezes input/clock/reports; new Start resets; timed preset ends at duration or finite-text exhaustion. Automatic progression/Wait for All/Zen Waiting remain disabled.
- Ranked solo prompt/session adoption and word-aligned completion must accompany the dedicated backend completion helper. Ownership, score/timing and abuse validation remain enforced. Repeat is explicitly history-only.

## Coverage

| # | Audit section title | Accountable owner / dependencies | Implementation | Independent verification |
| --- | --- | --- | --- | --- |
| 1 | Shared UI color classes are disconnected from the theme | Foundations | Integrated; scoped lane evidence | Pending integrated acceptance |
| 2 | Shared entry and exit animations have no stylesheet | Foundations | Integrated; scoped lane evidence | Pending integrated acceptance |
| 3 | Theme mode does not control native or Tailwind dark-mode styling | Foundations | Integrated; scoped lane evidence | Pending integrated acceptance |
| 4 | Secondary UI text inherits typing-text contrast | Foundations; Practice/Profiles/Multiplayer consumers | Integrated; partial scope / limits retained | Pending integrated acceptance |
| 5 | Multiple palette systems prevent consistent theming | Foundations; all consumers | Integrated; partial scope / limits retained | Pending integrated acceptance |
| 6 | Elevation and glow treatments conflict with the matte direction | Foundations; all consumers | Integrated; partial scope / limits retained | Pending integrated acceptance |
| 7 | The header overlaps and loses controls at narrow widths | Foundations; Practice/Multiplayer spacing | Integrated; scoped lane evidence | Pending integrated acceptance |
| 8 | Invisible header controls remain keyboard-accessible | Foundations | Integrated; scoped lane evidence | Pending integrated acceptance |
| 9 | The theme picker has no usable phone layout | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 10 | Collapsed theme categories still contain focusable controls | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 11 | Theme-category expansion has an arbitrary clipping ceiling | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 12 | Variant drawers cannot play their exit animation | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 13 | Variant drawer height becomes stale after layout changes | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 14 | Theme loading eagerly requests the whole catalog | Foundations loader; Practice/Multiplayer callers | Integrated; partial scope / limits retained | Pending integrated acceptance |
| 15 | Rapid theme selections can resolve out of order | Foundations | Integrated; scoped lane evidence | Targeted contract regressions pass (45 tests); browser pending |
| 16 | Theme-card selection and expansion lack a complete interaction contract | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 17 | “Custom Theme” opens a read-only color display | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 18 | Dialog behavior is implemented repeatedly and inconsistently | Foundations primitive; all active consumers | Integrated; partial scope / limits retained | Targeted contract regressions pass (45 tests); browser pending |
| 19 | Settings labels and selected states are not programmatically connected | Practice; Foundations slider | Integrated; scoped lane evidence | Pending integrated acceptance |
| 20 | Reduced-motion preferences are ignored | Foundations policy; all active consumers | Integrated; partial scope / limits retained | Pending integrated acceptance |
| 21 | Animated counters restart, leak frames, and mishandle edge cases | Foundations | Integrated; scoped lane evidence | Pending integrated acceptance |
| 22 | Quote metadata refuses to fade with the rest of the UI | Practice; Foundations CSS | Integrated; scoped lane evidence | Pending integrated acceptance |
| 23 | Focus-mode fading waits for a typing pause | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 24 | The typing input traps Tab navigation | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 25 | Results shortcuts intercept unrelated inputs and dialogs | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 26 | The visual caret disappears after extra characters | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 27 | Typing scroll calculations use already-animated geometry | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 28 | The on-screen keyboard disappears permanently after shrinking | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 29 | Pressed keyboard keys use an unreadable foreground/background pair | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 30 | Color picker positioning and listener cleanup are fragile | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 31 | Color picker dragging supports only a mouse | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 32 | Notifications hide their delete action from keyboard and touch users | Foundations | Integrated; scoped lane evidence | Pending integrated acceptance |
| 33 | The application shell lacks route-level recovery | Foundations | Integrated; partial scope / limits retained | Pending integrated acceptance |
| 34 | The advertised auth-disabled mode still calls Clerk-only hooks | Foundations boundary; all auth consumers | Integrated; scoped lane evidence | Pending integrated acceptance |
| 35 | The main practice component couples unrelated UI lifecycles | Practice | Integrated; partial scope / limits retained | Pending integrated acceptance |
| 36 | Word-count changes do not rebuild the prompt | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 37 | Quote mode can display the previous word test | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 38 | The visible caret ignores native input selection | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 39 | Local settings hydration can overwrite account preferences | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 40 | Displayed and ranked prompts can have different owners | Practice | Integrated; scoped lane evidence | Targeted contract regressions pass (45 tests); browser pending |
| 41 | Quote completion disagrees with word-aligned editing | Practice | Integrated; scoped lane evidence | Targeted contract regressions pass (45 tests); browser pending |
| 42 | Keyboard guidance keeps demanding Backspace after historical mistakes | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 43 | Long words can be clipped with no way to see the remaining letters | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 44 | Result-word details are available only through hover | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 45 | Compact and desktop text-size controls disagree | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 46 | Visually disabled sound and ghost settings still accept keyboard input | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 47 | The ghost cursor skips spaces and drifts from elapsed time | Practice | Integrated; scoped lane evidence | Pending integrated acceptance |
| 48 | Leaderboard time ranges disappear on smaller screens | Profiles | Integrated; scoped lane evidence | Pending integrated acceptance |
| 49 | Leaderboard names shrink to unreadable sizes | Profiles | Integrated; scoped lane evidence | Pending integrated acceptance |
| 50 | Large result lists reveal themselves too slowly | Profiles leaderboard; Multiplayer race | Integrated; scoped lane evidence | Pending integrated acceptance |
| 51 | Race departure does not always disconnect the participant | Multiplayer | Integrated; scoped lane evidence | Targeted contract regressions pass (45 tests); browser pending |
| 52 | Race host controls depend on a query-string flag | Multiplayer | Integrated; scoped lane evidence | Targeted contract regressions pass (45 tests); browser pending |
| 53 | Missing race data produces permanent loading screens | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 54 | Race reconnect restores the avatar but not the typing state | Multiplayer; Practice input contract | Integrated; scoped lane evidence | Targeted contract regressions pass (45 tests); browser pending |
| 55 | Race progress callbacks may create a mutation feedback loop | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 56 | Active race exit is hidden behind Escape | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 57 | Race results exceed their grid width | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 58 | Race podiums and tables clip on phones | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 59 | The emoji picker can open outside the viewport | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 60 | Race avatars are clipped at track endpoints | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 61 | Signed-in racers without usernames cannot proceed | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 62 | Race actions fail without useful feedback | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 63 | Profile headers overlap on narrow screens | Profiles | Integrated; scoped lane evidence | Pending integrated acceptance |
| 64 | Profile history has no compact layout | Profiles | Integrated; scoped lane evidence | Pending integrated acceptance |
| 65 | Profile stat cards and history rows are not keyboard-operable | Profiles | Integrated; scoped lane evidence | Pending integrated acceptance |
| 66 | Achievement refresh acts on the wrong profile | Profiles | Integrated; scoped lane evidence | Pending integrated acceptance |
| 67 | Charts imply more history than they contain | Profiles | Integrated; scoped lane evidence | Pending integrated acceptance |
| 68 | Missing historical metrics are shown as real zeros | Profiles | Integrated; scoped lane evidence | Pending integrated acceptance |
| 69 | Achievement cards compress essential text on phones | Profiles | Integrated; scoped lane evidence | Pending integrated acceptance |
| 70 | Host plans never activate the participant plan executor | Multiplayer; Practice executor | Integrated; scoped lane evidence | Targeted contract regressions pass (45 tests); browser pending |
| 71 | The reachable plan builder clips its editor on phones | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 72 | Timed presets are configured as timed but execute as completion tests | Multiplayer; Practice timed predicate | Integrated; scoped lane evidence | Targeted contract regressions pass (45 tests); browser pending |
| 73 | Host Stop and Reset do not control the full participant session | Multiplayer; Practice clock/input | Integrated; scoped lane evidence | Targeted contract regressions pass (45 tests); browser pending |
| 74 | Room failures trigger automatic retry loops | Multiplayer | Integrated; scoped lane evidence | Targeted contract regressions pass (45 tests); browser pending |
| 75 | Participant-card dragging blocks touch scrolling | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 76 | Host sound-pack selections never reach participants | Multiplayer | Integrated; scoped lane evidence | Targeted contract regressions pass (45 tests); browser pending |
| 77 | Host controls and card sizing force horizontal overflow | Multiplayer | Integrated; scoped lane evidence | Pending integrated acceptance |
| 78 | Unfinished settings expose implementation placeholders | Practice | Source confirmation pending | Pending integrated acceptance |
| 79 | Route code loads as one large initial bundle | Foundations | Integrated; partial scope / limits retained | Pending integrated acceptance |
| 80 | UI behavior has little regression coverage | Integration | In progress | Pending integrated acceptance |
| 81 | Lint cannot currently run before UI changes are handed off | Integration | In progress | Pending integrated acceptance |

## Verification record

- Integrated shared-contract batch: 45 tests in five files passed (`foundations-overlays`, `foundations-theme-selection`, `connect-session`, `multiplayer-backend`, `solo-practice-completion`). Log: `/tmp/typesetgo-integration-contracts.log`.
- Full build/unit/lint and integrated browser acceptance pending. Lane evidence remains in [Foundations](foundations.md), [Practice](practice.md), [Profiles](profiles.md), [Multiplayer](multiplayer.md).

## Remaining limitations

- No live Clerk/Convex validation, production data mutations, migrations, pushes, deployment or merge into main. Later rollout must coordinate local frontend/backend contracts.
- Real multi-device network reconnect and passive disconnect expiry remain unverified/deferred; exact input restoration is tested with mocks. Legacy attempts without exact text explicitly restart.
- Native browser-toolbar zoom is separate from CSS viewport reflow/CSS zoom. Current lane evidence covers the latter.
- Theme catalog startup latency, constrained-device performance and baseline scroll overshoot were not profiled/reproduced. Source contract improvements are not speed claims.
- Dormant components and unfinished autonomous plan/features remain deferred. Route boundaries do not cover invalid configuration before router construction.
- No audit diagnosis has been conclusively disproved. The progress-loop and drawer/scroll appearance diagnoses retain their original runtime uncertainty.
