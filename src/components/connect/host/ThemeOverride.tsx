import { useMemo, useState } from "react";
import { ArrowsClockwiseIcon, CheckIcon, MoonIcon, PaletteIcon, SunIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ThemeCatalogEntry } from "@/types/theme";
import { cn } from "@/lib/utils";
import { Pills } from "@/components/connect/ConnectParts";
import { formatThemeId, type ThemeCatalog } from "./theme-catalog";

type ThemeValue = { themeId: string; mode: "dark" | "light"; variantId?: string };

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

function findVariant(entry: ThemeCatalogEntry, variantId?: string) {
  return entry.variants.find((variant) => variant.id === variantId)
    ?? entry.variants.find((variant) => variant.id === entry.defaultVariantId) ?? entry.variants[0];
}

function Swatches({ entry, variantId, className }: { entry: ThemeCatalogEntry | undefined; variantId?: string; className?: string }) {
  const swatches = entry ? findVariant(entry, variantId)?.swatches : undefined;
  if (!swatches) return <PaletteIcon className="size-5 text-muted-foreground" aria-hidden="true" />;
  return (
    <span className={cn("flex shrink-0 overflow-hidden rounded-md", className)} aria-hidden="true">
      {swatches.map((color, index) => <span key={index} className="min-w-4 flex-1" style={{ backgroundColor: color }} />)}
    </span>
  );
}

function ThemeBrowser({ open, onOpenChange, selected, onSelect, catalog }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string;
  onSelect: (themeId: string) => void;
  catalog: ThemeCatalog;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = normalize(query);
    return (catalog.themes ?? []).filter((entry) => !needle || normalize(entry.name).includes(needle) || entry.category.includes(needle));
  }, [catalog.themes, query]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Room theme</DialogTitle>
          <DialogDescription>Students see these colours while the theme setting is on. Their own saved theme stays as it is.</DialogDescription>
        </DialogHeader>
        <input aria-label="Search themes" placeholder="Search themes" value={query} onChange={(event) => setQuery(event.target.value)}
          className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20" />
        {catalog.state === "loading" && <p role="status" className="text-sm text-muted-foreground">Loading themes…</p>}
        {catalog.state === "error" && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
            Themes couldn't load.
            <button type="button" onClick={catalog.load} className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
              <ArrowsClockwiseIcon className="size-4" aria-hidden="true" />Retry
            </button>
          </div>
        )}
        {catalog.state === "ready" && (
          <ul className="max-h-[50dvh] space-y-1 overflow-y-auto pr-1" aria-label="Themes">
            {filtered.map((entry) => (
              <li key={entry.id}>
                <button type="button" aria-pressed={entry.id === selected} onClick={() => { onSelect(entry.id); onOpenChange(false); }}
                  className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring",
                    entry.id === selected && "bg-muted font-semibold")}>
                  <Swatches entry={entry} className="h-5 w-16" />
                  <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                  {entry.id === selected && <CheckIcon className="size-4 text-primary" aria-hidden="true" />}
                </button>
              </li>
            ))}
            {!filtered.length && <li className="px-3 py-2 text-sm text-muted-foreground">No themes match “{query}”.</li>}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ThemeOverride({ value, onChange, catalog }: { value: ThemeValue; onChange: (value: ThemeValue) => void; catalog: ThemeCatalog }) {
  const [browsing, setBrowsing] = useState(false);
  const entry = catalog.themes?.find((theme) => theme.id === value.themeId);
  const look = entry ? findVariant(entry, value.variantId) : undefined;
  const hasLight = entry ? Boolean(look?.light) : true;
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setBrowsing(true)} aria-label={`Choose theme (now ${entry?.name ?? formatThemeId(value.themeId)})`}
        className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-ring">
        <Swatches entry={entry} variantId={value.variantId} className="h-10 w-16 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{entry?.name ?? formatThemeId(value.themeId)}</span>
          <span className="block text-xs text-muted-foreground">Tap to browse every theme</span>
        </span>
        <PaletteIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      <Pills<ThemeValue["mode"]> label="Light or dark" value={hasLight ? value.mode : "dark"} onChange={(mode) => onChange({ ...value, mode })}
        options={[{ value: "dark", label: "Dark", Icon: MoonIcon }, { value: "light", label: "Light", Icon: SunIcon, disabled: !hasLight }]} />
      {!hasLight && <p className="text-xs text-muted-foreground">This theme has no light version.</p>}
      {entry && entry.variants.length > 1 && (
        <div role="radiogroup" aria-label="Theme look" className="flex flex-wrap gap-1.5">
          {entry.variants.map((variant) => {
            const selected = variant.id === look?.id;
            return (
              <button key={variant.id} type="button" role="radio" aria-checked={selected} onClick={() => onChange({ ...value, variantId: variant.id, mode: variant.light ? value.mode : "dark" })}
                className={cn("flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  selected ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground")}>
                <Swatches entry={entry} variantId={variant.id} className="h-4 w-8" />
                {variant.label}
              </button>
            );
          })}
        </div>
      )}
      <ThemeBrowser open={browsing} onOpenChange={setBrowsing} selected={value.themeId} catalog={catalog}
        onSelect={(themeId) => {
          const next = catalog.themes?.find((theme) => theme.id === themeId);
          if (!next) return;
          onChange({ themeId, variantId: next.defaultVariantId, mode: findVariant(next)?.light ? value.mode : "dark" });
        }} />
    </div>
  );
}
