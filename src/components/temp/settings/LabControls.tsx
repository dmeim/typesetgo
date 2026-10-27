import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { CheckCircleIcon, MoonIcon, PlayIcon, SunIcon } from "@phosphor-icons/react";
import { Slider } from "@/components/ui/slider";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { TYPING_FONT_OPTIONS, getTypingFontFamily } from "@/lib/typing-fonts";
import { cn } from "@/lib/utils";
import { KeyboardStyleView } from "@/components/temp/keyboard/KeyboardStyleView";
import { KEYBOARD_STYLES, type KeyboardStyle } from "@/components/temp/keyboard/keyboard-mock";
import type { ThemeMode } from "@/types/theme";
import { LAB_SPRING, type LabSettings } from "./lab-settings";
import { useSoundPacks } from "./useLabSettings";

type Update = (changes: Partial<LabSettings>) => void;

export function LabSwitch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${checked ? "justify-end bg-primary" : "justify-start bg-muted"}`}
    >
      <motion.span layout transition={LAB_SPRING} className="size-6 rounded-full bg-background shadow" />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label, className = "" }: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={`flex rounded-xl bg-muted/60 p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${value === option.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {value === option.value && <motion.span layoutId={`segment-${id}`} transition={LAB_SPRING} className="absolute inset-0 rounded-lg bg-card shadow-sm" />}
          <span className="relative flex items-center gap-1.5">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function LabSlider({ label, value, min, max, step, onChange, format }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <motion.span key={value} initial={{ y: -4, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="tabular-nums text-muted-foreground">{format(value)}</motion.span>
      </div>
      <Slider aria-label={label} value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onChange(next)} />
    </div>
  );
}

/** One labelled line in a grouped list: label and hint on the left, control on the right. */
export function SettingRow({ label, hint, children, stacked = false }: { label: string; hint?: string; children: ReactNode; stacked?: boolean }) {
  return (
    <div className={`flex gap-3 px-4 py-3 ${stacked ? "flex-col" : "flex-wrap items-center justify-between"}`}>
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

/** iOS-style inset group: rounded card with hairline dividers between rows. */
export function RowGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {title && <h3 className="px-4 text-xs uppercase tracking-wider text-muted-foreground">{title}</h3>}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{children}</div>
    </div>
  );
}

const fontOptions = TYPING_FONT_OPTIONS.map((font) => ({ value: font.value, label: font.label }));

export function TextPanel({ settings, update }: { settings: LabSettings; update: Update }) {
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
        <LabSlider label="Text size" value={settings.typingFontSize} min={1} max={6} step={0.25} onChange={(typingFontSize) => update({ typingFontSize })} format={(value) => `${value}rem`} />
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

export function TypingPanel({ settings, update }: { settings: LabSettings; update: Update }) {
  return (
    <div className="flex flex-col gap-5">
      <RowGroup title="What you see">
        <div className="px-4 py-3"><LabSlider label="Lines shown" value={settings.linePreview} min={1} max={6} step={1} onChange={(linePreview) => update({ linePreview })} format={(value) => `${value} ${value === 1 ? "line" : "lines"}`} /></div>
        <div className="px-4 py-3"><LabSlider label="Words per line" value={settings.maxWordsPerLine} min={1} max={10} step={1} onChange={(maxWordsPerLine) => update({ maxWordsPerLine })} format={(value) => `${value} words`} /></div>
      </RowGroup>
      <RowGroup title="Ghost racer">
        <SettingRow label="Race a ghost" hint="A second cursor typing at your target speed.">
          <LabSwitch label="Race a ghost" checked={settings.ghostWriterEnabled} onChange={(ghostWriterEnabled) => update({ ghostWriterEnabled })} />
        </SettingRow>
        <motion.div animate={{ opacity: settings.ghostWriterEnabled ? 1 : 0.45 }} className="px-4 py-3">
          <LabSlider label="Ghost speed" value={settings.ghostWriterSpeed} min={10} max={200} step={5} onChange={(ghostWriterSpeed) => update({ ghostWriterSpeed })} format={(value) => `${value} wpm`} />
        </motion.div>
      </RowGroup>
    </div>
  );
}

export function SoundPanel({ settings, update }: { settings: LabSettings; update: Update }) {
  const packs = useSoundPacks();
  const select = (label: string, value: string, options: string[], onChange: (value: string) => void) => (
    <div className="flex items-center gap-2">
      <div className="w-40">
        <NativeSelect aria-label={label} value={value} disabled={!settings.soundEnabled || options.length === 0} onChange={(event) => onChange(event.target.value)}>
          {options.length === 0 && <NativeSelectOption value={value}>No packs found</NativeSelectOption>}
          {options.map((pack) => <NativeSelectOption key={pack} value={pack}>{pack}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <button type="button" aria-label={`Preview ${label.toLowerCase()}`} disabled={!settings.soundEnabled} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40">
        <PlayIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
  return (
    <RowGroup>
      <SettingRow label="Sound" hint="Turn every sound on or off.">
        <LabSwitch label="Sound" checked={settings.soundEnabled} onChange={(soundEnabled) => update({ soundEnabled })} />
      </SettingRow>
      <motion.div animate={{ opacity: settings.soundEnabled ? 1 : 0.45 }} className="divide-y divide-border">
        <SettingRow label="Typing sound">{select("Typing sound", settings.typingSound, packs.typing, (typingSound) => update({ typingSound }))}</SettingRow>
        <SettingRow label="Warning sound" hint="Plays five seconds before time is up.">{select("Warning sound", settings.warningSound, packs.warning, (warningSound) => update({ warningSound }))}</SettingRow>
      </motion.div>
    </RowGroup>
  );
}

export function KeyboardPanel({ settings, update }: { settings: LabSettings; update: Update }) {
  return (
    <RowGroup>
      <SettingRow label="On-screen keyboard" hint="Lights up the next key to press.">
        <LabSwitch label="On-screen keyboard" checked={settings.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => update({ showOnScreenKeyboard })} />
      </SettingRow>
      <motion.div animate={{ opacity: settings.showOnScreenKeyboard ? 1 : 0.45 }} className="divide-y divide-border">
        <SettingRow label="Style" hint="How the keyboard looks while you practise." stacked>
          <StylePicker value={settings.keyboardStyle} layoutId={settings.keyboardLayout} onChange={(keyboardStyle) => update({ keyboardStyle })} />
        </SettingRow>
        <SettingRow label="In Kids mode" hint="Kids mode always shows the keyboard, in this style." stacked>
          <Segmented label="Kids mode keyboard style" value={settings.kidsKeyboardStyle} onChange={(kidsKeyboardStyle) => update({ kidsKeyboardStyle })}
            options={KEYBOARD_STYLES.map((style) => ({ value: style.value, label: style.name }))} />
        </SettingRow>
        <SettingRow label="Layout" stacked>
          <Segmented label="Keyboard layout" value={settings.keyboardLayout} onChange={(keyboardLayout) => update({ keyboardLayout })}
            options={(["qwerty", "dvorak", "colemak"] as const).map((value) => ({ value, label: value.toUpperCase() }))} />
        </SettingRow>
      </motion.div>
    </RowGroup>
  );
}

const STYLE_BADGES: Partial<Record<KeyboardStyle, string>> = { spotlight: "Default", finger: "Kids mode default" };

/** One card per keyboard style, each with a live mini keyboard waiting on the same key. */
export function StylePicker({ value, layoutId, onChange }: { value: KeyboardStyle; layoutId: LabSettings["keyboardLayout"]; onChange: (value: KeyboardStyle) => void }) {
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
              <KeyboardStyleView style={style.value} layoutId={layoutId} nextChar="t" bare />
            </span>
            <span className="flex items-start justify-between gap-2">
              <span className="flex flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {style.name}
                  {STYLE_BADGES[style.value] && <span className="rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-medium text-primary">{STYLE_BADGES[style.value]}</span>}
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

export function ModeSegmented({ mode, onChange, lightAvailable }: { mode: ThemeMode; onChange: (mode: ThemeMode) => void; lightAvailable: boolean }) {
  return (
    <Segmented
      label="Light or dark"
      value={lightAvailable ? mode : "dark"}
      onChange={(next) => { if (next === "dark" || lightAvailable) onChange(next); }}
      options={[
        { value: "dark", label: <><MoonIcon className="size-4" aria-hidden="true" />Dark</> },
        { value: "light", label: <span className={lightAvailable ? "" : "opacity-40"}><SunIcon className="mr-1.5 inline size-4" aria-hidden="true" />Light</span> },
      ]}
    />
  );
}

/** Four catalogue colours as overlapping dots. */
export function Swatches({ colors, size = "size-4" }: { colors: string[]; size?: string }) {
  return (
    <span className="flex -space-x-1" aria-hidden="true">
      {colors.map((color, index) => <span key={index} className={`${size} rounded-full ring-2 ring-card`} style={{ backgroundColor: color }} />)}
    </span>
  );
}
