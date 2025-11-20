# Feature: Anti-Cheat & Security

## 1. Overview
Advanced signals and tools to ensure the integrity of assessments, especially for remote or high-stakes testing.

## 2. Telemetry & Signals
* **Focus Tracking**: Count tab blurs/focus losses.
* **Copy/Paste**: Disable and log attempts.
* **Keystroke Dynamics**:
    * Monitor inter-key latency.
    * Flag inhumanly fast bursts (e.g., macros/scripts).
    * Detect consistent rhythm anomalies.
* **Environment**: Detect DevTools open, window visibility.

## 3. Review Console
* **Teacher View**:
    * Flagged attempts highlighted in roster.
    * Detailed report showing timeline of events (blurs, spikes).
    * "Suspicion Score" aggregated from signals.
* **Evidence**: Replay of typing session (keystroke timestamps).

## 4. Policy Engine
* **Configuration**: Admins/Teachers can set strictness.
    * Example: "Auto-fail if > 3 tab blurs".
    * Example: "Flag if WPM > 150".
