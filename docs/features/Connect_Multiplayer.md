# Connect and Race

The Vite/React frontend uses Convex reactive queries and mutations. There is no Socket.IO server, Next.js route tree, or in-memory production room map.

## Connect

Connect is the classroom mode: a host builds an ordered list of tests, shares a 4-character code, and watches every participant live. It uses its own tables (`connectRooms`, `connectParticipants`) and functions (`convex/connect.ts`, `convex/connectCleanup.ts`, helpers in `convex/lib/connect.ts`); it does not share rows with Race.

### Routes

| Route | Page | Who |
|-------|------|-----|
| `/connect`, `/connect/join?code=XXXX` | `src/pages/Connect.tsx` | One card with a Join / Host switch (Join first; Host holds create and Recent rooms) |
| `/connect/host/:roomId` | `src/pages/ConnectHost.tsx` | Host panel |
| `/connect/host/:roomId/board` | `src/pages/ConnectBoard.tsx` | Card-only board for a pop-out window or second tab |
| `/connect/room/:roomId` | `src/pages/ConnectRoom.tsx` | Participant view |

The header shows Connect after Type/Race/Lessons, separated by a vertical divider.

### Look and feel

The pages follow the locked-in `/temp-connect` mockup (`src/components/temp/connect/`), rebuilt on the real data. Shared pieces live in `src/components/connect/`: `ConnectParts.tsx` (card, sliding pills, switch, two-tap confirm button), `ConnectBadges.tsx` (code tiles, room status badge, test dots, progress bar, presence dot, read-only test row) and `connect-motion.ts` (the one spring every Connect animation uses). Avatars are always `ConnectAvatar`.

- **Landing**: a hero ("Type together, live.") above one card. Its switch opens on **Join a room**: four code boxes that look the room up as you type ("Found it!" with the host's name), then either "Joining as <username>" for a signed-in player or "What should we call you?" for a guest. Join room stays disabled until the room is found and a name or account is ready. **Host a room** holds the create form and Your recent rooms.
- **Host panel** (`HostPanel.tsx`): header (rename, End room) over two columns: **Run the room** (status, what the room waits on, test dots, Start/Pause/Resume, Previous/Next, Restart test, Reset room, pacing), **Tests** and **Everyone gets** on the left; **Room code** (copy code/link, Show big) and **Who's here** on the right. The **Live board** spans the bottom. On phones the cards stack code, run, roster, tests, Everyone gets, board.
- End room and Reset room ask for a second tap ("Tap again to end", "Tap again: clears this run's results") instead of opening a dialog. Removing or restarting a player confirms inline in the roster row.

### Rooms and codes

- Codes are 4 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L), allocated with `crypto.getRandomValues` and unique among live rooms. A live room keeps its code until it ends.
- A room is live until the host ends it or there has been **72 hours without host activity** (host heartbeat every 30 s while the panel is open; any host mutation also counts). Students joining or typing never end a room.
- Ended rooms are archived for **48 hours**, then deleted. During that window the host's Recent rooms list (Host card) offers **Reopen**: same name, tests, pacing and overrides, a **new code**, lobby state, and a fresh participant list. Live rooms in the list offer **Resume** (same code).
- Both durations are `CONNECT_LIVE_IDLE_HOURS` and `CONNECT_ARCHIVE_HOURS` in `src/lib/connect-types.ts`; the UI copy reads them too.
- Recent rooms come from this browser's host credential, plus, when signed in, every room owned by the Clerk account (so a signed-in teacher can reopen from another device).
- Limits: 50 tests per room, 100 participants, names 32 characters, room names 60.
- **Signed-in joins.** A signed-in player only types the code: the Join card shows "Joining as <username>" with their picture (from `connect.joinAccount`) and calls `join` with `asAccount: true`. The server then ignores any typed name and uses the account's username (shortened to 32 characters) and its picture, kept only when it is an `https://img.clerk.com` or `images.clerk.dev` address, because avatar URLs are synced from the browser. "Use a name" joins as a guest instead, and a player whose account row has not synced yet is asked for a name. Signed-out players type a name and get a letter avatar.
- **One seat per account.** `connectParticipants.userId` (index `by_room_user`) ties a signed-in seat to the account, so joining from another device takes the seat over with its results; the old tab loses access. A guest seat in the same browser is upgraded to the account. When a different account (or a guest) joins from a browser that already holds someone else's seat, that seat is set aside as an offline card rather than handed over. Public participant data exposes `signedIn` and `avatarUrl`, never `userId`.

### Host panel

- **Test list** (Tests card): Time, Words, Quote, or Custom text tests, each with difficulty/punctuation/numbers/capitals and an optional title, plus **Break** steps (5 s to 30 min, optional title). Tap a test to edit it in place; "Add a test or break" opens the editor at the bottom, and quick-add chips add common tests in one tap. Tests can be duplicated, removed, and reordered by dragging the handle or with the arrow keys on it (a drag saves once, when it ends). Tests already reached are locked while the room runs; later tests stay editable. A list needs at least one typing test.
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
  - *Together* (host-led, `pacing: "host"`): everyone is on the same test and the lesson advances on its own. The host can pause, restart, or move to the previous or next test at any time. The run summary shows what the room is waiting on ("Ends in 0:12", "2 of 5 finished", "Break, next test in 0:40"). Finished tests are greyed and the current one is highlighted.
  - *Own pace* (self-paced, `pacing: "participant"`): after Start, each participant moves on at their own speed. The list shows how many people are on each test and how many have finished all of them.
- **Late arrivals** (host-led): someone who joins while a test is running or paused sits it out. `join` stores the room's `runVersion` as `lateForRun`, and `isWaitingForNextTest` (`src/lib/connect-types.ts`) holds them while the room is still on that run: progress is rejected, the participant sees "You'll start with the next test", and their card reads "Joins next test". Next, Previous and Restart test all start a new run, so they join in automatically. Joining in the lobby or during a break is not late, and self-paced rooms start late arrivals at test 1. A removed participant who rejoins mid-test is late too. In Who's here, the row's play button ("Let <name> start now") clears `lateForRun` so the host can let someone in early.
- **Everyone gets (overrides)**: Theme (+ dark/light), Text (font, size, alignment), Ghost racer (show, speed), Sounds (on/off, typing and warning sound), On-screen keyboard (show, layout). Each group has a switch ("Everyone gets the same …") and a one-line summary; its controls only show while it is on. A group that is off leaves each participant's own setting in place and keeps its values for when it is turned back on. Changes apply live. The mockup's keyboard style picker is not offered because overrides have no field for it.
- **Who's here** (roster): each player's picture, presence, status and progress, with **Restart <name>'s attempt** (or **Let <name> start now** for a late arrival) and **Remove <name>**, both confirmed inline in the row.
- **Live board**: three looks: **Ribbon** cards (default; the name is the headline and the card fills with progress, crown beside the name), **Big number** cards (the speed is the headline, the progress bar runs along the bottom edge) or a **List** of rows (`cardStyle` and `layout` board prefs; the cards share `card-parts.tsx`, and long names shrink to fit on a fixed-height line so every card stays the same height). Each look has its own grid minimum and gap (`BOARD_GRID` in `use-board-fit.ts`). Cards show live WPM (average once someone is done), accuracy, progress, a status chip that shows time or words left while typing, the self-paced player's own test dots, and a crown on the fastest player who is still here. The sort (Joined, Name, WPM, Accuracy, Progress, Your order) and its direction sit in the board's title row (`BoardSortControls`); below it, board settings (`BoardViewControls`): Ribbon / Big number / List, card size, **Fit**, Offline and Pictures (off shows everyone as a letter, e.g. on a projector). Fit makes the cards as big as they can be with every card on screen at once (`useBoardFit` and `fitCardScale` in `src/components/connect/board/`): each window works out its own size from its own height, as if the `[data-board]` section were at the top of the window, so the host tab and a projector pop-out can differ. It refits as players join or leave and as the window changes, ranges from 0.6x to 3x, and moving the size slider turns it off. Drag handles appear only in Your order, which starts from the order on screen. Cards carry no moderation buttons; those live in the roster. **Fullscreen** (the board section, `data-board="live"`), **Pop out** (`window.open` popup) and **New tab** show the card-only board. Board layout preferences are stored in `localStorage` (`typesetgo_connect_board:<roomId>`) and sync between the host tab and the board through the `storage` event, so the board needs no controls of its own. The board page has a strip with the room, Live status, where to join, the code tiles and its own fullscreen button.

### Participant view

Participants get a minimal screen: a top bar (avatar, room name, "Typing as <name>" with "(guest)" for guest seats, the room's sound when the host sets it, Leave), a "Test N of M" indicator with a segmented strip, then the typing area with stats (and the keyboard if allowed). The typing executor is `TypingPractice` in `connectMode`: settings are locked to the current test plus overrides, paste is blocked, and Escape does not end a test early.

- Results show a countdown under the stats: "Next: Word test in 0:07", "Stretch · Next: Word test in 1:20" when a break follows, or "Finishing in 0:05" after the last test. Host-led students who finish early see "Waiting for everyone to finish" until the room ends the test.
- The lobby reads "Waiting for <host> to start" with the test list. Classmates are not shown because the participant view does not include other players.
- A standalone break shows a countdown ring, the break title, and an "Up next" pill. While the host has paused, every countdown holds and a "Paused by <host>" overlay covers the typing area.
- Self-paced results also offer **Next test**/Enter to skip plain results; that shows an **Up next** splash (title, details, and an animated list of done/next/remaining tests) that continues after 2.5 s. After the last test an **All done** summary shows average speed and accuracy and lists per-test WPM/accuracy ("Skipped" when a test has no result).
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

Signed-in joins add only optional `connectParticipants.userId/avatarUrl`, the `by_room_user` index, the `connect.joinAccount` query, and optional `name`/`asAccount` arguments on `join`, so existing rows and the current frontend keep working. Deploy Convex first: the new Join card calls `joinAccount` and sends `asAccount`. Rolling the schema back later needs the new fields kept, or the rooms that hold them to be cleaned up first.

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
- `tests/unit/connect-landing.test.tsx`, `connect-host-panel.test.tsx`, `connect-room.test.tsx`, `connect-board.test.tsx`: the Join/Host switch, code lookup and join (guest and signed-in), recent rooms; host panel cards (tests, run controls, two-tap End/Reset, code, roster restart/remove, live board open buttons, Everyone gets); the participant view (lobby, guest marker and room sound, host-led waiting, self-paced splash, summary, removed/ended); and board cards (status chip, leader crown, drag handles only in Your order, pictures or letters) and controls.
- `tests/unit/multiplayer-contract.test.ts` (`convex-test`) and `multiplayer-backend.test.ts`: Race credentials and forged callers, host transfer, finishes and snapshots, expiry cleanup, and rejection of leftover practice rooms.
- Browser suites `connect` and `race` run against local mocks; see [browser acceptance](../../tests/browser/README.md). These tests never contact the live deployment.
