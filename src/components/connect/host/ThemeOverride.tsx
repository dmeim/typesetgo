import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowsClockwiseIcon, CheckIcon, PaletteIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchThemeCatalogIndex } from "@/lib/themes";
import type { ThemeCatalogEntry } from "@/types/theme";
import { cn } from "@/lib/utils";
import { Segmented } from "./Segmented";

type ThemeValue = { themeId: string; mode: "dark" | "light" };

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
const formatId = (id: string) => id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

function defaultVariant(entry: ThemeCatalogEntry) {
  return entry.variants.find((variant) => variant.id === entry.defaultVariantId) ?? entry.variants[0];
}

function Swatches({ entry }: { entry: ThemeCatalogEntry | undefined }) {
  const swatches = entry ? defaultVariant(entry)?.swatches : undefined;
  if (!swatches) return <PaletteIcon className="size-5 text-muted-foreground" aria-hidden="true" />;
  return (
    <span className="flex shrink-0 overflow-hidden rounded-md border border-border" aria-hidden="true">
      {swatches.map((color, index) => <span key={index} className="size-4" style={{ backgroundColor: color }} />)}
    </span>
  );
}

function useThemeCatalog() {
  const [themes, setThemes] = useState<ThemeCatalogEntry[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const load = useCallback(() => {
    setState("loading");
    void fetchThemeCatalogIndex().then((catalog) => {
      if (!catalog) { setState("error"); return; }
      setThemes(catalog.themes);
      setState("ready");
    });
  }, []);
  return { themes, state, load };
}

function ThemeBrowser({ open, onOpenChange, selected, onSelect, catalog }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string;
  onSelect: (themeId: string) => void;
  catalog: ReturnType<typeof useThemeCatalog>;
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
          <DialogTitle>Participant theme</DialogTitle>
          <DialogDescription>Participants see this theme while the theme setting is on. Their own saved theme is unchanged.</DialogDescription>
        </DialogHeader>
        <Input aria-label="Search themes" placeholder="Search themes" value={query} onChange={(event) => setQuery(event.target.value)} />
        {catalog.state === "loading" && <p role="status" className="text-sm text-muted-foreground">Loading themes…</p>}
        {catalog.state === "error" && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
            Themes couldn't load.
            <Button type="button" variant="outline" size="sm" onClick={catalog.load}>
              <ArrowsClockwiseIcon aria-hidden="true" />
              Retry
            </Button>
          </div>
        )}
        {catalog.state === "ready" && (
          <ul className="max-h-[50dvh] space-y-1 overflow-y-auto pr-1" aria-label="Themes">
            {filtered.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-pressed={entry.id === selected}
                  onClick={() => { onSelect(entry.id); onOpenChange(false); }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring",
                    entry.id === selected && "bg-muted font-medium",
                  )}
                >
                  <Swatches entry={entry} />
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

export function ThemeOverride({ value, onChange }: { value: ThemeValue; onChange: (value: ThemeValue) => void }) {
  const [browsing, setBrowsing] = useState(false);
  const catalog = useThemeCatalog();
  const { state, load } = catalog;
  // Metadata is small; load it once so the current theme shows its name and swatches.
  useEffect(() => { if (state === "idle") load(); }, [state, load]);
  const entry = catalog.themes?.find((theme) => theme.id === value.themeId);
  const hasLight = entry ? Boolean(defaultVariant(entry)?.light) : true;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Swatches entry={entry} />
        <span className="min-w-[8rem] flex-1 truncate text-sm font-medium">{entry?.name ?? formatId(value.themeId)}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setBrowsing(true)}>
          <PaletteIcon aria-hidden="true" />
          Choose theme
        </Button>
      </div>
      <Segmented<ThemeValue["mode"]>
        label="Theme mode"
        value={value.mode}
        onChange={(mode) => onChange({ ...value, mode })}
        options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light", disabled: !hasLight }]}
      />
      {!hasLight && <p className="text-xs text-muted-foreground">This theme has no light version.</p>}
      <ThemeBrowser
        open={browsing}
        onOpenChange={setBrowsing}
        selected={value.themeId}
        catalog={catalog}
        onSelect={(themeId) => {
          const next = catalog.themes?.find((theme) => theme.id === themeId);
          const light = next ? Boolean(defaultVariant(next)?.light) : true;
          onChange({ themeId, mode: light ? value.mode : "dark" });
        }}
      />
    </div>
  );
}
