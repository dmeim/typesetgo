import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlayIcon } from "@phosphor-icons/react";
import { CountUp, DiffLegend, ResultActions, WordDiff } from "./ResultsPrimitives";
import { MOCK_MISTAKES, MOCK_SUMMARY, MOCK_WORDS, isCorrect, type WordAttempt } from "./mock-results";

const SPRING = { type: "spring", stiffness: 480, damping: 36 } as const;
type Filter = "all" | "mistakes";

/** Mockup 2: the passage you typed is the result; mistakes glow, and hovering one explains it. */
export function TranscriptResults() {
  const [filter, setFilter] = useState<Filter>("all");
  const [replay, setReplay] = useState(0);
  const [focused, setFocused] = useState<number | null>(null);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6">
      <div className="flex items-baseline gap-6">
        <Stat value={MOCK_SUMMARY.accuracy} suffix="%" label="acc" />
        <Stat value={MOCK_SUMMARY.wpm} label="wpm" emphasis />
        <Stat value={MOCK_SUMMARY.durationSeconds} suffix="s" label="time" />
      </div>

      <div className="flex w-full items-center justify-between gap-3">
        <div role="group" aria-label="Show" className="relative flex rounded-lg bg-card p-1 text-sm">
          {(["all", "mistakes"] as const).map((option) => (
            <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)} className={`relative rounded-md px-3 py-1 ${filter === option ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {filter === option && <motion.span layoutId="transcript-filter" className="absolute inset-0 rounded-md bg-accent" transition={SPRING} />}
              <span className="relative">{option === "all" ? "all words" : `mistakes (${MOCK_MISTAKES.length})`}</span>
            </button>
          ))}
        </div>
        <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={() => setReplay((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
          <PlayIcon className="size-4" aria-hidden="true" />
          Replay
        </motion.button>
      </div>

      <p key={replay} className="flex flex-wrap justify-center gap-x-3 gap-y-2 font-mono text-2xl leading-relaxed" onMouseLeave={() => setFocused(null)}>
        {MOCK_WORDS.map((word, index) => (
          <TranscriptWord key={index} word={word} index={index} dimmed={filter === "mistakes" && isCorrect(word)} open={focused === index} onFocusWord={setFocused} />
        ))}
      </p>
      <DiffLegend />
      <ResultActions compact />
    </div>
  );
}

interface TranscriptWordProps {
  word: WordAttempt;
  index: number;
  dimmed: boolean;
  open: boolean;
  onFocusWord: (index: number | null) => void;
}

function TranscriptWord({ word, index, dimmed, open, onFocusWord }: TranscriptWordProps) {
  const correct = isCorrect(word);
  const reveal = { initial: { opacity: 0, y: 6 }, animate: { opacity: dimmed ? 0.2 : 1, y: 0 }, transition: { ...SPRING, delay: index * 0.035 } };
  if (correct) return <motion.span {...reveal} className="text-foreground">{word.expected}</motion.span>;

  return (
    <motion.button
      type="button"
      {...reveal}
      onMouseEnter={() => onFocusWord(index)}
      onFocus={() => onFocusWord(index)}
      onBlur={() => onFocusWord(null)}
      className="relative rounded-md bg-destructive/10 px-1 underline decoration-destructive decoration-2 underline-offset-8 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <WordDiff word={word} />
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={SPRING}
            className="absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 flex-col items-center gap-0.5 whitespace-nowrap rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg"
          >
            <span><span className="text-muted-foreground">you typed </span><span className="text-destructive">{word.typed}</span></span>
            <span><span className="text-muted-foreground">expected </span><span className="text-primary">{word.expected}</span></span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function Stat({ value, suffix = "", label, emphasis = false }: { value: number; suffix?: string; label: string; emphasis?: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <CountUp value={value} suffix={suffix} className={`font-semibold ${emphasis ? "text-5xl text-primary" : "text-2xl text-foreground"}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}
