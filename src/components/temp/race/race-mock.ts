/** Pretend room, racers and race maths for the Race mockups. Nothing here touches Convex or saved preferences. */

export type Screen = "landing" | "lobby" | "race" | "results";
export type Role = "host" | "guest";

export const SCREENS: Screen[] = ["landing", "lobby", "race", "results"];

export const ROOM_CODE = "ZOOM42";
export const PASSAGE = "Racing is more fun with friends. Keep your eyes on the words and let your fingers fly to the finish.";

export const DIFFICULTIES = ["beginner", "easy", "medium", "hard", "expert"] as const;
export const WORD_COUNTS = [10, 15, 25, 50, 100] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const AVATAR_EMOJIS = ["🦊", "🏎️", "🐙", "🦖", "🐝", "🔥", "🌈", "👾", "🐼", "🦄", "🚀", "🐢"];

/** Lobby countdown and the race's own "3, 2, 1" before the words unlock. */
export const COUNTDOWN_MS = 3000;
/** Once three racers finish, everyone else gets this long (matches the real race). */
export const DEADLINE_MS = 10_000;
/** How fast autoplay types for you. */
export const AUTO_WPM = 70;

export const YOU_ID = "you";
export const YOU_COLOR = "var(--primary)";

export interface RacerProfile {
  id: string;
  name: string;
  emoji: string;
  /** A theme colour token for lanes, rings and dots. */
  color: string;
  wpm: number;
  accuracy: number;
  /** How long the racer takes to press the first key. */
  reactionMs: number;
}

export const BOTS: RacerProfile[] = [
  { id: "maya", name: "Maya", emoji: "🐆", color: "var(--accent-emphasis)", wpm: 92, accuracy: 98, reactionMs: 310 },
  { id: "sofia", name: "Sofia", emoji: "⚡", color: "var(--warning)", wpm: 80, accuracy: 95, reactionMs: 420 },
  { id: "jordan", name: "Jordan", emoji: "🚀", color: "var(--success)", wpm: 74, accuracy: 96, reactionMs: 380 },
  { id: "priya", name: "Priya", emoji: "🐙", color: "var(--secondary-emphasis)", wpm: 64, accuracy: 99, reactionMs: 520 },
  { id: "leo", name: "Leo", emoji: "🐢", color: "var(--muted-foreground)", wpm: 41, accuracy: 93, reactionMs: 650 },
];

/** When you join someone else's race, Maya is hosting. */
export const HOST_BOT_ID = "maya";
/** Leo waits for you before he readies up, so the lobby shows someone still getting set. */
export const LATE_BOT_ID = "leo";
export const BOT_READY_DELAYS: Record<string, number> = { maya: 700, sofia: 1600, jordan: 2600, priya: 3800 };

export interface YouProfile {
  name: string;
  emoji: string;
}

export const DEFAULT_YOU: YouProfile = { name: "Dimi", emoji: "🦊" };

export function youProfile(you: YouProfile): RacerProfile {
  return { id: YOU_ID, name: you.name, emoji: you.emoji, color: YOU_COLOR, wpm: AUTO_WPM, accuracy: 100, reactionMs: 450 };
}

export const hostIdFor = (role: Role) => (role === "host" ? YOU_ID : HOST_BOT_ID);

const WOBBLE = 1.3;
const seedOf = (id: string) => [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6.28;

/** Characters a pretend racer has typed after `ms`: steady speed with a gentle surge and fade, never going backwards. */
export function botChars(profile: RacerProfile, ms: number) {
  const seconds = Math.max(0, ms - profile.reactionMs) / 1000;
  const rate = (profile.wpm * 5) / 60;
  const seed = seedOf(profile.id);
  const swing = (rate * 0.45) / WOBBLE;
  return Math.max(0, rate * seconds + swing * (Math.sin(WOBBLE * seconds + seed) - Math.sin(seed)));
}

function finishMsFor(profile: RacerProfile, length: number) {
  let ms = 0;
  while (botChars(profile, ms) < length) ms += 20;
  return ms;
}

export const BOT_FINISH_MS: Record<string, number> = Object.fromEntries(BOTS.map((bot) => [bot.id, finishMsFor(bot, PASSAGE.length)]));

/** Words per minute from characters and time, with a floor so the first second doesn't spike. */
export const wpmFrom = (chars: number, ms: number) => Math.round(chars / 5 / (Math.max(ms, 1000) / 60_000));

/** Autoplay keystroke gap: a steady rhythm with a little swing, plus a pause after each word. */
export function autoDelay(index: number) {
  if (index === 0) return 450;
  const base = 60_000 / (AUTO_WPM * 5);
  const swing = 0.75 + ((index * 37) % 10) / 20;
  return base * swing * (PASSAGE[index - 1] === " " ? 1.25 : 1);
}

/** Milliseconds autoplay needs to reach each character, from a standing start. */
export const AUTO_TIMES: number[] = [0];
for (let index = 0; index < PASSAGE.length; index++) AUTO_TIMES.push(AUTO_TIMES[index] + autoDelay(index));

/** Characters autoplay has typed `ms` after it took over at character `from`. */
export function autoCharsAfter(from: number, ms: number) {
  let chars = from;
  while (chars < PASSAGE.length && AUTO_TIMES[chars + 1] - AUTO_TIMES[from] <= ms) chars++;
  return chars;
}

export interface RaceResult {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isYou: boolean;
  isHost: boolean;
  place: number;
  wpm: number;
  accuracy: number;
  /** Null when the racer ran out of time. */
  finishMs: number | null;
  reactionMs: number;
  progress: number;
}

/** A finished race with you on autoplay, for opening the results screen directly. */
export function simulateResults(you: YouProfile, role: Role): RaceResult[] {
  const me = youProfile(you);
  const youMs = AUTO_TIMES[PASSAGE.length];
  const all = [...BOTS.map((bot) => ({ profile: bot, finish: BOT_FINISH_MS[bot.id] })), { profile: me, finish: Math.round(youMs) }];
  const sorted = [...all].sort((a, b) => a.finish - b.finish);
  const deadline = sorted[2].finish + DEADLINE_MS;
  const hostId = hostIdFor(role);
  return sorted.map(({ profile, finish }, index) => {
    const done = finish <= deadline;
    const chars = done ? PASSAGE.length : Math.min(PASSAGE.length, botChars(profile, deadline));
    return {
      id: profile.id,
      name: profile.name,
      emoji: profile.emoji,
      color: profile.color,
      isYou: profile.id === YOU_ID,
      isHost: profile.id === hostId,
      place: index + 1,
      wpm: wpmFrom(chars, done ? finish : deadline),
      accuracy: profile.id === YOU_ID ? 98 : profile.accuracy,
      finishMs: done ? finish : null,
      reactionMs: profile.reactionMs,
      progress: chars / PASSAGE.length,
    };
  });
}

export const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export function ordinal(place: number) {
  const tens = place % 100;
  if (tens >= 11 && tens <= 13) return `${place}th`;
  return `${place}${["th", "st", "nd", "rd"][place % 10] ?? "th"}`;
}

/** Three-letter driver code, like a timing screen. */
export const racerCode = (name: string) => name.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase().padEnd(3, "·");

/** A colour token mixed toward the card, for soft tinted backgrounds. */
export const tint = (color: string, amount = 18) => `color-mix(in srgb, ${color} ${amount}%, var(--card))`;

export const RACE_SPRING = { type: "spring", stiffness: 460, damping: 38, mass: 0.85 } as const;
export const BOUNCY_SPRING = { type: "spring", stiffness: 520, damping: 22 } as const;
