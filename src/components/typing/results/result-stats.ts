import type { SettingsState } from "@/lib/typing-constants";
import { describePracticeLength, MODIFIER_OPTIONS, selectedModeOption, usesWordOptions } from "@/components/typing/practice-settings-meta";

/** Recent average and best for a signed-in solo player, captured before this result was saved. */
export interface ResultComparison {
  tests: number;
  averageWpm: number;
  bestWpm: number;
  averageAccuracy: number;
  bestAccuracy: number;
}

export type StatKind = "wpm" | "accuracy";

/** One headline number with what it is compared against and the scale for its bars. */
export interface ResultStat {
  label: string;
  value: number;
  suffix: string;
  /** Rounded recent average and best; missing for guests and Connect rooms. */
  average?: number;
  best?: number;
  /** Bar scale bounds, so small differences stay visible. */
  floor: number;
  ceiling: number;
  tone: string;
  fill: string;
  better: string;
  worse: string;
}

export function buildResultStats(wpm: number, accuracy: number, comparison: ResultComparison | null): Record<StatKind, ResultStat> {
  const roundedWpm = Math.round(wpm);
  const roundedAccuracy = Math.round(accuracy);
  const wpmCeiling = Math.max(40, Math.ceil(Math.max(roundedWpm, comparison?.bestWpm ?? 0, comparison?.averageWpm ?? 0) / 20) * 20);
  // Accuracy bars start just below the lowest value so small differences stay visible.
  const accuracyFloor = Math.max(0, Math.min(80, Math.floor(Math.min(roundedAccuracy, comparison?.averageAccuracy ?? 100) / 10) * 10 - 10));
  return {
    wpm: {
      label: "Words Per Minute", value: roundedWpm, suffix: "",
      average: comparison ? Math.round(comparison.averageWpm) : undefined,
      best: comparison ? Math.round(comparison.bestWpm) : undefined,
      floor: 0, ceiling: wpmCeiling, tone: "text-primary", fill: "bg-primary", better: "faster", worse: "slower",
    },
    accuracy: {
      label: "Accuracy", value: roundedAccuracy, suffix: "%",
      average: comparison ? Math.round(comparison.averageAccuracy) : undefined,
      best: comparison ? Math.round(comparison.bestAccuracy) : undefined,
      floor: accuracyFloor, ceiling: 100, tone: "text-(--accent-emphasis)", fill: "bg-(--accent-emphasis)",
      better: "more accurate", worse: "less accurate",
    },
  };
}

/** A settings summary such as "time · 30s · beginner · caps". */
export function describeTest(settings: SettingsState) {
  const mode = selectedModeOption(settings, false);
  const parts: (string | null)[] = [mode, describePracticeLength(settings, mode)];
  if (usesWordOptions(mode)) {
    parts.push(settings.difficulty);
    for (const { key, label } of MODIFIER_OPTIONS) if (settings[key]) parts.push(label);
  }
  if (settings.ghostWriterEnabled) parts.push(`ghost ${ghostSpeed(settings)} wpm`);
  return parts.filter(Boolean).join(" · ");
}

/** The ghost writer's speed, clamped to the range the settings allow. */
export function ghostSpeed(settings: SettingsState) {
  return Math.max(1, Math.min(200, settings.ghostWriterSpeed));
}

/** Plain-language reason a result could not be verified. */
export function describeInvalidReason(reason: string | undefined) {
  if (reason?.includes("progress")) return "Not enough typing activity reached the server";
  if (reason?.includes("WPM exceeds")) return "Speed exceeded the 300 WPM cap";
  if (reason?.includes("Burst") || reason?.includes("paste")) return "Input appeared faster than allowed";
  if (reason?.includes("too fast")) return "Test completed too quickly (need full duration)";
  if (reason?.includes("Session was not established")) return "Could not verify this test with a server session";
  return "Could not verify this test";
}
