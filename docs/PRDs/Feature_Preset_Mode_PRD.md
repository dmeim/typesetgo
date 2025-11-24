# Feature: Preset Mode

## 1. Overview
"Preset Mode" allows users to provide their own text source for the typing test, rather than using the engine's random word generator or quote library. This feature is available in both Single User and Connect (Multiplayer) modes.

## 2. User Experience (Single Player)
*   **Mode Selection**: "Preset" appears as a new option alongside Time, Words, Quote, and Zen.
*   **Input Methods**:
    *   **Text Area**: A large input field to paste text directly.
    *   **File Upload**: Button to upload a simple text file (`.txt`).
*   **Configuration**:
    *   Once text is loaded, the user can still apply constraints:
        *   **Time Limit**: Try to type as much of the preset text as possible in X seconds.
        *   **Standard (Finish)**: Type the entire text from start to finish (default).
    *   **Ghost Writer**: Compatible with Preset mode.
    *   **Punctuation/Numbers**: These toggles are effectively overridden by the content of the preset text (i.e., if the text has punctuation, the user must type it). These toggles can be hidden in Preset mode.
    *   **Difficulty**: These toggles are effectively overridden by the content of the preset text (i.e., if the text has punctuation, the user must type it). These toggles can be hidden in Preset mode.

## 3. Text Processing
*   **Sanitization**: Input text should be sanitized to remove non-printable characters.
*   **Formatting**:
    *   Preserve paragraph breaks if possible, or normalize to single-line stream depending on UI constraints.
    *   Handle excessive whitespace (trim/normalize).

## 4. Integration with Connect Mode
*   **Host Control**: In Connect Mode, the Host can select "Preset" as the test mode.
*   **Sync**: The Host pastes/uploads the text, and it is pushed to all connected clients.
*   **Locking**: Connected users cannot modify the preset text.
