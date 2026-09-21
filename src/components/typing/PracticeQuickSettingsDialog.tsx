import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { tv } from "@/lib/theme-vars";
import { MODE_SELECTOR_OPTIONS, TIME_PRESETS, WORD_PRESETS, TEXT_SIZE_MIN, TEXT_SIZE_MAX } from "./practice-config";
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
  showQuickSettings,
  setShowQuickSettings,
  linePreview,
  setLinePreview,
  maxWordsPerLine,
  setMaxWordsPerLine,
}: PracticeQuickSettingsDialogProps) {
  return (
    <Dialog open={showQuickSettings} onOpenChange={setShowQuickSettings}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[85dvh] overflow-y-auto" aria-describedby={undefined}>
        <div className="flex items-center justify-between mb-6">
          <DialogTitle>Quick Settings</DialogTitle>
        </div>

        <div className="space-y-6">
          {/* Test Mode */}
          <div className="text-center">
            <label className="mb-2 block text-sm" style={{ color: tv.ui.mutedForeground }}>
              Mode
            </label>
            <ToggleGroup type="single" value={isKidMode ? "kid" : settings.mode} aria-label="Mode" spacing={1} className="flex gap-2 flex-wrap justify-center">
              {MODE_SELECTOR_OPTIONS.map((m) => {
                const isModeActive = m === "kid" ? isKidMode : !isKidMode && settings.mode === m;
                return (
                  <ToggleGroupItem
                    value={String(m)}
                    key={m}
                    onClick={() => handleModeSelect(m)}
                    className={`rounded px-4 py-2 text-sm capitalize transition ${isModeActive ? "font-medium" : "hover:opacity-80"}`}
                    style={{
                      color: isModeActive ? tv.ui.primary : tv.ui.mutedForeground,
                      backgroundColor: isModeActive ? tv.ui.popover : tv.ui.background,
                    }}
                  >
                    {m}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>

          {/* Duration / Word Count / Quote Length */}
          {settings.mode === "time" && (
            <div className="text-center">
              <label className="mb-2 block text-sm" style={{ color: tv.ui.mutedForeground }}>
                Duration
              </label>
              <ToggleGroup type="single" value={String(settings.duration)} aria-label="Duration" spacing={1} className="flex gap-2 flex-wrap justify-center">
                {TIME_PRESETS.map((d) => (
                  <ToggleGroupItem
                    value={String(d)}
                    key={d}
                    onClick={() => {
                      if (settings.duration === d) generateTest();
                      else updateSettings({ duration: d });
                    }}
                    className={`rounded px-4 py-2 text-sm transition ${settings.duration === d ? "font-medium" : "hover:opacity-80"}`}
                    style={{
                      color: settings.duration === d ? tv.ui.primary : tv.ui.mutedForeground,
                      backgroundColor: settings.duration === d ? tv.ui.popover : tv.ui.background,
                    }}
                  >
                    {d}s
                  </ToggleGroupItem>
                ))}
                <Button
                  variant="ghost"
                  onClick={() => {
                    openCustomCountModal();
                  }}
                  className={`rounded px-4 py-2 text-sm transition ${isCustomDurationSelected ? "font-medium" : "hover:opacity-80"}`}
                  style={{
                    color: isCustomDurationSelected ? tv.ui.primary : tv.ui.mutedForeground,
                    backgroundColor: isCustomDurationSelected ? tv.ui.popover : tv.ui.background,
                  }}
                >
                  <SlidersHorizontalIcon className="size-4 shrink-0" aria-hidden="true" />
                  custom
                </Button>
              </ToggleGroup>
            </div>
          )}

          {settings.mode === "words" && (
            <div className="text-center">
              <label className="mb-2 block text-sm" style={{ color: tv.ui.mutedForeground }}>
                Word Count
              </label>
              <ToggleGroup type="single" value={String(settings.wordTarget)} aria-label="Word Count" spacing={1} className="flex gap-2 flex-wrap justify-center">
                {WORD_PRESETS.map((w) => (
                  <ToggleGroupItem
                    value={String(w)}
                    key={w}
                    onClick={() => {
                      if (settings.wordTarget === w) generateTest();
                      else updateSettings({ wordTarget: w });
                    }}
                    className={`rounded px-4 py-2 text-sm transition ${settings.wordTarget === w ? "font-medium" : "hover:opacity-80"}`}
                    style={{
                      color: settings.wordTarget === w ? tv.ui.primary : tv.ui.mutedForeground,
                      backgroundColor: settings.wordTarget === w ? tv.ui.popover : tv.ui.background,
                    }}
                  >
                    {w}
                  </ToggleGroupItem>
                ))}
                <Button
                  variant="ghost"
                  onClick={() => {
                    openCustomCountModal();
                  }}
                  className={`rounded px-4 py-2 text-sm transition ${isCustomWordTargetSelected ? "font-medium" : "hover:opacity-80"}`}
                  style={{
                    color: isCustomWordTargetSelected ? tv.ui.primary : tv.ui.mutedForeground,
                    backgroundColor: isCustomWordTargetSelected ? tv.ui.popover : tv.ui.background,
                  }}
                >
                  <SlidersHorizontalIcon className="size-4 shrink-0" aria-hidden="true" />
                  custom
                </Button>
              </ToggleGroup>
            </div>
          )}

          {settings.mode === "quote" && quotesManifest && (
            <div className="text-center">
              <label className="mb-2 block text-sm" style={{ color: tv.ui.mutedForeground }}>
                Quote Length
              </label>
              <ToggleGroup type="single" value={settings.quoteLength} aria-label="Quote Length" spacing={1} className="flex gap-2 flex-wrap justify-center">
                {["all", ...quotesManifest.lengths].map((l) => (
                  <ToggleGroupItem
                    value={String(l)}
                    key={l}
                    onClick={() => {
                      if (settings.quoteLength === l) generateTest();
                      else
                        updateSettings({
                          quoteLength: l as typeof settings.quoteLength,
                        });
                    }}
                    className={`rounded px-4 py-2 text-sm transition ${settings.quoteLength === l ? "font-medium" : "hover:opacity-80"}`}
                    style={{
                      color: settings.quoteLength === l ? tv.ui.primary : tv.ui.mutedForeground,
                      backgroundColor: settings.quoteLength === l ? tv.ui.popover : tv.ui.background,
                    }}
                  >
                    {l}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          {/* Difficulty */}
          {settings.mode !== "quote" && wordsManifest && (
            <div className="text-center">
              <label className="mb-2 block text-sm" style={{ color: tv.ui.mutedForeground }}>
                Difficulty
              </label>
              <ToggleGroup type="single" value={settings.difficulty} aria-label="Difficulty" spacing={1} className="flex gap-2 flex-wrap justify-center">
                {wordsManifest.difficulties.map((d) => (
                  <ToggleGroupItem
                    value={String(d)}
                    key={d}
                    onClick={() => {
                      if (settings.difficulty === d) generateTest();
                      else
                        updateSettings({
                          difficulty: d as typeof settings.difficulty,
                        });
                    }}
                    className={`rounded px-4 py-2 text-sm capitalize transition ${settings.difficulty === d ? "font-medium" : "hover:opacity-80"}`}
                    style={{
                      color: settings.difficulty === d ? tv.ui.primary : tv.ui.mutedForeground,
                      backgroundColor: settings.difficulty === d ? tv.ui.popover : tv.ui.background,
                    }}
                  >
                    {d}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          {/* Modifiers */}
          <div className="text-center">
            <label className="mb-2 block text-sm" style={{ color: tv.ui.mutedForeground }}>
              Modifiers
            </label>
            <div className="flex gap-3 flex-wrap justify-center">
              <Toggle
                pressed={settings.capitalization}
                onPressedChange={(pressed) => updateSettings({ capitalization: pressed })}
                disabled={settings.mode === "quote"}
                className={`rounded px-4 py-2 text-sm transition ${settings.capitalization ? "font-medium" : "hover:opacity-80"}`}
                style={{
                  color: settings.capitalization ? tv.ui.primary : tv.ui.mutedForeground,
                  backgroundColor: settings.capitalization ? tv.ui.popover : tv.ui.background,
                  opacity: settings.mode === "quote" ? 0.5 : 1,
                }}
              >
                Aa caps
              </Toggle>
              <Toggle
                pressed={settings.punctuation}
                onPressedChange={(pressed) => updateSettings({ punctuation: pressed })}
                disabled={settings.mode === "quote"}
                className={`rounded px-4 py-2 text-sm transition ${settings.punctuation ? "font-medium" : "hover:opacity-80"}`}
                style={{
                  color: settings.punctuation ? tv.ui.primary : tv.ui.mutedForeground,
                  backgroundColor: settings.punctuation ? tv.ui.popover : tv.ui.background,
                  opacity: settings.mode === "quote" ? 0.5 : 1,
                }}
              >
                @ punctuation
              </Toggle>
              <Toggle
                pressed={settings.numbers}
                onPressedChange={(pressed) => updateSettings({ numbers: pressed })}
                disabled={settings.mode === "quote"}
                className={`rounded px-4 py-2 text-sm transition ${settings.numbers ? "font-medium" : "hover:opacity-80"}`}
                style={{
                  color: settings.numbers ? tv.ui.primary : tv.ui.mutedForeground,
                  backgroundColor: settings.numbers ? tv.ui.popover : tv.ui.background,
                  opacity: settings.mode === "quote" ? 0.5 : 1,
                }}
              >
                # numbers
              </Toggle>
            </div>
          </div>

          {/* Line Preview */}
          <div className="text-center">
            <label className="mb-2 block text-sm" style={{ color: tv.ui.mutedForeground }}>
              Lines to Preview
            </label>
            <ToggleGroup type="single" value={String(linePreview)} aria-label="Lines to Preview" spacing={1} className="flex gap-2 flex-wrap justify-center">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <ToggleGroupItem
                  value={String(num)}
                  key={num}
                  onClick={() => setLinePreview(num)}
                  className={`rounded px-3 py-2 text-sm transition ${linePreview === num ? "font-medium" : "hover:opacity-80"}`}
                  style={{
                    color: linePreview === num ? tv.ui.primary : tv.ui.mutedForeground,
                    backgroundColor: linePreview === num ? tv.ui.popover : tv.ui.background,
                  }}
                >
                  {num}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Max Words per Line */}
          <div className="text-center">
            <label className="mb-2 block text-sm" style={{ color: tv.ui.mutedForeground }}>
              Max Words per Line
            </label>
            <ToggleGroup type="single" value={String(maxWordsPerLine)} aria-label="Max Words per Line" spacing={1} className="flex gap-2 flex-wrap justify-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <ToggleGroupItem
                  value={String(num)}
                  key={num}
                  onClick={() => setMaxWordsPerLine(num)}
                  className={`rounded px-3 py-2 text-sm transition ${maxWordsPerLine === num ? "font-medium" : "hover:opacity-80"}`}
                  style={{
                    color: maxWordsPerLine === num ? tv.ui.primary : tv.ui.mutedForeground,
                    backgroundColor: maxWordsPerLine === num ? tv.ui.popover : tv.ui.background,
                  }}
                >
                  {num}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Font Size & Text Alignment */}
          <div className="flex gap-4 justify-center flex-wrap">
            <div className="text-center">
              <label className="mb-2 block text-sm" style={{ color: tv.ui.mutedForeground }}>
                Text Size (rem)
              </label>
              <Input
                aria-label="Text Size (rem)"
                type="number"
                min={TEXT_SIZE_MIN}
                max={TEXT_SIZE_MAX}
                step="0.25"
                value={settings.typingFontSize}
                onChange={(e) =>
                  updateSettings({
                    typingFontSize: Math.max(
                      TEXT_SIZE_MIN,
                      Math.min(TEXT_SIZE_MAX, parseFloat(e.target.value) || TEXT_SIZE_MIN),
                    ),
                  })
                }
                className="w-28 rounded px-3 py-2 text-center focus:outline-none focus:ring-2"
                style={
                  {
                    backgroundColor: tv.ui.background,
                    color: tv.ui.foreground,
                    "--tw-ring-color": tv.ui.primary,
                  } as React.CSSProperties
                }
              />
            </div>
            <div className="text-center">
              <label className="mb-2 block text-sm" style={{ color: tv.ui.mutedForeground }}>
                Text Alignment
              </label>
              <ToggleGroup type="single" value={settings.textAlign} aria-label="Text Alignment" spacing={1} className="flex flex-wrap gap-2 justify-center">
                {(["left", "center", "right", "justify"] as const).map((align) => (
                  <ToggleGroupItem
                    value={String(align)}
                    key={align}
                    onClick={() => updateSettings({ textAlign: align })}
                    className={`rounded px-3 py-2 text-sm capitalize transition ${settings.textAlign === align ? "font-medium" : "hover:opacity-80"}`}
                    style={{
                      color: settings.textAlign === align ? tv.ui.primary : tv.ui.mutedForeground,
                      backgroundColor: settings.textAlign === align ? tv.ui.popover : tv.ui.background,
                    }}
                  >
                    {align}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
