import type { Icon } from "@phosphor-icons/react";
import { AtIcon, HashIcon, LeafIcon, PencilSimpleIcon, QuotesIcon, SmileyIcon, TextAaIcon, TextAlignLeftIcon, TimerIcon } from "@phosphor-icons/react";
import type { SettingsState } from "@/lib/typing-constants";
import type { ModeSelectorOption } from "./practice-config";

export const SETTINGS_SPRING = { type: "spring", stiffness: 520, damping: 38, mass: 0.8 } as const;

export const MODE_META: Record<ModeSelectorOption, { Icon: Icon; hint: string }> = {
  kid: { Icon: SmileyIcon, hint: "Big letters, simple words" },
  zen: { Icon: LeafIcon, hint: "No timer, just type" },
  time: { Icon: TimerIcon, hint: "Type until the clock runs out" },
  words: { Icon: TextAlignLeftIcon, hint: "Finish a set number of words" },
  quote: { Icon: QuotesIcon, hint: "Type a real quote" },
  preset: { Icon: PencilSimpleIcon, hint: "Practice your own text" },
};

export const MODIFIER_OPTIONS = [
  { key: "capitalization", label: "caps", Icon: TextAaIcon },
  { key: "punctuation", label: "punctuation", Icon: AtIcon },
  { key: "numbers", label: "numbers", Icon: HashIcon },
] as const satisfies readonly { key: keyof SettingsState; label: string; Icon: Icon }[];

export function selectedModeOption(settings: Pick<SettingsState, "mode">, isKidMode: boolean): ModeSelectorOption {
  if (isKidMode) return "kid";
  return settings.mode === "plan" ? "zen" : settings.mode;
}

/** Difficulty and modifiers only change generated word prompts. */
export function usesWordOptions(mode: ModeSelectorOption) {
  return mode === "time" || mode === "words" || mode === "zen";
}

export function describePracticeLength(settings: SettingsState, mode: ModeSelectorOption) {
  switch (mode) {
    case "time": return `${settings.duration}s`;
    case "words": return `${settings.wordTarget} words`;
    case "quote": return settings.quoteLength === "all" ? "any quote" : `${settings.quoteLength} quote`;
    case "zen": return "no limit";
    case "preset": return "your text";
    case "kid": return null;
  }
}
