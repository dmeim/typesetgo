import { useId, useState, type ChangeEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import type { ConnectTestMode } from "@/lib/connect-types";
import { MAX_PRESET_TEXT_LENGTH } from "@/lib/practice-limits";
import { cn } from "@/lib/utils";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { formatDuration, parseDuration } from "./host-utils";
import { DURATIONS, MODE_ICONS } from "./test-presets";

const WORDS = [10, 25, 50, 100];
// Generous byte cap for multi-byte text; the character limit is checked after reading.
const MAX_FILE_BYTES = MAX_PRESET_TEXT_LENGTH * 4;

const secondsLabel = (seconds: number) => (seconds < 60 ? `${seconds}s` : `${seconds / 60}m`);

export const field = "h-11 rounded-2xl border border-input bg-background px-4 text-sm outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span aria-hidden="true" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint}
    </div>
  );
}

/** Pill choices that wrap onto more lines when space runs out. */
export function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
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
export function DurationChips({ label, value, presets, onChange }: { label: string; value: number; presets: number[]; onChange: (seconds: number) => void }) {
  const id = useId();
  const [custom, setCustom] = useState(() => !presets.includes(value));
  const [text, setText] = useState(() => (Number.isFinite(value) ? formatDuration(value) : ""));
  return (
    <Field label={label}>
      <Chips label={label} value={custom ? "custom" : String(value)}
        options={[...presets.map((seconds) => ({ value: String(seconds), label: secondsLabel(seconds) })), { value: "custom", label: "Custom" }]}
        onChange={(next) => {
          if (next === "custom") { setCustom(true); setText(Number.isFinite(value) ? formatDuration(value) : ""); return; }
          setCustom(false);
          onChange(Number(next));
        }} />
      {custom && (
        <label htmlFor={id} className="flex items-center gap-3 text-sm text-muted-foreground">
          <input id={id} autoFocus inputMode="numeric" placeholder="1:30" value={text} aria-label={`Custom ${label.toLowerCase()} (minutes:seconds)`} className={cn(field, "w-28 font-mono")}
            onChange={(event) => { setText(event.target.value); onChange(parseDuration(event.target.value) ?? Number.NaN); }} />
          minutes:seconds
        </label>
      )}
    </Field>
  );
}

export function WordChips({ value, onChange }: { value: number; onChange: (words: number) => void }) {
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

export function ToggleChip({ label, pressed, onChange }: { label: string; pressed: boolean; onChange: (pressed: boolean) => void }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={() => onChange(!pressed)}
      className={cn("flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
        pressed ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-border text-muted-foreground hover:text-foreground")}>
      <AnimatePresence initial={false} mode="popLayout">
        {pressed && <motion.span initial={{ scale: 0, width: 0 }} animate={{ scale: 1, width: "auto" }} exit={{ scale: 0, width: 0 }} transition={CONNECT_SPRING}><CheckIcon className="size-3.5" aria-hidden="true" /></motion.span>}
      </AnimatePresence>
      {label}
    </button>
  );
}

const MODES: { value: ConnectTestMode; label: string }[] = [
  { value: "time", label: "Time" },
  { value: "words", label: "Words" },
  { value: "quote", label: "Quote" },
  { value: "preset", label: "Custom text" },
  { value: "break", label: "Break" },
];

export function ModeTiles({ value, onChange }: { value: ConnectTestMode; onChange: (mode: ConnectTestMode) => void }) {
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
            {selected && <motion.span layoutId={`mode-${id}`} transition={CONNECT_SPRING} className="absolute inset-0 rounded-2xl bg-primary shadow-sm" />}
            <ModeIcon weight={selected ? "fill" : "bold"} className="relative size-5" aria-hidden="true" />
            <span className="relative whitespace-nowrap">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}

type PresetModeType = "time" | "finish";

export function CustomText({ text, modeType, duration, onChange }: {
  text: string;
  modeType: PresetModeType;
  duration: number;
  onChange: (changes: { presetText?: string; presetModeType?: PresetModeType; duration?: number }) => void;
}) {
  const id = useId();
  const [fileError, setFileError] = useState("");
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setFileError(`Use a text file with at most ${MAX_PRESET_TEXT_LENGTH.toLocaleString()} characters.`); return; }
    try {
      const content = await file.text();
      if (content.length > MAX_PRESET_TEXT_LENGTH) { setFileError(`Use at most ${MAX_PRESET_TEXT_LENGTH.toLocaleString()} characters.`); return; }
      setFileError("");
      onChange({ presetText: content });
    } catch {
      setFileError("This file couldn't be read. Try another .txt file.");
    }
  };
  return (
    <>
      <Field label="Text to type" hint={(
        <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{text.length.toLocaleString()} / {MAX_PRESET_TEXT_LENGTH.toLocaleString()} characters</span>
          {fileError && <span role="alert" className="text-destructive">{fileError}</span>}
        </span>
      )}>
        <div className="relative">
          <textarea id={id} aria-label="Text to type" rows={4} maxLength={MAX_PRESET_TEXT_LENGTH} value={text} placeholder="Paste a poem, a paragraph from today's reading, spelling words…"
            onChange={(event) => onChange({ presetText: event.target.value })}
            className="w-full resize-y rounded-2xl border border-input bg-background p-4 pb-12 text-sm outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20" />
          <label className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-accent focus-within:outline-2 focus-within:outline-ring">
            <UploadSimpleIcon className="size-4" aria-hidden="true" />Upload .txt
            <input type="file" accept=".txt,text/plain" className="sr-only" onChange={(event) => void upload(event)} />
          </label>
        </div>
      </Field>
      <Field label="Ends when">
        <Chips<PresetModeType> label="Custom text ends" value={modeType} onChange={(presetModeType) => onChange({ presetModeType })}
          options={[{ value: "finish", label: "They type it all" }, { value: "time", label: "Time runs out" }]} />
      </Field>
      {modeType === "time" && <DurationChips label="Time limit" value={duration} presets={DURATIONS} onChange={(next) => onChange({ duration: next })} />}
    </>
  );
}
