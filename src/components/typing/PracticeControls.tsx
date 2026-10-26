import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { SettingsState } from "@/lib/typing-constants";
import type { WordsManifest } from "@/lib/words";
import type { QuotesManifest } from "@/lib/quotes";
import { tv } from "@/lib/theme-vars";
import type { ModeSelectorOption } from "./practice-config";
import { PracticeSettingsPill } from "./PracticeSettingsPill";

export interface PracticeConfigurationProps {
  settings: SettingsState;
  updateSettings: (updates: Partial<SettingsState>) => void;
  generateTest: () => void;
  isKidMode: boolean;
  handleModeSelect: (mode: ModeSelectorOption) => void;
  wordsManifest: WordsManifest | null;
  quotesManifest: QuotesManifest | null;
  openCustomCountModal: () => void;
  openPresetInput?: () => void;
  isCustomDurationSelected: boolean;
  isCustomWordTargetSelected: boolean;
}

interface PracticeControlsProps extends PracticeConfigurationProps {
  connectMode: boolean;
  isRunning: boolean;
  isFinished: boolean;
  isCompactMode: boolean;
  uiOpacity: number;
  setShowQuickSettings: (show: boolean) => void;
}

export default function PracticeControls({
  connectMode,
  isRunning,
  isFinished,
  isCompactMode,
  uiOpacity,
  setShowQuickSettings,
  ...configuration
}: PracticeControlsProps) {
  const { settings } = configuration;
  return (
    <>
      {/* Settings Controls */}
      {!connectMode && !isRunning && !isFinished && (
        <div
          className="shrink-0 w-full flex flex-col items-center justify-center gap-3 transition-opacity duration-300 pb-2"
          style={{
            fontSize: `${settings.iconFontSize}rem`,
            opacity: uiOpacity,
          }}
        >
          {/* Compact Mode: Quick Settings */}
          {isCompactMode && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowQuickSettings(true)}
              className="rounded-lg px-4 py-2 text-sm transition hover:text-foreground"
              style={{
                backgroundColor: tv.ui.card,
                color: tv.ui.primary,
              }}
              title="Quick Settings"
            >
              <SlidersHorizontalIcon className="size-4 shrink-0" aria-hidden="true" />
              Quick Settings
            </Button>
          )}

          {!isCompactMode && <PracticeSettingsPill {...configuration} />}
        </div>
      )}
    </>
  );
}
