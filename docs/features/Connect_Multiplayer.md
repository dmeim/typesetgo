# Connect and Race

The Vite/React frontend uses Convex reactive queries and mutations. There is no Socket.IO server, Next.js route tree, or in-memory production room map.

## Connect

Connect is the classroom mode: a host builds an ordered list of tests, shares a 4-character code, and watches every participant live. It uses its own tables (`connectRooms`, `connectParticipants`) and functions (`convex/connect.ts`, `convex/connectCleanup.ts`, helpers in `convex/lib/connect.ts`); it does not share rows with Race.

### Routes

| Route | Page | Who |
|-------|------|-----|
| `/connect`, `/connect/join?code=XXXX` | `src/pages/Connect.tsx` | Host card (create, Recent rooms) and Join card |
| `/connect/host/:roomId` | `src/pages/ConnectHost.tsx` | Host panel |
| `/connect/host/:roomId/board` | `src/pages/ConnectBoard.tsx` | Card-only board for a pop-out window or second tab |
| `/connect/room/:roomId` | `src/pages/ConnectRoom.tsx` | Participant view |

The header shows Connect after Type/Race/Lessons, separated by a vertical divider.

### Rooms and codes

- Codes are 4 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L), allocated with `crypto.getRandomValues` and unique among live rooms. A live room keeps its code until it ends.
- A room is live until the host ends it or there has been **72 hours without host activity** (host heartbeat every 30 s while the panel is open; any host mutation also counts). Students joining or typing never end a room.
- Ended rooms are archived for **48 hours**, then deleted. During that window the host's Recent rooms list (Host card) offers **Reopen**: same name, tests, pacing and overrides, a **new code**, lobby state, and a fresh participant list. Live rooms in the list offer **Resume** (same code).
- Both durations are `CONNECT_LIVE_IDLE_HOURS` and `CONNECT_ARCHIVE_HOURS` in `src/lib/connect-types.ts`; the UI copy reads them too.
- Recent rooms come from this browser's host credential, plus, when signed in, every room owned by the Clerk account (so a signed-in teacher can reopen from another device).
- Limits: 50 tests per room, 100 participants, names 32 characters, room names 60.

### Host panel

- **Test list**: Time, Words, Quote, or Custom text tests, each with difficulty/punctuation/numbers/capitals and an optional title, plus **Break** steps (5 s to 30 min, optional title). Tests can be edited, duplicated, reordered and removed. Tests already reached are locked while the room runs; later tests stay editable. A list needs at least one typing test.
- **Lessons run themselves.** After Start, both pacings move through the list without further clicks. Timing helpers live in `src/lib/connect-types.ts`; the host-led flow is `convex/lib/connectFlow.ts`.
  - A test ends for the whole room (host-led) when its clock runs out (timed tests: duration plus `CONNECT_TIMED_GRACE_MS`, 5 s, measured from the step start) or, for word/quote/custom-text tests, once everyone taking part has finished. Taking part means connected, not left or removed, and not a late arrival. Someone leaving, being removed, or going offline re-checks this. A test with nobody taking part waits.
  - When a test ends, the room records `stepEndedAt` and students see results with a countdown for `CONNECT_RESULTS_MS` (10 s). Students still typing a timed test are finished on the spot (`TypingPractice` `forceFinish`); a final snapshot arriving during results still counts.
  - A break right after a test plays **on the results screen**: results last as long as the break (never under 10 s) and the room then skips the break (`stepAfterResults`). A break that follows another break or starts the list shows the full-screen countdown.
  - Self-paced: finishing a test records `finishedAt`, which starts the same results countdown; the client calls `advance` when it ends. Students can skip plain results with Next test/Enter, but a following break must run its course (the server checks `resultsEndAt`).
  - Host-led rooms schedule one `internal.connect.tick` per upcoming event (break end, timed-test end, results end). Jobs carry `runVersion` and re-check the time, so jobs from an earlier step, run, or a pause are no-ops. `endBreak` remains as an alias for jobs scheduled before `tick` existed. Next and Previous still move everyone immediately.
  - Pausing freezes every clock: resuming shifts `stepStartedAt` and `stepEndedAt` (and each self-paced participant's `stepStartedAt` and `finishedAt`) by the paused time.
- **Breaks** (`mode: "break"`, `duration` in seconds, 10 s to 30 min) record no result and accept no progress.
  - The host's run summary shows "Break, next test in m:ss"; cards show "Break · m:ss left".
- **Pacing** (chosen in the lobby; Reset room to change it):
  - *Host-led*: everyone is on the same test and the lesson advances on its own. The host can pause, restart, or move to the previous or next test at any time. The run summary shows what the room is waiting on ("Ends in 0:12", "2 of 5 finished", "Break, next test in 0:40"). Finished tests are greyed and the current one is highlighted.
  - *Self-paced*: after Start, each participant moves on at their own speed. The list shows how many people are on each test and how many have finished all of them.
- **Late arrivals** (host-led): someone who joins while a test is running or paused sits it out. `join` stores the room's `runVersion` as `lateForRun`, and `isWaitingForNextTest` (`src/lib/connect-types.ts`) holds them while the room is still on that run: progress is rejected, the participant sees "You'll start with the next test", and their card reads "Joins next test". Next, Previous and Restart test all start a new run, so they join in automatically. Joining in the lobby or during a break is not late, and self-paced rooms start late arrivals at test 1. A removed participant who rejoins mid-test is late too. The card's reset button ("Let them start this test now") clears `lateForRun` so the host can let someone in early.
- **Participant settings (overrides)**: Theme (+ dark/light), Text (font, size, alignment), Ghost writer, Sounds, Keyboard (on-screen keyboard and layout). A group that is off leaves each participant's own setting in place. Changes apply live.
- **Participants**: grid or list cards with live WPM, accuracy, progress, the participant's current test (self-paced), and online/offline/left status. Cards have no status badge; the progress bar shows whether someone has finished (the status stays available to screen readers and as `data-status`). In the grid, reset and remove sit in the name row. In the list, each row reads name, WPM, accuracy, progress, then actions. Sort, card size, show-offline, drag reorder, per-participant reset and remove. **Fullscreen**, **Pop out** (`window.open` popup) and **Open in new tab** show the card-only board. Board layout preferences are stored in `localStorage` (`typesetgo_connect_board:<roomId>`) and sync between the host tab and the board through the `storage` event, so the board needs no controls of its own. The board's header has its own fullscreen button for the pop-out window or tab.

### Participant view

Participants get a minimal screen: room name, Leave, a "Test N of M" indicator with a segmented strip, then the typing area with stats (and the keyboard if allowed). The typing executor is `TypingPractice` in `connectMode`: settings are locked to the current test plus overrides, paste is blocked, and Escape does not end a test early.

- Results show a countdown under the stats: "Next: Word test in 0:07", "Stretch · Next: Word test in 1:20" when a break follows, or "Finishing in 0:05" after the last test. Host-led students who finish early see "Waiting for everyone to finish" until the room ends the test.
- A standalone break shows the break title, a large countdown, a progress bar, and the next test's title. While the host has paused, every countdown holds.
- Self-paced results also offer **Next test**/Enter to skip plain results; that shows an **Up next** splash (title, details, and an animated list of done/next/remaining tests) that continues after 2.5 s. After the last test an **All done** summary lists per-test WPM/accuracy.
- **Theme scoping.** A host theme override applies to the whole room: `connectThemeStyle` sets every variable the page theme sets (`themeCSSVariables` in `src/lib/theme-css.ts`) plus `color-scheme` on `RoomPage`, which also carries a `dark`/`light` class so Tailwind `dark:` variants follow the room. `RoomPage` provides `PortalContainerContext`, so popovers, menus and dialogs opened in the room mount inside it and keep the room theme. Screens shown before membership is confirmed (joining, removed, ended) use the participant's own theme.
- Removed, ended, and not-a-member states each have their own screen. A removed participant needs the code from the host to rejoin.

### Reliability

The old implementation could drop students or rotate codes. The rebuild avoids that by design:

- Participant records are **never deleted for inactivity**. Heartbeats every 15 s keep `lastSeen`. The cleanup cron (`cleanupConnect`, every 30 s) only marks someone offline after 60 s of silence, and the next heartbeat brings them back. Browsers throttling background tabs therefore never kick anyone.
- Membership is a private 256-bit browser credential (hashed server-side) plus the room id, stored per room in `localStorage` (`typesetgo_connect_membership:<roomId>`). Refreshing or reopening the tab rejoins the same seat with progress intact.
- Progress reports carry `runVersion`, `stepIndex`, and `attempt`, so late reports from a previous run, test, or reset are ignored. The first finished result of an attempt is kept.
- Participant rows of ended rooms are deleted in batches of 200 by the cleanup cron; rooms past the 48-hour archive are purged.

### Deployment order

The new frontend needs the new Convex functions and tables. Deploy Convex first (`bun run convex:deploy`, an authorized live operation), then the frontend. The same release removes the pre-rebuild practice-room backend (`rooms.getByCode/setStatus/resetPractice/resume/deleteRoom`, `participants.updateStats/kick`, practice room creation and joins, and the practice capacity/reclaim pass). Cached copies of the old Connect frontend stop working once Convex is deployed and must reload.

Breaks, late arrivals and self-running lessons add only optional fields (`connectRooms.stepStartedAt/pausedAt/stepEndedAt`, `connectParticipants.stepStartedAt/lateForRun/finishedAt`), the `break` test mode, and the internal `connect.tick` mutation (`connect.endBreak` kept as an alias), so existing rows stay valid. Deploy Convex before the frontend: the old backend never sets `stepEndedAt` or `finishedAt`, so the new frontend would wait on it forever. Convex module paths may only contain letters, digits, underscores and periods, so backend helpers use camelCase file names (`convex/lib/connectFlow.ts`).

The `rooms` and `participants` schema is unchanged, so leftover practice rows still validate on deploy. Those rooms can no longer be joined. Once they go 15 minutes without a heartbeat, the presence cron deletes them along with their participants. No other table is touched: test results, typing sessions, users, achievements, streaks and stats stay as they are.

## Race ownership and presence

`src/lib/multiplayer-identity.ts` initializes a stable browser session ID and a random 256-bit credential outside render-time storage snapshots. The backend stores a hash of the credential and omits it from public room/participant data. IDs identify records; the private credential authorizes host or member actions. Denied storage falls back to memory for the current page lifetime; a reload cannot restore credentials that were never persisted.

Presence heartbeats update `lastSeen` and extend room retention. Scheduled cleanup applies disconnect behavior after 75 seconds without participant activity (including reconnect grace), checks race completion, and transfers a vanished Race host to an eligible connected participant. If the host left a waiting race alone, the next racer to join becomes host. Rooms expire after 15 minutes without heartbeat renewal and their associated data is removed in bounded room batches. Explicit Leave and End room remain available; browser unload is not the sole cleanup mechanism.

`convex/rooms.ts` and `convex/participants.ts` now serve Race only: `rooms.create` always makes a race room, and `participants.join` and `resetStats` reject any other room type. A race room holds at most 64 memberships, and a disconnected racer can rejoin a running race within 30 seconds. Memberships are not reclaimed for capacity; they and the race result snapshot are removed when the room expires.

Legacy rooms without a credential cannot be safely claimed. They are treated as expired and the user creates a new room. Clearing browser storage similarly loses ownership; public record IDs cannot recover it.

## Race

`RaceLobby`, `RaceActive`, and `RaceResults` own lobby readiness, strict typing progress, and the podium. A finish requires the complete target; the server records elapsed time and assigns positions using that time with a stable tie-breaker. A client that finishes before the server countdown ends receives an explicit retry response. Backend completion writes a race snapshot in the same transaction using the live position rule. Run/start and reset identity reject stale updates. Race remains a separately routed feature; navigation visibility is controlled by the app route configuration.

## Checks

- `tests/unit/connect-contract.test.ts` (`convex-test`): codes, credentials and forged callers, host liveness and 72-hour idle end, archive/reopen with a new code, pacing, locked tests, stale-attempt rejection, offline marking without removal, and cleanup batches.
- `tests/unit/connect-landing.test.tsx`, `connect-host-panel.test.tsx`, `connect-room.test.tsx`, `connect-board.test.tsx`: landing/join/recent rooms, host panel controls, the participant view (host-led waiting, self-paced splash, summary, removed/ended), and board cards.
- `tests/unit/multiplayer-contract.test.ts` (`convex-test`) and `multiplayer-backend.test.ts`: Race credentials and forged callers, host transfer, finishes and snapshots, expiry cleanup, and rejection of leftover practice rooms.
- Browser suites `connect` and `race` run against local mocks; see [browser acceptance](../../tests/browser/README.md). These tests never contact the live deployment.
