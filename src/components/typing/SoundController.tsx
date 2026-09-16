import { useState } from "react";
import type { SettingsState } from "@/lib/typing-constants";
import type { SoundManifest } from "@/lib/sounds";
import { tv } from "@/lib/theme-vars";
import SoundSettingsModal from "@/components/settings/SoundSettingsModal";

interface SoundControllerProps {
  settings: SettingsState | Partial<SettingsState>;
  onUpdateSettings: (updates: Partial<SettingsState>) => void;
  soundManifest: SoundManifest | null;
  disabled?: boolean;
}

export default function SoundController({
  settings,
  onUpdateSettings,
  soundManifest,
  disabled = false,
}: SoundControllerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const soundEnabled = settings.soundEnabled ?? false;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        aria-label="Sound settings"
        aria-haspopup="dialog"
        className="flex min-h-10 min-w-10 items-center justify-center rounded border p-2 transition hover:opacity-75 focus-visible:outline-2 disabled:opacity-50"
        style={{ color: tv.ui.primary }}
        title="sound settings"
      >
        {soundEnabled ? (
          // Speaker with sound waves (sound ON)
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
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : (
          // Speaker with diagonal slash (sound OFF)
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
            <line x1="22" y1="2" x2="12" y2="22" />
          </svg>
        )}
      </button>

      <SoundSettingsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        settings={settings}
        disabled={disabled}
        onUpdateSettings={onUpdateSettings}
        soundManifest={soundManifest}
      />
    </>
  );
}
