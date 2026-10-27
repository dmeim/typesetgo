import { motion } from "framer-motion";
import { CheckCircleIcon, PlayIcon } from "@phosphor-icons/react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useSoundPreview } from "@/hooks/useSoundPreview";
import { KEYBOARD_LAYOUTS, type KeyboardLayoutId } from "@/lib/keyboard-layouts";
import { KEYBOARD_STYLES, type KeyboardStyle } from "@/lib/keyboard-model";
import { MAX_GHOST_SPEED, TEXT_SIZE_MAX, TEXT_SIZE_MIN } from "@/lib/practice-limits";
import { getSoundPacks } from "@/lib/sounds";
import { TYPING_FONT_OPTIONS, getTypingFontFamily } from "@/lib/typing-fonts";
import { cn } from "@/lib/utils";
import { KeyboardPreview } from "./KeyboardPreview";
import type { ProfileSettings, ProfileSettingsUpdate } from "./profile-settings";
import { RowGroup, Segmented, SettingRow, SettingSlider, SettingSwitch } from "./settings-controls";
import { useSoundManifest } from "./theme-catalog";

interface PanelProps {
  settings: ProfileSettings;
  update: ProfileSettingsUpdate;
}

const fontOptions = TYPING_FONT_OPTIONS.map((font) => ({ value: font.value, label: font.label }));
const LAYOUT_IDS = Object.keys(KEYBOARD_LAYOUTS) as KeyboardLayoutId[];

export function TextPanel({ settings, update }: PanelProps) {
  return (
    <RowGroup>
      <SettingRow label="Font" hint="Only changes the words you type.">
        <div className="w-48" style={{ fontFamily: getTypingFontFamily(settings.typingFontFamily) }}>
          <NativeSelect aria-label="Font" value={settings.typingFontFamily} onChange={(event) => update({ typingFontFamily: event.target.value })}>
            {fontOptions.map((font) => <NativeSelectOption key={font.value} value={font.value}>{font.label}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </SettingRow>
      <div className="px-4 py-3">
        <SettingSlider label="Text size" value={settings.typingFontSize} min={TEXT_SIZE_MIN} max={TEXT_SIZE_MAX} step={0.25} onChange={(typingFontSize) => update({ typingFontSize })} format={(value) => `${value}rem`} />
      </div>
      <SettingRow label="Alignment" stacked>
        <Segmented
          label="Alignment"
          value={settings.textAlign}
          onChange={(textAlign) => update({ textAlign })}
          options={(["left", "center", "right", "justify"] as const).map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))}
        />
      </SettingRow>
    </RowGroup>
  );
}

export function TypingPanel({ settings, update }: PanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <RowGroup title="What you see">
        <div className="px-4 py-3"><SettingSlider label="Lines shown" value={settings.linePreview} min={1} max={6} step={1} onChange={(linePreview) => update({ linePreview })} format={(value) => `${value} ${value === 1 ? "line" : "lines"}`} /></div>
        <div className="px-4 py-3"><SettingSlider label="Words per line" value={settings.maxWordsPerLine} min={1} max={10} step={1} onChange={(maxWordsPerLine) => update({ maxWordsPerLine })} format={(value) => `${value} ${value === 1 ? "word" : "words"}`} /></div>
      </RowGroup>
      <RowGroup title="Ghost racer">
        <SettingRow label="Race a ghost" hint="A second cursor typing at your target speed.">
          <SettingSwitch label="Race a ghost" checked={settings.ghostWriterEnabled} onChange={(ghostWriterEnabled) => update({ ghostWriterEnabled })} />
        </SettingRow>
        <motion.div animate={{ opacity: settings.ghostWriterEnabled ? 1 : 0.45 }} className="px-4 py-3">
          <SettingSlider label="Ghost speed" value={settings.ghostWriterSpeed} min={10} max={MAX_GHOST_SPEED} step={5} onChange={(ghostWriterSpeed) => update({ ghostWriterSpeed })} format={(value) => `${value} wpm`} />
        </motion.div>
      </RowGroup>
    </div>
  );
}

export function SoundPanel({ settings, update }: PanelProps) {
  const manifest = useSoundManifest();
  const { play, error } = useSoundPreview(manifest, settings.soundEnabled, `${settings.typingSound}:${settings.warningSound}`);
  const select = (category: "typing" | "warning", label: string, value: string, onChange: (value: string) => void) => {
    const options = getSoundPacks(manifest, category);
    return (
      <div className="flex items-center gap-2">
        <div className="w-40">
          <NativeSelect aria-label={label} value={value} disabled={!settings.soundEnabled || options.length === 0} onChange={(event) => onChange(event.target.value)}>
            {options.length === 0 && <NativeSelectOption value={value}>{manifest ? "No packs found" : value}</NativeSelectOption>}
            {options.map((pack) => <NativeSelectOption key={pack} value={pack}>{pack}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <button
          type="button"
          aria-label={`Preview ${label.toLowerCase()}`}
          disabled={!settings.soundEnabled || options.length === 0}
          onClick={() => play(category, value)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
        >
          <PlayIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-2">
      <RowGroup>
        <SettingRow label="Sound" hint="Turn every sound on or off.">
          <SettingSwitch label="Sound" checked={settings.soundEnabled} onChange={(soundEnabled) => update({ soundEnabled })} />
        </SettingRow>
        <motion.div animate={{ opacity: settings.soundEnabled ? 1 : 0.45 }} className="divide-y divide-border">
          <SettingRow label="Typing sound">{select("typing", "Typing sound", settings.typingSound, (typingSound) => update({ typingSound }))}</SettingRow>
          <SettingRow label="Warning sound" hint="Plays five seconds before time is up.">{select("warning", "Warning sound", settings.warningSound, (warningSound) => update({ warningSound }))}</SettingRow>
        </motion.div>
      </RowGroup>
      {error && <p role="alert" className="px-4 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function KeyboardLayoutPicker({ value, onChange }: { value: KeyboardLayoutId; onChange: (value: KeyboardLayoutId) => void }) {
  return (
    <Segmented label="Keyboard layout" value={value} onChange={onChange}
      options={LAYOUT_IDS.map((id) => ({ value: id, label: KEYBOARD_LAYOUTS[id].name }))} />
  );
}

export function KeyboardPanel({ settings, update }: PanelProps) {
  return (
    <RowGroup>
      <SettingRow label="On-screen keyboard" hint="Lights up the next key to press.">
        <SettingSwitch label="On-screen keyboard" checked={settings.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => update({ showOnScreenKeyboard })} />
      </SettingRow>
      <motion.div animate={{ opacity: settings.showOnScreenKeyboard ? 1 : 0.45 }} className="divide-y divide-border">
        <SettingRow label="Style" hint="How the keyboard looks while you practise." stacked>
          <StylePicker value={settings.keyboardStyle} layoutId={settings.keyboardLayout} onChange={(keyboardStyle) => update({ keyboardStyle })} />
        </SettingRow>
        <SettingRow label="Layout" stacked>
          <KeyboardLayoutPicker value={settings.keyboardLayout} onChange={(keyboardLayout) => update({ keyboardLayout })} />
        </SettingRow>
      </motion.div>
    </RowGroup>
  );
}

const STYLE_BADGES: Partial<Record<KeyboardStyle, string>> = { spotlight: "Default" };

/** One card per keyboard style, each with the real keyboard waiting on the same key. */
export function StylePicker({ value, layoutId, onChange, badges = STYLE_BADGES }: {
  value: KeyboardStyle;
  layoutId: KeyboardLayoutId;
  onChange: (value: KeyboardStyle) => void;
  badges?: Partial<Record<KeyboardStyle, string>>;
}) {
  return (
    <div role="radiogroup" aria-label="Keyboard style" className="grid gap-3 sm:grid-cols-2">
      {KEYBOARD_STYLES.map((style) => {
        const selected = value === style.value;
        return (
          <button
            key={style.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(style.value)}
            className={cn(
              "flex flex-col gap-3 rounded-2xl border bg-background p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-muted-foreground",
            )}
          >
            <span aria-hidden="true" className="pointer-events-none flex min-h-28 flex-1 items-center rounded-xl bg-card px-2 py-3">
              <KeyboardPreview style={style.value} layoutId={layoutId} nextChar="t" bare />
            </span>
            <span className="flex items-start justify-between gap-2">
              <span className="flex flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {style.name}
                  {badges[style.value] && <span className="rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-medium text-primary">{badges[style.value]}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{style.summary}</span>
              </span>
              {selected && <CheckCircleIcon className="size-5 shrink-0 text-primary" weight="fill" aria-hidden="true" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
