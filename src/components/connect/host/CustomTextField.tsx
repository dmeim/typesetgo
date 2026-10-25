import { useId, useState, type ChangeEvent } from "react";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_PRESET_TEXT_LENGTH } from "@/lib/practice-limits";
import { DurationField } from "./DurationField";
import { Segmented } from "./Segmented";

// Generous byte cap for multi-byte text; the character limit is checked after reading.
const MAX_FILE_BYTES = MAX_PRESET_TEXT_LENGTH * 4;

type PresetModeType = "time" | "finish";

export function CustomTextField({ text, modeType, duration, onChange }: {
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
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor={`${id}-text`}>Text to type</Label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground focus-within:ring-[3px] focus-within:ring-ring/50">
            <UploadSimpleIcon className="size-4" aria-hidden="true" />
            Upload .txt
            <input type="file" accept=".txt,text/plain" className="sr-only" onChange={(event) => void upload(event)} />
          </label>
        </div>
        <Textarea
          id={`${id}-text`}
          rows={5}
          maxLength={MAX_PRESET_TEXT_LENGTH}
          value={text}
          onChange={(event) => onChange({ presetText: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">{text.length.toLocaleString()} / {MAX_PRESET_TEXT_LENGTH.toLocaleString()} characters</p>
        {fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}
      </div>
      <Segmented<PresetModeType>
        label="Custom text ends"
        value={modeType}
        onChange={(presetModeType) => onChange({ presetModeType })}
        options={[{ value: "finish", label: "Type it all" }, { value: "time", label: "Time limit" }]}
      />
      {modeType === "time" && <DurationField value={duration} onChange={(next) => onChange({ duration: next })} />}
    </div>
  );
}
