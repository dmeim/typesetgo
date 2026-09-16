import { tv } from "@/lib/theme-vars";
import { MODE_SELECTOR_OPTIONS, TIME_PRESETS, WORD_PRESETS } from "./practice-config";
import type { PracticeConfigurationProps } from "./PracticeControls";

interface PracticeQuickSettingsDialogProps extends PracticeConfigurationProps {
  showQuickSettings: boolean;
  setShowQuickSettings: (show: boolean) => void;
  linePreview: number;
  setLinePreview: (value: number) => void;
  maxWordsPerLine: number;
  setMaxWordsPerLine: (value: number) => void;
}

export default function PracticeQuickSettingsDialog({
  settings, updateSettings, generateTest, isKidMode, handleModeSelect,
  wordsManifest, quotesManifest, openCustomCountModal, isCustomDurationSelected,
  isCustomWordTargetSelected, showQuickSettings, setShowQuickSettings,
  linePreview, setLinePreview, maxWordsPerLine, setMaxWordsPerLine,
}: PracticeQuickSettingsDialogProps) {
  return (
    <>
      {/* Quick Settings Modal (for compact/zoomed mode) */}
      {showQuickSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowQuickSettings(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg p-6 shadow-xl mx-4"
            style={{ backgroundColor: tv.bg.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: tv.text.primary }}>Quick Settings</h2>
              <button onClick={() => setShowQuickSettings(false)} className="hover:opacity-80 transition-opacity" style={{ color: tv.text.muted }}>
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Test Mode */}
              <div className="text-center">
                <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>Mode</label>
                <div className="flex gap-2 flex-wrap justify-center">
                  {MODE_SELECTOR_OPTIONS.map((m) => {
                    const isModeActive = m === "kid" ? isKidMode : !isKidMode && settings.mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => handleModeSelect(m)}
                        className={`rounded px-4 py-2 text-sm capitalize transition ${isModeActive ? "font-medium" : "hover:opacity-80"}`}
                        style={{
                          color: isModeActive ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                          backgroundColor: isModeActive ? tv.bg.elevated : tv.bg.base
                        }}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration / Word Count / Quote Length */}
              {settings.mode === "time" && (
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>Duration</label>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {TIME_PRESETS.map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          if (settings.duration === d) generateTest();
                          else updateSettings({ duration: d });
                        }}
                        className={`rounded px-4 py-2 text-sm transition ${settings.duration === d ? "font-medium" : "hover:opacity-80"}`}
                        style={{
                          color: settings.duration === d ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                          backgroundColor: settings.duration === d ? tv.bg.elevated : tv.bg.base
                        }}
                      >
                        {d}s
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setShowQuickSettings(false);
                        openCustomCountModal();
                      }}
                      className={`rounded px-4 py-2 text-sm transition ${isCustomDurationSelected ? "font-medium" : "hover:opacity-80"}`}
                      style={{
                        color: isCustomDurationSelected ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                        backgroundColor: isCustomDurationSelected ? tv.bg.elevated : tv.bg.base,
                      }}
                    >
                      custom
                    </button>
                  </div>
                </div>
              )}

              {settings.mode === "words" && (
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>Word Count</label>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {WORD_PRESETS.map((w) => (
                      <button
                        key={w}
                        onClick={() => {
                          if (settings.wordTarget === w) generateTest();
                          else updateSettings({ wordTarget: w });
                        }}
                        className={`rounded px-4 py-2 text-sm transition ${settings.wordTarget === w ? "font-medium" : "hover:opacity-80"}`}
                        style={{
                          color: settings.wordTarget === w ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                          backgroundColor: settings.wordTarget === w ? tv.bg.elevated : tv.bg.base
                        }}
                      >
                        {w}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setShowQuickSettings(false);
                        openCustomCountModal();
                      }}
                      className={`rounded px-4 py-2 text-sm transition ${isCustomWordTargetSelected ? "font-medium" : "hover:opacity-80"}`}
                      style={{
                        color: isCustomWordTargetSelected ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                        backgroundColor: isCustomWordTargetSelected ? tv.bg.elevated : tv.bg.base,
                      }}
                    >
                      custom
                    </button>
                  </div>
                </div>
              )}

              {settings.mode === "quote" && quotesManifest && (
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>Quote Length</label>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {["all", ...quotesManifest.lengths].map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          if (settings.quoteLength === l) generateTest();
                          else updateSettings({ quoteLength: l as typeof settings.quoteLength });
                        }}
                        className={`rounded px-4 py-2 text-sm transition ${settings.quoteLength === l ? "font-medium" : "hover:opacity-80"}`}
                        style={{
                          color: settings.quoteLength === l ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                          backgroundColor: settings.quoteLength === l ? tv.bg.elevated : tv.bg.base
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Difficulty */}
              {settings.mode !== "quote" && wordsManifest && (
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>Difficulty</label>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {wordsManifest.difficulties.map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          if (settings.difficulty === d) generateTest();
                          else updateSettings({ difficulty: d as typeof settings.difficulty });
                        }}
                        className={`rounded px-4 py-2 text-sm capitalize transition ${settings.difficulty === d ? "font-medium" : "hover:opacity-80"}`}
                        style={{
                          color: settings.difficulty === d ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                          backgroundColor: settings.difficulty === d ? tv.bg.elevated : tv.bg.base
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              <div className="text-center">
                <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>Modifiers</label>
                <div className="flex gap-3 flex-wrap justify-center">
                  <button
                    onClick={() => updateSettings({ capitalization: !settings.capitalization })}
                    disabled={settings.mode === "quote"}
                    className={`rounded px-4 py-2 text-sm transition ${settings.capitalization ? "font-medium" : "hover:opacity-80"}`}
                    style={{
                      color: settings.capitalization ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                      backgroundColor: settings.capitalization ? tv.bg.elevated : tv.bg.base,
                      opacity: settings.mode === "quote" ? 0.5 : 1
                    }}
                  >
                    Aa caps
                  </button>
                  <button
                    onClick={() => updateSettings({ punctuation: !settings.punctuation })}
                    disabled={settings.mode === "quote"}
                    className={`rounded px-4 py-2 text-sm transition ${settings.punctuation ? "font-medium" : "hover:opacity-80"}`}
                    style={{
                      color: settings.punctuation ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                      backgroundColor: settings.punctuation ? tv.bg.elevated : tv.bg.base,
                      opacity: settings.mode === "quote" ? 0.5 : 1
                    }}
                  >
                    @ punctuation
                  </button>
                  <button
                    onClick={() => updateSettings({ numbers: !settings.numbers })}
                    disabled={settings.mode === "quote"}
                    className={`rounded px-4 py-2 text-sm transition ${settings.numbers ? "font-medium" : "hover:opacity-80"}`}
                    style={{
                      color: settings.numbers ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                      backgroundColor: settings.numbers ? tv.bg.elevated : tv.bg.base,
                      opacity: settings.mode === "quote" ? 0.5 : 1
                    }}
                  >
                    # numbers
                  </button>
                </div>
              </div>

              {/* Line Preview */}
              <div className="text-center">
                <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>Lines to Preview</label>
                <div className="flex gap-2 flex-wrap justify-center">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setLinePreview(num)}
                      className={`rounded px-3 py-2 text-sm transition ${linePreview === num ? "font-medium" : "hover:opacity-80"}`}
                      style={{
                        color: linePreview === num ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                        backgroundColor: linePreview === num ? tv.bg.elevated : tv.bg.base
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Words per Line */}
              <div className="text-center">
                <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>Max Words per Line</label>
                <div className="flex gap-2 flex-wrap justify-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMaxWordsPerLine(num)}
                      className={`rounded px-3 py-2 text-sm transition ${maxWordsPerLine === num ? "font-medium" : "hover:opacity-80"}`}
                      style={{
                        color: maxWordsPerLine === num ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                        backgroundColor: maxWordsPerLine === num ? tv.bg.elevated : tv.bg.base
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Text Alignment */}
              <div className="flex gap-4 justify-center flex-wrap">
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>Text Size (rem)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.25"
                    value={settings.typingFontSize}
                    onChange={(e) => updateSettings({ typingFontSize: parseFloat(e.target.value) || 3 })}
                    className="w-28 rounded px-3 py-2 text-center focus:outline-none focus:ring-2"
                    style={{ backgroundColor: tv.bg.base, color: tv.text.primary, "--tw-ring-color": tv.interactive.secondary.DEFAULT } as React.CSSProperties}
                  />
                </div>
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: tv.text.secondary }}>Text Alignment</label>
                  <div className="flex gap-2 justify-center">
                    {(["left", "center", "right", "justify"] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => updateSettings({ textAlign: align })}
                        className={`rounded px-3 py-2 text-sm capitalize transition ${settings.textAlign === align ? "font-medium" : "hover:opacity-80"}`}
                        style={{
                          color: settings.textAlign === align ? tv.interactive.secondary.DEFAULT : tv.text.secondary,
                          backgroundColor: settings.textAlign === align ? tv.bg.elevated : tv.bg.base
                        }}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
