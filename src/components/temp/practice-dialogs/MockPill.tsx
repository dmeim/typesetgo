import { useId, type ReactNode, type RefObject } from "react";
import { motion } from "framer-motion";
import { CaretDownIcon, PencilSimpleIcon, PlusIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { MODE_META, SETTINGS_SPRING } from "@/components/typing/practice-settings-meta";
import { cn } from "@/lib/utils";
import { Dot } from "./dialog-parts";
import {
  PILL_PRESETS, checkText, excerpt, formatLength, isCustom, shortEstimate, shortTime,
  type Applied, type LengthKind, type PillStyle, type SurfaceKind,
} from "./practice-dialogs-mock";

type PillProps = {
  surface: SurfaceKind;
  kind: LengthKind;
  applied: Applied;
  apply: (patch: Partial<Applied>) => void;
  pillStyle: PillStyle;
  open: boolean;
  onOpen: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** id of an inline region the trigger expands; dialogs leave it out. */
  controls?: string;
  className?: string;
};

const chip = "relative inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";

/** The open pill's mode and length row, as on Home, with the custom chip that opens each surface. */
export function PillRow({ surface, kind, applied, apply, pillStyle, open, onOpen, triggerRef, controls, className }: PillProps) {
  const id = useId();
  const mode = surface === "text" ? "preset" : kind;
  const { Icon } = MODE_META[mode];
  const value = applied[kind];
  const custom = surface === "length" && isCustom(kind, value);

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <span className="inline-flex w-20 shrink-0 items-center gap-1.5 text-sm font-medium text-primary">
        <Icon className="size-4" aria-hidden="true" />
        {mode}
      </span>
      {surface === "length" ? (
        <div role="group" aria-label={kind === "time" ? "Duration" : "Word count"} className="flex min-w-0 flex-wrap rounded-xl bg-background/60 p-1">
          {PILL_PRESETS[kind].map((preset) => {
            const selected = !custom && preset === value;
            return (
              <button key={preset} type="button" aria-pressed={selected} onClick={() => apply({ [kind]: preset })}
                className={cn(chip, selected ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground")}>
                {selected && <Highlight id={id} />}
                <span className="relative">{kind === "time" ? `${preset}s` : preset}</span>
              </button>
            );
          })}
          <Trigger triggerRef={triggerRef} open={open} onOpen={onOpen} controls={controls} selected={custom} label={custom ? `Custom length, ${formatLength(kind, value)}. Change` : "Custom length"}>
            {custom && <Highlight id={id} />}
            <span className="relative inline-flex items-center gap-1.5">
              {custom ? <CustomValue kind={kind} value={value} pillStyle={pillStyle} /> : <><SlidersHorizontalIcon className="size-4" aria-hidden="true" />custom</>}
            </span>
          </Trigger>
        </div>
      ) : (
        <TextTrigger applied={applied} pillStyle={pillStyle} triggerRef={triggerRef} open={open} onOpen={onOpen} controls={controls} />
      )}
    </div>
  );
}

function CustomValue({ kind, value, pillStyle }: { kind: LengthKind; value: number; pillStyle: PillStyle }) {
  const label = formatLength(kind, value);
  if (pillStyle === "badge") {
    return <>{label}{kind === "words" && " words"}<span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">custom</span></>;
  }
  if (pillStyle === "estimate") {
    return <>{label}<span className="text-xs font-normal text-muted-foreground">{shortEstimate(kind, value)}</span></>;
  }
  return <><SlidersHorizontalIcon className="size-4" aria-hidden="true" />{label}</>;
}

function TextTrigger({ applied, pillStyle, triggerRef, open, onOpen, controls }: Pick<PillProps, "applied" | "pillStyle" | "triggerRef" | "open" | "onOpen" | "controls">) {
  const check = checkText(applied.text);
  if (!applied.text) {
    return (
      <Trigger triggerRef={triggerRef} open={open} onOpen={onOpen} controls={controls} label="Add your own text"
        className="border border-dashed border-border text-muted-foreground hover:border-primary hover:text-foreground">
        <PlusIcon className="size-4" aria-hidden="true" />
        Add your text
      </Trigger>
    );
  }
  return (
    <Trigger triggerRef={triggerRef} open={open} onOpen={onOpen} controls={controls} selected label={`Your text, ${check.words} words. Edit`} className="min-w-0 bg-accent font-medium text-primary">
      <PencilSimpleIcon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate font-normal text-foreground">“{excerpt(check.clean, pillStyle === "plain" ? 26 : 16)}”</span>
      {pillStyle === "badge" && <span className="shrink-0 rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">{check.words} words</span>}
      {pillStyle === "estimate" && <span className="shrink-0 text-xs font-normal text-muted-foreground">{shortTime(check.seconds)}</span>}
    </Trigger>
  );
}

function Trigger({ triggerRef, open, onOpen, controls, selected = false, label, className, children }: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpen: () => void;
  controls?: string;
  selected?: boolean;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.button ref={triggerRef} type="button" onClick={onOpen} whileTap={{ scale: 0.96 }}
      aria-label={label} aria-expanded={open} aria-controls={controls} aria-haspopup={controls ? undefined : "dialog"}
      className={cn(chip, "max-w-full", selected ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground", open && "ring-2 ring-primary/50", className)}>
      {children}
    </motion.button>
  );
}

function Highlight({ id }: { id: string }) {
  return <motion.span layoutId={`${id}-pill-highlight`} transition={SETTINGS_SPRING} className="absolute inset-0 rounded-lg bg-accent" aria-hidden="true" />;
}

/** The card the row sits in, matching the open pill on Home. */
export function PillShell({ className, children }: { className?: string; children: ReactNode }) {
  return <motion.div layout transition={SETTINGS_SPRING} className={cn("w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm", className)}>{children}</motion.div>;
}

/** How the closed pill on Home reads once the value is applied. */
export function ClosedPill({ surface, kind, applied }: { surface: SurfaceKind; kind: LengthKind; applied: Applied }) {
  const mode = surface === "text" ? "preset" : kind;
  const { Icon } = MODE_META[mode];
  const check = checkText(applied.text);
  const length = surface === "text"
    ? applied.text ? `your text · ${check.words} words` : "add your text"
    : `${formatLength(kind, applied[kind])}${kind === "words" ? " words" : ""}`;
  const custom = surface === "length" && isCustom(kind, applied[kind]);
  return (
    <span className="inline-flex max-w-full items-center gap-3 rounded-full border border-border bg-card px-5 py-2.5 text-sm shadow-sm">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="font-medium text-primary">{mode}</span>
      <Dot />
      <motion.span key={length} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={SETTINGS_SPRING} className="inline-flex min-w-0 items-center gap-1.5 truncate">
        {custom && <SlidersHorizontalIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
        {length}
      </motion.span>
      {surface === "length" && <><Dot /><span className="hidden @min-[24rem]:inline">beginner</span></>}
      <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </span>
  );
}
