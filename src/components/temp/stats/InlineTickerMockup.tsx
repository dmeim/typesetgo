import { motion } from "framer-motion";
import { RollingNumber } from "./StatsPrimitives";
import { isUrgent, primaryLabel, primaryReadout, type SimulatedRun } from "./useSimulatedRun";

/** Mockup 2: no boxes at all, just a quiet line of rolling numbers over a hairline that spans the prompt. */
export function InlineTickerMockup({ run }: { run: SimulatedRun }) {
  const urgent = isUrgent(run);
  return (
    <div className="flex w-[min(40rem,100%)] flex-col items-center gap-2">
      <div className="flex items-baseline gap-6 text-muted-foreground">
        <Stat value={String(Math.round(run.wpm))} label="wpm" emphasis />
        <Stat value={`${Math.round(run.accuracy)}%`} label="acc" />
        <Stat value={primaryReadout(run)} label={primaryLabel(run)} tone={urgent ? "text-destructive" : undefined} />
      </div>
      <div className="h-px w-full overflow-hidden bg-border">
        {run.mode === "zen" ? (
          <motion.div className="h-full w-24 bg-primary" animate={{ x: ["-6rem", "40rem"] }} transition={{ duration: 3, ease: "linear", repeat: Infinity }} />
        ) : (
          <motion.div className={`h-full ${urgent ? "bg-destructive" : "bg-primary"}`} animate={{ width: `${run.progress * 100}%` }} transition={{ ease: "linear", duration: 0.1 }} />
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, emphasis = false, tone }: { value: string; label: string; emphasis?: boolean; tone?: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <RollingNumber value={value} className={`${emphasis ? "text-3xl text-primary" : "text-xl text-foreground"} font-semibold ${tone ?? ""}`} />
      <span className="text-xs">{label}</span>
    </span>
  );
}
