import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Shuffle, ChevronsDownUp, ChevronsUpDown, RefreshCw, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  fetchThemeCatalog,
  retryThemeCatalog,
  groupThemesByCategory,
  CATEGORY_CONFIG,
  type ThemeDefinition,
  type ThemeCategory,
} from "@/lib/themes";
import type { ThemeCatalogResult, ThemeMode } from "@/types/theme";
import { useTheme } from "@/hooks/useTheme";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ThemeCard from "./ThemeCard";
import VariantDrawer from "./VariantDrawer";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
const matches = (value: string, query: string) => normalize(value).includes(query);
const defaultCollapsed = () =>
  new Set<ThemeCategory>((Object.keys(CATEGORY_CONFIG) as ThemeCategory[]).filter((id) => id !== "default"));
const EMPTY_THEMES: ThemeDefinition[] = [];

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
    mode,
    setTheme,
    setThemeSelection,
    selectionError: themeSelectionError,
    isLoading: selectingTheme,
  } = useTheme();
  const [catalog, setCatalog] = useState<ThemeCatalogResult | null>(null);
  const catalogRef = useRef<ThemeCatalogResult | null>(null);
  const loadingRef = useRef(false);
  const themes = catalog?.themes ?? EMPTY_THEMES;
  const [loadState, setLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    theme: ThemeDefinition;
    mode?: ThemeMode;
    variantId?: string;
  } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Both the first request and retries use the shared bounded, deduplicated loader.
  const loadCatalog = useCallback(async (retry = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadState("loading");
    try {
      const result =
        retry && catalogRef.current ? await retryThemeCatalog(catalogRef.current) : await fetchThemeCatalog();
      catalogRef.current = result;
      setCatalog(result);
      setLoadState(result.complete ? "loaded" : "error");
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

  const previewVariant =
    preview?.theme.variants.find((item) => item.id === (preview.variantId ?? preview.theme.defaultVariantId)) ??
    preview?.theme.variants[0];
  const previewMode = preview?.mode ?? mode;
  const previewColors = previewVariant
    ? previewMode === "light" && previewVariant.light
      ? previewVariant.light
      : previewVariant.dark
    : colors;
  const previewEnter = useCallback((theme: ThemeDefinition, previewMode?: ThemeMode, previewVariantId?: string) => {
    setPreview({ theme, mode: previewMode, variantId: previewVariantId });
  }, []);
  const select = async (selectedThemeId: string, selectedVariantId?: string, selectedMode?: ThemeMode) => {
    onUserSelection?.();
    setSelectionError(null);
    try {
      await setThemeSelection({
        themeId: selectedThemeId,
        variantId: selectedVariantId,
        mode: selectedMode,
      });
    } catch {
      setSelectionError("This theme could not be selected. Try again.");
    }
  };
  const close = (open: boolean) => {
    setShowThemeModal(open);
    if (!open) {
      setPreview(null);
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
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          <aside className="shrink-0 rounded-md border border-border lg:w-1/3" aria-label="Theme preview">
            <div className="px-3 py-2 text-sm font-medium text-foreground">{preview?.theme.name ?? themeName}</div>
            <div
              className="flex min-h-20 items-center rounded-b-md p-4 font-mono text-lg leading-relaxed lg:h-[calc(100%-2.25rem)] lg:text-2xl"
              style={{ backgroundColor: previewColors.bg.base }}
            >
              <p className="break-words">
                <span style={{ color: previewColors.typing.correct }}>the quick brown fox </span>
                <span style={{ color: previewColors.typing.incorrect }}>jum</span>
                <span
                  style={{
                    borderLeft: `2px solid ${previewColors.typing.cursor}`,
                    color: previewColors.typing.default,
                  }}
                >
                  ps over the lazy dog
                </span>
              </p>
            </div>
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
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
                <Shuffle size={18} />
              </button>
              {!normalizedQuery && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCollapsed(new Set())}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-2 py-2 text-xs text-foreground hover:bg-accent"
                  >
                    <ChevronsUpDown className="size-4 shrink-0" aria-hidden="true" />
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
                    <ChevronsDownUp className="size-4 shrink-0" aria-hidden="true" />
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
                {catalog?.themes.length
                  ? `${catalog.failedThemeIds.length} themes could not be loaded. Available themes are shown below.`
                  : "Themes could not be loaded."}
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded border px-3 py-1"
                  onClick={() => {
                    void loadCatalog(true);
                  }}
                >
                  <RefreshCw className="size-4 shrink-0" aria-hidden="true" />
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
                      <ChevronDown size={16} className={open ? "rotate-180" : ""} aria-hidden="true" />
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
                                onMouseEnter={() => previewEnter(theme)}
                                onMouseLeave={() => setPreview(null)}
                                onLightMouseEnter={() => previewEnter(theme, "light", variant.id)}
                                onDarkMouseEnter={() => previewEnter(theme, "dark", variant.id)}
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
                                  onPreviewLeave={() => setPreview(null)}
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
                  <ChevronDown size={16} className={detailsOpen ? "rotate-180" : ""} />
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
                      <RotateCw className="size-4 shrink-0" aria-hidden="true" />
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
