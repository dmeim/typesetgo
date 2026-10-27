import { useEffect, useId, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleNotchIcon, CopySimpleIcon, FloppyDiskIcon, PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import {
  DEFAULT_CONNECT_BREAK, DEFAULT_CONNECT_TEST, describeConnectTest, validateConnectTest,
  type ConnectDifficulty, type ConnectQuoteLength, type ConnectTest, type ConnectTestMode,
} from "@/lib/connect-types";
import { fetchQuotesManifest } from "@/lib/quotes";
import { fetchWordsManifest } from "@/lib/words";
import { cn } from "@/lib/utils";
import { Chips, CustomText, Field, ModeTiles, ToggleChip, WordChips, DurationChips, field } from "./editor-fields";
import { BREAKS, DURATIONS } from "./test-presets";

type Draft = Omit<ConnectTest, "id" | "title"> & { title: string };

const DIFFICULTIES: ConnectDifficulty[] = ["beginner", "easy", "medium", "hard", "expert"];
const QUOTE_LENGTHS: ConnectQuoteLength[] = ["short", "medium", "long", "xl"];
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function toDraft(test: ConnectTest | null): Draft {
  const source = test ?? { ...DEFAULT_CONNECT_TEST, id: "" };
  return {
    mode: source.mode, duration: source.duration, wordTarget: source.wordTarget, difficulty: source.difficulty,
    punctuation: source.punctuation, numbers: source.numbers, capitalization: source.capitalization,
    quoteLength: source.quoteLength, presetText: source.presetText ?? "", presetModeType: source.presetModeType ?? "finish",
    title: source.title ?? "",
  };
}

/** Builds the stored test, keeping optional fields only where the mode uses them. */
function fromDraft(draft: Draft, id: string): ConnectTest {
  const test: ConnectTest = {
    id, mode: draft.mode, duration: draft.duration, wordTarget: draft.wordTarget, difficulty: draft.difficulty,
    punctuation: draft.punctuation, numbers: draft.numbers, capitalization: draft.capitalization, quoteLength: draft.quoteLength,
  };
  if (draft.mode === "preset") {
    test.presetText = draft.presetText;
    test.presetModeType = draft.presetModeType;
  }
  const title = draft.title.trim();
  if (title) test.title = title;
  return test;
}

function validationError(test: ConnectTest) {
  try {
    validateConnectTest(test);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Check this test's settings";
  }
}

/** Difficulties and quote lengths the word and quote lists actually have. */
function useManifestOptions() {
  const [difficulties, setDifficulties] = useState<ConnectDifficulty[]>(DIFFICULTIES);
  const [lengths, setLengths] = useState<ConnectQuoteLength[]>(QUOTE_LENGTHS);
  useEffect(() => {
    let current = true;
    void fetchWordsManifest().then((manifest) => {
      const known = manifest.difficulties.filter((value): value is ConnectDifficulty => DIFFICULTIES.includes(value as ConnectDifficulty));
      if (current && known.length) setDifficulties(known);
    }).catch(() => undefined);
    void fetchQuotesManifest().then((manifest) => {
      const known = manifest.lengths.filter((value): value is ConnectQuoteLength => QUOTE_LENGTHS.includes(value as ConnectQuoteLength));
      if (current && known.length) setLengths(known);
    }).catch(() => undefined);
    return () => { current = false; };
  }, []);
  return { difficulties, lengths };
}

const roundButton = "flex size-10 items-center justify-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30";

/** Adds or edits one test or break. */
export function TestEditor({ editing, autoTitle, canRemove, full, onSave, onCancel, onDuplicate, onRemove }: {
  /** The test being edited, or null when adding. */
  editing: ConnectTest | null;
  /** What participants see when the title is left empty. */
  autoTitle: (test: ConnectTest) => string;
  canRemove: boolean;
  full: boolean;
  onSave: (test: ConnectTest) => Promise<boolean>;
  onCancel: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(() => toDraft(editing));
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const { difficulties, lengths } = useManifestOptions();
  const update = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));
  const test = fromDraft(draft, editing?.id ?? "draft");
  const error = validationError(test);
  // Empty custom text only complains after a save attempt; other problems show straight away.
  const shownError = error && (tried || draft.mode !== "preset" || Boolean(draft.presetText?.trim())) ? error : null;
  const wordOptions = draft.mode === "time" || draft.mode === "words";
  const noun = draft.mode === "break" ? "break" : "test";
  const blocked = full && !editing;

  const setMode = (mode: ConnectTestMode) => {
    if (mode === draft.mode) return;
    if (mode === "break") update({ mode, duration: DEFAULT_CONNECT_BREAK.duration });
    else update({ mode, duration: draft.mode === "break" ? DEFAULT_CONNECT_TEST.duration : draft.duration });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (error) { setTried(true); return; }
    if (blocked || saving) return;
    setSaving(true);
    const ok = await onSave(fromDraft(draft, editing?.id ?? crypto.randomUUID()));
    if (!ok) setSaving(false);
  };
  const summary = [
    describeConnectTest(test),
    ...(wordOptions ? [capitalize(draft.difficulty), ...(draft.punctuation ? ["punctuation"] : []), ...(draft.numbers ? ["numbers"] : []), ...(draft.capitalization ? ["capitals"] : [])] : []),
  ].join(" · ");

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-labelledby={`${id}-heading`} className="@container flex flex-col gap-5 rounded-3xl border-2 border-primary/40 bg-background p-3.5 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`${id}-heading`} className="text-lg font-bold">{editing ? `Edit ${noun}` : "Add a test or break"}</h3>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={summary} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="text-sm text-muted-foreground">
              {Number.isFinite(test.duration) && Number.isFinite(test.wordTarget) ? summary : "Finish the settings below"}
            </motion.p>
          </AnimatePresence>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close the editor" className={cn(roundButton, "size-9 hover:bg-accent hover:text-foreground")}>
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      </header>

      <ModeTiles value={draft.mode} onChange={setMode} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={draft.mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="flex flex-col gap-5">
          {draft.mode === "time" && <DurationChips label="Duration" value={draft.duration} presets={DURATIONS} onChange={(duration) => update({ duration })} />}
          {draft.mode === "break" && <DurationChips label="Break length" value={draft.duration} presets={BREAKS} onChange={(duration) => update({ duration })} />}
          {draft.mode === "break" && <p className="-mt-2 text-sm text-muted-foreground">Everyone sees a countdown, then the next test starts on its own. Breaks freeze while the room is paused.</p>}
          {draft.mode === "words" && <WordChips value={draft.wordTarget} onChange={(wordTarget) => update({ wordTarget })} />}
          {wordOptions && (
            <>
              <Field label="Difficulty">
                <Chips<ConnectDifficulty> label="Difficulty" value={draft.difficulty} onChange={(difficulty) => update({ difficulty })}
                  options={difficulties.map((value) => ({ value, label: capitalize(value) }))} />
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
              <Chips<ConnectQuoteLength> label="Quote length" value={draft.quoteLength} onChange={(quoteLength) => update({ quoteLength })}
                options={[{ value: "all", label: "Any length" }, ...lengths.map((value) => ({ value, label: value === "xl" ? "Extra long" : capitalize(value) }))]} />
            </Field>
          )}
          {draft.mode === "preset" && (
            <CustomText text={draft.presetText ?? ""} modeType={draft.presetModeType ?? "finish"} duration={draft.duration} onChange={update} />
          )}
        </motion.div>
      </AnimatePresence>

      <Field label="Title (optional)">
        <input id={`${id}-title`} aria-label="Title (optional)" value={draft.title} maxLength={60} placeholder={autoTitle(test)}
          onChange={(event) => update({ title: event.target.value })} className={cn(field, "w-full")} />
      </Field>

      <AnimatePresence initial={false}>
        {shownError && (
          <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden text-sm font-medium text-destructive">
            {shownError}
          </motion.p>
        )}
      </AnimatePresence>
      {blocked && <p className="text-sm text-muted-foreground">The list is full. Remove a test to add another.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <motion.button type="submit" whileTap={{ scale: 0.96 }} disabled={blocked || saving}
          className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40">
          {saving ? <CircleNotchIcon className="size-4 animate-spin" aria-hidden="true" />
            : editing ? <FloppyDiskIcon weight="fill" className="size-4" aria-hidden="true" /> : <PlusIcon className="size-4" aria-hidden="true" />}
          {editing ? "Save changes" : "Add to list"}
        </motion.button>
        <button type="button" onClick={onCancel} className="h-11 rounded-full px-4 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">Cancel</button>
        {editing && (
          <span className="ml-auto flex gap-1">
            {onDuplicate && (
              <button type="button" onClick={onDuplicate} disabled={full} aria-label={`Duplicate this ${noun}`} title="Duplicate" className={cn(roundButton, "hover:bg-accent hover:text-foreground")}>
                <CopySimpleIcon className="size-4" aria-hidden="true" />
              </button>
            )}
            {onRemove && (
              <button type="button" onClick={onRemove} disabled={!canRemove} aria-label={`Remove this ${noun}`} title="Remove" className={cn(roundButton, "hover:bg-destructive/10 hover:text-destructive")}>
                <TrashIcon className="size-4" aria-hidden="true" />
              </button>
            )}
          </span>
        )}
      </div>
    </form>
  );
}
