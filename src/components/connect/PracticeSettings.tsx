import { useEffect, useId, useState } from "react";
import type {
  Difficulty,
  Mode,
  QuoteLength,
  SettingsState,
} from "@/lib/typing-constants";
import { fetchWordsManifest } from "@/lib/words";
import { fetchQuotesManifest } from "@/lib/quotes";
import { tv } from "@/lib/theme-vars";
import { isTimedPractice } from "./room-settings";
import { fieldClass, fieldStyle, RoomButton } from "./RoomUI";

export default function PracticeSettings({
  settings,
  onChange,
  disabled = false,
  allowPlan = false,
  onEditPlan,
}: {
  settings: Partial<SettingsState>;
  onChange: (settings: Partial<SettingsState>) => void;
  disabled?: boolean;
  allowPlan?: boolean;
  onEditPlan?: () => void;
}) {
  const id = useId();
  const [difficulties, setDifficulties] = useState<string[]>([
    "beginner",
    "easy",
    "medium",
    "hard",
    "expert",
  ]);
  const [lengths, setLengths] = useState<string[]>([
    "short",
    "medium",
    "long",
    "xl",
  ]);
  const [fileError, setFileError] = useState("");
  useEffect(() => {
    void fetchWordsManifest()
      .then((manifest) => setDifficulties(manifest.difficulties))
      .catch(() => {});
    void fetchQuotesManifest()
      .then((manifest) => setLengths(manifest.lengths))
      .catch(() => {});
  }, []);
  const modes: Mode[] = [
    "time",
    "words",
    "quote",
    "zen",
    "preset",
    ...(allowPlan ? ["plan" as const] : []),
  ];
  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-5 disabled:opacity-60"
    >
      <legend className="sr-only">Practice settings</legend>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Practice mode"
      >
        {modes.map((mode) => (
          <RoomButton
            key={mode}
            selected={settings.mode === mode}
            aria-pressed={settings.mode === mode}
            onClick={() =>
              mode === "plan" ? onEditPlan?.() : onChange({ mode })
            }
            className="capitalize"
          >
            {mode}
          </RoomButton>
        ))}
      </div>
      {settings.mode === "plan" ? (
        <p className="text-sm" style={{ color: tv.ui.mutedForeground }}>
          The host selects and starts each step. Stop the test before changing
          steps.
        </p>
      ) : (
        <>
          {settings.mode === "preset" && (
            <div className="space-y-3">
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Preset completion"
              >
                {(["finish", "time"] as const).map((type) => (
                  <RoomButton
                    key={type}
                    selected={settings.presetModeType === type}
                    aria-pressed={settings.presetModeType === type}
                    onClick={() => onChange({ presetModeType: type })}
                  >
                    {type === "time" ? "Timed" : "Finish text"}
                  </RoomButton>
                ))}
              </div>
              <label className="block text-sm" htmlFor={`${id}-text`}>
                Custom text
              </label>
              <textarea
                id={`${id}-text`}
                rows={5}
                maxLength={10000}
                className={fieldClass}
                style={fieldStyle}
                value={settings.presetText ?? ""}
                onChange={(event) =>
                  onChange({ presetText: event.target.value })
                }
              />
              <label className="block text-sm space-y-2">
                Upload text file (.txt)
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="block w-full min-w-0 text-sm"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 40000) {
                      setFileError(
                        "Use a text file with at most 10,000 characters.",
                      );
                      return;
                    }
                    try {
                      const text = await file.text();
                      if (text.length > 10000) {
                        setFileError("Use at most 10,000 characters.");
                        return;
                      }
                      setFileError("");
                      onChange({ presetText: text });
                    } catch {
                      setFileError(
                        "Unable to read this file. Try another text file.",
                      );
                    }
                  }}
                />
              </label>
              {fileError && (
                <p role="alert" style={{ color: tv.ui.destructive }}>
                  {fileError}
                </p>
              )}
              {settings.presetModeType === "time" && (
                <p className="text-sm" style={{ color: tv.ui.mutedForeground }}>
                  Ends when the timer expires or the supplied text is completed,
                  whichever comes first.
                </p>
              )}
            </div>
          )}
          {(isTimedPractice(settings) || settings.mode === "words") && (
            <div className="space-y-2">
              <label htmlFor={`${id}-amount`} className="block text-sm">
                {isTimedPractice(settings)
                  ? "Duration (seconds)"
                  : "Word count"}
              </label>
              <div className="flex flex-wrap gap-2">
                {(isTimedPractice(settings)
                  ? [15, 30, 60, 120, 300]
                  : [10, 25, 50, 100, 200]
                ).map((amount) => (
                  <RoomButton
                    key={amount}
                    selected={
                      (isTimedPractice(settings)
                        ? settings.duration
                        : settings.wordTarget) === amount
                    }
                    onClick={() =>
                      onChange(
                        isTimedPractice(settings)
                          ? { duration: amount }
                          : { wordTarget: amount },
                      )
                    }
                  >
                    {amount}
                    {isTimedPractice(settings) ? "s" : ""}
                  </RoomButton>
                ))}
                <input
                  id={`${id}-amount`}
                  type="number"
                  min={1}
                  max={isTimedPractice(settings) ? 86400 : 10000}
                  className={`${fieldClass} max-w-32`}
                  style={fieldStyle}
                  value={
                    (isTimedPractice(settings)
                      ? settings.duration
                      : settings.wordTarget) ?? 30
                  }
                  onChange={(event) => {
                    const value = Math.max(
                      1,
                      Math.min(
                        isTimedPractice(settings) ? 86400 : 10000,
                        Number(event.target.value) || 1,
                      ),
                    );
                    onChange(
                      isTimedPractice(settings)
                        ? { duration: value }
                        : { wordTarget: value },
                    );
                  }}
                />
              </div>
            </div>
          )}
          {settings.mode === "quote" && (
            <label className="block text-sm space-y-2">
              Quote length
              <select
                className={fieldClass}
                style={fieldStyle}
                value={settings.quoteLength ?? "all"}
                onChange={(event) =>
                  onChange({ quoteLength: event.target.value as QuoteLength })
                }
              >
                {["all", ...lengths.filter((length) => length !== "all")].map(
                  (length) => (
                    <option key={length} value={length}>
                      {length}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
          {(settings.mode === "time" ||
            settings.mode === "words" ||
            settings.mode === "zen") && (
            <div className="space-y-3">
              <label className="block text-sm space-y-2">
                Difficulty
                <select
                  className={fieldClass}
                  style={fieldStyle}
                  value={settings.difficulty ?? "medium"}
                  onChange={(event) =>
                    onChange({ difficulty: event.target.value as Difficulty })
                  }
                >
                  {difficulties.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                {(["capitalization", "punctuation", "numbers"] as const).map(
                  (key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-sm capitalize"
                    >
                      <input
                        type="checkbox"
                        checked={settings[key] ?? false}
                        onChange={(event) =>
                          onChange({ [key]: event.target.checked })
                        }
                      />
                      {key}
                    </label>
                  ),
                )}
              </div>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
