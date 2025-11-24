# Feature: Connect (Multiplayer/Classroom)

## 1. Overview
"Connect" is a multiplayer feature that allows a Host to create a room (via a code) and control the typing experience for multiple joined Users. This is ideal for classrooms, competitions, or synchronized practice.

## 2. Architecture & Routing
*   **Routes**:
    *   `/connect`: The landing page (Host/Join).
    *   `/connect/host`: The Host's command center.
    *   `/connect/[code]`: The Joiner's active room view.
*   **Room Management** (Note: Terminology is "Room", not "Session"):
    *   Unique alphanumeric room codes (e.g., `TR4X9`).
    *   Real-time state synchronization (WebSockets or similar).

## 3. User Flows

### 3.1. Entry Point
*   **Connect Button**: Located in the top row of the main UI. Redirects to `/connect`.
*   **Connect Page** (`/connect`):
    *   **Host Card**: "Start Hosting" button -> Redirects to `/connect/host`.
    *   **Join Card**: Input field for code -> Redirects to `/connect/[code]`.

### 3.2. Host Experience (`/connect/host`)
*   **Admin Panel**:
    *   **Settings Control**: Host has exclusive control over all test settings:
        *   Mode (Time, Words, Quote, Preset).
        *   Difficulty / Language.
        *   Theme / Styling (Host can enforce a theme or allow user override - *Requirement: Host sets style options*).
        *   **Preset Mode**: Host can paste/load text for all users.
    *   **User Management**:
        *   List of connected users.
        *   **Actions**:
            *   **Reset User**: Reset a specific user's progress/test to the start.
            *   **Kick User** (Optional but recommended).
    *   **Live Dashboard**:
        *   Real-time stats for each user: Speed (WPM), Accuracy, Progress (%), Time Left.
*   **Flow Control**:
    *   Host starts the test (synchronized start) or allows async start.

### 3.3. Joiner Experience (`/connect/[code]`)
*   **Onboarding**:
    *   Enter Name OR "Skip" (generates random name like "Anonymous Axolotl").
*   **Waiting Room**:
    *   "Waiting for host to start..." or "Waiting for next round...".
    *   View current settings (Read-only).
*   **The Test**:
    *   Standard typing interface.
    *   **Locked Settings**: Users cannot change mode, difficulty, or text.
    *   **Live Feedback**: Standard local feedback + potential leaderboard position.
    *   **Leave Room**: Button to disconnect and redirect to the main site.

## 4. Data & State
*   **Host State**:
    *   Master source of truth for Settings.
    *   Aggregates all User Stats.
*   **User State**:
    *   Sends: Current WPM, Accuracy, Progress, Name.
    *   Receives: Test Content, Settings, Start/Stop signals, Reset signals.

## 5. Technical Considerations
*   **Latency**: Ensure "Start" signal is as synchronized as possible.
*   **Resilience**: Users MUST be able to refresh and rejoin the same room automatically.
*   **Infrastructure**:
    *   Hosted on many VPSs in containers.
    *   **Self-Contained State**: Synchronization (WebSockets) must be handled within the container instance. No external coordination database. Users connect to the specific container instance.
