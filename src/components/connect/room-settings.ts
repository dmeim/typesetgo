import type { SettingsState } from "@/lib/typing-constants";
import type { PlanItem } from "@/types/plan";

export const isTimedPractice = (settings: Partial<SettingsState>) =>
  settings.mode === "time" ||
  (settings.mode === "preset" && settings.presetModeType === "time");

export function getPlanStep(
  settings: Partial<SettingsState>,
): PlanItem | undefined {
  if (settings.mode !== "plan") return undefined;
  const index = settings.planIndex ?? 0;
  if (!Number.isInteger(index) || index < 0) return undefined;
  const step = settings.plan?.[index];
  return step && step.mode !== "plan" ? step : undefined;
}

/** Resolve the host-selected step; never activate the solo plan executor. */
export function resolveRoomSettings(
  settings: Partial<SettingsState>,
): Partial<SettingsState> | undefined {
  const step = getPlanStep(settings);
  if (settings.mode === "plan" && !step) return undefined;
  const resolved = {
    ...settings,
    ...step?.settings,
    mode: step?.mode ?? settings.mode,
  };
  // Presentation and sound belong to the room, even for imported plan steps.
  for (const key of [
    "theme",
    "typingFontSize",
    "textAlign",
    "soundEnabled",
    "typingSound",
    "warningSound",
  ] as const) {
    if (settings[key] !== undefined)
      Object.assign(resolved, { [key]: settings[key] });
    else delete resolved[key];
  }
  resolved.soundEnabled = settings.soundEnabled ?? false;
  resolved.typingSound = settings.typingSound ?? "creamy";
  resolved.warningSound = settings.warningSound ?? "clock";
  delete resolved.plan;
  delete resolved.planIndex;
  return resolved;
}

export function practiceSessionKey(
  roomId: string,
  runVersion = 0,
  resetVersion = 0,
  settings: Partial<SettingsState>,
) {
  const step = getPlanStep(settings);
  return `${roomId}:${runVersion}:${resetVersion}:${settings.mode === "plan" ? `${settings.planIndex ?? 0}:${step?.id ?? "missing"}` : "practice"}`;
}
