import { useState } from "react";
import type { SettingsState, Theme } from "@/lib/typing-constants";
import GhostWriterSettingsModal from "@/components/settings/GhostWriterSettingsModal";

interface GhostWriterControllerProps {
  settings: SettingsState | Partial<SettingsState>;
  onUpdateSettings: (updates: Partial<SettingsState>) => void;
  theme: Theme;
}

export default function GhostWriterController({
  settings,
  onUpdateSettings,
  theme,
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
            ? theme.buttonSelected
            : theme.buttonUnselected,
        }}
        title="ghost writer settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 10h.01" />
          <path d="M15 10h.01" />
          <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
        </svg>
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
