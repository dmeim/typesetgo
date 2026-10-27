import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BooksIcon, CheckIcon, EraserIcon, MagicWandIcon, PencilSimpleIcon, PlayIcon, TextAlignLeftIcon, TimerIcon } from "@phosphor-icons/react";
import { Segmented } from "@/components/profile/settings-controls";
import { SETTINGS_SPRING } from "@/components/typing/practice-settings-meta";
import { cn } from "@/lib/utils";
import { CharNotice, CheckLine, CloseButton, PrimaryButton, QuietButton, SampleCards, Scrim, StagePrompt, TextBox, TextStats, TrimButton } from "./dialog-parts";
import { PillRow, PillShell } from "./MockPill";
import {
  LENGTH_TITLES, LIMITS, MAX_TEXT, QUICK_PICKS, checkLength, estimate, fixCharacters, formatLength, seedLength, trimToLimit,
  type Applied, type ConceptProps, type LengthKind, type SeedId,
} from "./practice-dialogs-mock";
import { surfaceKeys, useSurface, useTextDraft } from "./use-surface";

const COPY = {
  time: { title: LENGTH_TITLES.time, description: "Set minutes and seconds, up to 60:00.", Icon: TimerIcon },
  words: { title: LENGTH_TITLES.words, description: `Any number from 1 to ${LIMITS.words.max.toLocaleString()}.`, Icon: TextAlignLeftIcon },
  text: { title: "Your own text", description: `Type or paste anything you want to practise, up to ${MAX_TEXT.toLocaleString()} characters.`, Icon: PencilSimpleIcon },
};

/** 04: a roomy dialog in the middle of the stage. */
export function CardConcept({ surface, kind, applied, apply, initialSeed }: ConceptProps) {
  const dialog = useSurface(initialSeed);
  const titleId = useId();
  const descriptionId = useId();
  const copy = COPY[surface === "text" ? "text" : kind];

  return (
    <div className="relative flex h-full flex-col items-center gap-8 px-3 pt-6 @min-[40rem]:px-6">
      <PillShell>
        <PillRow surface={surface} kind={kind} applied={applied} apply={apply} pillStyle="badge" open={dialog.isOpen}
          onOpen={() => dialog.open()} triggerRef={dialog.triggerRef} />
      </PillShell>
      <StagePrompt text={surface === "text" ? applied.text : undefined} />
      <AnimatePresence>{dialog.isOpen && <Scrim key="scrim" onClick={() => dialog.close(false)} />}</AnimatePresence>
      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-3">
        <AnimatePresence>
          {dialog.isOpen && (
            <motion.div key="card" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
              onKeyDown={(event) => surfaceKeys(event, () => dialog.close(), true)}
              initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={SETTINGS_SPRING}
              className="pointer-events-auto flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
              <header className="flex shrink-0 items-start gap-3 border-b border-border p-4 @min-[30rem]:p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <copy.Icon className="size-5" weight="fill" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 id={titleId} className="text-lg font-semibold">{copy.title}</h4>
                  <p id={descriptionId} className="text-sm text-muted-foreground">{copy.description}</p>
                </div>
                <CloseButton onClick={() => dialog.close()} />
              </header>
              {surface === "length"
                ? <LengthBody kind={kind} seed={dialog.seed} applied={applied} onCancel={() => dialog.close()} onApply={(value) => { apply({ [kind]: value }); dialog.close(); }} />
                : <TextBody seed={dialog.seed} applied={applied} onCancel={() => dialog.close()} onApply={(text) => { apply({ text }); dialog.close(); }} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

type BodyProps<T> = { seed: SeedId; applied: Applied; onApply: (value: T) => void; onCancel: () => void };

/** Minutes and seconds (or words) as separate strings so each box can be typed on its own. */
function splitSeed(kind: LengthKind, value: number): [string, string] {
  if (!Number.isFinite(value)) return ["", ""];
  if (kind === "words") return [String(value), ""];
  return [String(Math.floor(value / 60)), String(value % 60).padStart(2, "0")];
}

function LengthBody({ kind, seed, applied, onApply, onCancel }: BodyProps<number> & { kind: LengthKind }) {
  const [[major, minor], setParts] = useState(() => splitSeed(kind, seedLength(kind, seed, applied)));
  const empty = !major.trim() && !minor.trim();
  const readable = /^\d*$/.test(major) && /^\d*$/.test(minor);
  const value = empty || !readable ? Number.NaN : kind === "time" ? Number(major || 0) * 60 + Number(minor || 0) : Number(major);
  const check = kind === "time" && Number(minor) > 59
    ? { severity: "error" as const, title: "Seconds go up to 59", detail: "Add a minute instead." }
    : checkLength(kind, value, empty ? "" : `${major}${minor}`);
  const valid = check.severity !== "error";
  const submit = () => { if (valid) onApply(value); };
  const pick = (next: number) => setParts(splitSeed(kind, next));
  const nudge = (part: 0 | 1) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") { event.preventDefault(); submit(); return; }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const delta = event.key === "ArrowUp" ? 1 : -1;
    const current = Number([major, minor][part] || 0);
    const next = String(Math.max(0, current + delta));
    setParts(part === 0 ? [next, minor] : [major, next.padStart(2, "0")]);
  };
  const hintId = useId();

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 *:shrink-0 @min-[30rem]:p-5">
        <div className="flex items-start justify-center gap-2">
          <BigBox label={kind === "time" ? "minutes" : "words"} value={major} wide={kind === "words"} invalid={!valid} describedBy={hintId}
            onChange={(next) => setParts([next, minor])} onKeyDown={nudge(0)} autoFocus />
          {kind === "time" && (
            <>
              <span aria-hidden="true" className="pt-4 text-4xl font-bold text-muted-foreground">:</span>
              <BigBox label="seconds" value={minor} invalid={!valid} describedBy={hintId} onChange={(next) => setParts([major, next])} onKeyDown={nudge(1)} />
            </>
          )}
        </div>
        <div id={hintId}><CheckLine check={check} className="justify-center text-center" /></div>
        <div className="flex flex-col gap-1.5">
          <span className="px-1 text-xs uppercase tracking-wider text-muted-foreground">Or pick one</span>
          <div role="radiogroup" aria-label="Suggested lengths" className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {QUICK_PICKS[kind].map((option) => {
              const selected = option === value;
              return (
                <button key={option} type="button" role="radio" aria-checked={selected} onClick={() => pick(option)}
                  className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", selected ? "bg-accent text-primary" : "hover:bg-muted/50")}>
                  <span className="w-20 font-semibold tabular-nums">{formatLength(kind, option)}{kind === "words" ? " words" : ""}</span>
                  <span className="flex-1 text-xs text-muted-foreground">{estimate(kind, option)}</span>
                  {selected && <CheckIcon className="size-4" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <Footer onCancel={onCancel}>
        <PrimaryButton disabled={!valid} onClick={submit}>
          <CheckIcon className="size-4" aria-hidden="true" />
          {kind === "time" ? "Set duration" : "Set word count"}
        </PrimaryButton>
      </Footer>
    </>
  );
}

function BigBox({ label, value, wide = false, invalid, describedBy, onChange, onKeyDown, autoFocus = false }: {
  label: string;
  value: string;
  wide?: boolean;
  invalid: boolean;
  describedBy: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col items-center gap-1.5">
      <input id={id} autoFocus={autoFocus} value={value} inputMode="numeric" maxLength={wide ? 6 : 3} placeholder={wide ? "75" : "00"}
        aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown}
        onFocus={(event) => event.currentTarget.select()}
        className={cn("h-20 rounded-2xl border border-input bg-background text-center text-4xl font-bold tabular-nums text-primary outline-none placeholder:text-muted-foreground/30 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 aria-invalid:border-destructive aria-invalid:text-destructive", wide ? "w-44" : "w-24")} />
      <label htmlFor={id} className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
    </div>
  );
}

function TextBody({ seed, applied, onApply, onCancel }: BodyProps<string>) {
  const draft = useTextDraft(seed, applied);
  const [tab, setTab] = useState<"write" | "samples">(seed === "current" && !applied.text ? "samples" : "write");
  const hintId = useId();
  const submit = () => { if (draft.valid) onApply(draft.check.clean); };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 *:shrink-0 @min-[30rem]:p-5">
        <Segmented label="Where the text comes from" value={tab} onChange={setTab} className="w-full"
          options={[
            { value: "write", label: <><PencilSimpleIcon className="size-4" aria-hidden="true" />Write or paste</> },
            { value: "samples", label: <><BooksIcon className="size-4" aria-hidden="true" />Samples</> },
          ]} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, x: tab === "write" ? -12 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={SETTINGS_SPRING} className="flex flex-col gap-3">
            {tab === "samples" ? (
              <>
                <p className="text-sm text-muted-foreground">Pick one to start from; you can still edit it.</p>
                <SampleCards onPick={(sample) => { draft.setText(sample.text); setTab("write"); }} />
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <ToolButton disabled={draft.check.removedCount === 0} onClick={() => draft.setText(fixCharacters(draft.text))} icon={<MagicWandIcon className="size-4" aria-hidden="true" />}>Clean up</ToolButton>
                  <ToolButton disabled={!draft.text} onClick={() => draft.setText("")} icon={<EraserIcon className="size-4" aria-hidden="true" />}>Clear</ToolButton>
                </div>
                <TextBox autoFocus rows={5} aria-label="Your own text" aria-describedby={hintId} value={draft.text} invalid={draft.check.severity === "error" && draft.text.length > 0}
                  onChange={(event) => draft.setText(event.target.value)} onKeyDown={(event) => draft.onKeyDown(event, submit)} />
                <TextStats check={draft.check} />
                <CharNotice check={draft.check} onFix={() => draft.setText(fixCharacters(draft.text))} />
                <div id={hintId}><CheckLine check={draft.check} action={<TrimButton check={draft.check} onTrim={() => draft.setText(trimToLimit(draft.text))} />} /></div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer onCancel={onCancel} hint="Ctrl or Cmd + Enter starts it">
        <PrimaryButton disabled={!draft.valid} onClick={submit}>
          <PlayIcon className="size-4" aria-hidden="true" />
          Practice this
        </PrimaryButton>
      </Footer>
    </>
  );
}

function ToolButton({ disabled, onClick, icon, children }: { disabled: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40">
      {icon}
      {children}
    </button>
  );
}

function Footer({ onCancel, hint, children }: { onCancel: () => void; hint?: string; children: ReactNode }) {
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3 @min-[30rem]:px-5">
      {hint && <span className="mr-auto hidden text-xs text-muted-foreground @min-[34rem]:inline">{hint}</span>}
      <QuietButton onClick={onCancel}>Cancel</QuietButton>
      {children}
    </footer>
  );
}
