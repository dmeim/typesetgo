import { motion } from "framer-motion";
import { RollingNumber } from "./StatsPrimitives";
import { isUrgent, primaryLabel, primaryReadout, type SimulatedRun } from "./useSimulatedRun";

/** Mockup 4: one capsule replaces three pills and the bar; the capsule fills up as the test goes. */
export function FillCapsuleMockup({ run }: { run: SimulatedRun }) {
  const urgent = isUrgent(run);
  return (
    <div className="relative flex overflow-hidden rounded-full border border-border bg-card shadow-sm">
      {run.mode === "zen" ? (
        <motion.span
          className="absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-primary/20 to-transparent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity }}
          aria-hidden="true"
        />
      ) : (
        <motion.span
          className={`absolute inset-y-0 left-0 ${urgent ? "bg-destructive/20" : "bg-primary/15"}`}
          animate={{ width: `${run.progress * 100}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
          aria-hidden="true"
        />
      )}
      <Segment value={String(Math.round(run.wpm))} label="wpm" tone="text-primary" />
      <Divider />
      <Segment value={primaryReadout(run)} label={primaryLabel(run)} tone={urgent ? "text-destructive" : "text-foreground"} />
      <Divider />
      <Segment value={`${Math.round(run.accuracy)}%`} label="acc" tone="text-foreground" />
    </div>
  );
}

function Segment({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <span className="relative flex min-w-24 items-baseline justify-center gap-1.5 px-5 py-2">
      <RollingNumber value={value} className={`text-xl font-bold ${tone}`} />
      <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</span>
    </span>
  );
}

function Divider() {
  return <span className="relative my-2 w-px bg-border" aria-hidden="true" />;
}
