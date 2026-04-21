import { useState } from "react";
import type { SettingsState } from "@/lib/typing-constants";
import { tv } from "@/lib/theme-vars";
import { useTheme } from "@/hooks/useTheme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GhostWriterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsState;
  onUpdateSettings: (updates: Partial<SettingsState>) => void;
}

const SPEED_PRESETS = [20, 40, 60, 80, 100, 120];

export default function GhostWriterSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: GhostWriterSettingsModalProps) {
  const { colors } = useTheme();
  const [customSpeed, setCustomSpeed] = useState(settings.ghostWriterSpeed);

  // Derive customSpeed from settings when it changes
  const displaySpeed = customSpeed !== settings.ghostWriterSpeed ? customSpeed : settings.ghostWriterSpeed;

  const isCustomSpeed = !SPEED_PRESETS.includes(settings.ghostWriterSpeed);

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
            Ghost Writer
          </DialogTitle>
          <DialogDescription style={{ color: tv.text.secondary }}>
            A visual guide that shows where you would be if typing at your target speed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => onUpdateSettings({ ghostWriterEnabled: false })}
              className="group relative inline-flex items-center justify-center px-6 py-2 font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: !settings.ghostWriterEnabled ? `${colors.interactive.secondary.DEFAULT}30` : `${colors.typing.default}20`,
                color: !settings.ghostWriterEnabled ? tv.typing.correct : tv.typing.default,
                boxShadow: !settings.ghostWriterEnabled ? `0 0 0 2px ${colors.interactive.secondary.DEFAULT}` : "none",
              }}
            >
              Off
            </button>

            <button
              onClick={() => onUpdateSettings({ ghostWriterEnabled: true })}
              className="group relative inline-flex items-center justify-center px-6 py-2 font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: settings.ghostWriterEnabled ? `${colors.interactive.secondary.DEFAULT}30` : `${colors.typing.default}20`,
                color: settings.ghostWriterEnabled ? tv.typing.correct : tv.typing.default,
                boxShadow: settings.ghostWriterEnabled ? `0 0 0 2px ${colors.interactive.secondary.DEFAULT}` : "none",
              }}
            >
              On
              {settings.ghostWriterEnabled && (
                <div
                  className="absolute bottom-0 left-0 h-1 w-full scale-x-100 rounded-b-lg transition-transform duration-200"
                  style={{ backgroundColor: tv.interactive.secondary.DEFAULT }}
                ></div>
              )}
            </button>
          </div>

          {/* Speed Selection */}
          <div
            className={`space-y-4 transition-opacity duration-200 ${!settings.ghostWriterEnabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="flex flex-col gap-3">
              <label className="text-sm text-center" style={{ color: tv.text.secondary }}>
                Target Speed (WPM)
              </label>

              {/* Speed Presets */}
              <div className="flex flex-wrap justify-center gap-2">
                {SPEED_PRESETS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => onUpdateSettings({ ghostWriterSpeed: speed })}
                    className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                    style={{
                      backgroundColor: settings.ghostWriterSpeed === speed ? `${colors.interactive.secondary.DEFAULT}30` : `${colors.typing.default}20`,
                      color: settings.ghostWriterSpeed === speed ? tv.typing.correct : tv.typing.default,
                      boxShadow: settings.ghostWriterSpeed === speed ? `0 0 0 2px ${colors.interactive.secondary.DEFAULT}` : "none",
                    }}
                  >
                    {speed}
                  </button>
                ))}
              </div>

              {/* Custom Speed Input */}
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="text-sm" style={{ color: tv.text.secondary }}>Custom:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newSpeed = Math.max(1, customSpeed - 10);
                      setCustomSpeed(newSpeed);
                      onUpdateSettings({ ghostWriterSpeed: newSpeed });
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded hover:opacity-75 transition"
                    style={{ backgroundColor: `${colors.typing.default}20`, color: tv.typing.correct }}
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
                    className="w-20 text-center rounded px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: `${colors.bg.base}80`,
                      color: tv.typing.correct,
                      boxShadow: isCustomSpeed ? `0 0 0 2px ${colors.interactive.secondary.DEFAULT}` : "none",
                      ["--tw-ring-color" as string]: tv.interactive.secondary.DEFAULT,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newSpeed = Math.min(500, customSpeed + 10);
                      setCustomSpeed(newSpeed);
                      onUpdateSettings({ ghostWriterSpeed: newSpeed });
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded hover:opacity-75 transition"
                    style={{ backgroundColor: `${colors.typing.default}20`, color: tv.typing.correct }}
                  >
                    +
                  </button>
                </div>
                <span className="text-sm" style={{ color: tv.text.secondary }}>WPM</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
