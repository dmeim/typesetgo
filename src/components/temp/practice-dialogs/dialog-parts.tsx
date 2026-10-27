import { type ComponentProps, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircleIcon, InfoIcon, MagicWandIcon, ScissorsIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { ScrollRow } from "@/components/ui/scroll-row";
import { SETTINGS_SPRING } from "@/components/typing/practice-settings-meta";
import { cn } from "@/lib/utils";
import {
  MAX_TEXT, QUICK_PICKS, SAMPLES, checkText, formatLength, humanTime, shortTime,
  type Check, type LengthKind, type Sample, type TextCheck,
} from "./practice-dialogs-mock";

const SEVERITY = {
  ok: { Icon: CheckCircleIcon, tone: "text-muted-foreground", icon: "text-success" },
  note: { Icon: InfoIcon, tone: "text-muted-foreground", icon: "text-warning" },
  error: { Icon: WarningCircleIcon, tone: "text-destructive", icon: "text-destructive" },
} as const;

/** One live line under a field: the estimate when valid, the reason when not. */
export function CheckLine({ check, action, className }: { check: Check; action?: ReactNode; className?: string }) {
  const { Icon, tone, icon } = SEVERITY[check.severity];
  return (
    <div role="status" aria-live="polite" className={cn("flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm", tone, className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={`${check.severity}-${check.title}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={SETTINGS_SPRING} className="flex min-w-0 items-start gap-2">
          <Icon weight="fill" className={cn("mt-0.5 size-4 shrink-0", icon)} aria-hidden="true" />
          <span>
            {check.severity !== "ok" && <span className="font-semibold">{check.title}. </span>}
            {check.detail}
          </span>
        </motion.span>
      </AnimatePresence>
      {action}
    </div>
  );
}

export function QuickPicks({ kind, value, onPick, className }: { kind: LengthKind; value: number; onPick: (value: number) => void; className?: string }) {
  return (
    <div role="group" aria-label="Quick picks" className={cn("flex flex-wrap gap-1.5", className)}>
      {QUICK_PICKS[kind].map((pick) => (
        <button key={pick} type="button" aria-pressed={pick === value} onClick={() => onPick(pick)}
          className="h-8 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:text-primary">
          {formatLength(kind, pick)}{kind === "words" ? " words" : ""}
        </button>
      ))}
    </div>
  );
}

/** Words, characters against the limit, and typing time. `inline` fits one line. */
export function TextStats({ check, inline = false }: { check: TextCheck; inline?: boolean }) {
  const over = check.chars > MAX_TEXT;
  const fill = Math.min(1, check.chars / MAX_TEXT);
  const time = check.words ? shortTime(check.seconds) : "—";
  if (inline) {
    return (
      <span className="flex flex-wrap items-center gap-x-2 text-xs tabular-nums text-muted-foreground">
        <span>{check.words.toLocaleString()} words</span>
        <Dot />
        <span className={over ? "font-semibold text-destructive" : ""}>{check.chars.toLocaleString()}/{MAX_TEXT.toLocaleString()}</span>
        <Dot />
        <span>{time}</span>
      </span>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2 text-left">
      <Stat label="Words" value={check.words.toLocaleString()} />
      <Stat label="Characters" value={`${check.chars.toLocaleString()}`} tone={over ? "text-destructive" : undefined}>
        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <motion.span className={cn("block h-full origin-left rounded-full", over ? "bg-destructive" : "bg-primary")} animate={{ scaleX: fill }} transition={SETTINGS_SPRING} />
        </span>
        <span className="mt-1 block text-[11px] text-muted-foreground">of {MAX_TEXT.toLocaleString()}</span>
      </Stat>
      <Stat label="Typing time" value={time} />
    </div>
  );
}

function Stat({ label, value, tone, children }: { label: string; value: string; tone?: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-muted/50 px-3 py-2.5">
      <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("block truncate text-lg font-semibold tabular-nums", tone)}>{value}</span>
      {children}
    </div>
  );
}

/** Characters a keyboard can't type, shown as keycaps, with an optional one-click fix. */
export function CharNotice({ check, onFix, compact = false }: { check: TextCheck; onFix?: () => void; compact?: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {check.removedCount > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={SETTINGS_SPRING} className="overflow-hidden">
          <div className={cn("flex flex-wrap items-center gap-2 rounded-2xl border border-warning/40 bg-warning/10 text-sm", compact ? "px-3 py-2" : "px-4 py-3")}>
            <WarningCircleIcon weight="fill" className="size-4 shrink-0 text-warning" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              {check.removedCount} {check.removedCount === 1 ? "character" : "characters"} can't be typed and will be skipped
              {!compact && (
                <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
                  {check.removed.map((char) => <kbd key={char} className="rounded-md border border-border bg-card px-1.5 font-mono text-xs">{char}</kbd>)}
                </span>
              )}
            </span>
            {onFix && (
              <button type="button" onClick={onFix} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-xs font-semibold text-foreground ring-1 ring-border transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                <MagicWandIcon className="size-3.5" aria-hidden="true" />
                Fix them
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Shown beside a "Too long" message: cuts the text at the last whole word that fits. */
export function TrimButton({ check, onTrim }: { check: TextCheck; onTrim: () => void }) {
  if (check.chars <= MAX_TEXT) return null;
  return (
    <button type="button" onClick={onTrim} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-xs font-semibold text-foreground ring-1 ring-border transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
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

export function SampleCards({ onPick }: { onPick: (sample: Sample) => void }) {
  return (
    <div className="grid gap-2 @min-[30rem]:grid-cols-2">
      {SAMPLES.map((sample) => {
        const check = checkText(sample.text);
        return (
          <button key={sample.id} type="button" onClick={() => onPick(sample)}
            className="flex min-w-0 flex-col gap-1 rounded-2xl border border-border bg-background p-3 text-left transition hover:-translate-y-0.5 hover:border-primary focus-visible:outline-2 focus-visible:outline-ring">
            <span className="text-sm font-semibold">{sample.title}</span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{sample.text}</span>
            <span className="text-[11px] tabular-nums text-muted-foreground">{check.words} words · about {humanTime(check.seconds)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TextBox({ invalid, className, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea aria-invalid={invalid || undefined} spellCheck={false} placeholder="Paste a poem, a paragraph from today's reading, spelling words…" {...props}
      className={cn("w-full resize-none rounded-2xl border border-input bg-background p-4 font-mono text-sm leading-relaxed outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20", className)} />
  );
}

export function PrimaryButton({ className, children, ...props }: ComponentProps<typeof motion.button>) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} {...props}
      className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-45", className)}>
      {children}
    </motion.button>
  );
}

export function QuietButton({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button type="button" {...props}
      className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", className)}>
      {children}
    </button>
  );
}

export function CloseButton({ onClick, label = "Close" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
      <XIcon className="size-4" aria-hidden="true" />
    </button>
  );
}

/** Dims the stage behind a surface; stays inside the frame. */
export function Scrim({ onClick }: { onClick: () => void }) {
  return (
    <motion.div aria-hidden="true" onClick={onClick} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 bg-background/70 backdrop-blur-[3px]" />
  );
}

export function Dot() {
  return <span className="size-1 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />;
}

const PROMPT = "the class sat down to practise and every word they typed made the next one a little easier to find on the keys";

/** A faint practice line so the stage reads as Home. */
export function StagePrompt({ text }: { text?: string }) {
  const words = (text?.trim() || PROMPT).split(/\s+/).slice(0, 28).join(" ");
  return (
    <p aria-hidden="true" className="mx-auto line-clamp-3 max-w-2xl px-5 text-center text-lg leading-relaxed text-muted-foreground/50 @min-[40rem]:text-2xl">
      <span className="mr-0.5 inline-block h-5 w-0.5 translate-y-0.5 animate-pulse bg-primary @min-[40rem]:h-6" />
      {words}
    </p>
  );
}
