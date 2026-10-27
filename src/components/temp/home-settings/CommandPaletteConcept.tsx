import { useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowsDownUpIcon, KeyReturnIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ScrollRow } from "@/components/ui/scroll-row";
import { ModeSegmented, SettingSwitch, Swatches } from "@/components/profile/settings-controls";
import { IconTile } from "@/components/profile/SectionTiles";
import { PROFILE_SPRING, SECTIONS, SETTING_INDEX, sectionById, type SectionId } from "@/components/profile/profile-sections";
import { findVariant, useSoundPacks } from "@/components/profile/theme-catalog";
import { KEYBOARD_LAYOUTS, type KeyboardLayoutId } from "@/lib/keyboard-layouts";
import { KEYBOARD_STYLES, type KeyboardStyle } from "@/lib/keyboard-model";
import { TEXT_SIZE_MAX, TEXT_SIZE_MIN } from "@/lib/practice-limits";
import { TYPING_FONT_OPTIONS } from "@/lib/typing-fonts";
import { cn } from "@/lib/utils";
import { CATEGORY_CONFIG } from "@/lib/themes";
import type { ThemeCatalogEntry } from "@/types/theme";
import { featuredThemes, type ConceptProps, type SurfaceTarget } from "./home-settings-mock";
import { pickTheme, useSurface } from "./home-settings-utils";
import { AlignPicker, FontSelect, Stepper } from "./QuickControls";

type Scope = SectionId | "all";
const SCOPE_FOR: Record<SurfaceTarget, Scope> = { settings: "all", theme: "theme", sound: "sound" };
const ALIGNS = ["left", "center", "right", "justify"] as const;
const LAYOUT_IDS = Object.keys(KEYBOARD_LAYOUTS) as KeyboardLayoutId[];

interface Command {
  id: string;
  section: SectionId;
  label: string;
  detail?: string;
  lead?: ReactNode;
  control?: ReactNode;
  /** What Enter does: toggle, step to the next choice, or apply. */
  run: () => string;
}

const next = <T,>(list: readonly T[], value: T) => list[(list.indexOf(value) + 1) % list.length];
const wrap = (value: number, step: number, min: number, max: number) => (value + step > max ? min : value + step);
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** 03 Command palette: one search box for every setting and theme, changed right in the results with the keyboard. */
export function CommandPaletteConcept({ device, open, target, look, update, setTheme, themes, close }: ConceptProps) {
  const phone = device === "phone";
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>(SCOPE_FOR[target]);
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [opened, setOpened] = useState(`${open}-${target}`);
  if (opened !== `${open}-${target}`) {
    setOpened(`${open}-${target}`);
    if (open) { setQuery(""); setScope(SCOPE_FOR[target]); setActive(0); }
  }
  const [surfaceRef, onSurfaceKeyDown] = useSurface<HTMLInputElement>(open, () => close());
  const packs = useSoundPacks();
  const commands = useCommands({ look, update, setTheme, themes, packs });

  const results = (() => {
    const needle = normalize(query.trim());
    const settingHits = commands.filter((command) => (scope === "all" || command.section === scope)
      && (!needle || normalize(`${command.label} ${SETTING_INDEX.find((entry) => entry.id === command.id)?.keywords ?? ""}`).includes(needle)));
    const themePool = needle ? (themes ?? []).filter((theme) => normalize(theme.name).includes(needle)).slice(0, 6) : scope === "theme" ? featuredThemes(themes, 8) : [];
    const themeHits = scope === "all" || scope === "theme" ? themePool.map((entry) => themeCommand(entry, look.theme.themeId === entry.id, () => { setTheme(pickTheme(entry, look.theme)); return `${entry.name} theme on`; })) : [];
    return [...settingHits, ...themeHits];
  })();
  const current = Math.min(active, Math.max(0, results.length - 1));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current + step + results.length) % Math.max(1, results.length));
    } else if (event.key === "Enter" && results[current]) {
      event.preventDefault();
      setAnnouncement(results[current].run());
    } else if (event.key === "Backspace" && !query && scope !== "all") {
      setScope("all");
    }
  };

  const search = (
    <label className={cn("flex min-w-0 flex-1 items-center gap-2", phone ? "rounded-xl bg-muted/70 px-3 py-2" : "px-4 py-3")}>
      <MagnifyingGlassIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {scope !== "all" && (
        <span className="flex shrink-0 items-center gap-1 rounded-md bg-accent py-0.5 pl-2 pr-1 text-xs text-primary">
          {sectionById(scope).title}
          <button type="button" aria-label={`Search everything, not just ${sectionById(scope).title}`} onClick={() => setScope("all")} className="rounded p-0.5 hover:bg-background/60">
            <XIcon className="size-3" aria-hidden="true" />
          </button>
        </span>
      )}
      <input
        ref={surfaceRef}
        value={query}
        onChange={(event) => { setQuery(event.target.value); setActive(0); }}
        onKeyDown={onKeyDown}
        placeholder={phone ? "Search settings" : "Search settings and themes…"}
        aria-label="Search settings and themes"
        aria-controls="palette-results"
        className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
      />
    </label>
  );

  const list = (
    <div id="palette-results" role="list" aria-label="Matching settings" className="min-h-0 flex-1 overflow-y-auto p-2">
      {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches “{query}”. Try “dark”, “bigger” or “keys”.</p>}
      {results.map((command, index) => {
        const first = index === 0 || results[index - 1].section !== command.section || (command.id.startsWith("theme:") !== results[index - 1].id.startsWith("theme:"));
        return (
          <div key={command.id} role="listitem">
            {first && (
              <span className="flex items-center gap-2 px-3 pb-1 pt-3 text-xs uppercase tracking-wider text-muted-foreground">
                <IconTile section={sectionById(command.section)} small />
                {command.id.startsWith("theme:") ? "Themes" : sectionById(command.section).title}
              </span>
            )}
            <div
              onMouseMove={() => { if (index !== current) setActive(index); }}
              className={cn(
                "relative flex gap-3 rounded-xl px-3 py-2",
                phone ? "flex-col items-stretch" : "flex-wrap items-center justify-between",
              )}
            >
              {index === current && !phone && <motion.span layoutId="palette-active" transition={PROFILE_SPRING} className="absolute inset-0 rounded-xl bg-accent" />}
              <button type="button" tabIndex={-1} onClick={() => setAnnouncement(command.run())} className="relative flex min-w-0 items-center gap-2 text-left">
                {command.lead}
                <span className="min-w-0">
                  <span className="block truncate text-sm">{command.label}</span>
                  {command.detail && <span className="block truncate text-xs text-muted-foreground">{command.detail}</span>}
                </span>
              </button>
              {command.control && <div className="relative flex shrink-0 justify-end">{command.control}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (phone ? (
        <motion.div
          key="phone"
          role="dialog"
          aria-label="Search settings"
          onKeyDown={onSurfaceKeyDown}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={PROFILE_SPRING}
          className="absolute inset-0 z-30 flex flex-col bg-background"
        >
          <div className="flex items-center gap-2 px-3 pt-4">
            {search}
            <button type="button" onClick={() => close()} className="shrink-0 px-1 text-sm text-primary focus-visible:outline-2 focus-visible:outline-ring">Done</button>
          </div>
          <ScrollRow role="radiogroup" aria-label="Setting groups" className="px-3 pt-3">
            {[{ id: "all" as const, title: "All" }, ...SECTIONS].map((section) => (
              <button
                key={section.id}
                type="button"
                role="radio"
                aria-checked={scope === section.id}
                onClick={() => { setScope(section.id); setActive(0); }}
                className={cn("shrink-0 rounded-full border px-3 py-1 text-sm", scope === section.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}
              >
                {section.title}
              </button>
            ))}
          </ScrollRow>
          {list}
          <p aria-live="polite" className="sr-only">{announcement}</p>
        </motion.div>
      ) : (
        <motion.div key="desktop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30">
          <button type="button" tabIndex={-1} aria-label="Close settings search" onClick={() => close()} className="absolute inset-0 cursor-default bg-background/55 backdrop-blur-[2px]" />
          <div className="pointer-events-none absolute inset-x-0 top-[9%] flex justify-center px-4">
            <motion.div
              role="dialog"
              aria-label="Search settings"
              onKeyDown={onSurfaceKeyDown}
              initial={{ y: -12, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -8, scale: 0.98 }}
              transition={PROFILE_SPRING}
              className="pointer-events-auto flex max-h-[24rem] w-full max-w-[34rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-center border-b border-border">{search}<kbd className="mr-4 hidden rounded border border-border px-1.5 text-[0.65rem] text-muted-foreground @md:inline">esc</kbd></div>
              {list}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ArrowsDownUpIcon className="size-3.5" aria-hidden="true" />move</span>
                <span className="flex items-center gap-1"><KeyReturnIcon className="size-3.5" aria-hidden="true" />change</span>
                <span>Backspace clears the group</span>
                <span aria-live="polite" className="ml-auto text-foreground">{announcement}</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

function themeCommand(entry: ThemeCatalogEntry, selected: boolean, run: () => string): Command {
  const swatches = findVariant(entry, entry.defaultVariantId)?.swatches ?? [];
  return {
    id: `theme:${entry.id}`,
    section: "theme",
    label: entry.name,
    detail: `${CATEGORY_CONFIG[entry.category].displayName}${entry.variants.length > 1 ? ` · ${entry.variants.length} looks` : ""}${selected ? " · in use" : ""}`,
    lead: <Swatches colors={swatches} size="size-3.5" />,
    run,
  };
}

function useCommands({ look, update, setTheme, themes, packs }: Pick<ConceptProps, "look" | "update" | "setTheme" | "themes"> & { packs: { typing: string[]; warning: string[] } }): Command[] {
  const { settings, theme } = look;
  const entry = themes?.find((candidate) => candidate.id === theme.themeId);
  const variant = findVariant(entry, theme.variantId);
  const lightAvailable = variant?.light ?? false;
  const featured = featuredThemes(themes);
  const onOff = (value: boolean) => (value ? "on" : "off");
  const select = (label: string, value: string, options: { value: string; label: string }[], onChange: (value: string) => void) => (
    <div className="w-36">
      <NativeSelect size="sm" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  );
  const packOptions = (list: string[], value: string) => (list.length ? list : [value]).map((pack) => ({ value: pack, label: pack }));

  return [
    {
      id: "theme", section: "theme", label: "Theme", detail: entry ? `${entry.name}${variant && entry.variants.length > 1 ? ` · ${variant.label}` : ""}` : "TypeSetGo",
      lead: <Swatches colors={variant?.swatches ?? []} size="size-3.5" />,
      run: () => {
        const following = featured[(featured.findIndex((candidate) => candidate.id === theme.themeId) + 1) % Math.max(1, featured.length)];
        if (!following) return "";
        setTheme(pickTheme(following, theme));
        return `${following.name} theme on`;
      },
    },
    {
      id: "mode", section: "theme", label: "Light or dark", detail: lightAvailable ? undefined : "This theme is dark only",
      control: <div className="w-44 [&_button]:whitespace-nowrap [&_button]:px-2"><ModeSegmented mode={theme.mode} lightAvailable={lightAvailable} onChange={(mode) => setTheme({ ...theme, mode })} /></div>,
      run: () => {
        if (!lightAvailable) return "This theme is dark only";
        const mode = theme.mode === "light" ? "dark" : "light";
        setTheme({ ...theme, mode });
        return `${mode} mode`;
      },
    },
    {
      id: "font", section: "text", label: "Font",
      control: <FontSelect className="w-40" value={settings.typingFontFamily} onChange={(typingFontFamily) => update({ typingFontFamily })} />,
      run: () => {
        const font = next(TYPING_FONT_OPTIONS.map((option) => option.value), settings.typingFontFamily);
        update({ typingFontFamily: font });
        return `Font: ${TYPING_FONT_OPTIONS.find((option) => option.value === font)?.label ?? font}`;
      },
    },
    {
      id: "size", section: "text", label: "Text size",
      control: <Stepper compact label="Text size" value={settings.typingFontSize} min={TEXT_SIZE_MIN} max={TEXT_SIZE_MAX} step={0.25} format={(value) => `${value}rem`} onChange={(typingFontSize) => update({ typingFontSize })} />,
      run: () => {
        const typingFontSize = wrap(settings.typingFontSize, 0.25, TEXT_SIZE_MIN, TEXT_SIZE_MAX);
        update({ typingFontSize });
        return `Text size ${typingFontSize}rem`;
      },
    },
    {
      id: "align", section: "text", label: "Alignment",
      control: <AlignPicker iconsOnly value={settings.textAlign} onChange={(textAlign) => update({ textAlign })} />,
      run: () => {
        const textAlign = next(ALIGNS, settings.textAlign);
        update({ textAlign });
        return `Aligned ${textAlign}`;
      },
    },
    {
      id: "lines", section: "typing", label: "Lines shown",
      control: <Stepper compact label="Lines shown" value={settings.linePreview} min={1} max={6} step={1} format={String} onChange={(linePreview) => update({ linePreview })} />,
      run: () => { const linePreview = wrap(settings.linePreview, 1, 1, 6); update({ linePreview }); return `${linePreview} lines shown`; },
    },
    {
      id: "words", section: "typing", label: "Words per line",
      control: <Stepper compact label="Words per line" value={settings.maxWordsPerLine} min={1} max={10} step={1} format={String} onChange={(maxWordsPerLine) => update({ maxWordsPerLine })} />,
      run: () => { const maxWordsPerLine = wrap(settings.maxWordsPerLine, 1, 1, 10); update({ maxWordsPerLine }); return `${maxWordsPerLine} words per line`; },
    },
    {
      id: "ghost", section: "typing", label: "Ghost racer", detail: settings.ghostWriterEnabled ? `Racing at ${settings.ghostWriterSpeed} wpm` : "A second cursor at your target speed",
      control: <SettingSwitch label="Ghost racer" checked={settings.ghostWriterEnabled} onChange={(ghostWriterEnabled) => update({ ghostWriterEnabled })} />,
      run: () => { update({ ghostWriterEnabled: !settings.ghostWriterEnabled }); return `Ghost racer ${onOff(!settings.ghostWriterEnabled)}`; },
    },
    {
      id: "sound", section: "sound", label: "Sound",
      control: <SettingSwitch label="Sound" checked={settings.soundEnabled} onChange={(soundEnabled) => update({ soundEnabled })} />,
      run: () => { update({ soundEnabled: !settings.soundEnabled }); return `Sound ${onOff(!settings.soundEnabled)}`; },
    },
    {
      id: "typing-sound", section: "sound", label: "Typing sound",
      control: select("Typing sound", settings.typingSound, packOptions(packs.typing, settings.typingSound), (typingSound) => update({ typingSound })),
      run: () => { const typingSound = next(packs.typing, settings.typingSound) ?? settings.typingSound; update({ typingSound }); return `Typing sound: ${typingSound}`; },
    },
    {
      id: "warning-sound", section: "sound", label: "Warning sound", detail: "Five seconds before time is up",
      control: select("Warning sound", settings.warningSound, packOptions(packs.warning, settings.warningSound), (warningSound) => update({ warningSound })),
      run: () => { const warningSound = next(packs.warning, settings.warningSound) ?? settings.warningSound; update({ warningSound }); return `Warning sound: ${warningSound}`; },
    },
    {
      id: "keyboard", section: "keyboard", label: "On-screen keyboard",
      control: <SettingSwitch label="On-screen keyboard" checked={settings.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => update({ showOnScreenKeyboard })} />,
      run: () => { update({ showOnScreenKeyboard: !settings.showOnScreenKeyboard }); return `Keyboard ${settings.showOnScreenKeyboard ? "hidden" : "shown"}`; },
    },
    {
      id: "keyboard-style", section: "keyboard", label: "Keyboard style",
      control: select("Keyboard style", settings.keyboardStyle, KEYBOARD_STYLES.map((style) => ({ value: style.value, label: style.name })), (value) => update({ keyboardStyle: value as KeyboardStyle })),
      run: () => {
        const keyboardStyle = next(KEYBOARD_STYLES.map((style) => style.value), settings.keyboardStyle);
        update({ keyboardStyle });
        return `${KEYBOARD_STYLES.find((style) => style.value === keyboardStyle)?.name} keyboard`;
      },
    },
    {
      id: "layout", section: "keyboard", label: "Keyboard layout",
      control: select("Keyboard layout", settings.keyboardLayout, LAYOUT_IDS.map((id) => ({ value: id, label: KEYBOARD_LAYOUTS[id].name })), (value) => update({ keyboardLayout: value as KeyboardLayoutId })),
      run: () => { const keyboardLayout = next(LAYOUT_IDS, settings.keyboardLayout); update({ keyboardLayout }); return `${KEYBOARD_LAYOUTS[keyboardLayout].name} layout`; },
    },
  ];
}
