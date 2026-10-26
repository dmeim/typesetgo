import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, TextAaIcon, TimerIcon, XIcon } from "@phosphor-icons/react";
import { CountUp, DiffLegend, WordDiff } from "./ResultsPrimitives";
import { MOCK_CHARACTERS, MOCK_CORRECT, MOCK_MISTAKES, MOCK_SUMMARY } from "./mock-results";

const SPRING = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 } as const;

type ChipId = "correct" | "mistakes" | "characters" | "test";

const CHIPS: { id: ChipId; label: string; value: string; Icon: typeof CheckIcon; tone: string }[] = [
  { id: "correct", label: "correct", value: String(MOCK_CORRECT.length), Icon: CheckIcon, tone: "text-success" },
  { id: "mistakes", label: "mistakes", value: String(MOCK_MISTAKES.length), Icon: XIcon, tone: "text-destructive" },
  { id: "characters", label: "characters", value: `${MOCK_CHARACTERS.correct}/${MOCK_CHARACTERS.incorrect}/${MOCK_CHARACTERS.missed}/${MOCK_CHARACTERS.extra}`, Icon: TextAaIcon, tone: "text-foreground" },
  { id: "test", label: "test", value: `${MOCK_SUMMARY.durationSeconds}s`, Icon: TimerIcon, tone: "text-foreground" },
];

/** Summary chips that morph into a detail panel when tapped, then shrink back. */
export function ResultChips() {
  const [open, setOpen] = useState<ChipId | null>(null);
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2">
        {CHIPS.map(({ id, label, value, Icon, tone }) => (
          <motion.button
            key={id}
            type="button"
            layoutId={open === id ? undefined : `result-chip-${id}`}
            transition={SPRING}
            aria-expanded={open === id}
            onClick={() => setOpen(open === id ? null : id)}
            style={{ borderRadius: 999 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            className={`flex items-center gap-2 border border-border bg-card px-4 py-2 text-sm ${open === id ? "invisible" : ""}`}
          >
            <Icon className={`size-4 ${tone}`} aria-hidden="true" />
            <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
            <span className="text-muted-foreground">{label}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="popLayout">
        {open && (
          <motion.div
            key={open}
            layoutId={`result-chip-${open}`}
            transition={SPRING}
            style={{ borderRadius: 18 }}
            className="w-full max-w-2xl overflow-hidden border border-border bg-card shadow-lg"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.12 } }} exit={{ opacity: 0, transition: { duration: 0.08 } }} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{CHIPS.find((chip) => chip.id === open)?.label}</span>
                <button type="button" onClick={() => setOpen(null)} aria-label="Close details" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                  <XIcon className="size-4" aria-hidden="true" />
                </button>
              </div>
              <Detail id={open} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Detail({ id }: { id: ChipId }) {
  if (id === "correct") {
    return <Words>{MOCK_CORRECT.map((word, index) => <Chip key={index}>{word.expected}</Chip>)}</Words>;
  }
  if (id === "mistakes") {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {MOCK_MISTAKES.map((word, index) => (
            <motion.div key={index} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.15 + index * 0.05 } }} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
              <WordDiff word={word} className="text-lg" />
              <span className="font-mono text-sm text-muted-foreground">{word.expected}</span>
            </motion.div>
          ))}
        </div>
        <DiffLegend />
      </div>
    );
  }
  if (id === "characters") {
    const rows: [string, number, string][] = [["correct", MOCK_CHARACTERS.correct, "text-success"], ["wrong", MOCK_CHARACTERS.incorrect, "text-destructive"], ["missed", MOCK_CHARACTERS.missed, "text-foreground"], ["extra", MOCK_CHARACTERS.extra, "text-foreground"]];
    return (
      <div className="grid grid-cols-4 gap-2 text-center">
        {rows.map(([label, value, tone]) => (
          <div key={label} className="rounded-lg bg-background p-3">
            <CountUp value={value} className={`text-2xl font-bold ${tone}`} />
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
      <span><span className="text-muted-foreground">settings</span> {MOCK_SUMMARY.settingsLabel}</span>
      <span><span className="text-muted-foreground">raw speed</span> {MOCK_SUMMARY.rawWpm} wpm</span>
      <span><span className="text-muted-foreground">duration</span> {MOCK_SUMMARY.durationSeconds}.0s</span>
    </div>
  );
}

function Words({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-background px-2 py-0.5 font-mono text-sm text-primary">{children}</span>;
}
