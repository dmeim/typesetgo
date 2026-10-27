import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, PlayIcon } from "@phosphor-icons/react";
import { SETTINGS_SPRING } from "@/components/typing/practice-settings-meta";
import { CharNotice, CheckLine, PrimaryButton, QuickPicks, QuietButton, SampleChips, StagePrompt, TextBox, TextStats, TrimButton } from "./dialog-parts";
import { PillRow, PillShell } from "./MockPill";
import {
  LENGTH_TITLES, UNIT_HINTS, fixCharacters, formatLength, trimToLimit,
  type Applied, type ConceptProps, type LengthKind, type SeedId,
} from "./practice-dialogs-mock";
import { surfaceKeys, useLengthDraft, useSurface, useTextDraft } from "./use-surface";

/** 01: the pill itself grows downward; no dialog, no overlay. */
export function UnfoldConcept({ surface, kind, applied, apply, initialSeed }: ConceptProps) {
  const panel = useSurface(initialSeed);
  const regionId = useId();
  const title = surface === "text" ? "Your own text" : LENGTH_TITLES[kind];

  return (
    <div className="flex h-full flex-col items-center gap-8 overflow-y-auto px-3 pt-6 pb-6 @min-[40rem]:px-6">
      <PillShell className={panel.isOpen ? "shadow-xl" : undefined}>
        <PillRow surface={surface} kind={kind} applied={applied} apply={apply} pillStyle="plain" open={panel.isOpen}
          onOpen={() => (panel.isOpen ? panel.close() : panel.open())} triggerRef={panel.triggerRef} controls={regionId} />
        <AnimatePresence initial={false}>
          {panel.isOpen && (
            <motion.section key="unfold" id={regionId} aria-label={title} onKeyDown={(event) => surfaceKeys(event, () => panel.close())}
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SETTINGS_SPRING}
              className="overflow-hidden">
              <div className="mt-3 border-t border-border pt-4">
                {surface === "length"
                  ? <LengthFields kind={kind} seed={panel.seed} applied={applied} onCancel={() => panel.close()} onApply={(value) => { apply({ [kind]: value }); panel.close(); }} />
                  : <TextFields seed={panel.seed} applied={applied} onCancel={() => panel.close()} onApply={(text) => { apply({ text }); panel.close(); }} />}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </PillShell>
      <motion.div layout transition={SETTINGS_SPRING} className="w-full">
        <StagePrompt text={surface === "text" ? applied.text : undefined} />
      </motion.div>
    </div>
  );
}

type FieldProps<T> = { seed: SeedId; applied: Applied; onApply: (value: T) => void; onCancel: () => void };

function LengthFields({ kind, seed, applied, onApply, onCancel }: FieldProps<number> & { kind: LengthKind }) {
  const draft = useLengthDraft(kind, seed, applied);
  const inputId = useId();
  const hintId = useId();
  const submit = () => { if (draft.valid) onApply(draft.value); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-xs uppercase tracking-wider text-muted-foreground">{LENGTH_TITLES[kind]}</label>
          <div className="flex items-baseline gap-2">
            <input id={inputId} autoFocus value={draft.raw} inputMode={kind === "time" ? "text" : "numeric"} placeholder={kind === "time" ? "1:30" : "75"}
              aria-invalid={draft.check.severity === "error" || undefined} aria-describedby={hintId}
              onChange={(event) => draft.setRaw(event.target.value)} onKeyDown={(event) => draft.onKeyDown(event, submit)}
              className="w-32 border-b-2 border-border bg-transparent pb-1 text-4xl font-bold tabular-nums text-primary outline-none placeholder:text-muted-foreground/40 focus:border-primary aria-invalid:border-destructive aria-invalid:text-destructive" />
            <span className="text-sm text-muted-foreground">{UNIT_HINTS[kind]}</span>
          </div>
        </div>
        <QuickPicks kind={kind} value={draft.value} onPick={draft.setValue} className="pb-1" />
      </div>
      <div id={hintId}><CheckLine check={draft.check} /></div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="hidden text-xs text-muted-foreground @min-[34rem]:inline">Up and down arrows nudge it. Enter sets it.</span>
        <div className="ml-auto flex gap-2">
          <QuietButton onClick={onCancel}>Cancel</QuietButton>
          <PrimaryButton disabled={!draft.valid} onClick={submit}>
            <CheckIcon className="size-4" aria-hidden="true" />
            Use {draft.valid ? formatLength(kind, draft.value) : "it"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function TextFields({ seed, applied, onApply, onCancel }: FieldProps<string>) {
  const draft = useTextDraft(seed, applied);
  const hintId = useId();
  const submit = () => { if (draft.valid) onApply(draft.check.clean); };

  return (
    <div className="flex flex-col gap-3">
      <TextBox autoFocus rows={5} aria-label="Your own text" aria-describedby={hintId} value={draft.text} invalid={draft.check.severity === "error" && draft.text.length > 0}
        onChange={(event) => draft.setText(event.target.value)} onKeyDown={(event) => draft.onKeyDown(event, submit)} />
      <SampleChips onPick={(sample) => draft.setText(sample.text)} />
      <CharNotice compact check={draft.check} onFix={() => draft.setText(fixCharacters(draft.text))} />
      <div id={hintId}><CheckLine check={draft.check} action={<TrimButton check={draft.check} onTrim={() => draft.setText(trimToLimit(draft.text))} />} /></div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TextStats inline check={draft.check} />
        <div className="ml-auto flex gap-2">
          <QuietButton onClick={onCancel}>Cancel</QuietButton>
          <PrimaryButton disabled={!draft.valid} onClick={submit}>
            <PlayIcon className="size-4" aria-hidden="true" />
            Practice this
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
