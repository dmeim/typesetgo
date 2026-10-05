# Connect and Race

The Vite/React frontend uses Convex reactive queries and mutations. There is no Socket.IO server, Next.js route tree, or in-memory production room map.

## Connect

`src/pages/Host.tsx` creates a room through `convex/rooms.ts` and replaces the creation route with `/connect/host/:roomId`. Reloading that route resumes the same room if this browser retains its private ownership credential. The editor hydrates from stored settings; Apply or Start saves the draft deliberately. Stop/reset operations retain run and participant reset versions so delayed progress cannot change another attempt.

The theme picker browses compact catalog metadata and fetches the selected palette on demand, with loading/error/retry states. Shared plan components remain available to the Host; the unreachable solo plan workflow was removed.

`src/pages/Join.tsx` joins by room code, subscribes to the room and participants, and renders `TypingPractice` with locked settings. A saved target and typed input restore once when the executor mounts for the current run/reset key; participant elapsed time is restored in its stored millisecond unit. Reactive progress updates do not rehydrate the live input. Without a saved target, the executor starts fresh. The typing surface applies the Host's palette through local, contrast-safe CSS variables without modifying the participant's personal theme. Word progress reports actual submitted words, not five-character WPM units. A persistent Leave room control is available while waiting or typing, independently of results and sync errors.

`useConnectProgress` acknowledges a snapshot only after success, preserves a failed latest snapshot for retry, and resets delivery state when the run changes. The backend keeps the first completed practice snapshot immutable, including across reconnects and late/replacement reports. A completed attempt can only be reset by the host or a new host-led run. Host reset/new run clears saved input, target, and stats and advances attempt versions; Stop alone preserves the snapshot. Rejoining an existing membership validates and applies the submitted name without resetting its attempt. Connect does not create ranked solo sessions.

## Ownership and presence

`src/lib/multiplayer-identity.ts` initializes a stable browser session ID and a random 256-bit credential outside render-time storage snapshots. The backend stores a hash of the credential and omits it from public room/participant data. IDs identify records; the private credential authorizes host or member actions. Denied storage falls back to memory for the current page lifetime; a reload cannot restore credentials that were never persisted.

Presence heartbeats update `lastSeen` and extend room retention. Scheduled cleanup applies disconnect behavior after 75 seconds without participant activity (including reconnect grace), checks race completion, and transfers a vanished Race host to an eligible connected participant. If the host left a waiting race alone, the next racer to join becomes host. Rooms expire after 15 minutes without heartbeat renewal and their associated data is removed in bounded room batches. Explicit Leave and End room remain available; browser unload is not the sole cleanup mechanism.

Practice rooms cap stored memberships at 64, including a 30-second reservation after disconnect for reconnection. After that reservation, disconnected practice memberships and their attempt snapshots can be reclaimed. At the cap, joining performs presence cleanup and reclaims eligible departures before deciding the room is full. An abandoned practice membership's disconnect time is the end of its 75-second presence timeout, rather than the time a delayed cleanup happens to run. Disconnected records without a stored disconnect timestamp use that same conservative last-seen timeout before their reconnect reservation can expire. Background reclamation uses indexed pages of 100 records, continuing past preserved race rows so those rows cannot block practice cleanup. Connected/recently active participants and fresh reconnect reservations are not evicted. Race memberships and result snapshots are not reclaimed for capacity; their existing room expiry lifecycle is unchanged.

Legacy rooms without a credential cannot be safely claimed. They are treated as expired and the user creates a new room. Clearing browser storage similarly loses ownership; public record IDs cannot recover it.

## Race

`RaceLobby`, `RaceActive`, and `RaceResults` own lobby readiness, strict typing progress, and the podium. A finish requires the complete target; the server records elapsed time and assigns positions using that time with a stable tie-breaker. A client that finishes before the server countdown ends receives an explicit retry response. Backend completion writes a race snapshot in the same transaction using the live position rule. Run/start and reset identity reject stale updates. Race remains a separately routed feature; navigation visibility is controlled by the app route configuration.

## Checks

Registered multiplayer contract tests use `convex-test` for omitted/forged/wrong-member credentials, validators, public secret omission, expiry, host transfer, and race completion. `tests/unit/connect-membership-regressions.test.ts` covers completed-attempt protection, host reset/new-run clearing, submitted rejoin names, reconnect reservations, capacity cleanup, and paged background reclamation. `tests/unit/connect-session.test.tsx` covers restored snapshot props and persistent Leave controls with an isolated executor fixture. Browser suites `connect`, `connect-session`, and `race` exercise local fixture transport, including Host refresh and failed progress retry. See [browser acceptance](../../tests/browser/README.md); these tests do not contact the live deployment.
