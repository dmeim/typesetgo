import { motion } from "framer-motion";
import type { SimulatedRun } from "./useSimulatedRun";

const PROMPT = "the quick brown fox jumps over the lazy dog while kids type along";

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
