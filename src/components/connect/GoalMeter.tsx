import { motion } from "framer-motion";
import { ConfettiIcon, TargetIcon } from "@phosphor-icons/react";
import { RollingNumber } from "@/components/ui/rolling-number";
import { cn } from "@/lib/utils";
import { CONNECT_SPRING } from "./connect-motion";

/**
 * A room's word goal: the shared total against its target. `large` fills the top of a projected board; the compact
 * one sits above a student's typing. Late words can arrive after the goal is reached, so the total stops at the goal.
 */
export function GoalMeter({ words, goal, large = false, detail, className }: {
  words: number;
  goal: number;
  large?: boolean;
  /** A short note beside the total, such as the student's own count. */
  detail?: string;
  className?: string;
}) {
  const shown = Math.min(words, goal);
  const reached = words >= goal;
  const percent = goal > 0 ? (shown / goal) * 100 : 0;
  const StateIcon = reached ? ConfettiIcon : TargetIcon;
  return (
    <section aria-label="Room word goal" data-goal-meter className={cn("flex w-full flex-col", large ? "gap-3 rounded-3xl border border-border bg-card p-5 text-card-foreground sm:p-6" : "gap-1.5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <p className="flex min-w-0 items-baseline gap-2">
          <StateIcon weight="fill" className={cn("shrink-0 self-center", reached ? "text-warning" : "text-primary", large ? "size-9 sm:size-11" : "size-4")} aria-hidden="true" />
          <RollingNumber value={shown.toLocaleString()} className={cn("font-black", large ? "text-5xl sm:text-7xl" : "text-lg")} />
          <span className={cn("text-muted-foreground tabular-nums", large ? "text-lg sm:text-2xl" : "text-sm")}>/ {goal.toLocaleString()} words</span>
        </p>
        {reached ? (
          <motion.p role="status" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={CONNECT_SPRING}
            className={cn("font-bold text-warning", large ? "text-xl sm:text-3xl" : "text-sm")}>Goal reached!</motion.p>
        ) : detail && <p className={cn("text-muted-foreground tabular-nums", large ? "text-base sm:text-xl" : "text-sm")}>{detail}</p>}
      </div>
      <div className={cn("w-full overflow-hidden rounded-full bg-muted", large ? "h-4 sm:h-5" : "h-1.5")} role="progressbar" aria-label="Words toward the goal"
        aria-valuemin={0} aria-valuemax={goal} aria-valuenow={shown}>
        <motion.div className={cn("h-full rounded-full", reached ? "bg-warning" : "bg-primary")} initial={false} animate={{ width: `${percent}%` }} transition={{ ease: "easeOut", duration: 0.6 }} />
      </div>
    </section>
  );
}
