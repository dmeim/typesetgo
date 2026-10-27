// Mock data and pure helpers for the custom length and own-text mockups. Nothing here is saved.
import { MAX_DURATION_SECONDS, MAX_PRESET_TEXT_LENGTH, MAX_WORD_TARGET } from "@/lib/practice-limits";
import { TIME_PRESETS, WORD_PRESETS } from "@/components/typing/practice-config";

export type SurfaceKind = "length" | "text";
export type LengthKind = "time" | "words";
export type Severity = "ok" | "note" | "error";
export type SeedId = "current" | "empty" | "short" | "long" | "odd";
export type PillStyle = "plain" | "badge" | "estimate";

export type Applied = { time: number; words: number; text: string };

export type ConceptProps = {
  surface: SurfaceKind;
  kind: LengthKind;
  compact: boolean;
  applied: Applied;
  apply: (patch: Partial<Applied>) => void;
  /** Opens the surface on mount with this starting draft; null starts closed. */
  initialSeed: SeedId | null;
};

export const INITIAL_APPLIED: Applied = { time: 30, words: 25, text: "" };
export const MOCK_WPM = 42;
export const MAX_TEXT = MAX_PRESET_TEXT_LENGTH;
export const LIMITS: Record<LengthKind, { min: number; max: number }> = {
  time: { min: 1, max: MAX_DURATION_SECONDS },
  words: { min: 1, max: MAX_WORD_TARGET },
};
export const PILL_PRESETS: Record<LengthKind, number[]> = { time: TIME_PRESETS, words: WORD_PRESETS };
export const QUICK_PICKS: Record<LengthKind, number[]> = { time: [45, 90, 180, 600, 1200], words: [15, 75, 150, 250, 1000] };
export const LENGTH_TITLES: Record<LengthKind, string> = { time: "Custom duration", words: "Custom word count" };
export const UNIT_HINTS: Record<LengthKind, string> = { time: "minutes:seconds", words: "words" };

export const CONCEPTS: { name: string; summary: string; pill: PillStyle }[] = [
  { name: "Unfold", summary: "No dialog at all: the pill grows downward and the field sits right under your other choices, pushing the test down while you edit.", pill: "plain" },
  { name: "Anchored", summary: "A small card hangs from the custom chip with one big number, minus and plus buttons and a few quick picks.", pill: "badge" },
  { name: "Dial", summary: "Drag a gauge to set the length and watch a live guess of how many words or minutes that is at your speed; your own text gets a length meter instead.", pill: "estimate" },
  { name: "Full card", summary: "A roomy card in the middle of the screen: separate minutes and seconds boxes, or a full text editor with word count, typing time, character fixes and sample texts.", pill: "badge" },
  { name: "Bottom sheet", summary: "A sheet slides up from the bottom with its own number pad, so phones never open the system keyboard for a number; drag it down to close.", pill: "plain" },
];

export const SEEDS: { id: SeedId; label: string; textOnly?: boolean }[] = [
  { id: "current", label: "Your value" },
  { id: "empty", label: "Empty" },
  { id: "short", label: "Too short" },
  { id: "long", label: "Too long" },
  { id: "odd", label: "Odd characters", textOnly: true },
];

export type Sample = { id: string; title: string; text: string };

export const SAMPLES: Sample[] = [
  { id: "pangrams", title: "Every letter", text: "Sphinx of black quartz, judge my vow. The quick brown fox jumps over the lazy dog. How vexingly quick daft zebras jump!" },
  { id: "bees", title: "Bee dance", text: "Honeybees share directions with a dance. When a bee finds a good patch of flowers, it flies home and waggles across the comb. The angle of the dance points toward the flowers, and the length of each waggle tells the other bees how far to fly." },
  { id: "story", title: "Short story", text: "Mina found a brass key half buried in the sand. It was too small for a door and too heavy for a diary. She carried it home, set it on the windowsill, and waited. That night, the old clock in the hall began to tick again." },
  { id: "spelling", title: "Tricky spelling", text: "necessary separate rhythm because believe friend business calendar library February government environment definitely tomorrow" },
  { id: "code", title: "Code line", text: "const total = items.reduce((sum, item) => sum + item.price, 0); if (total > 100) { applyDiscount(0.1); }" },
];

// Stops for the Dial: fine steps for short tests, coarse steps for long ones.
const ranges = (spec: [number, number, number][]) => spec.flatMap(([from, to, step]) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step));
export const DIAL_STOPS: Record<LengthKind, number[]> = {
  time: ranges([[5, 60, 5], [75, 180, 15], [210, 600, 30], [660, 1800, 60], [2100, 3600, 300]]),
  words: [...ranges([[5, 50, 5], [60, 200, 10], [225, 500, 25], [550, 1000, 50], [1100, 2000, 100], [2250, 5000, 250], [5500, 9500, 500]]), 9999],
};
export const DIAL_MARKS: Record<LengthKind, number[]> = { time: [5, 60, 300, 900, 3600], words: [5, 50, 250, 1000, 9999] };

export function nearestStop(kind: LengthKind, value: number) {
  const stops = DIAL_STOPS[kind];
  if (!Number.isFinite(value)) return 0;
  let best = 0;
  stops.forEach((stop, index) => { if (Math.abs(stop - value) < Math.abs(stops[best] - value)) best = index; });
  return best;
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

/** "~63 words" for a time test, "~3 min" for a word test. */
export function shortEstimate(kind: LengthKind, value: number) {
  return kind === "time" ? `~${Math.max(1, Math.round((value / 60) * MOCK_WPM)).toLocaleString()} words` : shortTime((value / MOCK_WPM) * 60);
}

/** Live guess: how many words a time test is, or how long a word test takes, at the mock speed. */
export function estimate(kind: LengthKind, value: number) {
  if (kind === "time") return `about ${Math.max(1, Math.round((value / 60) * MOCK_WPM)).toLocaleString()} words`;
  return `about ${humanTime((value / MOCK_WPM) * 60)}`;
}

export type Check = { severity: Severity; title: string; detail: string };

export function checkLength(kind: LengthKind, value: number, raw = ""): Check {
  const unit = kind === "time" ? "second" : "word";
  if (!Number.isFinite(value)) {
    return raw.trim()
      ? { severity: "error", title: "Not a length", detail: kind === "time" ? "Try 90, 1:30 or 2m 30s." : "Use digits only, like 75." }
      : { severity: "error", title: "Empty", detail: kind === "time" ? "Type a length like 90 or 1:30, or use a quick pick." : "Type how many words, or use a quick pick." };
  }
  if (value < LIMITS[kind].min) return { severity: "error", title: "Too short", detail: `Set at least 1 ${unit}.` };
  if (value > LIMITS[kind].max) {
    return { severity: "error", title: "Too long", detail: kind === "time" ? "Time tests go up to 60:00." : `Word tests go up to ${LIMITS.words.max.toLocaleString()} words.` };
  }
  if ((kind === "time" && value < 10) || (kind === "words" && value < 5)) {
    return { severity: "note", title: "Very short", detail: `Over in a blink: ${estimate(kind, value)}.` };
  }
  return { severity: "ok", title: formatLength(kind, value), detail: `${capitalize(estimate(kind, value))} at your usual ${MOCK_WPM} wpm.` };
}

/** Bigger steps for bigger values, so plus and minus stay useful from 5 seconds to an hour. */
export function stepLength(kind: LengthKind, value: number, direction: 1 | -1) {
  const start = Number.isFinite(value) ? value : INITIAL_APPLIED[kind];
  const step = kind === "time"
    ? start < 60 ? 5 : start < 300 ? 15 : start < 1200 ? 60 : 300
    : start < 50 ? 5 : start < 200 ? 25 : start < 1000 ? 50 : 250;
  const snapped = direction > 0 ? Math.floor(start / step) * step + step : Math.ceil(start / step) * step - step;
  return Math.min(LIMITS[kind].max, Math.max(LIMITS[kind].min, snapped));
}

export function seedLength(kind: LengthKind, seed: SeedId, applied: Applied) {
  switch (seed) {
    case "empty": return Number.NaN;
    case "short": return 0;
    case "long": return kind === "time" ? 4500 : 12000;
    default: return applied[kind];
  }
}

const ODD_TEXT = "“Café au lait,” she said — it’s 5 °C outside… 🌧️\nLet’s practise naïve résumé words anyway!";

export function seedText(seed: SeedId, applied: Applied) {
  switch (seed) {
    case "empty": return "";
    case "short": return "Hi there.";
    case "long": return Array.from({ length: 50 }, () => SAMPLES[1].text).join("\n\n");
    case "odd": return ODD_TEXT;
    default: return applied.text;
  }
}

export type TextCheck = Check & { clean: string; words: number; chars: number; seconds: number; removed: string[]; removedCount: number };

/** Mirrors Home's submit: keep printable keyboard characters, fold whitespace, cap at the character limit. */
export function checkText(raw: string): TextCheck {
  const clean = raw.replace(/[^\x20-\x7E\n]/g, "").replace(/\s+/g, " ").trim();
  const skipped = [...raw].filter((char) => !/[\x20-\x7E\s]/.test(char));
  const words = clean ? clean.split(" ").length : 0;
  const seconds = (words / MOCK_WPM) * 60;
  const base = { clean, words, chars: clean.length, seconds, removed: [...new Set(skipped)].slice(0, 8), removedCount: skipped.length };
  if (!clean) return { ...base, severity: "error", title: "Nothing to type yet", detail: "Paste or type some text, or start from a sample." };
  if (clean.length > MAX_TEXT) {
    return { ...base, severity: "error", title: "Too long", detail: `${(clean.length - MAX_TEXT).toLocaleString()} characters over the ${MAX_TEXT.toLocaleString()} limit.` };
  }
  if (words < 5) return { ...base, severity: "note", title: "Very short", detail: "Fine for a quick drill; you'll be done in seconds." };
  return { ...base, severity: "ok", title: `${words.toLocaleString()} words`, detail: `About ${humanTime(seconds)} at your usual ${MOCK_WPM} wpm.` };
}

const LOOKALIKES: [RegExp, string][] = [[/[\u2018\u2019\u201a\u2032]/g, "'"], [/[\u201c\u201d\u201e\u2033]/g, "\""], [/[\u2013\u2014\u2212]/g, "-"], [/\u2026/g, "..."], [/[\u00a0\u2009\u202f]/g, " "]];

/** Swaps curly quotes, long dashes and accents for keyboard versions, then drops what is left. */
export function fixCharacters(raw: string) {
  const swapped = LOOKALIKES.reduce((text, [pattern, plain]) => text.replace(pattern, plain), raw).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return swapped.replace(/[^\x20-\x7E\n]/g, "").replace(/ {2,}/g, " ");
}

/** Cuts the text at the last whole word that fits the limit. */
export function trimToLimit(raw: string) {
  const clean = checkText(raw).clean;
  if (clean.length <= MAX_TEXT) return clean;
  const cut = clean.slice(0, MAX_TEXT + 1);
  return cut.slice(0, cut.lastIndexOf(" ")).trim();
}

export function excerpt(text: string, length = 22) {
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function isCustom(kind: LengthKind, value: number) {
  return !PILL_PRESETS[kind].includes(value);
}
