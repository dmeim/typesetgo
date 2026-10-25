import { useEffect, useId, useState, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { ConnectOverrides } from "@/lib/connect-types";
import { MAX_GHOST_SPEED, TEXT_SIZE_MAX, TEXT_SIZE_MIN } from "@/lib/practice-limits";
import { fetchSoundManifest, getSoundPacks, type SoundManifest } from "@/lib/sounds";
import { TYPING_FONT_OPTIONS } from "@/lib/typing-fonts";
import { Segmented } from "./Segmented";
import { ThemeOverride } from "./ThemeOverride";
import { OVERRIDE_DEFAULTS, type OverrideGroups as Groups } from "./override-defaults";

type GroupKey = keyof Groups;

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function OverrideGroup({ title, description, enabled, onToggle, children }: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <fieldset className="min-w-0 space-y-3 border-t border-border pt-4 first-of-type:border-t-0 first-of-type:pt-0">
      <legend className="sr-only">{title}</legend>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 font-medium">{title}</h3>
          <div className="flex shrink-0 items-center gap-2">
            <Label htmlFor={`${id}-switch`} className="text-xs font-normal text-muted-foreground">Use room setting</Label>
            <Switch id={`${id}-switch`} aria-label={`Use room setting for ${title.toLowerCase()}`} checked={enabled} onCheckedChange={onToggle} />
          </div>
        </div>
        <p id={`${id}-state`} className="text-xs text-muted-foreground">{enabled ? description : "Participants keep their own setting."}</p>
      </div>
      <fieldset disabled={!enabled} aria-describedby={`${id}-state`} className={enabled ? "space-y-3" : "space-y-3 opacity-60"}>
        {children}
      </fieldset>
    </fieldset>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const known = options.some((option) => option.value === value);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {!known && <NativeSelectOption value={value}>{capitalize(value)}</NativeSelectOption>}
        {options.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  );
}

function SliderField({ label, value, min, max, step, format, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label id={id}>{label}</Label>
        <span className="text-sm tabular-nums text-muted-foreground">{format(value)}</span>
      </div>
      <Slider aria-labelledby={id} min={min} max={max} step={step} value={[value]} onValueChange={([next]) => onChange(next)} />
    </div>
  );
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function useSoundOptions() {
  const [manifest, setManifest] = useState<SoundManifest | null>(null);
  useEffect(() => {
    let current = true;
    void fetchSoundManifest().then((value) => { if (current) setManifest(value); });
    return () => { current = false; };
  }, []);
  const options = (category: string) => getSoundPacks(manifest, category).map((pack) => ({ value: pack, label: capitalize(pack) }));
  return { typing: options("typing"), warning: options("warning") };
}

export function OverridesPanel({ overrides, onChange }: {
  overrides: ConnectOverrides;
  onChange: (next: ConnectOverrides, options?: { debounce?: boolean }) => void;
}) {
  const sounds = useSoundOptions();
  const group = <K extends GroupKey>(key: K): Groups[K] => ({ ...OVERRIDE_DEFAULTS[key], ...overrides[key] });
  const set = <K extends GroupKey>(key: K, patch: Partial<Groups[K]>, debounce = false) =>
    onChange({ ...overrides, [key]: { ...group(key), ...patch } }, { debounce });
  const theme = group("theme");
  const typography = group("typography");
  const ghost = group("ghost");
  const sound = group("sound");
  const keyboard = group("keyboard");

  return (
    <section aria-labelledby="connect-overrides-heading" className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-5">
      <div>
        <h2 id="connect-overrides-heading" className="text-lg font-semibold">Participant settings</h2>
        <p className="text-sm text-muted-foreground">Turn a group on to apply it to everyone. Changes reach participants right away.</p>
      </div>
      <OverrideGroup title="Theme" description="Everyone sees the room theme." enabled={theme.enabled} onToggle={(enabled) => set("theme", { enabled })}>
        <ThemeOverride value={theme} onChange={(value) => set("theme", value)} />
      </OverrideGroup>
      <OverrideGroup title="Text" description="Everyone uses this font, size, and alignment." enabled={typography.enabled} onToggle={(enabled) => set("typography", { enabled })}>
        <SelectField
          label="Font"
          value={typography.typingFontFamily}
          options={TYPING_FONT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          onChange={(typingFontFamily) => set("typography", { typingFontFamily })}
        />
        <SliderField
          label="Text size"
          value={typography.typingFontSize}
          min={TEXT_SIZE_MIN}
          max={TEXT_SIZE_MAX}
          step={0.25}
          format={(value) => `${value.toFixed(2)}rem`}
          onChange={(typingFontSize) => set("typography", { typingFontSize }, true)}
        />
        <Segmented<Groups["typography"]["textAlign"]>
          label="Text alignment"
          value={typography.textAlign}
          onChange={(textAlign) => set("typography", { textAlign })}
          options={(["left", "center", "right", "justify"] as const).map((value) => ({ value, label: capitalize(value) }))}
        />
      </OverrideGroup>
      <OverrideGroup title="Ghost writer" description="A pacing cursor shows the target speed." enabled={ghost.enabled} onToggle={(enabled) => set("ghost", { enabled })}>
        <SwitchField label="Show ghost writer" checked={ghost.ghostWriterEnabled} onChange={(ghostWriterEnabled) => set("ghost", { ghostWriterEnabled })} />
        <SliderField
          label="Ghost speed"
          value={ghost.ghostWriterSpeed}
          min={1}
          max={MAX_GHOST_SPEED}
          step={1}
          format={(value) => `${value} WPM`}
          onChange={(ghostWriterSpeed) => set("ghost", { ghostWriterSpeed }, true)}
        />
      </OverrideGroup>
      <OverrideGroup title="Sounds" description="Everyone hears the same typing sounds." enabled={sound.enabled} onToggle={(enabled) => set("sound", { enabled })}>
        <SwitchField label="Play sounds" checked={sound.soundEnabled} onChange={(soundEnabled) => set("sound", { soundEnabled })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Typing sound" value={sound.typingSound} options={sounds.typing} onChange={(typingSound) => set("sound", { typingSound })} />
          <SelectField label="Warning sound" value={sound.warningSound} options={sounds.warning} onChange={(warningSound) => set("sound", { warningSound })} />
        </div>
      </OverrideGroup>
      <OverrideGroup title="Keyboard" description="The on-screen keyboard follows the room setting." enabled={keyboard.enabled} onToggle={(enabled) => set("keyboard", { enabled })}>
        <SwitchField label="Show on-screen keyboard" checked={keyboard.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => set("keyboard", { showOnScreenKeyboard })} />
        <Segmented<Groups["keyboard"]["keyboardLayout"]>
          label="Keyboard layout"
          value={keyboard.keyboardLayout}
          onChange={(keyboardLayout) => set("keyboard", { keyboardLayout })}
          options={[{ value: "qwerty", label: "QWERTY" }, { value: "dvorak", label: "Dvorak" }, { value: "colemak", label: "Colemak" }]}
        />
      </OverrideGroup>
    </section>
  );
}
