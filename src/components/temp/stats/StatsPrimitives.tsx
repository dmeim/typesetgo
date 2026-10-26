import { AnimatePresence, motion } from "framer-motion";
import type { SimulatedRun } from "./useSimulatedRun";

const PROMPT = "the quick brown fox jumps over the lazy dog while kids type along";

/** Digits slide vertically when they change, like an odometer. */
export function RollingNumber({ value, className = "" }: { value: string; className?: string }) {
  return (
    <span className={`inline-flex tabular-nums ${className}`} aria-label={value}>
      {value.split("").map((char, index) => (
        <span key={index} className="relative inline-flex overflow-hidden" aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={char}
              initial={{ y: "-70%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "70%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              {char}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

export function Sparkline({ values, width = 120, height = 28, className = "" }: { values: number[]; width?: number; height?: number; className?: string }) {
  const recent = values.slice(-30);
  if (recent.length < 2) return <svg width={width} height={height} className={className} aria-hidden="true" />;
  const max = Math.max(70, ...recent);
  const points = recent.map((value, index) => `${(index / (recent.length - 1)) * width},${height - (value / max) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A stand-in prompt so stats can be judged in context. */
export function MockPrompt({ run }: { run: SimulatedRun }) {
  const typed = Math.floor((run.elapsedMs / 1000) * 3.9) % PROMPT.length;
  return (
    <p className="max-w-2xl text-center font-mono text-2xl leading-relaxed sm:text-3xl" aria-hidden="true">
      <span className="text-foreground">{PROMPT.slice(0, typed)}</span>
      <span className="relative">
        <motion.span
          className="absolute -left-px top-1 h-[1.1em] w-0.5 rounded bg-primary"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </span>
      <span className="text-muted-foreground/60">{PROMPT.slice(typed)}</span>
    </p>
  );
}
