import { motion } from "framer-motion";
import { RollingNumber } from "./StatsPrimitives";
import { isUrgent, primaryLabel, primaryReadout, type SimulatedRun } from "./useSimulatedRun";

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Mockup 3: progress becomes a ring around the countdown, with speed and accuracy on either side. */
export function RingTimerMockup({ run }: { run: SimulatedRun }) {
  const urgent = isUrgent(run);
  const remaining = run.mode === "time" ? 1 - run.progress : run.progress;
  return (
    <div className="flex items-center gap-6">
      <Side value={String(Math.round(run.wpm))} label="wpm" align="end" />
      <div className="relative flex size-24 items-center justify-center">
        <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={RADIUS} fill="none" strokeWidth="5" className="stroke-muted" />
          {run.mode === "zen" ? (
            <motion.circle
              cx="40" cy="40" r={RADIUS} fill="none" strokeWidth="5" strokeLinecap="round"
              className="stroke-primary"
              strokeDasharray={`${CIRCUMFERENCE * 0.2} ${CIRCUMFERENCE}`}
              style={{ originX: "50%", originY: "50%" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, ease: "linear", repeat: Infinity }}
            />
          ) : (
            <motion.circle
              cx="40" cy="40" r={RADIUS} fill="none" strokeWidth="5" strokeLinecap="round"
              className={urgent ? "stroke-destructive" : "stroke-primary"}
              strokeDasharray={CIRCUMFERENCE}
              animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - remaining) }}
              transition={{ ease: "linear", duration: 0.1 }}
            />
          )}
        </svg>
        <motion.span
          key={urgent ? `urgent-${run.timeRemaining}` : "calm"}
          initial={urgent ? { scale: 1.25 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="flex flex-col items-center"
        >
          <span className={`text-lg font-bold tabular-nums ${urgent ? "text-destructive" : "text-foreground"}`}>{primaryReadout(run)}</span>
          <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">{primaryLabel(run)}</span>
        </motion.span>
      </div>
      <Side value={`${Math.round(run.accuracy)}%`} label="accuracy" align="start" />
    </div>
  );
}

function Side({ value, label, align }: { value: string; label: string; align: "start" | "end" }) {
  return (
    <span className={`flex w-20 flex-col ${align === "end" ? "items-end" : "items-start"}`}>
      <RollingNumber value={value} className="text-2xl font-bold text-primary" />
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    </span>
  );
}
