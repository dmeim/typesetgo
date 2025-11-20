# Feature: Teacher Tools & Class Management

## 1. Overview
Tools for teachers to manage classrooms, distribute standardized tests, and track student progress.

## 2. Class Management
* **Create Class**: Name, optional description.
* **Roster**:
    * Invite students via **Join Code** or **Share Link**.
    * View list of enrolled students.
    * Remove students from class.

## 3. Presets & Share Links
* **Concept**: A "Preset" is a saved configuration of Mode + Settings + Content.
* **Creation**: Teacher configures a test (e.g., Time 60s, Strict Backspace, Specific Text) and saves it.
* **Sharing**:
    * Generate a unique URL: `kbc.app/p/<public_id>`.
    * Options:
        * **Expires**: Link becomes invalid after a date.
        * **One-time**: Single use per student.
        * **Class-only**: Restricted to enrolled students.
        * **Locked**: Students cannot change settings.

## 4. Teacher Dashboard
* **Class Overview**: Summary stats (active students, avg WPM).
* **Attempt List**: Filterable list of all student attempts in the class.
    * Filters: Date range, Mode, Preset, Student.
* **Drill-down**: Click an attempt to see detailed metrics (heatmap, replay if available).
* **Exports**: Download class data as CSV.
