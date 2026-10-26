import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, TextAaIcon, TimerIcon, XIcon, type Icon } from "@phosphor-icons/react";
import { diffWord, type CharStatus } from "@/lib/word-diff";

const SPRING = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 } as const;

type ChipId = "correct" | "mistakes" | "characters" | "test";

const CHAR_TONE: Record<CharStatus, string> = {
  correct: "text-foreground",
  incorrect: "text-destructive",
  missed: "text-muted-foreground underline decoration-dotted underline-offset-4",
  extra: "text-destructive/70 line-through",
};

interface ResultChipsProps {
  correctWords: string[];
  incorrectWords: { typed: string; expected: string }[];
  stats: { correct: number; incorrect: number; missed: number; extra: number };
  /** Settings summary, such as "time · 30s · beginner". */
  testLabel: string;
  durationMs?: number;
}

interface ChipDefinition {
  id: ChipId;
  title: string;
  value: string;
  label: string;
  ariaLabel?: string;
  Icon: Icon;
  tone: string;
}

/** Result summary chips that morph into a detail panel when activated, then shrink back. */
export function ResultChips({ correctWords, incorrectWords, stats, testLabel, durationMs }: ResultChipsProps) {
  const [open, setOpen] = useState<ChipId | null>(null);
  const chipRefs = useRef<Partial<Record<ChipId, HTMLButtonElement | null>>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<ChipId | null>(null);
  const seconds = durationMs === undefined ? null : (durationMs / 1000).toFixed(1);
  const characters = `${stats.correct}/${stats.incorrect}/${stats.missed}/${stats.extra}`;
  const chips: ChipDefinition[] = [
    { id: "correct", title: "Correct words", value: String(correctWords.length), label: "correct", Icon: CheckIcon, tone: "text-success" },
    { id: "mistakes", title: "Mistakes", value: String(incorrectWords.length), label: incorrectWords.length === 1 ? "mistake" : "mistakes", Icon: XIcon, tone: "text-destructive" },
    {
      id: "characters", title: "Characters", value: characters, label: "characters", Icon: TextAaIcon, tone: "text-foreground",
      ariaLabel: `${characters} characters: ${stats.correct} correct, ${stats.incorrect} wrong, ${stats.missed} missed, ${stats.extra} extra`,
    },
    { id: "test", title: "Test", value: seconds === null ? "" : `${seconds}s`, label: "test", Icon: TimerIcon, tone: "text-foreground" },
  ];

  useEffect(() => {
    if (open) {
      panelRef.current?.focus({ preventScroll: true });
    } else if (returnFocusRef.current) {
      chipRefs.current[returnFocusRef.current]?.focus({ preventScroll: true });
      returnFocusRef.current = null;
    }
  }, [open]);

  const close = () => {
    returnFocusRef.current = open;
    setOpen(null);
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2">
        {chips.map(({ id, value, label, ariaLabel, Icon, tone }) => (
          <motion.button
            key={id}
            ref={(element) => { chipRefs.current[id] = element; }}
            type="button"
            layoutId={open === id ? undefined : `result-chip-${id}`}
            transition={SPRING}
            aria-expanded={open === id}
            aria-label={ariaLabel ?? `${value} ${label}`.trim()}
            onClick={() => setOpen(open === id ? null : id)}
            style={{ borderRadius: 999 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            className={`flex items-center gap-2 border border-border bg-card px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${open === id ? "invisible" : ""}`}
          >
            <Icon className={`size-4 shrink-0 ${tone}`} aria-hidden="true" />
            {value && <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>}
            <span className="text-muted-foreground">{label}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="popLayout">
        {open && (
          <motion.div
            key={open}
            ref={panelRef}
            tabIndex={-1}
            role="group"
            aria-label={chips.find((chip) => chip.id === open)?.title}
            layoutId={`result-chip-${open}`}
            transition={SPRING}
            style={{ borderRadius: 18 }}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              close();
            }}
            className="w-full max-w-2xl overflow-hidden border border-border bg-card shadow-lg outline-none"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.12 } }} exit={{ opacity: 0, transition: { duration: 0.08 } }} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{chips.find((chip) => chip.id === open)?.title}</h3>
                <button type="button" onClick={close} aria-label="Close details" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                  <XIcon className="size-4" aria-hidden="true" />
                </button>
              </div>
              <ChipDetail id={open} {...{ correctWords, incorrectWords, stats, testLabel, seconds }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChipDetail({ id, correctWords, incorrectWords, stats, testLabel, seconds }: Omit<ResultChipsProps, "durationMs"> & { id: ChipId; seconds: string | null }) {
  if (id === "correct") {
    if (correctWords.length === 0) return <Empty>No correct words</Empty>;
    return (
      <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
        {correctWords.map((word, index) => (
          <span key={index} className="max-w-full break-all rounded-md bg-background px-2 py-0.5 font-mono text-sm text-primary">{word}</span>
        ))}
      </div>
    );
  }
  if (id === "mistakes") {
    if (incorrectWords.length === 0) return <Empty>No mistakes - perfect!</Empty>;
    return (
      <div className="flex flex-col gap-3">
        <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
          {incorrectWords.map((word, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.15 + Math.min(index, 12) * 0.04 } }}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background px-3 py-2"
            >
              <span className="break-all font-mono text-lg" aria-label={`typed ${word.typed}, expected ${word.expected}`}>
                {diffWord(word).map((char, charIndex) => (
                  <span key={charIndex} className={CHAR_TONE[char.status]} aria-hidden="true">{char.char}</span>
                ))}
              </span>
              <span className="break-all font-mono text-sm text-muted-foreground" aria-hidden="true">{word.expected}</span>
            </motion.div>
          ))}
        </div>
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground" aria-hidden="true">
          <span><span className="text-destructive">a</span> wrong letter</span>
          <span><span className="underline decoration-dotted underline-offset-4">a</span> missed</span>
          <span><span className="text-destructive/70 line-through">a</span> extra</span>
        </span>
      </div>
    );
  }
  if (id === "characters") {
    const rows: [string, number, string][] = [
      ["correct", stats.correct, "text-success"],
      ["wrong", stats.incorrect, "text-destructive"],
      ["missed", stats.missed, "text-foreground"],
      ["extra", stats.extra, "text-foreground"],
    ];
    return (
      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        {rows.map(([label, value, tone]) => (
          <div key={label} className="rounded-lg bg-background p-3">
            <div className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
      <span><span className="text-muted-foreground">settings</span> {testLabel}</span>
      {seconds !== null && <span><span className="text-muted-foreground">duration</span> {seconds}s</span>}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-2 text-center text-sm text-muted-foreground">{children}</p>;
}
