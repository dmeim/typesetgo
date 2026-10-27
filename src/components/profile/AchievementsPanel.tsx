import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowsClockwiseIcon, ArrowsOutSimpleIcon, CircleNotchIcon } from "@phosphor-icons/react";
import AchievementIcon from "@/components/auth/AchievementIcon";
import { achievementStyle, useAchievementPalette } from "@/components/auth/achievement-presentation";
import { ALL_ACHIEVEMENTS } from "@/lib/achievement-definitions";
import { AchievementDetailDialog, TierSegments } from "./AchievementDetailDialog";
import { Ring } from "./ProfileCharts";
import { PROFILE_SPRING } from "./profile-sections";
import {
  buildLadders, earnedCount, earnedPhrase, headlineStep, nextStep, tiersOf, toGo, type AchievementProgress, type Ladder,
} from "./profile-stats";

/** Collector cards: a trading card with tier bars showing how far through each tier you are. Tap to see every level. */
function CollectorCards({ ladders, onOpen }: { ladders: Ladder[]; onOpen: (ladder: Ladder, card: HTMLElement) => void }) {
  const palette = useAchievementPalette();
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-5">
      {ladders.map((ladder, index) => {
        const earned = earnedCount(ladder);
        const next = nextStep(ladder);
        const shown = headlineStep(ladder);
        const tier = tiersOf(ladder).find((summary) => summary.tier === shown.achievement.tier);
        const look = achievementStyle((shown.earned ? palette.earned : palette.unearned)[shown.achievement.tier]);
        return (
          <motion.button key={ladder.category} type="button" onClick={(event) => onOpen(ladder, event.currentTarget)} aria-haspopup="dialog" style={look}
            data-achievement-category={ladder.category} data-achievement-tier={shown.achievement.tier} data-achievement-state={shown.earned ? "earned" : "unearned"}
            aria-label={`${ladder.title}: ${earned} of ${ladder.steps.length} earned. View every level`}
            initial={{ opacity: 0, rotateY: -25 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ ...PROFILE_SPRING, delay: Math.min(index, 12) * 0.04 }} whileHover={{ y: -6, rotate: -1 }} whileTap={{ scale: 0.98 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-[var(--achievement-border)] bg-[var(--achievement-surface)] text-left text-[var(--achievement-foreground)] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="relative flex h-36 items-center justify-center overflow-hidden bg-[linear-gradient(160deg,var(--achievement-medallion),var(--achievement-surface))]">
              <span aria-hidden="true" className="absolute inset-0 opacity-20 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:12px_12px]" />
              <AchievementIcon icon={shown.achievement.icon} className={`relative size-16 text-[var(--achievement-icon)] drop-shadow-md ${shown.earned ? "" : "opacity-40"}`} />
              {shown.earned && <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_35%,#ffffff55_50%,transparent_65%)] transition-transform duration-700 group-hover:translate-x-full" />}
              <span className="absolute left-3 top-3 rounded-full bg-black/25 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">{shown.achievement.tier}</span>
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-[0.65rem] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><ArrowsOutSimpleIcon className="size-3" aria-hidden="true" />All levels</span>
            </span>
            <span className="flex flex-1 flex-col gap-1.5 p-4">
              <span className="text-[0.65rem] uppercase tracking-widest text-[var(--achievement-muted)]">{ladder.title} · {ladder.byTier ? `Level ${earned} of ${ladder.steps.length}` : `${earned} of ${ladder.steps.length} badges`}</span>
              <span className="text-lg font-bold leading-tight">{shown.achievement.title}</span>
              <span className="text-xs text-[var(--achievement-muted)]">{shown.achievement.description}</span>
              <span className="mt-auto flex flex-col gap-1.5 pt-3">
                <TierSegments ladder={ladder} />
                <span className="flex justify-between gap-2 text-[0.7rem] text-[var(--achievement-muted)]">
                  <span className="inline-block first-letter:uppercase">{ladder.byTier && tier ? `${tier.earned} of ${tier.steps.length} ${shown.achievement.tier}` : shown.earnedAt ? earnedPhrase(shown.earnedAt) : "Not yet"}</span>
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

/** Owner only: re-checks every saved test and awards anything missing. */
function RefreshButton({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const refresh = async () => {
    if (pending.current) return;
    pending.current = true;
    setRefreshing(true);
    setError(null);
    try {
      await onRefresh();
    } catch {
      setError("Achievements could not be refreshed. Please try again.");
    } finally {
      pending.current = false;
      setRefreshing(false);
    }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={() => void refresh()} disabled={refreshing}
        className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60">
        {refreshing ? <CircleNotchIcon className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <ArrowsClockwiseIcon className="size-4" aria-hidden="true" />}
        {refreshing ? "Refreshing…" : "Refresh achievements"}
      </button>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Achievements tab: overall progress, then a collector card per category; each opens every level behind it. */
export function AchievementsPanel({ earned, progress, onRefresh }: {
  earned: Record<string, number>;
  progress: AchievementProgress;
  onRefresh?: () => Promise<unknown>;
}) {
  const [opened, setOpened] = useState<Ladder["category"] | null>(null);
  const openedFrom = useRef<HTMLElement | null>(null);
  const ladders = useMemo(() => buildLadders(earned, progress), [earned, progress]);
  const total = ALL_ACHIEVEMENTS.length;
  const earnedTotal = ladders.reduce((sum, ladder) => sum + earnedCount(ladder), 0);
  const overall = total ? Math.round(earnedTotal / total * 100) : 0;
  const openedLadder = ladders.find((ladder) => ladder.category === opened);
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-border bg-card p-6">
        <Ring value={overall} size={72} stroke={7}><span className="text-sm font-bold tabular-nums">{overall}%</span></Ring>
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <h2 className="text-2xl font-bold">Achievements</h2>
          <p className="text-sm text-muted-foreground">{earnedTotal.toLocaleString()} of {total.toLocaleString()} earned</p>
        </div>
        {onRefresh && <RefreshButton onRefresh={onRefresh} />}
      </section>
      <CollectorCards ladders={ladders} onOpen={(ladder, card) => { openedFrom.current = card; setOpened(ladder.category); }} />
      {openedLadder && <AchievementDetailDialog ladder={openedLadder} returnFocus={openedFrom} onClose={() => setOpened(null)} />}
    </div>
  );
}
