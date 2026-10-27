import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowClockwiseIcon, ArrowFatRightIcon, ChartLineIcon, CheckCircleIcon, CircleNotchIcon, FloppyDiskIcon, XIcon } from "@phosphor-icons/react";
import { ChipDetail, type ChipId } from "@/components/typing/ResultChips";
import { cn } from "@/lib/utils";
import { CHIPS, RESULT, type Detail, type ResultsLayoutProps } from "./results-layouts";

const SPRING = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 } as const;

const CHIP_STYLES = {
  pill: "flex items-center gap-1.5 border border-border bg-card px-3 py-1 text-xs",
  cell: "flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-center transition-colors hover:bg-accent",
  tile: "flex h-full flex-col justify-between gap-2 border border-border bg-card p-3 text-left",
};
const CHIP_RADIUS = { pill: 999, cell: 14, tile: 18 };
// Stable, so the panel takes focus once when it opens rather than on every render.
const focusOnMount = (element: HTMLElement | null) => element?.focus({ preventScroll: true });

interface ChipsProps {
  detail: Detail;
  scope: string;
  variant?: keyof typeof CHIP_STYLES;
  only?: ChipId[];
  /** The open chip's spot turns into a Graph pill that brings the graph back, so the order never changes. */
  swap?: boolean;
  className?: string;
}

/** The four result chips. Opening one morphs it into a panel over the graph, so the page never grows. */
export function Chips({ detail, scope, variant = "pill", only, swap = false, className }: ChipsProps) {
  return (
    <div className={cn(variant === "pill" && "flex flex-wrap justify-center gap-2", className)}>
      {CHIPS.filter((chip) => !only || only.includes(chip.id)).map(({ id, value, label, Icon, tone, tile }) => detail.open === id && swap ? (
        // Its own element: reusing the chip's would keep the leftover morph transform and hide it.
        <motion.button
          key={`${id}-graph`}
          ref={detail.chipRef(id)}
          type="button"
          autoFocus
          aria-label="Back to the graph"
          onClick={detail.close}
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
          aria-label={`${value} ${label}`}
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
              <span className={cn("font-semibold tabular-nums", tone)}>{value}</span>
              <span className="text-muted-foreground">{label}</span>
            </>
          )}
        </motion.button>
      ))}
    </div>
  );
}

/** The words, mistakes, letters or test details, taller than the shipping version allows. */
export function DetailBody({ id }: { id: ChipId }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1 [&_[class*=max-h-]]:max-h-none">
      <ChipDetail id={id} correctWords={RESULT.words.correctWords} incorrectWords={RESULT.words.incorrectWords} stats={RESULT.stats} testLabel={RESULT.testLabel} seconds={RESULT.seconds} />
    </div>
  );
}

/** Wraps the graph; an open chip lands here as a panel covering it. With `swap`, the Graph pill closes it instead of a button inside. */
export function DetailSlot({ detail, scope, swap = false, className, children }: { detail: Detail; scope: string; swap?: boolean; className?: string; children: ReactNode }) {
  const chip = CHIPS.find((candidate) => candidate.id === detail.open);
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
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              detail.close();
            }}
            className="absolute inset-0 z-10 flex flex-col overflow-hidden border border-border bg-card shadow-lg outline-none"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.12 } }} exit={{ opacity: 0, transition: { duration: 0.08 } }} className="flex min-h-0 flex-1 flex-col p-4">
              <div className="mb-3 flex min-h-7 items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <chip.Icon className={cn("size-4", chip.tone)} aria-hidden="true" />
                  {chip.title}
                </h3>
                {!swap && <button type="button" onClick={detail.close} aria-label="Back to the graph" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                  <XIcon className="size-3.5" aria-hidden="true" />
                  Graph
                </button>}
              </div>
              <DetailBody id={chip.id} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="hidden rounded border border-current/30 px-1 font-mono text-[0.6rem] font-normal leading-4 opacity-60 @min-[30rem]:inline">{children}</kbd>;
}

const BUTTON = "inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Repeat, Save and Next together, with their keys printed on them instead of a hint paragraph. */
export function ActionBar({ save, replay, stacked = false, className }: ResultsLayoutProps & { stacked?: boolean; className?: string }) {
  const SaveIcon = save.state === "saved" ? CheckCircleIcon : save.state === "saving" ? CircleNotchIcon : FloppyDiskIcon;
  const saveButton = (
    <button
      type="button"
      onClick={save.save}
      disabled={save.state !== "idle"}
      className={cn(BUTTON, "disabled:cursor-default", save.state === "saved" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground hover:opacity-90", stacked && "w-full")}
    >
      <SaveIcon className={cn("size-[18px] shrink-0", save.state === "saving" && "motion-safe:animate-spin")} aria-hidden="true" />
      {save.state === "saved" ? "Saved" : save.state === "saving" ? "Saving…" : "Save result"}
      {save.state === "idle" && <Kbd>space</Kbd>}
    </button>
  );
  const repeat = (
    <button type="button" onClick={replay} className={cn(BUTTON, "border border-border bg-background text-foreground hover:bg-accent")}>
      <ArrowClockwiseIcon className="size-[18px] shrink-0" aria-hidden="true" />
      Repeat
    </button>
  );
  const next = (
    <button type="button" onClick={replay} className={cn(BUTTON, "bg-card text-foreground ring-1 ring-border hover:bg-accent")}>
      <ArrowFatRightIcon className="size-[18px] shrink-0" aria-hidden="true" />
      {stacked ? "Next" : "Next test"}
      {!stacked && <Kbd>enter</Kbd>}
    </button>
  );

  if (stacked) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {saveButton}
        <div className="grid grid-cols-2 gap-2">{repeat}{next}</div>
      </div>
    );
  }
  return <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>{repeat}{saveButton}{next}</div>;
}
