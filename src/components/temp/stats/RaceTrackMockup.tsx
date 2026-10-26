import { motion } from "framer-motion";
import { FlagCheckeredIcon } from "@phosphor-icons/react";
import { isUrgent, primaryReadout, type SimulatedRun } from "./useSimulatedRun";

/** Mockup 5: a little track where a speed bubble rides toward the finish flag. */
export function RaceTrackMockup({ run }: { run: SimulatedRun }) {
  const urgent = isUrgent(run);
  const position = run.mode === "zen" ? run.cycleProgress : run.progress;
  return (
    <div className="flex w-[min(28rem,100%)] items-center gap-3">
      <div className="relative h-14 flex-1">
        <div className="absolute inset-x-0 bottom-2 h-1.5 rounded-full bg-muted" />
        <motion.div
          className={`absolute bottom-2 left-0 h-1.5 rounded-full ${urgent ? "bg-destructive" : "bg-primary"}`}
          animate={{ width: `${position * 100}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
        <motion.div
          className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
          animate={{ left: `${position * 100}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        >
          <motion.span
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="mb-1 rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold tabular-nums text-primary-foreground shadow"
          >
            {Math.round(run.wpm)}
            <span className="ml-1 text-[0.6rem] font-medium uppercase opacity-80">wpm</span>
          </motion.span>
          <span className="size-3 rounded-full border-2 border-primary bg-card" />
        </motion.div>
      </div>
      <div className="flex flex-col items-center">
        <FlagCheckeredIcon className={`size-5 ${urgent ? "text-destructive" : "text-muted-foreground"}`} aria-hidden="true" />
        <span className={`text-sm font-bold tabular-nums ${urgent ? "text-destructive" : "text-foreground"}`}>{primaryReadout(run)}</span>
        <span className="text-[0.65rem] text-muted-foreground">{Math.round(run.accuracy)}% acc</span>
      </div>
    </div>
  );
}
