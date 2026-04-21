# Release Notes

## 2026-04-20 — Typing Desync Fix

Fixed a long-standing bug where characters would desynchronize during typing sessions, causing correct keystrokes to appear as errors. Most frequently reported during Zen Mode due to longer session times, but affected all modes.

### What was happening

The app derives cursor position by splitting both the target text and typed text on spaces and comparing word-by-word. Several interacting bugs could cause these two strings to fall out of alignment, making every subsequent character appear wrong — even when typed correctly. Backspacing often couldn't fix it because the root misalignment was invisible to the user.

### Fixes

- **Prevented mid-session state wipe**: Convex real-time subscription updates could cascade through unstable mutation references and trigger a full session reset (`typedText` set to empty string) while the user was actively typing. The test-generation effect is now decoupled from mutation reference changes and blocked from firing during active sessions.

- **Eliminated double-space word index corruption**: Consecutive spaces in typed input created phantom empty words, shifting every subsequent word's index by one and making all following characters compare against the wrong target. Input is now sanitized to collapse consecutive spaces.

- **Fixed stale closure causing word list inflation**: In Zen/Time mode, the word-append threshold check read a stale `words` value from the React closure. Rapid keystrokes before a re-render could trigger multiple 50-word appends (100–150+ words instead of 50), causing the display to suddenly shift. The check now reads from a ref that always reflects current state.

- **Stopped timer interval churn**: `finishSession` was recreated on every keystroke (because it depended on `typedText`), which caused the 100ms timer interval to tear down and restart on every character typed. Both now use stable refs, so the timer runs uninterrupted.

- **Guarded against empty word pool appends**: If the word pool hadn't loaded when the append triggered, an empty string would be concatenated, creating a trailing space and phantom empty word in the target text. The append is now skipped when `generateWords` returns empty.
