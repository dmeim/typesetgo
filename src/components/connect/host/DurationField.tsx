import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "./Segmented";
import { formatDuration, parseDuration } from "./host-utils";

const DURATION_PRESETS = [15, 30, 60, 120, 300];
const WORD_PRESETS = [10, 25, 50, 100];

function presetLabel(seconds: number) {
  return seconds < 60 ? `${seconds}s` : `${seconds / 60}m`;
}

/** Duration presets plus a forgiving custom field ("90", "1:30", "2m 15s"). */
export function DurationField({ value, onChange }: { value: number; onChange: (seconds: number) => void }) {
  const id = useId();
  const [custom, setCustom] = useState(() => !DURATION_PRESETS.includes(value));
  const [text, setText] = useState(() => (Number.isFinite(value) ? formatDuration(value) : ""));
  return (
    <div className="space-y-2">
      <Segmented
        label="Duration"
        value={custom ? "custom" : String(value)}
        onChange={(next) => {
          if (next === "custom") { setCustom(true); setText(Number.isFinite(value) ? formatDuration(value) : ""); return; }
          setCustom(false);
          onChange(Number(next));
        }}
        options={[...DURATION_PRESETS.map((seconds) => ({ value: String(seconds), label: presetLabel(seconds) })), { value: "custom", label: "Custom" }]}
      />
      {custom && (
        <div className="space-y-1">
          <Label htmlFor={`${id}-custom`}>Custom duration (minutes:seconds)</Label>
          <Input
            id={`${id}-custom`}
            inputMode="numeric"
            placeholder="1:30"
            value={text}
            className="w-32"
            onChange={(event) => {
              setText(event.target.value);
              onChange(parseDuration(event.target.value) ?? Number.NaN);
            }}
          />
        </div>
      )}
    </div>
  );
}

export function WordCountField({ value, onChange }: { value: number; onChange: (words: number) => void }) {
  const id = useId();
  const [custom, setCustom] = useState(() => !WORD_PRESETS.includes(value));
  return (
    <div className="space-y-2">
      <Segmented
        label="Word count"
        value={custom ? "custom" : String(value)}
        onChange={(next) => {
          if (next === "custom") { setCustom(true); return; }
          setCustom(false);
          onChange(Number(next));
        }}
        options={[...WORD_PRESETS.map((words) => ({ value: String(words), label: String(words) })), { value: "custom", label: "Custom" }]}
      />
      {custom && (
        <div className="space-y-1">
          <Label htmlFor={`${id}-custom`}>Custom word count</Label>
          <Input
            id={`${id}-custom`}
            type="number"
            min={1}
            inputMode="numeric"
            value={Number.isFinite(value) ? value : ""}
            className="w-32"
            onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
          />
        </div>
      )}
    </div>
  );
}
