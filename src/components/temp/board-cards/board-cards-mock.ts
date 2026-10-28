// Mock classroom for the live board card concepts. Nothing is fetched or saved.
import { BOARD_STATUS_LABELS, formatClock, type BoardStatus } from "@/components/connect/board/board-model";

export const TICK_MS = 1000;
/** Word tests run faster than real life so the demo keeps moving. */
const DEMO_SPEED = 3;
const FINISHED_REST = 4;
const DONE_REST = 14;

export type SimTest = { id: string; title: string; kind: "time" | "words" | "break"; amount: number };

/** Self-paced room: everyone moves through these at their own speed, so test dots show on every card. */
export const SIM_TESTS: SimTest[] = [
  { id: "t1", title: "Warm-up", kind: "time", amount: 60 },
  { id: "t2", title: "200 words", kind: "words", amount: 200 },
  { id: "t3", title: "Stretch break", kind: "break", amount: 45 },
  { id: "t4", title: "Speed round", kind: "time", amount: 30 },
];

export const PLAYER_COUNTS = [6, 12, 24, 36] as const;
export const ROOM_NAME = "Room 12 typing club";
export const ROOM_CODE = "K7QM";

type Phase = "ready" | "typing" | "finished" | "break" | "late" | "offline" | "done";

export interface SimPlayer {
  id: string;
  name: string;
  signedIn: boolean;
  baseWpm: number;
  baseAccuracy: number;
  phase: Phase;
  step: number;
  /** Seconds into a timed test or a break. */
  elapsed: number;
  /** Words typed in a word test. */
  words: number;
  wpm: number;
  accuracy: number;
  results: { wpm: number; accuracy: number }[];
  /** Ticks left before a resting phase moves on. */
  wait: number;
}

export interface SimState {
  tick: number;
  players: SimPlayer[];
}

/** What a card shows for one player. */
export interface CardView {
  id: string;
  name: string;
  picture?: string;
  status: BoardStatus;
  away: boolean;
  finished: boolean;
  leader: boolean;
  /** Place by speed among everyone shown, 1 = fastest. */
  rank: number;
  wpm: number;
  accuracy: number;
  isAverage: boolean;
  /** 0–100 through the current test. */
  percent: number;
  /** Short status for the card: "108/200 words", "0:42 left", "Break 0:12", "Finished"… */
  statusText: string;
  /** Index of the current test; `tests.length` once all are done. */
  step: number;
}

// Classroom-style names: long account names are the ones the current card cuts to "jbe…".
const NAMES = [
  "jbennett2031", "31tmorales", "maya.types", "Priya Raman", "noahkeys", "Alexandra Petrova",
  "Leo", "Sofia Castellanos", "xX_speedy_Xx", "Jordan", "Mohammed Al-Rashid", "zara.k",
  "kai_the_great", "Emily Nakamura", "Theo", "ruby.r", "Omar Haddad", "June",
  "felix-fox", "Isabella Fontaine", "ava2032", "Ethan W.", "mila.writes", "Benjamin Okafor",
  "Iris", "lucas_typing_pro", "Hannah Schmidt", "pixelpenguin", "Sam", "Chloe Dubois",
  "danny.d", "Grace Kim", "oliver_08", "Nora Lindqvist", "Mateo", "aaliyah.j",
];

/** Small seeded generator so the demo plays out the same way every time. */
function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashName(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

const pictureCache = new Map<string, string>();

/** A stand-in account picture, tinted per player like real photos differ from each other. */
export function mockPicture(name: string) {
  const cached = pictureCache.get(name);
  if (cached) return cached;
  const hue = hashName(name) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="hsl(${hue} 55% 62%)"/>`
    + `<circle cx="20" cy="16" r="7.5" fill="hsl(${(hue + 25) % 360} 35% 88%)"/>`
    + `<path d="M6 40c1.5-9 7.5-13 14-13s12.5 4 14 13z" fill="hsl(${(hue + 180) % 360} 45% 38%)"/></svg>`;
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  pictureCache.set(name, url);
  return url;
}

const blank = (index: number, random: () => number): SimPlayer => ({
  id: `p${index}`,
  name: NAMES[index % NAMES.length],
  signedIn: index % 3 !== 1,
  baseWpm: Math.round(24 + random() * 46),
  baseAccuracy: Math.round(88 + random() * 11),
  phase: "typing",
  step: 0,
  elapsed: 0,
  words: 0,
  wpm: 0,
  accuracy: 0,
  results: [],
  wait: 0,
});

const pastResults = (player: SimPlayer, count: number, random: () => number) =>
  Array.from({ length: count }, () => ({ wpm: Math.round(player.baseWpm + (random() - 0.5) * 10), accuracy: Math.min(100, Math.round(player.baseAccuracy + (random() - 0.5) * 4)) }));

/** The first six cover every state, so even the smallest room shows them all. */
function scenario(player: SimPlayer, index: number, random: () => number): SimPlayer {
  const live = { wpm: Math.round(player.baseWpm), accuracy: player.baseAccuracy };
  switch (index) {
    case 0: return { ...player, ...live, phase: "typing", step: 1, words: 108, wpm: 62, baseWpm: 62, results: pastResults(player, 1, random) };
    case 1: return { ...player, ...live, phase: "finished", step: 0, elapsed: 60, wait: 3, results: pastResults(player, 1, random) };
    case 2: return { ...player, phase: "break", step: 2, elapsed: 18, results: pastResults(player, 2, random) };
    case 3: return { ...player, phase: "late", wait: 22 };
    case 4: return { ...player, ...live, phase: "offline", step: 1, words: 41, results: pastResults(player, 1, random) };
    case 5: return { ...player, ...live, phase: "typing", step: 0, elapsed: 21 };
    case 6: return { ...player, phase: "done", step: SIM_TESTS.length, wait: 20, results: pastResults(player, 3, random) };
    case 7: return { ...player, phase: "ready", wait: 5 };
    case 19: return { ...player, ...live, phase: "offline", step: 0, elapsed: 33 };
    case 13: return { ...player, ...live, phase: "finished", step: 1, words: 200, wait: 2, results: pastResults(player, 1, random) };
    default: {
      const step = Math.floor(random() * 4) === 3 ? 3 : Math.floor(random() * 2);
      const results = pastResults(player, step === 3 ? 2 : step, random);
      if (SIM_TESTS[step].kind === "words") return { ...player, ...live, step, words: Math.round(random() * 170), results };
      return { ...player, ...live, step, elapsed: Math.round(random() * SIM_TESTS[step].amount * 0.8), results };
    }
  }
}

export function seedSim(seed = 12): SimState {
  const random = mulberry32(seed);
  return { tick: 0, players: NAMES.map((_, index) => scenario(blank(index, random), index, random)) };
}

const startStep = (player: SimPlayer, step: number): SimPlayer => {
  if (step >= SIM_TESTS.length) return { ...player, phase: "done", step: SIM_TESTS.length, wait: DONE_REST, wpm: 0, accuracy: 0 };
  const phase: Phase = SIM_TESTS[step].kind === "break" ? "break" : "typing";
  return { ...player, phase, step, elapsed: 0, words: 0, wpm: 0, accuracy: 0 };
};

function typeOneTick(player: SimPlayer, random: () => number): SimPlayer {
  const test = SIM_TESTS[player.step];
  const target = player.baseWpm + (random() - 0.5) * 14;
  const wpm = Math.max(8, Math.round(player.wpm ? player.wpm * 0.6 + target * 0.4 : target));
  const accuracy = Math.min(100, Math.max(80, Math.round(player.accuracy ? player.accuracy * 0.7 + (player.baseAccuracy + (random() - 0.5) * 5) * 0.3 : player.baseAccuracy)));
  const elapsed = player.elapsed + 1;
  const words = test.kind === "words" ? Math.min(test.amount, player.words + (wpm / 60) * DEMO_SPEED) : player.words;
  const done = test.kind === "time" ? elapsed >= test.amount : words >= test.amount;
  if (!done) return { ...player, wpm, accuracy, elapsed, words };
  return { ...player, wpm, accuracy, elapsed, words, phase: "finished", wait: FINISHED_REST, results: [...player.results, { wpm, accuracy }] };
}

function stepPlayer(player: SimPlayer, random: () => number): SimPlayer {
  switch (player.phase) {
    case "offline": return player;
    case "typing": return typeOneTick(player, random);
    case "break": {
      const elapsed = player.elapsed + 1;
      return elapsed >= SIM_TESTS[player.step].amount ? startStep(player, player.step + 1) : { ...player, elapsed };
    }
    case "finished": return player.wait > 1 ? { ...player, wait: player.wait - 1 } : startStep(player, player.step + 1);
    case "late":
    case "ready": return player.wait > 1 ? { ...player, wait: player.wait - 1 } : startStep(player, player.step);
    case "done": return player.wait > 1 ? { ...player, wait: player.wait - 1 } : { ...startStep(player, 0), results: [] };
  }
}

/** One second of the pretend room. Pure, so it is safe in a state updater. */
export function stepSim(state: SimState): SimState {
  const random = mulberry32(state.tick * 7919 + 1);
  return { tick: state.tick + 1, players: state.players.map((player) => stepPlayer(player, random)) };
}

const STATUS: Record<Phase, BoardStatus> = {
  ready: "waiting", typing: "typing", finished: "finished", break: "break", late: "late", offline: "offline", done: "done",
};

function average(results: SimPlayer["results"]) {
  if (results.length === 0) return null;
  return {
    wpm: results.reduce((sum, result) => sum + result.wpm, 0) / results.length,
    accuracy: results.reduce((sum, result) => sum + result.accuracy, 0) / results.length,
  };
}

function progress(player: SimPlayer) {
  const test = SIM_TESTS[player.step];
  if (player.phase === "done") return { percent: 100, text: BOARD_STATUS_LABELS.done };
  if (player.phase === "late") return { percent: 0, text: BOARD_STATUS_LABELS.late };
  if (player.phase === "ready" || !test) return { percent: 0, text: BOARD_STATUS_LABELS.waiting };
  if (player.phase === "break") return { percent: (player.elapsed / test.amount) * 100, text: `Break ${formatClock((test.amount - player.elapsed) * 1000)}` };
  const percent = player.phase === "finished" ? 100 : test.kind === "words" ? (player.words / test.amount) * 100 : (player.elapsed / test.amount) * 100;
  if (player.phase === "finished") return { percent, text: BOARD_STATUS_LABELS.finished };
  if (player.phase === "offline") return { percent, text: BOARD_STATUS_LABELS.offline };
  const detail = test.kind === "words" ? `${Math.floor(player.words)}/${test.amount} words` : `${formatClock((test.amount - player.elapsed) * 1000)} left`;
  return { percent, text: detail };
}

/** Cards for the first `count` players, with the crown on the fastest present one and places by speed. */
export function cardViews(state: SimState, count: number, pictures: boolean): CardView[] {
  const views = state.players.slice(0, count).map((player): CardView => {
    const status = STATUS[player.phase];
    const resting = player.phase === "done" || player.phase === "break";
    const averaged = resting ? average(player.results) : null;
    const { percent, text } = progress(player);
    return {
      id: player.id,
      name: player.name,
      picture: pictures && player.signedIn ? mockPicture(player.name) : undefined,
      status,
      away: player.phase === "offline",
      finished: player.phase === "finished" || player.phase === "done",
      leader: false,
      rank: 0,
      wpm: Math.round(averaged?.wpm ?? player.wpm),
      accuracy: Math.round(averaged?.accuracy ?? player.accuracy),
      isAverage: averaged !== null,
      percent: Math.max(0, Math.min(100, percent)),
      statusText: text,
      step: Math.min(player.step, SIM_TESTS.length),
    };
  });
  const order = [...views].sort((a, b) => Number(a.away) - Number(b.away) || b.wpm - a.wpm);
  order.forEach((view, index) => { view.rank = index + 1; });
  const leader = order.find((view) => !view.away && view.wpm > 0);
  if (leader) leader.leader = true;
  return views;
}
