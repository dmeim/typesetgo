import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GhostIcon, KeyboardIcon, PaletteIcon, SlidersHorizontalIcon, SpeakerHighIcon, TextAaIcon, type Icon } from "@phosphor-icons/react";
import type { ConnectOverrides } from "@/lib/connect-types";
import { MAX_GHOST_SPEED, TEXT_SIZE_MAX, TEXT_SIZE_MIN } from "@/lib/practice-limits";
import { fetchSoundManifest, getSoundPacks, type SoundManifest } from "@/lib/sounds";
import { TYPING_FONT_OPTIONS, getTypingFontFamily, getTypingFontOption } from "@/lib/typing-fonts";
import { cn } from "@/lib/utils";
import { ConnectCard, ConnectSwitch, Pills } from "@/components/connect/ConnectParts";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { RowGroup, SelectControl, SettingRow, SliderRow } from "./override-controls";
import { ThemeOverride } from "./ThemeOverride";
import { formatThemeId, useThemeCatalog } from "./theme-catalog";
import { OVERRIDE_DEFAULTS, type OverrideGroups as Groups } from "./override-defaults";

type GroupKey = keyof Groups;
type Change = (next: ConnectOverrides, options?: { debounce?: boolean }) => void;

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const GROUPS: { key: GroupKey; label: string; on: string; Icon: Icon }[] = [
  { key: "theme", label: "Theme", on: "Everyone sees the room's colours.", Icon: PaletteIcon },
  { key: "typography", label: "Text", on: "Everyone uses this font, size and alignment.", Icon: TextAaIcon },
  { key: "ghost", label: "Ghost racer", on: "A pacing cursor shows the target speed.", Icon: GhostIcon },
  { key: "sound", label: "Sounds", on: "Everyone hears the same typing sounds.", Icon: SpeakerHighIcon },
  { key: "keyboard", label: "On-screen keyboard", on: "The keyboard follows the room's setting.", Icon: KeyboardIcon },
];

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

function Group({ id, label, on, Icon, enabled, summary, onToggle, children }: {
  id: string;
  label: string;
  on: string;
  Icon: Icon;
  enabled: boolean;
  summary: string;
  onToggle: (on: boolean) => void;
  children: ReactNode;
}) {
  return (
    <li className={cn("rounded-2xl transition-colors", enabled && "bg-muted/40")}>
      <div className="flex items-center gap-3 p-2.5">
        <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors", enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          <Icon weight={enabled ? "fill" : "bold"} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p id={`everyone-${id}`} className="text-sm font-semibold">{label}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={enabled ? summary : "off"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
              className="truncate text-xs text-muted-foreground">
              {enabled ? summary : "Off · students keep their own"}
            </motion.p>
          </AnimatePresence>
        </div>
        <ConnectSwitch label={`Everyone gets the same ${label.toLowerCase()}`} checked={enabled} onChange={onToggle} />
      </div>
      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={CONNECT_SPRING} className="overflow-hidden">
            <div role="group" aria-labelledby={`everyone-${id}`} className="flex flex-col gap-3 px-2.5 pb-3">
              <p className="text-xs text-muted-foreground">{on} Changes reach students right away.</p>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/**
 * "Everyone gets": settings the host picks for the whole room. A group that is off leaves each
 * student's own setting alone; its values are kept, so turning it back on restores them.
 */
export function OverridesPanel({ overrides, onChange, className }: { overrides: ConnectOverrides; onChange: Change; className?: string }) {
  const sounds = useSoundOptions();
  const catalog = useThemeCatalog();
  const group = <K extends GroupKey>(key: K): Groups[K] => ({ ...OVERRIDE_DEFAULTS[key], ...overrides[key] });
  const set = <K extends GroupKey>(key: K, patch: Partial<Groups[K]>, debounce = false) =>
    onChange({ ...overrides, [key]: { ...group(key), ...patch } }, { debounce });
  const theme = group("theme");
  const text = group("typography");
  const ghost = group("ghost");
  const sound = group("sound");
  const keyboard = group("keyboard");
  const themeName = catalog.themes?.find((entry) => entry.id === theme.themeId)?.name ?? formatThemeId(theme.themeId);

  const summaries: Record<GroupKey, string> = {
    theme: `${themeName} · ${theme.mode}`,
    typography: `${getTypingFontOption(text.typingFontFamily).label} · ${text.typingFontSize}rem · ${text.textAlign}`,
    ghost: ghost.ghostWriterEnabled ? `Ghost at ${ghost.ghostWriterSpeed} wpm` : "Ghost hidden",
    sound: sound.soundEnabled ? `${capitalize(sound.typingSound)} keys · ${sound.warningSound} warning` : "Muted",
    keyboard: keyboard.showOnScreenKeyboard ? `Shown · ${keyboard.keyboardLayout.toUpperCase()}` : "Keyboard hidden",
  };
  const bodies: Record<GroupKey, ReactNode> = {
    theme: <ThemeOverride value={theme} catalog={catalog} onChange={(value) => set("theme", value)} />,
    typography: (
      <div className="flex flex-col gap-3">
        <p className="truncate rounded-2xl bg-background px-4 py-3 text-muted-foreground" aria-hidden="true"
          style={{ fontFamily: getTypingFontFamily(text.typingFontFamily), fontSize: `${Math.min(text.typingFontSize, 2.5)}rem`, textAlign: text.textAlign === "justify" ? "left" : text.textAlign }}>
          <span className="text-foreground">the quick</span> brown fox
        </p>
        <RowGroup>
          <SettingRow label="Font" hint="Only changes the words students type.">
            <SelectControl label="Font" value={text.typingFontFamily} onChange={(typingFontFamily) => set("typography", { typingFontFamily })}
              options={TYPING_FONT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} />
          </SettingRow>
          <SliderRow label="Text size" value={text.typingFontSize} min={TEXT_SIZE_MIN} max={TEXT_SIZE_MAX} step={0.25} format={(value) => `${value}rem`}
            onChange={(typingFontSize) => set("typography", { typingFontSize }, true)} />
          <SettingRow label="Alignment" stacked>
            <Pills<Groups["typography"]["textAlign"]> label="Text alignment" value={text.textAlign} onChange={(textAlign) => set("typography", { textAlign })}
              options={(["left", "center", "right", "justify"] as const).map((value) => ({ value, label: capitalize(value) }))} />
          </SettingRow>
        </RowGroup>
      </div>
    ),
    ghost: (
      <RowGroup>
        <SettingRow label="Show the ghost" hint="A second cursor typing at the target speed.">
          <ConnectSwitch label="Show the ghost" checked={ghost.ghostWriterEnabled} onChange={(ghostWriterEnabled) => set("ghost", { ghostWriterEnabled })} />
        </SettingRow>
        <motion.div animate={{ opacity: ghost.ghostWriterEnabled ? 1 : 0.45 }}>
          <SliderRow label="Ghost speed" value={ghost.ghostWriterSpeed} min={1} max={MAX_GHOST_SPEED} step={1} format={(value) => `${value} wpm`}
            onChange={(ghostWriterSpeed) => set("ghost", { ghostWriterSpeed }, true)} />
        </motion.div>
      </RowGroup>
    ),
    sound: (
      <RowGroup>
        <SettingRow label="Sound" hint="Turn every sound on or off.">
          <ConnectSwitch label="Sound" checked={sound.soundEnabled} onChange={(soundEnabled) => set("sound", { soundEnabled })} />
        </SettingRow>
        <motion.div animate={{ opacity: sound.soundEnabled ? 1 : 0.45 }} className="divide-y divide-border">
          <SettingRow label="Typing sound">
            <SelectControl label="Typing sound" value={sound.typingSound} options={sounds.typing} disabled={!sound.soundEnabled} onChange={(typingSound) => set("sound", { typingSound })} />
          </SettingRow>
          <SettingRow label="Warning sound" hint="Plays five seconds before time is up.">
            <SelectControl label="Warning sound" value={sound.warningSound} options={sounds.warning} disabled={!sound.soundEnabled} onChange={(warningSound) => set("sound", { warningSound })} />
          </SettingRow>
        </motion.div>
      </RowGroup>
    ),
    keyboard: (
      <RowGroup>
        <SettingRow label="Show the keyboard" hint="Lights up the next key to press.">
          <ConnectSwitch label="Show the keyboard" checked={keyboard.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => set("keyboard", { showOnScreenKeyboard })} />
        </SettingRow>
        <SettingRow label="Layout" stacked>
          <Pills<Groups["keyboard"]["keyboardLayout"]> label="Keyboard layout" value={keyboard.keyboardLayout} onChange={(keyboardLayout) => set("keyboard", { keyboardLayout })}
            options={[{ value: "qwerty", label: "QWERTY" }, { value: "dvorak", label: "Dvorak" }, { value: "colemak", label: "Colemak" }]} />
        </SettingRow>
      </RowGroup>
    ),
  };
  const onCount = GROUPS.filter(({ key }) => group(key).enabled).length;

  return (
    <ConnectCard title="Everyone gets" description={`${onCount} of ${GROUPS.length} set for the room. Anything off uses each student's own settings.`}
      Icon={SlidersHorizontalIcon} tile="bg-(--accent-emphasis) text-background" className={className}>
      <ul className="flex flex-col gap-1">
        {GROUPS.map(({ key, ...rest }) => (
          <Group key={key} id={key} {...rest} enabled={group(key).enabled} summary={summaries[key]} onToggle={(enabled) => set(key, { enabled })}>
            {bodies[key]}
          </Group>
        ))}
      </ul>
    </ConnectCard>
  );
}
