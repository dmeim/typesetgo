import { Fragment, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { CheckIcon, MagnifyingGlassIcon, PaletteIcon } from "@phosphor-icons/react";
import { CATEGORY_CONFIG } from "@/lib/themes";
import type { ThemeCatalogEntry, ThemeCategory } from "@/types/theme";
import { ModeSegmented, Swatches } from "./LabControls";
import { ScrollRow } from "@/components/ui/scroll-row";
import { LAB_SPRING } from "./lab-settings";
import { findVariant, useFilteredThemes, useThemeCatalog, useThemeCategories, type LabState } from "./useLabSettings";

const PAGE_SIZE = 24;

const swatchBand = (colors: string[]) =>
  `linear-gradient(90deg, ${colors.map((color, index) => `${color} ${index * 25}% ${(index + 1) * 25}%`).join(", ")})`;

/** Counts the auto-fill columns the grid actually laid out, so a variant row opens under the right row. */
function useGridColumns() {
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(2);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setColumns(getComputedStyle(element).gridTemplateColumns.split(" ").length || 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, columns] as const;
}

/** The gallery-style theme picker: header with light/dark, category chips, search and a card grid. */
export function ThemeGallery({ lab }: { lab: LabState }) {
  const themes = useThemeCatalog();
  const categories = useThemeCategories(themes);
  const [gridRef, columns] = useGridColumns();
  const [category, setCategory] = useState<ThemeCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { results, total } = useFilteredThemes(themes, query, category, visible);

  const selectedEntry = themes?.find((theme) => theme.id === lab.theme.themeId);
  const selectedVariant = findVariant(selectedEntry, lab.theme.variantId);
  const lightAvailable = selectedVariant?.light ?? false;

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
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-border bg-card p-5">
        <div className="min-w-0">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{selectedEntry ? CATEGORY_CONFIG[selectedEntry.category].displayName : "Theme"}</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2 key={selectedEntry?.id ?? "loading"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-3xl font-bold">
              {selectedEntry?.name ?? "Theme"}
            </motion.h2>
          </AnimatePresence>
          <p className="text-sm text-muted-foreground">
            {selectedVariant && selectedEntry && selectedEntry.variants.length > 1 ? `${selectedVariant.label} · ${selectedEntry.variants.length} looks` : "Colours for the whole site"}
            {!lightAvailable && " · dark only"}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <ModeSegmented mode={lab.theme.mode} lightAvailable={lightAvailable} onChange={(mode) => lab.setTheme({ ...lab.theme, mode })} />
        </div>
      </div>

      <LayoutGroup id="split-categories">
        <ScrollRow role="radiogroup" aria-label="Theme categories" expandable expandLabel={`All ${categories.length + 1}`}>
          {[{ id: "all" as const, name: "All", count: themes?.length ?? 0 }, ...categories].map((entry) => (
            <motion.button
              layout="position"
              transition={LAB_SPRING}
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={category === entry.id}
              onClick={() => filterBy(entry.id)}
              className={`relative shrink-0 rounded-full border border-border px-4 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${category === entry.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {category === entry.id && <motion.span layoutId="split-category" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
              <span className="relative whitespace-nowrap">{entry.name} <span className="opacity-60">{entry.count}</span></span>
            </motion.button>
          ))}
        </ScrollRow>
      </LayoutGroup>

      <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:outline-2 focus-within:outline-ring">
        <MagnifyingGlassIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input value={query} onChange={(event) => search(event.target.value)} placeholder="Search themes" aria-label="Search themes" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </label>

      {!themes ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : results.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No themes match “{query}”.</p>
      ) : (
        <LayoutGroup id="split-grid">
          <motion.div ref={gridRef} layout className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
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
              {checked && <motion.span layoutId={`split-variant-${entry.id}`} transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-accent" />}
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
