import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowsOutSimpleIcon } from "@phosphor-icons/react";
import AchievementIcon from "@/components/auth/AchievementIcon";
import { achievementStyle, useAchievementPalette } from "@/components/auth/achievement-presentation";
import { AchievementDetailDialog, TierSegments } from "./AchievementDetailDialog";
import { Ring } from "./MockCharts";
import { LAB_SPRING } from "./lab-settings";
import {
  MOCK_ACHIEVEMENTS, MOCK_ACHIEVEMENT_TOTALS, earnedCount, earnedPhrase, ladderFor, nextStep, tiersOf, toGo, type MockAchievement,
} from "./mock-profile";

function usePresentation() {
  const palette = useAchievementPalette();
  return (item: MockAchievement) => achievementStyle((item.earnedAt ? palette.earned : palette.unearned)[item.achievement.tier]);
}

/** Collector cards: a trading card with tier bars showing how far through each tier you are. Tap to see every level. */
function CollectorCards({ onOpen }: { onOpen: (item: MockAchievement) => void }) {
  const style = usePresentation();
  const palette = useAchievementPalette();
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-5">
      {MOCK_ACHIEVEMENTS.map((item, index) => {
        const ladder = ladderFor(item);
        const earned = earnedCount(ladder);
        const next = nextStep(ladder);
        // Show the highest level reached, or the first one still ahead, so the card matches its tier bars.
        const shown = ladder.current ? ladder.steps[Math.max(earned - 1, 0)] : { achievement: item.achievement, earned: !!item.earnedAt, earnedAt: item.earnedAt };
        const tier = tiersOf(ladder).find((summary) => summary.tier === shown.achievement.tier);
        const look = shown.earned ? achievementStyle(palette.earned[shown.achievement.tier]) : style(item);
        return (
          <motion.button key={item.achievement.id} type="button" onClick={() => onOpen(item)} aria-haspopup="dialog" style={look}
            initial={{ opacity: 0, rotateY: -25 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ ...LAB_SPRING, delay: index * 0.06 }} whileHover={{ y: -6, rotate: -1 }} whileTap={{ scale: 0.98 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-[var(--achievement-border)] bg-[var(--achievement-surface)] text-left text-[var(--achievement-foreground)] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="relative flex h-36 items-center justify-center overflow-hidden bg-[linear-gradient(160deg,var(--achievement-medallion),var(--achievement-surface))]">
              <span aria-hidden="true" className="absolute inset-0 opacity-20 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:12px_12px]" />
              <AchievementIcon icon={shown.achievement.icon} className={`relative size-16 text-[var(--achievement-icon)] drop-shadow-md ${shown.earned ? "" : "opacity-40"}`} />
              {shown.earned && <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_35%,#ffffff55_50%,transparent_65%)] transition-transform duration-700 group-hover:translate-x-full" />}
              <span className="absolute left-3 top-3 rounded-full bg-black/25 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">{shown.achievement.tier}</span>
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-[0.65rem] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><ArrowsOutSimpleIcon className="size-3" aria-hidden="true" />All levels</span>
            </span>
            <span className="flex flex-1 flex-col gap-1.5 p-4">
              <span className="text-[0.65rem] uppercase tracking-widest text-[var(--achievement-muted)]">{item.category} · {ladder.current ? `Level ${earned} of ${ladder.steps.length}` : `${earned} of ${ladder.steps.length} badges`}</span>
              <span className="text-lg font-bold leading-tight">{shown.achievement.title}</span>
              <span className="text-xs text-[var(--achievement-muted)]">{shown.achievement.description}</span>
              <span className="mt-auto flex flex-col gap-1.5 pt-3">
                <TierSegments ladder={ladder} />
                <span className="flex justify-between gap-2 text-[0.7rem] text-[var(--achievement-muted)]">
                  <span className="inline-block first-letter:uppercase">{ladder.current && tier ? `${tier.earned} of ${tier.steps.length} ${shown.achievement.tier}` : shown.earnedAt ? earnedPhrase(shown.earnedAt) : "Not yet"}</span>
                  <span className="text-right">{next ? `Next: ${ladder.current ? toGo(ladder, next) : next.achievement.title}` : "All done"}</span>
                </span>
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/** Achievements tab: overall progress, then a collector card per achievement; each opens every level behind it. */
export function AchievementsPanel() {
  const [opened, setOpened] = useState<MockAchievement | null>(null);
  const overall = Math.round(MOCK_ACHIEVEMENT_TOTALS.earned / MOCK_ACHIEVEMENT_TOTALS.total * 100);
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-border bg-card p-6">
        <Ring value={overall} size={72} stroke={7}><span className="text-sm font-bold tabular-nums">{overall}%</span></Ring>
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <h2 className="text-2xl font-bold">Achievements</h2>
          <p className="text-sm text-muted-foreground">{MOCK_ACHIEVEMENT_TOTALS.earned} of {MOCK_ACHIEVEMENT_TOTALS.total} earned · a few examples below</p>
        </div>
      </section>
      <CollectorCards onOpen={setOpened} />
      {opened && <AchievementDetailDialog item={opened} ladder={ladderFor(opened)} onClose={() => setOpened(null)} />}
    </div>
  );
}
