import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  CaretDownIcon,
  CheckIcon,
  KeyboardIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  ShuffleIcon,
  SpeakerSlashIcon,
  TextAaIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";
import ThemeSitePreview from "@/components/typing/ThemeSitePreview";
import { CATEGORY_CONFIG } from "@/lib/themes";
import type { ThemeCatalogEntry } from "@/types/theme";
import { KeyboardPanel, LabSlider, LabSwitch, ModeSegmented, RowGroup, SettingRow, SoundPanel, Swatches, TextPanel, TypingPanel } from "./LabControls";
import { LAB_SPRING, SECTIONS, SETTING_INDEX, type LabSettings, type SectionId } from "./lab-settings";
import { findVariant, useFilteredThemes, useThemeCatalog, useThemeColors, type LabState, type LabTheme } from "./useLabSettings";

type QuickId = "dark" | "bigger" | "sound" | "keyboard" | "ghost" | "surprise";
type Result =
  | { kind: "setting"; id: string; section: SectionId; label: string }
  | { kind: "theme"; id: string; entry: ThemeCatalogEntry };

const pickRandom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Mockup 5: search-first settings. Type what you want, or tap a quick action, and the control appears right there. */
export function SpotlightSettings({ lab }: { lab: LabState }) {
  const themes = useThemeCatalog();
  const colors = useThemeColors(lab.theme);
  const [query, setQuery] = useState("");
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [changes, setChanges] = useState(0);
  const [confirmed, setConfirmed] = useState<QuickId | null>(null);
  const confirmTimer = useRef<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses search from anywhere on the page, like most search-first tools.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || target?.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(confirmTimer.current); };
  }, []);

  const update = (next: Partial<LabSettings>) => { lab.update(next); setChanges((value) => value + 1); };
  const setTheme = (next: LabTheme) => { lab.setTheme(next); setChanges((value) => value + 1); };
  const currentEntry = themes?.find((theme) => theme.id === lab.theme.themeId);
  const lightAvailable = findVariant(currentEntry, lab.theme.variantId)?.light ?? false;

  const applyTheme = (entry: ThemeCatalogEntry) => {
    const variant = findVariant(entry, entry.defaultVariantId);
    setTheme({ themeId: entry.id, variantId: variant?.id ?? entry.defaultVariantId, mode: variant?.light ? lab.theme.mode : "dark" });
  };

  const quick = (id: QuickId) => {
    const { settings } = lab;
    if (id === "dark") setTheme({ ...lab.theme, mode: lab.theme.mode === "dark" && lightAvailable ? "light" : "dark" });
    if (id === "bigger") update({ typingFontSize: Math.min(6, settings.typingFontSize + 0.5) });
    if (id === "sound") update({ soundEnabled: !settings.soundEnabled });
    if (id === "keyboard") update({ showOnScreenKeyboard: !settings.showOnScreenKeyboard });
    if (id === "ghost") update({ ghostWriterEnabled: !settings.ghostWriterEnabled });
    if (id === "surprise" && themes?.length) applyTheme(pickRandom(themes));
    setConfirmed(id);
    window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmed(null), 1200);
  };

  const quickActions: { id: QuickId; label: string; Icon: Icon; on: boolean }[] = [
    { id: "dark", label: lab.theme.mode === "dark" ? "Light mode" : "Dark mode", Icon: MoonIcon, on: lab.theme.mode === "dark" },
    { id: "bigger", label: "Bigger text", Icon: TextAaIcon, on: false },
    { id: "sound", label: lab.settings.soundEnabled ? "Turn sounds off" : "Turn sounds on", Icon: SpeakerSlashIcon, on: !lab.settings.soundEnabled },
    { id: "keyboard", label: lab.settings.showOnScreenKeyboard ? "Hide keyboard" : "Show keyboard", Icon: KeyboardIcon, on: lab.settings.showOnScreenKeyboard },
    { id: "ghost", label: "Race a ghost", Icon: LightningIcon, on: lab.settings.ghostWriterEnabled },
    { id: "surprise", label: "Surprise me", Icon: ShuffleIcon, on: false },
  ];

  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const settingResults: Result[] = terms.length === 0 ? [] : SETTING_INDEX
    .filter((entry) => {
      const haystack = normalize(`${entry.label} ${entry.keywords} ${entry.section}`);
      return terms.every((term) => haystack.includes(term));
    })
    .map((entry) => ({ kind: "setting", ...entry }));
  const themeMatches = useFilteredThemes(themes, query, "all", 8);
  const results: Result[] = terms.length === 0 ? [] : [
    ...settingResults,
    ...themeMatches.results.map((entry): Result => ({ kind: "theme", id: entry.id, entry })),
  ];
  const active = Math.min(activeIndex, results.length - 1);

  const activate = (result: Result) => {
    if (result.kind === "theme") applyTheme(result.entry);
    else setExpanded((current) => (current === result.id ? null : result.id));
  };

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setQuery(""); setExpanded(null); return; }
    if (results.length === 0) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((active + 1) % results.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((active - 1 + results.length) % results.length); }
    if (event.key === "Enter") { event.preventDefault(); activate(results[active]); }
  };

  const sectionPanel = (id: SectionId) => {
    if (id === "text") return <TextPanel settings={lab.settings} update={update} />;
    if (id === "typing") return <TypingPanel settings={lab.settings} update={update} />;
    if (id === "sound") return <SoundPanel settings={lab.settings} update={update} />;
    if (id === "keyboard") return <KeyboardPanel settings={lab.settings} update={update} />;
    return <ThemeQuickPanel lab={lab} themes={themes} lightAvailable={lightAvailable} onTheme={setTheme} onPick={applyTheme} />;
  };

  // A single matched setting shows just its control; broader matches show their section.
  const settingControl = (id: string, section: SectionId) => {
    const { settings } = lab;
    if (id === "size") return <RowGroup><div className="px-4 py-3"><LabSlider label="Text size" value={settings.typingFontSize} min={1} max={6} step={0.25} onChange={(typingFontSize) => update({ typingFontSize })} format={(value) => `${value}rem`} /></div></RowGroup>;
    if (id === "sound") return <RowGroup><SettingRow label="Sound" hint="Turn every sound on or off."><LabSwitch label="Sound" checked={settings.soundEnabled} onChange={(soundEnabled) => update({ soundEnabled })} /></SettingRow></RowGroup>;
    if (id === "ghost") return <RowGroup><SettingRow label="Race a ghost" hint="A second cursor typing at your target speed."><LabSwitch label="Race a ghost" checked={settings.ghostWriterEnabled} onChange={(ghostWriterEnabled) => update({ ghostWriterEnabled })} /></SettingRow></RowGroup>;
    if (id === "keyboard") return <RowGroup><SettingRow label="On-screen keyboard" hint="Lights up the next key to press."><LabSwitch label="On-screen keyboard" checked={settings.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => update({ showOnScreenKeyboard })} /></SettingRow></RowGroup>;
    if (id === "mode") return <RowGroup><SettingRow label="Light or dark" stacked><ModeSegmented mode={lab.theme.mode} lightAvailable={lightAvailable} onChange={(mode) => setTheme({ ...lab.theme, mode })} /></SettingRow></RowGroup>;
    return sectionPanel(section);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-12 pb-24 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={LAB_SPRING} className="text-3xl font-bold sm:text-4xl">
            What would you like to change?
          </motion.h1>
          <p className="text-sm text-muted-foreground">Search for anything, like “bigger”, “quiet” or “ocean”.</p>
        </header>

        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-5 size-6 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            autoFocus
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setExpanded(null); }}
            onKeyDown={onSearchKey}
            placeholder="Try “dark”, “sound” or “keyboard”"
            aria-label="Search settings and themes"
            aria-controls="spotlight-results"
            className="h-16 w-full rounded-2xl border border-border bg-card pr-14 pl-14 text-lg shadow-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="absolute top-1/2 right-4 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <XIcon className="size-5" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="absolute top-1/2 right-5 -translate-y-1/2 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground" aria-hidden="true">/</kbd>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Quick changes">
          {quickActions.map(({ id, label, Icon: ActionIcon, on }) => (
            <motion.button
              key={id}
              type="button"
              layout
              transition={LAB_SPRING}
              whileTap={{ scale: 0.94 }}
              aria-pressed={id === "surprise" || id === "bigger" ? undefined : on}
              onClick={() => quick(id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${on ? "border-primary bg-primary/15 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              <span className="relative flex size-4 items-center justify-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  {confirmed === id ? (
                    <motion.span key="check" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
                      <CheckIcon className="size-4 text-success" aria-hidden="true" />
                    </motion.span>
                  ) : (
                    <motion.span key="icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <ActionIcon className="size-4" aria-hidden="true" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <motion.span layout="position">{label}</motion.span>
            </motion.button>
          ))}
        </div>

        <LayoutGroup>
          <AnimatePresence mode="popLayout" initial={false}>
            {terms.length === 0 ? (
              <motion.div key="sections" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SECTIONS.map((section) => {
                  const open = openSection === section.id;
                  return (
                    <motion.div key={section.id} layout transition={LAB_SPRING} style={{ borderRadius: 20 }} className={`overflow-hidden border border-border bg-card ${open ? "col-span-full" : ""}`}>
                      <motion.button
                        layout="position"
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenSection(open ? null : section.id)}
                        className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent/40"
                      >
                        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${section.tile}`}>
                          <section.Icon weight="fill" className="size-6" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{section.title}</span>
                          <span className={`block text-xs text-muted-foreground ${open ? "" : "line-clamp-2"}`}>{section.description}</span>
                        </span>
                        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={LAB_SPRING}><CaretDownIcon className="size-4 text-muted-foreground" aria-hidden="true" /></motion.span>
                      </motion.button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div key="panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={LAB_SPRING} className="overflow-hidden">
                            <div className="px-4 pb-4">{sectionPanel(section.id)}</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.ul key="results" id="spotlight-results" aria-label="Search results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {results.map((result, index) => (
                    <motion.li key={`${result.kind}-${result.id}`} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={LAB_SPRING}>
                      {result.kind === "setting" ? (
                        <ResultCard
                          active={index === active}
                          expanded={expanded === result.id}
                          onClick={() => { setActiveIndex(index); activate(result); }}
                          title={result.label}
                          subtitle={SECTIONS.find((section) => section.id === result.section)?.title ?? ""}
                          leading={<SectionTile id={result.section} />}
                        >
                          {settingControl(result.id, result.section)}
                        </ResultCard>
                      ) : (
                        <ResultCard
                          active={index === active}
                          selected={lab.theme.themeId === result.entry.id}
                          onClick={() => { setActiveIndex(index); activate(result); }}
                          title={result.entry.name}
                          subtitle={`Theme · ${CATEGORY_CONFIG[result.entry.category].displayName}`}
                          leading={<Swatches colors={result.entry.variants[0].swatches} size="size-5" />}
                        />
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
                {results.length === 0 && (
                  <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Nothing matches “{query}”. Try a simpler word, like “colour” or “size”.
                  </motion.li>
                )}
                {themeMatches.total > themeMatches.results.length && (
                  <li className="px-2 text-xs text-muted-foreground">Showing 8 of {themeMatches.total} matching themes. Keep typing to narrow it down.</li>
                )}
              </motion.ul>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </main>

      <aside className="mx-auto w-full max-w-sm lg:sticky lg:top-6" aria-label="Preview">
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-lg">
          <motion.div key={changes} initial={changes === 0 ? false : { scale: 0.94 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 14 }}>
            {colors ? <ThemeSitePreview colors={colors} label={currentEntry?.name ?? "Theme"} /> : <div className="aspect-[4/3] animate-pulse rounded-md bg-muted" />}
          </motion.div>
          <div className="flex items-center justify-between gap-2 px-1 text-xs">
            <span className="truncate font-semibold">{currentEntry?.name ?? lab.theme.themeId}</span>
            <span className="shrink-0 text-muted-foreground">{lab.theme.mode} · {lab.settings.typingFontSize}rem</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SectionTile({ id }: { id: SectionId }) {
  const section = SECTIONS.find((candidate) => candidate.id === id) ?? SECTIONS[0];
  return (
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${section.tile}`}>
      <section.Icon weight="fill" className="size-5" aria-hidden="true" />
    </span>
  );
}

function ResultCard({ title, subtitle, leading, active, expanded = false, selected = false, onClick, children }: {
  title: string;
  subtitle: string;
  leading: ReactNode;
  active: boolean;
  expanded?: boolean;
  selected?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border bg-card transition-colors ${active ? "border-ring" : "border-border"}`}>
      <button type="button" aria-expanded={children ? expanded : undefined} aria-pressed={children ? undefined : selected} onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40">
        {leading}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
        {children ? (
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={LAB_SPRING}><CaretDownIcon className="size-4 text-muted-foreground" aria-hidden="true" /></motion.span>
        ) : selected ? (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-xs text-success"><CheckIcon className="size-4" aria-hidden="true" />In use</motion.span>
        ) : (
          <span className="text-xs text-muted-foreground">Use</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {children && expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={LAB_SPRING} className="overflow-hidden">
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Light/dark, the current theme's variants, and a handful of featured themes. */
function ThemeQuickPanel({ lab, themes, lightAvailable, onTheme, onPick }: {
  lab: LabState;
  themes: ThemeCatalogEntry[] | null;
  lightAvailable: boolean;
  onTheme: (theme: LabTheme) => void;
  onPick: (entry: ThemeCatalogEntry) => void;
}) {
  const featured = useFilteredThemes(themes, "", "default", 9);
  const current = themes?.find((theme) => theme.id === lab.theme.themeId);
  return (
    <div className="flex flex-col gap-4">
      <ModeSegmented mode={lab.theme.mode} lightAvailable={lightAvailable} onChange={(mode) => onTheme({ ...lab.theme, mode })} />
      {current && current.variants.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{current.name} versions</span>
          <div className="flex flex-wrap gap-2">
            {current.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                aria-pressed={lab.theme.variantId === variant.id}
                onClick={() => onTheme({ ...lab.theme, variantId: variant.id, mode: variant.light ? lab.theme.mode : "dark" })}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${lab.theme.variantId === variant.id ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <Swatches colors={variant.swatches} size="size-3" />{variant.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Featured</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {featured.results.map((entry) => (
            <motion.button
              key={entry.id}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              aria-pressed={lab.theme.themeId === entry.id}
              onClick={() => onPick(entry)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm ${lab.theme.themeId === entry.id ? "border-primary bg-primary/10" : "border-border bg-background"}`}
            >
              <Swatches colors={entry.variants[0].swatches} size="size-3.5" />
              <span className="truncate">{entry.name}</span>
            </motion.button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Search above to find any of {themes?.length ?? "the"} themes.</span>
      </div>
    </div>
  );
}
