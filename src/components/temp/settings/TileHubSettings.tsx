import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretRightIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import ThemeSitePreview from "@/components/typing/ThemeSitePreview";
import { getTypingFontOption, getTypingFontFamily } from "@/lib/typing-fonts";
import type { ThemeCategory } from "@/types/theme";
import { KeyboardPanel, LabSwitch, ModeSegmented, SoundPanel, Swatches, TextPanel, TypingPanel } from "./LabControls";
import { LAB_SPRING, SECTIONS, type SectionId, type SectionMeta } from "./lab-settings";
import { findVariant, useFilteredThemes, useThemeCatalog, useThemeCategories, useThemeColors, type LabState } from "./useLabSettings";

const TILE_LAYOUT: Record<SectionId, string> = {
  theme: "sm:col-span-2 sm:row-span-2",
  text: "sm:col-span-2",
  typing: "",
  sound: "",
  keyboard: "sm:col-span-2",
};

/** Mockup 2: a Control Center style grid. Tiles show current values and quick toggles, and morph open into full controls. */
export function TileHubSettings({ lab }: { lab: LabState }) {
  const [open, setOpen] = useState<SectionId | null>(null);
  const tileRefs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});
  const returnFocusRef = useRef<SectionId | null>(null);
  const themes = useThemeCatalog();
  const colors = useThemeColors(lab.theme);
  const entry = themes?.find((theme) => theme.id === lab.theme.themeId);

  const close = () => {
    returnFocusRef.current = open;
    setOpen(null);
  };

  useEffect(() => {
    if (open) return;
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target) tileRefs.current[target]?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      returnFocusRef.current = open;
      setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const summary = (id: SectionId): ReactNode => {
    const { settings, update } = lab;
    switch (id) {
      case "theme":
        return (
          <div className="flex flex-1 flex-col gap-3">
            <div className="overflow-hidden rounded-xl border border-border">
              {colors ? <ThemeSitePreview colors={colors} label={entry?.name ?? "Theme"} /> : <div className="aspect-[4/3] animate-pulse bg-muted" />}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold">{entry?.name ?? lab.theme.themeId}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {lab.theme.mode}
                <Swatches colors={findVariant(entry, lab.theme.variantId)?.swatches ?? []} />
              </span>
            </div>
          </div>
        );
      case "text":
        return (
          <div className="flex items-center gap-4">
            <motion.span layout transition={LAB_SPRING} className="text-5xl leading-none text-primary" style={{ fontFamily: getTypingFontFamily(settings.typingFontFamily) }}>Aa</motion.span>
            <div className="flex min-w-0 flex-col text-sm">
              <span className="truncate">{getTypingFontOption(settings.typingFontFamily).label}</span>
              <span className="text-xs text-muted-foreground">{settings.typingFontSize}rem · {settings.textAlign}</span>
            </div>
          </div>
        );
      case "typing":
        return (
          <QuickToggle label="Ghost racer" detail={settings.ghostWriterEnabled ? `${settings.ghostWriterSpeed} wpm` : `${settings.linePreview} lines`} checked={settings.ghostWriterEnabled} onChange={(ghostWriterEnabled) => update({ ghostWriterEnabled })} />
        );
      case "sound":
        return (
          <QuickToggle label="Sound" detail={settings.soundEnabled ? settings.typingSound || "on" : "off"} checked={settings.soundEnabled} onChange={(soundEnabled) => update({ soundEnabled })} />
        );
      case "keyboard":
        return (
          <div className="flex items-center justify-between gap-3">
            <MiniKeys active={settings.showOnScreenKeyboard} />
            <QuickToggle label="On-screen keyboard" detail={settings.keyboardLayout.toUpperCase()} checked={settings.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => update({ showOnScreenKeyboard })} />
          </div>
        );
    }
  };

  const openSection = SECTIONS.find((section) => section.id === open);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-10 pb-28 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tap a tile to change it. Quick switches work right on the tile.</p>
      </header>

      <div className="grid auto-rows-[minmax(9rem,auto)] grid-cols-1 gap-4 sm:grid-cols-4">
        {SECTIONS.map((section) => (
          <motion.div
            key={section.id}
            ref={(element) => { tileRefs.current[section.id] = element; }}
            layoutId={`tile-${section.id}`}
            transition={LAB_SPRING}
            role="button"
            tabIndex={0}
            aria-haspopup="dialog"
            aria-label={`${section.title} settings`}
            onClick={() => setOpen(section.id)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
              event.preventDefault();
              setOpen(section.id);
            }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            style={{ borderRadius: 24 }}
            className={`flex cursor-pointer flex-col gap-4 border border-border bg-card p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${TILE_LAYOUT[section.id]} ${open === section.id ? "invisible" : ""}`}
          >
            <TileHeading section={section} />
            {summary(section.id)}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {open && openSection && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
              aria-hidden="true"
            />
            <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center overflow-y-auto px-3 pt-8 pb-24 sm:px-6 sm:pt-16">
              <motion.div
                key={open}
                layoutId={`tile-${open}`}
                transition={LAB_SPRING}
                role="dialog"
                aria-modal="true"
                aria-label={`${openSection.title} settings`}
                style={{ borderRadius: 28 }}
                className={`pointer-events-auto w-full overflow-hidden border border-border bg-card shadow-2xl ${open === "theme" ? "max-w-5xl" : "max-w-xl"}`}
              >
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.12 } }} exit={{ opacity: 0, transition: { duration: 0.06 } }} className="flex flex-col gap-5 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <TileHeading section={openSection} />
                      <p className="mt-2 text-sm text-muted-foreground">{openSection.description}</p>
                    </div>
                    <CloseButton onClose={close} />
                  </div>
                  {open === "theme" ? <ThemeDetail lab={lab} /> : <SectionDetail id={open} lab={lab} />}
                </motion.div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function TileHeading({ section }: { section: SectionMeta }) {
  const { Icon } = section;
  return (
    <div className="flex items-center gap-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${section.tile}`}>
        <Icon weight="fill" className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold">{section.title}</span>
      <CaretRightIcon className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return (
    <button ref={ref} type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-muted p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
      <XIcon className="size-4" aria-hidden="true" />
    </button>
  );
}

function QuickToggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm">{label}</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={detail} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={LAB_SPRING} className="truncate text-xs text-muted-foreground">
            {detail}
          </motion.span>
        </AnimatePresence>
      </div>
      <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <LabSwitch label={label} checked={checked} onChange={onChange} />
      </span>
    </div>
  );
}

function MiniKeys({ active }: { active: boolean }) {
  return (
    <motion.div animate={{ opacity: active ? 1 : 0.35 }} className="hidden flex-col gap-1 font-mono text-[0.6rem] sm:flex" aria-hidden="true">
      {["qwert", "asdfg", "zxcvb"].map((row, rowIndex) => (
        <div key={row} className="flex gap-1" style={{ paddingLeft: rowIndex * 6 }}>
          {[...row].map((key) => (
            <span key={key} className={`flex size-5 items-center justify-center rounded border border-border ${active && key === "f" ? "bg-primary text-primary-foreground" : "bg-background"}`}>{key}</span>
          ))}
        </div>
      ))}
    </motion.div>
  );
}

function SectionDetail({ id, lab }: { id: Exclude<SectionId, "theme">; lab: LabState }) {
  const props = { settings: lab.settings, update: lab.update };
  if (id === "text") return <TextPanel {...props} />;
  if (id === "typing") return <TypingPanel {...props} />;
  if (id === "sound") return <SoundPanel {...props} />;
  return <KeyboardPanel {...props} />;
}

function ThemeDetail({ lab }: { lab: LabState }) {
  const themes = useThemeCatalog();
  const colors = useThemeColors(lab.theme);
  const categories = useThemeCategories(themes);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ThemeCategory | "all">("all");
  const { results, total } = useFilteredThemes(themes, query, category, 48);
  const entry = themes?.find((theme) => theme.id === lab.theme.themeId);
  const variant = findVariant(entry, lab.theme.variantId);

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col gap-3 md:sticky md:top-0 md:self-start">
        <motion.div layout transition={LAB_SPRING} className="overflow-hidden rounded-xl border border-border">
          {colors ? <ThemeSitePreview colors={colors} label={entry?.name ?? "Theme"} /> : <div className="aspect-[4/3] animate-pulse bg-muted" />}
        </motion.div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{entry?.name ?? lab.theme.themeId}</span>
          <Swatches colors={variant?.swatches ?? []} />
        </div>
        <ModeSegmented mode={lab.theme.mode} lightAvailable={variant?.light ?? false} onChange={(mode) => lab.setTheme({ ...lab.theme, mode })} />
        {entry && entry.variants.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Variant">
            {entry.variants.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={option.id === lab.theme.variantId}
                onClick={() => lab.setTheme({ ...lab.theme, variantId: option.id, mode: option.light ? lab.theme.mode : "dark" })}
                className={`relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${option.id === lab.theme.variantId ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <Swatches colors={option.swatches.slice(0, 2)} size="size-3" />
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:outline-2 focus-within:outline-ring">
          <MagnifyingGlassIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search themes" aria-label="Search themes" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Theme category">
          {[{ id: "all" as const, name: "All", count: themes?.length ?? 0 }, ...categories].map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={category === option.id}
              onClick={() => setCategory(option.id)}
              className={`relative shrink-0 rounded-full px-3 py-1 text-xs whitespace-nowrap ${category === option.id ? "text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:text-foreground"}`}
            >
              {category === option.id && <motion.span layoutId="hub-theme-category" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
              <span className="relative">{option.name} <span className="opacity-60">{option.count}</span></span>
            </button>
          ))}
        </div>
        <div className="grid max-h-[26rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {themes === null && Array.from({ length: 6 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />)}
          {results.map((theme) => {
            const selected = theme.id === lab.theme.themeId;
            const swatches = findVariant(theme, theme.defaultVariantId)?.swatches ?? [];
            return (
              <motion.button
                key={theme.id}
                layout
                transition={LAB_SPRING}
                type="button"
                aria-pressed={selected}
                onClick={() => lab.setTheme({ themeId: theme.id, variantId: theme.defaultVariantId, mode: findVariant(theme, theme.defaultVariantId)?.light ? lab.theme.mode : "dark" })}
                whileTap={{ scale: 0.97 }}
                className={`relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-left ${selected ? "border-primary bg-accent" : "border-border bg-background hover:bg-accent"}`}
              >
                <span className="flex h-8 w-10 shrink-0 overflow-hidden rounded-md border border-border" aria-hidden="true">
                  {swatches.map((color, index) => <span key={index} className="flex-1" style={{ backgroundColor: color }} />)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{theme.name}</span>
                {theme.variants.length > 1 && <span className="shrink-0 text-[0.65rem] text-muted-foreground">{theme.variants.length} looks</span>}
              </motion.button>
            );
          })}
          {themes !== null && results.length === 0 && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">No themes match “{query}”.</p>}
        </div>
        {themes !== null && <p className="text-xs text-muted-foreground">Showing {results.length} of {total}</p>}
      </div>
    </div>
  );
}
