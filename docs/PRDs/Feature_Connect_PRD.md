# Feature: Connect (Multiplayer/Classroom)

## 1. Overview
Connect lets a host (usually a teacher) run a room of typists from a single code. The host builds an ordered list of tests, chooses whether the room moves together or each person moves at their own pace, optionally enforces display settings, and watches every participant's live stats on cards that can be shown full screen or in a separate window.

Implementation details live in [Connect and Race](../features/Connect_Multiplayer.md).

## 2. Entry and routing
- The header shows **Connect** after Type, Race and Lessons, separated from them by a vertical divider.
- `/connect` has two cards:
  - **Host a room**: host name, optional room name, Create room. Below it, **Recent rooms** from the last 48 hours, with Resume (live) or Reopen (ended).
  - **Join a room**: participant name and a 4-character code. `/connect/join?code=XXXX` pre-fills the code and previews the room.
- `/connect/host/:roomId` is the host panel, `/connect/host/:roomId/board` the card-only board, and `/connect/room/:roomId` the participant view.

## 3. Rooms and codes
- Codes are 4 characters, letters and digits, without ambiguous characters. A code never changes while its room is live.
- A room stays live until the host ends it or 72 hours pass without host activity. Participants alone never keep a room alive or end it.
- Ended rooms are archived for 48 hours, then deleted. Reopening restores the name, tests, pacing and overrides with a **new code** and an empty participant list, so a teacher can set up a lesson once and reuse it across class periods and days.
- Signed-in hosts see their rooms on any device; guests see rooms hosted from the same browser.

## 4. Host panel
- **Test list**: add Time, Words, Quote or Custom text tests with their options and an optional title, or a **Break** (5 seconds to 30 minutes) so everyone gets a pause between tests before the next one starts on its own. Edit, duplicate, reorder and remove. Up to 50 tests. Highlight the current test, grey out finished ones, and show upcoming ones normally. Tests already reached are locked while the room runs.
- **Pacing**:
  - *Host-led*: everyone is on the same test, and the host controls start, pause, restart, previous and next.
  - *Self-paced*: participants advance on their own after the host starts. The list shows how many people are on each test.
- **Participant settings**: per-group overrides for theme (and dark/light), text (font, size, alignment), ghost writer, sounds, and the on-screen keyboard (and layout). A group that is off leaves each participant's own preference in place.
- **Participants**: cards with live WPM, accuracy, progress, current test (self-paced) and presence. No status badge: the progress bar shows who has finished. Reset and remove sit in the card's name row (grid) or at the end of the row (list). Sort, resize, list/grid, show/hide offline, drag order, reset, remove. **Fullscreen**, **Pop out** (a small window, like a stream chat pop-out) and **Open in new tab** show only the cards. Board settings stay on the host panel and sync to the other window. The board's header has a fullscreen button.

## 5. Participant experience
- A minimal screen: room name, Leave, a "Test N of M" indicator showing which test of the list they are on (e.g. "2nd timed test"), live stats, the typing area, and the keyboard if the host allows it. No settings controls.
- Results:
  - Host-led: no Next button; the participant waits for the host.
  - Self-paced: **Next test** opens a short **Up next** splash with the next test's title and details and an animated list of completed, next and remaining tests.
- Breaks show a countdown and what comes next. Host-led breaks end for everyone together; self-paced breaks start when each participant reaches them. Breaks freeze while the host has paused the room.
- After the last self-paced test, a summary lists each test's results.
- Participants cannot end a test early, paste text, or change the host's locked settings.

## 6. Reliability requirements
- Students must not be dropped or see codes change unexpectedly. Inactivity only marks a participant offline; refreshing or returning to the tab rejoins the same seat.
- Progress from an earlier run, test or reset must never overwrite current results.
- Removed participants see that the host removed them and can rejoin with the code.

## 7. Out of scope (for now)
- Assignments, gradebook export and class rosters (see [Teacher Tools](Teacher_Tools_PRD.md)).
- Anti-cheat beyond paste blocking and server-validated stats.
