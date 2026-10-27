import { useId, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CopySimpleIcon, FloppyDiskIcon, PlusIcon, TrashIcon, UploadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { formatDuration, parseDuration } from "@/components/connect/host/host-utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import {
  DEFAULT_CONNECT_BREAK, DEFAULT_CONNECT_TEST, describeConnectTest, validateConnectTest,
  type ConnectDifficulty, type ConnectQuoteLength, type ConnectTest, type ConnectTestMode,
} from "@/lib/connect-types";
import { MAX_PRESET_TEXT_LENGTH } from "@/lib/practice-limits";
import { cn } from "@/lib/utils";
import { MODE_ICONS } from "./connect-mock";

type Draft = Omit<ConnectTest, "title"> & { title: string };

const MODES: { value: ConnectTestMode; label: string }[] = [
  { value: "time", label: "Time" },
  { value: "words", label: "Words" },
  { value: "quote", label: "Quote" },
  { value: "preset", label: "Custom text" },
  { value: "break", label: "Break" },
];
const DIFFICULTIES: ConnectDifficulty[] = ["beginner", "easy", "medium", "hard", "expert"];
const QUOTE_LENGTHS: { value: ConnectQuoteLength; label: string }[] = [
  { value: "all", label: "Any length" }, { value: "short", label: "Short" }, { value: "medium", label: "Medium" }, { value: "long", label: "Long" }, { value: "xl", label: "Extra long" },
];
const DURATIONS = [15, 30, 60, 120, 300];
const BREAKS = [10, 30, 60, 120, 300];
const WORDS = [10, 25, 50, 100];
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const secondsLabel = (seconds: number) => (seconds < 60 ? `${seconds}s` : `${seconds / 60}m`);

const field = "h-11 rounded-2xl border border-input bg-background px-4 text-sm outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20";

function toDraft(test: ConnectTest | null): Draft {
  const source = test ?? { ...DEFAULT_CONNECT_TEST, id: crypto.randomUUID() };
  return { ...source, presetText: source.presetText ?? "", presetModeType: source.presetModeType ?? "finish", title: source.title ?? "" };
}

/** The stored test, keeping optional fields only where the mode uses them. */
function fromDraft(draft: Draft): ConnectTest {
  const { title, presetText, presetModeType, ...rest } = draft;
  const test: ConnectTest = rest;
  if (draft.mode === "preset") Object.assign(test, { presetText, presetModeType });
  if (title.trim()) test.title = title.trim();
  return test;
}

function problem(test: ConnectTest) {
  try {
    validateConnectTest(test);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Check this test's settings";
  }
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint}
    </div>
  );
}

/** Pill choices that wrap onto more lines when space runs out. */
function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => onChange(option.value)}
            className={cn("h-9 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              selected ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground")}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Presets plus a forgiving custom field: "90", "1:30" or "2m 15s". */
function DurationChips({ label, value, presets, onChange }: { label: string; value: number; presets: number[]; onChange: (seconds: number) => void }) {
  const id = useId();
  const [custom, setCustom] = useState(() => !presets.includes(value));
  const [text, setText] = useState(() => (Number.isFinite(value) ? formatDuration(value) : ""));
  return (
    <Field label={label}>
      <Chips label={label} value={custom ? "custom" : String(value)}
        options={[...presets.map((seconds) => ({ value: String(seconds), label: secondsLabel(seconds) })), { value: "custom", label: "Custom" }]}
        onChange={(next) => {
          if (next === "custom") { setCustom(true); setText(formatDuration(value)); return; }
          setCustom(false);
          onChange(Number(next));
        }} />
      {custom && (
        <label htmlFor={id} className="flex items-center gap-3 text-sm text-muted-foreground">
          <input id={id} autoFocus inputMode="numeric" placeholder="1:30" value={text} className={cn(field, "w-28 font-mono")}
            onChange={(event) => { setText(event.target.value); onChange(parseDuration(event.target.value) ?? Number.NaN); }} />
          minutes:seconds
        </label>
      )}
    </Field>
  );
}

function WordChips({ value, onChange }: { value: number; onChange: (words: number) => void }) {
  const [custom, setCustom] = useState(() => !WORDS.includes(value));
  return (
    <Field label="Word count">
      <Chips label="Word count" value={custom ? "custom" : String(value)}
        options={[...WORDS.map((words) => ({ value: String(words), label: String(words) })), { value: "custom", label: "Custom" }]}
        onChange={(next) => {
          if (next === "custom") { setCustom(true); return; }
          setCustom(false);
          onChange(Number(next));
        }} />
      {custom && (
        <input type="number" min={1} autoFocus aria-label="Custom word count" inputMode="numeric" value={Number.isFinite(value) ? value : ""} className={cn(field, "w-28 font-mono")}
          onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))} />
      )}
    </Field>
  );
}

function ToggleChip({ label, pressed, onChange }: { label: string; pressed: boolean; onChange: (pressed: boolean) => void }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={() => onChange(!pressed)}
      className={cn("flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
        pressed ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-border text-muted-foreground hover:text-foreground")}>
      <AnimatePresence initial={false} mode="popLayout">
        {pressed && <motion.span initial={{ scale: 0, width: 0 }} animate={{ scale: 1, width: "auto" }} exit={{ scale: 0, width: 0 }} transition={LAB_SPRING}><CheckIcon className="size-3.5" aria-hidden="true" /></motion.span>}
      </AnimatePresence>
      {label}
    </button>
  );
}

function ModeTiles({ value, onChange }: { value: ConnectTestMode; onChange: (mode: ConnectTestMode) => void }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label="Test type" className="grid grid-cols-3 gap-1.5 @min-[30rem]:grid-cols-5">
      {MODES.map((mode) => {
        const selected = mode.value === value;
        const ModeIcon = MODE_ICONS[mode.value];
        return (
          <button key={mode.value} type="button" role="radio" aria-checked={selected} onClick={() => onChange(mode.value)}
            className={cn("relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              selected ? "text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground")}>
            {selected && <motion.span layoutId={`mode-${id}`} transition={LAB_SPRING} className="absolute inset-0 rounded-2xl bg-primary shadow-sm" />}
            <ModeIcon weight={selected ? "fill" : "bold"} className="relative size-5" aria-hidden="true" />
            <span className="relative whitespace-nowrap">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CustomText({ draft, update }: { draft: Draft; update: (changes: Partial<Draft>) => void }) {
  const id = useId();
  const [fileError, setFileError] = useState("");
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const content = await file.text();
      if (content.length > MAX_PRESET_TEXT_LENGTH) { setFileError(`Use a file with at most ${MAX_PRESET_TEXT_LENGTH.toLocaleString()} characters.`); return; }
      setFileError("");
      update({ presetText: content });
    } catch {
      setFileError("This file couldn't be read. Try another .txt file.");
    }
  };
  return (
    <>
      <Field label="Text to type" hint={(
        <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{draft.presetText?.length.toLocaleString()} / {MAX_PRESET_TEXT_LENGTH.toLocaleString()} characters</span>
          {fileError && <span role="alert" className="text-destructive">{fileError}</span>}
        </span>
      )}>
        <div className="relative">
          <textarea id={id} aria-label="Text to type" rows={4} maxLength={MAX_PRESET_TEXT_LENGTH} value={draft.presetText} placeholder="Paste a poem, a paragraph from today's reading, spelling words…"
            onChange={(event) => update({ presetText: event.target.value })}
            className="w-full resize-y rounded-2xl border border-input bg-background p-4 pb-12 text-sm outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20" />
          <label className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-accent focus-within:outline-2 focus-within:outline-ring">
            <UploadSimpleIcon className="size-4" aria-hidden="true" />Upload .txt
            <input type="file" accept=".txt,text/plain" className="sr-only" onChange={(event) => void upload(event)} />
          </label>
        </div>
      </Field>
      <Field label="Ends when">
        <Chips<"finish" | "time"> label="Custom text ends" value={draft.presetModeType ?? "finish"} onChange={(presetModeType) => update({ presetModeType })}
          options={[{ value: "finish", label: "They type it all" }, { value: "time", label: "Time runs out" }]} />
      </Field>
      {draft.presetModeType === "time" && <DurationChips label="Time limit" value={draft.duration} presets={DURATIONS} onChange={(duration) => update({ duration })} />}
    </>
  );
}

/** Adds or edits one test or break, with every option the real host panel offers. */
export function TestEditor({ editing, autoTitle, canRemove, full, onSave, onCancel, onDuplicate, onRemove }: {
  /** The test being edited, or null when adding. */
  editing: ConnectTest | null;
  /** What participants see when the title is left empty. */
  autoTitle: (test: ConnectTest) => string;
  canRemove: boolean;
  full: boolean;
  onSave: (test: ConnectTest) => void;
  onCancel: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(() => toDraft(editing));
  const [tried, setTried] = useState(false);
  const update = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));
  const test = fromDraft(draft);
  const error = problem(test);
  // Empty custom text only complains after a save attempt; other problems show straight away.
  const shownError = error && (tried || draft.mode !== "preset" || Boolean(draft.presetText?.trim())) ? error : null;
  const wordOptions = draft.mode === "time" || draft.mode === "words";
  const noun = draft.mode === "break" ? "break" : "test";

  const setMode = (mode: ConnectTestMode) => {
    if (mode === draft.mode) return;
    if (mode === "break") update({ mode, duration: DEFAULT_CONNECT_BREAK.duration });
    else update({ mode, duration: draft.mode === "break" ? DEFAULT_CONNECT_TEST.duration : draft.duration });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (error) { setTried(true); return; }
    onSave(test);
  };
  const summary = [
    describeConnectTest(test),
    ...(wordOptions ? [capitalize(draft.difficulty), ...(draft.punctuation ? ["punctuation"] : []), ...(draft.numbers ? ["numbers"] : []), ...(draft.capitalization ? ["capitals"] : [])] : []),
  ].join(" · ");

  return (
    <form onSubmit={submit} noValidate aria-labelledby={`${id}-heading`} className="@container flex flex-col gap-5 rounded-3xl border-2 border-primary/40 bg-background p-3.5 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`${id}-heading`} className="text-lg font-bold">{editing ? `Edit ${noun}` : "Add a test or break"}</h3>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={summary} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="text-sm text-muted-foreground">
              {Number.isFinite(test.duration) && Number.isFinite(test.wordTarget) ? summary : "Finish the settings below"}
            </motion.p>
          </AnimatePresence>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close the editor" className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      </header>

      <ModeTiles value={draft.mode} onChange={setMode} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={draft.mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="flex flex-col gap-5">
          {draft.mode === "time" && <DurationChips label="Duration" value={draft.duration} presets={DURATIONS} onChange={(duration) => update({ duration })} />}
          {draft.mode === "break" && (
            <DurationChips label="Break length" value={draft.duration} presets={BREAKS} onChange={(duration) => update({ duration })} />
          )}
          {draft.mode === "break" && <p className="-mt-2 text-sm text-muted-foreground">Everyone sees a countdown, then the next test starts on its own. Breaks freeze while the room is paused.</p>}
          {draft.mode === "words" && <WordChips value={draft.wordTarget} onChange={(wordTarget) => update({ wordTarget })} />}
          {wordOptions && (
            <>
              <Field label="Difficulty">
                <Chips<ConnectDifficulty> label="Difficulty" value={draft.difficulty} onChange={(difficulty) => update({ difficulty })}
                  options={DIFFICULTIES.map((value) => ({ value, label: capitalize(value) }))} />
              </Field>
              <Field label="Mix in">
                <div className="flex flex-wrap gap-1.5">
                  <ToggleChip label="Punctuation" pressed={draft.punctuation} onChange={(punctuation) => update({ punctuation })} />
                  <ToggleChip label="Numbers" pressed={draft.numbers} onChange={(numbers) => update({ numbers })} />
                  <ToggleChip label="Capitals" pressed={draft.capitalization} onChange={(capitalization) => update({ capitalization })} />
                </div>
              </Field>
            </>
          )}
          {draft.mode === "quote" && (
            <Field label="Quote length">
              <Chips<ConnectQuoteLength> label="Quote length" value={draft.quoteLength} onChange={(quoteLength) => update({ quoteLength })} options={QUOTE_LENGTHS} />
            </Field>
          )}
          {draft.mode === "preset" && <CustomText draft={draft} update={update} />}
        </motion.div>
      </AnimatePresence>

      <Field label="Title (optional)">
        <input id={`${id}-title`} aria-label="Title" value={draft.title} maxLength={60} placeholder={autoTitle(test)} onChange={(event) => update({ title: event.target.value })} className={cn(field, "w-full")} />
      </Field>

      <AnimatePresence initial={false}>
        {shownError && (
          <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden text-sm font-medium text-destructive">
            {shownError}
          </motion.p>
        )}
      </AnimatePresence>
      {full && !editing && <p className="text-sm text-muted-foreground">The list is full. Remove a test to add another.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <motion.button type="submit" whileTap={{ scale: 0.96 }} disabled={full && !editing}
          className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40">
          {editing ? <FloppyDiskIcon weight="fill" className="size-4" aria-hidden="true" /> : <PlusIcon className="size-4" aria-hidden="true" />}
          {editing ? "Save changes" : "Add to list"}
        </motion.button>
        <button type="button" onClick={onCancel} className="h-11 rounded-full px-4 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">Cancel</button>
        {editing && (
          <span className="ml-auto flex gap-1">
            {onDuplicate && (
              <button type="button" onClick={onDuplicate} disabled={full} aria-label="Duplicate" title="Duplicate"
                className="flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30">
                <CopySimpleIcon className="size-4" aria-hidden="true" />
              </button>
            )}
            {onRemove && (
              <button type="button" onClick={onRemove} disabled={!canRemove} aria-label={`Remove this ${noun}`} title="Remove"
                className="flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30">
                <TrashIcon className="size-4" aria-hidden="true" />
              </button>
            )}
          </span>
        )}
      </div>
    </form>
  );
}
