import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { SettingsState } from "@/lib/typing-constants";
import { tv } from "@/lib/theme-vars";
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
  const [customSpeed, setCustomSpeed] = useState(settings.ghostWriterSpeed);

  // Derive customSpeed from settings when it changes
  const displaySpeed = customSpeed !== settings.ghostWriterSpeed ? customSpeed : settings.ghostWriterSpeed;

  const isCustomSpeed = !SPEED_PRESETS.includes(settings.ghostWriterSpeed);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md"
        style={{
          backgroundColor: tv.ui.card,
          borderColor: tv.border.subtle,
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: tv.ui.foreground }}>
            Ghost Writer
          </DialogTitle>
          <DialogDescription style={{ color: tv.ui.mutedForeground }}>
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
                backgroundColor: !settings.ghostWriterEnabled ? tv.ui.secondary : tv.ui.muted,
                color: !settings.ghostWriterEnabled ? tv.ui.foreground : tv.ui.mutedForeground,
                boxShadow: !settings.ghostWriterEnabled ? `0 0 0 2px ${tv.ui.secondaryEmphasis}` : "none",
              }}
            >
              Off
            </button>

            <button
              onClick={() => onUpdateSettings({ ghostWriterEnabled: true })}
              className="group relative inline-flex items-center justify-center px-6 py-2 font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: settings.ghostWriterEnabled ? tv.ui.secondary : tv.ui.muted,
                color: settings.ghostWriterEnabled ? tv.ui.foreground : tv.ui.mutedForeground,
                boxShadow: settings.ghostWriterEnabled ? `0 0 0 2px ${tv.ui.secondaryEmphasis}` : "none",
              }}
            >
              On
              {settings.ghostWriterEnabled && (
                <div
                  className="absolute bottom-0 left-0 h-1 w-full scale-x-100 rounded-b-lg transition-transform duration-200"
                  style={{ backgroundColor: tv.ui.secondaryEmphasis }}
                ></div>
              )}
            </button>
          </div>

          {/* Speed Selection */}
          <div
            className={`space-y-4 transition-opacity duration-200 ${!settings.ghostWriterEnabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="flex flex-col gap-3">
              <label className="text-sm text-center" style={{ color: tv.ui.mutedForeground }}>
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
                      backgroundColor: settings.ghostWriterSpeed === speed ? tv.ui.secondary : tv.ui.muted,
                      color: settings.ghostWriterSpeed === speed ? tv.ui.foreground : tv.ui.mutedForeground,
                      boxShadow: settings.ghostWriterSpeed === speed ? `0 0 0 2px ${tv.ui.secondaryEmphasis}` : "none",
                    }}
                  >
                    {speed}
                  </button>
                ))}
              </div>

              {/* Custom Speed Input */}
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="text-sm" style={{ color: tv.ui.mutedForeground }}>Custom:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease ghost speed by 10 WPM"
                    onClick={() => {
                      const newSpeed = Math.max(1, customSpeed - 10);
                      setCustomSpeed(newSpeed);
                      onUpdateSettings({ ghostWriterSpeed: newSpeed });
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded hover:opacity-75 transition"
                    style={{ backgroundColor: tv.ui.muted, color: tv.ui.foreground }}
                  >
                    <MinusIcon className="size-4" aria-hidden="true" />
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
                      backgroundColor: tv.ui.background,
                      color: tv.ui.foreground,
                      boxShadow: isCustomSpeed ? `0 0 0 2px ${tv.ui.secondaryEmphasis}` : "none",
                      ["--tw-ring-color" as string]: tv.ui.secondaryEmphasis,
                    }}
                  />
                  <button
                    type="button"
                    aria-label="Increase ghost speed by 10 WPM"
                    onClick={() => {
                      const newSpeed = Math.min(500, customSpeed + 10);
                      setCustomSpeed(newSpeed);
                      onUpdateSettings({ ghostWriterSpeed: newSpeed });
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded hover:opacity-75 transition"
                    style={{ backgroundColor: tv.ui.muted, color: tv.ui.foreground }}
                  >
                    <PlusIcon className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <span className="text-sm" style={{ color: tv.ui.mutedForeground }}>WPM</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
