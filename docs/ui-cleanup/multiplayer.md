# Multiplayer UI cleanup

Manager: `codex/ui-multiplayer`, `/Users/dimitri/Code/typesetgo-worktrees/multiplayer`, based on main at `6c0eacb08d0fe8293e57634751902808af8492af`.
The original main checkout contains unrelated untracked files and is not modified. No backend deployment or live database mutation is authorized or used.

## Lifecycle contract (established before implementation)

| State | Owner and transition |
| --- | --- |
| Room membership / connection | Convex participants; joining reconnects the matching room+session record. Explicit departure disconnects before navigation. A race host departure transfers ownership to the earliest remaining connected racer; an empty room may be rejoined by its original owner. Browser/network loss without explicit departure is not a reliable leave event. |
| Connect run | Convex room `status` plus optional monotonic `runVersion` (legacy default 0). Start from waiting creates a fresh run and clears participant attempts. Stop returns to waiting and freezes input/timers/emissions; it does not manufacture a completed result. Starting again begins a fresh attempt. |
| Participant reset | Convex optional monotonic `resetVersion` (legacy 0). Reset clears input/stats and increments the version; stale writes carrying prior versions are rejected/ignored. Join remounts the executor on room/run/participant-reset/step identity. |
| Plan step | Host owns `settings.planIndex`; a plan is a host-led sequence. Join resolves the selected item into concrete typing settings before rendering the existing executor. Host navigation is bounded and occurs while waiting; unsupported automatic Wait for All and Zen Waiting controls are hidden. Participants do not run a second local plan executor. |
| Connect prompt | Existing TypingPractice generates the prompt from concrete locked settings; preset content is host-owned. This repair does not introduce synchronized random prompts for practice rooms. Race prompt is room-owned `targetText`. |
| Input and timer | Practice-owned typing executor owns local exact input/clock. Connect inactive state freezes both. Timed presets use the time predicate and stop at duration or earlier supplied-text exhaustion, which is explained in Host. |
| Race run | `raceStartTime` identifies a run, room targetText is immutable during it, raceEndTime identifies completion. Server room ownership drives host controls. |
| Race resume | Persist exact `typedText` plus elapsed time; seed TypingArea once per room/raceStartTime/participant/reset identity. Never infer text from correct-character count. Legacy progress without exact input must clearly restart/reset instead of pretending to resume. |
| Progress reporting | Stable callbacks keyed by scalar identity, deduplicated snapshots and bounded cadence. Server rejects disconnected, stopped, or stale run/reset writes. Finish and end operations are idempotent. |
| Sound | Host owns enabled and typing/warning/error pack selection; these cross room settings and Join adapter. Missing packs are shown honestly. |

Coordinated optional shared schema additions: optional rooms.runVersion, participants.resetVersion, and room settings typingSound/warningSound/errorSound. Practice owns TypingPractice/TypingArea timer/input behavior and compatible resume props. Multiplayer owns all room/participant/race functions and dedicated helpers; no worker edits those files.

## Implementation ownership

- Manager: common multiplayer backend functions/helpers, lifecycle integration, report, full validation.
- Host worker: `codex/ui-multiplayer-host`, `/Users/dimitri/Code/typesetgo-worktrees/multiplayer-host`; Host/Join/Connect, connect and plan components, types/plan, SoundController and SoundSettingsModal, dedicated tests/fixtures.
- Race worker: `codex/ui-multiplayer-race`, `/Users/dimitri/Code/typesetgo-worktrees/multiplayer-race`; Race*.tsx and race components, dedicated tests/fixtures.
- Read-only reviewer: integrated manager diff once concrete changes exist.

## Evidence and status

Source-confirmed before edits: create/join effects retry when pending clears; Connect sends literal plan mode but never starts the local executor; per-participant reset has no observable version; room sound adapter drops selected packs; race departure and missing-data branches contradict membership/query contracts; reactive participant object is captured by the progress callback. The live feedback-loop diagnosis remains unverified; deterministic reactive-echo regressions cover the identified source risk.

Validation below uses real components and real Convex handlers with isolated fixtures. No claim of live multiplayer verification is made.

### Backend evidence

- Added an in-memory database fixture and executed real Convex handlers without creating a Convex client. Three baseline regressions failed, then passed after the membership repair: duplicate membership after visiting another room, stale readiness after departure, and readiness accepted for disconnected participants.
- `c3331c7`: membership lookup is room-scoped; departure clears readiness and transfers race ownership; room-mode validation precedes join; active races reject new entrants; starts/end/results are idempotent; end and result persistence share one transaction; resetting removes the previous race snapshot.
- Six targeted backend tests pass. `bunx tsc --project convex/tsconfig.json --noEmit` passes.
- `bun run lint` independently fails before source analysis: installed typescript-eslint rejects TypeScript 7.0. This reproduces the audited baseline and is not a passing lint result.
- Schema integration coordinated with Foundations (no schema ownership), Practice (no overlapping schema edits), and Profiles (no schema/query changes); no separate integration task exists. This manager isolates the additions in a dedicated local contract commit, for the eventual coordinator to integrate first. All additions are optional and require no migration. Exact intended additions are `rooms.runVersion: v.optional(v.number())`, `participants.resetVersion: v.optional(v.number())`, and room settings `typingSound`, `warningSound`, `errorSound`: each `v.optional(v.string())`. Legacy version values are interpreted as zero.

### Shared integration contracts and merge order

1. **Schema contract `8babb6f`**: optional `rooms.runVersion`, `participants.resetVersion`, and three room sound-pack fields. No existing data rewrite is necessary. The shared schema was coordinated with all three other lane managers; none had overlapping changes. This manager carries the isolated commit until a separate integration coordinator exists.
2. **Backend lifecycle `448d22e`** (after `c3331c7`, `2eabf7d`, `a9ad7d9`, `909e52b`): generated API gains `rooms.resetPractice({roomId, hostSessionId?})`; `setStatus` starts a fresh versioned attempt, stops without clearing it, and ignores duplicate same-state requests. Participant resets clear attempts and increment a version. Race progress/finish carry `raceStartTime` and `resetVersion`; Connect progress carries `runVersion` and `resetVersion`. Optional hostSessionId checks preserve session-owned UI compatibility; this is not a redesign of authentication.
3. **Practice-owned executor contracts**: original worker commits `9faba955` + `3b8f11a`, locally `4759b30` + `c43f3ad`, add `TypingArea.initialInput`/`initialElapsedMs`, retain `initialTypedText`, emit exact `TypingStats.typedText`, and prevent inactive/stale callback emission. The full Practice engine is now integrated; the real Join browser test verifies its 45-second timed preset, stopped clock/input/reporting, fresh starts, participant resets, and absence of solo writes.
4. **Frontend callers must accompany guarded backend changes.** The first reviewer pass flagged that the old RaceActive does not send raceStartTime; its writes are intentionally rejected by the new guard. Race worker payload tests cover the new arguments. Do not deploy backend guards independently of their callers. No deployment was performed.

Owner-authored UI dependencies integrated for faithful layout/theme/auth checks: Foundations originals `95332d8`, `989e241`, `596e846`, `2fbac30`, `16d3843` (local `df15aa8`, `1ccd6a5`, `cc821d2`, `30c3a88`, `19566de`); Practice ColorPicker `7681ef9` (local `22c68a3`). These are upstream lane work, not multiplayer-authored global changes.

### Additional backend validation

At `448d22e`, 14 targeted tests across two files passed and Convex TypeScript passed. Cases include room-specific reconnect, explicit disconnect/readiness/host transfer, room-mode validation before mutation, duplicate starts/ends, atomic stable result snapshot, stale race/run/reset writes, exact erroneous input persistence, atomic final report and ranking, late-report immunity, malformed/deleted room recovery, selected-plan validation, start/stop/new-start semantics, individual/room reset, and sound contract persistence.

A read-only reviewer examined `6c0eacb..cc821d2` and then `2eabf7d..448d22e`. The initial caller integration requirement is recorded above; the second backend pass found no confirmed change-caused defects. Final integrated review findings and resolutions are recorded below.

### Scope decisions

- Plans are now explicitly host-led: select a step, start it for the room, stop, then select the next step. Automatic Wait for All, Zen Waiting, and autonomous plan/result aggregation remain unfinished and are not enabled.
- Timed presets end at the configured duration or earlier when their supplied text is exhausted. This bounded-text policy is visible in configuration.
- Exact race resume is supported for newly saved attempts. Legacy progress without saved input cannot reconstruct mistakes, so it requires an explicit restart. It never invents a correct prefix.
- Explicit in-app departure is covered. Browser termination/network disappearance is not a reliable disconnect signal; passive presence/heartbeat expiration remains a separate backend feature.
- The audit's live progress-loop claim was a source-traced risk, not a reproduced live incident. Mocked reactive-snapshot tests verify stable callbacks and deduplicated/bounded reports; no live-network improvement is claimed.
- Main Race navigation and dormant solo plan/ghost/settings implementations remain disabled or untouched.

## Audit coverage

| Audit section title | Implemented contract / validation |
| --- | --- |
| Host plans never activate the participant plan executor | Resolve the selected host-led step to concrete locked settings; show true selected-step progress. No autonomous executor or unsupported synchronization affordances. |
| The reachable plan builder clips its editor on phones | Stacked compact editor with bounded dialog scrolling and wrapping options. |
| Timed presets are configured as timed but execute as completion tests | Shared timed predicate in configuration and cards; custom duration edits duration; Practice-owned executor follows the agreed bounded timed-preset policy. |
| Host Stop and Reset do not control the full participant session | Explicit stopped state plus room/run/reset identity; stale server reports ignored; real Join timer/input/reporting checks pass. |
| Room failures trigger automatic retry loops | One explicit attempt, recoverable visible errors, deliberate Retry; both original rejection loops reproduced in mocked tests. |
| Participant-card dragging blocks touch scrolling | Handle-only pointer/keyboard dragging with activation threshold and persistent actions. |
| Host sound-pack selections never reach participants | Preserve pack selections through schema, room updates and participant adapter; no error-pack capability invented. |
| Host controls and card sizing force horizontal overflow | Intrinsic bounded card tracks; wrapping toolbar; list/grid compact compositions. |
| Race departure does not always disconnect the participant | Await the shared disconnect action before navigation, preserve errors for Retry, and transfer host server-side. |
| Race host controls depend on a query-string flag | Derive UI ownership from room.hostId and current session; URL flags have no ownership role. |
| Missing race data produces permanent loading screens | Separate unresolved/missing/wrong-mode/membership/results states, including malformed room IDs. |
| Race reconnect restores the avatar but not the typing state | Exact typedText + elapsed snapshot seeded once per run/reset key; legacy attempts explicitly restart. |
| Race progress callbacks may create a mutation feedback loop | Scalar callback identity, deduplicated single-flight 500ms reports, stable echoes; no claim of reproduced live loop. |
| Active race exit is hidden behind Escape | Visible Leave action plus a shared focus-managed confirmation; Escape remains supported. |
| Race results exceed their grid width | Fractional minmax tracks; spectators get the full results width. |
| Race podiums and tables clip on phones | Flexible podium columns, readable long-name handling, deliberate horizontally scrollable table. |
| The emoji picker can open outside the viewport | Shared collision-aware Popover, bounded scrolling and named keyboard controls. |
| Race avatars are clipped at track endpoints | Reserve avatar radius in track geometry; restrained motion and endpoint browser checks. |
| Signed-in racers without usernames cannot proceed | Validated display-name fallback and editable missing-name state; mocked signed-in coverage. |
| Race actions fail without useful feedback | Scoped pending/errors, preserved input, explicit Retry, no automatic retry cycles. |
| Large result lists reveal themselves too slowly | Race result content appears without index-dependent entrance delays; reduced-motion checks. |
| Dialog behavior is implemented repeatedly and inconsistently | Owned Host/plan/sound/race overlays use shared Dialog/Popover; nested Escape/focus delegated to Foundations. |

## Remaining integration coordination

- A final integration coordinator should update `README.md`, root `AGENTS.md`, and `docs/AGENTS.md` for the new mocked Playwright fixtures/runner commands. Both handbooks currently say the e2e folder is empty. Those shared documents are outside the named multiplayer/Foundation ownership; Foundations confirmed leaving a precise request rather than editing another lane's files.
- Preserve the Foundations provider-stack/route documentation update request together with that testing update. The new test fixtures run without Clerk or Convex credentials and must never be pointed at the live development deployment.

### Integrated browser verification

Manager worktree at `a852aab` passed all **12 Race browser checks** with the real Practice TypingArea and shared theme/overlay dependencies. The fixture refuses existing servers, aborts non-loopback requests, and aliases Convex to an isolated in-memory UI store. Command:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Users/dimitri/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' bunx playwright test --config tests/fixtures/race/playwright.config.ts
```

The installed Playwright expected browser revision 1234, which was absent; Chromium 1243 was explicitly selected. No download or live backend was used. Matrix: 320/768/1440 CSS-pixel results in light/dark, spectator width, 200% CSS zoom (not native browser zoom), reduced motion, 50 long-name racers, scrollable table, narrow/short emoji collision and keyboard focus, delayed/failed departure with Retry, 0/100% avatar bounds, loading/missing/no-results recovery, exact erroneous input + elapsed resume, ten reactive echoes, reset identity, and visible Leave/Escape focus restoration. Manager visually inspected the 320px dark results screenshot; source worker also inspected the other captured layouts. Screenshots remain in `/tmp/typesetgo-race-results-{320,768,1440}-{light,dark}.png`.

### Final review and verification

- Integrated review found and resolved four additional defects: departed finishers canceling the finish deadline (`c616774`), fullscreen confirmations outside the fullscreen subtree (`58a829d`), Cancel navigating before an in-flight join could be disconnected (`975da0f`), and keyboard-drag Escape discarding an unsaved plan (`cc55f31` with Foundations `57e5a04`, local `9bfde34`). Each has a regression test; the join and drag tests failed before their fixes.
- Practice integration exposed a shared-bounds mismatch (Host permitted 86,400 seconds/10,000 words/10rem/500 WPM; the executor supports 25,199 seconds/9,999 words/6rem/200 WPM). A regression reproduced acceptance of a 30,000-second run before the repair. Bounds coordination and final verification are recorded in the completion entry below.
- Real Join + real TypingPractice browser test passed using a selected host plan with a 45-second timed preset and long supplied text. It verifies Stop freezes input and produces no reports during ten seconds of simulated time; fresh Start and participant reset clear the input; the reset attempt finishes at 45 seconds with matching versions; no solo typingSessions/testResults mutations occur. Browser console errors: zero. Command: `bunx playwright test --config tests/fixtures/connect-browser/playwright.real.config.ts`.
- Host browser coverage includes 360px and 1440px, light/dark, 200% CSS zoom, reduced motion, long participant names, maximum card size, deliberate failed-create/join retry, bounded plan/preset editing, focus return, genuine CDP touch scrolling without unintended dragging, actual fullscreen confirmation access, and lazy theme loading. The original six checks passed at `58a829d`; the added keyboard DnD check independently passed after `cc55f31`. Manager inspected the narrow plan screenshot: scrollable body, visible footer, no horizontal clipping. Screenshots: `/tmp/typesetgo-connect-plan-phone.png`, `/tmp/typesetgo-connect-host-phone-light.png`, `/tmp/typesetgo-connect-host-wide-dark.png`.
- At `5d493f5`, build and all **219 unit tests / 24 files** passed; Convex TypeScript passed. Race browser rerun **12/12** passed with the final Practice input dependencies. Lint independently reconfirmed the same TypeScript 7/parser startup failure, before source analysis.
- Concurrent browser fixtures initially collided in Vite's dependency cache through the linked node_modules, yielding HTTP504 Outdated Optimize Dep before Host rendered. `48bd23f` gives Race, Host and real-session fixtures separate worktree-specific temporary caches. This was a validation-harness failure, not an application pass; subsequent results are recorded below.

### Commit delivery and dependency ledger

Multiplayer-authored manager commits, in application order (upstream dependencies are listed separately):

`9312acb`, `c3331c7`, `2eabf7d`, `a9ad7d9`, `909e52b`, `8babb6f`, `448d22e`, `5fd93ea`, `617e8b2`, `a852aab`, `6e7ee3b`, `c616774`, `58a829d`, `975da0f`, `cc55f31`, `5d493f5`, `48bd23f`, `dd3b740`.

Worker source commits: Host `951a1a5`, `ea2b85e`; Race `a60bdf5`, `83af6f6`, `96f0b0f`. Worker branches/worktrees are recorded above and retained. All workers and the reviewer used GPT-6 Astra/XHigh without a service-tier override. No additional user-facing tasks or usage resets were created.

Additional owner-authored dependencies, original → local:

| Lane | Original | Local |
| --- | --- | --- |
| Foundations theme queue | `7194b49` | `3d4ed45` |
| Foundations button contrast | `902fe4d` | `2d41090` |
| Foundations nested Escape/focus | `8244849` | `c0bf148` |
| Foundations submenu/IME Escape | `d8a019b` | `5c2312a` |
| Foundations drag Escape propagation | `57e5a04` | `9bfde34` |
| Foundations preference theme revision | `1a45c97` | `04f9e89` |
| Practice preparatory presentation extraction | `06fddc8` | `16cbc31` |
| Practice shared ranges | `a3d54b3` | `6da2e34` |
| Practice presentation | `f67e604` | `260ece7` |
| Practice IME drafts | `1153bd2` | `78220a8` |
| Practice solo completion prerequisite | `6292438` | `dcf2bf2` |
| Practice engine/dataset | `ba8f1d1` | `06c8a04` |
| Practice duration range | `9b511aa` | `4a99a61` |
| Practice elapsed-empty resume | `3509de7` | `efd1498` |
| Practice CountDialog duration bound | `7e1388c` | `bfeabe5` |
| Practice pure shared limits | `d1b6dc4` | `f765e6f` |

When integrating lane branches that already contain these changes, do not cherry-pick equivalent commits twice. The multiplayer branch contains owner-authored dependencies for a validated working snapshot; global/shared/solo files were not edited by the multiplayer implementers. Apply the optional schema and lifecycle contracts with compatible frontend callers. The shared limits module must precede multiplayer limits validation, and the Foundations veto-propagation fix must precede the plan drag consumer.

## Completion status

**Implemented and verified:** all multiplayer-owned repairs in the audit coverage table. The host-led plan contract intentionally replaces an unsupported automatic-executor interpretation. Numeric controls, selected-plan validation and executor normalization share the pure `src/lib/practice-limits.ts` contract from Practice (`d1b6dc4` → `f765e6f`), consumed by `dd3b740`. Unsupported legacy values produce a visible Start error instead of silently differing from participant execution. Whole duration/word inputs are rounded visibly before submission. Boundary tests cover room versus embedded-plan ownership as well as accepted/rejected values.

Final implementation snapshot: `dd3b740` on `codex/ui-multiplayer`.

| Check | Result |
| --- | --- |
| `bun run build` | PASS, TypeScript + Vite build |
| `bun run test:run` | PASS, 224 tests / 24 files |
| `bunx tsc --project convex/tsconfig.json --noEmit` | PASS |
| Host isolated Playwright suite | PASS, 7/7; includes final font/ghost limit checks and keyboard DnD |
| Real Join + Practice isolated Playwright suite | PASS, 1/1; 45-second preset, Stop, new Start, reset, no solo writes |
| Race isolated Playwright suite | PASS, 12/12 after cache isolation |
| `bun run lint` | BLOCKED at unchanged audited typescript-eslint/TypeScript7 startup failure; no source lint result |
| `git diff --check` | PASS |
| Final independent read-only review | PASS at `dd3b740`; no remaining P0–P2 findings in integrated multiplayer diff against `6c0eacb` |

All browser fixture servers are loopback-only, refuse unrelated existing servers and use isolated mocks; no live Convex database was exercised. Browser checks cover reduced motion and CSS zoom; native browser zoom and real multi-device network reconnection remain unverified. Unit/backend fixtures invoke the actual handlers against an in-memory database. Logs are retained under `/tmp/typesetgo-multiplayer-final-{build,unit,lint,connect-browser,connect-session,race-browser}.log`.

**Deferred intentionally:** automatic plan progression/Wait for All/Zen Waiting, passive presence expiry after abrupt browser/network loss, dormant navigation/features, and shared handbook/test-runner documentation updates assigned to the integration coordinator. Legacy race attempts without exact input require explicit restart. No audited finding was conclusively disproved; the possible live progress feedback loop remains an unverified runtime diagnosis with its source-level risks addressed and mock regressions passing.

**Remaining integration dependencies:** the optional schema contract and compatible lifecycle/frontend callers must travel together; merge Practice's shared limits before `dd3b740`, and Foundations' Escape propagation before the Plan drag veto. Owner-authored dependencies are already present on this validated manager branch. Other lanes may have later unrelated fixes; use their final reports when composing the final integration. The coordinator should update the shared README/AGENTS testing documentation and deduplicate equivalent cherry-picked dependencies.

Main remains at audit commit `6c0eacb08d0fe8293e57634751902808af8492af`; its original six unrelated untracked files remain untouched. No push, deployment, backend mutation, production migration or merge into main occurred. The report itself is delivered in a final documentation-only commit after the implementation snapshot.
