# Connect and Race

The Vite/React frontend uses Convex reactive queries and mutations. There is no Socket.IO server, Next.js route tree, or in-memory production room map.

## Connect

`src/pages/Host.tsx` creates a room through `convex/rooms.ts` and replaces the creation route with `/connect/host/:roomId`. Reloading that route resumes the same room if this browser retains its private ownership credential. The editor hydrates from stored settings; Apply or Start saves the draft deliberately. Stop/reset operations retain run and participant reset versions so delayed progress cannot change another attempt.

The theme picker browses compact catalog metadata and fetches the selected palette on demand, with loading/error/retry states. Shared plan components remain available to the Host; the unreachable solo plan workflow was removed.

`src/pages/Join.tsx` joins by room code, subscribes to the room and participants, and renders `TypingPractice` with locked settings. `useConnectProgress` acknowledges a snapshot only after success, preserves a failed latest snapshot for retry, and resets delivery state when the run changes. Connect does not create ranked solo sessions.

## Ownership and presence

`src/lib/multiplayer-identity.ts` initializes a stable browser session ID and a random 256-bit credential outside render-time storage snapshots. The backend stores a hash of the credential and omits it from public room/participant data. IDs identify records; the private credential authorizes host or member actions. Denied storage falls back to memory for the current page lifetime; a reload cannot restore credentials that were never persisted.

Presence heartbeats update `lastSeen` and extend room retention. Scheduled cleanup applies disconnect behavior after 75 seconds without participant activity (including reconnect grace), checks race completion, and transfers a vanished Race host to an eligible connected participant. If the host left a waiting race alone, the next racer to join becomes host. Rooms expire after 15 minutes without heartbeat renewal and their associated data is removed in bounded room batches. Explicit Leave and End room remain available; browser unload is not the sole cleanup mechanism.

Legacy rooms without a credential cannot be safely claimed. They are treated as expired and the user creates a new room. Clearing browser storage similarly loses ownership; public record IDs cannot recover it.

## Race

`RaceLobby`, `RaceActive`, and `RaceResults` own lobby readiness, strict typing progress, and the podium. A finish requires the complete target; the server records elapsed time and assigns positions using that time with a stable tie-breaker. A client that finishes before the server countdown ends receives an explicit retry response. Backend completion writes a race snapshot in the same transaction using the live position rule. Run/start and reset identity reject stale updates. Race remains a separately routed feature; navigation visibility is controlled by the app route configuration.

## Checks

Registered multiplayer contract tests use `convex-test` for omitted/forged/wrong-member credentials, validators, public secret omission, expiry, host transfer, and race completion. Browser suites `connect`, `connect-session`, and `race` exercise local fixture transport, including Host refresh and failed progress retry. See [browser acceptance](../../tests/browser/README.md); these tests do not contact the live deployment.
