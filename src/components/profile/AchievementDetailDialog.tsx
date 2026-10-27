import type { CSSProperties, RefObject } from "react";
import { motion } from "framer-motion";
import { CheckIcon, LockSimpleIcon, MapPinIcon } from "@phosphor-icons/react";
import { AchievementMedallion } from "@/components/auth/AchievementMedallion";
import { achievementStyle, useAchievementPalette } from "@/components/auth/achievement-presentation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TIER_COLORS } from "@/lib/achievement-definitions";
import { earnedCount, earnedPhrase, nextStep, tiersOf, toGo, type Ladder, type LadderStep } from "./profile-stats";

const tierName = (tier: string) => tier[0].toUpperCase() + tier.slice(1);

/** Centres an item in its own scroller only; scrollIntoView would also shift the dialog. */
function centreIn(node: HTMLElement | null) {
  const scroller = node?.closest<HTMLElement>("[data-scroller]");
  if (!node || !scroller) return;
  const item = node.getBoundingClientRect();
  const view = scroller.getBoundingClientRect();
  scroller.scrollTop += item.top - view.top - (view.height - item.height) / 2;
}

function useStepStyle() {
  const palette = useAchievementPalette();
  return (step: LadderStep): CSSProperties => achievementStyle((step.earned ? palette.earned : palette.unearned)[step.achievement.tier]);
}

function StepStatus({ ladder, step }: { ladder: Ladder; step: LadderStep }) {
  return step.earned
    ? <span className="flex items-center gap-1 text-xs text-[var(--achievement-muted)]"><CheckIcon className="size-3.5 shrink-0" aria-hidden="true" /><span className="inline-block first-letter:uppercase">{step.earnedAt ? earnedPhrase(step.earnedAt) : "earned"}</span></span>
    : <span className="flex items-center gap-1 text-xs text-[var(--achievement-muted)]"><LockSimpleIcon className="size-3.5 shrink-0" aria-hidden="true" />{toGo(ladder, step)}</span>;
}

/** Tier-coloured segments, each filled by how many of its levels are earned. Shared with the collector cards. */
export function TierSegments({ ladder, className = "h-2.5", labels = false }: { ladder: Ladder; className?: string; labels?: boolean }) {
  const tiers = tiersOf(ladder);
  const oneTime = !ladder.byTier;
  // One-time categories get a segment per badge, coloured by its tier.
  const parts = oneTime
    ? ladder.steps.map((step) => ({ key: step.achievement.id, tier: step.achievement.tier, grow: 1, fill: step.earned ? 1 : 0, label: step.achievement.title }))
    : tiers.map((summary) => ({ key: summary.tier, tier: summary.tier, grow: summary.steps.length, fill: summary.earned / summary.steps.length, label: `${tierName(summary.tier)} ${summary.earned}/${summary.steps.length}` }));
  return (
    <span className="flex w-full gap-1" role="img" aria-label={parts.map((part) => part.label).join(", ")}>
      {parts.map((part, index) => (
        <span key={part.key} className="flex min-w-0 flex-col gap-1" style={{ flexGrow: part.grow, flexBasis: 0 }}>
          <span className={`relative overflow-hidden rounded-full bg-[var(--achievement-track,var(--muted))] ${className}`}>
            <motion.span className="absolute inset-y-0 left-0 rounded-full" style={{ backgroundColor: TIER_COLORS[part.tier].bg }}
              initial={{ width: 0 }} animate={{ width: `${part.fill * 100}%` }} transition={{ duration: 0.45, delay: 0.1 + index * 0.08 }} />
          </span>
          {labels && <span className="truncate text-center text-[0.65rem] text-muted-foreground">{oneTime ? "" : tierName(part.tier)}</span>}
        </span>
      ))}
    </span>
  );
}

function DetailHeader({ ladder }: { ladder: Ladder }) {
  const earned = earnedCount(ladder);
  return (
    <DialogHeader className="flex-row items-center gap-4 pr-8 text-left">
      <AchievementMedallion icon={ladder.icon} earned={earned > 0} size="medium" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <DialogTitle className="text-xl">{ladder.title}</DialogTitle>
        <DialogDescription>
          {earned} of {ladder.steps.length} {ladder.byTier ? "levels" : "badges"} earned
          {ladder.current && <> · {ladder.current.label} <strong className="text-foreground tabular-nums">{ladder.current.value.toLocaleString()} {ladder.current.unit}</strong></>}
        </DialogDescription>
      </div>
    </DialogHeader>
  );
}

/** Every level on one trail, with a “you are here” pin between earned and next. */
function JourneyPath({ ladder }: { ladder: Ladder }) {
  const style = useStepStyle();
  const next = nextStep(ladder);
  const centre = (node: HTMLElement | null) => centreIn(node);
  return (
    <ol data-scroller className="relative flex max-h-[55vh] flex-col overflow-y-auto rounded-2xl border border-border bg-card/50 py-3 pr-3">
      {ladder.steps.map((step, index) => {
        const tierStart = index === 0 || ladder.steps[index - 1].achievement.tier !== step.achievement.tier;
        return (
          <li key={step.achievement.id} className="relative pl-14" style={style(step)} data-achievement-tier={step.achievement.tier} data-achievement-state={step.earned ? "earned" : "unearned"}>
            <span aria-hidden="true" className="absolute inset-y-0 left-[1.6rem] w-1" style={{ backgroundColor: step.earned ? TIER_COLORS[step.achievement.tier].bg : "var(--border)" }} />
            {tierStart && <span className="relative mb-1 mt-3 inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest" style={{ backgroundColor: TIER_COLORS[step.achievement.tier].bg, color: TIER_COLORS[step.achievement.tier].text }}>{tierName(step.achievement.tier)}</span>}
            {step === next && (
              <span ref={centre} className="relative -ml-10 my-2 flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <MapPinIcon weight="fill" className="size-5" aria-hidden="true" />You are here{ladder.current && ` · ${ladder.current.value.toLocaleString()} ${ladder.current.unit}`}
              </span>
            )}
            <div className={`relative flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2.5 ${step.earned ? "" : "opacity-70"}`}>
              <span aria-hidden="true" className={`absolute -left-[2.45rem] top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border-2 ${step.earned ? "border-transparent bg-[var(--achievement-medallion)] text-[var(--achievement-icon)]" : "border-border bg-background text-muted-foreground"}`}>
                {step.earned ? <CheckIcon weight="bold" className="size-3.5" /> : <span className="text-[0.6rem] font-bold tabular-nums">{index + 1}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{step.achievement.title}</span>
                <span className="block text-xs text-muted-foreground">{step.achievement.description}</span>
              </span>
              <StepStatus ladder={ladder} step={step} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** The window an achievement card opens: every level behind it and what each one takes. */
export function AchievementDetailDialog({ ladder, onClose, returnFocus }: {
  ladder: Ladder;
  onClose: () => void;
  /** The card that opened the dialog; it has no Radix trigger, so focus is handed back by hand. */
  returnFocus?: RefObject<HTMLElement | null>;
}) {
  const restoreFocus = (event: Event) => {
    const target = returnFocus?.current;
    if (!target?.isConnected) return;
    event.preventDefault();
    target.focus();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto border-border bg-background text-foreground sm:max-w-2xl" onCloseAutoFocus={restoreFocus}>
        <DetailHeader ladder={ladder} />
        <JourneyPath ladder={ladder} />
      </DialogContent>
    </Dialog>
  );
}
