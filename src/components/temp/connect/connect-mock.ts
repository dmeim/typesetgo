// Mock room, tests and players for the /temp-connect mockup. Nothing is fetched or saved.
import { CoffeeIcon, QuotesIcon, TextAaIcon, TimerIcon, type Icon } from "@phosphor-icons/react";
import { CONNECT_CODE_ALPHABET, CONNECT_CODE_LENGTH } from "@/lib/connect-types";

export const CODE_LENGTH = CONNECT_CODE_LENGTH;
export const TICK_MS = 1000;
/** Ticks the results stay up before a host-led room moves on by itself. */
export const RESULTS_TICKS = 4;
/** Untimed tests run faster than real life so the demo keeps moving. */
const DEMO_SPEED = 2.5;

export type TestMode = "time" | "words" | "quote" | "break";
export type RoomStatus = "lobby" | "running" | "paused" | "complete";
export type Pacing = "host" | "participant";
export type ScreenId = "landing" | "host" | "board";

export interface MockTest {
  id: string;
  mode: TestMode;
  title: string;
  /** Seconds for time tests and breaks. */
  seconds?: number;
  /** Word count for words and quote tests. */
  words?: number;
}

export interface KidResult { wpm: number; accuracy: number }

export interface Kid {
  id: string;
  name: string;
  baseWpm: number;
  baseAccuracy: number;
  online: boolean;
  isYou?: boolean;
  /** Test index; only used when the room is self-paced. */
  step: number;
  stepTicks: number;
  progress: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  /** Self-paced: ticks spent on the results screen before moving on. */
  restTicks: number;
  results: KidResult[];
}

export const ROOM = { code: "K7QM", name: "Room 12 typing club", host: "Ms. Rivera" };
export const DEFAULT_YOU = "Alex";

export const MOCK_TESTS: MockTest[] = [
  { id: "t1", mode: "time", title: "Warm-up", seconds: 15 },
  { id: "t2", mode: "words", title: "Home row words", words: 15 },
  { id: "t3", mode: "break", title: "Stretch break", seconds: 10 },
  { id: "t4", mode: "quote", title: "Famous quote", words: 20 },
  { id: "t5", mode: "time", title: "Speed round", seconds: 30 },
];

/** One-tap additions for the host's test list. */
export const QUICK_ADD: Omit<MockTest, "id">[] = [
  { mode: "time", title: "Time · 30s", seconds: 30 },
  { mode: "time", title: "Time · 60s", seconds: 60 },
  { mode: "words", title: "25 words", words: 25 },
  { mode: "words", title: "50 words", words: 50 },
  { mode: "quote", title: "Short quote", words: 20 },
  { mode: "break", title: "Break · 30s", seconds: 30 },
];

export const MAX_TESTS = 12;

export const MODE_ICONS: Record<TestMode, Icon> = { time: TimerIcon, words: TextAaIcon, quote: QuotesIcon, break: CoffeeIcon };

export function testDetail(test: MockTest) {
  if (test.mode === "time") return `${test.seconds}s timed`;
  if (test.mode === "break") return `${test.seconds}s rest`;
  if (test.mode === "quote") return "Short quote";
  return `${test.words} words`;
}

export const RECENT_ROOMS = [
  { id: "r1", name: "Room 12 typing club", code: "K7QM", live: true, tests: 5, ago: "" },
  { id: "r2", name: "Period 3 warm-ups", code: "", live: false, tests: 3, ago: "Ended 2h ago" },
  { id: "r3", name: "Friday speed race", code: "", live: false, tests: 8, ago: "Ended yesterday" },
];

const SEED: [string, number, number, boolean][] = [
  ["Maya", 52, 97, true],
  ["Jordan", 38, 93, true],
  ["Priya", 61, 98, true],
  ["Leo", 29, 90, true],
  ["Sofia", 45, 95, true],
  ["Noah", 34, 92, true],
  ["Zara", 41, 94, false],
];

export function freshKid(kid: Kid): Kid {
  return { ...kid, step: 0, stepTicks: 0, progress: 0, wpm: 0, accuracy: 0, finished: false, restTicks: 0 };
}

export function seedKids(you: string): Kid[] {
  const others = SEED.map(([name, baseWpm, baseAccuracy, online], index) =>
    freshKid({ id: `k${index}`, name, baseWpm, baseAccuracy, online, step: 0, stepTicks: 0, progress: 0, wpm: 0, accuracy: 0, finished: false, restTicks: 0, results: [] }));
  const yours = freshKid({ id: "you", name: you, baseWpm: 44, baseAccuracy: 96, online: true, isYou: true, step: 0, stepTicks: 0, progress: 0, wpm: 0, accuracy: 0, finished: false, restTicks: 0, results: [] });
  return [others[0], others[1], yours, ...others.slice(2)];
}

/** Uppercase, and only characters a room code can contain. */
export function sanitizeCode(value: string) {
  return value.toUpperCase().split("").filter((char) => CONNECT_CODE_ALPHABET.includes(char)).join("").slice(0, CODE_LENGTH);
}

export function lookupCode(code: string) {
  return code === ROOM.code ? ROOM : null;
}

export function formatClock(seconds: number) {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const AVATAR_TONES = [
  "bg-primary text-primary-foreground",
  "bg-(--accent-emphasis) text-background",
  "bg-warning text-background",
  "bg-success text-background",
  "bg-destructive text-background",
  "bg-muted-foreground text-background",
];

export function avatarTone(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

const jitter = (spread: number) => (Math.random() - 0.5) * 2 * spread;

/** One second of typing on `test` for one player. */
export function typeOneTick(kid: Kid, test: MockTest, ticks: number): Kid {
  if (!kid.online || kid.finished || test.mode === "break") return kid;
  const wpm = Math.max(8, Math.round(kid.wpm ? kid.wpm * 0.55 + (kid.baseWpm + jitter(8)) * 0.45 : kid.baseWpm + jitter(10)));
  const accuracy = Math.min(100, Math.max(75, Math.round(kid.accuracy ? kid.accuracy * 0.6 + (kid.baseAccuracy + jitter(3)) * 0.4 : kid.baseAccuracy)));
  const progress = test.mode === "time"
    ? Math.min(100, (ticks / (test.seconds ?? 30)) * 100)
    : Math.min(100, kid.progress + (wpm / 60 / (test.words ?? 25)) * 100 * DEMO_SPEED);
  const finished = progress >= 100;
  return { ...kid, wpm, accuracy, progress, finished, results: finished ? [...kid.results, { wpm, accuracy }] : kid.results };
}

/** Whole-run average, or null before the first finished test. */
export function average(results: KidResult[]): KidResult | null {
  if (!results.length) return null;
  const sum = results.reduce((total, result) => ({ wpm: total.wpm + result.wpm, accuracy: total.accuracy + result.accuracy }), { wpm: 0, accuracy: 0 });
  return { wpm: Math.round(sum.wpm / results.length), accuracy: Math.round(sum.accuracy / results.length) };
}
