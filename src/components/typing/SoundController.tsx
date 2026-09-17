import { useState } from "react";
import { Volume2, VolumeOff } from "lucide-react";
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
          <Volume2 size="1em" aria-hidden="true" />
        ) : (
          <VolumeOff size="1em" aria-hidden="true" />
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
