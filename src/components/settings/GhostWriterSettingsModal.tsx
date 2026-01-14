import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { GLOBAL_COLORS } from "@/lib/colors";
import type { SettingsState } from "@/lib/typing-constants";

interface GhostWriterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsState;
  onUpdateSettings: (updates: Partial<SettingsState>) => void;
}

const SPEED_PRESETS = [20, 40, 60, 80, 100, 120];

// Use useSyncExternalStore for client-side check
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function GhostWriterSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: GhostWriterSettingsModalProps) {
  const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
  const [customSpeed, setCustomSpeed] = useState(settings.ghostWriterSpeed);

  // Derive customSpeed from settings when it changes
  const displaySpeed = customSpeed !== settings.ghostWriterSpeed ? customSpeed : settings.ghostWriterSpeed;

  if (!isOpen || !mounted) return null;

  const isCustomSpeed = !SPEED_PRESETS.includes(settings.ghostWriterSpeed);

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
          <h2 className="text-xl font-semibold text-gray-200">Ghost Writer</h2>
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
              onClick={() => onUpdateSettings({ ghostWriterEnabled: false })}
              className={`group relative inline-flex items-center justify-center px-6 py-2 font-medium text-white transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                !settings.ghostWriterEnabled
                  ? "bg-gray-600 ring-2 ring-gray-400"
                  : "bg-gray-700 hover:bg-gray-600 opacity-50 hover:opacity-100"
              }`}
            >
              Off
            </button>

            <button
              onClick={() => onUpdateSettings({ ghostWriterEnabled: true })}
              className={`group relative inline-flex items-center justify-center px-6 py-2 font-medium text-white transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                settings.ghostWriterEnabled
                  ? "bg-gray-600 ring-2 ring-gray-400"
                  : "bg-gray-700 hover:bg-gray-600 opacity-50 hover:opacity-100"
              }`}
            >
              On
              {settings.ghostWriterEnabled && (
                <div
                  className="absolute bottom-0 left-0 h-1 w-full scale-x-100 rounded-b-lg transition-transform duration-200"
                  style={{ backgroundColor: GLOBAL_COLORS.brand.primary }}
                ></div>
              )}
            </button>
          </div>

          {/* Speed Selection */}
          <div
            className={`space-y-4 transition-opacity duration-200 ${!settings.ghostWriterEnabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="flex flex-col gap-3">
              <label className="text-sm text-gray-400 text-center">
                Target Speed (WPM)
              </label>

              {/* Speed Presets */}
              <div className="flex flex-wrap justify-center gap-2">
                {SPEED_PRESETS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => onUpdateSettings({ ghostWriterSpeed: speed })}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      settings.ghostWriterSpeed === speed
                        ? "bg-gray-600 ring-2 ring-gray-400 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                    }`}
                  >
                    {speed}
                  </button>
                ))}
              </div>

              {/* Custom Speed Input */}
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="text-sm text-gray-500">Custom:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newSpeed = Math.max(1, customSpeed - 10);
                      setCustomSpeed(newSpeed);
                      onUpdateSettings({ ghostWriterSpeed: newSpeed });
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={displaySpeed}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setCustomSpeed(val);
                    }}
                    onBlur={() => {
                      const clampedSpeed = Math.max(
                        1,
                        Math.min(500, customSpeed)
                      );
                      setCustomSpeed(clampedSpeed);
                      onUpdateSettings({ ghostWriterSpeed: clampedSpeed });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const clampedSpeed = Math.max(
                          1,
                          Math.min(500, customSpeed)
                        );
                        setCustomSpeed(clampedSpeed);
                        onUpdateSettings({ ghostWriterSpeed: clampedSpeed });
                      }
                    }}
                    className={`w-20 text-center rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 ${
                      isCustomSpeed ? "ring-2 ring-gray-400" : ""
                    }`}
                    style={
                      {
                        "--tw-ring-color": GLOBAL_COLORS.brand.primary,
                      } as React.CSSProperties
                    }
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newSpeed = Math.min(500, customSpeed + 10);
                      setCustomSpeed(newSpeed);
                      onUpdateSettings({ ghostWriterSpeed: newSpeed });
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-500">WPM</span>
              </div>
            </div>

            {/* Info text */}
            <p className="text-xs text-gray-500 text-center mt-4">
              The ghost cursor shows where you would be typing at the target
              speed
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
