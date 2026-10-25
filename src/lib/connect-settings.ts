import type { CSSProperties } from "react";
import type { ConnectOverrides, ConnectPacing, ConnectTest } from "@/lib/connect-types";
import { describeConnectTest } from "@/lib/connect-types";
import type { SettingsState } from "@/lib/typing-constants";
import type { ThemeColors } from "@/types/theme";
import { deriveThemeTyping, deriveThemeUI } from "@/lib/colors";

/**
 * Settings a participant's executor must use: the test itself is always locked,
 * and each override group replaces the participant's own preference only when enabled.
 */
export function resolveConnectSettings(test: ConnectTest, overrides: ConnectOverrides): Partial<SettingsState> {
  // Breaks have no typing surface; callers show a countdown instead.
  if (test.mode === "break") throw new Error("Breaks have no typing settings");
  const settings: Partial<SettingsState> = {
    mode: test.mode,
    duration: test.duration,
    wordTarget: test.wordTarget,
    difficulty: test.difficulty,
    punctuation: test.punctuation,
    numbers: test.numbers,
    capitalization: test.capitalization,
    quoteLength: test.quoteLength,
    presetText: test.presetText ?? "",
    presetModeType: test.presetModeType ?? "finish",
    // Room colors are applied separately through `connectThemeStyle`.
    theme: undefined,
    plan: undefined,
    planIndex: undefined,
  };
  const { typography, ghost, sound, keyboard } = overrides;
  if (typography?.enabled) {
    Object.assign(settings, {
      typingFontFamily: typography.typingFontFamily,
      typingFontSize: typography.typingFontSize,
      textAlign: typography.textAlign,
    });
  }
  if (ghost?.enabled) Object.assign(settings, { ghostWriterEnabled: ghost.ghostWriterEnabled, ghostWriterSpeed: ghost.ghostWriterSpeed });
  if (sound?.enabled) Object.assign(settings, { soundEnabled: sound.soundEnabled, typingSound: sound.typingSound, warningSound: sound.warningSound });
  if (keyboard?.enabled) Object.assign(settings, { showOnScreenKeyboard: keyboard.showOnScreenKeyboard, keyboardLayout: keyboard.keyboardLayout });
  return settings;
}

/** Remounts the executor whenever the attempt identity changes. */
export function connectAttemptKey(roomId: string, runVersion: number, stepIndex: number, attempt: number) {
  return `${roomId}:${runVersion}:${stepIndex}:${attempt}`;
}

/** The step a participant is on: shared in host pacing, individual in participant pacing. */
export function effectiveStep(pacing: ConnectPacing, currentIndex: number, participantStep: number) {
  return pacing === "host" ? currentIndex : participantStep;
}

/** Labels such as "2nd timed test" so repeated test types are distinguishable. */
export function connectTestLabels(tests: ConnectTest[]) {
  const totals = new Map<string, number>();
  for (const test of tests) totals.set(test.mode, (totals.get(test.mode) ?? 0) + 1);
  const seen = new Map<string, number>();
  const kind: Record<ConnectTest["mode"], string> = { time: "timed test", words: "word test", quote: "quote", preset: "custom text", break: "break" };
  return tests.map((test) => {
    const count = (seen.get(test.mode) ?? 0) + 1;
    seen.set(test.mode, count);
    const repeated = (totals.get(test.mode) ?? 0) > 1;
    return {
      title: test.title?.trim() || (repeated ? `${ordinal(count)} ${kind[test.mode]}` : capitalize(kind[test.mode])),
      detail: describeConnectTest(test),
    };
  });
}

function ordinal(value: number) {
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][value % 10] ?? "th";
  return `${value}${suffix}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Scoped CSS variables so a room theme never changes the participant's saved theme. */
export function connectThemeStyle(colors: ThemeColors | null | undefined): CSSProperties {
  if (!colors) return {};
  const ui = deriveThemeUI(colors);
  const typing = deriveThemeTyping(colors, ui);
  const cssName = (role: string) => role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return Object.fromEntries([
    ...Object.entries(ui).map(([role, value]) => [`--${cssName(role)}`, value]),
    ...Object.entries(typing).map(([role, value]) => [`--theme-typing-${cssName(role)}`, value]),
  ]) as CSSProperties;
}
