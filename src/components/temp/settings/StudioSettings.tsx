import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowClockwiseIcon, CheckIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import ThemeSitePreview from "@/components/typing/ThemeSitePreview";
import { CATEGORY_CONFIG } from "@/lib/themes";
import type { ThemeCatalogEntry } from "@/types/theme";
import { KeyboardPanel, ModeSegmented, SoundPanel, Swatches, TextPanel, TypingPanel } from "./LabControls";
import { INITIAL_LAB_SETTINGS, LAB_SPRING, SECTIONS, type SectionId } from "./lab-settings";
import { SettingsLivePreview } from "./SettingsLivePreview";
import { findVariant, useFilteredThemes, useThemeCatalog, useThemeColors, type LabState, type LabTheme } from "./useLabSettings";

const SLIDE = {
  enter: (direction: number) => ({ x: direction * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction * -48, opacity: 0 }),
};

/** Mockup 3: a large live preview beside tabbed controls, so every change is seen as it happens. */
export function StudioSettings({ lab }: { lab: LabState }) {
  const themes = useThemeCatalog();
  const [[tab, direction], setTab] = useState<[SectionId, number]>(["theme", 0]);
  const [hoverTheme, setHoverTheme] = useState<LabTheme | null>(null);
  const colors = useThemeColors(hoverTheme ?? lab.theme);
  const shown = hoverTheme ?? lab.theme;
  const shownEntry = themes?.find((entry) => entry.id === shown.themeId);
  const shownVariant = findVariant(shownEntry, shown.variantId);

  const choose = (next: SectionId) => {
    const from = SECTIONS.findIndex((section) => section.id === tab);
    const to = SECTIONS.findIndex((section) => section.id === next);
    setTab([next, to >= from ? 1 : -1]);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-28 pt-8 md:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Everything you change shows up in the preview straight away.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-8">
        <div className="flex min-w-0 flex-col gap-3 md:sticky md:top-6 md:self-start">
          <div className="mx-auto w-full max-w-md md:max-w-none">
            <SettingsLivePreview colors={colors} settings={lab.settings} label={shownEntry?.name ?? "Theme"} />
          </div>
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground md:justify-start">
            {shownVariant && <Swatches colors={shownVariant.swatches} />}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={`${shown.themeId}-${shown.variantId}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={LAB_SPRING}>
                <span className="text-foreground">{shownEntry?.name ?? "Loading theme…"}</span>
                {shownVariant && shownEntry && shownEntry.variants.length > 1 && <> · {shownVariant.label}</>}
                {hoverTheme && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">previewing</span>}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div role="tablist" aria-label="Settings sections" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            {SECTIONS.map(({ id, title, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => choose(id)}
                className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${tab === id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab === id && <motion.span layoutId="studio-tab" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
                <Icon className="relative size-4 shrink-0" aria-hidden="true" />
                <span className="relative">{title}</span>
              </button>
            ))}
          </div>

          <div role="tabpanel" aria-label={SECTIONS.find((section) => section.id === tab)?.title} className="relative min-w-0 overflow-x-clip">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div key={tab} custom={direction} variants={SLIDE} initial="enter" animate="center" exit="exit" transition={LAB_SPRING}>
                <p className="mb-4 text-sm text-muted-foreground">{SECTIONS.find((section) => section.id === tab)?.description}</p>
                {tab === "theme" && <ThemeTab lab={lab} themes={themes} previewColors={colors} onHover={setHoverTheme} />}
                {tab === "text" && <TextPanel settings={lab.settings} update={lab.update} />}
                {tab === "typing" && <TypingPanel settings={lab.settings} update={lab.update} />}
                {tab === "sound" && <SoundPanel settings={lab.settings} update={lab.update} />}
                {tab === "keyboard" && <KeyboardPanel settings={lab.settings} update={lab.update} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={() => lab.update(INITIAL_LAB_SETTINGS)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
          Reset to defaults
        </button>
        <motion.button type="button" whileTap={{ scale: 0.96 }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
          <CheckIcon className="size-4 shrink-0" aria-hidden="true" />
          Done
        </motion.button>
      </div>
    </div>
  );
}

function ThemeTab({ lab, themes, previewColors, onHover }: {
  lab: LabState;
  themes: ThemeCatalogEntry[] | null;
  previewColors: ReturnType<typeof useThemeColors>;
  onHover: (theme: LabTheme | null) => void;
}) {
  const [query, setQuery] = useState("");
  const { results, total } = useFilteredThemes(themes, query, "all", 80);
  const featured = (themes ?? []).filter((entry) => entry.category === "default").slice(0, 6);
  const selected = themes?.find((entry) => entry.id === lab.theme.themeId);
  const selectedVariant = findVariant(selected, lab.theme.variantId);
  const selectedColors = useThemeColors(lab.theme);

  const asTheme = (entry: ThemeCatalogEntry, variantId = entry.defaultVariantId): LabTheme => {
    const variant = findVariant(entry, variantId);
    return { themeId: entry.id, variantId: variant?.id ?? variantId, mode: variant?.light ? lab.theme.mode : "dark" };
  };
  const select = (entry: ThemeCatalogEntry, variantId?: string) => {
    lab.setTheme(asTheme(entry, variantId));
    onHover(null);
  };
  const hoverProps = (entry: ThemeCatalogEntry) => ({
    onPointerEnter: () => onHover(asTheme(entry)),
    onPointerLeave: () => onHover(null),
    onFocus: () => onHover(asTheme(entry)),
    onBlur: () => onHover(null),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="w-full shrink-0 sm:w-40">
          {(selectedColors ?? previewColors) && <ThemeSitePreview colors={(selectedColors ?? previewColors)!} label={selected?.name ?? "Selected theme"} />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{selected?.name ?? "Loading…"}</div>
            <div className="text-xs text-muted-foreground">{selected ? CATEGORY_CONFIG[selected.category].displayName : ""}</div>
          </div>
          <ModeSegmented mode={lab.theme.mode} lightAvailable={Boolean(selectedVariant?.light)} onChange={(mode) => lab.setTheme({ ...lab.theme, mode })} />
        </div>
      </div>

      {selected && selected.variants.length > 1 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Variants</h3>
          <div className="flex flex-wrap gap-2">
            {selected.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                aria-pressed={variant.id === lab.theme.variantId}
                onClick={() => select(selected, variant.id)}
                onPointerEnter={() => onHover(asTheme(selected, variant.id))}
                onPointerLeave={() => onHover(null)}
                className={`relative flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${variant.id === lab.theme.variantId ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <Swatches colors={variant.swatches} size="size-3" />
                {variant.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {featured.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Featured</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {featured.map((entry) => {
              const active = entry.id === lab.theme.themeId;
              const variant = findVariant(entry, entry.defaultVariantId);
              return (
                <motion.button
                  key={entry.id}
                  type="button"
                  aria-label={entry.name}
                  aria-pressed={active}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => select(entry)}
                  {...hoverProps(entry)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-[0.65rem] ${active ? "border-primary bg-accent" : "border-border bg-card"}`}
                >
                  <span className="grid size-8 grid-cols-2 overflow-hidden rounded-lg" aria-hidden="true">
                    {variant?.swatches.map((color, index) => <span key={index} style={{ backgroundColor: color }} />)}
                  </span>
                  <span className="w-full truncate text-center text-muted-foreground">{entry.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="relative">
          <span className="sr-only">Search themes</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={themes ? `Search ${themes.length.toLocaleString()} themes` : "Loading themes…"}
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
        <div className="max-h-80 overflow-y-auto rounded-2xl border border-border bg-card" onPointerLeave={() => onHover(null)}>
          {themes === null && <p className="p-4 text-sm text-muted-foreground">Loading themes…</p>}
          {themes && results.length === 0 && <p className="p-4 text-sm text-muted-foreground">No themes match “{query}”.</p>}
          <ul className="divide-y divide-border">
            {results.map((entry) => {
              const active = entry.id === lab.theme.themeId;
              const variant = findVariant(entry, entry.defaultVariantId);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => select(entry)}
                    {...hoverProps(entry)}
                    className={`relative flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none ${active ? "text-foreground" : ""}`}
                  >
                    {active && <motion.span layoutId="studio-theme-row" transition={LAB_SPRING} className="absolute inset-y-1 left-1 w-1 rounded-full bg-primary" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{entry.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {CATEGORY_CONFIG[entry.category].displayName}{entry.variants.length > 1 ? ` · ${entry.variants.length} variants` : ""}
                      </span>
                    </span>
                    {variant && <Swatches colors={variant.swatches} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {total > results.length && <p className="text-xs text-muted-foreground">Showing {results.length} of {total.toLocaleString()}. Search to narrow it down.</p>}
      </div>
    </div>
  );
}
