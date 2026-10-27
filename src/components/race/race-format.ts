/** Shared springs, colours and wording for the Race pages. */

export const RACE_SPRING = { type: "spring", stiffness: 460, damping: 38, mass: 0.85 } as const;
export const BOUNCY_SPRING = { type: "spring", stiffness: 520, damping: 22 } as const;

export const DEFAULT_RACE_EMOJI = "🏎️";
export const RACE_DIFFICULTIES = ["beginner", "easy", "medium", "hard", "expert"] as const;
export const RACE_WORD_COUNTS = [10, 15, 25, 50, 100] as const;
/** Once three racers finish, everyone else gets this long (enforced by the race page, not the server). */
export const RACE_DEADLINE_MS = 10_000;

/** You are always the theme's primary colour; everyone else gets a stable colour from their session. */
const OTHER_COLORS = ["var(--accent-emphasis)", "var(--warning)", "var(--success)", "var(--secondary-emphasis)", "var(--muted-foreground)"];

export function racerColor(sessionId: string, isYou: boolean) {
  if (isYou) return "var(--primary)";
  let hash = 0;
  for (const char of sessionId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return OTHER_COLORS[hash % OTHER_COLORS.length];
}

/** A colour token mixed toward the card, for soft tinted backgrounds. */
export const tint = (color: string, amount = 18) => `color-mix(in srgb, ${color} ${amount}%, var(--card))`;

export function ordinal(place: number) {
  const tens = place % 100;
  if (tens >= 11 && tens <= 13) return `${place}th`;
  return `${place}${["th", "st", "nd", "rd"][place % 10] ?? "th"}`;
}

/** "23.4s" under a minute, "1:05.3" after. */
export function formatRaceTime(ms: number) {
  const tenths = Math.max(0, Math.floor(ms / 100));
  const seconds = tenths / 10;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds - minutes * 60).toFixed(1).padStart(4, "0")}`;
}
