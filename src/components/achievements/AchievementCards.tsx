import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CheckIcon, MapPinIcon, SparkleIcon } from "@phosphor-icons/react";
import AchievementIcon from "@/components/auth/AchievementIcon";
import { TierSegments } from "@/components/profile/AchievementDetailDialog";
import { earnedPhrase, nextStep, toGo, type Ladder, type LadderStep } from "@/components/profile/profile-stats";
import { TIER_COLORS } from "@/lib/achievement-definitions";
import { cn } from "@/lib/utils";
import { levelLabel, nextLabel, useStepStyle } from "./achievement-levels";

const tierName = (tier: string) => tier[0].toUpperCase() + tier.slice(1);

function CardArt({ step, isNew, banner = false, className, children }: { step: LadderStep; isNew?: boolean; banner?: boolean; className?: string; children?: ReactNode }) {
  return (
    <span className={cn("relative flex items-center justify-center overflow-hidden bg-[linear-gradient(160deg,var(--achievement-medallion),var(--achievement-surface))]", className)}>
      <span aria-hidden="true" className="absolute inset-0 opacity-20 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:12px_12px]" />
      <AchievementIcon icon={step.achievement.icon} className="relative size-[45%] max-h-16 max-w-16 text-[var(--achievement-icon)] drop-shadow-md" />
      <span className={cn("absolute left-2.5 top-2.5 rounded-full bg-black/25 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white", banner && "hidden @min-[20rem]:block")}>{step.achievement.tier}</span>
      {isNew && (
        <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-primary-foreground">
          <SparkleIcon weight="fill" className="size-3" aria-hidden="true" />New
        </span>
      )}
      {children}
    </span>
  );
}

/**
 * The profile's collector card for one level. `full` is the tall trading card, `banner` lays the art beside
 * the text for lists (it widens inside a container of 20rem or more). Interactive wrappers belong to the caller.
 */
export function CollectorCard({ ladder, step, isNew = false, variant = "full", className, bodyClassName }: {
  ladder: Ladder;
  step: LadderStep;
  isNew?: boolean;
  variant?: "full" | "banner";
  className?: string;
  /** Extra classes for the text column, e.g. room for a corner button. */
  bodyClassName?: string;
}) {
  const style = useStepStyle();
  const banner = variant === "banner";
  return (
    <span style={style(step)} data-achievement-tier={step.achievement.tier}
      className={cn("relative flex overflow-hidden rounded-2xl border-2 border-[var(--achievement-border)] bg-[var(--achievement-surface)] text-left text-[var(--achievement-foreground)] shadow-lg", banner ? "flex-row" : "flex-col", className)}>
      <CardArt step={step} isNew={isNew && !banner} banner={banner} className={banner ? "w-16 shrink-0 @min-[20rem]:w-24" : "h-36"} />
      <span className={cn("flex min-w-0 flex-1 flex-col gap-1", banner ? "p-3" : "p-4", bodyClassName)}>
        <span className="truncate text-[0.65rem] uppercase tracking-widest text-[var(--achievement-muted)]">{ladder.title} · {levelLabel(ladder, step)}</span>
        <span className={cn("break-words font-bold leading-tight", banner ? "text-base" : "text-lg")}>{step.achievement.title}</span>
        <span className={cn("text-xs text-[var(--achievement-muted)]", banner && "line-clamp-1")}>{step.achievement.description}</span>
        <span className="mt-auto flex flex-col gap-1.5 pt-2">
          <TierSegments ladder={ladder} className={banner ? "h-1.5" : "h-2.5"} />
          <span className="flex justify-between gap-2 text-[0.7rem] text-[var(--achievement-muted)]">
            <span className="inline-block first-letter:uppercase">{step.earnedAt ? earnedPhrase(step.earnedAt) : "Not yet"}</span>
            <span className="text-right">{nextLabel(ladder)}</span>
          </span>
        </span>
      </span>
    </span>
  );
}

/** Levels around the focused one on the profile's journey trail, with the “you are here” pin before the next level. */
export function JourneyTrail({ ladder, focusId, around = 2, focusLabel = "Just earned", className }: {
  ladder: Ladder;
  focusId: string;
  around?: number;
  focusLabel?: string;
  className?: string;
}) {
  const style = useStepStyle();
  const next = nextStep(ladder);
  const focus = Math.max(0, ladder.steps.findIndex((step) => step.achievement.id === focusId));
  const start = Math.max(0, focus - around);
  const shown = ladder.steps.slice(start, focus + around + 2);
  return (
    <ol className={cn("relative flex flex-col rounded-2xl border border-border bg-card/50 py-2 pr-3", className)}>
      {shown.map((step, offset) => {
        const index = start + offset;
        const tierStart = offset === 0 || ladder.steps[index - 1].achievement.tier !== step.achievement.tier;
        const focused = index === focus;
        return (
          <li key={step.achievement.id} className="relative pl-12" style={style(step)} data-achievement-state={step.earned ? "earned" : "unearned"}>
            <span aria-hidden="true" className="absolute inset-y-0 left-[1.35rem] w-1" style={{ backgroundColor: step.earned ? TIER_COLORS[step.achievement.tier].bg : "var(--border)" }} />
            {tierStart && <span className="relative mb-0.5 mt-2 inline-flex rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest" style={{ backgroundColor: TIER_COLORS[step.achievement.tier].bg, color: TIER_COLORS[step.achievement.tier].text }}>{tierName(step.achievement.tier)}</span>}
            {step === next && (
              <span className="relative -ml-9 my-1.5 flex items-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                <MapPinIcon weight="fill" className="size-4" aria-hidden="true" />You are here{ladder.current && ` · ${ladder.current.value.toLocaleString()} ${ladder.current.unit}`}
              </span>
            )}
            <div className={cn("relative flex items-center gap-3 rounded-xl py-2", !step.earned && "opacity-70", focused && "-ml-2 bg-[var(--achievement-surface)] pl-2 ring-2 ring-[var(--achievement-border)]")}>
              <span aria-hidden="true" className={cn("absolute top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border-2", focused ? "-left-[1.85rem]" : "-left-[2.35rem]", step.earned ? "border-transparent bg-[var(--achievement-medallion)] text-[var(--achievement-icon)]" : "border-border bg-background text-muted-foreground")}>
                {step.earned ? <CheckIcon weight="bold" className="size-3" /> : <span className="text-[0.55rem] font-bold tabular-nums">{index + 1}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold">{step.achievement.title}{focused && <span className="rounded-full bg-primary px-1.5 py-px text-[0.6rem] font-bold uppercase text-primary-foreground">{focusLabel}</span>}</span>
                <span className="block text-xs text-muted-foreground">{step.achievement.description}</span>
              </span>
              {!step.earned && <span className="shrink-0 text-[0.7rem] text-muted-foreground">{toGo(ladder, step)}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A sideways road of levels: earned stops fill in, the focused one pops, the rest wait ahead.
 * Below a 24rem container only the levels just behind and ahead stay, so every name has room to wrap.
 */
export function JourneyRail({ ladder, focusId, around = 3, animate = true }: { ladder: Ladder; focusId: string; around?: number; animate?: boolean }) {
  const style = useStepStyle();
  const focus = Math.max(0, ladder.steps.findIndex((step) => step.achievement.id === focusId));
  const start = Math.max(0, focus - around);
  const shown = ladder.steps.slice(start, focus + around + 1);
  return (
    <div className="@container w-full">
      <ol aria-label={`${ladder.title} levels around ${ladder.steps[focus].achievement.title}`} className="flex w-full items-start">
        {shown.map((step, offset) => {
          const index = start + offset;
          const focused = index === focus;
          const far = Math.abs(index - focus) > 1;
          return (
            <li key={step.achievement.id} style={style(step)} data-achievement-state={step.earned ? "earned" : "unearned"}
              className={cn("relative min-w-0 flex-1 flex-col items-center gap-1.5 px-0.5", far ? "hidden @min-[24rem]:flex" : "flex")}>
              {offset > 0 && <span aria-hidden="true" className="absolute right-1/2 top-4 h-1 w-full -translate-y-1/2" style={{ backgroundColor: step.earned ? TIER_COLORS[step.achievement.tier].bg : "var(--border)" }} />}
              <motion.span
                initial={focused && animate ? { scale: 0.4 } : false}
                animate={{ scale: focused ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: focused && animate ? 0.5 : 0 }}
                className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2", step.earned ? "border-[var(--achievement-border)] bg-[var(--achievement-medallion)] text-[var(--achievement-icon)]" : "border-dashed border-border bg-background text-muted-foreground", focused && "ring-4 ring-primary/40")}
              >
                {step.earned ? <CheckIcon weight="bold" className="size-4" aria-hidden="true" /> : <span className="text-[0.6rem] font-bold tabular-nums">{index + 1}</span>}
              </motion.span>
              <span className={cn("line-clamp-3 w-full hyphens-auto break-words text-center text-[0.65rem] leading-tight", focused ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {step.achievement.title}
                {!step.earned && <span className="sr-only"> (not yet earned)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
