# UI cleanup integration ledger

Base: `main` at audit commit `6c0eacb`. Integration branch: `codex/ui-integration`; worktree: `/Users/dimitri/Code/typesetgo-worktrees/integration`. The user main checkout and its six unrelated untracked files are untouched. All changes are local and undeployed.

This ledger preserves all 81 audit section titles in original order. “Integrated” records local code, not full resolution. Independent verification records coordinator/reviewer evidence separately from the lane reports. A unit/browser pass covers its fixtures, not live identity, network or every palette.

## Ownership and merge sequence

| Lane | Branch | Final delivered HEAD | Source snapshot |
| --- | --- | --- | --- |
| Foundations | `codex/ui-foundations` | `50fe25d` | `5bfe85d` |
| Practice | `codex/ui-practice` | `bd8db91` | `06ec276` |
| Profiles | `codex/ui-profiles` | `5604625` | `5604625` |
| Multiplayer | `codex/ui-multiplayer` | `e5216ab` | `f2425e2` |

Merged Foundations → Practice → Profiles → Multiplayer. Older equivalent cherry-picks remain in ancestry but were not reapplied over newer implementations. Conflicts retained current theme preference revisions, Escape veto propagation, Practice delayed preferences/Save contrast/auth feedback and tests. The Profiles modal callback and NotificationCenter caller landed together.

Integration owns package/lock/lint, browser configuration, shared schema acceptance and this ledger. Tooling worker: `codex/ui-integration-tooling` at `/Users/dimitri/Code/typesetgo-worktrees/integration-tooling`, initially exclusively package/lock/ESLint and its report, then explicitly assigned the shared browser harness and fixture configuration. Its final commit is `b7c3501`, integrated as `837397c`; the worker checkout is clean. Read-only integrated reviewers and browser verifier have no source ownership. All spawned agents use GPT-6 Astra/XHigh without a service-tier override; parent runtime settings are host-controlled, with no self-configuration API exposed.

## Shared contracts requiring merge/rollout order

- Foundation semantic tokens (`tv.ui`), safe `useAppAuth`, normal-flow Header, shared overlay Escape/focus and theme preference revision precede feature consumers. Raw typing colors remain distinct.
- `AchievementsModal.onCloseAutoFocus` precedes NotificationCenter persistent-trigger restoration.
- Practice `initialInput`/`initialElapsedMs`, exact `TypingStats.typedText`, stopped emission guards and pure `practice-limits.ts` precede Multiplayer adapters. Limits: text 1–6rem, duration 1–25199 seconds, words 1–9999, ghost 1–200 WPM.
- Optional schema fields: `rooms.runVersion`, `participants.resetVersion`, room sound pack names. Legacy versions default to zero. Schema, lifecycle handlers and version-bearing callers must travel together; no data migration or backend deployment was run.
- Host-led plan steps resolve to one locked practice configuration. Stop freezes input/clock/reports; new Start resets; timed preset ends at duration or finite-text exhaustion. Automatic progression/Wait for All/Zen Waiting remain disabled.
- Ranked solo prompt/session adoption and word-aligned completion must accompany the dedicated backend completion helper. Ownership, score/timing and abuse validation remain enforced. Repeat is explicitly history-only.
- Theme, notification, carousel and overlay provider/hook extraction preserves existing module import paths through compatibility barrels. Plan keyboard cancellation uses a small public-API sensor wrapper; it relies on the shared overlay's propagated Escape veto.

## Coverage

Verification keys below record successful integrated checks, with their scope stated per row: **U** = coordinator's full 276-test unit run; **R** = read-only review of the integrated source and followups; **BP** = seven Practice browser scenarios; **BPro** = 13 Profiles check groups; **BH** = eight Host browser tests; **BJ** = real Join/session browser test; **BR** = 12 Race browser tests; **V** = independent inspection of 14 final-run screenshots. “Lane evidence” identifies a check reported by its implementation owner that was not separately repeated in final acceptance. It is not an independent browser pass.

Every section has an accountable owner. Cross-cutting scope remains explicitly partial where legacy/dormant consumers, exhaustive visual coverage or performance measurement remain outside the implemented slice. No row's integrated status alone certifies complete resolution of the audit claim.

| # | Audit section title | Accountable owner / dependencies | Implementation | Independent verification |
| --- | --- | --- | --- | --- |
| 1 | Shared UI color classes are disconnected from the theme | Foundations | Implemented and integrated | U semantic colors; BP mode/Save colors; BPro/BH/BR consumers |
| 2 | Shared entry and exit animations have no stylesheet | Foundations | Implemented and integrated | R shared stylesheet; U overlays; browser overlay/reduced-motion consumers; exact exit timing remains lane evidence |
| 3 | Theme mode does not control native or Tailwind dark-mode styling | Foundations | Implemented and integrated | U mode ownership; BP theme/mode changes; OS-mismatch matrix remains lane evidence |
| 4 | Secondary UI text inherits typing-text contrast | Foundations; Practice/Profiles/Multiplayer consumers | Partially addressed; scoped changes integrated | U contrast across 9,912 palettes; representative BP/BPro/BH/BR surfaces |
| 5 | Multiple palette systems prevent consistent theming | Foundations; all consumers | Partially addressed; scoped changes integrated | R shared semantic contract; BP/BPro/BH/BR active consumers; legacy roles retained |
| 6 | Elevation and glow treatments conflict with the matte direction | Foundations; all consumers | Partially addressed; scoped changes integrated | R active surface changes; V representative captures; exhaustive visual certification deferred |
| 7 | The header overlaps and loses controls at narrow widths | Foundations; Practice/Multiplayer spacing | Implemented and integrated | U shell contracts; BP narrow/wide reflow; full long-account width matrix remains lane evidence |
| 8 | Invisible header controls remain keyboard-accessible | Foundations | Implemented and integrated | U inert/portal/focus regressions; BP typing-to-Tab journey |
| 9 | The theme picker has no usable phone layout | Practice | Implemented and integrated | BP narrow theme dialog and compact reflow |
| 10 | Collapsed theme categories still contain focusable controls | Practice | Implemented and integrated | U collapsed controls unmount; BP Collapse all removes variant actions |
| 11 | Theme-category expansion has an arbitrary clipping ceiling | Practice | Implemented and integrated | R uncapped category layout; BP last-variant reachability |
| 12 | Variant drawers cannot play their exit animation | Practice | Implemented and integrated | U inert exit lifecycle; R presence ownership; normal-motion exit observation remains lane evidence |
| 13 | Variant drawer height becomes stale after layout changes | Practice | Implemented and integrated | BP open drawer resize/reflow; original intermittent failure not reproduced |
| 14 | Theme loading eagerly requests the whole catalog | Foundations loader; Practice/Multiplayer callers | Partially addressed; scoped changes integrated | U queue/deduplication/timeout/retry; BP/BH on-demand catalog; latency unmeasured |
| 15 | Rapid theme selections can resolve out of order | Foundations | Implemented and integrated | U request/user-intent race regressions; R preference consumers |
| 16 | Theme-card selection and expansion lack a complete interaction contract | Practice | Implemented and integrated | U focus/selection contract; BP variant selection and pressed state |
| 17 | “Custom Theme” opens a read-only color display | Practice | Implemented and integrated | R action renamed Current theme details; editing remains unsupported |
| 18 | Dialog behavior is implemented repeatedly and inconsistently | Foundations primitive; all active consumers | Partially addressed; scoped changes integrated | U shared overlay/focus regressions; BP/BPro/BH/BR nested Escape and restoration |
| 19 | Settings labels and selected states are not programmatically connected | Practice; Foundations slider | Implemented and integrated | U named controls/ranges/disabled states; BP settings interaction |
| 20 | Reduced-motion preferences are ignored | Foundations policy; all active consumers | Partially addressed; scoped changes integrated | U counter/motion contracts; reduced-motion BP/BPro/BH/BR fixtures; exhaustive motion audit deferred |
| 21 | Animated counters restart, leak frames, and mishandle edge cases | Foundations | Implemented and integrated | U zero-time/frame, retarget, cleanup and live reduced-motion regressions |
| 22 | Quote metadata refuses to fade with the rest of the UI | Practice; Foundations CSS | Implemented and integrated | BP quote metadata computed opacity after typing |
| 23 | Focus-mode fading waits for a typing pause | Practice | Implemented and integrated | U focus-mode state; BP immediate metadata fade after typing |
| 24 | The typing input traps Tab navigation | Practice | Implemented and integrated | U input navigation; BP real input Tab leaves exercise |
| 25 | Results shortcuts intercept unrelated inputs and dialogs | Practice | Implemented and integrated | U shortcut scope/composition/modifier regressions; BP results/settings/repeat |
| 26 | The visual caret disappears after extra characters | Practice | Implemented and integrated | U extra/terminal caret; BP positive caret geometry with extra/long input |
| 27 | Typing scroll calculations use already-animated geometry | Practice | Implemented and integrated | R stable measurement contract; BP wrapped/tape caret bounds; baseline overshoot unconfirmed |
| 28 | The on-screen keyboard disappears permanently after shrinking | Practice | Implemented and integrated | U observed wrapper regression; BP 260px→900px keyboard recovery |
| 29 | Pressed keyboard keys use an unreadable foreground/background pair | Practice | Implemented and integrated | R semantic pressed-key pair; U palette contrast; exhaustive key/palette matrix deferred |
| 30 | Color picker positioning and listener cleanup are fragile | Practice | Implemented and integrated | U instance/pointer lifecycle; BP bounded popover, repeated close/open and focus return |
| 31 | Color picker dragging supports only a mouse | Practice | Implemented and integrated | U pointer capture/cancel and keyboard HSV; BP touch and keyboard color changes |
| 32 | Notifications hide their delete action from keyboard and touch users | Foundations | Implemented and integrated | U persistent removal/action/focus; BPro notification return focus; deletion touch matrix remains lane evidence |
| 33 | The application shell lacks route-level recovery | Foundations | Partially addressed; scoped changes integrated | U lazy route/loading/error/not-found contracts; R build output; invalid pre-router bootstrap excluded |
| 34 | The advertised auth-disabled mode still calls Clerk-only hooks | Foundations boundary; all auth consumers | Implemented and integrated | U unavailable/loading/signed-out auth; BP anonymous Save recovery; BPro anonymous/visitor |
| 35 | The main practice component couples unrelated UI lifecycles | Practice | Partially addressed; scoped changes integrated | U prompt/clock/account/session regressions; BP configure→finish→repeat and delayed preferences |
| 36 | Word-count changes do not rebuild the prompt | Practice | Implemented and integrated | U prompt identity; BP 25→10→50→10 counts |
| 37 | Quote mode can display the previous word test | Practice | Implemented and integrated | U dataset identity; BP cold Quote and word-aligned completion |
| 38 | The visible caret ignores native input selection | Practice | Implemented and integrated | U editing/selection constraints; BP Home selection remains at append caret |
| 39 | Local settings hydration can overwrite account preferences | Practice | Implemented and integrated | U account/revision/hydration races; BP late preferences preserve active/result state |
| 40 | Displayed and ranked prompts can have different owners | Practice | Implemented and integrated | U server prompt/session ownership; BP ranked adoption, late rejection, history-only Repeat |
| 41 | Quote completion disagrees with word-aligned editing | Practice | Implemented and integrated | U shared completion/backend helper; BP exact finalization and word-aligned Quote |
| 42 | Keyboard guidance keeps demanding Backspace after historical mistakes | Practice | Implemented and integrated | U input guidance; BP historical mistake advances guidance without stale Backspace |
| 43 | Long words can be clipped with no way to see the remaining letters | Practice | Implemented and integrated | U word geometry; BP 6rem long token/wrapping/tape caret and page bounds |
| 44 | Result-word details are available only through hover | Practice | Implemented and integrated | U result details button; BP touch activation, long details and Escape focus |
| 45 | Compact and desktop text-size controls disagree | Practice | Implemented and integrated | U shared 1–6rem limits; BP 6rem long-content layout |
| 46 | Visually disabled sound and ghost settings still accept keyboard input | Practice | Implemented and integrated | U disabled sound/ghost/layout controls; R native disabled contract; full keyboard matrix remains lane evidence |
| 47 | The ghost cursor skips spaces and drifts from elapsed time | Practice | Implemented and integrated | U elapsed clock/space offsets; BP positive ghost geometry after elapsed time |
| 48 | Leaderboard time ranges disappear on smaller screens | Profiles | Implemented and integrated | BPro all ranges at 320/390/768/1440 and compact zoom-equivalent viewport |
| 49 | Leaderboard names shrink to unreadable sizes | Profiles | Implemented and integrated | BPro long names and responsive podium/table; V readability |
| 50 | Large result lists reveal themselves too slowly | Profiles leaderboard; Multiplayer race | Implemented and integrated | R index-delay removal; BPro list and BR full 50-row table immediately available |
| 51 | Race departure does not always disconnect the participant | Multiplayer | Implemented and integrated | U departure ownership; BR failed leave, retry disconnects before navigation; passive expiry deferred |
| 52 | Race host controls depend on a query-string flag | Multiplayer | Implemented and integrated | U stored ownership and forged/absent URL flag regressions |
| 53 | Missing race data produces permanent loading screens | Multiplayer | Implemented and integrated | U absent-data branches; BR loading/missing/not-yet-saved recovery |
| 54 | Race reconnect restores the avatar but not the typing state | Multiplayer; Practice input contract | Implemented and integrated | U exact snapshot/version handling; BR real input/time restoration; live reconnect unverified |
| 55 | Race progress callbacks may create a mutation feedback loop | Multiplayer | Implemented and integrated | U stable callbacks/throttle/deduplication; BR reactive echoes; original live loop unconfirmed |
| 56 | Active race exit is hidden behind Escape | Multiplayer | Implemented and integrated | U accessible leave dialog; BR visible leave, failure and retry |
| 57 | Race results exceed their grid width | Multiplayer | Implemented and integrated | BR result grid/table bounds at 320/768/1440 in both palettes |
| 58 | Race podiums and tables clip on phones | Multiplayer | Implemented and integrated | BR phone podium and bounded horizontally scrollable full table |
| 59 | The emoji picker can open outside the viewport | Multiplayer | Implemented and integrated | U named keyboard emoji choices; BR short viewport, keyboard/Escape/focus |
| 60 | Race avatars are clipped at track endpoints | Multiplayer | Implemented and integrated | BR full avatar bounds at zero and complete |
| 61 | Signed-in racers without usernames cannot proceed | Multiplayer | Implemented and integrated | U signed-in account without names can choose racer name |
| 62 | Race actions fail without useful feedback | Multiplayer | Implemented and integrated | U join/name/ready/start/end failure regressions; BR leave/recovery feedback |
| 63 | Profile headers overlap on narrow screens | Profiles | Implemented and integrated | BPro owner/visitor long-name headers and no page overflow |
| 64 | Profile history has no compact layout | Profiles | Implemented and integrated | BPro compact labeled history and bounded scroll region |
| 65 | Profile stat cards and history rows are not keyboard-operable | Profiles | Implemented and integrated | U native chart/history actions; BPro keyboard charts, disclosures and nested details |
| 66 | Achievement refresh acts on the wrong profile | Profiles | Implemented and integrated | U owner capability guard; BPro owner/visitor/anonymous and failed refresh recovery |
| 67 | Charts imply more history than they contain | Profiles | Implemented and integrated | U sample/lifetime separation; BPro 350 lifetime versus 99 valid recent sample |
| 68 | Missing historical metrics are shown as real zeros | Profiles | Implemented and integrated | U absent-versus-zero rendering; BPro legacy detail values |
| 69 | Achievement cards compress essential text on phones | Profiles | Implemented and integrated | BPro 320px achievement board/detail and keyboard focus; V readable content |
| 70 | Host plans never activate the participant plan executor | Multiplayer; Practice executor | Implemented and integrated | U room-step resolution; BJ real Join/TypingPractice executes host-selected timed preset |
| 71 | The reachable plan builder clips its editor on phones | Multiplayer | Implemented and integrated | BH phone plan editor/long title and keyboard cancel/drop |
| 72 | Timed presets are configured as timed but execute as completion tests | Multiplayer; Practice timed predicate | Implemented and integrated | U duration-or-exhaustion contract; BJ real timed preset |
| 73 | Host Stop and Reset do not control the full participant session | Multiplayer; Practice clock/input | Implemented and integrated | U run/reset versions, frozen reports and stale-write guards; BJ Stop/reset/new Start |
| 74 | Room failures trigger automatic retry loops | Multiplayer | Implemented and integrated | U bounded membership attempts; BH failure stops until explicit retry |
| 75 | Participant-card dragging blocks touch scrolling | Multiplayer | Implemented and integrated | U named drag handle; BH touch content scroll without dragging |
| 76 | Host sound-pack selections never reach participants | Multiplayer | Implemented and integrated | U room sound ownership/backend persistence; BH sound controls; live propagation unverified |
| 77 | Host controls and card sizing force horizontal overflow | Multiplayer | Implemented and integrated | BH narrow/wide/CSS-zoom controls and fullscreen dialog handoff |
| 78 | Unfinished settings expose implementation placeholders | Practice | Integrated: unsupported Race/Lesson sections omitted; Error Sound conditional on available packs | R unused Race/Lesson settings omitted; U unavailable Error Sound hidden; supported settings retained |
| 79 | Route code loads as one large initial bundle | Foundations | Partially addressed; scoped changes integrated | Build emits separate lazy page/chart chunks; U route recovery; startup performance unmeasured |
| 80 | UI behavior has little regression coverage | Integration | Implemented: unit regressions and durable browser harness | U 276 tests; BP/BPro/BH/BJ/BR runnable isolated acceptance; live gaps remain |
| 81 | Lint cannot currently run before UI changes are handed off | Integration | Implemented: supported lint and source repairs | Lint exits 0 with unchanged recommended rules; native TS7 build retained, parser uses supported TS6 API |

## Integration commits and followups

| Integration SHA | Change |
| --- | --- |
| `54229c2` | Foundations merge |
| `500bd39` | Practice merge after shared contracts |
| `4a8107b` | Profiles merge; preserve latest shared contracts and notification callback |
| `faee829` | Multiplayer merge; preserve latest Practice corrections |
| `f231f61` | Supported lint compiler/API arrangement; original tooling `d2245ff` |
| `895f5a6` | Retained Practice browser scenarios and central runner; portability hardening follows |
| `490a0d3` | Profiles source lint followup (`5604625`) |
| `edaff14` | Practice clock/callback lifecycle followup (`af03b82`) |
| `9afd803` | Unassigned legacy lint cleanup; Worker declaration project included in build |
| `418cbf9` | Admin query state owned by current token/revision; late replies cannot invalidate a new session |
| `0e9165b`, `e344dba` | Foundation refresh boundaries, carousel subscription cleanup, compatibility barrels |
| `4541d38`, `ee7ddcd` | Multiplayer state lifecycle lint corrections and shared room helper separation |
| `d3750f0` | Preserve plan cancellation during dnd-kit keyboard-sensor startup |
| `818396e` | Mechanical shared-helper whitespace cleanup |
| `4971257`, `1c0f326` | Practice committed prompt/account transitions and fresh user-request seeds |
| `837397c` | Isolated browser harness portability, explicit fixture manifests, strict failure/geometry assertions and owned-process cleanup (`b7c3501`) |

Report-only followups are `720aa37` (Foundations `50fe25d`), `d27186e` (Multiplayer `e5216ab`), and `c57ea01` (Practice `bd8db91`). Final shared handbook/browser instructions and this acceptance ledger are delivered in the final documentation commit on this branch.

The original tooling failure was reproduced before changes. A supported parser revealed 42 baseline errors/5 warnings and 55 integrated errors/3 warnings; these are source findings, not a passing gate. Owners repaired their scope with unchanged recommended rules. Central legacy repairs remove unused private parameters/dead code, type the offline theme migration helper without running it, and include existing Worker declarations via a TypeScript project. The existing Admin route remains capability-dependent; it gains no backend implementation or new entry point.

The first integrated Host run failed rapid keyboard-drag cancellation. It failed 3/7 runs on unchanged source. Instrumentation established that dnd-kit marks the drag active before asynchronously registering its document keydown handler; rapid ArrowDown/Escape could be lost in that gap. The owner supplied a cancellation-only public-API sensor wrapper and a deterministic registration-gap browser regression. This is additional runtime evidence, not a claim that the original audit identified that precise cause. The owner then reported 20/20 serial reproducer passes; both ordinary cancellation and the deterministic startup-gap regression passed final integrated acceptance.

## Verification record

- Integrated shared-contract batch: 45 tests in five files passed (`foundations-overlays`, `foundations-theme-selection`, `connect-session`, `multiplayer-backend`, `solo-practice-completion`). Log: `/tmp/typesetgo-integration-contracts.log`.
- Final production-source checks at `1c0f326`: `bun run build` PASS; **276 tests / 31 files** PASS; `node node_modules/@typescript/native/bin/tsc --project convex/tsconfig.json --noEmit` PASS. Logs: `/tmp/typesetgo-integration-final-{build,unit,convex}.log`. Later commits only change reports, browser harness and documentation, so unchanged build/full-unit checks were not rerun. Entry bundle: 450.14 kB (136.38 kB gzip); UserStats loads as a separate 407.15 kB chunk. No oversized-bundle warning; no startup-speed claim.
- Final supported lint at `837397c`: `bun run lint` exits 0 with no errors or warnings. Log: `/tmp/typesetgo-integration-final-lint.log`. This replaces the original parser startup failure; recommended rules were not weakened.
- Final central browser acceptance at `837397c`: `bun run test:e2e` exits 0 in installed Chrome **152.0.7977.84**, September 16, 2026, 11:47–11:49 EDT. All five suites pass: seven Practice scripts, 13 Profiles check groups, eight Host tests, one real Join/session test, 12 Race tests. Log: `/tmp/typesetgo-integration-final-browser.log`. This is real component behavior against local mocked services, with external requests blocked and no live credentials.
- Final independent visual review: **14 current-run screenshots inspected**, no blocking clipping, overlap, unreadable text or dialog geometry defects in the captured regions. Report: `/tmp/typesetgo-integration-final-visual.md`. Practice captures: `/var/folders/hb/0b1xdv1j0x71lfng992wcljc0000gn/T/typesetgo-browser-acceptance/`; Profiles: `/var/folders/hb/0b1xdv1j0x71lfng992wcljc0000gn/T/typesetgo-profiles-CHtLhM/`; Host/Race: `/tmp/typesetgo-connect-*.png` and `/tmp/typesetgo-race-results-*.png`. Temporary artifacts are local evidence; the committed harness can regenerate them.
- Read-only review covered the original merged range `6c0eacb..faee829`, central/lane followups through `818396e`, final Practice source `4971257` + `1c0f326`, and all 27 harness files in `c57ea01..837397c`. No confirmed P0–P2 source/harness findings remain. Documentation corrections for middleware-served manifests and Node 22.12+ were applied. The integrated runtime keyboard-sensor defect was returned to Multiplayer and resolved before final acceptance.
- Lane implementation/source evidence remains in [Foundations](foundations.md), [Practice](practice.md), [Profiles](profiles.md), [Multiplayer](multiplayer.md). [Tooling](tooling.md) records the supported compiler/parser arrangement; the [browser guide](../../tests/browser/README.md) describes commands and fixture boundaries.
- Final ledger integrity check passes: all 81 original titles appear exactly once in audit order, each with owner, implementation and verification fields; local documentation links resolve. `git diff --check` passes, the shared audit is unchanged, all fixed fixture ports are released, and main remains `6c0eacb` with its six original untracked paths.

### Final acceptance matrix

| Required flow | Integrated evidence | Boundary |
| --- | --- | --- |
| Configure → type → finish → repeat | BP word counts, cold Quote, ranked prompt adoption/finalization, history-only exact Repeat and delayed preferences | Auth and persistence are local substitutes |
| Theme changes and settings dialogs | BP narrow catalog failure/retry, variant selection, mode changes; BH on-demand host selection and settings | Representative palettes; full catalog contrast is unit-checked |
| Keyboard-only use and reduced motion | BP Tab/shortcuts/color keys; BPro chart/history/dialog focus; BH keyboard drag/Escape/focus; BR emoji/leave; reduced-motion fixtures | Browser assertions verify interactions; stills do not verify timing |
| Narrow/wide, zoom, long content, light/dark | BP/BPro/BH/BR plus V; 260–1440 CSS px, 6rem long words, long user names, viewport bounds | CSS zoom/reflow equivalent; native browser-toolbar zoom unverified |
| Profile/history/leaderboard owner and visitor | BPro owner, visitor, anonymous, 350-lifetime/99-valid-recent sample, missing metrics and nested dialogs | No live identity or deletion |
| Host/join/start/stop/reset/reconnect/leave | BH host controls/failures; BJ real executor Stop/reset/new Start; BR exact input/time restore and ordered leave; U server guards | Local room/run snapshots; real multi-device transport unverified |
| Missing data, failed requests and recovery | BP catalog/auth feedback; BPro missing/empty/refresh/delete failure; BH bounded retries; BR absent run/results and failed leave; U route recovery | Route-level thrown-query recovery is unit-checked; live failures not induced |

### Disposition

Implemented changes are committed in dependency order, and their scoped independent evidence is recorded above. There are no remaining local implementation or review blockers. Broad findings marked partial retain the explicit limits below; owner-only browser observations are labeled in the table. Deployment and live acceptance require separate authorization and an isolated target. No audit diagnosis was declared false merely because a new fixture passed.

## Remaining limitations

- No live Clerk/Convex validation, production data mutations, migrations, pushes, deployment or merge into main. Later rollout must coordinate local frontend/backend contracts.
- Real multi-device network reconnect and passive disconnect expiry remain unverified/deferred; exact input restoration is tested with mocks. Legacy attempts without exact text explicitly restart.
- Native browser-toolbar zoom is separate from CSS viewport reflow/CSS zoom. Current lane evidence covers the latter.
- Theme catalog startup latency, constrained-device performance and baseline scroll overshoot were not profiled/reproduced. Source contract improvements are not speed claims.
- Dormant components and unfinished autonomous plan/features remain deferred. Route boundaries do not cover invalid configuration before router construction.
- No audit diagnosis has been conclusively disproved. The progress-loop and drawer/scroll appearance diagnoses retain their original runtime uncertainty. Lint local-mutation diagnostics in synchronous chart loops were analyzer findings, not evidence of an observed post-render chart bug.
- A compact generated theme search catalog and measured constrained-device startup work remain deferred. Active consumer semantic/matte/motion migration is implemented, but exhaustive every-component/every-palette visual certification is outside the representative matrix.
- The plan sensor repair buffers cancellation only across upstream registration. Movement keys in that tiny upstream activation window are not replayed; ordinary registered keyboard movement/drop and pointer reorder are verified.
