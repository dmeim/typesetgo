import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RollingNumber, Sparkline } from "./StatsPrimitives";
import { isUrgent, primaryLabel, primaryReadout, type SimulatedRun } from "./useSimulatedRun";

const SPRING = { type: "spring", stiffness: 480, damping: 36, mass: 0.8 } as const;

/** Mockup 1: a tiny pill that morphs into a full stats card on hover or click, and widens on its own in the last ten seconds. */
export function MorphingStatsMockup({ run }: { run: SimulatedRun }) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;
  const urgent = isUrgent(run);

  return (
    <motion.button
      type="button"
      layout
      transition={SPRING}
      aria-expanded={expanded}
      aria-label="Live stats"
      onClick={() => setPinned((value) => !value)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{ borderRadius: expanded ? 18 : 999 }}
      className={`relative overflow-hidden border bg-card text-left shadow-sm transition-colors ${urgent ? "border-destructive/60" : "border-border"}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {!expanded ? (
          <motion.span key="compact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-baseline gap-3 px-5 py-2">
            <RollingNumber value={String(Math.round(run.wpm))} className="text-xl font-bold text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">wpm</span>
            <span className="size-1 self-center rounded-full bg-muted-foreground/50" />
            <motion.span layout transition={SPRING} className={`font-bold tabular-nums ${urgent ? "text-2xl text-destructive" : "text-xl text-foreground"}`}>
              {primaryReadout(run)}
            </motion.span>
          </motion.span>
        ) : (
          <motion.span key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-80 flex-col gap-3 p-4">
            <span className="flex items-end justify-between">
              <span className="flex flex-col">
                <RollingNumber value={String(Math.round(run.wpm))} className="text-4xl font-bold text-primary" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">words per minute</span>
              </span>
              <span className="flex flex-col items-end gap-1 text-sm">
                <span><b className="tabular-nums text-foreground">{Math.round(run.accuracy)}%</b> <span className="text-muted-foreground">accuracy</span></span>
                <span><b className={`tabular-nums ${urgent ? "text-destructive" : "text-foreground"}`}>{primaryReadout(run)}</b> <span className="text-muted-foreground">{primaryLabel(run)}</span></span>
              </span>
            </span>
            <Sparkline values={run.history} width={286} height={36} className="text-primary/70" />
            <ProgressTrack run={run} className="h-1.5" />
          </motion.span>
        )}
      </AnimatePresence>
      {!expanded && <ProgressTrack run={run} className="absolute inset-x-3 bottom-0 h-0.5" />}
    </motion.button>
  );
}

function ProgressTrack({ run, className }: { run: SimulatedRun; className: string }) {
  return (
    <span className={`block overflow-hidden rounded-full bg-muted ${className}`}>
      {run.mode === "zen" ? (
        <motion.span className="block h-full w-1/3 rounded-full bg-primary/70" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }} />
      ) : (
        <motion.span className={`block h-full rounded-full ${isUrgent(run) ? "bg-destructive" : "bg-primary"}`} animate={{ width: `${run.progress * 100}%` }} transition={{ ease: "linear", duration: 0.1 }} />
      )}
    </span>
  );
}
