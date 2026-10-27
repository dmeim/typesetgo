import type { SettingsState } from "@/lib/typing-constants";
import type { WordsManifest } from "@/lib/words";
import type { QuotesManifest } from "@/lib/quotes";
import type { ModeSelectorOption } from "./practice-config";
import type { EstimateSpeed, PracticeEditor } from "./practice-custom";
import { PracticeSettingsPill } from "./PracticeSettingsPill";

export interface PracticeConfigurationProps {
  settings: SettingsState;
  updateSettings: (updates: Partial<SettingsState>) => void;
  generateTest: () => void;
  isKidMode: boolean;
  handleModeSelect: (mode: ModeSelectorOption) => void;
  wordsManifest: WordsManifest | null;
  quotesManifest: QuotesManifest | null;
  isCustomDurationSelected: boolean;
  isCustomWordTargetSelected: boolean;
}

/** The chip that unfolds a custom length or own-text editor inside the pill. Its element ref travels separately. */
export interface PracticeEditorTrigger {
  regionId: string;
  open: PracticeEditor | null;
  toggle: (editor: PracticeEditor) => void;
}

/** The pill plus the unfolding editors, whose open state Home owns so an empty Preset can open its text box. */
export interface PracticeSettingsPillProps extends PracticeConfigurationProps {
  editor: PracticeEditor | null;
  setEditor: (editor: PracticeEditor | null) => void;
  applyCustomLength: (value: number) => void;
  applyPresetText: (text: string) => void;
  estimateSpeed: EstimateSpeed;
}

interface PracticeControlsProps extends PracticeSettingsPillProps {
  connectMode: boolean;
  isRunning: boolean;
  isFinished: boolean;
  uiOpacity: number;
}

/** Test settings before a test starts: one pill on every screen size. Hidden while typing and on results. */
export default function PracticeControls({ connectMode, isRunning, isFinished, uiOpacity, ...pill }: PracticeControlsProps) {
  if (connectMode || isRunning || isFinished) return null;
  return (
    <div
      className="w-full shrink-0 pb-2 transition-opacity duration-300"
      style={{ fontSize: `${pill.settings.iconFontSize}rem`, opacity: uiOpacity }}
    >
      <PracticeSettingsPill {...pill} />
    </div>
  );
}
