import { motion, useReducedMotion } from "framer-motion";
import { TrophyIcon } from "@phosphor-icons/react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

export interface ResultComparison {
  tests: number;
  averageWpm: number;
  bestWpm: number;
  averageAccuracy: number;
  bestAccuracy: number;
}

interface ResultStatCardProps {
  label: string;
  value: number;
  suffix?: string;
  /** Compared against the player's recent results; omitted for guests and rooms. */
  average?: number;
  best?: number;
  tests?: number;
  /** Lowest value on the bar scale, so small differences stay visible. */
  floor: number;
  ceiling: number;
  tone: string;
  bar: string;
  better: string;
  worse: string;
  delay: number;
  /** Reads from the right edge, mirroring the card beside it. */
  mirrored?: boolean;
}

/** A headline result with optional today, average and best bars. */
export function ResultStatCard({ label, value, suffix = "", average, best, tests, floor, ceiling, tone, bar, better, worse, delay, mirrored = false }: ResultStatCardProps) {
  const reducedMotion = useReducedMotion();
  const shown = useAnimatedCounter(value, 1000, delay * 1000);
  const compared = average !== undefined && best !== undefined;
  const rows = compared ? [
    { name: "today", amount: value, fill: bar },
    { name: "average", amount: Math.round(average), fill: "bg-muted-foreground/50" },
    { name: "best", amount: Math.round(best), fill: "bg-warning/70" },
  ] : [];
  const width = (amount: number) => `${Math.min(100, Math.max(2, ((amount - floor) / (ceiling - floor)) * 100))}%`;
  const delta = compared ? value - Math.round(average) : 0;
  const isNewBest = compared && value > Math.round(best);

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:p-5 ${mirrored ? "items-end text-right" : ""}`}>
      <div className={`flex w-full items-start justify-between gap-3 ${mirrored ? "flex-row-reverse" : ""}`}>
        <div>
          <div className={`text-5xl font-black leading-none tabular-nums tracking-tight md:text-6xl ${tone}`}>
            {shown}{suffix && <span className="ml-0.5 align-top text-2xl opacity-60 md:text-3xl">{suffix}</span>}
          </div>
          <div className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
        </div>
        {compared && tests !== undefined && (
          <span className="pt-1 text-[0.7rem] text-muted-foreground">last {tests} {tests === 1 ? "test" : "tests"}</span>
        )}
      </div>
      {compared && (
        <>
          <div className="flex w-full flex-col gap-1.5">
            {rows.map((row, index) => (
              <div key={row.name} className={`flex items-center gap-2 text-xs ${mirrored ? "flex-row-reverse" : ""}`}>
                <span className={`w-14 shrink-0 text-muted-foreground ${mirrored ? "text-right" : ""}`}>{row.name}</span>
                <div className={`flex h-2 flex-1 overflow-hidden rounded-full bg-muted ${mirrored ? "justify-end" : ""}`}>
                  <motion.div
                    className={`h-full rounded-full ${row.fill}`}
                    initial={reducedMotion ? false : { width: 0 }}
                    animate={{ width: width(row.amount) }}
                    transition={{ type: "spring", stiffness: 120, damping: 20, delay: delay + 0.1 + index * 0.1 }}
                  />
                </div>
                <span className={`w-10 shrink-0 tabular-nums ${mirrored ? "text-left" : "text-right"}`}>{row.amount}{suffix}</span>
              </div>
            ))}
          </div>
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.5 }}
            className={`flex items-center gap-1.5 text-xs ${isNewBest ? "text-warning" : delta >= 0 ? "text-success" : "text-destructive"}`}
          >
            {isNewBest && <TrophyIcon weight="fill" className="size-3.5 shrink-0" aria-hidden="true" />}
            {isNewBest ? "New best!" : delta === 0 ? "Same as your average" : `${delta > 0 ? "+" : ""}${delta}${suffix} ${delta > 0 ? better : worse} than your average`}
          </motion.p>
        </>
      )}
    </div>
  );
}
