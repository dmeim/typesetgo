import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretLeftIcon, CaretRightIcon, CheckIcon, MagnifyingGlassIcon, UserIcon, XIcon } from "@phosphor-icons/react";
import ThemeSitePreview from "@/components/typing/ThemeSitePreview";
import { getTypingFontOption } from "@/lib/typing-fonts";
import type { ThemeCatalogEntry, ThemeCategory } from "@/types/theme";
import { KeyboardPanel, ModeSegmented, RowGroup, SoundPanel, Swatches, TextPanel, TypingPanel } from "./LabControls";
import { LAB_SPRING, SECTIONS, SETTING_INDEX, type SectionId, type SectionMeta } from "./lab-settings";
import { findVariant, useFilteredThemes, useThemeCatalog, useThemeCategories, useThemeColors, type LabState } from "./useLabSettings";

const GROUPS: SectionId[][] = [["theme"], ["text", "typing"], ["sound", "keyboard"]];
const sectionById = (id: SectionId) => SECTIONS.find((section) => section.id === id) as SectionMeta;

/** Mockup 1: iPadOS-style split view. Sections on the left, the chosen section on the right. */
export function SplitViewSettings({ lab }: { lab: LabState }) {
  const [active, setActive] = useState<SectionId>("theme");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [query, setQuery] = useState("");
  const themes = useThemeCatalog();
  const themeEntry = themes?.find((theme) => theme.id === lab.theme.themeId);
  const { settings } = lab;

  const summary: Record<SectionId, string> = {
    theme: themeEntry?.name ?? "…",
    text: `${getTypingFontOption(settings.typingFontFamily).label}`,
    typing: settings.ghostWriterEnabled ? "Ghost on" : `${settings.linePreview} lines`,
    sound: settings.soundEnabled ? "On" : "Off",
    keyboard: settings.showOnScreenKeyboard ? settings.keyboardLayout.toUpperCase() : "Off",
  };
  const needle = query.trim().toLowerCase();
  const matches = needle ? SETTING_INDEX.filter((entry) => `${entry.label} ${entry.keywords}`.toLowerCase().includes(needle)) : [];
  const open = (id: SectionId) => { setActive(id); setMobileDetail(true); };

  return (
    <div className="flex min-h-[100dvh]">
      <aside className={`w-full shrink-0 flex-col gap-5 border-r border-border bg-card/40 px-4 pb-28 pt-6 md:sticky md:top-0 md:flex md:h-[100dvh] md:w-80 md:overflow-y-auto ${mobileDetail ? "hidden" : "flex"}`}>
        <h1 className="px-2 text-3xl font-bold">Settings</h1>
        <label className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground focus-within:outline-2 focus-within:outline-ring">
          <MagnifyingGlassIcon className="size-4 shrink-0" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search settings" className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
          {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><XIcon className="size-3.5" aria-hidden="true" /></button>}
        </label>

        <AnimatePresence mode="popLayout" initial={false}>
          {needle ? (
            <motion.div key="results" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-col gap-1">
              {matches.length === 0 && <p className="px-2 text-sm text-muted-foreground">No settings match "{query}".</p>}
              {matches.map((entry) => {
                const section = sectionById(entry.section);
                return (
                  <button key={entry.id} type="button" onClick={() => { open(entry.section); setQuery(""); }} className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-accent">
                    <IconTile section={section} small />
                    <span className="flex-1 text-sm">{entry.label}</span>
                    <span className="text-xs text-muted-foreground">{section.title}</span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
              <div className="flex items-center gap-3 rounded-2xl bg-card px-3 py-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><UserIcon className="size-6" aria-hidden="true" /></span>
                <span className="flex flex-col">
                  <span className="font-semibold">Guest</span>
                  <span className="text-xs text-muted-foreground">Sign in to keep your settings on every device</span>
                </span>
              </div>
              {GROUPS.map((group, groupIndex) => (
                <div key={groupIndex} className="flex flex-col gap-0.5">
                  {group.map((id) => {
                    const section = sectionById(id);
                    const selected = active === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-current={selected ? "page" : undefined}
                        onClick={() => open(id)}
                        className="relative flex items-center gap-3 rounded-xl px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {selected && <motion.span layoutId="split-active" transition={LAB_SPRING} className="absolute inset-0 hidden rounded-xl bg-accent md:block" />}
                        <IconTile section={section} />
                        <span className="relative flex-1 text-sm">{section.title}</span>
                        <motion.span key={summary[id]} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className="relative max-w-28 truncate text-xs text-muted-foreground">{summary[id]}</motion.span>
                        <CaretRightIcon className="relative size-3.5 text-muted-foreground md:hidden" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      <main className={`min-w-0 flex-1 px-4 pb-28 pt-6 md:px-10 ${mobileDetail ? "block" : "hidden md:block"}`}>
        <button type="button" onClick={() => setMobileDetail(false)} className="mb-4 flex items-center gap-1 text-sm text-primary md:hidden">
          <CaretLeftIcon className="size-4" aria-hidden="true" />Settings
        </button>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="mx-auto flex max-w-2xl flex-col gap-6"
          >
            {active === "theme" ? <ThemeSection lab={lab} themes={themes} entry={themeEntry} /> : (
              <>
                <Hero section={sectionById(active)} />
                {active === "text" && <TextPanel settings={settings} update={lab.update} />}
                {active === "typing" && <TypingPanel settings={settings} update={lab.update} />}
                {active === "sound" && <SoundPanel settings={settings} update={lab.update} />}
                {active === "keyboard" && <KeyboardPanel settings={settings} update={lab.update} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function IconTile({ section, small = false }: { section: SectionMeta; small?: boolean }) {
  const { Icon } = section;
  return (
    <span className={`relative flex shrink-0 items-center justify-center rounded-lg ${section.tile} ${small ? "size-6" : "size-8"}`}>
      <Icon weight="fill" className={small ? "size-3.5" : "size-[18px]"} aria-hidden="true" />
    </span>
  );
}

function Hero({ section, children }: { section: SectionMeta; children?: ReactNode }) {
  const { Icon } = section;
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6">
      <span className={`flex size-14 items-center justify-center rounded-2xl ${section.tile}`}><Icon weight="fill" className="size-8" aria-hidden="true" /></span>
      <h2 className="text-2xl font-bold">{section.title}</h2>
      <p className="text-sm text-muted-foreground">{section.description}</p>
      {children}
    </div>
  );
}

/** Theme page: the preview window up top, then an iOS drill-down from categories into themes. */
function ThemeSection({ lab, themes, entry }: { lab: LabState; themes: ThemeCatalogEntry[] | null; entry: ThemeCatalogEntry | undefined }) {
  const [category, setCategory] = useState<ThemeCategory | null>(null);
  const [query, setQuery] = useState("");
  const colors = useThemeColors(lab.theme);
  const categories = useThemeCategories(themes);
  const browsing = category !== null || query.trim() !== "";
  const { results, total } = useFilteredThemes(themes, query, category ?? "all", 48);
  const variant = findVariant(entry, lab.theme.variantId);
  const categoryName = useMemo(() => categories.find((item) => item.id === category)?.name, [categories, category]);

  const choose = (theme: ThemeCatalogEntry) => {
    const light = findVariant(theme, theme.defaultVariantId)?.light ?? false;
    lab.setTheme({ themeId: theme.id, variantId: theme.defaultVariantId, mode: light ? lab.theme.mode : "dark" });
  };

  return (
    <>
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 sm:p-6">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={`${lab.theme.themeId}-${lab.theme.variantId}-${lab.theme.mode}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {colors ? <ThemeSitePreview colors={colors} label={entry?.name ?? "Theme"} /> : <div className="aspect-[4/3] w-full animate-pulse rounded-md bg-muted" />}
          </motion.div>
        </AnimatePresence>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">{entry?.name ?? "Theme"}</h2>
            <p className="text-sm text-muted-foreground">{variant && entry && entry.variants.length > 1 ? variant.label : "Colours for the whole site"}</p>
          </div>
          <ModeSegmented mode={lab.theme.mode} lightAvailable={variant?.light ?? false} onChange={(mode) => lab.setTheme({ ...lab.theme, mode })} />
        </div>
      </div>

      {entry && entry.variants.length > 1 && (
        <RowGroup title="Versions">
          <div className="flex flex-wrap gap-2 p-3">
            {entry.variants.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === lab.theme.variantId}
                onClick={() => lab.setTheme({ ...lab.theme, variantId: option.id, mode: option.light ? lab.theme.mode : "dark" })}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${option.id === lab.theme.variantId ? "border-primary bg-accent" : "border-border hover:bg-accent"}`}
              >
                <Swatches colors={option.swatches} size="size-3" />{option.label}
              </button>
            ))}
          </div>
        </RowGroup>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <AnimatePresence initial={false}>
            {category && (
              <motion.button initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} type="button" onClick={() => setCategory(null)} className="flex shrink-0 items-center gap-1 overflow-hidden whitespace-nowrap text-sm text-primary">
                <CaretLeftIcon className="size-4" aria-hidden="true" />All
              </motion.button>
            )}
          </AnimatePresence>
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground focus-within:outline-2 focus-within:outline-ring">
            <MagnifyingGlassIcon className="size-4 shrink-0" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={categoryName ? `Search ${categoryName}` : "Search 2,000+ themes"} aria-label="Search themes" className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
          </label>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {browsing ? (
            <motion.div key={`grid-${category}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex flex-col gap-2">
              <h3 className="px-1 text-xs uppercase tracking-wider text-muted-foreground">{categoryName ?? "Results"} · {total}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {results.map((theme) => {
                  const selected = theme.id === lab.theme.themeId;
                  return (
                    <motion.button
                      layout
                      key={theme.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => choose(theme)}
                      whileHover={{ y: -2 }}
                      className={`relative flex flex-col gap-2 overflow-hidden rounded-2xl border bg-card p-3 text-left ${selected ? "border-primary" : "border-border"}`}
                    >
                      <span className="flex h-10 overflow-hidden rounded-lg">
                        {findVariant(theme, theme.defaultVariantId)?.swatches.map((color, index) => <span key={index} className="flex-1" style={{ backgroundColor: color }} />)}
                      </span>
                      <span className="truncate text-sm">{theme.name}</span>
                      {selected && <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon className="size-3" aria-hidden="true" /></span>}
                    </motion.button>
                  );
                })}
              </div>
              {total > results.length && <p className="px-1 text-xs text-muted-foreground">Showing {results.length} of {total}. Search to narrow it down.</p>}
            </motion.div>
          ) : (
            <motion.div key="categories" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
              <RowGroup title="Browse">
                {categories.length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">Loading themes…</div>}
                {categories.map((item) => (
                  <button key={item.id} type="button" onClick={() => setCategory(item.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent">
                    <span className="flex-1">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.count}</span>
                    <CaretRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </button>
                ))}
              </RowGroup>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
