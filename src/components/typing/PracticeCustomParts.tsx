import type { ComponentProps, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircleIcon, InfoIcon, MagicWandIcon, ScissorsIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { ScrollRow } from "@/components/ui/scroll-row";
import { MAX_PRESET_TEXT_LENGTH } from "@/lib/practice-limits";
import { cn } from "@/lib/utils";
import { SETTINGS_SPRING } from "./practice-settings-meta";
import { QUICK_PICKS, SAMPLES, formatLength, shortTime, type Check, type LengthKind, type Sample, type TextCheck } from "./practice-custom";

const SEVERITY = {
  ok: { Icon: CheckCircleIcon, tone: "text-muted-foreground", icon: "text-success" },
  note: { Icon: InfoIcon, tone: "text-muted-foreground", icon: "text-warning" },
  error: { Icon: WarningCircleIcon, tone: "text-destructive", icon: "text-destructive" },
} as const;

const chipButton = "inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-xs font-semibold text-foreground ring-1 ring-border transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring";

/** One live line under a field: the estimate when valid, the reason when not. */
export function CheckLine({ id, check, action }: { id: string; check: Check; action?: ReactNode }) {
  const { Icon, tone, icon } = SEVERITY[check.severity];
  const reduceMotion = useReducedMotion();
  return (
    <div id={id} role="status" aria-live="polite" className={cn("flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm", tone)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={`${check.severity}-${check.title}`} initial={reduceMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4 }} transition={SETTINGS_SPRING} className="flex min-w-0 items-start gap-2">
          <Icon weight="fill" className={cn("mt-0.5 size-4 shrink-0", icon)} aria-hidden="true" />
          <span className="min-w-0">
            {check.severity !== "ok" && check.title && <span className="font-semibold">{check.title}. </span>}
            {check.detail}
          </span>
        </motion.span>
      </AnimatePresence>
      {action}
    </div>
  );
}

export function QuickPicks({ kind, value, onPick }: { kind: LengthKind; value: number; onPick: (value: number) => void }) {
  return (
    <div role="group" aria-label="Quick picks" className="flex flex-wrap gap-1.5 pb-1">
      {QUICK_PICKS[kind].map((pick) => (
        <button key={pick} type="button" aria-pressed={pick === value} onClick={() => onPick(pick)}
          className="h-8 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:text-primary">
          {formatLength(kind, pick)}{kind === "words" ? " words" : ""}
        </button>
      ))}
    </div>
  );
}

/** Words, characters against the limit, and typing time on one wrapping line. */
export function TextStats({ check }: { check: TextCheck }) {
  const over = check.chars > MAX_PRESET_TEXT_LENGTH;
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-xs tabular-nums text-muted-foreground">
      <span>{check.words.toLocaleString()} words</span>
      <Dot />
      <span className={over ? "font-semibold text-destructive" : ""}>{check.chars.toLocaleString()}/{MAX_PRESET_TEXT_LENGTH.toLocaleString()}</span>
      <Dot />
      <span>{check.words ? shortTime(check.seconds) : "—"}</span>
    </span>
  );
}

/** Characters a keyboard can't type, with a one-click fix. */
export function CharNotice({ check, onFix }: { check: TextCheck; onFix: () => void }) {
  if (check.removedCount === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
      <WarningCircleIcon weight="fill" className="size-4 shrink-0 text-warning" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {check.removedCount} {check.removedCount === 1 ? "character" : "characters"} can't be typed and will be skipped
      </span>
      <button type="button" onClick={onFix} className={chipButton}>
        <MagicWandIcon className="size-3.5" aria-hidden="true" />
        Fix them
      </button>
    </div>
  );
}

/** Shown beside a "Too long" message: cuts the text at the last whole word that fits. */
export function TrimButton({ check, onTrim }: { check: TextCheck; onTrim: () => void }) {
  if (check.chars <= MAX_PRESET_TEXT_LENGTH) return null;
  return (
    <button type="button" onClick={onTrim} className={chipButton}>
      <ScissorsIcon className="size-3.5" aria-hidden="true" />
      Trim to fit
    </button>
  );
}

export function SampleChips({ onPick }: { onPick: (sample: Sample) => void }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">Start from</span>
      <div className="min-w-0 flex-1">
        <ScrollRow role="group" aria-label="Start from a sample" className="gap-1.5">
          {SAMPLES.map((sample) => (
            <button key={sample.id} type="button" onClick={() => onPick(sample)}
              className="h-8 shrink-0 whitespace-nowrap rounded-full bg-muted/70 px-3 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              {sample.title}
            </button>
          ))}
        </ScrollRow>
      </div>
    </div>
  );
}

export function TextBox({ invalid, className, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea aria-invalid={invalid || undefined} spellCheck={false} placeholder="Paste a poem, a paragraph from today's reading, spelling words…" {...props}
      className={cn("w-full resize-none rounded-2xl border border-input bg-background p-4 font-mono text-sm leading-relaxed outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20", className)} />
  );
}

export function PrimaryButton({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button type="button" {...props}
      className={cn("inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-45", className)}>
      {children}
    </button>
  );
}

export function QuietButton({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button type="button" {...props}
      className={cn("inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", className)}>
      {children}
    </button>
  );
}

function Dot() {
  return <span className="size-1 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />;
}
