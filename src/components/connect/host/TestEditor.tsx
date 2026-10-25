import { useEffect, useId, useState, type FormEvent } from "react";
import { FloppyDiskIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  CONNECT_MAX_TESTS,
  DEFAULT_CONNECT_TEST,
  validateConnectTest,
  type ConnectDifficulty,
  type ConnectQuoteLength,
  type ConnectTest,
  type ConnectTestMode,
} from "@/lib/connect-types";
import { fetchWordsManifest } from "@/lib/words";
import { fetchQuotesManifest } from "@/lib/quotes";
import { DurationField, WordCountField } from "./DurationField";
import { CustomTextField } from "./CustomTextField";
import { Segmented } from "./Segmented";

type Draft = Omit<ConnectTest, "id" | "title"> & { title: string };

const MODES: { value: ConnectTestMode; label: string }[] = [
  { value: "time", label: "Time" },
  { value: "words", label: "Words" },
  { value: "quote", label: "Quote" },
  { value: "preset", label: "Custom text" },
];
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

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

export function TestEditor({ editing, testCount, onSubmit, onCancel }: {
  /** The test being edited, or null when adding. */
  editing: ConnectTest | null;
  testCount: number;
  onSubmit: (test: ConnectTest) => Promise<boolean>;
  onCancel: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(() => toDraft(editing));
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const { difficulties, lengths } = useManifestOptions();
  const update = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));
  const error = validationError(fromDraft(draft, editing?.id ?? "draft"));
  // Empty custom text only complains after a save attempt; other problems show as soon as they appear.
  const visibleError = error && (showErrors || draft.mode !== "preset" || Boolean(draft.presetText?.trim())) ? error : null;
  const full = !editing && testCount >= CONNECT_MAX_TESTS;
  const usesWordOptions = draft.mode === "time" || draft.mode === "words";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (error) { setShowErrors(true); return; }
    setSaving(true);
    const ok = await onSubmit(fromDraft(draft, editing?.id ?? crypto.randomUUID()));
    setSaving(false);
    if (ok && !editing) { setDraft(toDraft(null)); setShowErrors(false); }
  };

  return (
    <section aria-labelledby={`${id}-heading`} className="min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-5">
      <form aria-labelledby={`${id}-heading`} className="space-y-4" onSubmit={(event) => void submit(event)} noValidate>
        <h2 id={`${id}-heading`} className="text-lg font-semibold">{editing ? "Edit test" : "Add a test"}</h2>
        <Segmented<ConnectTestMode> label="Test mode" value={draft.mode} options={MODES} onChange={(mode) => update({ mode })} />
        {draft.mode === "time" && <DurationField value={draft.duration} onChange={(duration) => update({ duration })} />}
        {draft.mode === "words" && <WordCountField value={draft.wordTarget} onChange={(wordTarget) => update({ wordTarget })} />}
        {usesWordOptions && (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_1fr] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor={`${id}-difficulty`}>Difficulty</Label>
              <NativeSelect id={`${id}-difficulty`} value={draft.difficulty} onChange={(event) => update({ difficulty: event.target.value as ConnectDifficulty })}>
                {difficulties.map((value) => <NativeSelectOption key={value} value={value}>{capitalize(value)}</NativeSelectOption>)}
              </NativeSelect>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-3 pb-2">
              <ToggleRow label="Punctuation" checked={draft.punctuation} onChange={(punctuation) => update({ punctuation })} />
              <ToggleRow label="Numbers" checked={draft.numbers} onChange={(numbers) => update({ numbers })} />
              <ToggleRow label="Capitals" checked={draft.capitalization} onChange={(capitalization) => update({ capitalization })} />
            </div>
          </div>
        )}
        {draft.mode === "quote" && (
          <div className="space-y-2">
            <Label htmlFor={`${id}-quote`}>Quote length</Label>
            <NativeSelect id={`${id}-quote`} value={draft.quoteLength} onChange={(event) => update({ quoteLength: event.target.value as ConnectQuoteLength })}>
              <NativeSelectOption value="all">Any length</NativeSelectOption>
              {lengths.map((value) => <NativeSelectOption key={value} value={value}>{value === "xl" ? "Extra long" : capitalize(value)}</NativeSelectOption>)}
            </NativeSelect>
          </div>
        )}
        {draft.mode === "preset" && (
          <CustomTextField
            text={draft.presetText ?? ""}
            modeType={draft.presetModeType ?? "finish"}
            duration={draft.duration}
            onChange={update}
          />
        )}
        <div className="space-y-2">
          <Label htmlFor={`${id}-title`}>Title <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id={`${id}-title`} value={draft.title} maxLength={60} placeholder="Shown to participants" onChange={(event) => update({ title: event.target.value })} />
        </div>
        {visibleError && <p role="alert" className="text-sm text-destructive">{visibleError}</p>}
        {full && <p className="text-sm text-muted-foreground">The list is full ({CONNECT_MAX_TESTS} tests). Remove one to add another.</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving || full}>
            {editing ? <FloppyDiskIcon aria-hidden="true" /> : <PlusIcon aria-hidden="true" />}
            {editing ? "Save changes" : "Add to list"}
          </Button>
          {editing && (
            <Button type="button" variant="outline" onClick={onCancel}>
              <XIcon aria-hidden="true" />
              Cancel
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
