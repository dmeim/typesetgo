import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { GLOBAL_COLORS } from "@/lib/colors";
import type { SettingsState } from "@/lib/typing-constants";
import { getRandomSoundUrl } from "@/lib/sounds";
import type { SoundManifest } from "@/lib/sounds";

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsState;
  onUpdateSettings: (updates: Partial<SettingsState>) => void;
  soundManifest: SoundManifest;
}

// Use useSyncExternalStore for client-side check
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function SoundSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  soundManifest,
}: SoundSettingsModalProps) {
  const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);

  if (!isOpen || !mounted) return null;

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
    return soundManifest[category] ? Object.keys(soundManifest[category]) : [];
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg p-6 shadow-xl mx-4 md:mx-0 border border-gray-700"
        style={{ backgroundColor: GLOBAL_COLORS.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-200">Sound Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => onUpdateSettings({ soundEnabled: false })}
              className={`group relative inline-flex items-center justify-center px-6 py-2 font-medium text-white transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                !settings.soundEnabled
                  ? "bg-gray-600 ring-2 ring-gray-400"
                  : "bg-gray-700 hover:bg-gray-600 opacity-50 hover:opacity-100"
              }`}
            >
              Off
            </button>

            <button
              onClick={() => onUpdateSettings({ soundEnabled: true })}
              className={`group relative inline-flex items-center justify-center px-6 py-2 font-medium text-white transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                settings.soundEnabled
                  ? "bg-gray-600 ring-2 ring-gray-400"
                  : "bg-gray-700 hover:bg-gray-600 opacity-50 hover:opacity-100"
              }`}
            >
              On
              {settings.soundEnabled && (
                <div
                  className="absolute bottom-0 left-0 h-1 w-full scale-x-100 rounded-b-lg transition-transform duration-200"
                  style={{ backgroundColor: GLOBAL_COLORS.brand.primary }}
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
              <label className="text-sm text-gray-400">Typing Sound</label>
              <div className="flex items-center gap-2">
                <select
                  value={settings.typingSound}
                  onChange={(e) =>
                    onUpdateSettings({ typingSound: e.target.value })
                  }
                  className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2"
                  style={
                    { "--tw-ring-color": GLOBAL_COLORS.brand.primary } as React.CSSProperties
                  }
                >
                  {getPacks("typing").map((pack) => (
                    <option key={pack} value={pack}>
                      {pack.charAt(0).toUpperCase() + pack.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => playPreview("typing", settings.typingSound)}
                  className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition"
                  title="Preview sound"
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
              <label className="text-sm text-gray-400">Warning Sound</label>
              <div className="flex items-center gap-2">
                <select
                  value={settings.warningSound}
                  onChange={(e) =>
                    onUpdateSettings({ warningSound: e.target.value })
                  }
                  className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2"
                  style={
                    { "--tw-ring-color": GLOBAL_COLORS.brand.primary } as React.CSSProperties
                  }
                >
                  {getPacks("warning").map((pack) => (
                    <option key={pack} value={pack}>
                      {pack.charAt(0).toUpperCase() + pack.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => playPreview("warning", settings.warningSound)}
                  className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition"
                  title="Preview sound"
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
              <label className="text-sm text-gray-400">Error Sound</label>
              <div className="flex items-center gap-2">
                <select
                  value={settings.errorSound}
                  onChange={(e) =>
                    onUpdateSettings({ errorSound: e.target.value })
                  }
                  className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2"
                  style={
                    { "--tw-ring-color": GLOBAL_COLORS.brand.primary } as React.CSSProperties
                  }
                  disabled={getPacks("error").length === 0}
                >
                  <option value="">None</option>
                  {getPacks("error").map((pack) => (
                    <option key={pack} value={pack}>
                      {pack.charAt(0).toUpperCase() + pack.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    settings.errorSound &&
                    playPreview("error", settings.errorSound)
                  }
                  className={`p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition ${!settings.errorSound ? "opacity-50 cursor-not-allowed" : ""}`}
                  title="Preview sound"
                  disabled={!settings.errorSound}
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
      </div>
    </div>,
    document.body
  );
}
