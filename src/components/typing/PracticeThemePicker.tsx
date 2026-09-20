import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowsClockwiseIcon,
  ArrowsInLineVerticalIcon,
  ArrowsOutLineVerticalIcon,
  CaretDownIcon,
  ShuffleIcon,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import {
  fetchThemeCatalogIndex,
  fetchThemeForPreview,
  getThemeFromCache,
  groupThemesByCategory,
  CATEGORY_CONFIG,
  type ThemeDefinition,
  type ThemeCategory,
} from "@/lib/themes";
import type { ThemeCatalogIndex, ThemeCatalogEntry, ThemeMode } from "@/types/theme";
import { useTheme } from "@/hooks/useTheme";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ThemeCard from "./ThemeCard";
import VariantDrawer from "./VariantDrawer";
import ThemeSitePreview from "./ThemeSitePreview";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
const matches = (value: string, query: string) => normalize(value).includes(query);
const defaultCollapsed = () =>
  new Set<ThemeCategory>((Object.keys(CATEGORY_CONFIG) as ThemeCategory[]).filter((id) => id !== "default"));
const EMPTY_THEMES: ThemeCatalogEntry[] = [];
const PREVIEW_INTENT_MS = 120;
type Preview = {
  entry: ThemeCatalogEntry;
  variantId: string;
  mode: ThemeMode;
  status: "loading" | "ready" | "error";
  theme: ThemeDefinition | null;
};

interface PracticeThemePickerProps {
  showThemeModal: boolean;
  setShowThemeModal: (show: boolean) => void;
  onUserSelection?: () => void;
}

export default function PracticeThemePicker({
  showThemeModal,
  setShowThemeModal,
  onUserSelection,
}: PracticeThemePickerProps) {
  const {
    colors,
    themeName,
    themeId,
    variantId,
    variant: currentVariant,
    mode,
    setTheme,
    setThemeSelection,
    selectionError: themeSelectionError,
    isLoading: selectingTheme,
  } = useTheme();
  const [catalog, setCatalog] = useState<ThemeCatalogIndex | null>(null);
  const catalogRef = useRef<ThemeCatalogIndex | null>(null);
  const loadingRef = useRef(false);
  const themes = catalog?.themes ?? EMPTY_THEMES;
  const [loadState, setLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [wasOpen, setWasOpen] = useState(showThemeModal);
  if (wasOpen !== showThemeModal) {
    setWasOpen(showThemeModal);
    if (!showThemeModal) setPreview(null);
  }
  const previewRevision = useRef(0);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionRevision = useRef(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Browsing does not wait for any full palettes. Only successful metadata is cached.
  const loadCatalog = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadState("loading");
    try {
      const result = await fetchThemeCatalogIndex();
      catalogRef.current = result;
      setCatalog(result);
      setLoadState(result ? "loaded" : "error");
    } catch {
      setLoadState("error");
    } finally {
      loadingRef.current = false;
    }
  }, []);
  useEffect(() => {
    if (showThemeModal && !catalogRef.current) void loadCatalog();
  }, [showThemeModal, loadCatalog]);

  const normalizedQuery = normalize(query);
  const groups = useMemo(
    () =>
      groupThemesByCategory(themes)
        .map((group) => ({
          ...group,
          themes:
            matches(group.displayName, normalizedQuery) || matches(group.category, normalizedQuery)
              ? group.themes
              : group.themes.filter(
                  (theme) =>
                    matches(theme.name, normalizedQuery) ||
                    matches(theme.id, normalizedQuery) ||
                    theme.variants.some(
                      (variant) => matches(variant.id, normalizedQuery) || matches(variant.label, normalizedQuery),
                    ),
                ),
        }))
        .filter((group) => group.themes.length > 0),
    [themes, normalizedQuery],
  );

  const cancelPreviewRequest = useCallback(() => {
    previewRevision.current++;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = null;
  }, []);
  const clearPreview = useCallback(() => {
    cancelPreviewRequest();
    setPreview(null);
  }, [cancelPreviewRequest]);
  const previewLeave = useCallback(() => {
    // Cancel passing hovers, but keep an intentional preview available for its retry control.
    if (previewTimer.current) clearPreview();
  }, [clearPreview]);
  useEffect(() => cancelPreviewRequest, [showThemeModal, cancelPreviewRequest]);

  const previewEnter = useCallback((entry: ThemeCatalogEntry, requestedMode?: ThemeMode, requestedVariantId?: string, immediate = false) => {
    const revision = ++previewRevision.current;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = null;
    const summary = entry.variants.find((variant) => variant.id === (requestedVariantId ?? entry.defaultVariantId)) ?? entry.variants[0];
    const nextMode = (requestedMode ?? mode) === "light" && summary.light ? "light" : "dark";
    const cached = getThemeFromCache(entry.id);
    const next: Preview = { entry, variantId: summary.id, mode: nextMode, status: cached ? "ready" : "loading", theme: cached };
    setPreview(next);
    if (cached) return;
    const load = async () => {
      previewTimer.current = null;
      const theme = await fetchThemeForPreview(entry.id);
      if (revision !== previewRevision.current) return;
      setPreview({ ...next, theme, status: theme ? "ready" : "error" });
    };
    if (immediate) void load();
    else previewTimer.current = setTimeout(() => { void load(); }, PREVIEW_INTENT_MS);
  }, [mode]);
  const previewVariant = preview?.theme?.variants.find((variant) => variant.id === preview.variantId)
    ?? preview?.theme?.variants.find((variant) => variant.id === preview.theme?.defaultVariantId);
  const previewMode = preview?.mode === "light" && previewVariant && !previewVariant.light ? "dark" : preview?.mode;
  const previewColors = previewVariant
    ? previewMode === "light" && previewVariant.light ? previewVariant.light : previewVariant.dark
    : colors;
  const previewLabel = preview
    ? `${preview.entry.name} · ${previewVariant?.label ?? preview.entry.variants.find((variant) => variant.id === preview.variantId)?.label ?? "Default"} · ${previewMode}`
    : `${themeName} · ${currentVariant?.label ?? "Default"} · ${mode}`;
  const select = async (selectedThemeId: string, selectedVariantId?: string, selectedMode?: ThemeMode) => {
    const revision = ++selectionRevision.current;
    onUserSelection?.();
    setSelectionError(null);
    try {
      await setThemeSelection({
        themeId: selectedThemeId,
        variantId: selectedVariantId,
        mode: selectedMode,
      });
    } catch {
      if (revision === selectionRevision.current) setSelectionError("This theme could not be selected. Try again.");
    }
  };
  const close = (open: boolean) => {
    setShowThemeModal(open);
    if (!open) {
      clearPreview();
      setQuery("");
      setExpandedThemeId(null);
      setCollapsed(defaultCollapsed());
      setDetailsOpen(false);
    }
  };

  return (
    <Dialog open={showThemeModal} onOpenChange={close}>
      <DialogContent className="flex h-[min(90dvh,850px)] w-[calc(100%-1.5rem)] max-w-6xl flex-col gap-4 overflow-hidden p-4 sm:max-w-6xl sm:p-6">
        <div className="pr-7">
          <DialogTitle>Theme</DialogTitle>
          <DialogDescription className="mt-1">
            Choose a theme or explore its variants. Focus a card to preview it.
          </DialogDescription>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto sm:flex-row sm:overflow-visible">
          <aside className="min-w-0 shrink-0 sm:w-2/5" aria-label="Theme preview">
            <div className="mb-2 flex h-12 min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium text-foreground" title={preview?.entry.name ?? themeName}>{preview?.entry.name ?? themeName}</span>
              <span className="truncate text-xs text-muted-foreground" title={previewLabel}>{previewLabel.split(" · ").slice(1).join(" · ")}</span>
            </div>
            <div className="mx-auto aspect-[4/3] w-full max-w-[min(100%,40dvh)] rounded-md border border-border sm:max-w-none">
              {preview && preview.status !== "ready" ? (
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-md bg-muted p-3 text-center text-sm text-muted-foreground">
                  {preview.status === "loading" ? <p role="status">Loading preview for {preview.entry.name}…</p> : <>
                    <p role="alert">Preview for {preview.entry.name} could not be loaded.</p>
                    <button type="button" className="inline-flex items-center gap-2 rounded border border-input bg-background px-3 py-2 text-foreground"
                      onClick={() => previewEnter(preview.entry, preview.mode, preview.variantId, true)}>
                      <ArrowsClockwiseIcon className="size-4" aria-hidden="true" />Retry preview
                    </button>
                  </>}
                </div>
              ) : <ThemeSitePreview colors={previewColors} label={previewLabel} />}
            </div>
            <p className="mt-2 hidden text-xs text-muted-foreground sm:block">Preview only. Select a theme to apply it.</p>
          </aside>
          <div className="flex min-h-48 min-w-0 flex-1 flex-col gap-3 sm:min-h-0">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label="Search themes"
                type="search"
                placeholder="Search themes or categories…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 basis-40 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
              <button
                type="button"
                aria-label="Random theme"
                disabled={themes.length === 0}
                onClick={() => {
                  const theme = themes[Math.floor(Math.random() * themes.length)];
                  if (!theme) return;
                  const variant = theme.variants[Math.floor(Math.random() * theme.variants.length)];
                  void select(theme.id, variant.id, mode);
                }}
                className="rounded-md border border-input p-2 text-foreground hover:bg-accent disabled:opacity-50"
              >
                <ShuffleIcon aria-hidden="true" size={18} />
              </button>
              {!normalizedQuery && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCollapsed(new Set())}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-2 py-2 text-xs text-foreground hover:bg-accent"
                  >
                    <ArrowsOutLineVerticalIcon className="size-4 shrink-0" aria-hidden="true" />
                    Expand all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCollapsed(new Set(Object.keys(CATEGORY_CONFIG) as ThemeCategory[]));
                      setExpandedThemeId(null);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-2 py-2 text-xs text-foreground hover:bg-accent"
                  >
                    <ArrowsInLineVerticalIcon className="size-4 shrink-0" aria-hidden="true" />
                    Collapse all
                  </button>
                </div>
              )}
            </div>
            {loadState === "loading" && (
              <p role="status" className="text-sm text-muted-foreground">
                Loading themes…
              </p>
            )}
            {loadState === "error" && (
              <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                Themes could not be loaded.
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded border px-3 py-1"
                  onClick={() => {
                    void loadCatalog();
                  }}
                >
                  <ArrowsClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
                  Retry
                </button>
              </div>
            )}
            {(selectionError || themeSelectionError) && (
              <p role="alert" className="text-sm text-destructive">
                {selectionError || themeSelectionError}
              </p>
            )}
            {selectingTheme && (
              <p role="status" className="text-sm text-muted-foreground">
                Applying theme…
              </p>
            )}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
              {groups.map((group) => {
                const open = !!normalizedQuery || !collapsed.has(group.category);
                const contentId = `theme-category-${group.category}`;
                return (
                  <section key={group.category} className="min-w-0">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={contentId}
                      disabled={!!normalizedQuery}
                      onClick={() =>
                        setCollapsed((previous) => {
                          const next = new Set(previous);
                          if (next.has(group.category)) next.delete(group.category);
                          else next.add(group.category);
                          return next;
                        })
                      }
                      className="mb-2 flex w-full items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm text-foreground"
                    >
                      <span>
                        {group.displayName} <span className="text-muted-foreground">({group.themes.length})</span>
                      </span>
                      <CaretDownIcon size={16} className={open ? "rotate-180" : ""} aria-hidden="true" />
                    </button>
                    {open && (
                      <div
                        id={contentId}
                        className="grid gap-2"
                        style={{
                          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
                        }}
                      >
                        {group.themes.map((theme) => {
                          const variant =
                            theme.variants.find((item) => item.id === theme.defaultVariantId) ?? theme.variants[0];
                          const multi = theme.variants.length > 1;
                          const matchingVariants = normalizedQuery
                            ? theme.variants.filter(
                                (item) => matches(item.label, normalizedQuery) || matches(item.id, normalizedQuery),
                              )
                            : theme.variants;
                          return (
                            <Fragment key={theme.id}>
                              <ThemeCard
                                themeData={theme}
                                variant={variant}
                                label={theme.name}
                                isSelected={themeId === theme.id}
                                selectedMode={mode}
                                isMultiVariant={multi}
                                isExpanded={expandedThemeId === theme.id}
                                variantCount={theme.variants.length}
                                matchingVariantCount={
                                  matchingVariants.length > 0 && matchingVariants.length < theme.variants.length
                                    ? matchingVariants.length
                                    : undefined
                                }
                                onCardClick={() =>
                                  multi
                                    ? setExpandedThemeId((id) => (id === theme.id ? null : theme.id))
                                    : void select(theme.id)
                                }
                                onLightClick={() => void select(theme.id, variant.id, "light")}
                                onDarkClick={() => void select(theme.id, variant.id, "dark")}
                                onMouseEnter={(immediate) => previewEnter(theme, undefined, undefined, immediate)}
                                onMouseLeave={previewLeave}
                                onLightMouseEnter={(immediate) => previewEnter(theme, "light", variant.id, immediate)}
                                onDarkMouseEnter={(immediate) => previewEnter(theme, "dark", variant.id, immediate)}
                              />
                              {multi && (
                                <VariantDrawer
                                  themeData={theme}
                                  variants={matchingVariants.length > 0 ? matchingVariants : theme.variants}
                                  selectedThemeId={themeId}
                                  selectedVariantId={variantId}
                                  selectedMode={mode}
                                  isOpen={expandedThemeId === theme.id}
                                  onClose={() => {
                                    setExpandedThemeId(null);
                                    document
                                      .querySelector<HTMLButtonElement>(
                                        `button[aria-controls="theme-variants-${theme.id}"]`,
                                      )
                                      ?.focus();
                                  }}
                                  onVariantSelect={select}
                                  onPreviewEnter={previewEnter}
                                  onPreviewLeave={previewLeave}
                                />
                              )}
                            </Fragment>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
              {loadState === "loaded" && groups.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">No themes found for “{query.trim()}”.</p>
              )}
              <section className="rounded-md border border-border">
                <button
                  type="button"
                  aria-expanded={detailsOpen}
                  aria-controls="current-theme-details"
                  onClick={() => setDetailsOpen((value) => !value)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-foreground"
                >
                  Current theme details
                  <CaretDownIcon aria-hidden="true" size={16} className={detailsOpen ? "rotate-180" : ""} />
                </button>
                {detailsOpen && (
                  <div
                    id="current-theme-details"
                    className="space-y-3 border-t border-border p-3 text-sm text-muted-foreground"
                  >
                    <p>Current colors (read-only)</p>
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {[
                        ["Background", colors.bg.base],
                        ["Surface", colors.bg.surface],
                        ["Cursor", colors.typing.cursor],
                        ["Ghost cursor", colors.typing.cursorGhost],
                        ["Untyped text", colors.typing.default],
                        ["Correct text", colors.typing.correct],
                        ["Incorrect text", colors.typing.incorrect],
                      ].map(([label, color]) => (
                        <div key={label} className="flex min-w-0 items-center justify-between gap-2">
                          <dt>{label}</dt>
                          <dd className="flex items-center gap-2">
                            <span className="h-5 w-5 rounded border border-border" style={{ backgroundColor: color }} />
                            <span className="text-xs">{color}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <button
                      type="button"
                      onClick={() => {
                        onUserSelection?.();
                        void setTheme("typesetgo").catch(() =>
                          setSelectionError("The default theme could not be loaded. Try again."),
                        );
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-foreground"
                    >
                      <ArrowClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
                      Reset to TypeSetGo Theme
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
