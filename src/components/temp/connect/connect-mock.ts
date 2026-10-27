// Mock room, tests and players for the /temp-connect mockup. Nothing is fetched or saved.
import { CoffeeIcon, FileTextIcon, QuotesIcon, TextAaIcon, TimerIcon, type Icon } from "@phosphor-icons/react";
import {
  CONNECT_CODE_ALPHABET, CONNECT_CODE_LENGTH, DEFAULT_CONNECT_BREAK, DEFAULT_CONNECT_TEST, isTimedConnectTest,
  type ConnectQuoteLength, type ConnectTest, type ConnectTestMode,
} from "@/lib/connect-types";

export const CODE_LENGTH = CONNECT_CODE_LENGTH;
export const TICK_MS = 1000;
/** Ticks the results stay up before a host-led room moves on by itself. */
export const RESULTS_TICKS = 4;
/** Self-paced: ticks a player rests on their results before moving on. */
export const SELF_PACED_REST_TICKS = 5;
/** Untimed tests run faster than real life so the demo keeps moving. */
const DEMO_SPEED = 2.5;

export type MockTest = ConnectTest;
export type TestMode = ConnectTestMode;
export type RoomStatus = "lobby" | "running" | "paused" | "complete";
export type Pacing = "host" | "participant";

export interface KidResult { wpm: number; accuracy: number }

export interface Kid {
  id: string;
  name: string;
  baseWpm: number;
  baseAccuracy: number;
  online: boolean;
  isYou?: boolean;
  /** Signed in: joins under their account name and shows their profile picture. */
  signedIn?: boolean;
  /** Host-led: joined during this run, so they sit the current test out. */
  lateForRun?: number;
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
export const JOIN_HOST = "typesetgo.app/connect/join";

const test = (id: string, title: string, changes: Partial<ConnectTest>): ConnectTest => ({ ...DEFAULT_CONNECT_TEST, id, title, ...changes });

export const MOCK_TESTS: ConnectTest[] = [
  test("t1", "Warm-up", { mode: "time", duration: 15, difficulty: "beginner" }),
  test("t2", "Home row words", { mode: "words", wordTarget: 15, difficulty: "beginner" }),
  test("t3", "Stretch break", { ...DEFAULT_CONNECT_BREAK, duration: 10 }),
  test("t4", "Famous quote", { mode: "quote", quoteLength: "short" }),
  test("t5", "Speed round", { mode: "time", duration: 30, punctuation: true }),
];

/** One-tap additions for the host's test list. */
export const QUICK_ADD: { label: string; test: Omit<ConnectTest, "id"> }[] = [
  { label: "Time · 30s", test: { ...DEFAULT_CONNECT_TEST, mode: "time", duration: 30 } },
  { label: "Time · 60s", test: { ...DEFAULT_CONNECT_TEST, mode: "time", duration: 60 } },
  { label: "25 words", test: { ...DEFAULT_CONNECT_TEST, mode: "words", wordTarget: 25 } },
  { label: "50 words", test: { ...DEFAULT_CONNECT_TEST, mode: "words", wordTarget: 50 } },
  { label: "Short quote", test: { ...DEFAULT_CONNECT_TEST, mode: "quote", quoteLength: "short" } },
  { label: "Break · 30s", test: { ...DEFAULT_CONNECT_BREAK } },
];

export const MODE_ICONS: Record<TestMode, Icon> = { time: TimerIcon, words: TextAaIcon, quote: QuotesIcon, preset: FileTextIcon, break: CoffeeIcon };

export const RECENT_ROOMS = [
  { id: "r2", name: "Period 3 warm-ups", tests: 3, ago: "Ended 2h ago" },
  { id: "r3", name: "Friday speed race", tests: 8, ago: "Ended yesterday" },
];

// Name, speed, accuracy, online, signed in. Signed-in players appear under their account name.
const SEED: [string, number, number, boolean, boolean][] = [
  ["maya.types", 52, 97, true, true],
  ["Jordan", 38, 93, true, false],
  ["priyaflash", 61, 98, true, true],
  ["Leo", 29, 90, true, false],
  ["Sofia", 45, 95, true, false],
  ["noahkeys", 34, 92, true, true],
  ["Zara", 41, 94, false, false],
];

/** The pretend signed-in student's account, used when joining as signed in. */
export const YOUR_ACCOUNT = "pixelpenguin";

/** Pretend students who join when the host taps "Someone joins". */
export const LATE_NAMES = ["Ava", "Ethan", "Mila", "Kai", "Ruby", "Omar", "Iris", "Theo", "June", "Felix"];

export function freshKid(kid: Kid): Kid {
  return { ...kid, step: 0, stepTicks: 0, progress: 0, wpm: 0, accuracy: 0, finished: false, restTicks: 0 };
}

export function newKid(id: string, name: string, baseWpm: number, baseAccuracy: number, extra: Partial<Kid> = {}): Kid {
  return { id, name, baseWpm, baseAccuracy, online: true, step: 0, stepTicks: 0, progress: 0, wpm: 0, accuracy: 0, finished: false, restTicks: 0, results: [], ...extra };
}

export function seedKids(you: string): Kid[] {
  const others = SEED.map(([name, baseWpm, baseAccuracy, online, signedIn], index) => newKid(`k${index}`, name, baseWpm, baseAccuracy, { online, signedIn }));
  return [others[0], others[1], youKid(you), ...others.slice(2)];
}

export const youKid = (name: string, extra: Partial<Kid> = {}) => newKid("you", name, 44, 96, { isYou: true, ...extra });

/** A fresh code that differs from `current`. */
export function randomCode(current = "") {
  let code = current;
  while (code === current) code = Array.from({ length: CODE_LENGTH }, () => CONNECT_CODE_ALPHABET[Math.floor(Math.random() * CONNECT_CODE_ALPHABET.length)]).join("");
  return code;
}

/** Uppercase, and only characters a room code can contain. */
export function sanitizeCode(value: string) {
  return value.toUpperCase().split("").filter((char) => CONNECT_CODE_ALPHABET.includes(char)).join("").slice(0, CODE_LENGTH);
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

function hashName(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

export const avatarTone = (name: string) => AVATAR_TONES[hashName(name) % AVATAR_TONES.length];

/** Stand-in profile photos are tinted per account, like real photos look different from each other. */
export const photoHue = (name: string) => hashName(name) % 360;

const QUOTE_WORDS: Record<ConnectQuoteLength, number> = { all: 30, short: 20, medium: 40, long: 60, xl: 90 };

/** Roughly how many words an untimed test asks for. */
function wordGoal(test: ConnectTest) {
  if (test.mode === "words") return test.wordTarget;
  if (test.mode === "quote") return QUOTE_WORDS[test.quoteLength];
  return Math.max(5, (test.presetText ?? "").trim().split(/\s+/).length);
}

const jitter = (spread: number) => (Math.random() - 0.5) * 2 * spread;

/** One second of typing on `test` for one player. */
export function typeOneTick(kid: Kid, test: ConnectTest, ticks: number): Kid {
  if (!kid.online || kid.finished || test.mode === "break") return kid;
  const wpm = Math.max(8, Math.round(kid.wpm ? kid.wpm * 0.55 + (kid.baseWpm + jitter(8)) * 0.45 : kid.baseWpm + jitter(10)));
  const accuracy = Math.min(100, Math.max(75, Math.round(kid.accuracy ? kid.accuracy * 0.6 + (kid.baseAccuracy + jitter(3)) * 0.4 : kid.baseAccuracy)));
  const progress = isTimedConnectTest(test)
    ? Math.min(100, (ticks / test.duration) * 100)
    : Math.min(100, kid.progress + (wpm / 60 / wordGoal(test)) * 100 * DEMO_SPEED);
  const finished = progress >= 100;
  return { ...kid, wpm, accuracy, progress, finished, results: finished ? [...kid.results, { wpm, accuracy }] : kid.results };
}

/** Whole-run average, or null before the first finished test. */
export function average(results: KidResult[]): KidResult | null {
  if (!results.length) return null;
  const sum = results.reduce((total, result) => ({ wpm: total.wpm + result.wpm, accuracy: total.accuracy + result.accuracy }), { wpm: 0, accuracy: 0 });
  return { wpm: Math.round(sum.wpm / results.length), accuracy: Math.round(sum.accuracy / results.length) };
}
