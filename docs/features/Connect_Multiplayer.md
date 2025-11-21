# Connect (Multiplayer) Feature

## Overview

The "Connect" feature allows multiple users to join a room and type together in real-time. It creates a synchronized environment where a **Host** controls the settings and flow of the test, while **Joiners** participate.

## Architecture

TypeSetGo uses a **Client-Server** architecture powered by **Socket.IO**.

-   **Server**: A custom Node.js server (`server.js`) integrated with Next.js. It manages room state (`rooms` Map) and broadcasts events.
-   **Host Client**: Creates the room, owns the "truth" for settings, and controls the test lifecycle (Start/Stop/Reset).
-   **Join Client**: Connects to a room via code, listens for state updates, and reports local typing statistics.

## Room State

Each room on the server is an object stored in a `Map`:

```javascript
{
  hostId: "socket_id_string",
  users: [
    { 
      id: "socket_id", 
      name: "User Name", 
      stats: { wpm: 0, accuracy: 0, progress: 0, ... } 
    }
  ],
  settings: { ... }, // Shared settings (Mode, Duration, etc.)
  status: "waiting" | "active"
}
```

## Protocol & Events

### Room Management

-   `create_room` (Client -> Server): Requests a new room. Server returns a unique 5-character code.
-   `join_room` (Client -> Server): Payload `{ code, name }`. Server adds user and broadcasts `user_joined`.
-   `claim_host` (Client -> Server): Payload `{ code }`. Used for host reconnection/initialization.

### Synchronization

-   `update_settings` (Host -> Server): Host changes settings.
-   `settings_updated` (Server -> All): Broadcasts new settings. Clients update their local `lockedSettings`.
-   `host_disconnected` (Server -> All): Sent if the host loses connection for >2 minutes.

### Test Lifecycle

1.  **Start**: Host emits `start_test`. Server updates status to `active` and broadcasts `test_started`.
2.  **Stop**: Host emits `stop_test`. Server broadcasts `test_stopped`.
3.  **Reset**: Host emits `reset_test`. Server resets user stats and broadcasts `test_reset`.

### Real-time Stats

1.  **Reporting**: Clients emit `send_stats` periodically (every 500ms) during a test.
2.  **Broadcasting**: Server updates its internal state and emits `stats_update` to the Host (and potentially others).
    *   *Note:* Currently, the Host is the primary consumer of detailed real-time stats to render the live dashboard.

## Frontend Implementation

### Host (`app/connect_host/page.tsx`)
-   Maintains a persistent connection via `localStorage` ("hostRoomCode") to handle page refreshes.
-   Renders a **Dashboard** showing all connected users as cards or a list.
-   Visualizes progress bars and live WPM/Accuracy for every user.
-   Provides administrative controls: Kick User, Reset User.

### Joiner (`app/connect_join/[code]/page.tsx`)
-   Wraps the `TypingPractice` component.
-   Passes `lockedSettings` received from the socket to `TypingPractice`.
-   Intercepts stats updates from `TypingPractice` via `onStatsUpdate` and forwards them to the socket.
-   Blocks typing input if `status` is "waiting".

## Reconnection Handling
The server implements a grace period for Hosts. If a Host disconnects, the room remains alive for **2 minutes**. If the Host reconnects and claims the room (`claim_host`) within that window, the session resumes.
