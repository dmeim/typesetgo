import { useState } from "react";
import { GhostIcon } from "@phosphor-icons/react";
import type { SettingsState } from "@/lib/typing-constants";
import { tv } from "@/lib/theme-vars";
import GhostWriterSettingsModal from "@/components/settings/GhostWriterSettingsModal";

interface GhostWriterControllerProps {
  settings: SettingsState | Partial<SettingsState>;
  onUpdateSettings: (updates: Partial<SettingsState>) => void;
}

export default function GhostWriterController({
  settings,
  onUpdateSettings,
}: GhostWriterControllerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Cast settings to SettingsState to access properties safely, assuming defaults if missing
  const safeSettings = settings as SettingsState;
  const ghostWriterEnabled = safeSettings.ghostWriterEnabled ?? false;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
        style={{
          color: ghostWriterEnabled
            ? tv.ui.secondaryEmphasis
            : tv.ui.primary,
        }}
        aria-label="Ghost writer settings"
        aria-haspopup="dialog"
        title="ghost writer settings"
      >
        <GhostIcon size="1em" aria-hidden="true" />
      </button>

      <GhostWriterSettingsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        settings={safeSettings}
        onUpdateSettings={onUpdateSettings}
      />
    </>
  );
}
