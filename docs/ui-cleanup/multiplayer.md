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

Source-confirmed before edits: create/join effects retry when pending clears; Connect sends literal plan mode but never starts the local executor; per-participant reset has no observable version; room sound adapter drops selected packs; race departure and missing-data branches contradict membership/query contracts; reactive participant object is captured by the progress callback. Actual feedback-loop runtime reproduction remains pending.

Implementation and validation evidence will be appended as work completes. No claim of live multiplayer verification is made.

### Backend evidence (in progress)

- Added an in-memory database fixture and executed real Convex handlers without creating a Convex client. Three baseline regressions failed, then passed after the membership repair: duplicate membership after visiting another room, stale readiness after departure, and readiness accepted for disconnected participants.
- `c3331c7`: membership lookup is room-scoped; departure clears readiness and transfers race ownership; room-mode validation precedes join; active races reject new entrants; starts/end/results are idempotent; end and result persistence share one transaction; resetting removes the previous race snapshot.
- Six targeted backend tests pass. `bunx tsc --project convex/tsconfig.json --noEmit` passes.
- `bun run lint` independently fails before source analysis: installed typescript-eslint rejects TypeScript 7.0. This reproduces the audited baseline and is not a passing lint result.
- Schema integration coordinated with Foundations (no schema ownership), Practice (no overlapping schema edits), and Profiles (no schema/query changes); no separate integration task exists. This manager isolates the additions in a dedicated local contract commit, for the eventual coordinator to integrate first. All additions are optional and require no migration. Exact intended additions are `rooms.runVersion: v.optional(v.number())`, `participants.resetVersion: v.optional(v.number())`, and room settings `typingSound`, `warningSound`, `errorSound`: each `v.optional(v.string())`. Legacy version values are interpreted as zero.
