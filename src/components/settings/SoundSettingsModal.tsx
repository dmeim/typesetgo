import type { SettingsState } from "@/lib/typing-constants";
import { getRandomSoundUrl } from "@/lib/sounds";
import type { SoundManifest } from "@/lib/sounds";
import { tv } from "@/lib/theme-vars";
import { useTheme } from "@/hooks/useTheme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE_SOUND_VALUE = "__none_sound__";

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsState;
  onUpdateSettings: (updates: Partial<SettingsState>) => void;
  soundManifest: SoundManifest | null;
}

export default function SoundSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  soundManifest,
}: SoundSettingsModalProps) {
  const { colors } = useTheme();

  const playPreview = (category: string, pack: string) => {
    const soundUrl = getRandomSoundUrl(soundManifest, category, pack);
    if (!soundUrl) return;
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {
      console.error("Preview error", e);
    }
  };

  // Helper to safely get keys
  const getPacks = (category: string) => {
    if (!soundManifest) return [];
    return soundManifest[category] ? Object.keys(soundManifest[category]) : [];
  };

  const typingPacks = getPacks("typing");
  const warningPacks = getPacks("warning");
  const errorPacks = getPacks("error");
  const selectedTypingSound = typingPacks.includes(settings.typingSound)
    ? settings.typingSound
    : undefined;
  const selectedWarningSound = warningPacks.includes(settings.warningSound)
    ? settings.warningSound
    : undefined;
  const selectedErrorSound = errorPacks.includes(settings.errorSound)
    ? settings.errorSound
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md"
        style={{
          backgroundColor: tv.bg.surface,
          borderColor: tv.border.subtle,
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: tv.text.primary }}>
            Sound Settings
          </DialogTitle>
          <DialogDescription style={{ color: tv.text.secondary }}>
            Customize the audio feedback for typing, warnings, and errors.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => onUpdateSettings({ soundEnabled: false })}
              className="group relative inline-flex items-center justify-center px-6 py-2 font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: !settings.soundEnabled ? `${colors.interactive.secondary.DEFAULT}30` : `${colors.typing.default}20`,
                color: !settings.soundEnabled ? tv.typing.correct : tv.typing.default,
                boxShadow: !settings.soundEnabled ? `0 0 0 2px ${colors.interactive.secondary.DEFAULT}` : "none",
              }}
            >
              Off
            </button>

            <button
              onClick={() => onUpdateSettings({ soundEnabled: true })}
              className="group relative inline-flex items-center justify-center px-6 py-2 font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: settings.soundEnabled ? `${colors.interactive.secondary.DEFAULT}30` : `${colors.typing.default}20`,
                color: settings.soundEnabled ? tv.typing.correct : tv.typing.default,
                boxShadow: settings.soundEnabled ? `0 0 0 2px ${colors.interactive.secondary.DEFAULT}` : "none",
              }}
            >
              On
              {settings.soundEnabled && (
                <div
                  className="absolute bottom-0 left-0 h-1 w-full scale-x-100 rounded-b-lg transition-transform duration-200"
                  style={{ backgroundColor: tv.interactive.secondary.DEFAULT }}
                ></div>
              )}
            </button>
          </div>

          {/* Sound Selection Dropdowns */}
          <div
            className={`space-y-4 transition-opacity duration-200 ${!settings.soundEnabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            {/* Typing Sound */}
            <div className="flex flex-col gap-2">
              <label className="text-sm" style={{ color: tv.text.secondary }}>Typing Sound</label>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedTypingSound}
                  onValueChange={(value) => onUpdateSettings({ typingSound: value })}
                  disabled={typingPacks.length === 0}
                >
                  <SelectTrigger
                    className="w-full"
                    style={{
                      backgroundColor: `${colors.bg.base}80`,
                      borderColor: tv.border.subtle,
                      color: tv.typing.correct,
                    }}
                  >
                    <SelectValue placeholder={typingPacks.length === 0 ? "No packs found" : "Select typing sound"} />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: tv.bg.surface,
                      borderColor: tv.border.subtle,
                    }}
                  >
                    {typingPacks.map((pack) => (
                      <SelectItem key={pack} value={pack} style={{ color: tv.typing.correct }}>
                        {pack.charAt(0).toUpperCase() + pack.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => selectedTypingSound && playPreview("typing", selectedTypingSound)}
                  className="p-2 rounded hover:opacity-75 transition"
                  style={{ color: tv.text.secondary }}
                  title="Preview sound"
                  disabled={!selectedTypingSound || typingPacks.length === 0}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Warning Sound */}
            <div className="flex flex-col gap-2">
              <label className="text-sm" style={{ color: tv.text.secondary }}>Warning Sound</label>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedWarningSound}
                  onValueChange={(value) => onUpdateSettings({ warningSound: value })}
                  disabled={warningPacks.length === 0}
                >
                  <SelectTrigger
                    className="w-full"
                    style={{
                      backgroundColor: `${colors.bg.base}80`,
                      borderColor: tv.border.subtle,
                      color: tv.typing.correct,
                    }}
                  >
                    <SelectValue placeholder={warningPacks.length === 0 ? "No packs found" : "Select warning sound"} />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: tv.bg.surface,
                      borderColor: tv.border.subtle,
                    }}
                  >
                    {warningPacks.map((pack) => (
                      <SelectItem key={pack} value={pack} style={{ color: tv.typing.correct }}>
                        {pack.charAt(0).toUpperCase() + pack.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => selectedWarningSound && playPreview("warning", selectedWarningSound)}
                  className="p-2 rounded hover:opacity-75 transition"
                  style={{ color: tv.text.secondary }}
                  title="Preview sound"
                  disabled={!selectedWarningSound || warningPacks.length === 0}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Error Sound (Placeholder) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm" style={{ color: tv.text.secondary }}>Error Sound</label>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedErrorSound || NONE_SOUND_VALUE}
                  onValueChange={(value) =>
                    onUpdateSettings({ errorSound: value === NONE_SOUND_VALUE ? "" : value })
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    style={{
                      backgroundColor: `${colors.bg.base}80`,
                      borderColor: tv.border.subtle,
                      color: tv.typing.correct,
                    }}
                  >
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: tv.bg.surface,
                      borderColor: tv.border.subtle,
                    }}
                  >
                    <SelectItem value={NONE_SOUND_VALUE} style={{ color: tv.typing.correct }}>
                      None
                    </SelectItem>
                    {errorPacks.map((pack) => (
                      <SelectItem key={pack} value={pack} style={{ color: tv.typing.correct }}>
                        {pack.charAt(0).toUpperCase() + pack.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() =>
                    selectedErrorSound &&
                    playPreview("error", selectedErrorSound)
                  }
                  className={`p-2 rounded hover:opacity-75 transition ${!selectedErrorSound ? "opacity-50 cursor-not-allowed" : ""}`}
                  style={{ color: tv.text.secondary }}
                  title="Preview sound"
                  disabled={!selectedErrorSound || errorPacks.length === 0}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
