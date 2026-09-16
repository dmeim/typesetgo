import { useState } from "react";
import type { SettingsState } from "@/lib/typing-constants";
import { getRandomSoundUrl, type SoundManifest } from "@/lib/sounds";
import { TYPING_FONT_OPTIONS, getTypingFontFamily } from "@/lib/typing-fonts";
import { tv } from "@/lib/theme-vars";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const SETTINGS_TABS = [
  { id: "all", label: "All" },
  { id: "type", label: "Type" },
  { id: "race", label: "Race" },
  { id: "lesson", label: "Lesson" },
] as const;
const TEXT_ALIGN_OPTIONS = ["left", "center", "right", "justify"] as const;
const NONE_SOUND_VALUE = "__none_sound__";
type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];
interface PracticeSettingsDialogProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  settings: SettingsState;
  updateSettings: (updates: Partial<SettingsState>) => void;
  linePreview: number;
  setLinePreview: (value: number) => void;
  maxWordsPerLine: number;
  setMaxWordsPerLine: (value: number) => void;
  soundManifest: SoundManifest | null;
}

export default function PracticeSettingsDialog({
  showSettings, setShowSettings, settings, updateSettings, linePreview,
  setLinePreview, maxWordsPerLine, setMaxWordsPerLine, soundManifest,
}: PracticeSettingsDialogProps) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabId>("all");
  const formatRemValue = (value: number) => {
    const normalized = value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
    return `${normalized}rem`;
  };

  const getSoundPackOptions = (category: "typing" | "warning" | "error") => {
    if (!soundManifest?.[category]) return [];
    return Object.keys(soundManifest[category]);
  };

  const playSettingsSoundPreview = (category: "typing" | "warning" | "error", pack: string) => {
    if (!pack || !soundManifest) return;
    const soundUrl = getRandomSoundUrl(soundManifest, category, pack);
    if (!soundUrl) return;

    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // Ignore preview errors
    }
  };

  const clampedTextSize = Math.max(3, Math.min(6, settings.typingFontSize));
  const clampedLinePreview = Math.max(1, Math.min(6, linePreview));
  const clampedMaxWordsPerLine = Math.max(1, Math.min(10, maxWordsPerLine));
  const typingSoundOptions = getSoundPackOptions("typing");
  const warningSoundOptions = getSoundPackOptions("warning");
  const errorSoundOptions = getSoundPackOptions("error");
  const selectedTypingSound = typingSoundOptions.includes(settings.typingSound)
    ? settings.typingSound
    : undefined;
  const selectedWarningSound = warningSoundOptions.includes(settings.warningSound)
    ? settings.warningSound
    : undefined;
  const selectedErrorSound = errorSoundOptions.includes(settings.errorSound)
    ? settings.errorSound
    : "";
  const closeSettingsModal = () => {
    setActiveSettingsTab("all");
    setShowSettings(false);
  };


  return (
    <>
      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-6"
          onClick={closeSettingsModal}
        >
          <div
            className="flex h-[min(90vh,760px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-xl"
            style={{
              backgroundColor: tv.bg.surface,
              borderColor: tv.border.subtle,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-start justify-between gap-4 border-b px-6 py-5"
              style={{ borderColor: tv.border.subtle }}
            >
              <div>
                <h2 className="text-xl font-semibold" style={{ color: tv.text.primary }}>
                  Settings
                </h2>
                <p className="mt-1 text-sm" style={{ color: tv.text.secondary }}>
                  Organize your typing preferences by area.
                </p>
              </div>
              <button
                onClick={closeSettingsModal}
                className="rounded-md px-2.5 py-1.5 text-xl leading-none transition-colors"
                style={{ color: tv.text.secondary }}
                aria-label="Close settings"
                onMouseEnter={(e) => e.currentTarget.style.color = tv.text.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = tv.text.secondary}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div
                className="mb-6 grid grid-cols-4 gap-2 rounded-xl border p-1"
                style={{
                  backgroundColor: tv.bg.base,
                  borderColor: tv.border.subtle,
                }}
              >
                {SETTINGS_TABS.map((tab) => {
                  const isActive = activeSettingsTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSettingsTab(tab.id)}
                      className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                      style={{
                        color: isActive ? tv.text.primary : tv.text.secondary,
                        backgroundColor: isActive ? tv.bg.elevated : "transparent",
                        boxShadow: isActive ? `inset 0 0 0 1px ${tv.border.default}` : "none",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeSettingsTab === "all" && (
                <div className="space-y-4">
                  <section
                    className="rounded-xl border p-5"
                    style={{
                      backgroundColor: tv.bg.base,
                      borderColor: tv.border.subtle,
                    }}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold" style={{ color: tv.text.primary }}>
                        Text
                      </h3>
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          color: tv.text.secondary,
                          backgroundColor: tv.bg.surface,
                        }}
                      >
                        Display
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>
                          Typing Font
                        </label>
                        <Select
                          value={settings.typingFontFamily}
                          onValueChange={(value) => updateSettings({ typingFontFamily: value })}
                        >
                          <SelectTrigger
                            className="w-full"
                            style={{
                              backgroundColor: tv.bg.surface,
                              borderColor: tv.border.subtle,
                              color: tv.text.primary,
                              fontFamily: getTypingFontFamily(settings.typingFontFamily),
                            }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            style={{
                              backgroundColor: tv.bg.surface,
                              borderColor: tv.border.subtle,
                            }}
                          >
                            {TYPING_FONT_OPTIONS.map((font) => (
                              <SelectItem
                                key={font.value}
                                value={font.value}
                                style={{
                                  color: tv.text.primary,
                                  fontFamily: font.fontFamily,
                                }}
                              >
                                {font.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs" style={{ color: tv.text.muted }}>
                          Changes the font used in the typing area only.
                        </p>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label className="text-sm" style={{ color: tv.text.secondary }}>
                            Text Size
                          </label>
                          <span className="text-sm font-medium" style={{ color: tv.text.primary }}>
                            {formatRemValue(clampedTextSize)}
                          </span>
                        </div>
                        <Slider
                          min={3}
                          max={6}
                          step={0.25}
                          value={[clampedTextSize]}
                          onValueChange={(value) => updateSettings({ typingFontSize: value[0] ?? 3 })}
                          aria-label="Text Size"
                          className="w-full [&_[data-slot=slider-range]]:bg-[var(--slider-range)] [&_[data-slot=slider-thumb]]:border-[var(--slider-range)] [&_[data-slot=slider-track]]:bg-[var(--slider-track)]"
                          style={{
                            ["--slider-range" as string]: tv.interactive.secondary.DEFAULT,
                            ["--slider-track" as string]: tv.bg.surface,
                          }}
                        />
                        <p className="mt-1 text-xs" style={{ color: tv.text.muted }}>
                          Range: 3rem to 6rem
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 border-t pt-4" style={{ borderColor: tv.border.subtle }}>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm" style={{ color: tv.text.secondary }}>
                          Text Alignment
                        </label>
                        <span className="text-xs uppercase tracking-wide" style={{ color: tv.text.muted }}>
                          {settings.textAlign}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {TEXT_ALIGN_OPTIONS.map((align) => {
                          const isActive = settings.textAlign === align;

                          return (
                            <button
                              key={align}
                              type="button"
                              onClick={() => updateSettings({ textAlign: align })}
                              className="rounded-md px-3 py-2 text-sm capitalize transition-colors"
                              style={{
                                color: isActive ? tv.text.primary : tv.text.secondary,
                                backgroundColor: isActive ? tv.bg.elevated : tv.bg.surface,
                                boxShadow: isActive ? `inset 0 0 0 1px ${tv.interactive.secondary.DEFAULT}` : "none",
                              }}
                            >
                              {align}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  <section
                    className="rounded-xl border p-5"
                    style={{
                      backgroundColor: tv.bg.base,
                      borderColor: tv.border.subtle,
                    }}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold" style={{ color: tv.text.primary }}>
                          Sound
                        </h3>
                        <p className="text-xs" style={{ color: tv.text.muted }}>
                          Typing, warning, and error feedback.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                        className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
                        style={{
                          color: settings.soundEnabled ? tv.text.primary : tv.text.secondary,
                          backgroundColor: settings.soundEnabled ? tv.bg.elevated : tv.bg.surface,
                          borderColor: settings.soundEnabled ? tv.interactive.secondary.DEFAULT : tv.border.subtle,
                        }}
                      >
                        Sound {settings.soundEnabled ? "On" : "Off"}
                      </button>
                    </div>

                    <div className={`space-y-3 ${!settings.soundEnabled ? "pointer-events-none opacity-50" : ""}`}>
                      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                        <div>
                          <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>
                            Typing Sound
                          </label>
                          <Select
                            value={selectedTypingSound}
                            onValueChange={(value) => updateSettings({ typingSound: value })}
                            disabled={typingSoundOptions.length === 0}
                          >
                            <SelectTrigger
                              className="w-full"
                              style={{
                                backgroundColor: tv.bg.surface,
                                borderColor: tv.border.subtle,
                                color: tv.text.primary,
                              }}
                            >
                              <SelectValue placeholder={typingSoundOptions.length === 0 ? "No packs found" : "Select typing sound"} />
                            </SelectTrigger>
                            <SelectContent
                              style={{
                                backgroundColor: tv.bg.surface,
                                borderColor: tv.border.subtle,
                              }}
                            >
                              {typingSoundOptions.map((pack) => (
                                <SelectItem key={pack} value={pack} style={{ color: tv.text.primary }}>
                                  {pack.charAt(0).toUpperCase() + pack.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <button
                          type="button"
                          onClick={() => selectedTypingSound && playSettingsSoundPreview("typing", selectedTypingSound)}
                          className="rounded-md border px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                          style={{
                            color: tv.text.primary,
                            backgroundColor: tv.bg.surface,
                            borderColor: tv.border.subtle,
                          }}
                          disabled={!selectedTypingSound || typingSoundOptions.length === 0}
                        >
                          Preview
                        </button>
                      </div>

                      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                        <div>
                          <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>
                            Warning Sound
                          </label>
                          <Select
                            value={selectedWarningSound}
                            onValueChange={(value) => updateSettings({ warningSound: value })}
                            disabled={warningSoundOptions.length === 0}
                          >
                            <SelectTrigger
                              className="w-full"
                              style={{
                                backgroundColor: tv.bg.surface,
                                borderColor: tv.border.subtle,
                                color: tv.text.primary,
                              }}
                            >
                              <SelectValue placeholder={warningSoundOptions.length === 0 ? "No packs found" : "Select warning sound"} />
                            </SelectTrigger>
                            <SelectContent
                              style={{
                                backgroundColor: tv.bg.surface,
                                borderColor: tv.border.subtle,
                              }}
                            >
                              {warningSoundOptions.map((pack) => (
                                <SelectItem key={pack} value={pack} style={{ color: tv.text.primary }}>
                                  {pack.charAt(0).toUpperCase() + pack.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <button
                          type="button"
                          onClick={() => selectedWarningSound && playSettingsSoundPreview("warning", selectedWarningSound)}
                          className="rounded-md border px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                          style={{
                            color: tv.text.primary,
                            backgroundColor: tv.bg.surface,
                            borderColor: tv.border.subtle,
                          }}
                          disabled={!selectedWarningSound || warningSoundOptions.length === 0}
                        >
                          Preview
                        </button>
                      </div>

                      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                        <div>
                          <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>
                            Error Sound
                          </label>
                          <Select
                            value={selectedErrorSound || NONE_SOUND_VALUE}
                            onValueChange={(value) =>
                              updateSettings({ errorSound: value === NONE_SOUND_VALUE ? "" : value })
                            }
                          >
                            <SelectTrigger
                              className="w-full"
                              style={{
                                backgroundColor: tv.bg.surface,
                                borderColor: tv.border.subtle,
                                color: tv.text.primary,
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
                              <SelectItem value={NONE_SOUND_VALUE} style={{ color: tv.text.primary }}>
                                None
                              </SelectItem>
                              {errorSoundOptions.map((pack) => (
                                <SelectItem key={pack} value={pack} style={{ color: tv.text.primary }}>
                                  {pack.charAt(0).toUpperCase() + pack.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <button
                          type="button"
                          onClick={() => selectedErrorSound && playSettingsSoundPreview("error", selectedErrorSound)}
                          className="rounded-md border px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                          style={{
                            color: tv.text.primary,
                            backgroundColor: tv.bg.surface,
                            borderColor: tv.border.subtle,
                          }}
                          disabled={!selectedErrorSound || errorSoundOptions.length === 0}
                        >
                          Preview
                        </button>
                      </div>
                    </div>
                  </section>

                  <section
                    className="rounded-xl border p-5"
                    style={{
                      backgroundColor: tv.bg.base,
                      borderColor: tv.border.subtle,
                    }}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold" style={{ color: tv.text.primary }}>
                          Ghost
                        </h3>
                        <p className="text-xs" style={{ color: tv.text.muted }}>
                          Pace guidance while typing.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSettings({ ghostWriterEnabled: !settings.ghostWriterEnabled })}
                        className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
                        style={{
                          color: settings.ghostWriterEnabled ? tv.text.primary : tv.text.secondary,
                          backgroundColor: settings.ghostWriterEnabled ? tv.bg.elevated : tv.bg.surface,
                          borderColor: settings.ghostWriterEnabled ? tv.interactive.secondary.DEFAULT : tv.border.subtle,
                        }}
                      >
                        Ghost {settings.ghostWriterEnabled ? "On" : "Off"}
                      </button>
                    </div>

                    <div className={`${!settings.ghostWriterEnabled ? "pointer-events-none opacity-50" : ""}`}>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm" style={{ color: tv.text.secondary }}>
                          Target Speed
                        </label>
                        <span className="text-sm font-medium" style={{ color: tv.text.primary }}>
                          {Math.max(1, Math.min(200, settings.ghostWriterSpeed))} WPM
                        </span>
                      </div>
                      <Slider
                        min={1}
                        max={200}
                        step={1}
                        value={[Math.max(1, Math.min(200, settings.ghostWriterSpeed))]}
                        onValueChange={(value) =>
                          updateSettings({
                            ghostWriterSpeed: Math.round(value[0] ?? 1),
                          })
                        }
                        aria-label="Target Speed"
                        className="w-full [&_[data-slot=slider-range]]:bg-[var(--slider-range)] [&_[data-slot=slider-thumb]]:border-[var(--slider-range)] [&_[data-slot=slider-track]]:bg-[var(--slider-track)]"
                        style={{
                          ["--slider-range" as string]: tv.interactive.secondary.DEFAULT,
                          ["--slider-track" as string]: tv.bg.surface,
                        }}
                      />
                    </div>
                  </section>

                  <section
                    className="rounded-xl border p-5"
                    style={{
                      backgroundColor: tv.bg.base,
                      borderColor: tv.border.subtle,
                    }}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold" style={{ color: tv.text.primary }}>
                          Keyboard
                        </h3>
                        <p className="text-xs" style={{ color: tv.text.muted }}>
                          On-screen keyboard guide.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSettings({ showOnScreenKeyboard: !settings.showOnScreenKeyboard })}
                        className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
                        style={{
                          color: settings.showOnScreenKeyboard ? tv.text.primary : tv.text.secondary,
                          backgroundColor: settings.showOnScreenKeyboard ? tv.bg.elevated : tv.bg.surface,
                          borderColor: settings.showOnScreenKeyboard ? tv.interactive.secondary.DEFAULT : tv.border.subtle,
                        }}
                      >
                        Keyboard {settings.showOnScreenKeyboard ? "On" : "Off"}
                      </button>
                    </div>

                    <div className={`${!settings.showOnScreenKeyboard ? "pointer-events-none opacity-50" : ""}`}>
                      <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>
                        Layout
                      </label>
                      <div className="flex gap-2">
                        {(["qwerty", "dvorak", "colemak"] as const).map((layout) => (
                          <button
                            key={layout}
                            type="button"
                            onClick={() => updateSettings({ keyboardLayout: layout })}
                            className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                            style={{
                              color: settings.keyboardLayout === layout ? tv.text.primary : tv.text.secondary,
                              backgroundColor: settings.keyboardLayout === layout ? tv.bg.elevated : tv.bg.surface,
                              borderColor: settings.keyboardLayout === layout ? tv.interactive.secondary.DEFAULT : tv.border.subtle,
                            }}
                          >
                            {layout.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeSettingsTab === "type" && (
                <section
                  className="rounded-xl border p-5"
                  style={{
                    backgroundColor: tv.bg.base,
                    borderColor: tv.border.subtle,
                  }}
                >
                  <h3 className="text-base font-semibold" style={{ color: tv.text.primary }}>
                    Type
                  </h3>
                  <p className="mt-1 text-xs" style={{ color: tv.text.muted }}>
                    Control how much text is visible and how each line wraps.
                  </p>

                  <div className="mt-5 space-y-5">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm" style={{ color: tv.text.secondary }}>
                          Preview Lines
                        </label>
                        <span className="text-sm font-medium" style={{ color: tv.text.primary }}>
                          {clampedLinePreview}
                        </span>
                      </div>
                      <Slider
                        min={1}
                        max={6}
                        step={1}
                        value={[clampedLinePreview]}
                        onValueChange={(value) => setLinePreview(Math.round(value[0] ?? 1))}
                        aria-label="Preview Lines"
                        className="w-full [&_[data-slot=slider-range]]:bg-[var(--slider-range)] [&_[data-slot=slider-thumb]]:border-[var(--slider-range)] [&_[data-slot=slider-track]]:bg-[var(--slider-track)]"
                        style={{
                          ["--slider-range" as string]: tv.interactive.secondary.DEFAULT,
                          ["--slider-track" as string]: tv.bg.surface,
                        }}
                      />
                    </div>

                    <div className="border-t pt-4" style={{ borderColor: tv.border.subtle }}>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm" style={{ color: tv.text.secondary }}>
                          Max Words Per Line
                        </label>
                        <span className="text-sm font-medium" style={{ color: tv.text.primary }}>
                          {clampedMaxWordsPerLine}
                        </span>
                      </div>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[clampedMaxWordsPerLine]}
                        onValueChange={(value) => setMaxWordsPerLine(Math.round(value[0] ?? 1))}
                        aria-label="Max Words Per Line"
                        className="w-full [&_[data-slot=slider-range]]:bg-[var(--slider-range)] [&_[data-slot=slider-thumb]]:border-[var(--slider-range)] [&_[data-slot=slider-track]]:bg-[var(--slider-track)]"
                        style={{
                          ["--slider-range" as string]: tv.interactive.secondary.DEFAULT,
                          ["--slider-track" as string]: tv.bg.surface,
                        }}
                      />
                    </div>
                  </div>
                </section>
              )}

              {activeSettingsTab === "race" && (
                <section
                  className="rounded-xl border p-5"
                  style={{
                    backgroundColor: tv.bg.base,
                    borderColor: tv.border.subtle,
                  }}
                >
                  <h3 className="text-base font-semibold" style={{ color: tv.text.primary }}>
                    Race
                  </h3>
                  <p className="mt-2 text-sm" style={{ color: tv.text.secondary }}>
                    Race-specific controls are still handled in the race lobby. This tab is ready for that migration.
                  </p>
                </section>
              )}

              {activeSettingsTab === "lesson" && (
                <section
                  className="rounded-xl border p-5"
                  style={{
                    backgroundColor: tv.bg.base,
                    borderColor: tv.border.subtle,
                  }}
                >
                  <h3 className="text-base font-semibold" style={{ color: tv.text.primary }}>
                    Lesson
                  </h3>
                  <p className="mt-2 text-sm" style={{ color: tv.text.secondary }}>
                    Lesson-specific controls can be centralized here next.
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
