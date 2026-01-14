import { useState } from "react";
import type { SettingsState, Theme } from "@/lib/typing-constants";
import type { SoundManifest } from "@/lib/sounds";
import SoundSettingsModal from "@/components/settings/SoundSettingsModal";

interface SoundControllerProps {
  settings: SettingsState | Partial<SettingsState>;
  onUpdateSettings: (updates: Partial<SettingsState>) => void;
  soundManifest: SoundManifest;
  theme: Theme;
}

export default function SoundController({
  settings,
  onUpdateSettings,
  soundManifest,
  theme,
}: SoundControllerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Cast settings to SettingsState to access properties safely, assuming defaults if missing
  const safeSettings = settings as SettingsState;
  const soundEnabled = safeSettings.soundEnabled ?? false;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
        style={{
          color: soundEnabled ? theme.buttonSelected : theme.buttonUnselected,
        }}
        title="sound settings"
      >
        {soundEnabled ? (
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
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        ) : (
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
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </button>

      <SoundSettingsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        settings={safeSettings}
        onUpdateSettings={onUpdateSettings}
        soundManifest={soundManifest}
      />
    </>
  );
}
