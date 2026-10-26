import { useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CaretDownIcon, CaretLeftIcon, CaretRightIcon, CheckCircleIcon, CheckIcon, CircleIcon, FlagIcon, LockSimpleIcon, MapPinIcon,
} from "@phosphor-icons/react";
import AchievementIcon from "@/components/auth/AchievementIcon";
import { AchievementMedallion } from "@/components/auth/AchievementMedallion";
import { achievementStyle, useAchievementPalette } from "@/components/auth/achievement-presentation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TIER_COLORS } from "@/lib/achievement-definitions";
import { LAB_SPRING } from "./lab-settings";
import {
  earnedCount, earnedPhrase, nextStep, tiersOf, toGo, type Ladder, type LadderStep, type MockAchievement, type TierSummary,
} from "./mock-profile";

const tierName = (tier: string) => tier[0].toUpperCase() + tier.slice(1);
const goal = (ladder: Ladder, step: LadderStep) => ladder.current && step.achievement.target !== undefined
  ? `${step.achievement.target.toLocaleString()} ${ladder.current.unit}`
  : step.achievement.title;

/** Centres an item in its own scroller only; scrollIntoView would also shift the dialog. */
function centreIn(node: HTMLElement | null, axis: "x" | "y") {
  const scroller = node?.closest<HTMLElement>("[data-scroller]");
  if (!node || !scroller) return;
  const item = node.getBoundingClientRect();
  const view = scroller.getBoundingClientRect();
  if (axis === "x") scroller.scrollLeft += item.left - view.left - (view.width - item.width) / 2;
  else scroller.scrollTop += item.top - view.top - (view.height - item.height) / 2;
}

function useStepStyle() {
  const palette = useAchievementPalette();
  return (step: LadderStep): CSSProperties => achievementStyle((step.earned ? palette.earned : palette.unearned)[step.achievement.tier]);
}

function StepStatus({ ladder, step }: { ladder: Ladder; step: LadderStep }) {
  return step.earned
    ? <span className="flex items-center gap-1 text-xs text-[var(--achievement-muted)]"><CheckIcon className="size-3.5 shrink-0" aria-hidden="true" /><span className="inline-block first-letter:uppercase">{earnedPhrase(step.earnedAt!)}</span></span>
    : <span className="flex items-center gap-1 text-xs text-[var(--achievement-muted)]"><LockSimpleIcon className="size-3.5 shrink-0" aria-hidden="true" />{toGo(ladder, step)}</span>;
}

/** Tier-coloured segments, each filled by how many of its levels are earned. Shared with the collector cards. */
export function TierSegments({ ladder, className = "h-2.5", labels = false }: { ladder: Ladder; className?: string; labels?: boolean }) {
  const tiers = tiersOf(ladder);
  const oneTime = !ladder.current;
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

function DetailHeader({ item, ladder }: { item: MockAchievement; ladder: Ladder }) {
  const earned = earnedCount(ladder);
  return (
    <DialogHeader className="flex-row items-center gap-4 pr-8 text-left">
      <AchievementMedallion icon={item.achievement.icon} earned={earned > 0} size="medium" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <DialogTitle className="text-xl">{ladder.title}</DialogTitle>
        <DialogDescription>
          {earned} of {ladder.steps.length} {ladder.current ? "levels" : "badges"} earned
          {ladder.current && <> · {ladder.current.label} <strong className="text-foreground tabular-nums">{ladder.current.value.toLocaleString()} {ladder.current.unit}</strong></>}
        </DialogDescription>
      </div>
    </DialogHeader>
  );
}

/** 1 · Tier tabs: pick a tier, see its levels as chips. Opens on the tier you are working through. */
function TierTabs({ ladder }: { ladder: Ladder }) {
  const tiers = tiersOf(ladder);
  const next = nextStep(ladder);
  const [tier, setTier] = useState<TierSummary["tier"]>(next?.achievement.tier ?? tiers[tiers.length - 1].tier);
  const style = useStepStyle();
  const shown = tiers.find((summary) => summary.tier === tier)!;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div role="tablist" aria-label="Tiers" className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-muted/60 p-1">
        {tiers.map((summary) => (
          <button key={summary.tier} type="button" role="tab" aria-selected={tier === summary.tier} onClick={() => setTier(summary.tier)}
            className={`relative flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-xs sm:px-2 focus-visible:outline-2 focus-visible:outline-ring ${tier === summary.tier ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {tier === summary.tier && <motion.span layoutId="detail-tier-tab" transition={LAB_SPRING} className="absolute inset-0 rounded-xl bg-card shadow-sm" />}
            <span className="relative flex max-w-full items-center gap-1.5 truncate font-semibold"><span className="hidden size-2.5 shrink-0 rounded-full sm:block" style={{ backgroundColor: TIER_COLORS[summary.tier].bg }} />{tierName(summary.tier)}</span>
            <span className="relative tabular-nums">{summary.earned}/{summary.steps.length}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.ul key={tier} role="tabpanel" aria-label={`${tierName(tier)} levels`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
          className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
          {shown.steps.map((step) => {
            const isNext = step === next;
            return (
              <li key={step.achievement.id} style={style(step)}
                className={`relative flex flex-col gap-1 rounded-2xl border p-3 text-[var(--achievement-foreground)] ${step.earned ? "border-[var(--achievement-border)] bg-[var(--achievement-surface)]" : isNext ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-dashed border-border bg-transparent opacity-80"}`}>
                {isNext && <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 text-[0.6rem] font-bold uppercase tracking-wider text-primary-foreground">Next</span>}
                <span className="text-[0.65rem] uppercase tracking-wider text-[var(--achievement-muted)]">{step.achievement.title}</span>
                <span className="text-lg font-bold leading-tight tabular-nums">{goal(ladder, step)}</span>
                <StepStatus ladder={ladder} step={step} />
              </li>
            );
          })}
        </motion.ul>
      </AnimatePresence>
    </div>
  );
}

/** 2 · Journey path: every level on one trail, with a “you are here” pin between earned and next. */
function JourneyPath({ ladder }: { ladder: Ladder }) {
  const style = useStepStyle();
  const next = nextStep(ladder);
  const centre = (node: HTMLElement | null) => centreIn(node, "y");
  return (
    <ol data-scroller className="relative flex max-h-[55vh] flex-col overflow-y-auto rounded-2xl border border-border bg-card/50 py-3 pr-3">
      {ladder.steps.map((step, index) => {
        const tierStart = index === 0 || ladder.steps[index - 1].achievement.tier !== step.achievement.tier;
        return (
          <li key={step.achievement.id} className="relative pl-14" style={style(step)}>
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

/** 3 · Level meter: one long meter with a tick per level; select a tick to read what it takes. */
function LevelMeter({ ladder }: { ladder: Ladder }) {
  const earned = earnedCount(ladder);
  const next = nextStep(ladder);
  const [selected, setSelected] = useState(next ?? ladder.steps[ladder.steps.length - 1]);
  const previousTarget = earned > 0 ? ladder.steps[earned - 1].achievement.target ?? 0 : 0;
  const partial = ladder.current && next?.achievement.target ? (ladder.current.value - previousTarget) / (next.achievement.target - previousTarget) : 0;
  const filled = (earned + Math.max(0, Math.min(1, partial))) / ladder.steps.length * 100;
  const upcoming = ladder.steps.filter((step) => !step.earned).slice(0, 3);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <span className="flex flex-col"><span className="text-xs text-muted-foreground">{ladder.current?.label ?? "Badges"}</span><strong className="text-4xl tabular-nums">{ladder.current ? ladder.current.value.toLocaleString() : earned}<span className="ml-1 text-sm font-normal text-muted-foreground">{ladder.current?.unit ?? `of ${ladder.steps.length}`}</span></strong></span>
        <span className="text-sm text-muted-foreground">Level <strong className="text-foreground tabular-nums">{earned}</strong> of {ladder.steps.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="relative h-6 overflow-hidden rounded-full bg-muted">
          <motion.span className="absolute inset-y-0 left-0 rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${filled}%` }} transition={{ type: "spring", stiffness: 50, damping: 16 }} />
        </div>
        <div role="radiogroup" aria-label="Levels" className="flex gap-px">
          {ladder.steps.map((step) => (
            <button key={step.achievement.id} type="button" role="radio" aria-checked={selected === step} aria-label={`${step.achievement.title}: ${goal(ladder, step)}`} onClick={() => setSelected(step)}
              className="group flex h-7 flex-1 items-start justify-center focus-visible:outline-2 focus-visible:outline-ring">
              <span className={`w-full max-w-1.5 rounded-full transition-all ${selected === step ? "h-7" : "h-3 group-hover:h-5"}`} style={{ backgroundColor: step.earned ? TIER_COLORS[step.achievement.tier].bg : "var(--border)" }} />
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={selected.achievement.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} aria-live="polite"
          className="flex items-center gap-4 rounded-2xl border p-4" style={{ borderColor: TIER_COLORS[selected.achievement.tier].bg }}>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-black tabular-nums" style={{ backgroundColor: TIER_COLORS[selected.achievement.tier].bg, color: TIER_COLORS[selected.achievement.tier].text }}>{ladder.steps.indexOf(selected) + 1}</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <strong>{selected.achievement.title}</strong>
            <span className="text-sm text-muted-foreground">{selected.achievement.description}</span>
          </span>
          <span className="text-right text-sm">{selected.earned ? <CheckCircleIcon weight="fill" className="ml-auto size-6 text-success" aria-label="Earned" /> : <span className="text-muted-foreground">{toGo(ladder, selected)}</span>}</span>
        </motion.div>
      </AnimatePresence>
      {upcoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><FlagIcon className="size-4" aria-hidden="true" />Coming up</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {upcoming.map((step) => (
              <button key={step.achievement.id} type="button" onClick={() => setSelected(step)} className="flex flex-col gap-0.5 rounded-xl bg-muted/50 p-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                <span className="text-xs text-muted-foreground">{step.achievement.title}</span>
                <strong className="tabular-nums">{goal(ladder, step)}</strong>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** 4 · Card deck: every level as a mini trading card in a swipeable row, opened on your next one. */
function CardDeck({ ladder }: { ladder: Ladder }) {
  const style = useStepStyle();
  const next = nextStep(ladder) ?? ladder.steps[ladder.steps.length - 1];
  const deck = useRef<HTMLOListElement>(null);
  const centre = (node: HTMLElement | null) => centreIn(node, "x");
  const scroll = (direction: number) => deck.current?.scrollBy({ left: direction * 360, behavior: "smooth" });
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ol ref={deck} data-scroller aria-label="Levels" className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pt-2 [scrollbar-width:thin]">
        {ladder.steps.map((step, index) => (
          <li key={step.achievement.id} ref={step === next ? centre : undefined} style={style(step)}
            className={`relative flex w-40 shrink-0 snap-center flex-col overflow-hidden rounded-2xl border-2 text-[var(--achievement-foreground)] ${step.earned ? "border-[var(--achievement-border)] bg-[var(--achievement-surface)] shadow-md" : step === next ? "border-primary bg-card shadow-lg shadow-primary/20" : "border-dashed border-border bg-card opacity-70"}`}>
            <span className="relative flex h-24 items-center justify-center bg-[linear-gradient(160deg,var(--achievement-medallion),var(--achievement-surface))]">
              <AchievementIcon icon={step.achievement.icon} className={`size-10 text-[var(--achievement-icon)] ${step.earned ? "" : "opacity-40"}`} />
              <span className="absolute left-2 top-2 rounded-full bg-black/25 px-1.5 text-[0.6rem] font-bold uppercase text-white">{index + 1}</span>
              {!step.earned && <LockSimpleIcon weight="fill" className="absolute right-2 top-2 size-4 text-[var(--achievement-muted)]" aria-label="Locked" />}
            </span>
            <span className="flex flex-1 flex-col gap-1 p-3">
              <span className="text-[0.6rem] uppercase tracking-wider text-[var(--achievement-muted)]">{step.achievement.title}</span>
              <strong className="text-base leading-tight tabular-nums">{goal(ladder, step)}</strong>
              <span className="mt-auto pt-1"><StepStatus ladder={ladder} step={step} /></span>
            </span>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Earlier levels" onClick={() => scroll(-1)} className="rounded-full border border-border p-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"><CaretLeftIcon className="size-4" aria-hidden="true" /></button>
        <span className="min-w-0 flex-1"><TierSegments ladder={ladder} className="h-2" labels /></span>
        <button type="button" aria-label="Later levels" onClick={() => scroll(1)} className="rounded-full border border-border p-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"><CaretRightIcon className="size-4" aria-hidden="true" /></button>
      </div>
    </div>
  );
}

/** 5 · Checklist: tiers fold open like sections of a to-do list; only the one in progress starts open. */
function Checklist({ ladder }: { ladder: Ladder }) {
  const tiers = tiersOf(ladder);
  const next = nextStep(ladder);
  const [open, setOpen] = useState<string[]>([next?.achievement.tier ?? tiers[tiers.length - 1].tier]);
  const toggle = (tier: string) => setOpen((current) => current.includes(tier) ? current.filter((entry) => entry !== tier) : [...current, tier]);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {tiers.map((summary) => {
        const expanded = open.includes(summary.tier);
        return (
          <section key={summary.tier} className="overflow-hidden rounded-2xl border border-border bg-card">
            <button type="button" aria-expanded={expanded} onClick={() => toggle(summary.tier)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring">
              <span className="size-3 rounded-full" style={{ backgroundColor: TIER_COLORS[summary.tier].bg }} />
              <span className="font-semibold">{tierName(summary.tier)}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: `${summary.earned / summary.steps.length * 100}%`, backgroundColor: TIER_COLORS[summary.tier].bg }} /></span>
              <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">{summary.earned}/{summary.steps.length}</span>
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={LAB_SPRING}><CaretDownIcon className="size-4 text-muted-foreground" aria-hidden="true" /></motion.span>
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={LAB_SPRING} className="border-t border-border">
                  {summary.steps.map((step) => (
                    <li key={step.achievement.id} className={`flex items-center gap-3 border-b border-border/60 px-4 py-2 text-sm last:border-0 ${step === next ? "bg-primary/10" : ""}`}>
                      {step.earned ? <CheckCircleIcon weight="fill" className="size-5 shrink-0 text-success" aria-label="Earned" /> : <CircleIcon className="size-5 shrink-0 text-muted-foreground" aria-label="Not yet" />}
                      <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
                        <span className="font-semibold sm:w-28 sm:shrink-0">{step.achievement.title}</span>
                        <span className="text-xs text-muted-foreground sm:truncate sm:text-sm">{step.achievement.description}</span>
                      </span>
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{step.earned ? earnedPhrase(step.earnedAt!) : step === next ? toGo(ladder, step) : ""}</span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}

const BODIES = [TierTabs, JourneyPath, LevelMeter, CardDeck, Checklist];

/** The window an achievement card opens: every level behind it and what each one takes. */
export function AchievementDetailDialog({ item, ladder, style, onClose }: { item: MockAchievement; ladder: Ladder; style: number; onClose: () => void }) {
  const Body = BODIES[style];
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="gap-5 border-border bg-background text-foreground sm:max-w-2xl">
        <DetailHeader item={item} ladder={ladder} />
        <Body ladder={ladder} />
      </DialogContent>
    </Dialog>
  );
}
