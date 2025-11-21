# Core Typing Engine

## Overview

The Core Typing Engine is the heart of TypeSetGo, encapsulated primarily within the `TypingPractice.tsx` component. It handles user input, text generation, validation, statistics calculation (WPM, Accuracy), and renders the visual typing interface.

It is designed to be flexible, supporting standalone practice modes as well as being driven remotely for the "Connect" multiplayer mode.

## Component Structure

**File:** `components/TypingPractice.tsx`

### Props (`TypingPracticeProps`)

The component accepts props to allow external control, primarily used by the Connect mode:

-   `connectMode` (boolean): If true, enables multiplayer specific behaviors (disables local settings UI, emits stats).
-   `lockedSettings` (Partial<SettingsState>): Enforces specific settings (used when a Host controls the room).
-   `isTestActive` (boolean): Controls whether the input is unlocked and the test can proceed (for synchronized starts).
-   `onStatsUpdate` (function): Callback to emit real-time statistics to a parent component (or socket).
-   `onLeave` (function): Callback for the "Leave Room" action.
-   `sessionId` (string | number): Used to force a reset of the internal state when the session changes.

## Modes

The engine supports five distinct typing modes:

1.  **Time**: Type infinite random words for a fixed duration (15s, 30s, 60s, etc.).
2.  **Words**: Type a fixed number of random words (10, 25, 50, etc.).
3.  **Quote**: Type a specific quote selected from the database. Supports filtering by length (Short, Medium, Long, XL).
4.  **Zen**: Infinite typing with no goals or timers. The UI fades away for immersion.
5.  **Preset**: Type custom text provided by the user or a Host.

## Key Features

### Statistics Calculation

Statistics are calculated in real-time using the `computeStats` helper function.

-   **WPM (Words Per Minute)**: Calculated as `(Characters Typed / 5) / Time Elapsed in Minutes`.
-   **Accuracy**: Calculated as `(Correct Characters / Total Characters Typed) * 100`.
-   **Raw vs Net**:
    -   *Raw*: Gross WPM including errors.
    -   *Net*: WPM adjusted for accuracy (currently the primary display matches standard typing test conventions).

### Word Generation

-   **Random Words**: Loads word lists from `public/words/[difficulty].json`. Supports multiple difficulties (Beginner to Extreme) which determine the complexity of words.
-   **Quotes**: Loads quotes from `public/quotes/[length].json`.
-   **Filters**: Supports adding Punctuation and Numbers to random word generation.

### Ghost Writer

The "Ghost Writer" feature simulates a cursor moving at a specific WPM to pace the user.
-   Implemented using `requestAnimationFrame` for smooth visual updates.
-   Calculates the target character index based on the elapsed time and target speed.

### Theming

The engine supports a robust theming system allowing dynamic color changes for:
-   Background
-   Text (Default, Correct, Incorrect, Upcoming)
-   Cursor & Ghost Cursor
-   UI Elements (Buttons, Highlights)

Themes are defined by the `Theme` type and stored in the `settings` state.

## Code Walkthrough

### 1. State Management
The component uses standard React `useState` for local state:
-   `settings`: Stores the current configuration (mode, duration, difficulty, etc.).
-   `typedText`: The current string typed by the user.
-   `words`: The target text string (generated words or quote).
-   `status` (derived): `isRunning`, `isFinished`.

### 2. Input Handling (`handleInput`)
-   Captures input from a hidden `<input>` element.
-   Updates `typedText`.
-   Checks for completion conditions (e.g., end of quote, word count reached).
-   Generates new words dynamically for infinite modes ("Time", "Zen").

### 3. Rendering Logic
-   **Visual Cursor**: A custom cursor implementation (not the browser's default) to allow styling and "smooth" movement logic if desired in the future.
-   **Character Rendering**: Iterates through the `words` string and compares against `typedText` index-by-index to assign colors (Correct/Incorrect/Upcoming).

### 4. Multiplayer Integration
When `connectMode` is active:
-   Settings are hydrated from `lockedSettings` prop.
-   Local settings UI is hidden.
-   Stats are emitted periodically via `onStatsUpdate` to be sent over the socket.
-   The test start/stop is gated by `isTestActive`.
