// Shared Connect contract: imported by Convex functions and the frontend.
// Keep this module free of browser APIs and `@/` imports.
import { MAX_DURATION_SECONDS, MAX_GHOST_SPEED, MAX_PRESET_TEXT_LENGTH, MAX_WORD_TARGET, TEXT_SIZE_MAX, TEXT_SIZE_MIN } from "./practice-limits";

export const CONNECT_CODE_LENGTH = 4;
// No 0/O, 1/I/L so codes read cleanly off a projector.
export const CONNECT_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CONNECT_MAX_TESTS = 50;
export const CONNECT_MAX_PARTICIPANTS = 100;
export const CONNECT_NAME_MAX = 32;
export const CONNECT_ROOM_NAME_MAX = 60;
const HOUR_MS = 60 * 60_000;
/** A live room ends after this many hours without host activity. */
export const CONNECT_LIVE_IDLE_HOURS = 72;
export const CONNECT_LIVE_IDLE_MS = CONNECT_LIVE_IDLE_HOURS * HOUR_MS;
/** Ended rooms stay reopenable for this many hours, then are deleted. */
export const CONNECT_ARCHIVE_HOURS = 48;
export const CONNECT_ARCHIVE_MS = CONNECT_ARCHIVE_HOURS * HOUR_MS;
/** Participants without a heartbeat for this long are shown as offline. */
export const CONNECT_OFFLINE_AFTER_MS = 60_000;
export const CONNECT_PARTICIPANT_HEARTBEAT_MS = 15_000;
export const CONNECT_HOST_HEARTBEAT_MS = 30_000;
export const CONNECT_BREAK_MIN_SECONDS = 10;
export const CONNECT_BREAK_MAX_SECONDS = 30 * 60;
/** Server tolerance for client clocks running slightly ahead when a self-paced countdown ends. */
export const CONNECT_BREAK_GRACE_MS = 1500;
/** How long results stay up before the room moves on (a following break replaces this, never shorter). */
export const CONNECT_RESULTS_MS = CONNECT_BREAK_MIN_SECONDS * 1000;
/** Host pacing: a timed test ends this long after its duration, so students who start a little late still finish. */
export const CONNECT_TIMED_GRACE_MS = 5000;

/** `break` is a timed pause between tests: no typing, nothing recorded. */
export type ConnectTestMode = "time" | "words" | "quote" | "preset" | "break";
export type ConnectDifficulty = "beginner" | "easy" | "medium" | "hard" | "expert";
export type ConnectQuoteLength = "all" | "short" | "medium" | "long" | "xl";

/** One entry in the room's ordered test list. */
export type ConnectTest = {
  id: string;
  mode: ConnectTestMode;
  /** Seconds; used by `time`, by `break`, and by `preset` when `presetModeType` is "time". */
  duration: number;
  /** Used by `words`. */
  wordTarget: number;
  difficulty: ConnectDifficulty;
  punctuation: boolean;
  numbers: boolean;
  capitalization: boolean;
  quoteLength: ConnectQuoteLength;
  presetText?: string;
  presetModeType?: "time" | "finish";
  /** Optional host label shown in the list and to participants. */
  title?: string;
};

export type ConnectPacing = "host" | "participant";

/**
 * Each group is applied to participants only while `enabled` is true; otherwise
 * participants keep their own saved settings. Values are kept when disabled so
 * toggling an override back on restores the host's previous choice.
 */
export type ConnectOverrides = {
  theme?: { enabled: boolean; themeId: string; mode: "dark" | "light" };
  typography?: { enabled: boolean; typingFontFamily: string; typingFontSize: number; textAlign: "left" | "center" | "right" | "justify" };
  ghost?: { enabled: boolean; ghostWriterEnabled: boolean; ghostWriterSpeed: number };
  sound?: { enabled: boolean; soundEnabled: boolean; typingSound: string; warningSound: string };
  keyboard?: { enabled: boolean; showOnScreenKeyboard: boolean; keyboardLayout: "qwerty" | "dvorak" | "colemak" };
};

/**
 * lobby: not started (or reset). running: participants type. paused: host froze the run.
 * complete: host pacing advanced past the last test.
 */
export type ConnectRoomStatus = "lobby" | "running" | "paused" | "complete";

export type ConnectStats = {
  wpm: number;
  accuracy: number;
  /** 0–100 */
  progress: number;
  wordsTyped: number;
  /** Milliseconds */
  timeElapsed: number;
  isFinished: boolean;
};

export type ConnectResult = {
  stepIndex: number;
  testId: string;
  wpm: number;
  accuracy: number;
  progress: number;
  wordsTyped: number;
  timeElapsed: number;
  finished: boolean;
};

export const emptyConnectStats = (): ConnectStats => ({
  wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false,
});

export const DEFAULT_CONNECT_TEST: Omit<ConnectTest, "id"> = {
  mode: "time",
  duration: 30,
  wordTarget: 25,
  difficulty: "medium",
  punctuation: false,
  numbers: false,
  capitalization: false,
  quoteLength: "all",
  presetModeType: "finish",
};

export const DEFAULT_CONNECT_BREAK: Omit<ConnectTest, "id"> = { ...DEFAULT_CONNECT_TEST, mode: "break", duration: 30 };

const MODES: readonly ConnectTestMode[] = ["time", "words", "quote", "preset", "break"];
const DIFFICULTIES: readonly ConnectDifficulty[] = ["beginner", "easy", "medium", "hard", "expert"];
const QUOTE_LENGTHS: readonly ConnectQuoteLength[] = ["all", "short", "medium", "long", "xl"];

export const isBreakTest = (test: Pick<ConnectTest, "mode"> | undefined) => test?.mode === "break";

/**
 * Host pacing: someone who joins partway through a test sits it out. `lateForRun` is the run they
 * joined during; the next start (next, previous or restarted test) changes the run and lets them in.
 */
export function isWaitingForNextTest(
  room: { pacing: ConnectPacing; status: ConnectRoomStatus; runVersion: number },
  participant: { lateForRun?: number },
) {
  return room.pacing === "host" && (room.status === "running" || room.status === "paused") &&
    participant.lateForRun === room.runVersion;
}

const pausedFor = (pausedAt: number | undefined, now: number) => pausedAt === undefined ? 0 : Math.max(0, now - pausedAt);
const breakMs = (test: Pick<ConnectTest, "duration">) => Math.max(test.duration, CONNECT_BREAK_MIN_SECONDS) * 1000;

/** When a break that started at `startedAt` ends, accounting for time spent paused. */
export function breakEndsAt(test: Pick<ConnectTest, "duration">, startedAt: number, pausedAt?: number, now = Date.now()) {
  return startedAt + breakMs(test) + pausedFor(pausedAt, now);
}

/** Results time after test `index`: a following break plays on the results screen instead. */
export function resultsMs(tests: Pick<ConnectTest, "mode" | "duration">[], index: number) {
  const next = tests[index + 1];
  return next && isBreakTest(next) ? breakMs(next) : CONNECT_RESULTS_MS;
}

/** The step after test `index`'s results, skipping a following break that played during them. */
export const stepAfterResults = (tests: Pick<ConnectTest, "mode">[], index: number) =>
  index + (isBreakTest(tests[index + 1]) ? 2 : 1);

/** When results that began at `endedAt` give way to the next step, accounting for time spent paused. */
export function resultsEndAt(tests: Pick<ConnectTest, "mode" | "duration">[], index: number, endedAt: number, pausedAt?: number, now = Date.now()) {
  return endedAt + resultsMs(tests, index) + pausedFor(pausedAt, now);
}

/** Host pacing: when a timed test ends for the whole room. */
export function timedTestEndsAt(test: Pick<ConnectTest, "duration">, startedAt: number, pausedAt?: number, now = Date.now()) {
  return startedAt + test.duration * 1000 + CONNECT_TIMED_GRACE_MS + pausedFor(pausedAt, now);
}

export const isTimedConnectTest = (test: Pick<ConnectTest, "mode" | "presetModeType">) =>
  test.mode === "time" || (test.mode === "preset" && test.presetModeType === "time");

/** Throws a user-facing message for an invalid test. Shared by the host editor and the backend. */
export function validateConnectTest(test: ConnectTest, position?: number) {
  const where = position === undefined ? "This test" : `Test ${position + 1}`;
  if (typeof test.id !== "string" || !test.id || test.id.length > 64) throw new Error(`${where} has an invalid id`);
  if (!MODES.includes(test.mode)) throw new Error(`${where} uses an unsupported mode`);
  if (!DIFFICULTIES.includes(test.difficulty)) throw new Error(`${where} uses an unsupported difficulty`);
  if (!QUOTE_LENGTHS.includes(test.quoteLength)) throw new Error(`${where} uses an unsupported quote length`);
  if (test.mode === "break" && (!Number.isInteger(test.duration) || test.duration < CONNECT_BREAK_MIN_SECONDS || test.duration > CONNECT_BREAK_MAX_SECONDS)) {
    throw new Error(`${where}: choose a break from ${CONNECT_BREAK_MIN_SECONDS} seconds to ${CONNECT_BREAK_MAX_SECONDS / 60} minutes`);
  }
  if (isTimedConnectTest(test) && (!Number.isInteger(test.duration) || test.duration < 1 || test.duration > MAX_DURATION_SECONDS)) {
    throw new Error(`${where}: choose a whole duration from 1 to ${MAX_DURATION_SECONDS} seconds`);
  }
  if (test.mode === "words" && (!Number.isInteger(test.wordTarget) || test.wordTarget < 1 || test.wordTarget > MAX_WORD_TARGET)) {
    throw new Error(`${where}: choose a whole word count from 1 to ${MAX_WORD_TARGET}`);
  }
  if (test.mode === "preset") {
    if (!test.presetText?.trim()) throw new Error(`${where}: enter the text to type`);
    if (test.presetText.length > MAX_PRESET_TEXT_LENGTH) throw new Error(`${where}: text must be at most ${MAX_PRESET_TEXT_LENGTH} characters`);
  }
  if (test.title !== undefined && test.title.length > 60) throw new Error(`${where}: titles must be 60 characters or fewer`);
}

export function validateConnectOverrides(overrides: ConnectOverrides) {
  const t = overrides.typography;
  if (t && (!Number.isFinite(t.typingFontSize) || t.typingFontSize < TEXT_SIZE_MIN || t.typingFontSize > TEXT_SIZE_MAX)) {
    throw new Error(`Choose a text size from ${TEXT_SIZE_MIN} to ${TEXT_SIZE_MAX}`);
  }
  const g = overrides.ghost;
  if (g && (!Number.isFinite(g.ghostWriterSpeed) || g.ghostWriterSpeed < 1 || g.ghostWriterSpeed > MAX_GHOST_SPEED)) {
    throw new Error(`Choose a ghost speed from 1 to ${MAX_GHOST_SPEED} WPM`);
  }
  if (overrides.theme && (!overrides.theme.themeId || overrides.theme.themeId.length > 100)) {
    throw new Error("Choose a theme");
  }
}

/** "45s", "2m", or "1m 30s". */
export function formatSeconds(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

/** Short human description, e.g. "Time · 30s" or "Words · 25"; a break is just its length, since its title names it. */
export function describeConnectTest(test: ConnectTest) {
  if (test.mode === "break") return formatSeconds(test.duration);
  if (test.mode === "time") return `Time · ${test.duration}s`;
  if (test.mode === "words") return `Words · ${test.wordTarget}`;
  if (test.mode === "quote") return `Quote · ${test.quoteLength === "all" ? "any length" : test.quoteLength}`;
  return test.presetModeType === "time" ? `Custom text · ${test.duration}s` : "Custom text";
}
