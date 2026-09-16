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
  settings, updateSettings, generateTest, isKidMode, handleModeSelect,
  wordsManifest, quotesManifest, openCustomCountModal, isCustomDurationSelected,
  isCustomWordTargetSelected, connectMode, isRunning, isFinished, isCompactMode,
  uiOpacity, setShowQuickSettings,
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
              className="rounded-lg px-4 py-2 text-sm transition hover:text-gray-200"
              style={{ backgroundColor: tv.bg.surface, color: tv.interactive.primary.DEFAULT }}
              title="Quick Settings"
            >
              Quick Settings
            </button>
          )}

          {/* Row 1: Mode | Modifiers (hidden in compact mode) */}
          {!isCompactMode && (
          <div className="flex flex-wrap items-center justify-center gap-3 text-gray-400">
            {/* Test Modes */}
            <span className="text-sm font-medium" style={{ color: tv.text.secondary }}>Mode</span>
            <div className="flex rounded-lg p-1" style={{ backgroundColor: tv.bg.surface }}>
              {MODE_SELECTOR_OPTIONS.map((m) => {
                const isModeActive = m === "kid" ? isKidMode : !isKidMode && settings.mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModeSelect(m)}
                    className={`px-3 py-1 rounded transition ${isModeActive ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                    style={{ color: isModeActive ? tv.interactive.secondary.DEFAULT : undefined }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            {!isKidMode && (
              <>
                <div className="w-px h-4 bg-gray-700"></div>

                {/* Modifiers: Caps, Punctuation & Numbers */}
                <span className="text-sm font-medium" style={{ color: tv.text.secondary }}>Modifiers</span>
                <div className="flex gap-4 rounded-lg px-3 py-1.5" style={{ backgroundColor: tv.bg.surface }}>
                  <button
                    type="button"
                    onClick={() => updateSettings({ capitalization: !settings.capitalization })}
                    className={`flex items-center gap-2 transition ${settings.capitalization ? "" : "hover:text-gray-200"}`}
                    style={{ color: settings.capitalization ? tv.interactive.secondary.DEFAULT : undefined }}
                    disabled={settings.mode === "quote"}
                    title={settings.mode === "quote" ? "Not available in quote mode" : "Toggle capitalization"}
                  >
                    <span
                      className={settings.capitalization ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"}
                      style={{
                        backgroundColor: settings.capitalization ? tv.interactive.secondary.DEFAULT : undefined,
                        opacity: settings.mode === "quote" ? 0.5 : 1
                      }}
                    >
                      Aa
                    </span>
                    <span style={{ opacity: settings.mode === "quote" ? 0.5 : 1 }}>caps</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ punctuation: !settings.punctuation })}
                    className={`flex items-center gap-2 transition ${settings.punctuation ? "" : "hover:text-gray-200"}`}
                    style={{ color: settings.punctuation ? tv.interactive.secondary.DEFAULT : undefined }}
                    disabled={settings.mode === "quote"}
                    title={settings.mode === "quote" ? "Not available in quote mode" : "Toggle punctuation"}
                  >
                    <span
                      className={settings.punctuation ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"}
                      style={{
                        backgroundColor: settings.punctuation ? tv.interactive.secondary.DEFAULT : undefined,
                        opacity: settings.mode === "quote" ? 0.5 : 1
                      }}
                    >
                      @
                    </span>
                    <span style={{ opacity: settings.mode === "quote" ? 0.5 : 1 }}>punctuation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ numbers: !settings.numbers })}
                    className={`flex items-center gap-2 transition ${settings.numbers ? "" : "hover:text-gray-200"}`}
                    style={{ color: settings.numbers ? tv.interactive.secondary.DEFAULT : undefined }}
                    disabled={settings.mode === "quote"}
                    title={settings.mode === "quote" ? "Not available in quote mode" : "Toggle numbers"}
                  >
                    <span
                      className={settings.numbers ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"}
                      style={{
                        backgroundColor: settings.numbers ? tv.interactive.secondary.DEFAULT : undefined,
                        opacity: settings.mode === "quote" ? 0.5 : 1
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
          <div className="flex flex-wrap items-center justify-center gap-3 text-gray-400">
            {/* Time Duration */}
            {settings.mode === "time" && (
              <>
                <span className="text-sm font-medium" style={{ color: tv.text.secondary }}>Duration</span>
                <div className="flex rounded-lg p-1" style={{ backgroundColor: tv.bg.surface }}>
                  {TIME_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        if (settings.duration === d) generateTest();
                        else updateSettings({ duration: d });
                      }}
                      className={`px-3 py-1 rounded transition ${settings.duration === d ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                      style={{ color: settings.duration === d ? tv.interactive.secondary.DEFAULT : undefined }}
                    >
                      {d}s
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={openCustomCountModal}
                    className={`px-3 py-1 rounded transition ${isCustomDurationSelected ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                    style={{ color: isCustomDurationSelected ? tv.interactive.secondary.DEFAULT : undefined }}
                  >
                    custom
                  </button>
                </div>
              </>
            )}

            {/* Word Count */}
            {settings.mode === "words" && (
              <>
                <span className="text-sm font-medium" style={{ color: tv.text.secondary }}>Word Count</span>
                <div className="flex rounded-lg p-1" style={{ backgroundColor: tv.bg.surface }}>
                  {WORD_PRESETS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        if (settings.wordTarget === w) generateTest();
                        else updateSettings({ wordTarget: w });
                      }}
                      className={`px-3 py-1 rounded transition ${settings.wordTarget === w ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                      style={{ color: settings.wordTarget === w ? tv.interactive.secondary.DEFAULT : undefined }}
                    >
                      {w}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={openCustomCountModal}
                    className={`px-3 py-1 rounded transition ${isCustomWordTargetSelected ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                    style={{ color: isCustomWordTargetSelected ? tv.interactive.secondary.DEFAULT : undefined }}
                  >
                    custom
                  </button>
                </div>
              </>
            )}

            {/* Quote Length */}
            {settings.mode === "quote" && quotesManifest && (
              <>
                <span className="text-sm font-medium" style={{ color: tv.text.secondary }}>Quote Length</span>
                <div className="flex rounded-lg p-1" style={{ backgroundColor: tv.bg.surface }}>
                  {["all", ...quotesManifest.lengths].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        if (settings.quoteLength === l) generateTest();
                        else updateSettings({ quoteLength: l as typeof settings.quoteLength });
                      }}
                      className={`px-3 py-1 rounded transition ${settings.quoteLength === l ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                      style={{ color: settings.quoteLength === l ? tv.interactive.secondary.DEFAULT : undefined }}
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
                <span className="text-sm font-medium" style={{ color: tv.text.secondary }}>Duration</span>
                <div className="flex rounded-lg px-4 py-1.5" style={{ backgroundColor: tv.bg.surface }}>
                  <span className="text-lg" style={{ color: tv.interactive.secondary.DEFAULT }}>∞</span>
                </div>
              </>
            )}

            {/* Difficulty (shown for time, words, zen modes) */}
            {settings.mode !== "quote" && wordsManifest && (
              <>
                <div className="w-px h-4 bg-gray-700"></div>
                <span className="text-sm font-medium" style={{ color: tv.text.secondary }}>Difficulty</span>
                <div className="flex rounded-lg p-1" style={{ backgroundColor: tv.bg.surface }}>
                  {wordsManifest.difficulties.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        if (settings.difficulty === d) generateTest();
                        else updateSettings({ difficulty: d as typeof settings.difficulty });
                      }}
                      className={`px-3 py-1 rounded transition ${settings.difficulty === d ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                      style={{ color: settings.difficulty === d ? tv.interactive.secondary.DEFAULT : undefined }}
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
