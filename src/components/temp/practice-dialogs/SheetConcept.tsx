import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { BackspaceIcon, CheckIcon, PlayIcon } from "@phosphor-icons/react";
import { ScrollRow } from "@/components/ui/scroll-row";
import { SETTINGS_SPRING } from "@/components/typing/practice-settings-meta";
import { cn } from "@/lib/utils";
import { CharNotice, CheckLine, PrimaryButton, SampleChips, Scrim, StagePrompt, TextBox, TextStats, TrimButton } from "./dialog-parts";
import { PillRow, PillShell } from "./MockPill";
import {
  LENGTH_TITLES, QUICK_PICKS, checkLength, fixCharacters, formatLength, seedLength, trimToLimit,
  type Applied, type ConceptProps, type LengthKind, type SeedId,
} from "./practice-dialogs-mock";
import { surfaceKeys, useSurface, useTextDraft } from "./use-surface";

/** 05: a sheet that slides up from the bottom, with its own number pad. */
export function SheetConcept({ surface, kind, applied, apply, initialSeed, compact }: ConceptProps) {
  const sheet = useSurface(initialSeed);
  const drag = useDragControls();
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const title = surface === "text" ? "Your own text" : LENGTH_TITLES[kind];

  return (
    <div className="relative flex h-full flex-col items-center gap-8 px-3 pt-6 @min-[40rem]:px-6">
      <PillShell>
        <PillRow surface={surface} kind={kind} applied={applied} apply={apply} pillStyle="plain" open={sheet.isOpen}
          onOpen={() => sheet.open()} triggerRef={sheet.triggerRef} />
      </PillShell>
      <StagePrompt text={surface === "text" ? applied.text : undefined} />
      <AnimatePresence>{sheet.isOpen && <Scrim key="scrim" onClick={() => sheet.close(false)} />}</AnimatePresence>
      <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center overflow-hidden">
        <AnimatePresence>
          {sheet.isOpen && (
            <motion.div ref={sheetRef} key="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
              onKeyDown={(event) => surfaceKeys(event, () => sheet.close(), true)}
              drag="y" dragListener={false} dragControls={drag} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.8 }}
              onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) sheet.close(); }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SETTINGS_SPRING}
              className={cn("pointer-events-auto flex max-h-[90%] w-full flex-col rounded-t-[2rem] border border-b-0 border-border bg-card shadow-2xl outline-none", !compact && "max-w-md")}>
              <button type="button" aria-label="Close" onClick={() => sheet.close()} onPointerDown={(event) => drag.start(event)}
                className="mx-auto mt-2 flex h-6 w-20 shrink-0 cursor-grab touch-none items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing">
                <span className="h-1.5 w-10 rounded-full bg-muted-foreground/40" aria-hidden="true" />
              </button>
              <h4 id={titleId} className="shrink-0 px-5 pb-1 text-center text-sm font-semibold">{title}</h4>
              {surface === "length"
                ? <KeypadBody kind={kind} seed={sheet.seed} applied={applied} focusTarget={sheetRef} onApply={(value) => { apply({ [kind]: value }); sheet.close(); }} />
                : <TextBody seed={sheet.seed} applied={applied} onApply={(text) => { apply({ text }); sheet.close(); }} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

type BodyProps<T> = { seed: SeedId; applied: Applied; onApply: (value: T) => void };

const MAX_DIGITS: Record<LengthKind, number> = { time: 4, words: 5 };

/** Time digits fill from the right like a microwave: 1, 3, 0 reads 1:30. */
function toDigits(kind: LengthKind, value: number) {
  if (!Number.isFinite(value)) return "";
  if (kind === "words" || value === 0) return String(value);
  return `${Math.floor(value / 60) || ""}${String(value % 60).padStart(Math.floor(value / 60) ? 2 : 1, "0")}`;
}

function fromDigits(kind: LengthKind, digits: string) {
  if (!digits) return Number.NaN;
  if (kind === "words") return Number(digits);
  return Number(digits.slice(0, -2) || 0) * 60 + Number(digits.slice(-2));
}

function KeypadBody({ kind, seed, applied, onApply, focusTarget }: BodyProps<number> & { kind: LengthKind; focusTarget: RefObject<HTMLDivElement | null> }) {
  const [digits, setDigits] = useState(() => toDigits(kind, seedLength(kind, seed, applied)));
  const value = fromDigits(kind, digits);
  const check = checkLength(kind, value, digits);
  const valid = check.severity !== "error";
  const overflowSeconds = kind === "time" && Number(digits.slice(-2)) > 59 && digits.length >= 2;
  const hintId = useId();

  // The sheet takes focus so typed digits land on the pad without opening a phone keyboard.
  useEffect(() => { focusTarget.current?.focus(); }, [focusTarget]);

  const press = (key: string) => setDigits((current) => {
    if (key === "back") return current.slice(0, -1);
    if (key === "clear") return "";
    const next = `${current}${key}`.replace(/^0+(?=\d)/, "");
    return next.length > MAX_DIGITS[kind] ? current : next;
  });
  const submit = () => { if (valid) onApply(value); };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (/^\d$/.test(event.key)) press(event.key);
    else if (event.key === "Backspace") press("back");
    else if (event.key === "Delete") press("clear");
    else if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) submit();
    else return;
    event.preventDefault();
  };

  return (
    <div onKeyDown={onKeyDown} className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pt-2 pb-5 *:shrink-0">
      <div className="flex flex-col items-center gap-1" aria-describedby={hintId}>
        <Readout kind={kind} digits={digits} error={!valid} />
        <span className="text-xs text-muted-foreground">{overflowSeconds && valid ? `Reads as ${formatLength(kind, value)}` : kind === "time" ? "Type digits: 1, 3, 0 is 1:30" : "words"}</span>
      </div>
      <div id={hintId}><CheckLine check={check} className="justify-center text-center" /></div>
      <ScrollRow role="group" aria-label="Quick picks" className="gap-1.5">
        {QUICK_PICKS[kind].map((pick) => (
          <button key={pick} type="button" aria-pressed={pick === value} onClick={() => setDigits(toDigits(kind, pick))}
            className="h-9 shrink-0 whitespace-nowrap rounded-full border border-border px-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:text-primary">
            {formatLength(kind, pick)}{kind === "words" ? " words" : ""}
          </button>
        ))}
      </ScrollRow>
      <div role="group" aria-label="Number pad" className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((key) => (
          <motion.button key={key} type="button" whileTap={{ scale: 0.92 }} onClick={() => press(key)} aria-label={key === "back" ? "Delete last digit" : key === "clear" ? "Clear" : undefined}
            className={cn("flex h-12 items-center justify-center rounded-2xl text-xl font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-ring", /\d/.test(key) ? "bg-muted/70 hover:bg-accent" : "text-sm text-muted-foreground hover:bg-muted/60")}>
            {key === "back" ? <BackspaceIcon className="size-5" aria-hidden="true" /> : key === "clear" ? "Clear" : key}
          </motion.button>
        ))}
      </div>
      <PrimaryButton disabled={!valid} onClick={submit} className="h-12 w-full rounded-2xl text-base">
        <CheckIcon className="size-5" aria-hidden="true" />
        Set {valid ? `${formatLength(kind, value)}${kind === "words" ? " words" : ""}` : "length"}
      </PrimaryButton>
    </div>
  );
}

/** The typed digits lit up; the slots still to fill stay faint. */
function Readout({ kind, digits, error }: { kind: LengthKind; digits: string; error: boolean }) {
  const slots = kind === "time" ? digits.padStart(4, "0") : digits || "0";
  const lit = kind === "time" ? 4 - digits.length : digits ? 0 : 1;
  return (
    <span role="status" aria-label={digits ? `${LENGTH_TITLES[kind]}: ${kind === "time" ? `${slots.slice(0, 2)} minutes ${slots.slice(2)} seconds` : digits}` : "Nothing typed yet"}
      className="flex items-baseline text-5xl font-bold tabular-nums">
      {[...slots].map((char, index) => (
        <span key={index} className="flex items-baseline">
          {kind === "time" && index === 2 && <span className="px-0.5 text-muted-foreground/50">:</span>}
          <motion.span key={`${index}-${char}-${digits.length}`} initial={index >= lit ? { y: 8, opacity: 0.4 } : false} animate={{ y: 0, opacity: 1 }} transition={SETTINGS_SPRING}
            className={index < lit ? "text-muted-foreground/30" : error ? "text-destructive" : "text-primary"}>
            {char}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function TextBody({ seed, applied, onApply }: BodyProps<string>) {
  const draft = useTextDraft(seed, applied);
  const hintId = useId();
  const submit = () => { if (draft.valid) onApply(draft.check.clean); };

  return (
    <>
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-2 pb-3 *:shrink-0">
        <SampleChips onPick={(sample) => draft.setText(sample.text)} />
        <TextBox autoFocus rows={7} aria-label="Your own text" aria-describedby={hintId} value={draft.text} invalid={draft.check.severity === "error" && draft.text.length > 0}
          onChange={(event) => draft.setText(event.target.value)} onKeyDown={(event) => draft.onKeyDown(event, submit)} />
        <CharNotice compact check={draft.check} onFix={() => draft.setText(fixCharacters(draft.text))} />
        <div id={hintId}><CheckLine check={draft.check} action={<TrimButton check={draft.check} onTrim={() => draft.setText(trimToLimit(draft.text))} />} /></div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-border px-5 pt-3 pb-5">
        <TextStats inline check={draft.check} />
        <PrimaryButton disabled={!draft.valid} onClick={submit} className="h-12 w-full rounded-2xl text-base">
          <PlayIcon className="size-5" aria-hidden="true" />
          Practice this
        </PrimaryButton>
      </div>
    </>
  );
}
