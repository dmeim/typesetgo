import type { SettingsState } from "@/lib/typing-constants";
import type { WordsManifest } from "@/lib/words";
import type { QuotesManifest } from "@/lib/quotes";
import { tv } from "@/lib/theme-vars";
import { MODE_SELECTOR_OPTIONS, TIME_PRESETS, WORD_PRESETS, type ModeSelectorOption } from "./practice-config";

export interface PracticeConfigurationProps {
  settings: SettingsState;
  updateSettings: (updates: Partial<SettingsState>) => void;
  generateTest: () => void;
  isKidMode: boolean;
  handleModeSelect: (mode: ModeSelectorOption) => void;
  wordsManifest: WordsManifest | null;
  quotesManifest: QuotesManifest | null;
  openCustomCountModal: () => void;
  isCustomDurationSelected: boolean;
  isCustomWordTargetSelected: boolean;
}

interface PracticeControlsProps extends PracticeConfigurationProps {
  connectMode: boolean;
  isRunning: boolean;
  isFinished: boolean;
  isCompactMode: boolean;
  uiOpacity: number;
  setShowQuickSettings: (show: boolean) => void;
}

export default function PracticeControls({
  settings,
  updateSettings,
  generateTest,
  isKidMode,
  handleModeSelect,
  wordsManifest,
  quotesManifest,
  openCustomCountModal,
  isCustomDurationSelected,
  isCustomWordTargetSelected,
  connectMode,
  isRunning,
  isFinished,
  isCompactMode,
  uiOpacity,
  setShowQuickSettings,
}: PracticeControlsProps) {
  return (
    <>
      {/* Settings Controls */}
      {!connectMode && !isRunning && !isFinished && (
        <div
          className="shrink-0 w-full flex flex-col items-center justify-center gap-3 transition-opacity duration-300 pb-2"
          style={{
            fontSize: `${settings.iconFontSize}rem`,
            opacity: uiOpacity,
          }}
        >
          {/* Compact Mode: Quick Settings */}
          {isCompactMode && (
            <button
              type="button"
              onClick={() => setShowQuickSettings(true)}
              className="rounded-lg px-4 py-2 text-sm transition hover:text-foreground"
              style={{
                backgroundColor: tv.bg.surface,
                color: tv.interactive.primary.DEFAULT,
              }}
              title="Quick Settings"
            >
              Quick Settings
            </button>
          )}

          {/* Row 1: Mode | Modifiers (hidden in compact mode) */}
          {!isCompactMode && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground">
              {/* Test Modes */}
              <span className="text-sm font-medium" style={{ color: tv.ui.mutedForeground }}>
                Mode
              </span>
              <div className="flex flex-wrap justify-center rounded-lg p-1" style={{ backgroundColor: tv.bg.surface }}>
                {MODE_SELECTOR_OPTIONS.map((m) => {
                  const isModeActive = m === "kid" ? isKidMode : !isKidMode && settings.mode === m;
                  return (
                    <button
                      key={m}
                      aria-pressed={isModeActive}
                      type="button"
                      onClick={() => handleModeSelect(m)}
                      className={`px-3 py-1 rounded transition ${isModeActive ? "font-medium bg-accent" : "hover:text-foreground"}`}
                      style={{
                        color: isModeActive ? tv.ui.primary : undefined,
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              {!isKidMode && (
                <>
                  <div className="w-px h-4 bg-muted"></div>

                  {/* Modifiers: Caps, Punctuation & Numbers */}
                  <span className="text-sm font-medium" style={{ color: tv.ui.mutedForeground }}>
                    Modifiers
                  </span>
                  <div className="flex gap-4 rounded-lg px-3 py-1.5" style={{ backgroundColor: tv.bg.surface }}>
                    <button
                      type="button"
                      aria-pressed={settings.capitalization}
                      onClick={() =>
                        updateSettings({
                          capitalization: !settings.capitalization,
                        })
                      }
                      className={`flex items-center gap-2 transition ${settings.capitalization ? "" : "hover:text-foreground"}`}
                      style={{
                        color: settings.capitalization ? tv.ui.primary : undefined,
                      }}
                      disabled={settings.mode === "quote"}
                      title={settings.mode === "quote" ? "Not available in quote mode" : "Toggle capitalization"}
                    >
                      <span
                        className={
                          settings.capitalization
                            ? "text-primary-foreground rounded px-1 text-[0.75em] font-bold"
                            : "bg-muted rounded px-1 text-[0.75em]"
                        }
                        style={{
                          backgroundColor: settings.capitalization ? tv.ui.primary : undefined,
                          opacity: settings.mode === "quote" ? 0.5 : 1,
                        }}
                      >
                        Aa
                      </span>
                      <span style={{ opacity: settings.mode === "quote" ? 0.5 : 1 }}>caps</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={settings.punctuation}
                      onClick={() => updateSettings({ punctuation: !settings.punctuation })}
                      className={`flex items-center gap-2 transition ${settings.punctuation ? "" : "hover:text-foreground"}`}
                      style={{
                        color: settings.punctuation ? tv.ui.primary : undefined,
                      }}
                      disabled={settings.mode === "quote"}
                      title={settings.mode === "quote" ? "Not available in quote mode" : "Toggle punctuation"}
                    >
                      <span
                        className={
                          settings.punctuation
                            ? "text-primary-foreground rounded px-1 text-[0.75em] font-bold"
                            : "bg-muted rounded px-1 text-[0.75em]"
                        }
                        style={{
                          backgroundColor: settings.punctuation ? tv.ui.primary : undefined,
                          opacity: settings.mode === "quote" ? 0.5 : 1,
                        }}
                      >
                        @
                      </span>
                      <span style={{ opacity: settings.mode === "quote" ? 0.5 : 1 }}>punctuation</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={settings.numbers}
                      onClick={() => updateSettings({ numbers: !settings.numbers })}
                      className={`flex items-center gap-2 transition ${settings.numbers ? "" : "hover:text-foreground"}`}
                      style={{
                        color: settings.numbers ? tv.ui.primary : undefined,
                      }}
                      disabled={settings.mode === "quote"}
                      title={settings.mode === "quote" ? "Not available in quote mode" : "Toggle numbers"}
                    >
                      <span
                        className={
                          settings.numbers
                            ? "text-primary-foreground rounded px-1 text-[0.75em] font-bold"
                            : "bg-muted rounded px-1 text-[0.75em]"
                        }
                        style={{
                          backgroundColor: settings.numbers ? tv.ui.primary : undefined,
                          opacity: settings.mode === "quote" ? 0.5 : 1,
                        }}
                      >
                        #
                      </span>
                      <span style={{ opacity: settings.mode === "quote" ? 0.5 : 1 }}>numbers</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Row 3: Time/Word Count/Quote Length + Difficulty with labels (hidden in compact mode or kid mode) */}
          {!isCompactMode && !isKidMode && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground">
              {/* Time Duration */}
              {settings.mode === "time" && (
                <>
                  <span className="text-sm font-medium" style={{ color: tv.ui.mutedForeground }}>
                    Duration
                  </span>
                  <div
                    className="flex flex-wrap justify-center rounded-lg p-1"
                    style={{ backgroundColor: tv.bg.surface }}
                  >
                    {TIME_PRESETS.map((d) => (
                      <button
                        key={d}
                        aria-pressed={typeof d === "number" ? settings.duration === d : settings.difficulty === d}
                        type="button"
                        onClick={() => {
                          if (settings.duration === d) generateTest();
                          else updateSettings({ duration: d });
                        }}
                        className={`px-3 py-1 rounded transition ${settings.duration === d ? "font-medium bg-accent" : "hover:text-foreground"}`}
                        style={{
                          color: settings.duration === d ? tv.ui.primary : undefined,
                        }}
                      >
                        {d}s
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={openCustomCountModal}
                      className={`px-3 py-1 rounded transition ${isCustomDurationSelected ? "font-medium bg-accent" : "hover:text-foreground"}`}
                      style={{
                        color: isCustomDurationSelected ? tv.ui.primary : undefined,
                      }}
                    >
                      custom
                    </button>
                  </div>
                </>
              )}

              {/* Word Count */}
              {settings.mode === "words" && (
                <>
                  <span className="text-sm font-medium" style={{ color: tv.ui.mutedForeground }}>
                    Word Count
                  </span>
                  <div
                    className="flex flex-wrap justify-center rounded-lg p-1"
                    style={{ backgroundColor: tv.bg.surface }}
                  >
                    {WORD_PRESETS.map((w) => (
                      <button
                        key={w}
                        aria-pressed={settings.wordTarget === w}
                        type="button"
                        onClick={() => {
                          if (settings.wordTarget === w) generateTest();
                          else updateSettings({ wordTarget: w });
                        }}
                        className={`px-3 py-1 rounded transition ${settings.wordTarget === w ? "font-medium bg-accent" : "hover:text-foreground"}`}
                        style={{
                          color: settings.wordTarget === w ? tv.ui.primary : undefined,
                        }}
                      >
                        {w}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={openCustomCountModal}
                      className={`px-3 py-1 rounded transition ${isCustomWordTargetSelected ? "font-medium bg-accent" : "hover:text-foreground"}`}
                      style={{
                        color: isCustomWordTargetSelected ? tv.ui.primary : undefined,
                      }}
                    >
                      custom
                    </button>
                  </div>
                </>
              )}

              {/* Quote Length */}
              {settings.mode === "quote" && quotesManifest && (
                <>
                  <span className="text-sm font-medium" style={{ color: tv.ui.mutedForeground }}>
                    Quote Length
                  </span>
                  <div
                    className="flex flex-wrap justify-center rounded-lg p-1"
                    style={{ backgroundColor: tv.bg.surface }}
                  >
                    {["all", ...quotesManifest.lengths].map((l) => (
                      <button
                        key={l}
                        aria-pressed={settings.quoteLength === l}
                        type="button"
                        onClick={() => {
                          if (settings.quoteLength === l) generateTest();
                          else
                            updateSettings({
                              quoteLength: l as typeof settings.quoteLength,
                            });
                        }}
                        className={`px-3 py-1 rounded transition ${settings.quoteLength === l ? "font-medium bg-accent" : "hover:text-foreground"}`}
                        style={{
                          color: settings.quoteLength === l ? tv.ui.primary : undefined,
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Zen mode - show infinity symbol */}
              {settings.mode === "zen" && (
                <>
                  <span className="text-sm font-medium" style={{ color: tv.ui.mutedForeground }}>
                    Duration
                  </span>
                  <div className="flex rounded-lg px-4 py-1.5" style={{ backgroundColor: tv.bg.surface }}>
                    <span className="text-lg" style={{ color: tv.ui.primary }}>
                      ∞
                    </span>
                  </div>
                </>
              )}

              {/* Difficulty (shown for time, words, zen modes) */}
              {settings.mode !== "quote" && wordsManifest && (
                <>
                  <div className="w-px h-4 bg-muted"></div>
                  <span className="text-sm font-medium" style={{ color: tv.ui.mutedForeground }}>
                    Difficulty
                  </span>
                  <div
                    className="flex flex-wrap justify-center rounded-lg p-1"
                    style={{ backgroundColor: tv.bg.surface }}
                  >
                    {wordsManifest.difficulties.map((d) => (
                      <button
                        key={d}
                        aria-pressed={typeof d === "number" ? settings.duration === d : settings.difficulty === d}
                        type="button"
                        onClick={() => {
                          if (settings.difficulty === d) generateTest();
                          else
                            updateSettings({
                              difficulty: d as typeof settings.difficulty,
                            });
                        }}
                        className={`px-3 py-1 rounded transition ${settings.difficulty === d ? "font-medium bg-accent" : "hover:text-foreground"}`}
                        style={{
                          color: settings.difficulty === d ? tv.ui.primary : undefined,
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
