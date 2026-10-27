import type { KeyboardEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChartLineIcon, XIcon } from "@phosphor-icons/react";
import { diffWord, type CharStatus } from "@/lib/word-diff";
import { cn } from "@/lib/utils";
import type { ChipId, ResultChip, ResultDetail, ResultDetailsData } from "./result-details";

const SPRING = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 } as const;

const CHIP_STYLES = {
  pill: "flex items-center gap-1.5 border border-border bg-card px-3 py-1 text-xs",
  cell: "flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-center transition-colors hover:bg-accent",
  tile: "flex h-full flex-col justify-between gap-2 border border-border bg-card p-3 text-left",
};
const CHIP_RADIUS = { pill: 999, cell: 14, tile: 18 };
// Stable, so the panel takes focus once when it opens rather than on every render.
const focusOnMount = (element: HTMLElement | null) => element?.focus({ preventScroll: true });

const CHAR_TONE: Record<CharStatus, string> = {
  correct: "text-foreground",
  incorrect: "text-destructive",
  missed: "text-muted-foreground underline decoration-dotted underline-offset-4",
  extra: "text-destructive/70 line-through",
};

function closeOnEscape(detail: ResultDetail) {
  return (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    detail.close();
  };
}

interface ResultDetailChipsProps {
  chips: ResultChip[];
  detail: ResultDetail;
  /** Shared with the slot, so a chip morphs into its own panel. */
  scope: string;
  variant?: keyof typeof CHIP_STYLES;
  only?: ChipId[];
  /** The open chip's spot turns into a Graph pill that brings the graph back, so the order never changes. */
  swap?: boolean;
  className?: string;
}

/** The four result chips. Opening one morphs it into a panel over the graph, so the page never grows. */
export function ResultDetailChips({ chips, detail, scope, variant = "pill", only, swap = false, className }: ResultDetailChipsProps) {
  return (
    <div className={cn(variant === "pill" && "flex flex-wrap justify-center gap-2", className)}>
      {chips.filter((chip) => !only || only.includes(chip.id)).map(({ id, value, label, ariaLabel, Icon, tone, tile }) => detail.open === id && swap ? (
        // Its own element: reusing the chip's would keep the leftover morph transform and hide it.
        <motion.button
          key={`${id}-graph`}
          ref={detail.chipRef(id)}
          type="button"
          autoFocus
          aria-label="Back to the graph"
          onClick={detail.close}
          onKeyDown={closeOnEscape(detail)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-1.5 rounded-full border border-primary bg-primary/15 px-3 py-1 text-xs font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChartLineIcon className="size-3.5 shrink-0" aria-hidden="true" />
          graph
        </motion.button>
      ) : (
        <motion.button
          key={id}
          ref={detail.chipRef(id)}
          type="button"
          layoutId={detail.open === id ? undefined : `${scope}-${id}`}
          transition={SPRING}
          aria-expanded={detail.open === id}
          aria-label={ariaLabel}
          onClick={() => detail.toggle(id)}
          style={{ borderRadius: CHIP_RADIUS[variant] }}
          whileHover={variant === "cell" ? undefined : { y: -2 }}
          whileTap={{ scale: 0.96 }}
          className={cn(CHIP_STYLES[variant], "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", detail.open === id && "invisible")}
        >
          {variant === "tile" ? (
            <>
              <span className={cn("flex size-8 items-center justify-center rounded-xl", tile)}><Icon className="size-4" weight="bold" aria-hidden="true" /></span>
              <span className="flex flex-col">
                <span className={cn("text-xl font-bold tabular-nums leading-tight", tone)}>{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </span>
            </>
          ) : variant === "cell" ? (
            <>
              <span className={cn("flex items-center gap-1.5 text-lg font-bold tabular-nums", tone)}><Icon className="size-4 shrink-0" aria-hidden="true" />{value}</span>
              <span className="text-[0.7rem] text-muted-foreground">{label}</span>
            </>
          ) : (
            <>
              <Icon className={cn("size-3.5 shrink-0", tone)} aria-hidden="true" />
              {value && <span className={cn("font-semibold tabular-nums", tone)}>{value}</span>}
              <span className="text-muted-foreground">{label}</span>
            </>
          )}
        </motion.button>
      ))}
    </div>
  );
}

/** A chip's words, mistakes, letters or test details, scrolling inside whatever height it is given. */
export function ResultDetailBody({ id, data }: { id: ChipId; data: ResultDetailsData }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <ChipDetail id={id} data={data} />
    </div>
  );
}

interface ResultDetailSlotProps {
  chips: ResultChip[];
  data: ResultDetailsData;
  detail: ResultDetail;
  scope: string;
  /** With `swap`, the Graph pill closes the panel instead of a button inside it. */
  swap?: boolean;
  className?: string;
  children: ReactNode;
}

/** Wraps the graph; an open chip lands here as a panel covering it. */
export function ResultDetailSlot({ chips, data, detail, scope, swap = false, className, children }: ResultDetailSlotProps) {
  const chip = chips.find((candidate) => candidate.id === detail.open);
  return (
    <div className={cn("relative flex min-h-0 flex-col", className)}>
      {children}
      <AnimatePresence>
        {chip && (
          <motion.div
            key={chip.id}
            ref={swap ? undefined : focusOnMount}
            tabIndex={-1}
            role="group"
            aria-label={chip.title}
            layoutId={`${scope}-${chip.id}`}
            transition={SPRING}
            style={{ borderRadius: 18 }}
            onKeyDown={closeOnEscape(detail)}
            className="absolute inset-0 z-10 flex flex-col overflow-hidden border border-border bg-card shadow-lg outline-none"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.12 } }} exit={{ opacity: 0, transition: { duration: 0.08 } }} className="flex min-h-0 flex-1 flex-col p-4">
              <div className="mb-3 flex min-h-7 items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <chip.Icon className={cn("size-4", chip.tone)} aria-hidden="true" />
                  {chip.title}
                </h3>
                {!swap && (
                  <button type="button" onClick={detail.close} aria-label="Back to the graph" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                    <XIcon className="size-3.5" aria-hidden="true" />
                    Graph
                  </button>
                )}
              </div>
              <ResultDetailBody id={chip.id} data={data} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChipDetail({ id, data }: { id: ChipId; data: ResultDetailsData }) {
  const { correctWords, incorrectWords, stats, testLabel, seconds } = data;
  if (id === "correct") {
    if (correctWords.length === 0) return <Empty>No correct words</Empty>;
    return (
      <div className="flex flex-wrap gap-1.5">
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
        <div className="grid gap-2 @min-[30rem]:grid-cols-2">
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
      <div className="grid grid-cols-2 gap-2 text-center @min-[30rem]:grid-cols-4">
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
