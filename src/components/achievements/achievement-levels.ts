// Helpers for showing one achievement level inside its category's ladder (notification center, celebration).
import { useCallback, type CSSProperties } from "react";
import { achievementStyle, useAchievementPalette } from "@/components/auth/achievement-presentation";
import { translateLegacyId } from "@/lib/achievement-definitions";
import { buildLadders, earnedCount, nextStep, toGo, type AchievementProgress, type Ladder, type LadderStep } from "@/components/profile/profile-stats";

export interface LadderLevel {
  ladder: Ladder;
  step: LadderStep;
}

/** The profile's tier colours as CSS variables for one level. */
export function useStepStyle() {
  const palette = useAchievementPalette();
  return useCallback((step: LadderStep): CSSProperties => achievementStyle((step.earned ? palette.earned : palette.unearned)[step.achievement.tier]), [palette]);
}

/** "Level 3 of 20" for long ladders, "2 of 6 badges" for one-time categories. */
export function levelLabel(ladder: Ladder, step: LadderStep) {
  const index = ladder.steps.indexOf(step) + 1;
  return ladder.byTier ? `Level ${index} of ${ladder.steps.length}` : `${earnedCount(ladder)} of ${ladder.steps.length} badges`;
}

/** "Next: Speed Demon", "Next: 120 words to go" or "All done". */
export function nextLabel(ladder: Ladder) {
  const next = nextStep(ladder);
  if (!next) return "All done";
  return `Next: ${ladder.current ? toGo(ladder, next) : next.achievement.title}`;
}

/** The ladder and level an achievement id (or an old-format id from stored history) belongs to. */
export function findLevel(ladders: readonly Ladder[], achievementId: string | undefined): LadderLevel | undefined {
  if (!achievementId) return undefined;
  const id = translateLegacyId(achievementId);
  for (const ladder of ladders) {
    const step = ladder.steps.find((candidate) => candidate.achievement.id === id);
    if (step) return { ladder, step };
  }
  return undefined;
}

/** Ladders from the saved earned map plus achievements we already know were earned (newest notices, queued celebrations). */
export function laddersWith(earned: Record<string, number> | undefined, known: Record<string, number>, progress?: AchievementProgress) {
  return buildLadders({ ...known, ...earned }, progress);
}
