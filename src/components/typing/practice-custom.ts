// Pure helpers for the custom length and own-text editors that unfold from the test settings pill.
import { MAX_DURATION_SECONDS, MAX_PRESET_TEXT_LENGTH, MAX_WORD_TARGET } from "@/lib/practice-limits";

export type LengthKind = "time" | "words";
/** Which editor is unfolded under the pill: a custom length or your own text. */
export type PracticeEditor = "length" | "text";
export type Severity = "ok" | "note" | "error";
export type Check = { severity: Severity; title: string; detail: string };
/** Typing speed behind the live estimates; `personal` when it is the player's own recent average. */
export type EstimateSpeed = { wpm: number; personal: boolean };

export const DEFAULT_ESTIMATE_SPEED: EstimateSpeed = { wpm: 40, personal: false };
export const LIMITS: Record<LengthKind, { min: number; max: number }> = {
  time: { min: 1, max: MAX_DURATION_SECONDS },
  words: { min: 1, max: MAX_WORD_TARGET },
};
export const QUICK_PICKS: Record<LengthKind, number[]> = { time: [45, 90, 180, 600, 1200], words: [15, 75, 150, 250, 1000] };
export const LENGTH_TITLES: Record<LengthKind, string> = { time: "Custom duration", words: "Custom word count" };
export const UNIT_HINTS: Record<LengthKind, string> = { time: "minutes:seconds", words: "words" };

export type Sample = { id: string; title: string; text: string };

export const SAMPLES: Sample[] = [
  { id: "pangrams", title: "Every letter", text: "Sphinx of black quartz, judge my vow. The quick brown fox jumps over the lazy dog. How vexingly quick daft zebras jump!" },
  { id: "bees", title: "Bee dance", text: "Honeybees share directions with a dance. When a bee finds a good patch of flowers, it flies home and waggles across the comb. The angle of the dance points toward the flowers, and the length of each waggle tells the other bees how far to fly." },
  { id: "story", title: "Short story", text: "Mina found a brass key half buried in the sand. It was too small for a door and too heavy for a diary. She carried it home, set it on the windowsill, and waited. That night, the old clock in the hall began to tick again." },
  { id: "spelling", title: "Tricky spelling", text: "necessary separate rhythm because believe friend business calendar library February government environment definitely tomorrow" },
  { id: "code", title: "Code line", text: "const total = items.reduce((sum, item) => sum + item.price, 0); if (total > 100) { applyDiscount(0.1); }" },
];

/** What a preset prompt keeps: printable keyboard characters with whitespace folded to single spaces. */
export function cleanPresetText(raw: string) {
  return raw.replace(/[^\x20-\x7E\n]/g, "").replace(/\s+/g, " ").trim();
}

export function formatLength(kind: LengthKind, value: number) {
  if (!Number.isFinite(value)) return "—";
  if (kind === "words") return value.toLocaleString();
  if (value < 60) return `${value}s`;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

/** What a length field shows when it is filled from a number. */
export function formatInput(kind: LengthKind, value: number) {
  if (!Number.isFinite(value)) return "";
  if (kind === "words" || value < 60) return String(value);
  return formatLength(kind, value);
}

/** Accepts "90", "1:30" or "2m 30s" for time and plain numbers (commas allowed) for words; NaN when unreadable. */
export function parseLength(kind: LengthKind, raw: string) {
  const text = raw.trim().toLowerCase().replace(/,/g, "");
  if (!text) return Number.NaN;
  if (kind === "words") return /^\d{1,6}$/.test(text) ? Number(text) : Number.NaN;
  const clock = /^(\d{1,3}):([0-5]?\d)$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const units = /^(?:(\d{1,3})\s*m(?:in)?)?\s*(?:(\d{1,4})\s*s(?:ec)?)?$/.exec(text);
  if (units && (units[1] || units[2])) return Number(units[1] ?? 0) * 60 + Number(units[2] ?? 0);
  return /^\d{1,5}$/.test(text) ? Number(text) : Number.NaN;
}

export function humanTime(seconds: number) {
  if (seconds < 45) return `${Math.max(1, Math.round(seconds / 5) * 5)} seconds`;
  const minutes = Math.round(seconds / 60);
  return minutes <= 1 ? "1 minute" : `${minutes} minutes`;
}

/** "~40s" or "~3 min" for tight spaces. */
export function shortTime(seconds: number) {
  return `~${humanTime(seconds).replace(" seconds", "s").replace(/ minutes?/, " min")}`;
}

function speedPhrase({ wpm, personal }: EstimateSpeed) {
  return personal ? `at your usual ${wpm} wpm` : `at ${wpm} wpm`;
}

/** Live guess: how many words a time test is, or how long a word test takes. */
export function estimate(kind: LengthKind, value: number, speed: EstimateSpeed) {
  if (kind === "time") return `about ${Math.max(1, Math.round((value / 60) * speed.wpm)).toLocaleString()} words`;
  return `about ${humanTime((value / speed.wpm) * 60)}`;
}

export function checkLength(kind: LengthKind, value: number, raw: string, speed: EstimateSpeed): Check {
  const unit = kind === "time" ? "second" : "word";
  if (!Number.isFinite(value)) {
    return raw.trim()
      ? { severity: "error", title: "Not a length", detail: kind === "time" ? "Try 90, 1:30 or 2m 30s." : "Use digits only, like 75." }
      : { severity: "error", title: "Empty", detail: kind === "time" ? "Type a length like 90 or 1:30, or use a quick pick." : "Type how many words, or use a quick pick." };
  }
  if (value < LIMITS[kind].min) return { severity: "error", title: "Too short", detail: `Set at least 1 ${unit}.` };
  if (value > LIMITS[kind].max) {
    return { severity: "error", title: "Too long", detail: kind === "time"
      ? `Time tests go up to ${formatLength("time", LIMITS.time.max)}.`
      : `Word tests go up to ${LIMITS.words.max.toLocaleString()} words.` };
  }
  if ((kind === "time" && value < 10) || (kind === "words" && value < 5)) {
    return { severity: "note", title: "Very short", detail: `Over in a blink: ${estimate(kind, value, speed)}.` };
  }
  return { severity: "ok", title: formatLength(kind, value), detail: `${capitalize(estimate(kind, value, speed))} ${speedPhrase(speed)}.` };
}

/** Bigger steps for bigger values, so the arrow keys stay useful from 5 seconds to an hour. */
export function stepLength(kind: LengthKind, value: number, direction: 1 | -1, fallback: number) {
  const start = Number.isFinite(value) ? value : fallback;
  const step = kind === "time"
    ? start < 60 ? 5 : start < 300 ? 15 : start < 1200 ? 60 : 300
    : start < 50 ? 5 : start < 200 ? 25 : start < 1000 ? 50 : 250;
  const snapped = direction > 0 ? Math.floor(start / step) * step + step : Math.ceil(start / step) * step - step;
  return Math.min(LIMITS[kind].max, Math.max(LIMITS[kind].min, snapped));
}

export type TextCheck = Check & { clean: string; words: number; chars: number; seconds: number; removedCount: number };

/** Mirrors the submit: keep printable keyboard characters, fold whitespace, cap at the character limit. */
export function checkText(raw: string, speed: EstimateSpeed): TextCheck {
  const clean = cleanPresetText(raw);
  const removedCount = [...raw].filter((char) => !/[\x20-\x7E\s]/.test(char)).length;
  const words = clean ? clean.split(" ").length : 0;
  const seconds = (words / speed.wpm) * 60;
  const base = { clean, words, chars: clean.length, seconds, removedCount };
  if (!clean) return { ...base, severity: "error", title: "Nothing to type yet", detail: "Paste or type some text, or start from a sample." };
  if (clean.length > MAX_PRESET_TEXT_LENGTH) {
    return { ...base, severity: "error", title: "Too long",
      detail: `${(clean.length - MAX_PRESET_TEXT_LENGTH).toLocaleString()} characters over the ${MAX_PRESET_TEXT_LENGTH.toLocaleString()} limit.` };
  }
  if (words < 5) return { ...base, severity: "note", title: "Very short", detail: "Fine for a quick drill; you'll be done in seconds." };
  return { ...base, severity: "ok", title: `${words.toLocaleString()} words`, detail: `About ${humanTime(seconds)} ${speedPhrase(speed)}.` };
}

const LOOKALIKES: [RegExp, string][] = [[/[\u2018\u2019\u201a\u2032]/g, "'"], [/[\u201c\u201d\u201e\u2033]/g, "\""], [/[\u2013\u2014\u2212]/g, "-"], [/\u2026/g, "..."], [/[\u00a0\u2009\u202f]/g, " "]];

/** Swaps curly quotes, long dashes and accents for keyboard versions, then drops what is left. */
export function fixCharacters(raw: string) {
  const swapped = LOOKALIKES.reduce((text, [pattern, plain]) => text.replace(pattern, plain), raw).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return swapped.replace(/[^\x20-\x7E\n]/g, "").replace(/ {2,}/g, " ");
}

/** Cuts the text at the last whole word that fits the limit. */
export function trimToLimit(raw: string) {
  const clean = cleanPresetText(raw);
  if (clean.length <= MAX_PRESET_TEXT_LENGTH) return clean;
  const cut = clean.slice(0, MAX_PRESET_TEXT_LENGTH + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut.slice(0, MAX_PRESET_TEXT_LENGTH)).trim();
}

export function excerpt(text: string, length = 22) {
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
