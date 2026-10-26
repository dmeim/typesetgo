import { useState } from "react";
import { PracticeSettingsPill } from "@/components/typing/PracticeSettingsPill";
import { TIME_PRESETS, WORD_PRESETS, type ModeSelectorOption } from "@/components/typing/practice-config";
import { DEFAULT_SETTINGS } from "@/lib/storage-utils";
import type { SettingsState } from "@/lib/typing-constants";

const WORDS_MANIFEST = { difficulties: ["beginner", "easy", "medium", "hard", "expert"], default: "beginner" };
const QUOTES_MANIFEST = { lengths: ["short", "medium", "long", "xl"], default: "medium" };

/** The shipping Home settings pill, driven by local state so /temp never touches saved preferences. */
export function SettingsPillDemo() {
  const [settings, setSettings] = useState<SettingsState>({ ...DEFAULT_SETTINGS, mode: "time", presetText: "" });
  const [isKidMode, setIsKidMode] = useState(false);
  const updateSettings = (updates: Partial<SettingsState>) => setSettings((current) => ({ ...current, ...updates }));
  const handleModeSelect = (mode: ModeSelectorOption) => {
    if (mode === "kid") return setIsKidMode((value) => !value);
    setIsKidMode(false);
    updateSettings({ mode });
  };

  return (
    <div className="w-full">
      <PracticeSettingsPill
        settings={settings}
        updateSettings={updateSettings}
        generateTest={() => {}}
        isKidMode={isKidMode}
        handleModeSelect={handleModeSelect}
        wordsManifest={WORDS_MANIFEST}
        quotesManifest={QUOTES_MANIFEST}
        openCustomCountModal={() => updateSettings(settings.mode === "time" ? { duration: 45 } : { wordTarget: 75 })}
        openPresetInput={() => {}}
        isCustomDurationSelected={!TIME_PRESETS.includes(settings.duration)}
        isCustomWordTargetSelected={!WORD_PRESETS.includes(settings.wordTarget)}
      />
    </div>
  );
}
