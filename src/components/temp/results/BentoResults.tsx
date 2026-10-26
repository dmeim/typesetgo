import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CountUp, ResultActions, WordDiff } from "./ResultsPrimitives";
import { MOCK_CHARACTERS, MOCK_CORRECT, MOCK_MISTAKES, MOCK_SUMMARY } from "./mock-results";

const SPRING = { type: "spring", stiffness: 480, damping: 36 } as const;
const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SEGMENTS = [
  { key: "correct", label: "correct", value: MOCK_CHARACTERS.correct, bar: "bg-success", text: "text-success" },
  { key: "incorrect", label: "wrong", value: MOCK_CHARACTERS.incorrect, bar: "bg-destructive", text: "text-destructive" },
  { key: "missed", label: "missed", value: MOCK_CHARACTERS.missed, bar: "bg-warning", text: "text-warning" },
  { key: "extra", label: "extra", value: MOCK_CHARACTERS.extra, bar: "bg-muted-foreground", text: "text-muted-foreground" },
] as const;
const TOTAL_CHARS = SEGMENTS.reduce((sum, segment) => sum + segment.value, 0);

/** Mockup 5: a bento grid of tiles that animate in, each with its own small interaction. */
export function BentoResults() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6">
      <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-4">
        <Tile index={0} className="col-span-2 row-span-2 flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">words per minute</span>
          <CountUp value={MOCK_SUMMARY.wpm} className="text-8xl font-black leading-none text-primary" />
          <span className="text-sm text-muted-foreground">raw {MOCK_SUMMARY.rawWpm} · {MOCK_SUMMARY.settingsLabel}</span>
        </Tile>
        <Tile index={1} className="col-span-1 flex flex-col items-center justify-center">
          <AccuracyRing />
        </Tile>
        <Tile index={2} className="col-span-1 flex flex-col items-center justify-center gap-1">
          <CountUp value={MOCK_SUMMARY.durationSeconds} suffix="s" className="text-4xl font-bold" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">time</span>
        </Tile>
        <Tile index={3} className="col-span-2">
          <CharacterBar />
        </Tile>
        <Tile index={4} className="col-span-2 md:col-span-4">
          <WordTabs />
        </Tile>
      </div>
      <ResultActions compact />
    </div>
  );
}

function Tile({ index, className, children }: { index: number; className: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING, delay: index * 0.07 }}
      whileHover={{ y: -3 }}
      className={`rounded-2xl border border-border bg-card p-4 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function AccuracyRing() {
  return (
    <div className="relative flex size-24 items-center justify-center">
      <svg viewBox="0 0 90 90" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="45" cy="45" r={RADIUS} fill="none" strokeWidth="7" className="stroke-muted" />
        <motion.circle
          cx="45" cy="45" r={RADIUS} fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-primary"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - MOCK_SUMMARY.accuracy / 100) }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <span className="flex flex-col items-center">
        <CountUp value={MOCK_SUMMARY.accuracy} suffix="%" delay={200} className="text-xl font-bold" />
        <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">acc</span>
      </span>
    </div>
  );
}

function CharacterBar() {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="flex h-full flex-col justify-center gap-3" onMouseLeave={() => setActive(null)}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">characters</span>
      <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full">
        {SEGMENTS.map((segment, index) => (
          <motion.button
            key={segment.key}
            type="button"
            aria-label={`${segment.value} ${segment.label}`}
            onMouseEnter={() => setActive(segment.key)}
            onFocus={() => setActive(segment.key)}
            initial={{ flexGrow: 0 }}
            animate={{ flexGrow: segment.value / TOTAL_CHARS, opacity: active && active !== segment.key ? 0.3 : 1 }}
            transition={{ ...SPRING, delay: active ? 0 : 0.3 + index * 0.08 }}
            className={`min-w-1.5 basis-0 ${segment.bar}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {SEGMENTS.map((segment) => (
          <motion.span key={segment.key} animate={{ opacity: active && active !== segment.key ? 0.35 : 1, scale: active === segment.key ? 1.08 : 1 }} className="origin-left">
            <b className={`tabular-nums ${segment.text}`}>{segment.value}</b> <span className="text-muted-foreground">{segment.label}</span>
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function WordTabs() {
  const [tab, setTab] = useState<"mistakes" | "correct">("mistakes");
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Words" className="flex gap-1 self-start rounded-lg bg-background p-1 text-sm">
        {(["mistakes", "correct"] as const).map((option) => (
          <button key={option} type="button" role="tab" aria-selected={tab === option} onClick={() => setTab(option)} className={`relative rounded-md px-3 py-1 ${tab === option ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {tab === option && <motion.span layoutId="bento-word-tab" className="absolute inset-0 rounded-md bg-accent" transition={SPRING} />}
            <span className="relative">{option === "mistakes" ? `${MOCK_MISTAKES.length} mistakes` : `${MOCK_CORRECT.length} correct`}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, x: tab === "correct" ? 16 : -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tab === "correct" ? -16 : 16 }} transition={SPRING} className="flex flex-wrap gap-2">
          {tab === "mistakes"
            ? MOCK_MISTAKES.map((word, index) => (
              <span key={index} className="flex items-center gap-2 rounded-lg bg-background px-3 py-1.5 text-lg">
                <WordDiff word={word} />
                <span className="font-mono text-sm text-muted-foreground">{word.expected}</span>
              </span>
            ))
            : MOCK_CORRECT.map((word, index) => <span key={index} className="rounded-md bg-background px-2 py-0.5 font-mono text-sm text-primary">{word.expected}</span>)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
