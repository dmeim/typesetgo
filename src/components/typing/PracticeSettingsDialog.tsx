import { useSoundPreview } from "@/hooks/useSoundPreview";
import { useState } from "react";
import { PlayIcon, XIcon } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TEXT_SIZE_MIN, TEXT_SIZE_MAX } from "./practice-config";
import type { SettingsState } from "@/lib/typing-constants";
import { type SoundManifest } from "@/lib/sounds";
import { TYPING_FONT_OPTIONS, getTypingFontFamily } from "@/lib/typing-fonts";
import { tv } from "@/lib/theme-vars";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const SETTINGS_TABS = [
  { id: "all", label: "All" },
  { id: "type", label: "Type" },
] as const;
const TEXT_ALIGN_OPTIONS = ["left", "center", "right", "justify"] as const;
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
  showSettings,
  setShowSettings,
  settings,
  updateSettings,
  linePreview,
  setLinePreview,
  maxWordsPerLine,
  setMaxWordsPerLine,
  soundManifest,
}: PracticeSettingsDialogProps) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabId>("all");
  const formatRemValue = (value: number) => {
    const normalized = value
      .toFixed(2)
      .replace(/\.00$/, "")
      .replace(/(\.\d)0$/, "$1");
    return `${normalized}rem`;
  };

  const getSoundPackOptions = (category: "typing" | "warning") => {
    if (!soundManifest?.[category]) return [];
    return Object.keys(soundManifest[category]);
  };

  const { play: playSettingsSoundPreview, error: previewError } = useSoundPreview(soundManifest,
    showSettings && settings.soundEnabled, `${settings.typingSound}:${settings.warningSound}`);

  const clampedTextSize = Math.max(TEXT_SIZE_MIN, Math.min(TEXT_SIZE_MAX, settings.typingFontSize));
  const clampedLinePreview = Math.max(1, Math.min(6, linePreview));
  const clampedMaxWordsPerLine = Math.max(1, Math.min(10, maxWordsPerLine));
  const typingSoundOptions = getSoundPackOptions("typing");
  const warningSoundOptions = getSoundPackOptions("warning");
  const selectedTypingSound = typingSoundOptions.includes(settings.typingSound) ? settings.typingSound : undefined;
  const selectedWarningSound = warningSoundOptions.includes(settings.warningSound) ? settings.warningSound : undefined;
  const closeSettingsModal = () => {
    setActiveSettingsTab("all");
    setShowSettings(false);
  };

  return (
    <Dialog
      open={showSettings}
      onOpenChange={(open) => {
        if (!open) closeSettingsModal();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(90dvh,760px)] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <div
          className="flex items-start justify-between gap-4 border-b px-6 py-5"
          style={{ borderColor: tv.border.subtle }}
        >
          <div>
            <DialogTitle className="text-xl font-semibold">Settings</DialogTitle>
            <DialogDescription className="mt-1">Choose your typing preferences.</DialogDescription>
          </div>
          <Button
            variant="outline"
            onClick={closeSettingsModal}
            className="rounded-md px-2.5 py-1.5 text-xl leading-none transition-colors"
            style={{ color: tv.ui.mutedForeground }}
            aria-label="Close settings"
            onMouseEnter={(e) => (e.currentTarget.style.color = tv.ui.foreground)}
            onMouseLeave={(e) => (e.currentTarget.style.color = tv.ui.mutedForeground)}
          >
            <XIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <Tabs value={activeSettingsTab} onValueChange={(value) => setActiveSettingsTab(value as SettingsTabId)} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <TabsList aria-label="Settings sections" className="mb-6 grid h-auto w-full grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
            {SETTINGS_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="py-2">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <section
              className="rounded-xl border p-5"
              style={{
                backgroundColor: tv.ui.background,
                borderColor: tv.border.subtle,
              }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold" style={{ color: tv.ui.foreground }}>
                  Text
                </h3>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    color: tv.ui.mutedForeground,
                    backgroundColor: tv.ui.card,
                  }}
                >
                  Display
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label
                    htmlFor="typing-font"
                    className="mb-2 block text-sm"
                    style={{ color: tv.ui.mutedForeground }}
                  >
                    Typing Font
                  </Label>
                  <Select
                    value={settings.typingFontFamily}
                    onValueChange={(value) => updateSettings({ typingFontFamily: value })}
                  >
                    <SelectTrigger
                      id="typing-font"
                      className="w-full"
                      style={{
                        backgroundColor: tv.ui.card,
                        borderColor: tv.border.subtle,
                        color: tv.ui.foreground,
                        fontFamily: getTypingFontFamily(settings.typingFontFamily),
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        backgroundColor: tv.ui.card,
                        borderColor: tv.border.subtle,
                      }}
                    >
                      {TYPING_FONT_OPTIONS.map((font) => (
                        <SelectItem
                          key={font.value}
                          value={font.value}
                          style={{
                            color: tv.ui.foreground,
                            fontFamily: font.fontFamily,
                          }}
                        >
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs" style={{ color: tv.ui.mutedForeground }}>
                    Changes the font used in the typing area only.
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-sm" style={{ color: tv.ui.mutedForeground }}>
                      Text Size
                    </Label>
                    <span className="text-sm font-medium" style={{ color: tv.ui.foreground }}>
                      {formatRemValue(clampedTextSize)}
                    </span>
                  </div>
                  <Slider
                    min={TEXT_SIZE_MIN}
                    max={TEXT_SIZE_MAX}
                    step={0.25}
                    value={[clampedTextSize]}
                    onValueChange={(value) => updateSettings({ typingFontSize: value[0] ?? 3 })}
                    aria-label="Text Size"
                    className="w-full [&_[data-slot=slider-range]]:bg-[var(--slider-range)] [&_[data-slot=slider-thumb]]:border-[var(--slider-range)] [&_[data-slot=slider-track]]:bg-[var(--slider-track)]"
                    style={{
                      ["--slider-range" as string]: tv.ui.primary,
                      ["--slider-track" as string]: tv.ui.card,
                    }}
                  />
                  <p className="mt-1 text-xs" style={{ color: tv.ui.mutedForeground }}>
                    Range: {TEXT_SIZE_MIN}rem to {TEXT_SIZE_MAX}rem
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t pt-4" style={{ borderColor: tv.border.subtle }}>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-sm" style={{ color: tv.ui.mutedForeground }}>
                    Text Alignment
                  </Label>
                  <span className="text-xs uppercase tracking-wide" style={{ color: tv.ui.mutedForeground }}>
                    {settings.textAlign}
                  </span>
                </div>

                <ToggleGroup type="single" value={settings.textAlign} aria-label="Text Alignment" spacing={1} className="w-full grid grid-cols-2 gap-2 sm:grid-cols-2">
                  {TEXT_ALIGN_OPTIONS.map((align) => {
                    const isActive = settings.textAlign === align;

                    return (
                      <ToggleGroupItem
                        value={String(align)}
                        key={align}
                        type="button"
                        onClick={() => updateSettings({ textAlign: align })}
                        className="rounded-md px-3 py-2 text-sm capitalize transition-colors"
                        style={{
                          color: isActive ? tv.ui.foreground : tv.ui.mutedForeground,
                          backgroundColor: isActive ? tv.ui.popover : tv.ui.card,
                          boxShadow: isActive ? `inset 0 0 0 1px ${tv.ui.primary}` : "none",
                        }}
                      >
                        {align}
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
              </div>
            </section>

            <section
              className="rounded-xl border p-5"
              style={{
                backgroundColor: tv.ui.background,
                borderColor: tv.border.subtle,
              }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold" style={{ color: tv.ui.foreground }}>
                    Sound
                  </h3>
                  <p className="text-xs" style={{ color: tv.ui.mutedForeground }}>
                    Typing, warning, and error feedback.
                  </p>
                </div>
                <Switch aria-label="Sound" checked={settings.soundEnabled} onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })} />
              </div>

              <div className={`space-y-3 ${!settings.soundEnabled ? "opacity-60" : ""}`}>
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <div>
                    <Label
                      htmlFor="typing-sound"
                      className="mb-2 block text-sm"
                      style={{ color: tv.ui.mutedForeground }}
                    >
                      Typing Sound
                    </Label>
                    <Select
                      value={selectedTypingSound}
                      onValueChange={(value) => updateSettings({ typingSound: value })}
                      disabled={!settings.soundEnabled || typingSoundOptions.length === 0}
                    >
                      <SelectTrigger
                        id="typing-sound"
                        className="w-full"
                        style={{
                          backgroundColor: tv.ui.card,
                          borderColor: tv.border.subtle,
                          color: tv.ui.foreground,
                        }}
                      >
                        <SelectValue
                          placeholder={typingSoundOptions.length === 0 ? "No packs found" : "Select typing sound"}
                        />
                      </SelectTrigger>
                      <SelectContent
                        style={{
                          backgroundColor: tv.ui.card,
                          borderColor: tv.border.subtle,
                        }}
                      >
                        {typingSoundOptions.map((pack) => (
                          <SelectItem key={pack} value={pack} style={{ color: tv.ui.foreground }}>
                            {pack.charAt(0).toUpperCase() + pack.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => selectedTypingSound && playSettingsSoundPreview("typing", selectedTypingSound)}
                    className="rounded-md border px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                    style={{
                      color: tv.ui.foreground,
                      backgroundColor: tv.ui.card,
                      borderColor: tv.border.subtle,
                    }}
                    disabled={!settings.soundEnabled || !selectedTypingSound || typingSoundOptions.length === 0}
                  >
                    <PlayIcon className="size-4 shrink-0" aria-hidden="true" />
                    Preview
                  </Button>
                </div>

                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <div>
                    <Label
                      htmlFor="warning-sound"
                      className="mb-2 block text-sm"
                      style={{ color: tv.ui.mutedForeground }}
                    >
                      Warning Sound
                    </Label>
                    <Select
                      value={selectedWarningSound}
                      onValueChange={(value) => updateSettings({ warningSound: value })}
                      disabled={!settings.soundEnabled || warningSoundOptions.length === 0}
                    >
                      <SelectTrigger
                        id="warning-sound"
                        className="w-full"
                        style={{
                          backgroundColor: tv.ui.card,
                          borderColor: tv.border.subtle,
                          color: tv.ui.foreground,
                        }}
                      >
                        <SelectValue
                          placeholder={warningSoundOptions.length === 0 ? "No packs found" : "Select warning sound"}
                        />
                      </SelectTrigger>
                      <SelectContent
                        style={{
                          backgroundColor: tv.ui.card,
                          borderColor: tv.border.subtle,
                        }}
                      >
                        {warningSoundOptions.map((pack) => (
                          <SelectItem key={pack} value={pack} style={{ color: tv.ui.foreground }}>
                            {pack.charAt(0).toUpperCase() + pack.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => selectedWarningSound && playSettingsSoundPreview("warning", selectedWarningSound)}
                    className="rounded-md border px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                    style={{
                      color: tv.ui.foreground,
                      backgroundColor: tv.ui.card,
                      borderColor: tv.border.subtle,
                    }}
                    disabled={!settings.soundEnabled || !selectedWarningSound || warningSoundOptions.length === 0}
                  >
                    <PlayIcon className="size-4 shrink-0" aria-hidden="true" />
                    Preview
                  </Button>
                </div>

                {previewError && <p role="alert" style={{ color: tv.ui.destructive }}>{previewError}</p>}
              </div>
            </section>

            <section
              className="rounded-xl border p-5"
              style={{
                backgroundColor: tv.ui.background,
                borderColor: tv.border.subtle,
              }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold" style={{ color: tv.ui.foreground }}>
                    Ghost
                  </h3>
                  <p className="text-xs" style={{ color: tv.ui.mutedForeground }}>
                    Pace guidance while typing.
                  </p>
                </div>
                <Switch aria-label="Ghost" checked={settings.ghostWriterEnabled} onCheckedChange={(checked) => updateSettings({ ghostWriterEnabled: checked })} />
              </div>

              <div className={`${!settings.ghostWriterEnabled ? "opacity-60" : ""}`}>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-sm" style={{ color: tv.ui.mutedForeground }}>
                    Target Speed
                  </Label>
                  <span className="text-sm font-medium" style={{ color: tv.ui.foreground }}>
                    {Math.max(1, Math.min(200, settings.ghostWriterSpeed))} WPM
                  </span>
                </div>
                <Slider
                  disabled={!settings.ghostWriterEnabled}
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
                    ["--slider-range" as string]: tv.ui.primary,
                    ["--slider-track" as string]: tv.ui.card,
                  }}
                />
              </div>
            </section>

            <section
              className="rounded-xl border p-5"
              style={{
                backgroundColor: tv.ui.background,
                borderColor: tv.border.subtle,
              }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold" style={{ color: tv.ui.foreground }}>
                    Keyboard
                  </h3>
                  <p className="text-xs" style={{ color: tv.ui.mutedForeground }}>
                    On-screen keyboard guide.
                  </p>
                </div>
                <Switch aria-label="Keyboard" checked={settings.showOnScreenKeyboard} onCheckedChange={(checked) => updateSettings({ showOnScreenKeyboard: checked })} />
              </div>

              <div className={`${!settings.showOnScreenKeyboard ? "opacity-60" : ""}`}>
                <Label className="mb-2 block text-sm" style={{ color: tv.ui.mutedForeground }}>
                  Layout
                </Label>
                <ToggleGroup type="single" value={settings.keyboardLayout} aria-label="Keyboard layout" spacing={1} className="w-full flex flex-wrap gap-2">
                  {(["qwerty", "dvorak", "colemak"] as const).map((layout) => (
                    <ToggleGroupItem
                      value={String(layout)}
                      key={layout}
                      disabled={!settings.showOnScreenKeyboard}
                      type="button"
                      onClick={() => updateSettings({ keyboardLayout: layout })}
                      className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                      style={{
                        color: settings.keyboardLayout === layout ? tv.ui.foreground : tv.ui.mutedForeground,
                        backgroundColor: settings.keyboardLayout === layout ? tv.ui.popover : tv.ui.card,
                        borderColor: settings.keyboardLayout === layout ? tv.ui.primary : tv.border.subtle,
                      }}
                    >
                      {layout.toUpperCase()}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="type">
            <section
              className="rounded-xl border p-5"
              style={{
                backgroundColor: tv.ui.background,
                borderColor: tv.border.subtle,
              }}
            >
              <h3 className="text-base font-semibold" style={{ color: tv.ui.foreground }}>
                Type
              </h3>
              <p className="mt-1 text-xs" style={{ color: tv.ui.mutedForeground }}>
                Control how much text is visible and how each line wraps.
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-sm" style={{ color: tv.ui.mutedForeground }}>
                      Preview Lines
                    </Label>
                    <span className="text-sm font-medium" style={{ color: tv.ui.foreground }}>
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
                      ["--slider-range" as string]: tv.ui.primary,
                      ["--slider-track" as string]: tv.ui.card,
                    }}
                  />
                </div>

                <div className="border-t pt-4" style={{ borderColor: tv.border.subtle }}>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-sm" style={{ color: tv.ui.mutedForeground }}>
                      Max Words Per Line
                    </Label>
                    <span className="text-sm font-medium" style={{ color: tv.ui.foreground }}>
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
                      ["--slider-range" as string]: tv.ui.primary,
                      ["--slider-track" as string]: tv.ui.card,
                    }}
                  />
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
