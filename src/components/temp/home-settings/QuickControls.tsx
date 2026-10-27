// Small controls the five concepts share, built from the profile page's controls and look.
import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRightIcon, CheckIcon, MinusIcon, PlayIcon, PlusIcon,
  TextAlignCenterIcon, TextAlignJustifyIcon, TextAlignLeftIcon, TextAlignRightIcon, type Icon,
} from "@phosphor-icons/react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import PracticeText from "@/components/typing/PracticeText";
import { ModeSegmented, RowGroup, Segmented, SettingRow, SettingSwitch, Swatches } from "@/components/profile/settings-controls";
import { KeyboardLayoutPicker } from "@/components/profile/settings-panels";
import { PROFILE_SPRING } from "@/components/profile/profile-sections";
import type { ProfileSettings, ProfileSettingsUpdate } from "@/components/profile/profile-settings";
import { findVariant, useSoundManifest, type ThemeSelection } from "@/components/profile/theme-catalog";
import { pickTheme } from "./home-settings-utils";
import { useSoundPreview } from "@/hooks/useSoundPreview";
import { KEYBOARD_STYLES, type KeyboardStyle } from "@/lib/keyboard-model";
import { getSoundPacks } from "@/lib/sounds";
import { TYPING_FONT_OPTIONS, getTypingFontFamily } from "@/lib/typing-fonts";
import { cn } from "@/lib/utils";
import type { ThemeCatalogEntry } from "@/types/theme";
import { SAMPLE_TEXT, SAMPLE_TYPED } from "./home-settings-mock";

/** The real practice text at the given settings, scaled down to fit a mock screen. */
export function PracticeSample({ settings, scale, lines, className }: { settings: ProfileSettings; scale: number; lines?: number; className?: string }) {
  const caretRef = useRef<HTMLSpanElement>(null);
  const shownLines = lines ?? settings.linePreview;
  return (
    <div
      aria-hidden="true"
      className={cn("w-full overflow-hidden transition-[font-size] duration-300", className)}
      style={{
        fontSize: `${settings.typingFontSize * scale}rem`,
        fontFamily: getTypingFontFamily(settings.typingFontFamily),
        lineHeight: 1.6,
        maxHeight: `${shownLines * settings.typingFontSize * scale * 1.6}rem`,
        textAlign: settings.textAlign,
      }}
    >
      <PracticeText
        targetText={SAMPLE_TEXT}
        typedText={SAMPLE_TYPED}
        caretRef={caretRef}
        maxWordsPerLine={settings.maxWordsPerLine}
        justifyLines={settings.textAlign === "justify"}
        ghostPosition={settings.ghostWriterEnabled ? SAMPLE_TYPED.length + 14 : undefined}
      />
    </div>
  );
}

const swatchBand = (colors: string[]) =>
  `linear-gradient(90deg, ${colors.map((color, index) => `${color} ${index * 25}% ${(index + 1) * 25}%`).join(", ")})`;
const swatchDisc = (colors: string[]) =>
  `conic-gradient(${colors.map((color, index) => `${color} ${index * 90}deg ${(index + 1) * 90}deg`).join(", ")})`;

interface ThemePickProps {
  themes: ThemeCatalogEntry[];
  theme: ThemeSelection;
  setTheme: (theme: ThemeSelection) => void;
}

/** Profile-style theme cards: a swatch band over the name. */
export function ThemeTiles({ themes, theme, setTheme, className }: ThemePickProps & { className?: string }) {
  if (themes.length === 0) return <div className={cn("h-24 animate-pulse rounded-2xl bg-muted", className)} />;
  return (
    <div role="radiogroup" aria-label="Themes" className={cn("grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2", className)}>
      {themes.map((entry) => {
        const selected = entry.id === theme.themeId;
        const variant = selected ? findVariant(entry, theme.variantId) : findVariant(entry, entry.defaultVariantId);
        return (
          <motion.button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(pickTheme(entry, theme))}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={PROFILE_SPRING}
            className={cn(
              "relative flex flex-col overflow-hidden rounded-xl border bg-card text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected ? "border-primary ring-2 ring-primary" : "border-border",
            )}
          >
            <span className="h-8 w-full" style={{ background: swatchBand(variant?.swatches ?? []) }} aria-hidden="true" />
            <span className="truncate px-2 py-1.5 text-xs font-medium">{entry.name}</span>
            {selected && (
              <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                <CheckIcon className="size-3" aria-hidden="true" />
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Round swatch buttons for tight spaces. */
export function ThemeDots({ themes, theme, setTheme, size = "size-8" }: ThemePickProps & { size?: string }) {
  return (
    <div role="radiogroup" aria-label="Themes" className="flex flex-wrap gap-2">
      {themes.map((entry) => {
        const selected = entry.id === theme.themeId;
        return (
          <motion.button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={entry.name}
            title={entry.name}
            onClick={() => setTheme(pickTheme(entry, theme))}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            transition={PROFILE_SPRING}
            className={cn(
              "shrink-0 rounded-full ring-offset-2 ring-offset-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
              size,
              selected ? "ring-2 ring-primary" : "ring-1 ring-border",
            )}
            style={{ background: swatchDisc(findVariant(entry, selected ? theme.variantId : entry.defaultVariantId)?.swatches ?? []) }}
          />
        );
      })}
    </div>
  );
}

/** The chosen theme's name, light/dark and its other looks. */
export function ThemeSummary({ themes, theme, setTheme, all }: ThemePickProps & { all: ThemeCatalogEntry[] | null }) {
  const entry = all?.find((candidate) => candidate.id === theme.themeId) ?? themes.find((candidate) => candidate.id === theme.themeId);
  const variant = findVariant(entry, theme.variantId);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Swatches colors={variant?.swatches ?? []} />
          <span className="truncate text-sm font-semibold">{entry?.name ?? "Theme"}</span>
        </span>
        <div className="w-48 max-w-full [&_button]:whitespace-nowrap [&_button]:px-2">
          <ModeSegmented mode={theme.mode} lightAvailable={variant?.light ?? false} onChange={(mode) => setTheme({ ...theme, mode })} />
        </div>
      </div>
      {entry && entry.variants.length > 1 && (
        <div role="radiogroup" aria-label={`${entry.name} looks`} className="flex flex-wrap gap-1.5">
          {entry.variants.map((look) => {
            const checked = look.id === theme.variantId;
            return (
              <button
                key={look.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setTheme({ ...theme, variantId: look.id, mode: theme.mode === "light" && look.light ? "light" : "dark" })}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  checked ? "border-primary bg-accent text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Swatches colors={look.swatches} size="size-2.5" />
                {look.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Stepper({ label, value, min, max, step, format, onChange, compact = false }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  compact?: boolean;
}) {
  const set = (next: number) => onChange(Math.max(min, Math.min(max, Math.round(next / step) * step)));
  const button = "flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30";
  return (
    <div role="group" aria-label={label} className={cn("flex items-center rounded-xl bg-muted/60 p-0.5", compact ? "gap-0" : "gap-1")}>
      <button type="button" aria-label={`Less ${label.toLowerCase()}`} disabled={value <= min} onClick={() => set(value - step)} className={cn(button, compact ? "size-7" : "size-8")}>
        <MinusIcon className="size-3.5" aria-hidden="true" />
      </button>
      <motion.span key={value} initial={{ y: -3, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} aria-live="polite" className={cn("text-center text-sm tabular-nums", compact ? "min-w-12" : "min-w-16")}>
        {format(value)}
      </motion.span>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => set(value + step)} className={cn(button, compact ? "size-7" : "size-8")}>
        <PlusIcon className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

const ALIGN_ICONS: Record<ProfileSettings["textAlign"], Icon> = {
  left: TextAlignLeftIcon, center: TextAlignCenterIcon, right: TextAlignRightIcon, justify: TextAlignJustifyIcon,
};

export function AlignPicker({ value, onChange, iconsOnly = false }: { value: ProfileSettings["textAlign"]; onChange: (value: ProfileSettings["textAlign"]) => void; iconsOnly?: boolean }) {
  return (
    <Segmented
      label="Alignment"
      value={value}
      onChange={onChange}
      options={(["left", "center", "right", "justify"] as const).map((align) => {
        const AlignIcon = ALIGN_ICONS[align];
        const name = align[0].toUpperCase() + align.slice(1);
        return {
          value: align,
          label: iconsOnly
            ? <><AlignIcon className="size-4" aria-hidden="true" /><span className="sr-only">{name}</span></>
            : <><AlignIcon className="size-4" aria-hidden="true" />{name}</>,
        };
      })}
    />
  );
}

export function FontSelect({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <div className={cn("min-w-0", className)} style={{ fontFamily: getTypingFontFamily(value) }}>
      <NativeSelect aria-label="Font" value={value} onChange={(event) => onChange(event.target.value)}>
        {TYPING_FONT_OPTIONS.map((font) => <NativeSelectOption key={font.value} value={font.value}>{font.label}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  );
}

/** The four keyboard styles as a compact list of choices. */
export function KeyboardStyleChoices({ value, onChange, disabled = false }: { value: KeyboardStyle; onChange: (value: KeyboardStyle) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Keyboard style" className="grid grid-cols-2 gap-2">
      {KEYBOARD_STYLES.map((style) => {
        const selected = value === style.value;
        return (
          <button
            key={style.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(style.value)}
            className={cn(
              "flex flex-col gap-0.5 rounded-xl border bg-background px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
              selected ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-muted-foreground",
            )}
          >
            <span className="flex items-center justify-between gap-1 text-sm font-medium">
              {style.name}
              {selected && <CheckIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
            </span>
            <span className="line-clamp-2 text-[0.7rem] leading-snug text-muted-foreground">{style.summary}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Sound on/off plus both sound packs with a preview button each. */
export function SoundQuick({ settings, update, showSwitch = true }: { settings: ProfileSettings; update: ProfileSettingsUpdate; showSwitch?: boolean }) {
  const manifest = useSoundManifest();
  const { play, error } = useSoundPreview(manifest, settings.soundEnabled, `${settings.typingSound}:${settings.warningSound}`);
  const rows = [
    { category: "typing" as const, label: "Typing sound", value: settings.typingSound, set: (typingSound: string) => update({ typingSound }) },
    { category: "warning" as const, label: "Warning sound", value: settings.warningSound, set: (warningSound: string) => update({ warningSound }) },
  ];
  return (
    <div className="flex flex-col gap-2">
      {showSwitch && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Sound</span>
          <SettingSwitch label="Sound" checked={settings.soundEnabled} onChange={(soundEnabled) => update({ soundEnabled })} />
        </div>
      )}
      <motion.div animate={{ opacity: settings.soundEnabled ? 1 : 0.45 }} className="flex flex-col gap-2">
        {rows.map((row) => {
          const packs = getSoundPacks(manifest, row.category);
          return (
            <div key={row.category} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">{row.label}</span>
              <div className="min-w-0 flex-1">
                <NativeSelect size="sm" aria-label={row.label} value={row.value} disabled={!settings.soundEnabled || packs.length === 0} onChange={(event) => row.set(event.target.value)}>
                  {packs.length === 0 && <NativeSelectOption value={row.value}>{manifest ? "No packs found" : row.value}</NativeSelectOption>}
                  {packs.map((pack) => <NativeSelectOption key={pack} value={pack}>{pack}</NativeSelectOption>)}
                </NativeSelect>
              </div>
              <button
                type="button"
                aria-label={`Preview ${row.label.toLowerCase()}`}
                disabled={!settings.soundEnabled || packs.length === 0}
                onClick={() => play(row.category, row.value)}
                className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
              >
                <PlayIcon className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </motion.div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** A Control Center style tile: big, tappable, lit when on. */
export function ToggleTile({ label, detail, icon: TileIcon, checked, onChange }: { label: string; detail: string; icon: Icon; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <motion.button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.96 }}
      transition={PROFILE_SPRING}
      className={cn(
        "flex min-w-0 flex-col items-start gap-2 rounded-2xl p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        checked ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground hover:bg-muted",
      )}
    >
      <TileIcon className="size-5" weight={checked ? "fill" : "regular"} aria-hidden="true" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{label}</span>
        <span className={cn("truncate text-xs", checked ? "opacity-80" : "text-muted-foreground")}>{detail}</span>
      </span>
    </motion.button>
  );
}

export function AllSettingsLink({ to = "/profile/text", children = "All settings", className }: { to?: string; children?: ReactNode; className?: string }) {
  return (
    <Link to={to} className={cn("inline-flex items-center gap-1.5 text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring", className)}>
      {children}
      <ArrowRightIcon className="size-4" aria-hidden="true" />
    </Link>
  );
}

/** On/off, a compact style list and the layout: the profile's keyboard panel without the big previews. */
export function KeyboardGroup({ settings, update }: { settings: ProfileSettings; update: ProfileSettingsUpdate }) {
  return (
    <RowGroup title="Keyboard">
      <SettingRow label="On-screen keyboard" hint="Lights up the next key to press.">
        <SettingSwitch label="On-screen keyboard" checked={settings.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => update({ showOnScreenKeyboard })} />
      </SettingRow>
      <motion.div animate={{ opacity: settings.showOnScreenKeyboard ? 1 : 0.45 }} className="flex flex-col gap-3 px-4 py-3">
        <KeyboardStyleChoices value={settings.keyboardStyle} onChange={(keyboardStyle) => update({ keyboardStyle })} />
        <KeyboardLayoutPicker value={settings.keyboardLayout} onChange={(keyboardLayout) => update({ keyboardLayout })} />
      </motion.div>
    </RowGroup>
  );
}
