import { useState } from "react";
import { motion } from "framer-motion";
import { StarIcon } from "@phosphor-icons/react";
import { CountUp, ResultActions } from "./ResultsPrimitives";
import { MOCK_MISTAKES, MOCK_SUMMARY, type WordAttempt } from "./mock-results";

const STARS = 4;

/** Mockup 4: a friendly report card for younger students, with stars, a comparison, and flip cards for tricky words. */
export function ReportCardResults() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-7">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2" role="img" aria-label={`${STARS} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, index) => (
            <motion.span
              key={index}
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.15 + index * 0.12 }}
            >
              <StarIcon weight="fill" className={`size-10 ${index < STARS ? "text-warning" : "text-muted"}`} aria-hidden="true" />
            </motion.span>
          ))}
        </div>
        <motion.h3 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="text-2xl font-bold">
          Great job! Your fingers were flying.
        </motion.h3>
        <p className="text-muted-foreground">
          <CountUp value={MOCK_SUMMARY.wpm} className="font-bold text-primary" /> words per minute with <CountUp value={MOCK_SUMMARY.accuracy} suffix="%" className="font-bold text-foreground" /> accuracy
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2">
        <CompareBar label="today" value={MOCK_SUMMARY.wpm} tone="bg-primary" delay={0.4} />
        <CompareBar label="your average" value={MOCK_SUMMARY.recentAverage} tone="bg-muted-foreground/50" delay={0.5} />
        <CompareBar label="your best" value={MOCK_SUMMARY.personalBest} tone="bg-warning/70" delay={0.6} />
        <p className="text-center text-sm text-success">+{MOCK_SUMMARY.wpm - MOCK_SUMMARY.recentAverage} faster than your average</p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="text-sm text-muted-foreground">Tricky words. Tap a card to see what you typed.</span>
        <div className="flex flex-wrap justify-center gap-3">
          {MOCK_MISTAKES.map((word, index) => <FlipCard key={index} word={word} index={index} />)}
        </div>
      </div>
      <ResultActions />
    </div>
  );
}

function CompareBar({ label, value, tone, delay }: { label: string; value: number; tone: string; delay: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-right text-muted-foreground">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div className={`h-full rounded-full ${tone}`} initial={{ width: 0 }} animate={{ width: `${(value / 80) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20, delay }} />
      </div>
      <span className="w-8 tabular-nums">{value}</span>
    </div>
  );
}

function FlipCard({ word, index }: { word: WordAttempt; index: number }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <motion.button
      type="button"
      aria-pressed={flipped}
      aria-label={flipped ? `You typed ${word.typed}` : `Practice word ${word.expected}`}
      onClick={() => setFlipped((value) => !value)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, rotateY: flipped ? 180 : 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: flipped ? 0 : 0.9 + index * 0.08 }}
      whileHover={{ y: -3 }}
      style={{ transformStyle: "preserve-3d" }}
      className="relative h-20 w-32"
    >
      <span className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-border bg-card font-mono text-xl text-primary [backface-visibility:hidden]">
        {word.expected}
        <span className="font-sans text-[0.65rem] text-muted-foreground">practice me</span>
      </span>
      <span className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-destructive/50 bg-destructive/10 font-mono text-xl text-destructive [backface-visibility:hidden] [transform:rotateY(180deg)]">
        {word.typed}
        <span className="font-sans text-[0.65rem] text-muted-foreground">you typed</span>
      </span>
    </motion.button>
  );
}
