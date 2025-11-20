# Feature: Core Typing Experience

## 1. Overview
The core typing engine is the heart of KeyBoardCity. It must be fast, responsive, and provide accurate metrics. The UI should be minimalist (Monkeytype-style) to maximize focus.

## 2. Practice Modes
* **Time Mode**: Run for chosen duration (15/30/60/120s + custom). `0` = infinite.
* **Word Mode**: Finish after N target words (10/25/50/100 + custom).
* **Text Mode**: User or teacher selects a passage. Progress is passage-bounded.
* **Custom Goal Mode**: Type X words within Y time or Z accuracy threshold. Session ends on success/failure.

## 3. Toggles & Settings
* **Punctuation**: On/Off.
* **Numbers**: On/Off.
* **Backspace Mode**:
    * `Normal`: Backspace allowed.
    * `Strict`: Must fix errors immediately before proceeding.
    * `No-backspace`: Errors persist, affects adjusted WPM.

## 4. Metrics & Scoring
* **Raw WPM**: `(characters / 5) / minutes`.
* **Adjusted WPM**: `Raw WPM * Accuracy%`.
* **Accuracy %**: `correct_chars / (correct + incorrect + extra + missed)`.
* **Error Taxonomy**:
    * `Correct`: Right key.
    * `Incorrect`: Wrong key (substitution).
    * `Extra`: Unneeded key (insertion).
    * `Missed`: Skipped key (omission).
* **Visual Feedback**: Per-character coloring. Optional per-key heatmap after test.

## 5. UX & Accessibility
* **Minimalist Layout**: Single focal block, progress bar.
* **Themes**: Light, Dark, High-Contrast.
* **Accessibility**:
    * Keyboard-only operation.
    * Screen-reader friendly regions.
    * Adjustable font size and line height.
    * Dyslexia-friendly font option.

## 6. Performance & PWA
* **Time-to-first-keystroke**: <150ms p95.
* **Offline Capability**: PWA with offline queue for attempts. Syncs when online.
