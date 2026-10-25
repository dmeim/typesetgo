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

- **Test list**: Time, Words, Quote, or Custom text tests, each with difficulty/punctuation/numbers/capitals and an optional title. Tests can be edited, duplicated, reordered and removed. Tests already reached are locked while the room runs; later tests stay editable.
- **Pacing** (chosen in the lobby; Reset room to change it):
  - *Host-led*: everyone is on the same test. The host starts, pauses, restarts, and moves to the previous or next test. Finished tests are greyed and the current one is highlighted.
  - *Self-paced*: after Start, each participant moves on at their own speed. The list shows how many people are on each test and how many have finished all of them.
- **Participant settings (overrides)**: Theme (+ dark/light), Text (font, size, alignment), Ghost writer, Sounds, Keyboard (on-screen keyboard and layout). A group that is off leaves each participant's own setting in place. Changes apply live.
- **Participants**: grid or list cards with live WPM, accuracy, progress, the participant's current test (self-paced), and online/offline/left status. Sort, card size, show-offline, drag reorder, per-participant reset and remove. **Fullscreen**, **Pop out** (`window.open` popup) and **Open in new tab** show the card-only board. Board layout preferences are stored in `localStorage` (`typesetgo_connect_board:<roomId>`) and sync between the host tab and the board through the `storage` event, so the board needs no controls of its own.

### Participant view

Participants get a minimal screen: room name, Leave, a "Test N of M" indicator with a segmented strip, then the typing area with stats (and the keyboard if allowed). The typing executor is `TypingPractice` in `connectMode`: settings are locked to the current test plus overrides, paste is blocked, and Escape does not end a test early.

- Host-led results say "Waiting for the host to start the next test" and offer no Next button.
- Self-paced results offer **Next test**, which shows an **Up next** splash (title, details, and an animated list of done/next/remaining tests) that continues on its own after 2.5 s or on Enter. After the last test an **All done** summary lists per-test WPM/accuracy.
- Removed, ended, and not-a-member states each have their own screen. A removed participant needs the code from the host to rejoin.

### Reliability

The old implementation could drop students or rotate codes. The rebuild avoids that by design:

- Participant records are **never deleted for inactivity**. Heartbeats every 15 s keep `lastSeen`. The cleanup cron (`cleanupConnect`, every 30 s) only marks someone offline after 60 s of silence, and the next heartbeat brings them back. Browsers throttling background tabs therefore never kick anyone.
- Membership is a private 256-bit browser credential (hashed server-side) plus the room id, stored per room in `localStorage` (`typesetgo_connect_membership:<roomId>`). Refreshing or reopening the tab rejoins the same seat with progress intact.
- Progress reports carry `runVersion`, `stepIndex`, and `attempt`, so late reports from a previous run, test, or reset are ignored. The first finished result of an attempt is kept.
- Participant rows of ended rooms are deleted in batches of 200 by the cleanup cron; rooms past the 48-hour archive are purged.

### Deployment order

The new frontend needs the new Convex functions and tables. Deploy Convex first (`bun run convex:deploy`, an authorized live operation), then the frontend. The same release removes the pre-rebuild practice-room backend (`rooms.getByCode/setStatus/resetPractice/resume/deleteRoom`, `participants.updateStats/kick`, practice room creation and joins, and the practice capacity/reclaim pass). Cached copies of the old Connect frontend stop working once Convex is deployed and must reload.

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
