import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { CheckIcon, MagnifyingGlassIcon, PaletteIcon } from "@phosphor-icons/react";
import ThemeSitePreview from "@/components/typing/ThemeSitePreview";
import { CATEGORY_CONFIG } from "@/lib/themes";
import type { ThemeCatalogEntry, ThemeCategory } from "@/types/theme";
import { KeyboardPanel, ModeSegmented, SoundPanel, Swatches, TextPanel, TypingPanel } from "./LabControls";
import { LAB_SPRING, SECTIONS, type SectionId } from "./lab-settings";
import { SettingsLivePreview } from "./SettingsLivePreview";
import { findVariant, useFilteredThemes, useThemeCatalog, useThemeCategories, useThemeColors, type LabState } from "./useLabSettings";

const PAGE_SIZE = 24;
const SM_QUERY = "(min-width: 640px)";
const LG_QUERY = "(min-width: 1024px)";

function subscribeColumns(onChange: () => void) {
  const queries = [window.matchMedia(SM_QUERY), window.matchMedia(LG_QUERY)];
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () => queries.forEach((query) => query.removeEventListener("change", onChange));
}

const readColumns = () => (window.matchMedia(LG_QUERY).matches ? 4 : window.matchMedia(SM_QUERY).matches ? 3 : 2);

/** Matches the grid's Tailwind breakpoints, so variant chips open after the selected card's row. */
function useGridColumns() {
  return useSyncExternalStore(subscribeColumns, readColumns, () => 2);
}

const swatchBand = (colors: string[]) =>
  `linear-gradient(90deg, ${colors.map((color, index) => `${color} ${index * 25}% ${(index + 1) * 25}%`).join(", ")})`;

/** Mockup 4: one theme-first scrolling page with a scrollspy nav and an inline theme gallery. */
export function GallerySettings({ lab }: { lab: LabState }) {
  const [active, setActive] = useState<SectionId>("theme");
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.getAttribute("data-section") as SectionId);
    }, { rootMargin: "-30% 0px -60% 0px" });
    pageRef.current?.querySelectorAll("[data-section]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const jump = (id: SectionId) => {
    setActive(id);
    pageRef.current?.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={pageRef} className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Everything you can change, on one page. Start with how it looks.</p>
      </header>

      <nav aria-label="Settings sections" className="sticky top-0 z-30 -mx-4 mb-8 border-b border-border bg-background/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {SECTIONS.map(({ id, title, Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={active === id ? "location" : undefined}
              onClick={() => jump(id)}
              className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${active === id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {active === id && <motion.span layoutId="gallery-nav" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
              <Icon className="relative size-4" aria-hidden="true" />
              <span className="relative">{title}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-16">
        <section data-section="theme" aria-labelledby="gallery-theme" className="scroll-mt-20">
          <ThemeShowcase lab={lab} />
        </section>

        {SECTIONS.filter((section) => section.id !== "theme").map(({ id, title, description, Icon, tile }) => (
          <section key={id} data-section={id} aria-labelledby={`gallery-${id}`} className="scroll-mt-20">
            <div className="rounded-3xl border border-border bg-card/40 p-5 sm:p-8">
              <div className="mb-6 flex items-start gap-4">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tile}`}><Icon className="size-6" aria-hidden="true" /></span>
                <div>
                  <h2 id={`gallery-${id}`} className="text-2xl font-bold">{title}</h2>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              {id === "text" ? (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                  <TextPanel settings={lab.settings} update={lab.update} />
                  <TextPreview lab={lab} />
                </div>
              ) : id === "typing" ? (
                <TypingPanel settings={lab.settings} update={lab.update} />
              ) : id === "sound" ? (
                <SoundPanel settings={lab.settings} update={lab.update} />
              ) : (
                <KeyboardPanel settings={lab.settings} update={lab.update} />
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function TextPreview({ lab }: { lab: LabState }) {
  const colors = useThemeColors(lab.theme);
  return (
    <div className="hidden lg:sticky lg:top-20 lg:block">
      <SettingsLivePreview colors={colors} settings={lab.settings} label="Text preview" />
    </div>
  );
}

function ThemeShowcase({ lab }: { lab: LabState }) {
  const themes = useThemeCatalog();
  const categories = useThemeCategories(themes);
  const colors = useThemeColors(lab.theme);
  const columns = useGridColumns();
  const [category, setCategory] = useState<ThemeCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { results, total } = useFilteredThemes(themes, query, category, visible);

  const selectedEntry = themes?.find((theme) => theme.id === lab.theme.themeId);
  const selectedVariant = findVariant(selectedEntry, lab.theme.variantId);
  const lightAvailable = selectedVariant?.light ?? false;
  const themeKey = `${lab.theme.themeId}-${lab.theme.variantId}-${lab.theme.mode}`;

  const filterBy = (next: ThemeCategory | "all") => { setCategory(next); setVisible(PAGE_SIZE); setExpandedId(null); };
  const search = (next: string) => { setQuery(next); setVisible(PAGE_SIZE); setExpandedId(null); };
  const choose = (entry: ThemeCatalogEntry) => {
    if (entry.id === lab.theme.themeId) {
      setExpandedId((current) => (current === entry.id ? null : entry.id));
      return;
    }
    const variant = findVariant(entry, entry.defaultVariantId);
    lab.setTheme({ themeId: entry.id, variantId: entry.defaultVariantId, mode: lab.theme.mode === "light" && variant?.light ? "light" : "dark" });
    setExpandedId(entry.variants.length > 1 ? entry.id : null);
  };

  const expandedIndex = results.findIndex((theme) => theme.id === expandedId);
  const expandAfter = expandedIndex < 0 ? -1 : Math.min(results.length - 1, Math.floor(expandedIndex / columns) * columns + columns - 1);
  const expandedEntry = expandedIndex < 0 ? undefined : results[expandedIndex];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-xl">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={themeKey} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
              {colors ? (
                <ThemeSitePreview colors={colors} label={selectedEntry?.name ?? "Selected theme"} />
              ) : (
                <div className="aspect-[4/3] w-full animate-pulse rounded-md bg-muted" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{selectedEntry ? CATEGORY_CONFIG[selectedEntry.category].displayName : "Theme"}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2 id="gallery-theme" key={selectedEntry?.id ?? "loading"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-3xl font-bold">
                {selectedEntry?.name ?? "Theme"}
              </motion.h2>
            </AnimatePresence>
            {selectedVariant && selectedEntry && selectedEntry.variants.length > 1 && (
              <p className="text-sm text-muted-foreground">{selectedVariant.label} · {selectedEntry.variants.length} looks</p>
            )}
          </div>
          <ModeSegmented mode={lab.theme.mode} lightAvailable={lightAvailable} onChange={(mode) => lab.setTheme({ ...lab.theme, mode })} />
          {!lightAvailable && <p className="text-xs text-muted-foreground">This look only comes in dark.</p>}
          <p className="text-sm text-muted-foreground">Pick a theme below. The preview shows it before anything changes.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <LayoutGroup id="gallery-categories">
          <div role="radiogroup" aria-label="Theme categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
            {[{ id: "all" as const, name: "All", count: themes?.length ?? 0 }, ...categories].map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="radio"
                aria-checked={category === entry.id}
                onClick={() => filterBy(entry.id)}
                className={`relative shrink-0 rounded-full border border-border px-4 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${category === entry.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {category === entry.id && <motion.span layoutId="gallery-category" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
                <span className="relative">{entry.name} <span className="opacity-60">{entry.count}</span></span>
              </button>
            ))}
          </div>
        </LayoutGroup>

        <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:outline-2 focus-within:outline-ring">
          <MagnifyingGlassIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input value={query} onChange={(event) => search(event.target.value)} placeholder="Search themes" aria-label="Search themes" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>

        {!themes ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : results.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No themes match “{query}”.</p>
        ) : (
          <LayoutGroup id="gallery-grid">
            <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((entry, index) => (
                <Fragment key={entry.id}>
                  <ThemeCard entry={entry} selected={entry.id === lab.theme.themeId} variantId={lab.theme.variantId} onSelect={() => choose(entry)} />
                  {index === expandAfter && expandedEntry && (
                    <VariantRow entry={expandedEntry} lab={lab} onClose={() => setExpandedId(null)} />
                  )}
                </Fragment>
              ))}
            </motion.div>
          </LayoutGroup>
        )}

        {themes && total > results.length && (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)} className="rounded-full border border-border bg-card px-5 py-2 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
              Show more
            </button>
            <span className="text-xs text-muted-foreground">Showing {results.length} of {total}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ThemeCard({ entry, selected, variantId, onSelect }: { entry: ThemeCatalogEntry; selected: boolean; variantId: string; onSelect: () => void }) {
  const variant = selected ? findVariant(entry, variantId) : findVariant(entry, entry.defaultVariantId);
  const swatches = variant?.swatches ?? [];
  return (
    <motion.button
      layout
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={LAB_SPRING}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "border-primary ring-2 ring-primary" : "border-border"}`}
    >
      <span className="h-16 w-full" style={{ background: swatchBand(swatches) }} aria-hidden="true" />
      <span className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{entry.name}</span>
          <span className="text-xs text-muted-foreground">{entry.variants.length === 1 ? "1 look" : `${entry.variants.length} looks`}</span>
        </span>
        <Swatches colors={swatches} size="size-3" />
      </span>
      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
          >
            <CheckIcon className="size-3.5" weight="bold" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function VariantRow({ entry, lab, onClose }: { entry: ThemeCatalogEntry; lab: LabState; onClose: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={LAB_SPRING}
      className="col-span-full overflow-hidden"
    >
      <div role="radiogroup" aria-label={`${entry.name} looks`} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/60 p-3">
        <PaletteIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="mr-1 text-xs uppercase tracking-wider text-muted-foreground">{entry.name} looks</span>
        {entry.variants.map((variant) => {
          const checked = lab.theme.themeId === entry.id && lab.theme.variantId === variant.id;
          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => lab.setTheme({ themeId: entry.id, variantId: variant.id, mode: lab.theme.mode === "light" && variant.light ? "light" : "dark" })}
              className={`relative flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${checked ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {checked && <motion.span layoutId={`gallery-variant-${entry.id}`} transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-accent" />}
              <span className="relative"><Swatches colors={variant.swatches} size="size-3" /></span>
              <span className="relative">{variant.label}</span>
            </button>
          );
        })}
        <button type="button" onClick={onClose} className="ml-auto rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">Done</button>
      </div>
    </motion.div>
  );
}
