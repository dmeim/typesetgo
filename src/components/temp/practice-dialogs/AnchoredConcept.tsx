import { useId, useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MinusIcon, PlayIcon, PlusIcon } from "@phosphor-icons/react";
import { SETTINGS_SPRING } from "@/components/typing/practice-settings-meta";
import { CharNotice, CheckLine, CloseButton, PrimaryButton, QuickPicks, SampleChips, StagePrompt, TextBox, TextStats, TrimButton } from "./dialog-parts";
import { PillRow, PillShell } from "./MockPill";
import {
  LENGTH_TITLES, LIMITS, UNIT_HINTS, fixCharacters, formatLength, trimToLimit,
  type Applied, type ConceptProps, type LengthKind, type SeedId,
} from "./practice-dialogs-mock";
import { surfaceKeys, useLengthDraft, useOutsidePointer, useSurface, useTextDraft } from "./use-surface";

/** 02: a small card hanging from the custom chip, pointing at it. */
export function AnchoredConcept({ surface, kind, applied, apply, initialSeed }: ConceptProps) {
  const pop = useSurface(initialSeed);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const titleId = useId();
  const { triggerRef, isOpen, close } = pop;
  useOutsidePointer(cardRef, triggerRef, isOpen, close);

  // Places the card under the chip and keeps it inside the stage, without a re-render.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!isOpen || !root) return;
    const place = () => {
      const trigger = triggerRef.current;
      const card = cardRef.current;
      const caret = caretRef.current;
      if (!trigger || !card || !caret) return;
      const bounds = root.getBoundingClientRect();
      const chip = trigger.getBoundingClientRect();
      const center = chip.left + chip.width / 2 - bounds.left;
      const left = Math.min(Math.max(center - card.offsetWidth / 2, 12), bounds.width - card.offsetWidth - 12);
      const top = chip.bottom - bounds.top + 12;
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
      card.style.maxHeight = `${bounds.height - top - 12}px`;
      caret.style.left = `${Math.min(Math.max(center - left - 8, 16), card.offsetWidth - 32)}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    return () => observer.disconnect();
  }, [isOpen, triggerRef]);

  return (
    <div ref={rootRef} className="relative flex h-full flex-col items-center gap-8 px-3 pt-6 @min-[40rem]:px-6">
      <PillShell>
        <PillRow surface={surface} kind={kind} applied={applied} apply={apply} pillStyle="badge" open={isOpen}
          onOpen={() => (isOpen ? close() : pop.open())} triggerRef={triggerRef} />
      </PillShell>
      <StagePrompt text={surface === "text" ? applied.text : undefined} />
      <AnimatePresence>
        {isOpen && (
          <motion.div ref={cardRef} key="anchored" role="dialog" aria-labelledby={titleId} onKeyDown={(event) => surfaceKeys(event, () => close())}
            initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={SETTINGS_SPRING}
            className="absolute z-30 flex w-[min(22rem,calc(100%-1.5rem))] origin-top flex-col rounded-3xl border border-border bg-card shadow-2xl">
            <span ref={caretRef} aria-hidden="true" className="absolute -top-2 size-4 rotate-45 rounded-tl-sm border-t border-l border-border bg-card" />
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4 *:shrink-0">
              <div className="flex items-center justify-between gap-2">
                <h4 id={titleId} className="text-xs uppercase tracking-wider text-muted-foreground">{surface === "text" ? "Your own text" : LENGTH_TITLES[kind]}</h4>
                <CloseButton onClick={() => close()} />
              </div>
              {surface === "length"
                ? <LengthBody kind={kind} seed={pop.seed} applied={applied} onApply={(value) => { apply({ [kind]: value }); close(); }} />
                : <TextBody seed={pop.seed} applied={applied} onApply={(text) => { apply({ text }); close(); }} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type BodyProps<T> = { seed: SeedId; applied: Applied; onApply: (value: T) => void };

function LengthBody({ kind, seed, applied, onApply }: BodyProps<number> & { kind: LengthKind }) {
  const draft = useLengthDraft(kind, seed, applied);
  const hintId = useId();
  const submit = () => { if (draft.valid) onApply(draft.value); };
  const atMin = Number.isFinite(draft.value) && draft.value <= LIMITS[kind].min;
  const atMax = Number.isFinite(draft.value) && draft.value >= LIMITS[kind].max;

  return (
    <>
      <div className="flex items-center gap-2">
        <StepButton label="Shorter" disabled={atMin} onClick={() => draft.step(-1)} Icon={MinusIcon} />
        <input autoFocus value={draft.raw} inputMode={kind === "time" ? "text" : "numeric"} placeholder={kind === "time" ? "1:30" : "75"}
          aria-label={LENGTH_TITLES[kind]} aria-describedby={hintId} aria-invalid={draft.check.severity === "error" || undefined}
          onChange={(event) => draft.setRaw(event.target.value)} onKeyDown={(event) => draft.onKeyDown(event, submit)}
          className="min-w-0 flex-1 rounded-2xl bg-transparent py-1 text-center text-5xl font-bold tabular-nums text-primary outline-none placeholder:text-muted-foreground/30 focus-visible:bg-muted/40 aria-invalid:text-destructive" />
        <StepButton label="Longer" disabled={atMax} onClick={() => draft.step(1)} Icon={PlusIcon} />
      </div>
      <p className="-mt-2 text-center text-xs text-muted-foreground">{UNIT_HINTS[kind]}</p>
      <QuickPicks kind={kind} value={draft.value} onPick={draft.setValue} className="justify-center" />
      <div id={hintId}><CheckLine check={draft.check} className="justify-center text-center" /></div>
      <PrimaryButton disabled={!draft.valid} onClick={submit} className="w-full">
        Set {draft.valid ? `${formatLength(kind, draft.value)}${kind === "words" ? " words" : ""}` : "length"}
      </PrimaryButton>
    </>
  );
}

function StepButton({ label, disabled, onClick, Icon }: { label: string; disabled: boolean; onClick: () => void; Icon: typeof PlusIcon }) {
  return (
    <motion.button type="button" aria-label={label} disabled={disabled} onClick={onClick} whileTap={{ scale: 0.88 }}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-35">
      <Icon className="size-5" aria-hidden="true" />
    </motion.button>
  );
}

function TextBody({ seed, applied, onApply }: BodyProps<string>) {
  const draft = useTextDraft(seed, applied);
  const hintId = useId();
  const submit = () => { if (draft.valid) onApply(draft.check.clean); };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <TextBox autoFocus rows={5} aria-label="Your own text" aria-describedby={hintId} value={draft.text} invalid={draft.check.severity === "error" && draft.text.length > 0}
          onChange={(event) => draft.setText(event.target.value)} onKeyDown={(event) => draft.onKeyDown(event, submit)} className="p-3" />
        <TextStats inline check={draft.check} />
      </div>
      <SampleChips onPick={(sample) => draft.setText(sample.text)} />
      <CharNotice compact check={draft.check} onFix={() => draft.setText(fixCharacters(draft.text))} />
      <div id={hintId}><CheckLine check={draft.check} action={<TrimButton check={draft.check} onTrim={() => draft.setText(trimToLimit(draft.text))} />} /></div>
      <PrimaryButton disabled={!draft.valid} onClick={submit} className="w-full">
        <PlayIcon className="size-4" aria-hidden="true" />
        Practice this
      </PrimaryButton>
    </>
  );
}
