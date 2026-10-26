import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowClockwiseIcon, ArrowFatRightIcon, CheckCircleIcon, CircleNotchIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { diffWord, type CharStatus, type WordAttempt } from "./mock-results";

const SPRING = { type: "spring", stiffness: 480, damping: 36, mass: 0.8 } as const;

const charTone: Record<CharStatus, string> = {
  correct: "text-foreground",
  incorrect: "text-destructive",
  missed: "text-muted-foreground underline decoration-dotted underline-offset-4",
  extra: "text-destructive/70 line-through",
};

export function CountUp({ value, delay = 0, suffix = "", className = "" }: { value: number; delay?: number; suffix?: string; className?: string }) {
  const shown = useAnimatedCounter(value, 900, delay);
  return <span className={`tabular-nums ${className}`}>{shown}{suffix}</span>;
}

/** Shows a word letter by letter: wrong letters in red, missed letters dotted, extra letters struck. */
export function WordDiff({ word, className = "" }: { word: WordAttempt; className?: string }) {
  return (
    <span className={`font-mono ${className}`} aria-label={`typed ${word.typed}, expected ${word.expected}`}>
      {diffWord(word).map((char, index) => (
        <span key={index} className={charTone[char.status]} aria-hidden="true">{char.char}</span>
      ))}
    </span>
  );
}

export function DiffLegend() {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground">
      <span><span className="text-destructive">a</span> wrong letter</span>
      <span><span className="underline decoration-dotted underline-offset-4">a</span> missed</span>
      <span><span className="text-destructive/70 line-through">a</span> extra</span>
    </span>
  );
}

type SaveState = "idle" | "saving" | "saved";

/** Save, Repeat and Next, with Save stepping through saving and saved. */
export function ResultActions({ compact = false }: { compact?: boolean }) {
  const [save, setSave] = useState<SaveState>("idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const start = () => {
    setSave("saving");
    timer.current = window.setTimeout(() => setSave("saved"), 900);
  };
  const SaveIcon = save === "saved" ? CheckCircleIcon : save === "saving" ? CircleNotchIcon : FloppyDiskIcon;
  const pad = compact ? "px-4 py-2 text-sm" : "px-6 py-3";

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <motion.button
        type="button"
        layout
        transition={SPRING}
        onClick={start}
        disabled={save !== "idle"}
        whileTap={{ scale: 0.95 }}
        className={`inline-flex items-center gap-2 rounded-lg font-medium ${pad} ${save === "saved" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}
      >
        <SaveIcon className={`size-[18px] shrink-0 ${save === "saving" ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={save} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={SPRING}>
            {save === "idle" ? "Save Results" : save === "saving" ? "Saving..." : "Saved"}
          </motion.span>
        </AnimatePresence>
      </motion.button>
      <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setSave("idle")} className={`inline-flex items-center gap-2 rounded-lg border border-border bg-background font-medium text-foreground hover:bg-accent ${pad}`}>
        <ArrowClockwiseIcon className="size-[18px] shrink-0" aria-hidden="true" />
        Repeat
      </motion.button>
      <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setSave("idle")} className={`inline-flex items-center gap-2 rounded-lg bg-card font-medium text-foreground hover:bg-accent ${pad}`}>
        <ArrowFatRightIcon className="size-[18px] shrink-0" aria-hidden="true" />
        Next Test
      </motion.button>
    </div>
  );
}
