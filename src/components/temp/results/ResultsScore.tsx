import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownIcon, ArrowUpIcon, TrophyIcon } from "@phosphor-icons/react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { cn } from "@/lib/utils";
import { STATS, type StatKind } from "./results-layouts";

const SIZES = { lg: "text-5xl", md: "text-4xl", sm: "text-3xl" };

/** "+6 vs avg", or a trophy for a new best. */
export function DeltaPill({ kind }: { kind: StatKind }) {
  const stat = STATS[kind];
  const delta = stat.value - stat.average;
  if (stat.value > stat.best) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[0.7rem] font-semibold text-warning"><TrophyIcon weight="fill" className="size-3" aria-hidden="true" />New best</span>;
  }
  const Arrow = delta >= 0 ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.7rem] font-semibold", delta >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
      <Arrow className="size-3" aria-hidden="true" />
      {delta >= 0 ? "+" : ""}{delta}{stat.suffix} vs avg
    </span>
  );
}

interface ScoreProps {
  kind: StatKind;
  size?: keyof typeof SIZES;
  /** Reads from the right edge, for the accuracy side of mirrored layouts. */
  mirrored?: boolean;
  /** "avg 52 · best 64" under the label. */
  context?: boolean;
  delay?: number;
}

/** A big counting number with its label and how it compares. */
export function Score({ kind, size = "lg", mirrored = false, context = true, delay = 0.2 }: ScoreProps) {
  const stat = STATS[kind];
  const shown = useAnimatedCounter(stat.value, 1000, delay * 1000);
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", mirrored && "items-end text-right")}>
      <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", mirrored && "flex-row-reverse")}>
        <span className={cn("font-black leading-none tabular-nums tracking-tight", SIZES[size], stat.tone)}>
          {shown}{stat.suffix && <span className="ml-0.5 align-top text-[0.5em] opacity-60">{stat.suffix}</span>}
        </span>
        <DeltaPill kind={kind} />
      </div>
      <span className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
      {context && <span className="text-[0.7rem] text-muted-foreground">avg {stat.average}{stat.suffix} · best {stat.best}{stat.suffix}</span>}
    </div>
  );
}

/** Today, average and best as three short bars. */
export function CompareBars({ kind, delay = 0.3 }: { kind: StatKind; delay?: number }) {
  const reducedMotion = useReducedMotion();
  const stat = STATS[kind];
  const rows = [
    { name: "today", amount: stat.value, fill: stat.fill },
    { name: "average", amount: stat.average, fill: "bg-muted-foreground/50" },
    { name: "best", amount: stat.best, fill: "bg-warning/70" },
  ];
  const width = (amount: number) => `${Math.min(100, Math.max(2, ((amount - stat.floor) / (stat.ceiling - stat.floor)) * 100))}%`;
  return (
    <div className="flex w-full flex-col gap-1">
      {rows.map((row, index) => (
        <div key={row.name} className="flex items-center gap-2 text-[0.7rem]">
          <span className="w-12 shrink-0 text-muted-foreground">{row.name}</span>
          <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn("h-full rounded-full", row.fill)}
              initial={reducedMotion ? false : { width: 0 }}
              animate={{ width: width(row.amount) }}
              transition={{ type: "spring", stiffness: 120, damping: 20, delay: delay + index * 0.1 }}
            />
          </div>
          <span className="w-8 shrink-0 text-right tabular-nums">{row.amount}{stat.suffix}</span>
        </div>
      ))}
    </div>
  );
}

/** A score with its comparison bars, in a card or bare inside another card. */
export function StatCard({ kind, bare = false, className, delay = 0.2 }: { kind: StatKind; bare?: boolean; className?: string; delay?: number }) {
  return (
    <div className={cn("flex flex-col justify-between gap-3", !bare && "rounded-2xl border border-border bg-card p-4", className)}>
      <Score kind={kind} context={false} delay={delay} />
      <CompareBars kind={kind} delay={delay + 0.1} />
    </div>
  );
}
