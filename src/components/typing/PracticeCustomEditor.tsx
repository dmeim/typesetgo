import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckIcon, PlayIcon } from "@phosphor-icons/react";
import { SETTINGS_SPRING } from "./practice-settings-meta";
import {
  LENGTH_TITLES, UNIT_HINTS, checkLength, checkText, fixCharacters, formatInput, formatLength, parseLength, stepLength, trimToLimit,
  type Check, type EstimateSpeed, type LengthKind, type PracticeEditor,
} from "./practice-custom";
import { CharNotice, CheckLine, PrimaryButton, QuickPicks, QuietButton, SampleChips, TextBox, TextStats, TrimButton } from "./PracticeCustomParts";

interface PracticeCustomEditorProps {
  /** The unfolded editor, or null while folded away. */
  editor: PracticeEditor | null;
  regionId: string;
  /** Time or Words for the length editor. */
  kind: LengthKind | null;
  /** The applied length; arrow keys start from it while the field is blank. */
  currentLength: number;
  presetText: string;
  speed: EstimateSpeed;
  onApplyLength: (value: number) => void;
  onApplyText: (text: string) => void;
  /** Cancel or Escape: fold away and return focus to the chip that opened it. */
  onCancel: () => void;
}

/** The custom length or own-text editor that unfolds inside the open settings pill, pushing the test down. */
export function PracticeCustomEditor({ editor, regionId, kind, currentLength, presetText, speed, onApplyLength, onApplyText, onCancel }: PracticeCustomEditorProps) {
  const reduceMotion = useReducedMotion();
  const shown = editor === "text" || (editor === "length" && kind !== null);
  const title = editor === "text" ? "Your own text" : kind ? LENGTH_TITLES[kind] : "";
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    // The pill would otherwise close as a whole; Escape folds just this editor.
    event.stopPropagation();
    onCancel();
  };

  return (
    <AnimatePresence initial={false}>
      {shown && (
        <motion.section key={editor} id={regionId} aria-label={title} onKeyDown={onKeyDown}
          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : SETTINGS_SPRING} className="overflow-hidden">
          <div className="border-t border-border pt-4">
            {editor === "length" && kind
              ? <LengthFields kind={kind} currentLength={currentLength} speed={speed} onApply={onApplyLength} onCancel={onCancel} />
              : <TextFields initialText={presetText} speed={speed} onApply={onApplyText} onCancel={onCancel} />}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** A blank field is not a mistake yet: show what to do instead of an error. */
function asHint(check: Check): Check {
  return { severity: "note", title: "", detail: check.detail };
}

interface LengthFieldsProps {
  kind: LengthKind;
  currentLength: number;
  speed: EstimateSpeed;
  onApply: (value: number) => void;
  onCancel: () => void;
}

function LengthFields({ kind, currentLength, speed, onApply, onCancel }: LengthFieldsProps) {
  const [raw, setRaw] = useState("");
  const inputId = useId();
  const hintId = useId();
  const value = parseLength(kind, raw);
  const check = checkLength(kind, value, raw, speed);
  const valid = check.severity !== "error";
  const blank = raw.trim() === "";
  const submit = () => { if (valid) onApply(value); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      setRaw(formatInput(kind, stepLength(kind, value, event.key === "ArrowUp" ? 1 : -1, currentLength)));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={inputId} className="text-xs uppercase tracking-wider text-muted-foreground">{LENGTH_TITLES[kind]}</label>
          <div className="flex items-baseline gap-2">
            <input id={inputId} autoFocus value={raw} inputMode={kind === "time" ? "text" : "numeric"} autoComplete="off"
              placeholder={formatInput(kind, currentLength)} aria-invalid={(!valid && !blank) || undefined} aria-describedby={hintId}
              onChange={(event) => setRaw(event.target.value)} onKeyDown={onKeyDown}
              className="w-32 min-w-0 border-b-2 border-border bg-transparent pb-1 text-4xl font-bold tabular-nums text-primary outline-none placeholder:text-muted-foreground/40 focus:border-primary aria-invalid:border-destructive aria-invalid:text-destructive" />
            <span className="text-sm text-muted-foreground">{UNIT_HINTS[kind]}</span>
          </div>
        </div>
        <QuickPicks kind={kind} value={value} onPick={(pick) => setRaw(formatInput(kind, pick))} />
      </div>
      <CheckLine id={hintId} check={blank ? asHint(check) : check} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">Up and down arrows nudge it. Enter sets it.</span>
        <div className="ml-auto flex gap-2">
          <QuietButton onClick={onCancel}>Cancel</QuietButton>
          <PrimaryButton disabled={!valid} onClick={submit}>
            <CheckIcon className="size-4" aria-hidden="true" />
            Use {valid ? `${formatLength(kind, value)}${kind === "words" ? " words" : ""}` : "it"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

interface TextFieldsProps {
  initialText: string;
  speed: EstimateSpeed;
  onApply: (text: string) => void;
  onCancel: () => void;
}

function TextFields({ initialText, speed, onApply, onCancel }: TextFieldsProps) {
  const [text, setText] = useState(initialText);
  const hintId = useId();
  const check = useMemo(() => checkText(text, speed), [text, speed]);
  const valid = check.severity !== "error";
  const blank = text.trim() === "";
  const submit = () => { if (valid) onApply(check.clean); };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <TextBox autoFocus rows={5} aria-label="Practice text" aria-describedby={hintId} value={text}
        invalid={!valid && !blank}
        onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} />
      <SampleChips onPick={(sample) => setText(sample.text)} />
      <CharNotice check={check} onFix={() => setText(fixCharacters(text))} />
      <CheckLine id={hintId} check={blank ? asHint(check) : check} action={<TrimButton check={check} onTrim={() => setText(trimToLimit(text))} />} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TextStats check={check} />
        <div className="ml-auto flex gap-2">
          <QuietButton onClick={onCancel}>Cancel</QuietButton>
          <PrimaryButton disabled={!valid} onClick={submit}>
            <PlayIcon className="size-4" aria-hidden="true" />
            Practice this
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
