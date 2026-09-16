export const TIME_PRESETS = [15, 30, 60, 120, 300];
export const WORD_PRESETS = [10, 25, 50, 100, 500];
export const MODE_SELECTOR_OPTIONS = ["kid", "zen", "time", "words", "quote"] as const;
export const PROMPT_SETTING_KEYS = ["mode", "duration", "wordTarget", "difficulty", "quoteLength",
  "punctuation", "numbers", "capitalization", "presetText", "presetModeType"] as const;

export type ModeSelectorOption = (typeof MODE_SELECTOR_OPTIONS)[number];

export { TEXT_SIZE_MIN, TEXT_SIZE_MAX, MAX_DURATION_SECONDS, MAX_WORD_TARGET, MAX_GHOST_SPEED } from "@/lib/practice-limits";
